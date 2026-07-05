---
name: Pluuug API 인증 spec (3/31 정책)
description: Pluuug Open API 호출 시 필요한 X-API-KEY + X-Signature(HMAC-SHA256) 형식과 Agency 플랜 요건. 미래에 Pluuug 다시 건드릴 때 필요.
type: project
originSessionId: 879313d3-3b50-4b8b-986c-44e908f03169
---
Pluuug Open API는 2026-03-31부터 인증 정책이 바뀌어 **X-API-KEY + X-Signature 둘 다 필수**다.

**Why:** 2026-05-03 살리기 작업에서 발견. 그 전엔 X-API-KEY만 보내고 동작했는데 정책 변경 이후 키 종류 무관 100% 동일 403(`<p></p>` 정적 HTML, 키 검증 단계까지 도달도 못 함). 4/9 marketing-dashboard에 "403 → 빈 데이터 fallback" 패치가 들어왔는데 그게 진짜 신호였고 그때 정책 변경을 안 판 게 부재. 5/3에 사용자가 Pluuug 고객지원 문의 → 정책 변경 답변 받음 → 새 API Key + Secret Key 페어 발급받아 살림.

**How to apply:**

1. **API Key + Secret Key는 페어**다. 콘솔에서 같이 발급받음. Secret Key 단독으론 못 씀. `.env`에 둘 다 박혀야 함:
   - `PLUUUG_API_KEY=...` (헤더 X-API-KEY 값)
   - `PLUUUG_SECRET_KEY=...` (HMAC secret)

2. **서명 형식 (Pluuug 공식 문서 — https://docs.openapi.pluuug.com/authentication):**
   - 알고리즘: HMAC-SHA256
   - Secret: 발급된 Secret Key (API Key 아님 — 4/9 marketing-dashboard 코드는 API Key를 secret으로 써서 깨졌었음)
   - 대상: 요청 본문 raw string (없으면 빈 문자열 `""`)
   - 인코딩: hex (16진수)
   - 추가 헤더: 없음 (X-API-KEY + X-Signature만)

3. **호출 예시:**
   ```python
   import hmac, hashlib
   sig = hmac.new(SECRET_KEY.encode(), b"", hashlib.sha256).hexdigest()
   headers = {"X-API-KEY": API_KEY, "X-Signature": sig}
   ```
   ```ts
   const sig = createHmac("sha256", secretKey).update(body).digest("hex");
   ```

4. **추가 제약 (정책 페이지 명시):**
   - 분당 1,000회 제한 (초과 시 429)
   - **Agency 플랜에서만 Open API 사용 가능** — 플랜 다운그레이드 시 같은 키도 403 막힘. 플랜 만료 의심되면 Pluuug 콘솔 결제/구독 메뉴 확인부터.

5. **company 코드 위치:**
   - 파이썬: `company-landing/api/_lead-count.py` (지금은 `_` prefix로 endpoint 비활성, Vercel Hobby 12 functions 한도 회피용 4/27 의도적 비활성)
   - TS: `marketing-dashboard/src/lib/pluuug.ts` (5/5에 SOLAPI로 갈아끼워서 import 0건. 회수 미실행 상태로 남음)

6. **회수 vs 살리기 결정 컨텍스트:** 4/27 SOLAPI 단일화 후 Pluuug에 데이터가 한 달간 안 들어감. 살린다고 신규 데이터가 흐르는 게 아니라 *과거 데이터 가시화*만 살아남. 미래에 Pluuug 완전 회수가 정상 경로 — `pluuug.ts`, `_lead-count.py`, `.env`의 `PLUUUG_*`, `env.ts` 스키마 다 제거.
