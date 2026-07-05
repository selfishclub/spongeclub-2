# 플러그 대체 시스템 설계서

> 작성: 2026-04-08
> 상태: 구현 완료 (2026-04-08) → gbp-dashboard 폐기 (2026-05-03). CRM 호스트(gbp-dashboard) 폐기됨. 이 문서는 아카이브 이력용으로 보존.

## 목적

외부 SaaS인 Pluuug CRM을 제거하고, 기존 GBP 대시보드 Supabase에 파이프라인 기능을 내재화한다.
5개 프로젝트의 Pluuug 의존성을 모두 전환한다.

## 현황 — 플러그가 하는 것

| 기능 | API | 사용처 |
|------|-----|--------|
| 의뢰 생성 | POST /inquiry | company-landing (Meta 리드, 진단완료) |
| 의뢰 조회 | GET /inquiry | orchestrator, gbp-dashboard, pipeline, marketing-dashboard |
| 의뢰 상태변경 | PATCH /inquiry/{id} | pipeline/cold-check.py |
| 단계 목록 | GET /inquiry/status | pipeline/cold-check.py |
| 계약 조회 | GET /contract | orchestrator, marketing-dashboard |
| 파이프라인 요약 | 조합 | orchestrator (브리핑/일지), pipeline (주간스캔) |

## 설계 — Supabase 테이블

### 1. `crm_stages` — 파이프라인 단계 정의

```sql
CREATE TABLE crm_stages (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL UNIQUE,        -- '광고유입', '상담중' 등
  sort_order smallint NOT NULL DEFAULT 0, -- 정렬 순서
  is_terminal boolean DEFAULT false,      -- 종료/콜드 단계 여부
  stale_days smallint,                    -- NULL이면 stale 체크 안함, 14면 14일 초과 시 콜드
  created_at timestamptz DEFAULT now()
);
```

**초기 데이터 (현재 파이프라인 10단계):**

| sort_order | name | is_terminal | stale_days |
|------------|------|-------------|------------|
| 1 | 광고유입 | false | 14 |
| 2 | 대행사건 | false | 14 |
| 3 | 소개유입 | false | 14 |
| 4 | 상담중 | false | 21 |
| 5 | 미팅예정 | false | 7 |
| 6 | 제안중 | false | 14 |
| 7 | 계약완료 | false | NULL |
| 8 | 서비스중 | false | NULL |
| 9 | 종료 | true | NULL |
| 10 | 콜드보관 | true | NULL |

### 2. `crm_inquiries` — 의뢰 (리드)

```sql
CREATE TABLE crm_inquiries (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name         text NOT NULL,              -- 의뢰 제목 (예: "OO병원 GBP 진단")
  contact_name text,                       -- 담당자명
  phone        text,
  email        text,
  hospital     text,                       -- 병원명
  estimate     integer DEFAULT 0,          -- 예상 계약금액 (원)
  stage_id     uuid REFERENCES crm_stages(id),
  source       text DEFAULT 'direct',      -- 'meta_ad', 'referral', 'agency', 'direct'
  inquiry_date date DEFAULT CURRENT_DATE,
  stage_changed_at timestamptz DEFAULT now(), -- 단계 변경 시점 (stale 판정용)
  client_id    uuid REFERENCES clients(id),   -- 계약 후 클라이언트 연결
  meta_lead_id text,                       -- Meta 리드 ID (추적용)
  notes        text,                       -- 메모
  pluuug_legacy_id text,                   -- 마이그레이션용, 안정 1개월 후 삭제
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- stage_changed_at 자동 갱신 트리거 (stale 판정 핵심)
CREATE OR REPLACE FUNCTION crm_inquiries_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    NEW.stage_changed_at = now();
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_crm_inquiries_stage_change
  BEFORE UPDATE ON crm_inquiries
  FOR EACH ROW EXECUTE FUNCTION crm_inquiries_stage_change();

CREATE INDEX crm_inquiries_stage_idx ON crm_inquiries(stage_id);
CREATE INDEX crm_inquiries_source_idx ON crm_inquiries(source);
CREATE INDEX crm_inquiries_client_idx ON crm_inquiries(client_id);
CREATE INDEX crm_inquiries_created_at_idx ON crm_inquiries(created_at);
```

### 3. `crm_contracts` — 계약

```sql
CREATE TABLE crm_contracts (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  inquiry_id   uuid REFERENCES crm_inquiries(id),  -- NULL 허용: 의뢰 없이 직접 생성된 계약 존재
  client_id    uuid REFERENCES clients(id),
  title        text NOT NULL,              -- 계약명
  amount       integer NOT NULL DEFAULT 0, -- 월 계약금액 (원)
  start_date   date NOT NULL,
  end_date     date NOT NULL,
  status       text NOT NULL DEFAULT 'active'  -- 'active', 'ended', 'cancelled'
    CHECK (status IN ('active', 'ended', 'cancelled')),
  auto_renew   boolean DEFAULT true,       -- 자동 연장 여부
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX crm_contracts_client_idx ON crm_contracts(client_id);
CREATE INDEX crm_contracts_status_idx ON crm_contracts(status);
CREATE INDEX crm_contracts_end_date_idx ON crm_contracts(end_date);
```

