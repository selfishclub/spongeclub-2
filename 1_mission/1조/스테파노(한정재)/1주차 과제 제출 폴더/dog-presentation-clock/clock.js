"use strict";

// ===== 좌표 상수 (SVG viewBox 360x360 기준) =====
const SIZE = 360;
const CENTER = SIZE / 2;
const RING_R = 168;
const RING_C = 2 * Math.PI * RING_R;
const SVGNS = "http://www.w3.org/2000/svg";

// ===== DOM =====
const $ = (id) => document.getElementById(id);
const app = $("app");
const dH = $("dH");
const dM = $("dM");
const elDate = $("digitalDate");
const handHour = $("handHour");
const handMinute = $("handMinute");
const handSecond = $("handSecond");
const ringProgress = $("ringProgress");
const ringHead = $("ringHead");
const dialPhoto = $("dialPhoto");
const elReadout = $("timerReadout");
const inMin = $("inMin");
const inSec = $("inSec");

// 시계판 사진(dog-bg.jpg)이 없으면 임시 이미지(dog.png)로 대체
dialPhoto.addEventListener("error", () => {
  if (!dialPhoto.dataset.fallback) {
    dialPhoto.dataset.fallback = "1";
    dialPhoto.setAttribute("href", "assets/dog.png");
  }
});

// ===== 도우미 =====
function pointOnDial(angleDeg, radius) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + radius * Math.sin(a), y: CENTER - radius * Math.cos(a) };
}
function mk(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

// ===== 시계 판: 눈금 & 숫자 =====
(function buildDial() {
  const ticks = $("ticks");
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0;
    const p1 = pointOnDial(i * 6, major ? 124 : 129);
    const p2 = pointOnDial(i * 6, 134);
    ticks.appendChild(mk("line", {
      x1: p1.x.toFixed(2), y1: p1.y.toFixed(2),
      x2: p2.x.toFixed(2), y2: p2.y.toFixed(2),
      class: major ? "tick major" : "tick",
    }));
  }
  const nums = $("numbers");
  for (let h = 1; h <= 12; h++) {
    const p = pointOnDial(h * 30, 114);
    const t = mk("text", { x: p.x.toFixed(2), y: (p.y + 5).toFixed(2), class: "num" });
    t.textContent = String(h);
    nums.appendChild(t);
  }
})();

// ===== 롤렉스 스타일 바늘 생성 (12시 방향, 회전축 = 시계 중심) =====
(function buildRolexHands() {
  // 시침: 메르세데스 핸드 (끝에 3분할 원)
  handHour.appendChild(mk("rect", { x: 175, y: 180, width: 10, height: 22, rx: 5, class: "rx-steel" }));   // 균형추
  handHour.appendChild(mk("rect", { x: 175.5, y: 112, width: 9, height: 74, rx: 4.5, class: "rx-steel" })); // 몸통
  handHour.appendChild(mk("polygon", { points: "180,92 184.5,108 175.5,108", class: "rx-steel" }));          // 팁
  handHour.appendChild(mk("circle", { cx: 180, cy: 112, r: 13, class: "rx-steel" }));                         // 원
  handHour.appendChild(mk("circle", { cx: 180, cy: 112, r: 9, class: "rx-lume" }));                           // 야광
  [90, 210, 330].forEach((a) => {                                                                             // 메르세데스 3분할
    const r = (a * Math.PI) / 180;
    handHour.appendChild(mk("line", { x1: 180, y1: 112, x2: (180 + 13 * Math.cos(r)).toFixed(2), y2: (112 - 13 * Math.sin(r)).toFixed(2), class: "rx-gap" }));
  });

  // 분침: 긴 바통 + 야광 스트립
  handMinute.appendChild(mk("rect", { x: 176, y: 180, width: 8, height: 20, rx: 4, class: "rx-steel" }));     // 균형추
  handMinute.appendChild(mk("rect", { x: 176, y: 86, width: 8, height: 98, rx: 4, class: "rx-steel" }));      // 몸통
  handMinute.appendChild(mk("polygon", { points: "180,74 184,88 176,88", class: "rx-steel" }));               // 팁
  handMinute.appendChild(mk("rect", { x: 177.5, y: 98, width: 5, height: 64, rx: 2.5, class: "rx-lume" }));   // 야광

  // 초침: 가는 바늘 + 롤리팝 원 + 꼬리 균형추
  handSecond.appendChild(mk("line", { x1: 180, y1: 206, x2: 180, y2: 84, class: "rx-second" }));
  handSecond.appendChild(mk("circle", { cx: 180, cy: 200, r: 6, class: "rx-second-dot" }));                   // 꼬리 추
  handSecond.appendChild(mk("circle", { cx: 180, cy: 104, r: 6.5, class: "rx-second-dot" }));                 // 롤리팝
  handSecond.appendChild(mk("circle", { cx: 180, cy: 104, r: 3.2, class: "rx-lume" }));
})();

