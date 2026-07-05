---
name: 진단 랜딩 Vercel 배포
description: company-landing Vercel 프로젝트 — diagnostic.company.kr 진단폼+API 24시간 가동 (2026-04-03)
type: project
---

GBP 진단 랜딩페이지를 Vercel에 배포 완료 (2026-04-03).

**구성:**
- 프로젝트: `company-landing/` (별도 git repo)
- Vercel 프로젝트: `company-landing` ([계정])
- 도메인: `https://diagnostic.company.kr`
- DNS: Cloudflare A 레코드 → 76.76.21.21 (Proxy OFF)

**API 엔드포인트 (Python serverless):**
- `/api/diagnostic-preview` — 병원 후보 검색
- `/api/diagnostic-analyze` — 상세 진단 + 경쟁사
- `/api/diagnostic-complete` — 리드 수집 + CRM + 텔레그램
- `/api/meta-leadgen` — 메타 인스턴트폼 웹훅
- `/api/photo` — Google Places 사진 프록시
- `/webhook/*` → `/api/*` 리라이트 설정됨

**환경변수 (Vercel production):**
- GOOGLE_PLACES_KEY, PLUUUG_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, META_ACCESS_TOKEN

**Why:** 기존 로컬 webhook-server.py + Cloudflare Quick Tunnel 구조에서 터널 URL 불안정으로 랜딩 페이지 접근 불가 → 메타 광고 60클릭 0리드 사고 발생. Vercel 배포로 24시간 안정 가동.

**How to apply:** 진단 폼 관련 수정은 `company-landing/` 프로젝트에서 작업 후 `vercel deploy --prod`. 로컬 `company-pipeline/webhook-server.py`는 더 이상 랜딩용으로 사용하지 않음.