### 4. `clients` 테이블 변경

```sql
-- 기존 pluuug_inquiry_id 컬럼 → 삭제 (crm_inquiries.client_id로 대체)
-- contract_status enum은 유지 (crm_contracts에서 파생 업데이트)
```

### 5. `diagnostic_leads` 테이블 변경

```sql
-- pluuug_id 컬럼 → crm_inquiry_id uuid REFERENCES crm_inquiries(id) 로 교체
```

## 설계 — API 엔드포인트

GBP 대시보드에 `/api/crm/*` 라우트 추가. 외부 프로젝트(orchestrator, landing, pipeline)는 이 API를 호출.

### 인증

`CRM_API_KEY` 환경변수 — 외부 프로젝트는 `X-CRM-Key` 헤더로 인증.
대시보드 내부 호출은 기존 ADMIN_PASSWORD 세션 인증.

### 엔드포인트

| Method | Path | 설명 | 대체 대상 |
|--------|------|------|-----------|
| GET | /api/crm/inquiries | 의뢰 목록 (필터: stage, source, date) | GET /v1/inquiry |
| POST | /api/crm/inquiries | 의뢰 생성 | POST /v1/inquiry |
| PATCH | /api/crm/inquiries/[id] | 의뢰 수정 (단계변경 포함) | PATCH /v1/inquiry/{id} |
| GET | /api/crm/stages | 단계 목록 | GET /v1/inquiry/status |
| GET | /api/crm/contracts | 계약 목록 (필터: status) | GET /v1/contract |
| POST | /api/crm/contracts | 계약 생성 | (신규) |
| PATCH | /api/crm/contracts/[id] | 계약 수정 | (신규) |
| GET | /api/crm/summary | 파이프라인 요약 (단계별 건수 + MRR) | get_pipeline_summary() 조합 |

### 응답 형식

```json
{
  "success": true,
  "data": { ... },
  "meta": { "total": 80 }
}
```

## 설계 — 프로젝트별 전환

### 1. company-landing (Vercel)

**변경 파일:**
- `api/_shared.py`: `pluuug_post()` → `crm_post()` (GBP 대시보드 API 호출)
- `api/meta-leadgen.py`: `pluuug_post("/inquiry", ...)` → `crm_post("/api/crm/inquiries", ...)`
- `api/diagnostic-complete.py`: 동일 전환

**환경변수:** `PLUUUG_API_KEY` → `CRM_API_KEY` + `CRM_BASE_URL`

### 2. company-orchestrator

**변경 파일:**
- `src/apis.py`: `PluuugAPI` 클래스 → `CrmAPI` 클래스 (Supabase REST 또는 GBP 대시보드 API)
- `src/jobs.py`: import 변경만
- `src/config.py`: `PLUUUG_API_KEY` → `CRM_API_KEY` + `CRM_BASE_URL`

**방식:** GBP 대시보드 API를 호출하는 얇은 클라이언트. 기존 메서드 시그니처 유지.
- `get_inquiries()` → GET /api/crm/inquiries
- `get_active_contracts()` → GET /api/crm/contracts?status=active
- `get_pipeline_summary()` → GET /api/crm/summary

### 3. gbp-dashboard

**변경 파일:**
- `src/db/schema/clients.ts`: `pluuugInquiryId` 컬럼 삭제 (FK는 crm_inquiries 쪽에)
- `src/db/schema/diagnostic-leads.ts`: `pluuugId` → `crmInquiryId`
- `src/app/api/cron/pluuug-sync/route.ts` → 삭제 (계약 상태는 crm_contracts에서 직접 파생)
- `src/app/api/pluuug/sync/route.ts` → 삭제
- `src/lib/db/queries.ts`: pluuug 관련 쿼리 제거, crm 쿼리 추가
- `vercel.json`: pluuug-sync 크론 제거
- 신규: `src/db/schema/crm-stages.ts`, `crm-inquiries.ts`, `crm-contracts.ts`
- 신규: `src/app/api/crm/*` 라우트 7개
- 신규: `src/app/dashboard/pipeline/` 페이지 (파이프라인 관리 UI)

### 4. company-pipeline

**변경 파일:**
- `redteam/collectors/pluuug.py` → `redteam/collectors/crm.py`
- `redteam/weekly_scan.py`: import 변경
- `redteam/config.py`: `pluuug_api_key` → `crm_api_key` + `crm_base_url`
- `cold-check.py`: Pluuug PATCH → GBP 대시보드 PATCH /api/crm/inquiries/[id]
- `.env`: 환경변수 교체

