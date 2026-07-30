// 흔적 OS v2 · P0 — cron 엔드포인트 보호
// Vercel Cron 은 CRON_SECRET 환경변수가 설정돼 있으면
// 요청에 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 호출한다.
// → 이게 없으면 주소만 알면 누구나 브리핑을 강제 발송할 수 있다. 반드시 설정할 것.

const CRON_SECRET = process.env.CRON_SECRET;

export function cronAuthorized(req) {
  if (!CRON_SECRET) {
    // 설정을 안 했으면 막지는 않되, 로그로 크게 경고한다.
    console.warn("⚠️  CRON_SECRET 미설정 — cron 엔드포인트가 공개 상태입니다");
    return true;
  }
  const got = req.headers?.authorization || req.headers?.Authorization;
  return got === `Bearer ${CRON_SECRET}`;
}
