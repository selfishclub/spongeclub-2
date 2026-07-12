---
name: 우리 회사 SSOT 역할 분리 (SOLAPI vs Supabase)
description: 2026-04-27 사용자가 SOLAPI를 응답 자동화 메인으로 의도해서 탑재. SSOT 회복이 아니라 역할 분리가 맞음
type: project
originSessionId: ae13e47b-66e5-4267-a7cf-e7ad175cef34
---
**2026-04-27 변경**: `company-landing/api/_shared.py` `WRITE_TARGET` 기본값을 `solapi`로 두었다. 이건 사용자가 응답 자동화(SOLAPI 자동 LMS)를 위해 의도해서 탑재한 것. 사고/미스가 아니다.

따라서 "Supabase를 SSOT로 회복"이 아니라 **역할 분리**가 정답:

- **SOLAPI = 인입 + 응답 자동화 메인** (lead 캐치, 자동 LMS, 카카오 i오픈빌더 연동)
- **Supabase `crm_inquiries` = 백오피스 분석 + stage 관리 보조** (cold-check.py, 단계 흐름, 분석 쿼리)

**현재 갭** (2026-05-10 ssot-gap-report 기준):
- SOLAPI 97건 vs Supabase 84건 (13건 차이) — SOLAPI에만 신규 인입 쌓임
- cold-check.py 같은 Supabase 기반 자동화가 신규 인입을 못 봄

**Why:** 사용자 의도(SOLAPI 응답 자동화)와 시스템 자동화(Supabase 기반)가 다르게 가는 중. 한쪽으로 옮기면 한쪽이 망가짐.

**How to apply:**
- "Supabase=SSOT" 전제로 설계하지 말 것. SOLAPI가 master.
- 신규 인입은 SOLAPI → Supabase로 mirror. `WRITE_TARGET=both` 또는 단방향 sync cron 둘 중 선택.
- Supabase 기반 자동화(cold-check, stage 흐름) 코드 만질 때 SOLAPI에만 있는 lead가 누락되는지 항상 점검.
- 카카오 i오픈빌더 분기는 코드는 살아있으나 의미 있는 인입 0건 — 응대 자동화 우선순위에서 후순위.
