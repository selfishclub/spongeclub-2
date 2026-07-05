---
name: 비몽사몽해몽 토스 미니앱
description: 동서고금 6대 꿈해석 통합 해몽 토스 미니앱. Vite+React 프론트 + Next.js+Gemini 백엔드 + Supabase(회원·히스토리·일관성). DEMO 배포 완료, 공식 문서 검증 후 6개 항목 누락 확인 (2026-05-05)
type: project
originSessionId: 9c7e678d-1c2e-42c7-86c5-f0fbc5e92795
---
# 비몽사몽해몽 (토스 미니앱)

한국·서양·중국·일본·이슬람·뇌과학 6대 전통을 통합한 꿈해몽 서비스. 5단 카드 포맷(🌙 핵심상징 / 📖 통합해몽 / 🔮 운세 / ⚡ 길흉 / 💡 조언) 고정.

## 위치
- 프론트: `~/Desktop/claude code/bimong-haemong/` (Vite + React 18.3 + TS + Tailwind + @apps-in-toss/web-framework v2.4.7 + @toss/tds-mobile v2.3 + @toss/tds-mobile-ait v2.3)
- 백엔드: `~/Desktop/claude code/bimong-haemong-api/` (Next.js 16 + @anthropic-ai/sdk)
- 자료 원본: `~/Desktop/비몽사몽해몽/` (system_prompt 16KB + 6대 전통 자료집)

## 핵심 결정
- 호스팅: **토스는 Vercel 호스팅 불가** — `.ait` 번들로 토스 자체 호스팅(`https://<appName>.apps.tossmini.com`). 그래서 프론트(.ait)와 백엔드(Vercel)를 분리.
- 모델: `gemini-2.5-flash` (무료 티어 사용 가능, 일 250req). pro는 결제 활성화 필요 — 차단됨. max_tokens 4096. system_prompt는 `systemInstruction`으로 전달, Gemini 컨텍스트 캐싱 미적용 (16KB는 임계치 미달).
- **결과 캐싱 적용 (v2, 2026-05-04)** — `SHA256(dream + saju)` 키, TTL 30일. saju 객체 키는 알파벳 정렬로 결정성 확보. dev=`Map` LRU 1000건 (in-memory), prod=Upstash Redis (`@upstash/redis@1.37.0`, Vercel Marketplace 자동 주입). `@vercel/kv`는 deprecated 확인 → Upstash로 일원화. 응답 시간: 첫 호출 ~10s → cache hit ~25ms. 응답 스키마에 `cached: boolean` 추가 (프론트 무시 가능, 디버깅용).
- 토스 SDK: `getOperationalEnvironment()` + `appLogin()` 동적 import. UA fallback. 익명 사용 가능 — 로그인 필수 X
- 포트 통일: 프론트 5173, 백엔드 dev 3001 (`next dev -p 3001`)
- 5단 포맷 헤더/순서 절대 변경 금지

## Why
- spec(Next.js+Vercel)과 토스 입점 요구사항이 충돌해서 하이브리드(A안)로 결정. 백엔드 분리하면 v2 확장(꿈일기 저장 등)에도 유리.

## How to apply
- 프론트 코드 변경 시 정적 번들 유지(SSR/Server API 추가 금지). 모든 Claude 호출은 `VITE_DREAM_API_URL` 경유.
- 백엔드 모델 ID 변경 시 사용자 승인 필수. system_prompt 수정 시 5단 헤더 보존 검증.
- 토스 SDK 함수명은 추측 금지 — `node_modules/@apps-in-toss/web-framework/` d.ts 직접 확인.

## 사용자 액션 대기 항목
1. `bimong-haemong-api/.env.local`에 GOOGLE_API_KEY 주입
2. Vercel에 `bimong-haemong-api` 배포 → 발급된 URL을 프론트 `.env.local`의 VITE_DREAM_API_URL에 넣기
3. 프로덕션 CORS를 `*`에서 토스 도메인으로 좁히기
4. `public/icon.png` placeholder를 실제 아이콘으로 교체
5. 토스 콘솔 등록 → `.ait` 번들 빌드/업로드 → 검수 4종 통과
6. **토스 콘솔에서 IAP 단건 결제 모듈 활성화** + SKU `bimong_dream_1000` (1,000원 KRW) 등록 → 프론트 `VITE_DREAM_SKU` 값 동기화
7. **토스 IAP 서버 검증 시크릿 발급** → 백엔드 `TOSS_IAP_SECRET` 환경변수 주입
8. **토스 mTLS 클라이언트 인증서 발급** → `TOSS_IAP_MTLS_CERT` / `TOSS_IAP_MTLS_KEY` 환경변수에 PEM 형식으로 주입 (없으면 일반 fetch 시도하지만 토스 정책상 거부됨)
9. **프론트가 `userKey` 도 같이 백엔드에 전달하도록 수정** — `appLogin()` 으로 받은 토스 userKey 를 `POST /api/dream` body 에 `userKey` 필드로 추가. 백엔드는 이 값을 `x-toss-user-key` 헤더로 토스 API 에 전달.

