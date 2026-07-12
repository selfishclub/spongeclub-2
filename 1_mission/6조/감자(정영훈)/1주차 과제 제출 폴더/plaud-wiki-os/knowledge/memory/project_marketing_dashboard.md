---
name: 마케팅 통합 대시보드
description: 전 채널 마케팅 퍼널 대시보드 — LinkedIn+뉴스레터+Threads+Instagram+Meta Ads 통합 관리
type: project
originSessionId: 879313d3-3b50-4b8b-986c-44e908f03169
---
전 채널 마케팅 콘텐츠를 한 화면에서 보고 수정하는 통합 대시보드.

**Why:** 현재 각 엔진이 독립적으로 돌아가서 전체 퍼널 현황 파악이 어려움. 콘텐츠 수정도 텔레그램/파일로만 가능.

**결정사항 (2026-04-06 브레인스토밍):**
- 레이아웃: **통합 대시보드** (상단 KPI + 콘텐츠 큐 + 성과, 탭으로 채널별 상세)
- 관리 채널: LinkedIn, 뉴스레터(Beehiiv), Threads, Instagram, Meta Ads — 5개 전부
- 기능 범위: 콘텐츠 수정 + 스케줄 관리 + 성과 메트릭
- 사용자: 본인만 (단, 외부 네트워크 접근 필요 → Vercel 배포)
- 프로젝트: `marketing-dashboard/` 별도 (GBP 대시보드와 분리 — 고객용 vs 내부 운영용)
- 데이터 소스: **Supabase 중앙 DB** (ops-agent 이미 사용 중, 각 엔진이 INSERT → 대시보드가 SELECT)
- 스택: Next.js + Supabase + Vercel

**How to apply:**
- 스펙: `docs/superpowers/specs/2026-04-06-marketing-dashboard-design.md`
- 구현 계획: `docs/superpowers/plans/2026-04-06-marketing-dashboard.md`
- 브랜치: `feat/marketing-dashboard` (16/16 단계 완료)
- URL: https://marketing-dashboard-mocha-one.vercel.app
- 엔진 연동: content-engine, orchestrator, threads-bot, instagram-engine 전부 Supabase INSERT 추가 완료
- engine-sdk/: 루트에 공통 Python Supabase 클라이언트 생성됨
- drizzle-kit push 버그 → SQL 직접 적용으로 우회 (tablesFilter 추가됨)
- 상태: 구현+배포 완료 (2026-04-07)

**2026-05-05 변경 (페이스메이커 SOLAPI 전환):**
- `/pacemaker`의 데이터 소스를 Pluuug API → SOLAPI master 직접 호출로 갈아끼움
- 신규: `marketing-dashboard/src/lib/solapi.ts` (HMAC-SHA256 인증, getRecords 페이지네이션, getPacemakerSummary)
- 변경: `customer-panel.tsx` MRR + 만료 임박 카드 제거 (3→2 grid). SOLAPI에 계약 금액·기간 데이터 없음 + Starter 30/entity 한도 막힘
- 남은 카드: 활성 거래처 N개 / 총 문의 / 단계별 분포
- 미사용: `pluuug.ts` 그대로 유지 (회수 미실행. 회수 시 `pluuug.ts` + `.env.PLUUUG_*` + `env.ts` 스키마 + Vercel `PLUUUG_*` env 함께 제거)
- SOLAPI 키: `marketing-dashboard/.env` + Vercel production env 둘 다 등록됨 (`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`)
- 배포 (5/5): `dpl_5cGYYD7CKTPbRXtp8DzAoXefQc9e`
