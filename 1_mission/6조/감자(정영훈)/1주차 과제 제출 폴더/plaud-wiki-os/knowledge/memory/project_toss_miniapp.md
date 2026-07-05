---
name: 토스 미니앱 "피부과 가격 이거 맞아?" (IsThisFair)
description: 앱인토스 미니앱 — 피부과/치과 과잉진료 투명화. 2026-05-04 토스 미니앱 변환 완료 (.ait 3.9MB 빌드), 사용자 직접 액션 6건 대기.
type: project
originSessionId: c90d1f6a-e9b5-40d6-9010-f536585eae1a
---

## 2026-05-04 토스 미니앱 변환 (자율모드 7/7 완료)
- frontend → 토스 미니앱 풀 변환. step-1~7 commit 7개.
- 의존성: React 19→18.3, `@apps-in-toss/web-framework@^2.4.7`, `@toss/tds-mobile@^2.3.0`, `@toss/tds-mobile-ait@^2.3.0`, `@emotion/react+styled`
- `frontend/granite.config.ts`: appName=isthisfair / displayName="피부과 가격 이거 맞아?" / primaryColor=#3182F6 / icon=public/icon.png(600×600 placeholder, 사용자 디자인 교체 대기)
- `src/main.tsx`: TDSMobileAITProvider 래핑
- 외부 링크 3곳(ReviewModal:240, HospitalList:364·392) → 토스 SDK `openURL` 위임으로 변환. `src/lib/toss-sdk.ts`에 `openExternalURL()` 헬퍼 추가, 일반 웹은 `window.open` fallback. href 유지로 접근성 보존
- `src/components/DisclaimerFooter.tsx` 신규: §5 의료법 회피 4·5번 cover ("진료를 대체하지 않음" + "사용자 제보·공개 리뷰 집계 참고 자료 · 기준 시점 YYYY-MM" + "병원 선택은 본인의 판단"). VITE_DATA_AS_OF env 갱신 가능
- `npx ait build` 통과 → `frontend/isthisfair.ait` 3.9MB 생성, deploymentId 발급. .gitignore에 `*.ait` 추가
- `launch/[M]_application_draft.md` §7 체크리스트 코드 측 10/12 [x] 갱신
- gstack browse QA 통과: 페이지 정상 로드, 콘솔 에러 0(SafeArea는 일반 웹 정상 동작), DisclaimerFooter 3줄 모두 텍스트 매칭, 모바일 375×812 레이아웃 정상
- `.env.local` 만료된 cloudflare tunnel → fly.io production URL로 갱신

## 의료광고법 해석 (사용자 결정)
- 의료법 §56(의료광고)은 의료인·의료기관의 의료서비스 광고 행위 대상. 병원 대가 없는 정보 플랫폼은 §56 직접 대상 아님
- `[M]_application_draft.md` §5 회피 5종은 **표시광고법(소비자 오인 방지) + 토스 검수 정책 자체 가드**로 톤 보정. "사전심의 리스크" 표현은 과장 — 메모리·문서에서 동일 톤 유지

## 사용자 직접 액션 (블로커, 코드 외)
1. 사업자 정보 6번 표 (상호/대표/사등번/개업일/주소/유형) — 이메일 [연락처] / 전화 [연락처] 결정됨
2. 토스 콘솔 카테고리 대→중→소 트리 캡처 공유 → §1-2 매핑 확정
3. 로고 v1/v2/v3 중 1개 선택 → `frontend/public/icon.png` 교체
4. 썸네일 v1/v2 중 1개 선택
5. 부제 3안 중 1개 선택 (직설 / 부드러움 / 호기심)
6. 토스 채널톡 — 의료/건강 정보·가격 비교·리뷰 요약 콘텐츠 별도 심사 기준 문의

## 2026-05-05 콘솔 등록 진행 분 + 의료 정책 발견

