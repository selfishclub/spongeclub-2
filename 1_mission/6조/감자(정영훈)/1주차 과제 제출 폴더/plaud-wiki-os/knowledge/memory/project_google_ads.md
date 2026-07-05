---
name: Google Ads 병원마케팅 캠페인
description: MCC 661-143-1558, 운영계정 8000205042. Lead Form Asset + Vercel Cron 감시, 리뷰대응 광고그룹 신설 (2026-04-23 전면 개정)
type: project
originSessionId: 190396d1-c7ad-4811-bcb7-5a0945a1234e
---
Google Ads 검색광고. Meta 인스턴트폼과 동일 구조(Lead Form)로 통일 + Vercel Cron으로 일일 감시.

## 계정 구조
- MCC: `661-143-1558` (본사, 광고 데이터 없음)
- 운영: `8000205042` ← **이게 Customer ID**. Dev Token `[DEV_TOKEN]`
- Login Customer ID 불필요 (OAuth 계정이 운영 계정에 직접 권한)
- 전환 ID: `AW-17964861269` (별개. Customer ID와 혼동 금지 — 과거 오설정 원인)

## 캠페인
- `검색_병원마케팅_GBP진단` (ID `23720844122`), 일 예산 12K, ENABLED (2026-04-23 최적화 완료 후 재가동)
- 광고그룹 2개:
  · `195501273016` — "광고그룹 1", GBP 진단 앵글
  · `198898387907` — "리뷰대응", 악성 리뷰 후불제 앵글 (신규)

## Lead Form Asset (Asset ID `352351491881`)
- Campaign 레벨 연결. 질문: 병원명/성함/연락처 (지역 커스텀은 Google validation 거부)
- 웹훅: `https://diagnostic.company.kr/webhook/google-leadgen`
  → `vercel.json` rewrite로 `meta-leadgen.py`로 라우팅, body 모양(`user_column_data`+`google_key`) 검사해 `_google_leadgen.py`로 디스패치 (Hobby 12 function 제한 회피 — 언더스코어 파일은 function 카운트 제외)
- Secret: `GOOGLE_LEADFORM_SECRET` (Vercel env)
- SMS는 광고그룹 ID로 앵글 분기. 카카오채널 친추 `http://pf.kakao.com/_Dxidin/friend` CTA 포함

## 네거티브 키워드 (캠페인 레벨 EXACT, 2026-04-23 추가)
일반인 유입 차단 8개: 내 비즈니스, 구글 비즈, 구글 비즈니스, 구글 플레이스 등록 하기, 마이 비즈니스 등록, 비즈니스 프로필, 마이 비즈니스, 비즈니스 등록
→ 30일 기준 ₩n(전체 29%) 낭비 차단

## 리뷰대응 광고그룹 키워드 7개
악성 리뷰 삭제 / 구글 리뷰 삭제 / 구글 맵 리뷰 삭제 / 리뷰 삭제 대행 / 병원 악성 리뷰 / 구글 리뷰 신고 (PHRASE) + 리뷰 관리 대행 (BROAD). RSA 소재는 완곡 표현 ("악성 리뷰 대응 후불제", "삭제된 것만 n만원", "정책 위반 리뷰 신고 대행") — Google 정책 거부 회피.

## 일일 감시 (Vercel Cron, 맥 무관)
- `gbp-dashboard/app/src/app/api/cron/ads-daily-report/route.ts`
- NOTE: gbp-dashboard 폐기 (2026-05-03) 시 이 Vercel Cron도 중단됨. Vercel 프로젝트 비활성화 시 자동 중단.
- 스케줄 UTC 00:00 = KST 09:00 (`0 0 * * *`)
- 임계값 4개:
  🔴 7일 전환 0건 (추적 끊김 의심)
  🔴 어제 클릭 20+ & 전환 0
  🟡 예산 소진 40% 미만
  🟡 CPC 6일 평균 대비 +50% 급등
- 텔레그램 HTML 포맷 발송. 경고 없으면 "이상 없음"

## 파일
- `gbp-dashboard/app/src/lib/google-ads/client.ts` — v20 REST (ads-report.ts는 v18 하드코딩이라 수정함)
- `gbp-dashboard/app/src/lib/auth/token-manager.ts` — OAuth DB 자동 갱신 (Supabase `oauth_tokens` 테이블)
- `company-landing/api/meta-leadgen.py` — Meta + Google 웹훅 디스패처 (body 모양 기반)
- `company-landing/api/_google_leadgen.py` — Google 리드 처리 로직

## Why
2026-04-06~23 랜딩 폼 전환율 0% 확인 (19일간 리드 0건). Lead Form Asset으로 Meta 인스턴트폼과 동일 구조화. 리뷰 삭제 앵글이 Meta C앵글에서 리드 나옴 → Google에도 별도 광고그룹으로 확장.

## How to apply
- Customer ID는 Dashboard 우측 상단 10자리. AW- 접두어 붙은 건 전환 ID (다름)
- OAuth 토큰 만료 시: OAuth Playground(`https://developers.google.com/oauthplayground/`)에서 `https://www.googleapis.com/auth/adwords` scope로 refresh_token 재발급 → Supabase `oauth_tokens`에 INSERT
- Privacy URL: `https://diagnostic.company.kr/privacy` (2026-04-23 생성)
- 카카오채널: `pf.kakao.com/_Dxidin/friend`
