// 흔적 OS v2 · P0 — 🟢 아침 전환 브리핑 (기본 09:00 KST)
// ─────────────────────────────────────────────────────────────
// 하는 일: 어젯밤 확정된 '오늘의 하나'를 되돌려준다. 그게 전부다.
//
// 설계 제약 (PRD §5):
//   · 버튼 없음. 읽는 것만으로 가치가 완결된다 (P9)
//   · 자동 선택이었으면 "제가 골랐어요"라고 밝힌다 (P10)
//   · 보낼 게 없으면 아무것도 보내지 않는다 (P7)

import { getFocus, updateFocus } from "../lib/store.js";
import { morningMessage, kstToday } from "../lib/brief.js";
import { send } from "../lib/telegram.js";
import { cronAuthorized } from "../lib/auth.js";

export default async function handler(req, res) {
  if (!cronAuthorized(req)) return res.status(401).send("unauthorized");

  try {
    const today = kstToday();
    const focus = await getFocus(today);

    if (!focus) {
      console.log(`[morning] ${today} 확정된 하나 없음 — 발송 생략`);
      return res.status(200).json({ skipped: "no-focus", date: today });
    }

    // cron 이 두 번 불려도 두 번 보내지 않는다
    if (focus.delivered_at) {
      console.log(`[morning] ${today} 이미 배달됨 — 생략`);
      return res.status(200).json({ skipped: "already-delivered", date: today });
    }

    await send(morningMessage({ role: focus.role, focus }));
    await updateFocus(today, { delivered_at: new Date().toISOString() });

    console.log(`[morning] ${today} 배달 완료 (${focus.source})`);
    return res.status(200).json({ ok: true, date: today, source: focus.source });
  } catch (e) {
    console.error("[morning] 실패:", e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