## 보안 강화 (2026-05-04)
- **production 결제 검증 골격 작성됨** — `src/lib/payment.ts` 가 토스 공식 endpoint `POST https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/order/get-order-status` 호출. status 가 `PURCHASED`/`PAYMENT_COMPLETED` 일 때 통과, orderId 일치성까지 확인. `TOSS_IAP_SECRET` 발급받으면 환경변수 주입만으로 작동. mTLS 인증서가 같이 있으면 자동으로 mTLS 모드 활성화.
- **Replay 방어** — `src/lib/payment-store.ts` 신규. 검증 통과한 paymentKey 를 Redis used-set 에 1시간 TTL 로 저장 (`payment:used:<orderId>`). 같은 orderId 재사용 즉시 거부.
- **Rate limiting** — `src/lib/ratelimit.ts` 신규 + `@upstash/ratelimit` 설치. IP 당 분당 10건 / 일 100건. dev 는 in-memory fallback. 운영은 Upstash Redis sliding window. dev 검증: 11번째 호출에서 429 정상.

## 검증 결과 (2026-05-04)
- 빌드 양쪽 통과, TS 에러 0
- 헬스체크 `GET /api/dream` → `{ok:true}` 200 OK
- 입력 검증(빈값/500자초과/JSON파싱실패) 400 응답 정상
- gstack browse QA: idle/입력/로딩/결과 흐름 정상, 12.5초 응답, 콘솔 에러 0
- ⚠️ 모바일(375px) 결과카드 빽빽 — 폰트/패딩 다듬기 필요
- CRITICAL 없음. 자동화 테스트는 미작성.

## 기획 결정 (2026-05-04, office-hours 세션 후 APPROVED)
- **Wedge: 흉몽 풀이 전문** — 사용자 thesis "공포는 항상 돈이 된다". 점술 시장 절반 이상이 흉몽·살·액운 카테고리
- **Target user: 사주·점술에 이미 돈 쓰는 헤비유저** (점지·도토리운세 사용자)
- **접근: C (검증 우선) → A or B 분기**
  - 1~2주 데이터 검증 → 결과 보고 A(마케팅만) or B(풀빌드 5개 변경) 결정
  - 5개 변경 작업은 검증 후 결정