// ===== 타이머 상태 =====
let mode = "idle"; // idle | running | paused | finished
let totalMs = 5 * 60 * 1000;
let remainMs = totalMs;
let endTime = 0;

const STORE = { min: "dogclock.min", sec: "dogclock.sec", sound: "dogclock.sound" };
let soundOn = localStorage.getItem(STORE.sound) !== "0";

function readInputs() {
  const m = Math.min(180, Math.max(0, parseInt(inMin.value, 10) || 0));
  const s = Math.min(59, Math.max(0, parseInt(inSec.value, 10) || 0));
  totalMs = (m * 60 + s) * 1000;
}
function fmt(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ===== 종료 알림음 (Web Audio, 외부 파일 불필요) =====
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { audioCtx = null; }
  }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq, start, dur) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}
function playAlarm() {
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    beep(880, t + i * 0.45, 0.18);
    beep(1175, t + i * 0.45 + 0.18, 0.18);
  }
}
function playStartCue() {           // 시작: 올라가는 두 음
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  beep(660, t, 0.07);
  beep(990, t + 0.08, 0.1);
}
function playPauseCue() {           // 일시정지: 내려가는 두 음
  if (!soundOn) return;
  ensureAudio();
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  beep(660, t, 0.07);
  beep(440, t + 0.08, 0.1);
}

// ===== 타이머 제어 =====
function start() {
  if (mode === "running") return;
  if (mode === "finished" || remainMs <= 0) remainMs = totalMs; // 재시작
  if (totalMs <= 0) return;
  endTime = Date.now() + remainMs;
  mode = "running";
  app.classList.remove("finished");
  ensureAudio();
  playStartCue();
}
function pause() {
  if (mode !== "running") return;
  remainMs = Math.max(0, endTime - Date.now());
  mode = "paused";
  playPauseCue();
}
function reset() {
  mode = "idle";
  readInputs();
  remainMs = totalMs;
  app.classList.remove("finished", "warn", "danger");
}
function finish() {
  mode = "finished";
  remainMs = 0;
  app.classList.add("finished");
  playAlarm();
}

// ===== 메인 루프 =====
const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
function tick() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  // --- 디지털 시각 (초 없음, : 는 CSS로 깜빡임) ---
  dH.textContent = pad(now.getHours());
  dM.textContent = pad(now.getMinutes());
  elDate.textContent =
    `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${WEEK[now.getDay()]})`;

  // --- 아날로그 침 ---
  const ms = now.getMilliseconds();
  const sec = now.getSeconds() + ms / 1000;
  const min = now.getMinutes() + sec / 60;
  const hr = (now.getHours() % 12) + min / 60;
  handHour.setAttribute("transform", `rotate(${hr * 30} ${CENTER} ${CENTER})`);
  handMinute.setAttribute("transform", `rotate(${min * 6} ${CENTER} ${CENTER})`);
  handSecond.setAttribute("transform", `rotate(${sec * 6} ${CENTER} ${CENTER})`);

  // --- 카운트다운 ---
  let curRemain;
  if (mode === "running") {
    curRemain = endTime - Date.now();
    if (curRemain <= 0) { curRemain = 0; finish(); }
  } else {
    curRemain = remainMs;
  }
  elReadout.textContent = fmt(curRemain);

  const frac = totalMs > 0 ? Math.max(0, Math.min(1, curRemain / totalMs)) : 1;
  ringProgress.setAttribute("stroke-dasharray", `${(RING_C * frac).toFixed(2)} ${RING_C.toFixed(2)}`);
  const head = pointOnDial((1 - frac) * 360, RING_R);
  ringHead.setAttribute("cx", head.x.toFixed(2));
  ringHead.setAttribute("cy", head.y.toFixed(2));

  // --- 경고 단계 색 ---
  app.classList.remove("warn", "danger");
  if (mode === "running" || mode === "paused") {
    if (frac <= 0.1 || curRemain <= 10000) app.classList.add("danger");
    else if (frac <= 0.25) app.classList.add("warn");
  }

  requestAnimationFrame(tick);
}

