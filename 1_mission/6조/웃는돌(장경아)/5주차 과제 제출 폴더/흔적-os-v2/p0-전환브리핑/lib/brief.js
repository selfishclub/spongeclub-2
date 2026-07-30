// 흔적 OS v2 · P0 — 문안 생성 + KST 날짜 계산
// ─────────────────────────────────────────────────────────────
// 여기엔 저장소·네트워크 의존이 하나도 없다. 순수 함수만.
// → dry-run 테스트에서 문안을 그대로 눈으로 확인할 수 있다.

const KST_MS = 9 * 60 * 60 * 1000;

/** 지금(UTC 기준 Date)을 한국 날짜 'YYYY-MM-DD' 로 */
export function kstToday(now = new Date()) {
  return new Date(now.getTime() + KST_MS).toISOString().slice(0, 10);
}

/** 한국 기준 '내일' */
export function kstTomorrow(now = new Date()) {
  return new Date(now.getTime() + KST_MS + 86_400_000).toISOString().slice(0, 10);
}

/** 흔적이 며칠째 열려 있는지 (없으면 null) */
export function daysOpen(createdAt, now = new Date()) {
  if (!createdAt) return null;
  const ms = now.getTime() - new Date(createdAt).getTime();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** "(12일째 열림)" 같은 꼬리표. 0~1일이면 굳이 안 붙인다(부담 주지 않기). */
function ageTag(d, { first = false } = {}) {
  if (d == null || d < 2) return "";
  return first ? `(${d}일째 열림)` : `(${d}일째)`;
}

// ── 🌙 저녁 21:30 — 승인 요청 (Sunsama형 ritual · 응답을 요구하는 유일한 지점)
export function eveningMessage({ role, candidates }) {
  const lines = candidates.map((c, i) => {
    const tag = ageTag(c.daysOpen, { first: i === 0 });
    return `  ${i + 1}. ${c.text}${tag ? `   ${tag}` : ""}`;
  });

  return [
    `🌙 내일 ${role} 시작할 때, 뭐 하나 할까요?`,
    ``,
    ...lines,
    ``,
    `숫자 하나만 보내주세요. 다른 걸 쓰셔도 돼요.`,
    `그냥 두셔도 괜찮아요 — 1번으로 할게요.`,
  ].join("\n");
}

// ── 🟢 아침 09:00 — 배달 (Readwise형 · 읽는 것만으로 완결 · 버튼 없음, P9)
export function morningMessage({ role, focus }) {
  const why =
    focus.source === "approved"
      ? `어젯밤 직접 고르신 거예요.`
      // 자동 선택이면 반드시 그렇다고 밝힌다. 근거 없는 확신을 주지 않는 것이 신뢰의 조건 (P10)
      : `가장 오래 열려 있어서 제가 골랐어요${focus.days_open >= 2 ? ` (${focus.days_open}일째)` : ""}.`;

  return [
    `🟢 ${role} 모드예요.`,
    ``,
    `▸ 지금 이거 하나`,
    `   ${focus.text}`,
    ``,
    `   ${why}`,
    ``,
    // P9(응답 요구 0)에 대한 유일한 예외. §8의 '완료율' 지표를 얻을 통로가 이것뿐이라 남겼다.
    // 명령형이 아니라 '안 보내도 괜찮다'를 함께 적어, 무응답에 죄책감이 붙지 않게 한다.
    // 지표를 다른 경로(웹 대시보드 체크 등)로 얻게 되면 이 줄은 지워도 된다.
    `(끝내면 '완료'라고만 보내주세요 — 안 보내도 괜찮아요)`,
  ].join("\n");
}
