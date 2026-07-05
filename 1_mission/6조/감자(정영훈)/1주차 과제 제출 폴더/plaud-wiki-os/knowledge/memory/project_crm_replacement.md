---
name: CRM 자체 구축 (Pluuug → Supabase → SOLAPI)
description: Pluuug→Supabase(2026-04-08)→SOLAPI(2026-04-27) 3단계 이관. company-landing은 SOLAPI 직행, 나머지 4개 프로젝트는 Supabase 잔존
type: project
originSessionId: e68308f9-7651-4d9d-9037-1d44cd0ab74d
---
## 현재 master: SOLAPI CRM (2026-04-27 전환)

### Phase 3: Supabase → SOLAPI (2026-04-27)
- **계기**: Pluuug API 403 차단 + Supabase UI 사용자가 안 봄 + SOLAPI Starter ₩n/월이 운영 비용 측면 베스트
- **마이그레이션 결과**: clients 11/11 + crm_inquiries 84/84 (실패 0)
- **company-landing webhook 4종 SOLAPI 직행 전환**: meta-leadgen, _google_leadgen, diagnostic-complete (book-submit은 crm_appointments 전용 테이블이라 유지)
- **카카오 inbound webhook 신설**: `/api/kakao-inbound` (i오픈빌더 스킬 서버, secret 인증)
- **롤백 안전장치**: `WRITE_TARGET=solapi|supabase|both` env로 즉시 회귀

### SOLAPI 엔티티/API 스펙
- 리드: `entity-7e1519f6` (10 properties)
- 거래처: `entity-5d028dfe` (7 properties)
- record 생성 body: `{"entityId": "...", "data": {propertyId: value}}` ⚠️ `properties:` 키 아님
- DROPDOWN: `choices: ["str", ...]` ⚠️ `options: [{label,value}]` 아님
- HMAC-SHA256 인증, base `https://api.solapi.com`, endpoints: `/crm-core/v1/{records,activities,properties,entities}`
- 헬퍼: `company-landing/api/_shared.py` 의 `solapi_create_lead`, `solapi_create_activity`, `solapi_find_lead_by_kakao_key`, `crm_post` (라우터)

### 잔여 작업
- **i오픈빌더 셋업** (사용자): 스킬 URL `https://diagnostic.company.kr/api/kakao-inbound?secret=...` 등록 → 폴백 블록 → 카카오 채널 연결
- **Supabase 폐기**: 1주 안정화 후 `crm_inquiries`, `clients`, `crm_stages` 백업 후 drop
- **나머지 4개 프로젝트** (orchestrator, pipeline, marketing-dashboard, gbp-dashboard): 아직 Supabase 의존. 추후 SOLAPI로 정리 필요

## Phase 2: Pluuug → Supabase (2026-04-08, 과거)
- 81건 의뢰 + 200건 계약 마이그레이션
- crm_stages(10단계), crm_inquiries, crm_contracts 테이블 + /api/crm/* REST API + X-CRM-Key 인증
- 5개 프로젝트 전환: landing, orchestrator, pipeline, marketing-dashboard, gbp-dashboard
- DB 트리거: stage_changed_at 자동 갱신 (콜드 판정용)

**Why:** Pluuug 비용 과다 + UI 사용자가 안 보는 Supabase까지 단일화 → 운영 비용 절감 + master 1개로 데이터 자주권 + 카카오 회신 추적 가능
**How to apply:** 신규 리드 코드는 `_shared.py`의 `crm_post()` 또는 `solapi_create_lead()` 사용. 카카오 회신은 `solapi_create_activity()`. property ID 매핑은 `_shared.py`에 하드코딩 (콜드스타트 zero).
