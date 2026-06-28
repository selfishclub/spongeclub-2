"use strict";

/* 스폰지 타이머 — content script (타이머 + 스톱워치)
   - timer: 종료시각(timerEndAt) 기준 카운트다운, 색상·소리 경고, 초과 시간(+) 표시
   - stopwatch: 시작시각(swStartedAt) 기준 경과시간 카운트업 (색·소리 없음)
   - 절대시각 기준이라 새로고침/재주입에도 이어짐
   - 헤더 드래그로 위치 이동, 단축키(pendingHotkey)로 시작/정지 토글 */

(() => {
  if (window.__spongeTimer) {
    window.__spongeTimer.reload();
    return;
  }

  const KEY = "spongeTimer";
  const SOUND_MARKS = [30, 10, 0];
  const DEFAULTS = {
    active: true,
    mode: "timer",
    running: false,
    soundOn: true,
    pos: null,
    durationMs: 300000,
    timerRemainMs: 300000,
    timerEndAt: null,
    swElapsedMs: 0,
    swStartedAt: null,
    pendingHotkey: false,
  };

  let st = { ...DEFAULTS };
  let ticker = null;
  let audioCtx = null;
  let prevMs = null;
  const firedMarks = new Set();

  // ---------- DOM ----------
  const root = document.createElement("div");
  root.id = "sponge-timer-overlay";
  root.setAttribute("data-stage", "ok");
  root.setAttribute("data-mode", "timer");
  root.innerHTML = `
    <div class="spg-head" data-drag>
      <svg class="spg-logo" viewBox="0 0 48 32" aria-hidden="true">
        <path d="M9 5.5C3.6 6.6 1 11 2.2 16.5 3 20.7 1.2 22.8 4 26c3 3.4 8.6 2.6 12.2.7 2.7-1.4 5.6-1.4 8.4-.2 4.4 1.9 11 2.6 14.6-1.4 3.2-3.5 1.6-6.2 2.3-10.2C54.6 9 50 4.6 43.8 5 39.7 5.2 36.6 3 32 2.6 25.6 2 22.4 5 18 5.4 14.8 5.7 12.4 4.8 9 5.5Z" fill="#FFD24D" stroke="#E09600" stroke-width="1.4"/>
        <g fill="#A66E00" opacity="0.55">
          <circle cx="13" cy="13" r="2.1"/><circle cx="30" cy="12" r="2.4"/>
          <circle cx="22" cy="20" r="1.6"/><circle cx="38" cy="19" r="1.5"/>
        </g>
      </svg>
      <span class="spg-name">SPONGE</span>
      <button class="spg-x" type="button" title="닫기">✕</button>
    </div>
    <div class="spg-time">00:00</div>
    <div class="spg-track"><div class="spg-fill"></div></div>
    <div class="spg-ctrl">
      <button class="spg-btn spg-play" type="button">▶ 시작</button>
      <button class="spg-btn spg-reset" type="button" title="리셋">↺</button>
      <button class="spg-btn spg-add" type="button" title="1분 추가">+1:00</button>
      <button class="spg-btn spg-sound" type="button" title="소리 켜기/끄기">🔔</button>
    </div>
  `;
  document.documentElement.appendChild(root);

  const el = {
    time: root.querySelector(".spg-time"),
    fill: root.querySelector(".spg-fill"),
    play: root.querySelector(".spg-play"),
    sound: root.querySelector(".spg-sound"),
    add: root.querySelector(".spg-add"),
    name: root.querySelector(".spg-name"),
    head: root.querySelector(".spg-head"),
  };

  // ---------- 시간 계산 ----------
  function currentMs() {
    if (st.mode === "stopwatch") {
      return st.running && st.swStartedAt != null ? Date.now() - st.swStartedAt : st.swElapsedMs;
    }
    return st.running && st.timerEndAt != null ? st.timerEndAt - Date.now() : st.timerRemainMs;
  }

  function fmt(ms) {
    if (st.mode === "stopwatch") {
      const total = Math.floor(Math.max(0, ms) / 1000);
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }
    const over = ms < 0;
    // 남은 시간은 올림, 초과 경과는 내림
    const total = over ? Math.floor(-ms / 1000) : Math.ceil(ms / 1000);
    return `${over ? "+" : ""}${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  function stageOf(ms) {
    if (st.mode === "stopwatch") return "ok";
    if (ms <= 0) return "over";
    if (ms <= 10000) return "danger";
    if (ms <= 30000) return "warn";
    return "ok";
  }

  function save() {
    try {
      chrome.storage.local.set({ [KEY]: st });
    } catch (e) {
      /* 컨텍스트 종료 시 무시 */
    }
  }

  // ---------- 오디오 ----------
  function ensureAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!audioCtx) audioCtx = new AC();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch (e) {
      audioCtx = null;
    }
  }

  function beep(freq, when, dur) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function beepSeq(count, freq, dur) {
    if (!st.soundOn) return;
    ensureAudio();
    for (let i = 0; i < count; i++) beep(freq, i * (dur + 0.06), dur);
  }

  // ---------- 컨트롤 ----------
  function updateButtons() {
    const running = st.running;
    const isSw = st.mode === "stopwatch";
    el.play.textContent = running ? "❚❚ 정지" : "▶ 시작";
    el.play.classList.toggle("is-run", running);
    el.sound.textContent = st.soundOn ? "🔔" : "🔕";
    el.sound.classList.toggle("is-off", !st.soundOn);
    el.add.style.display = isSw ? "none" : "";
    el.sound.style.display = isSw ? "none" : "";
    el.name.textContent = isSw ? "STOPWATCH" : "SPONGE";
  }

  function start() {
    ensureAudio();
    if (st.mode === "stopwatch") {
      st.swStartedAt = Date.now() - st.swElapsedMs;
    } else {
      st.timerRemainMs = currentMs();
      st.timerEndAt = Date.now() + Math.max(-3600000, st.timerRemainMs);
    }
    st.running = true;
    save();
    updateButtons();
  }

  function pause() {
    if (st.mode === "stopwatch") {
      st.swElapsedMs = currentMs();
      st.swStartedAt = null;
    } else {
      st.timerRemainMs = currentMs();
      st.timerEndAt = null;
    }
    st.running = false;
    save();
    updateButtons();
  }

  function toggleRun() {
    st.running ? pause() : start();
  }

  function reset() {
    st.running = false;
    if (st.mode === "stopwatch") {
      st.swElapsedMs = 0;
      st.swStartedAt = null;
    } else {
      st.timerEndAt = null;
      st.timerRemainMs = st.durationMs;
    }
    firedMarks.clear();
    prevMs = null;
    save();
    updateButtons();
    paint(currentMs());
  }

  function addMinute() {
    if (st.mode !== "timer") return;
    st.durationMs += 60000;
    if (st.running && st.timerEndAt != null) st.timerEndAt += 60000;
    else st.timerRemainMs += 60000;
    save();
    paint(currentMs());
  }

  function toggleSound() {
    st.soundOn = !st.soundOn;
    if (st.soundOn) ensureAudio();
    save();
    updateButtons();
  }

  function closeOverlay() {
    st.active = false;
    st.running = false;
    save();
    teardown();
  }

  // ---------- 렌더 & 소리 ----------
  function paint(ms) {
    el.time.textContent = fmt(ms);
    root.setAttribute("data-stage", stageOf(ms));
    root.setAttribute("data-mode", st.mode);
    if (st.mode === "timer") {
      const ratio = st.durationMs > 0 ? Math.max(0, Math.min(1, ms / st.durationMs)) : 0;
      el.fill.style.width = `${ratio * 100}%`;
    }
  }

  function handleSound(ms) {
    if (st.mode !== "timer") {
      prevMs = ms;
      return;
    }
    if (prevMs === null) {
      prevMs = ms;
      return;
    }
    if (st.soundOn) {
      for (const mark of SOUND_MARKS) {
        const t = mark * 1000;
        if (prevMs > t && ms <= t && !firedMarks.has(mark)) {
          firedMarks.add(mark);
          if (mark === 0) beepSeq(3, 660, 0.22);
          else if (mark <= 10) beepSeq(2, 770, 0.12);
          else beepSeq(1, 940, 0.12);
        }
      }
    }
    prevMs = ms;
  }

  function tick() {
    const ms = currentMs();
    paint(ms);
    if (st.running) handleSound(ms);
  }

  // ---------- 드래그 ----------
  function applyPos() {
    if (st.pos && typeof st.pos.left === "number") {
      root.style.left = `${st.pos.left}px`;
      root.style.top = `${st.pos.top}px`;
    } else {
      root.style.left = `${Math.max(12, window.innerWidth - root.offsetWidth - 24)}px`;
      root.style.top = `24px`;
    }
  }

  let drag = null;
  el.head.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".spg-x")) return;
    drag = { dx: e.clientX - root.offsetLeft, dy: e.clientY - root.offsetTop };
    el.head.setPointerCapture(e.pointerId);
  });
  el.head.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const left = Math.max(0, Math.min(window.innerWidth - root.offsetWidth, e.clientX - drag.dx));
    const top = Math.max(0, Math.min(window.innerHeight - root.offsetHeight, e.clientY - drag.dy));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  });
  el.head.addEventListener("pointerup", (e) => {
    if (!drag) return;
    drag = null;
    el.head.releasePointerCapture(e.pointerId);
    st.pos = { left: root.offsetLeft, top: root.offsetTop };
    save();
  });

  // 오버레이 어디든 처음 누르면 오디오 잠금 해제 (단축키 자동시작 대비)
  root.addEventListener("pointerdown", ensureAudio);

  // ---------- 이벤트 ----------
  el.play.addEventListener("click", toggleRun);
  el.sound.addEventListener("click", toggleSound);
  el.add.addEventListener("click", addMinute);
  root.querySelector(".spg-reset").addEventListener("click", reset);
  root.querySelector(".spg-x").addEventListener("click", closeOverlay);

  // ---------- 생명주기 ----------
  function teardown() {
    if (ticker) clearInterval(ticker);
    ticker = null;
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }
    root.remove();
    delete window.__spongeTimer;
  }

  function consumeHotkey() {
    if (st.pendingHotkey) {
      st.pendingHotkey = false;
      save();
      toggleRun();
    }
  }

  function applyState(loaded) {
    const prevMode = st.mode;
    st = { ...DEFAULTS, ...loaded };
    if (prevMode !== st.mode) st.running = false; // 모드 전환 시 정지 후 새로
    firedMarks.clear();
    prevMs = null;
    applyPos();
    updateButtons();
    paint(currentMs());
  }

  function reload() {
    chrome.storage.local.get(KEY).then((data) => {
      const loaded = data[KEY];
      if (!loaded || !loaded.active) {
        teardown();
        return;
      }
      applyState(loaded);
      consumeHotkey();
    });
  }

  // 최초 로드
  chrome.storage.local.get(KEY).then((data) => {
    if (data[KEY] && data[KEY].active) st = { ...DEFAULTS, ...data[KEY] };
    applyPos();
    updateButtons();
    paint(currentMs());
    consumeHotkey();
    ticker = setInterval(tick, 200);
  });

  window.__spongeTimer = { reload, teardown };
})();
