"use strict";

/* ========== 공통 유틸 ========== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const pad = (n, len = 2) => String(n).padStart(len, "0");
const store = {
  get: (k, def) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? def; } catch { return def; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

/* ========== 다국어 (영/한) ========== */
const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const I18N = {
  ko: {
    clock: "시계", world: "세계시간", timer: "타이머", stopwatch: "스톱워치",
    addCity: "+ 도시 추가", start: "시작", pause: "일시정지", resume: "계속",
    reset: "초기화", lap: "랩", restart: "다시 시작", stop: "정지",
    min: "분", sec: "초", langBtn: "EN", locale: "ko-KR", unit: "분",
    allAdded: "추가할 수 있는 도시를 모두 추가했어요.",
    cityPrompt: (l) => `도시를 입력하세요:\n${l}`,
    dateFmt: (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${KO_DAYS[d.getDay()]})`,
  },
  en: {
    clock: "Clock", world: "World", timer: "Timer", stopwatch: "Stopwatch",
    addCity: "+ Add city", start: "Start", pause: "Pause", resume: "Resume",
    reset: "Reset", lap: "Lap", restart: "Restart", stop: "Stop",
    min: "min", sec: "sec", langBtn: "한", locale: "en-US", unit: "m",
    allAdded: "All available cities are already added.",
    cityPrompt: (l) => `Enter a city:\n${l}`,
    dateFmt: (d) => new Intl.DateTimeFormat("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(d),
  },
};
let lang = store.get("lang", "ko");
let t = I18N[lang];

/* ========== 도시 (다국어) ========== */
const CITIES = {
  seoul:    { ko: "서울", en: "Seoul", tz: "Asia/Seoul" },
  tokyo:    { ko: "도쿄", en: "Tokyo", tz: "Asia/Tokyo" },
  beijing:  { ko: "베이징", en: "Beijing", tz: "Asia/Shanghai" },
  bangkok:  { ko: "방콕", en: "Bangkok", tz: "Asia/Bangkok" },
  dubai:    { ko: "두바이", en: "Dubai", tz: "Asia/Dubai" },
  london:   { ko: "런던", en: "London", tz: "Europe/London" },
  paris:    { ko: "파리", en: "Paris", tz: "Europe/Paris" },
  berlin:   { ko: "베를린", en: "Berlin", tz: "Europe/Berlin" },
  newyork:  { ko: "뉴욕", en: "New York", tz: "America/New_York" },
  la:       { ko: "로스앤젤레스", en: "Los Angeles", tz: "America/Los_Angeles" },
  sydney:   { ko: "시드니", en: "Sydney", tz: "Australia/Sydney" },
  honolulu: { ko: "호놀룰루", en: "Honolulu", tz: "Pacific/Honolulu" },
};
let myZones = store.get("worldZones", ["seoul", "newyork", "london", "tokyo"]).filter((k) => CITIES[k]);
if (!myZones.length) myZones = ["seoul", "newyork", "london", "tokyo"];

/* ========== DOM 참조 ========== */
const langBtn = $("#langBtn");
const clockTime = $("#clockTime");
const clockDate = $("#clockDate");
const worldList = $("#worldList");
const timerDisplay = $("#timerDisplay");
const timerSetup = $("#timerSetup");
const timerPresets = $("#timerPresets");
const inMin = $("#inMin");
const inSec = $("#inSec");
const timerStart = $("#timerStart");
const swDisplay = $("#swDisplay");
const lapList = $("#lapList");
const swStart = $("#swStart");

/* ========== 모드 전환 ========== */
function switchMode(mode) {
  $$(".tab").forEach((t) => t.classList.toggle("is-active", t.dataset.mode === mode));
  $$(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === mode));
  store.set("lastMode", mode);
}
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (btn) switchMode(btn.dataset.mode);
});

/* ========== 언어 적용 ========== */
function applyLang() {
  t = I18N[lang];
  document.documentElement.lang = lang;
  $$("[data-i18n]").forEach((el) => { if (t[el.dataset.i18n]) el.textContent = t[el.dataset.i18n]; });
  $$("[data-i18n-ph]").forEach((el) => { el.placeholder = t[el.dataset.i18nPh]; });
  langBtn.textContent = t.langBtn;
  $$("#timerPresets button").forEach((b) => { b.textContent = (b.dataset.sec / 60) + t.unit; });
  setTimerState(timerState);   // 상태 의존 버튼 복원
  refreshSwBtn();
  renderWorld();
  tickClock();
}
langBtn.addEventListener("click", () => {
  lang = lang === "ko" ? "en" : "ko";
  store.set("lang", lang);
  applyLang();
});

/* ========== 1) 시계 ========== */
function tickClock() {
  const d = new Date();
  clockTime.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  clockDate.textContent = t.dateFmt(d);
}

/* ========== 2) 세계시간 ========== */
function tzOffsetLabel(tz) {
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
  const part = dtf.formatToParts(new Date()).find((p) => p.type === "timeZoneName");
  return part ? part.value.replace("GMT", "UTC") : "";
}
function renderWorld() {
  worldList.innerHTML = "";
  myZones.forEach((key) => {
    const c = CITIES[key]; if (!c) return;
    const li = document.createElement("li");
    li.className = "world-item";
    li.innerHTML = `
      <div><span class="city">${c[lang]}</span><span class="offset">${tzOffsetLabel(c.tz)}</span></div>
      <div><span class="wtime" data-wtime="${c.tz}"></span><span class="wdate" data-wdate="${c.tz}"></span>
      <button class="remove" data-remove="${key}" title="remove">✕</button></div>`;
    worldList.appendChild(li);
  });
  tickWorld();
}
function tickWorld() {
  const now = new Date();
  $$("[data-wtime]").forEach((el) => {
    el.textContent = new Intl.DateTimeFormat(t.locale, {
      timeZone: el.dataset.wtime, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    }).format(now);
  });
  $$("[data-wdate]").forEach((el) => {
    el.textContent = new Intl.DateTimeFormat(t.locale, {
      timeZone: el.dataset.wdate, month: "short", day: "numeric", weekday: "short",
    }).format(now);
  });
}
worldList.addEventListener("click", (e) => {
  const key = e.target.closest("[data-remove]")?.dataset.remove;
  if (key) {
    myZones = myZones.filter((k) => k !== key);
    store.set("worldZones", myZones);
    renderWorld();
  }
});
$("#addZoneBtn").addEventListener("click", () => {
  const avail = Object.keys(CITIES).filter((k) => !myZones.includes(k));
  if (!avail.length) return alert(t.allAdded);
  const names = avail.map((k) => CITIES[k][lang]);
  const choice = prompt(t.cityPrompt(names.join(", ")));
  if (!choice) return;
  const q = choice.trim().toLowerCase();
  const key = avail.find((k) => CITIES[k].ko === choice.trim() || CITIES[k].en.toLowerCase() === q);
  if (key) { myZones.push(key); store.set("worldZones", myZones); renderWorld(); }
});

/* ========== 3) 타이머 ========== */
let timerSet = 0;       // 설정한 총 시간(초)
let timerTotal = 0;     // 남은 시간(초)
let timerEndAt = 0;
let timerRunning = false;
let timerState = "idle"; // idle | running | paused | done

function fmtTimer(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function renderTimer() {
  timerDisplay.textContent = fmtTimer(Math.max(0, timerTotal));
  timerDisplay.classList.toggle("warn", timerRunning && timerTotal <= 10);
}
function setTimerState(s) {
  timerState = s;
  const map = { idle: t.start, running: t.pause, paused: t.resume, done: t.restart };
  timerStart.textContent = map[s];
  timerStart.classList.toggle("running", s === "running");
  const hide = s === "running";
  timerSetup.style.display = hide ? "none" : "flex";
  timerPresets.style.display = hide ? "none" : "flex";
}
function startTimer() {
  if (timerTotal <= 0) {
    timerSet = (parseInt(inMin.value) || 0) * 60 + (parseInt(inSec.value) || 0);
    timerTotal = timerSet;
  }
  if (timerTotal <= 0) return;
  timerEndAt = Date.now() + timerTotal * 1000;
  timerRunning = true;
  setTimerState("running");
}
function pauseTimer() { timerRunning = false; setTimerState("paused"); }
function resetTimer() {
  timerRunning = false; timerTotal = 0; timerSet = 0;
  inMin.value = ""; inSec.value = "";
  setTimerState("idle"); renderTimer(); stopAlarm();
}
function tickTimer() {
  if (!timerRunning) return;
  timerTotal = Math.round((timerEndAt - Date.now()) / 1000);
  if (timerTotal <= 0) {
    timerTotal = 0; renderTimer();
    timerRunning = false; setTimerState("done"); fireAlarm();
  } else renderTimer();
}
timerStart.addEventListener("click", () => {
  if (timerState === "running") return pauseTimer();
  if (timerState === "done") timerTotal = timerSet;
  startTimer();
});
$("#timerReset").addEventListener("click", resetTimer);
timerPresets.addEventListener("click", (e) => {
  const sec = e.target.dataset.sec; if (!sec) return;
  timerSet = timerTotal = parseInt(sec);
  inMin.value = Math.floor(timerTotal / 60) || "";
  inSec.value = timerTotal % 60 || "";
  setTimerState("idle"); renderTimer();
});

/* ---- 알람 (WebAudio) ---- */
let audioCtx = null, alarmTimer = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18, 0.36].forEach((dt, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = [660, 880, 1100][i];
      o.connect(g).connect(audioCtx.destination);
      const s = audioCtx.currentTime + dt;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.3, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.5);
      o.start(s); o.stop(s + 0.55);
    });
  } catch (_) {}
}
function fireAlarm() {
  document.title = lang === "ko" ? "⏰ 타이머 종료!" : "⏰ Time's up!";
  let n = 0; beep();
  alarmTimer = setInterval(() => { beep(); if (++n >= 6) stopAlarm(); }, 800);
}
function stopAlarm() {
  if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
  document.title = "SpongeClub Clock";
}
document.addEventListener("click", () => { if (alarmTimer) stopAlarm(); }, true);

/* ========== 4) 스톱워치 ========== */
let swElapsed = 0, swStartedAt = 0, swState = "idle", lapCount = 0, lastLapAt = 0;
function fmtSw(ms) {
  const total = Math.floor(ms / 10), cs = total % 100, s = Math.floor(total / 100) % 60, m = Math.floor(total / 6000);
  return `${pad(m)}:${pad(s)}.${pad(cs)}`;
}
function renderSw() {
  const ms = swState === "running" ? swElapsed + (Date.now() - swStartedAt) : swElapsed;
  swDisplay.textContent = fmtSw(ms);
}
function refreshSwBtn() {
  const map = { idle: t.start, running: t.stop, paused: t.resume };
  swStart.textContent = map[swState];
  swStart.classList.toggle("running", swState === "running");
}
swStart.addEventListener("click", () => {
  if (swState === "running") { swElapsed += Date.now() - swStartedAt; swState = "paused"; }
  else { swStartedAt = Date.now(); swState = "running"; }
  refreshSwBtn();
});
$("#swLap").addEventListener("click", () => {
  const ms = swState === "running" ? swElapsed + (Date.now() - swStartedAt) : swElapsed;
  if (ms === 0) return;
  lapCount++;
  const delta = ms - lastLapAt; lastLapAt = ms;
  const li = document.createElement("li");
  li.innerHTML = `<span class="n">${t.lap} ${lapCount}</span><span>+${fmtSw(delta)}</span><span>${fmtSw(ms)}</span>`;
  lapList.prepend(li);
});
$("#swReset").addEventListener("click", () => {
  swState = "idle"; swElapsed = 0; lapCount = 0; lastLapAt = 0;
  refreshSwBtn(); lapList.innerHTML = ""; renderSw();
});

/* ========== 메인 루프 ========== */
function loop() {
  tickClock(); tickWorld(); tickTimer(); renderSw();
  requestAnimationFrame(loop);
}

/* ========== 거품 생성 ========== */
(function buildBubbles() {
  const layer = $("#bubbles");
  for (let i = 0; i < 18; i++) {
    const b = document.createElement("div");
    b.className = "bubble";
    const size = 14 + Math.random() * 60;
    b.style.width = b.style.height = size + "px";
    b.style.left = Math.random() * 100 + "vw";
    b.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
    b.style.animationDuration = (9 + Math.random() * 12) + "s";
    b.style.animationDelay = (-Math.random() * 18) + "s";
    layer.appendChild(b);
  }
})();

/* ========== 단축키 ========== */
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT") return;
  const map = { Digit1: "clock", Digit2: "world", Digit3: "timer", Digit4: "stopwatch" };
  if (map[e.code]) switchMode(map[e.code]);
  if (e.code === "Space") {
    e.preventDefault();
    const active = $(".tab.is-active")?.dataset.mode;
    if (active === "timer") timerStart.click();
    if (active === "stopwatch") swStart.click();
  }
});

/* ========== 초기화 ========== */
switchMode(store.get("lastMode", "clock"));
setTimerState("idle");
refreshSwBtn();
applyLang();
renderTimer();
renderSw();
loop();
