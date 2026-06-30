"use strict";

/* 스폰지 타이머 — service worker
   단축키(commands)를 받아 현재 탭에 오버레이를 주입하고,
   content.js 가 pendingHotkey 를 소비하며 시작/정지를 토글한다. */

const INJECTABLE = /^(https?|file):/;

async function activate(mode) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null || !INJECTABLE.test(tab.url || "")) return;

  const { spongeTimer } = await chrome.storage.local.get("spongeTimer");
  const base = spongeTimer || {};
  await chrome.storage.local.set({
    spongeTimer: {
      ...base,
      active: true,
      mode,
      pendingHotkey: true,
      soundOn: base.soundOn !== false,
    },
  });

  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["overlay.css"] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
  } catch (e) {
    /* chrome:// 등 주입 불가 페이지는 무시 */
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-timer") activate("timer");
  else if (command === "toggle-stopwatch") activate("stopwatch");
});
