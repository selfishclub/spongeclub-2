"use strict";

const $ = (s) => document.querySelector(s);
const minEl = $("#min");
const secEl = $("#sec");
const previewEl = $("#preview");
const errEl = $("#err");
const launchBtn = $("#launch");
const timerConfig = $("#timer-config");
const swNote = $("#sw-note");
const chips = [...document.querySelectorAll(".chip")];
const modeBtns = [...document.querySelectorAll(".mode")];

let durationSec = 300;
let mode = "timer";

function fmt(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function clampInt(value, lo, hi) {
  let v = parseInt(value, 10);
  if (Number.isNaN(v)) v = 0;
  return Math.max(lo, Math.min(hi, v));
}

function renderPreview() {
  previewEl.textContent = mode === "stopwatch" ? "00:00" : fmt(durationSec);
}

function renderChips() {
  chips.forEach((c) =>
    c.classList.toggle(
      "is-on",
      !c.classList.contains("soft") && Number(c.dataset.sec) === durationSec
    )
  );
}

function setMode(m) {
  mode = m;
  modeBtns.forEach((b) => b.classList.toggle("is-on", b.dataset.mode === m));
  const isSw = m === "stopwatch";
  timerConfig.hidden = isSw;
  swNote.hidden = !isSw;
  launchBtn.textContent = isSw ? "스톱워치 띄우기 ▶" : "타이머 띄우기 ▶";
  renderPreview();
}

function setFromInputs() {
  durationSec = clampInt(minEl.value, 0, 180) * 60 + clampInt(secEl.value, 0, 59);
  renderPreview();
  renderChips();
}

function setDuration(sec) {
  durationSec = sec;
  minEl.value = Math.floor(sec / 60);
  secEl.value = sec % 60;
  renderPreview();
  renderChips();
}

modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
chips.forEach((c) => c.addEventListener("click", () => setDuration(Number(c.dataset.sec))));
minEl.addEventListener("input", setFromInputs);
secEl.addEventListener("input", setFromInputs);

function showErr(msg) {
  errEl.textContent = msg;
  errEl.hidden = false;
}

async function launch() {
  errEl.hidden = true;
  if (mode === "timer" && durationSec < 1) {
    showErr("1초 이상으로 설정해주세요.");
    return;
  }
  const { spongeTimer: base } = await chrome.storage.local.get("spongeTimer");
  const ms = durationSec * 1000;
  const common = {
    active: true,
    soundOn: base?.soundOn !== false,
    pos: base?.pos ?? null,
    pendingHotkey: false,
    running: false,
  };
  const state =
    mode === "stopwatch"
      ? { ...common, mode: "stopwatch", swElapsedMs: 0, swStartedAt: null,
          durationMs: ms || 300000, timerRemainMs: ms || 300000, timerEndAt: null }
      : { ...common, mode: "timer", durationMs: ms, timerRemainMs: ms, timerEndAt: null,
          swElapsedMs: 0, swStartedAt: null };

  await chrome.storage.local.set({ spongeTimer: state });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || tab.id == null) throw new Error("no active tab");
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
    window.close();
  } catch (e) {
    showErr(
      "이 페이지에는 띄울 수 없어요 (chrome:// · 웹스토어 · 새 탭 등). 일반 웹페이지에서 다시 눌러주세요."
    );
  }
}

launchBtn.addEventListener("click", launch);

// 단축키 표기 (OS에 맞게)
const isMac =
  navigator.userAgentData?.platform === "macOS" || /Mac/i.test(navigator.platform || "");
$("#hk").textContent = isMac ? "단축키(⌘⇧Y)" : "단축키(Ctrl+Shift+Y)";

// 직전 설정 복원
chrome.storage.local.get("spongeTimer").then(({ spongeTimer }) => {
  if (spongeTimer?.durationMs) setDuration(Math.round(spongeTimer.durationMs / 1000));
  setMode(spongeTimer?.mode === "stopwatch" ? "stopwatch" : "timer");
});
