---
name: 광고 파이프라인 V2 — Meta + Google 통합
description: Meta 인스턴트폼 + Google Lead Form → 자동 진단 → CRM/텔레그램/SMS/카카오 친추. Vercel Cron 일일 감시 (2026-04-23 Google 통합)
type: project
originSessionId: 190396d1-c7ad-4811-bcb7-5a0945a1234e
---
## 통합 파이프라인 흐름

```
Meta/Google 광고 → (Meta 인스턴트폼 / Google Lead Form)
    ↓
Vercel 웹훅 수신 (company-landing, 맥 무관 클라우드)
  · Meta: /webhook/meta-leadgen → meta-leadgen.py
  · Google: /webhook/google-leadgen → meta-leadgen.py → _google_leadgen.py 디스패치
    ↓
  · Google Places 자동 진단 (진단 앵글만)
  · Supabase crm_inquiries INSERT (source=meta_ads / google_ads)
  · Telegram 알림
  · Solapi SMS 발송 (앵글별 훅 + 카카오채널 친추 CTA)
    ↓
SMS에 카카오채널 친추 URL: http://pf.kakao.com/_Dxidin/friend
```

## 웹훅 라우팅 트릭 (Vercel Hobby 12 function 제한 회피)
- `meta-leadgen.py`가 body 구조로 Meta/Google 식별:
  - `user_column_data` + `google_key` 있으면 → `_google_leadgen.py` 호출
  - `entry` 있으면 → Meta 기존 로직
- `_` 접두사 파일은 Vercel function 카운트에서 제외 → 기능 추가하면서 제한 초과 방지

## diagnostic.company.kr 필수 페이지
- `/privacy` — 개인정보 처리방침 (2026-04-23 생성, Lead Form 승인 조건 충족)
- `/book` — 대면 상담 예약
- 랜딩 폼(`/diagnostic-complete`) 은 19일 전환 0건 → 실질 폐기 상태. 광고는 Lead Form으로만 유도

## 일일 감시
- Vercel Cron: `gbp-dashboard/app/api/cron/ads-daily-report` (KST 09:00)
- NOTE: gbp-dashboard 폐기 (2026-05-03). Vercel 프로젝트(`prj_Cck1363OfP8MXfo2cXsE1ZowO6jM`) 비활성화 시 이 cron도 중단됨. 재구성 시 standalone Vercel 함수로 이전 필요.
- 상세는 `project_google_ads.md` 참조

## 주요 환경변수
- `company-landing` Vercel: `META_ACCESS_TOKEN`, `META_VERIFY_TOKEN`, `GOOGLE_LEADFORM_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CRM_BASE_URL`, `CRM_API_KEY`, `TELEGRAM_*`, `SOLAPI_*`, `GOOGLE_PLACES_API_KEY`
- `gbp-dashboard/app` Vercel: `GOOGLE_CLIENT_*`, `GOOGLE_ADS_*`, `CRON_SECRET`, `TELEGRAM_*`, `SUPABASE_*`
- 주의: `printf '%s'`로 넣어야 함 (echo는 \n 붙어 토큰 깨짐)

## Why
- 랜딩 폼 전환율 0% 확인 → Lead Form으로 구조 통일
- Google Ads 클릭 55 / 전환 0(랜딩) → Lead Form Asset + 전환 태그 내장으로 전환 복구 기대
- 리뷰 삭제 앵글(Meta C) 전환 검증됨 → Google에도 별도 광고그룹으로 확장
- 맥 종속 자동화를 점진 이전: ads 감시는 Vercel Cron, 나머지 오케스트레이터는 아직 launchd

## How to apply
- 새 리드 경로 추가 시 meta-leadgen.py 디스패처 패턴 확장
- 앵글 추가 시 `_google_leadgen.py`의 `AD_GROUP_SLOT_MAP` 및 `_build_sms` 문구 수정
- SMS 문구 일관성: "[우리 회사] {원장님} … ▶ 카카오채널 … ▶ 전화 [연락처]"
