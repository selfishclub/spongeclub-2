// 흔적 OS v2 · P0 — 텔레그램 발송 helper

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const DEFAULT_CHAT_ID = process.env.ALLOWED_CHAT_ID;

/** 텔레그램으로 한 통 보낸다. chatId 생략 시 ALLOWED_CHAT_ID(내 채팅)로. */
export async function send(text, chatId = DEFAULT_CHAT_ID) {
  if (!TELEGRAM_TOKEN) throw new Error("TELEGRAM_TOKEN 이 없습니다");
  if (!chatId) throw new Error("보낼 chat_id 가 없습니다 (ALLOWED_CHAT_ID 확인)");

  const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`telegram ${res.status}: ${await res.text()}`);
  return res.json();
}

/** 답장은 실패해도 흐름을 끊지 않는다 (텔레그램 재시도 폭주 방지) */
export async function replySafe(chatId, text) {
  try {
    await send(text, chatId);
  } catch (e) {
    console.error("reply 실패:", e.message);
  }
}