**⚠️ 토스 §7 의료 출시 불가 카테고리 검토 누락 (내 실수)**:
- 토스 자체 오픈 정책(https://developers-apps-in-toss.toss.im/intro/guide.md) §7 의료 항목 미검토
- IsThisFair는 §7 "출시 불가" 또는 §2 "확인 필요(공공데이터 기반만 허용)"에 해당 — 우리는 사용자 제보 + Google 리뷰 기반이라 공공데이터 기반 X
- **채널톡 의료 카테고리 사전 문의 발송됨 (2026-05-05)**, 답변 결과에 따라 입점 가능성 결정
- 답변이 출시 불가면 데이터 모델 재설계(공공데이터 전환) 또는 카테고리 변경 필요

**appName 확정: `intoss://is-this-fair` (하이픈)**
- 콘솔 등록 후 수정 불가
- granite.config.ts: `appName: 'is-this-fair'` (단순 식별자)
- 첫 시도 `isthisfair`(하이픈 없음) → "appName이 다릅니다" 에러. `is-this-fair`로 빌드 후 매칭 통과
- 다음 토스 미니앱 작업 시: granite.config.ts appName과 콘솔 등록 appName(intoss:// prefix 제외 후) 정확히 일치 필수

## 2026-05-05 추가 작업
- **mTLS 인증서**: 토스 콘솔 발급. `~/.config/toss-isthisfair/client.crt`+`client.key` (chmod 600). README에 fly secrets 등록 명령 적어둠. 현재 IsThisFair는 IAP·user 정보 fetch 안 해서 즉시 등록 불필요
- **첫 흰 화면 사건**: cold start 였음. 재접속 시 정상. fly logs에서 metrics.batch 호출 도착 확인 = frontend mount 성공 = CORS·번들·디자인 정상
- **지도 sticky 적용**: HospitalList의 `<HospitalMap />`을 `position:sticky top:0 z-index:10` div로 wrap. 페이지 스크롤 시 지도 상단 고정, 카드 리스트만 흐름. 빌드 deploymentId `019df578-c61c-7686-b21f-f601151325d4`
- **폰 라이브 미리보기 자동화**: `frontend/scripts/dev-phone.sh` + `npm run dev:phone`. LAN IP 자동 감지(en0/en1), Android USB 감지 시 `adb reverse tcp:5173/8081` 자동, vite `--host 0.0.0.0` 노출. iOS는 폰 샌드박스 앱에서 LAN IP 직접 입력 필요
- **Claude Design 도구 시도 → 미사용**: 폰트·디자인 시스템 입력은 했지만 결과물 quality 미충족. PIL+nano-banana-pro 합성 결과 그대로 유지

## 토스 §7 의료 출시 불가 검토 결과 대기
- 채널톡 사전 문의 발송 (2026-05-05). 답변 결과에 따라:
  - 통과: 입점 검토 요청 진행
  - 출시 불가: 데이터 모델 재설계(공공데이터 기반 전환) 또는 카테고리 변경
- 우리 데이터: Google Places + 사용자 제보 + Google 리뷰 AI 요약 = 공공데이터 기반 X. 원칙적으로 §7 위반 가능
- **약관 URL**: https://company-web.vercel.app/legal/isthisfair-terms (company-web Next.js, vercel deploy 완료)
  - company.kr는 CloudFlare → www → 404 상태. DNS 미연결 별건. 일단 vercel URL로 등록
  - `company-web/app/legal/isthisfair-terms/page.tsx` (RSC, prose 톤)
  - `toss-miniapp/launch/[M]_terms_of_service.md` (md 원본)
- **연결 끊기 콜백**: 라이브
  - URL: https://isthisfair-api-company.fly.dev/api/toss/disconnect (POST, GET 둘 다 받음)
  - Basic Auth: [자격증명]
  - fly secrets `TOSS_DISCONNECT_AUTH` (Authorization 헤더 전체값 base64 인코딩)
  - 콘솔 "테스트하기" 통과 (user_key 없는 dummy 호출 200 OK 처리)
  - `backend/routers/toss.py` 신규 — userKey/anon_id 매칭 후 user_reviews/price_reports 삭제
  - 토스 콘솔에서 "전부 다 받음" 결정 (옵션 C, 사용자 결정 — 사고 리스크 보류)
- **frontend → backend user 정보 전달 코드는 미작업**: 콘솔에서 user_xxx 받기로 설정해도 우리 DB에 저장되지 않는 상태. 입점 후 v2에서 frontend appLogin 결과 전달 로직 추가 필요

## v2 기능 후보 (입점 통과 + 30일 retention 측정 후 결정, 2026-05-05)
- **KOL / Key Doctor 검색** — 소프웨이브 Top Doctor / 울쎄라 Master / 인모드 Key Doctor / 슈링크 등 미용 의료기기 공식 인증 의사 검증 + "피부과 전문의만 보기" 필터. 차별가치 4번째 축. 구현 방향 — UGC 제보 시작 → 사이트별 스크래핑(legal review 후) → 회사 협력 순. 입점 마무리 후 v2로 진행 결정 (입점 신청서·자산 영향 회피)



앱인토스 미니앱 "피부과 가격 이거 맞아?" (IsThisFair). MVP 0403 → gstack 사업성 검토(office-hours/ceo-review/market-research) → 모드 C(현 범위 유지) 결정 → 2026-05-04 영구 라이브.

**라이브 URL (영구):**
- Frontend: `https://frontend-nu-one-13.vercel.app` (Vercel 무료, 한국 CDN)
- Backend: `https://isthisfair-api-company.fly.dev` (Fly.io NRT 도쿄, 약 $2~5/월, auto_stop)
- Admin: `/admin?key=...` (ADMIN_KEY는 backend/.env)

**구현 위치:** `toss-miniapp/`

**스택:**
- Backend: Python FastAPI + JSON 파일 DB + Fly.io 영속 볼륨 1GB (NRT)
- Frontend: React + Vite + Vercel CDN
- 외부 API: Google Places (병원·리뷰·Vision OCR) + Gemini 2.0 Flash (리뷰 분석·음성 추출). **Anthropic 의존성 0** (사용자 결정 — Google API로 통일)

**핵심 자산:**
- 시드 30곳 (강남20+서초10) `backend/data/seed_hospitals.json` — Google Places 1회 호출($0.51)로 영구 박음
- 부정 리뷰 시드 `seed_review_summaries.json` — Google 리뷰 150개 분석, 부정 시그널 10곳 / 긍정 20곳. 화면 빨간 주의 박스
- 진료과 매핑 `lib/procedure_catalog.ts` — 피부과/성형외과/치과/한방 4분기

**기능 (라이브):**
- 거지맵 스타일 위치 자동 권한 팝업 (HTTPS라 모바일 정상)
- 영수증 OCR (Google Vision DOCUMENT_TEXT_DETECTION + 한국어 정규식 파서)
- 음성 리뷰 (Web Speech API ko-KR + Gemini로 시술/금액/별점/권유 자동 추출)
- 구글 리뷰 직접 링크 3군데 (카드/부정 박스/모달 헤더)
- D1/D7/D30 retention + 제보 작성률 + 깔때기 측정 (`/admin` 대시보드)

**검증 데이터 (2026-05-04):**
- 유튜브 댓글 1,095개 분석 — 갈증 시그널 5.4% 매우 강함, 그릇 가설(토스 미니앱)이 가장 큰 리스크
- 사용자 가설 = "신뢰 정보 플랫폼 각인 → 재방문 retention" / 메인 측정 D7/D30
- 폐기 임계: 입점 30일 후 D7 < 10% AND 제보 작성률 < 3% → kill_signal

**다음 마일스톤:**
1. 토스 콘솔 입점 신청 — 사업자 정보 채우기 (`launch/[M]_application_draft.md`) + 의료 콘텐츠 심사 기준 채널톡 문의
2. GOOGLE_API_KEY를 fly secrets에 추가 — 영수증 OCR + Gemini 자동 분석 활성화 (현재 GOOGLE_PLACES_API_KEY만)
3. 입점 통과 후 30일 retention 측정 시작
4. (선택) Vercel 프로젝트명을 `isthisfair`로 rename → URL 단축

**주의:**
- 본업 묶지 말기 — 사용자 명시: "내 사업에 도움될만한 방법으로 억지로 잡아 늘리지 말기". 토스 앱은 토스 앱대로 평가
- 차별 가치: "권유율" 단독이 아니라 "권유율 + 전문의/비전문의 + 상담실장 유무" 3축 (댓글 분석 결과)
- 법적 리스크 중간~높음: 의료광고 사전심의(일평균 10만+) + 의료법 단속 패턴(치료경험담·비급여 광고)

**Why:** 사용자 학습 목적 — 입점 쉬운 채널에서 traction 측정 경험 자체. 사업화는 신호 잡힌 후 결정.
**How to apply:** "토스앱", "피부과 가격 이거 맞아", "IsThisFair", "미니앱" 언급 시 이 프로젝트 참조. 이어서 작업 시 toss-miniapp/ 디렉토리 + 위 라이브 URL 확인.