- **단위경제**: 1,000원/회 잠정. 점술 시장 평균(5천~3만원) 대비 낮아 "싸구려" 시그널 위험. 인터뷰에서 1000/5000/9900원 반응 검증
- **시나리오 D(우리 회사 B2B 시너지) 제거** — 사용자 결정
- **v2 system_prompt 적용** (2026-05-04) — 8단 카드(🌙📖🔮⚡🛐🚶⚠️💡) + 흉몽 wedge "조용히 일러줌" 톤 + 사주 컨텍스트 자리. 22.7KB. ⚠️ 경계할 일 섹션이 흉몽 wedge 핵심. route.ts POST에 saju 옵션 input 추가 (name/birth/time/eightChar/fiveElements). 토스 검수 안전선: 협박/공포 직설 어휘 금지, 의료·법률·금융 단정 금지
- **v2 사주 입력 폼 적용** (2026-05-04) — lunar-javascript@1.7.7로 양/음력 사주 8자 + 오행 자동 계산. `src/lib/saju.ts` (calculateSaju) + `src/components/SajuPanel.tsx` (접힘 details, 양력/음력+윤달 라디오, 12지지 시간 select). 선택 입력(안 해도 일반 해몽 정상). dreamApi.ts 시그니처 `fetchDream(dream, options?:{authCode?,saju?})`로 변경. 검증: 양력 1990-05-15 진시 = 음력 1990-04-21 진시 = `庚午 辛巳 庚辰 庚辰`(동일), 시간 모름이면 3쌍 반환. 백엔드 응답에 "庚金 일간으로 강한 금(金) 기운" 식 사주 통합 해석 들어감. 번들 +470KB(243→713 KB gzip 215KB).
- **TDS 모바일 디자인 전환** (2026-05-04) — 밤하늘+골드 → 토스 표준 흰 배경+blue500. 사용자 결정: 차별화 포기, 토스 사용자 친숙함·검수 안전·UX 표준 우선. React 19→18.3 다운그레이드 (TDS peer ^18 강제). 패키지 설치: react@18.3.1, react-dom@18.3.1, @types/react@18.3.28, @types/react-dom@18.3.7, @emotion/react@11.14.0, @emotion/styled@11.14.1, @toss/tds-mobile@2.3.0, @toss/tds-mobile-ait@2.3.0. main.tsx에 `<TDSMobileAITProvider>` 래핑. StarField.tsx + LoadingMoon.tsx 삭제. 새 컴포넌트 5개: DreamInput(Top + TextArea + FixedBottomCTA), LoadingScreen(Loader size=large type=primary), DreamResult(Top + 8단 카드 흰 배경 grey200 보더, ⚠️ 경계할 일은 #FFF7E8/#FFE4A8 노란 변형, kind 라벨 hero, fixed 하단 Button×3), SajuPanel(TextField + native date/select + radio + Button color=primary/light variant=weak). index.css에서 Noto Serif KR/Sans KR 구글 폰트 import 제거 → system font (Apple SD Gothic Neo/Pretendard). body 배경 deep-navy → #F7F8FA. 빌드 통과 (1,636KB / gzip 512KB, 이전 713KB 대비 +923KB — TDS 풀팩 비용. tree-shake 한계). gstack browse 캡처 3장: /tmp/bimong-tds-idle.png, /tmp/bimong-tds-loading.png, /tmp/bimong-tds-result.png. 실호출 케이스(흰 뱀 품에 안기는 꿈) 8단 카드 길몽 라벨 정상 파싱. 다음 단계: 캐싱(KV + SHA256(꿈+사주))
- **Why TDS**: 토스 사용자 친숙함·검수 안전·UX 표준 우선. 차별화 포기. 사용자 결정.
- **TDS How to apply**: 토스 SafeArea 콘솔 에러는 일반 웹에서 정상(native handler 부재). 토스 미니앱 환경에서만 정상 작동. 새 컴포넌트는 TDS 토큰만 사용. Noto Serif/Sans KR 부활 금지. StarField 부활 금지. legacy deep-navy/gold Tailwind 토큰은 유지(혹시 다른 곳에서 참조). 컴포넌트 명칭은 추측 금지 — `node_modules/@toss/tds-mobile/dist/esm/index.d.ts` 직접 확인. Top 컴포넌트는 children 아닌 `title`/`subtitleBottom` prop 사용. Button color는 'primary'|'danger'|'light'|'dark'만 지원('grey' 없음).
- **인앱 결제 통합 (2026-05-04)** — 토스 IAP 단건 결제 1,000원/회. `IAP.createOneTimePurchaseOrder`(d.ts: `node_modules/@apps-in-toss/web-bridge/dist/index.d.ts` L281~) 사용. 흐름: 해몽하기 클릭 → phase=`payment`(LoadingScreen caption "결제 화면을 여는 중…") → 토스 IAP 결제창(native) → 인증 성공 시 `processProductGrant({orderId})` 콜백 안에서 백엔드 호출(orderId=paymentKey, 해몽 결과까지 한 번에) → onEvent('success') → 화면 전환 result. 캐시 hit이면 결제 검증 skip + 무료 반환(`paymentRequired:false`, 사용자 친화). dev/일반 웹은 `DEV_BYPASS` 키로 우회. 백엔드 `verifyTossPayment` (`src/lib/payment.ts`)는 production에서 `TOSS_IAP_SECRET` 미설정이면 모든 일반 키 차단(우회 공격 방지). 실 서버 검증 endpoint는 입점 시점 TODO. 프론트 신규/변경: `tossClient.ts`(tryTossPayment), `dreamApi.ts`(paymentKey 옵션 + `{result,cached}` 반환 + PaymentRequiredError), `App.tsx`(payment phase + pendingResultRef), `LoadingScreen.tsx`(caption prop). 백엔드 신규/변경: `src/lib/payment.ts`, `src/app/api/dream/route.ts`(paymentKey 검증 + 캐시 hit 우회 path). 양쪽 빌드 통과. dev 테스트: 캐시 miss + no key → 402, 캐시 miss + DEV_BYPASS → Gemini 통과(quota 따로), 잘못된 키 → 402("TOSS_IAP_SECRET not configured"). 캐시 hit 우회는 단위 테스트(kvSet→kvGet)로 입증.

## 이번 주 검증 Assignment (4~6시간, 결과 후 office-hours 재호출)
1. 네이버 데이터랩 흉몽 키워드 월 검색량 vs 길몽 (30분)
2. 토스 미니앱 점술 카테고리 TOP 10 분석 (1시간)
3. 점지·도토리운세 헤비유저 10명 인터뷰 (2~4시간) — 흉몽 결제 의향 + 단가 반응
4. 토스 미니앱 검수 정책에서 "공포 조장 컨텐츠" 명문 확인 (1시간)

## Premises (모두 사용자 동의 + 검증 0)
- P1: 점술 헤비유저가 흉몽 wedge에 1000원 결제할 것 (Demand 검증 0)
- P2: 1000원이 적정 단가 (시장 평균 대비 낮음)
- P3: 토스 검수가 흉몽·공포 컨텐츠 통과 (가장 critical, 정책 명문 미확인)

Why: gstack QA(idle/입력/로딩/결과 흐름·콘솔에러0·12.5초 응답) 통과 후 office-hours로 사업성 검토. 사용자가 demand evidence 0·specific user 미정의·인터뷰 0 상태에서 5개 변경 풀빌드 가는 건 1개월 도박. C 검증 후 결정이 risk 70% 감소.

How to apply: 검증 결과 나오기 전엔 코드 변경 금지. 다음 office-hours는 4가지 검증 결과 가지고 와서 A or B 결정. 디자인 문서: ~/.gstack/projects/bimong-haemong-api/user-feat-marketing-dashboard-design-20260504-191142.md

---

## 2026-05-05 메이저 업데이트 — 회원 시스템 도입

### 정책 변경 (사용자 결정)
- "stateless 익명" 정책 폐기 → **회원 + DB + 히스토리** 도입
- 사주는 가입 시 1회 입력. 같은 사용자×같은 꿈 = 항상 같은 결과 (상반된 해몽 방지)
- CLAUDE.md "DB 도입 금지" 룰 풀림 (서비스 개발이라)

### Supabase
- 프로젝트 ref: `qhiguyzyzfdjntllzizh` (Tokyo, 비몽사몽해몽 전용)
- 마이그레이션 2개 적용 (`bimong-haemong-api/supabase/migrations/`):
  - `users` (user_key PK, 사주 5필드, 동의 시각)
  - `dreams` (id, user_key, dream_text, dream_hash, result — `(user_key, dream_hash)` UNIQUE = 일관성 키)
  - `error_logs` (client/server 에러 자동 수집)
- 모두 RLS deny-all + service_role 우회. 프론트는 Supabase 직접 접근 안 함

### 백엔드 새 라우트
- `POST /api/users` — 가입·사주 갱신 (`saju.time` 정규식에 `/` 포함 필수, "07시(辰時/진시)" 형식)
- `GET /api/users?userKey=...` — 가입 여부 조회
- `GET /api/dreams?userKey=...` — 마이페이지 히스토리
- `POST /api/errors` — 클라이언트 에러 자동 수집 (sendBeacon)
- `GET /api/errors?since=10m` — 관리자 조회 (`X-Admin-Token` 헤더 필수, ADMIN_TOKEN 환경변수)
- `POST /api/dream` — userKey 필수, `(user_key, dream_hash)` 조회 hit 시 결제 우회 + 기존 result 반환
- Gemini 503 retry: 1.5s→3s 백오프, 최대 3회 (`isRetryable` 정규식: `503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded`)
- DEMO_BYPASS 키: production·preview에서도 `DEMO_MODE=1` 환경변수 켜진 경우만 통과

### 프론트 흐름 재구조
- 부팅: `getOrCreateUserKey()` (localStorage `bimong_user_key`, 없으면 `web-{uuid}` 생성) → `fetchUser()` → 404면 SignupScreen
- 컴포넌트 신규: `SignupScreen` (사주 + 약관 2종 체크), `TabBar` (꿈/마이페이지), `MyPageTab` (히스토리)
- `DreamInput`에서 SajuPanel 분리 (사주는 가입 시 1회만)
- `lib/storage.ts`, `lib/dreamApi.ts` (fetchUser, signupUser, fetchDreamHistory, NeedsSignupError), `lib/errorReporter.ts` (sendBeacon → /api/errors)
- `showError` vs `showInfo` 분리: 에러만 자동 기록, 안내는 기록 X

### DEMO 모드 (동업자 모바일 데모용)
- 프론트: `VITE_DEMO_MODE=1` 빌드 시 vite alias로 `@toss/tds-mobile`/`@toss/tds-mobile-ait` → `src/lib/toss-stub/*` 로 redirect (일반 브라우저에서 import-time throw 우회). production 토스 빌드는 영향 X
- 백엔드: `DEMO_MODE=1` 환경변수 시만 `paymentKey:"DEMO_BYPASS"` 통과 — 검수 통과 후 끄기

### 배포 (Vercel, SSO Protection 둘 다 OFF)
- 프론트: https://bimong-haemong.vercel.app
- 백엔드: https://bimong-haemong-api.vercel.app
- 환경변수: GOOGLE_API_KEY, DEMO_MODE=1, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN

### 약관 작성 완료 (`bimong-haemong/legal/`)
- `terms-of-service.md` — 환불 불가 + AI 오락 콘텐츠 면책
- `privacy-policy.md` — 회원 도입 반영 필요 (현재는 stateless 기준 — **다음 세션에 갱신**)

### 공식 문서로 검증한 누락 항목 6개 (`apps-in-toss-skills` docs-search)
🔴 시급:
1. **`processProductGrant` 30초 제한 위반 위험** — 콜백 안에서 백엔드 호출 + Gemini retry로 30초 초과 가능 → 환불 페이지. **사용자가 본 "결제 실패"의 진짜 원인 추정**. 해결: 콜백 즉시 true 반환, AI 호출은 비동기 + 폴링
2. **`getPendingOrders` / `completeProductGrant` 복구 플로우 미구현** — 검수 반려 사유 가능
3. **`getProductItemList`로 SKU 등록 검증 안 함**

🟡 정식 운영 전:
4. **토스 로그인 서버 측 토큰 교환 미구현** (현재 web-uuid 임시 키만 사용)
5. **결제 검증 endpoint 추측** — 콘솔 시크릿 발급 시 정확한 endpoint 수령 예정
6. **`granite.config.ts` `project-validator` 미실행**

### git checkpoint
- `bimong-haemong-api/.git` 신규: `665a3a3` (1번째 커밋, 백엔드)
- `bimong-haemong/.git` 신규: `53aa118` (1번째 커밋, 프론트)
- 별도 repo로 시작. 상위 `claude code/` repo와 분리

### 다음 세션 진입 시
1. 빠진 6개 항목 우선순위 결정 (사용자에게 옵션 ABC 다시 물어봐)
2. `processProductGrant` 비동기 분리는 큰 리팩 — 백엔드에 `dream_jobs` 테이블 추가 또는 polling endpoint 신설 필요
3. 토스 콘솔에서 SKU `bimong_dream_1000` 등록 + 시크릿/mTLS 인증서 발급 받았는지 확인
4. `privacy-policy.md`를 회원 도입 후 데이터 흐름에 맞게 갱신

---

## 2026-05-05 (오전) 세션 — 시급 3개 fix 완료 + 시장 분석

### Step 1·2·3 완료 (검수 통과 필수 항목)
- **Step 1: `processProductGrant` 30초 비동기 분리** — `dream_jobs` 테이블 + `POST /api/dream/start` (즉시 200 + jobId, AI는 `after()` 백그라운드) + `GET /api/dream/result` (1.5s 폴링). 검증: start 응답 3.4초, 폴링 7회차(~10s)에 done. 토스 30s 환불 페이지 위험 제거.
- **Step 2: 복구 플로우** — `GET /api/dream/recover?paymentKey=...` + 프론트 `recoverPendingOrders()` 부팅 시 호출. 미지급 주문 → dream_jobs 조회 → done이면 `IAP.completeProductGrant()` 호출.
- **Step 3: SKU 검증** — `verifyProductSku(sku)` (getProductItemList 매칭) handleDreamSubmit 시작 부분에서 호출. SKU 미등록 시 결제 차단.
- 새 마이그레이션 `20260505000420_add_dream_jobs.sql` 적용 완료. dream_job_status enum + (user_key, payment_key) 인덱스.
- 새 lib: `src/lib/dreamService.ts` (Gemini 호출 + dreams insert + race condition 방어 분리). dream/start 와 기존 dream POST 가 공유.
- DEMO 배포 검증: 가입 → start → 폴링 → done 흐름 정상. e2e 테스트 통과.

### 운영 누락 3개 (남은 항목, 토스 콘솔 시크릿 발급 후 처리)
4. 토스 로그인 서버 측 토큰 교환 (현재 web-uuid 임시 키만 사용)
5. 결제 검증 endpoint 공식 확인 (콘솔 시크릿 발급 시 안내)
6. `granite.config.ts` `project-validator` 실행

### 데모 사용자 첫 케이스 검증 — 동업자
- user_key: `web-aef65b19-7f57-4462-aac7-1d108f6c59dd`
- 가입: 2026-05-05 10:05 KST (사주 입력: [생년월일시])
- 꿈 입력 1건 (메타광고+수족관+법전 3개 묶음) → 결과 정상 (사주 을목 일간 + 토·금 강함 정확히 통합)
- 에러 0건. **첫 사용자 경험 깨끗하게 통과.**

### 웹 + 토스 시장 분석 (worth saving)
- **SEO 경쟁**: "꿈해몽" 헤드 키워드는 위키·운세포털 독식(High). "AI 꿈해몽 + 사주 통합 + 일관성" 3축은 미점유 영역(Low~Medium). long-tail 진입 가능: AI 꿈해몽 사주, 오행 꿈해몽, 동서양 꿈해몽 비교, 꿈해몽 일관성, 이슬람 꿈해몽 한국어, 태몽 사주 풀이 등.
- **네이버 vs 구글**: 네이버는 자체 블로그·지식인 우선 → 외부 SaaS 거의 진입 불가. **구글에 집중**.
- **웹 애드센스 천장**: 한국 운세 카테고리 RPM $0.7~$3.5 (모바일 70%+, 광고주 좁음 → 일반 콘텐츠보다 낮음). 점신(1등) 월 PV 2,040만 → 광고 추정 4,400만~1억원이지만 실제는 자체 결제(상담 수수료) 비중이 더 큼. **신규 진입 현실선: 월 PV 100~200만 시 광고 200~700만원**.
- **토스 미니앱 광고**: 외부 애드센스 금지 → 토스 공식 SDK(인앱 광고 2.0 ver2 = 토스 애즈+애드몹)만. 공식 eCPM 예시 ₩5,000. 추천 구조: 결제 코어 + 보상형("광고 보고 1회 무료 해몽") + 결과 페이지 배너 1슬롯. 전면형은 검수·UX 부담.
- **결론 수치 (월 사용자 1만 기준)**: 광고만 ~15만원, 결제(전환율 5%) 50만원, 결제+광고 합산 65만원. **결제 모델이 광고보다 5~10배 빠른 ROI**. 결제 코어 + 광고 보조가 정답.

### git checkpoint
- `bimong-haemong-api` git: 1차 `665a3a3`, 2차(이번 세션) 미커밋 — 새 라우트 4개·dreamService·db.ts 확장·dream_jobs 마이그레이션
- `bimong-haemong` git: 1차 `53aa118`, 2차(이번 세션) 미커밋 — startDream/pollDreamResult/verifyProductSku/recoverPendingOrders 추가, App.tsx 비동기 흐름

### 다음 세션 진입 가이드
1. **사용자 모바일 테스트 완료 확인** — bimong-haemong.vercel.app (현재 정상)
2. **2차 git 커밋** 안 했음 — 다음 세션에서 코드 변경 시작 전 커밋 권장
3. **운영 4·5·6번 진행 시점**: 토스 콘솔 시크릿(TOSS_IAP_SECRET) + mTLS 인증서 발급 후
4. **웹 SEO 사이트 빌드**: 별도 프로젝트로 띄울지(company-* 패턴) 결정. 토스 미니앱 백엔드 재사용 가능 (CORS `*`)
5. **시급 항목**: privacy-policy.md를 회원 도입(DB) 후 데이터 흐름에 맞게 갱신
