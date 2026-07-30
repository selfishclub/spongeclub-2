// 흔적 OS v2 · P0 — 🌙 저녁 승인 요청 (기본 21:30 KST)
// ─────────────────────────────────────────────────────────────
// 하는 일: 대상 역할의 '열린 할일'을 오래된 순으로 3개 뽑아,
//          "내일 뭐 하나 할까요?" 를 텔레그램으로 묻는다.
//          동시에 1번을 기본값(source='auto')으로 미리 저장해둔다.
//          → 답을 안 해도 내일 아침은 정상 작동한다. (무응답에 벌점 없음)
//
// 이건 응답을 요구하는 유일한 지점이다 (Sunsama형 ritual).

import { openLoops, setFocus } from "../lib/store.js";
import { eveningMessage, kstTomorrow, daysOpen } from "../lib/brief.js";
import { send } from "../lib/telegram.js";
import { cronAuthorized } from "../lib/auth.js";

const FOCUS_ROLE = process.env.FOCUS_ROLE || "본업";
const CANDIDATE_COUNT = Number(process.env.CANDIDATE_COUNT || 3);

export default async function handler(req, res) {
  if (!cronAuthorized(req)) return res.status(401).send("unauthorized");

  try {
    const forDate = kstTomorrow();
    const rows = await openLoops(FOCUS_ROLE, CANDIDATE_COUNT);

    // 후보가 없으면 아무것도 보내지 않는다. 조용함이 기능이다 (PRD P7).
    if (rows.length === 0) {
      console.log(`[evening] ${FOCUS_ROLE} 열린 할일 없음 — 발송 생략`);
      return res.status(200).json({ skipped: "no-candidates", role: FOCUS_ROLE });
    }

    const candidates = rows.map((r) => ({
      id: r.id,
      text: r.text,
      daysOpen: daysOpen(r.createdAt),
    }));

    // 기본값 = 가장 오래 열린 것(1번). 답장이 오면 webhook 이 'approved' 로 덮어쓴다.
    await setFocus({
      forDate,
      role: FOCUS_ROLE,
      traceId: candidates[0].id,
      text: candidates[0].text,
      daysOpen: candidates[0].daysOpen,
      source: "auto",
      candidates,
    });

    await send(eveningMessage({ role: FOCUS_ROLE, candidates }));

    console.log(`[evening] ${forDate} 후보 ${candidates.length}개 발송`);
    return res.status(200).json({ ok: true, forDate, count: candidates.length });
  } catch (e) {
    console.error("[evening] 실패:", e);
    return res.status(500).json({ error: String(e.message || e) });
  }
}