// ===== 입력 / 버튼 =====
function saveInputs() {
  localStorage.setItem(STORE.min, inMin.value);
  localStorage.setItem(STORE.sec, inSec.value);
}
function onInputChange() {
  if (mode === "idle") { readInputs(); remainMs = totalMs; }
  saveInputs();
}
inMin.addEventListener("input", onInputChange);
inSec.addEventListener("input", onInputChange);

document.querySelectorAll(".preset").forEach((b) => {
  b.addEventListener("click", () => {
    const s = parseInt(b.dataset.sec, 10);
    inMin.value = Math.floor(s / 60);
    inSec.value = s % 60;
    reset();
    saveInputs();
  });
});

$("btnStart").addEventListener("click", start);
$("btnPause").addEventListener("click", pause);
$("btnReset").addEventListener("click", reset);

const btnSound = $("btnSound");
function renderSoundBtn() {
  btnSound.textContent = soundOn ? "🔔" : "🔕";
  btnSound.classList.toggle("toggled-off", !soundOn);
}
btnSound.addEventListener("click", () => {
  soundOn = !soundOn;
  localStorage.setItem(STORE.sound, soundOn ? "1" : "0");
  renderSoundBtn();
  if (soundOn) { ensureAudio(); beep(880, (audioCtx ? audioCtx.currentTime : 0) + 0.01, 0.12); }
});

$("btnFull").addEventListener("click", () => {
  if (!document.fullscreenElement) app.requestFullscreen?.();
  else document.exitFullscreen?.();
});

document.addEventListener("keydown", (e) => {
  if (e.code === "Space") { e.preventDefault(); mode === "running" ? pause() : start(); }
  else if (e.key.toLowerCase() === "r") { reset(); }
});

// 화면(버튼·입력칸 외 영역)을 누르면 시작/일시정지 토글
app.addEventListener("click", (e) => {
  if (e.target.closest("button, input, label")) return; // 컨트롤 클릭은 제외
  mode === "running" ? pause() : start();
});

// ===== 우클릭 → 사진 교체 팝업 =====
const PHOTO_KEY = "dogclock.photo";
const photoModal = $("photoModal");
const photoFile = $("photoFile");

app.addEventListener("contextmenu", (e) => { e.preventDefault(); photoModal.classList.remove("hidden"); });

// 팝업 안에서의 클릭이 시작/정지 토글로 번지지 않게 차단 + 바깥 클릭 시 닫기
photoModal.addEventListener("click", (e) => {
  e.stopPropagation();
  if (e.target === photoModal) photoModal.classList.add("hidden");
});
$("photoClose").addEventListener("click", () => photoModal.classList.add("hidden"));

$("photoReset").addEventListener("click", () => {
  localStorage.removeItem(PHOTO_KEY);
  delete dialPhoto.dataset.fallback;
  dialPhoto.setAttribute("href", "assets/dog-bg.jpg");
  photoModal.classList.add("hidden");
});

function applyPhoto(dataUrl, save) {
  delete dialPhoto.dataset.fallback;
  dialPhoto.setAttribute("href", dataUrl);
  if (save) { try { localStorage.setItem(PHOTO_KEY, dataUrl); } catch (e) {} } // 용량 초과 시 적용만
}

// 고른 사진을 640x640 정사각형(가운데 기준)으로 잘라 적용·저장
photoFile.addEventListener("change", () => {
  const file = photoFile.files && photoFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const S = 640;
      const canvas = document.createElement("canvas");
      canvas.width = S; canvas.height = S;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(S / img.width, S / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
      applyPhoto(canvas.toDataURL("image/jpeg", 0.85), true);
      photoModal.classList.add("hidden");
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  photoFile.value = ""; // 같은 파일 다시 선택 가능
});

// ===== 초기화 =====
(function init() {
  const savedPhoto = localStorage.getItem(PHOTO_KEY);
  if (savedPhoto) applyPhoto(savedPhoto, false);
  const savedMin = localStorage.getItem(STORE.min);
  const savedSec = localStorage.getItem(STORE.sec);
  if (savedMin !== null) inMin.value = savedMin;
  if (savedSec !== null) inSec.value = savedSec;
  readInputs();
  remainMs = totalMs;
  renderSoundBtn();
  requestAnimationFrame(tick);
})();
