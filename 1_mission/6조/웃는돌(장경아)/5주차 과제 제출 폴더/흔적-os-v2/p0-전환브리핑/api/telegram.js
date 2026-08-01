// 흔적 OS v2 · P0 — 텔레그램 webhook (답장 = 조작)
// ─────────────────────────────────────────────────────────────
// 세 갈래로만 갈린다:
//   ① 숫자 하나  → 내일의 '하나' 승인 (저녁 질문에 대한 답)
//   ② "완료"     → 오늘의 '하나' 닫기
//   ③ 그 외      → 기존 캡처로 흘려보냄 (자유 투척은 계속 살려둔다)
//
// 별도 캡처 '의무'는 폐지하되, 캡처 '통로'는 막지 않는다. (PRD 기능 2)

import { getFocus, updateFocus, markTraceDone, insertTrace } from "../lib/store.js";
import { kstToday, kstTomorrow } from "../lib/brief.js";
import { replySafe } from "../lib/telegram.js";

const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const UNSORTED_ROLE = process.env.UNSORTED_ROLE || "미분류";

const DONE_RE = /^(완료|했어|했어요|끝|done|ok)$/i;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("흔적 OS v2 브리핑봇 살아있음 🫧");

  if (WEBHOOK_SECRET) {
    const got = req.headers["x-telegram-bot-api-secret-token"];
    if (got !== WEBHOOK_SECRET) return res.status(401).send("bad secret");
  }

  try {
    const msg = (req.body || {}).message || (req.body || {}).edited_message;
    const text = msg && typeof msg.text === "string" ? msg.text.trim() : "";
    const chatId = msg && msg.chat ? msg.chat.id : null;
    if (!text || !chatId) return res.status(200).send("no text");

    if (ALLOWED_CHAT_ID && String(chatId) !== String(ALLOWED_CHAT_ID)) {
      return res.status(200).send("not allowed");
    }

    if (text.startsWith("/")) {
      await replySafe(chatId, "🫧 흔적 OS예요.\n밤에 내일의 하나를 물어보고, 아침에 그걸 되돌려드려요.\n그 밖의 말은 그냥 담아둘게요.");
      return res.status(200).send("cmd");
    }

    // ① 숫자 답장 = 내일의 하나 승인
    if (/^[1-9]$/.test(text)) {
      const handled = await handleApproval(chatId, Number(text));
      if (handled) return res.status(200).send("approved");
      // 승인 대기 중인 게 없으면 그냥 흔적으로 취급하고 아래로 흘린다
    }

    // ② 완료
    if (DONE_RE.test(text)) {
      const handled = await handleDone(chatId);
      if (handled) return res.status(200).send("done");
    }

    // ③ 그 외 = 캡처
    await captureFallback(chatId, text);
    return res.status(200).send("ok");
  } catch (e) {
    console.error("webhook 오류:", e);
    // 200 으로 응답해 텔레그램의 무한 재시도를 막는다 (실패는 로그로만) — 2주차와 동일한 방침
    return res.status(200).send("err");
  }
}

// ── ① 저녁 질문에 대한 숫자 답
async function handleApproval(chatId, n) {
  const forDate = kstTomorrow();
  const focus = await getFocus(forDate);
  if (!focus || !Array.isArray(focus.candidates) || focus.candidates.length === 0) {
    return false; // 물어본 적이 없다 → 승인이 아니라 그냥 숫자를 던진 것
  }

  const pick = focus.candidates[n - 1];
  if (!pick) {
    await replySafe(chatId, `1~${focus.candidates.length} 중에서 골라주세요 🙂`);
    return true;
  }

  await updateFocus(forDate, {
    trace_id: pick.id ?? null,
    text: pick.text,
    days_open: pick.daysOpen ?? null,
    source: "approved",
  });

  await replySafe(chatId, `✅ 내일 ${focus.role}은 이걸로 할게요.\n\n   ${pick.text}`);
  return true;
}

// ── ② 오늘의 하나 닫기
async function handleDone(chatId) {
  const today = kstToday();
  const focus = await getFocus(today);
  if (!focus) return false;

  if (focus.done) {
    await replySafe(chatId, "오늘 건 이미 닫아뒀어요 🙂");
    return true;
  }

  await updateFocus(today, { done: true });
  if (focus.trace_id) await markTraceDone(focus.trace_id);

  await replySafe(chatId, `잘하셨어요 ✅\n오늘 ${focus.role} 하나, 닫았습니다.`);
  return true;
}

// ── ③ 자유 문장 캡처
// P0에서는 분류하지 않고 '미분류'로만 담는다 (AI 판단 최소화).
// 🔗 P1에서 v1의 Claude 분류기를 여기에 연결한다.
async function captureFallback(chatId, text) {
  await insertTrace({ role: UNSORTED_ROLE, kind: "생각", text });
  await replySafe(chatId, `📥 담아뒀어요 ✅\n${text}`);
}