### 5. marketing-dashboard

**변경 파일:**
- `src/lib/pluuug.ts` → `src/lib/crm.ts`
- `.env`: 환경변수 교체

## 설계 — 파이프라인 관리 UI

`/dashboard/pipeline` 페이지:

- **테이블 뷰** (기본): 의뢰 목록 + 단계 필터 + 소스 필터
- 행 클릭 → 상세 시트 (이름, 연락처, 메모, 단계 변경 드롭다운)
- 상단 요약 카드: 단계별 건수, 활성 계약 수, MRR
- **추가 버튼**: 수동 의뢰 등록
- **계약 탭**: 계약 목록 + 만료 임박 하이라이트

칸반은 n건에서 과하므로 테이블 우선. 나중에 필요하면 추가.

## 설계 — 데이터 마이그레이션

1. Pluuug API에서 전체 의뢰 n건 + 계약 n건 추출
2. 단계 매핑: Pluuug 단계명 → crm_stages.id
3. crm_inquiries 적재 (pluuug_legacy_id에 원본 ID 보존)
4. crm_contracts 적재 (inquiry_id + client_id 연결)
5. clients.contract_status 재계산
6. diagnostic_leads.pluuug_id → crm_inquiry_id 매핑
7. 고아 계약 처리: inquiry_id 매칭 안 되는 계약은 inquiry_id=NULL로 적재
8. 검증 assertion: 활성 계약 n건, MRR n만원 ±n만원, 총 의뢰 n건. 실패 시 abort

마이그레이션 스크립트: `gbp-dashboard/app/scripts/migrate-pluuug.ts`

## 설계 — 데이터 흐름 (전환 후)

```
Meta 인스턴트폼
  → company-landing/api/meta-leadgen.py
    → POST /api/crm/inquiries (의뢰 생성)
    → POST /api/leads/webhook (진단 리드 저장)

오케스트레이터 09:10
  → GET /api/crm/summary (파이프라인 요약)
  → company-ontology/sales/pipeline.md 업데이트

cold-check.py 08:00
  → GET /api/crm/inquiries (전체 조회)
  → PATCH /api/crm/inquiries/{id} (콜드 이동)

GBP 대시보드
  → Supabase 직접 쿼리 (내부)
  → /dashboard/pipeline UI
```

## 전환 순서

1. Supabase 스키마 생성 (crm_stages, crm_inquiries, crm_contracts)
2. CRM API 엔드포인트 구축 (/api/crm/*)
3. 데이터 마이그레이션 (Pluuug → Supabase)
4. 파이프라인 관리 UI (/dashboard/pipeline)
5. 프로젝트 전환 (landing → orchestrator → pipeline → marketing-dashboard → gbp-dashboard 정리)
6. 전체 플로우 검증
7. Pluuug 환경변수 제거, 레거시 코드 삭제

## 롤백 전략

- 전환 기간 중 Pluuug API 키는 유지 (삭제하지 않음)
- 롤백 스위치: 각 프로젝트 `.env`에 `CRM_BACKEND=supabase` (기본값). `pluuug`로 변경 시 기존 코드 경로 실행.
  - orchestrator: `src/apis.py` — CrmAPI 클래스에 분기
  - landing: `api/_shared.py` — crm_post() 내부 분기
  - pipeline: `redteam/config.py` — 백엔드 선택
  - marketing-dashboard: `src/lib/crm.ts` — fetch 대상 분기
- 마이그레이션 검증 기준: 활성 계약 n건 exact match + MRR n만원 ±n만원 + 총 의뢰 n건. 불일치 시 즉시 롤백.
- 마이그레이션 후 1주간 병행 운영 후 Pluuug 해지
- `pluuug_legacy_id` 컬럼은 안정 운영 1개월 후 삭제

## 보안 고려사항

- landing → dashboard API 호출 시 양쪽 Vercel 콜드스타트 고려: `crm_post()`에 2회 재시도 + 타임아웃 15초
- `CRM_API_KEY`는 단일 키로 시작하되, 쓰기 권한이 필요한 프로젝트(landing, pipeline)와 읽기 전용(orchestrator, marketing-dashboard) 구분은 API 레이어에서 처리

## 영향받는 기존 쿼리 (clients.pluuugInquiryId 참조)

삭제 대상 — `pluuugInquiryId` 컬럼 제거 시 수정 필요한 파일:
- `src/lib/db/queries.ts`: `getClientsWithPluuugId()`, `createClient()`, `updateClient()`
- `src/app/api/clients/[id]/route.ts`: PATCH 핸들러
- `src/app/api/cron/pluuug-sync/route.ts`: 전체 삭제
- `src/app/api/pluuug/sync/route.ts`: 전체 삭제
- `src/app/dashboard/clients/[id]/client-detail-client.tsx`: UI 표시 제거
