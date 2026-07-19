// 툴바의 강아지 아이콘을 클릭하면 시계/타이머 전용 창을 새로 연다.
// default_popup 을 지정하지 않았기 때문에 onClicked 이벤트가 발생한다.

const WIN_KEY = "clockWindowId";

chrome.action.onClicked.addListener(async () => {
  // 이미 열려 있는 창이 있으면 그 창을 앞으로 가져온다(중복 방지).
  const { [WIN_KEY]: existingId } = await chrome.storage.local.get(WIN_KEY);
  if (existingId !== undefined) {
    try {
      await chrome.windows.update(existingId, { focused: true });
      return;
    } catch (e) {
      // 창이 이미 닫혔으면 아래에서 새로 만든다.
    }
  }

  const win = await chrome.windows.create({
    url: "clock.html",
    type: "popup", // 주소창/탭 없는 깔끔한 발표용 창
    width: 960,
    height: 680
  });
  await chrome.storage.local.set({ [WIN_KEY]: win.id });
});

// 창이 닫히면 저장된 id를 정리한다.
chrome.windows.onRemoved.addListener(async (windowId) => {
  const { [WIN_KEY]: existingId } = await chrome.storage.local.get(WIN_KEY);
  if (existingId === windowId) {
    await chrome.storage.local.remove(WIN_KEY);
  }
});
