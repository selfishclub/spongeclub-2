# 플러그 대체 시스템 구현 계획

> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. 구현은 완료됐으나 CRM 호스트(gbp-dashboard)가 폐기됨. 이 문서는 아카이브 이력용으로 보존.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pluuug CRM을 제거하고 GBP 대시보드 Supabase에 파이프라인 기능을 내재화. 5개 프로젝트 전환.

**Architecture:** GBP 대시보드(Next.js + Drizzle)에 crm_stages, crm_inquiries, crm_contracts 3개 테이블 추가. `/api/crm/*` REST API 노출. 외부 프로젝트(orchestrator, landing, pipeline, marketing-dashboard)는 이 API를 `X-CRM-Key` 헤더로 호출.

**Tech Stack:** Next.js 16 (App Router), Drizzle ORM, Supabase PostgreSQL, Python httpx, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-08-pluuug-replacement-design.md`

---

## File Map

### 신규 생성

| 파일 | 역할 |
|------|------|
| `gbp-dashboard/app/src/db/schema/crm-stages.ts` | crm_stages 테이블 정의 |
| `gbp-dashboard/app/src/db/schema/crm-inquiries.ts` | crm_inquiries 테이블 정의 |
| `gbp-dashboard/app/src/db/schema/crm-contracts.ts` | crm_contracts 테이블 정의 |
| `gbp-dashboard/app/src/lib/db/crm-queries.ts` | CRM CRUD 쿼리 함수 |
| `gbp-dashboard/app/src/lib/crm-auth.ts` | X-CRM-Key 인증 미들웨어 |
| `gbp-dashboard/app/src/app/api/crm/inquiries/route.ts` | GET (목록) + POST (생성) |
| `gbp-dashboard/app/src/app/api/crm/inquiries/[id]/route.ts` | PATCH (수정) |
| `gbp-dashboard/app/src/app/api/crm/stages/route.ts` | GET (단계 목록) |
| `gbp-dashboard/app/src/app/api/crm/contracts/route.ts` | GET + POST |
| `gbp-dashboard/app/src/app/api/crm/contracts/[id]/route.ts` | PATCH |
| `gbp-dashboard/app/src/app/api/crm/summary/route.ts` | GET (파이프라인 요약) |
| `gbp-dashboard/app/src/app/dashboard/pipeline/page.tsx` | 파이프라인 관리 UI |
| `gbp-dashboard/app/src/app/dashboard/pipeline/pipeline-client.tsx` | 클라이언트 컴포넌트 |
| `gbp-dashboard/app/scripts/migrate-pluuug.ts` | 마이그레이션 스크립트 |
| `agency-pipeline/redteam/collectors/crm.py` | pluuug.py 대체 |

### 수정

| 파일 | 변경 내용 |
|------|----------|
| `gbp-dashboard/app/src/db/schema/index.ts` | crm 3개 테이블 export 추가 |
| `gbp-dashboard/app/src/db/schema/clients.ts` | pluuugInquiryId 컬럼 제거 |
| `gbp-dashboard/app/src/db/schema/diagnostic-leads.ts` | pluuugId → crmInquiryId |
| `gbp-dashboard/app/src/lib/db/queries.ts` | pluuug 관련 쿼리 제거 |
| `gbp-dashboard/app/src/app/dashboard/layout.tsx` | pipeline 네비 추가 |
| `agency-landing/api/_shared.py` | pluuug_post → crm_post |
| `agency-landing/api/meta-leadgen.py` | crm_post 사용 |
| `agency-orchestrator/src/apis.py` | PluuugAPI → CrmAPI |
| `agency-orchestrator/src/config.py` | 환경변수 교체 |
| `agency-orchestrator/src/jobs.py` | import 변경 |
| `agency-orchestrator/orchestrator.py` | CrmAPI 인스턴스 생성 변경 |
| `agency-pipeline/cold-check.py` | CRM API 사용 |
| `agency-pipeline/redteam/weekly_scan.py` | crm collector import |
| `agency-pipeline/redteam/config.py` | 환경변수 교체 |
| `marketing-dashboard/src/lib/pluuug.ts` → `crm.ts` | CRM API 사용 |
| `marketing-dashboard/src/lib/env.ts` | PLUUUG_API_KEY → CRM_API_KEY |

### 삭제

| 파일 | 이유 |
|------|------|
| `gbp-dashboard/app/src/app/api/cron/pluuug-sync/route.ts` | 더 이상 불필요 |
| `gbp-dashboard/app/src/app/api/pluuug/sync/route.ts` | 더 이상 불필요 |
| `agency-pipeline/redteam/collectors/pluuug.py` | crm.py로 대체 |

---

## Task 1: Supabase 스키마 — CRM 테이블 3개

**Files:**
- Create: `gbp-dashboard/app/src/db/schema/crm-stages.ts`
- Create: `gbp-dashboard/app/src/db/schema/crm-inquiries.ts`
- Create: `gbp-dashboard/app/src/db/schema/crm-contracts.ts`
- Modify: `gbp-dashboard/app/src/db/schema/index.ts`

- [ ] **Step 1: crm-stages.ts 생성**

```typescript
// gbp-dashboard/app/src/db/schema/crm-stages.ts
import {
  pgTable, uuid, text, smallint, boolean, timestamp,
} from 'drizzle-orm/pg-core';

export const crmStages = pgTable('crm_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: smallint('sort_order').notNull().default(0),
  isTerminal: boolean('is_terminal').default(false),
  staleDays: smallint('stale_days'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

- [ ] **Step 2: crm-inquiries.ts 생성**

```typescript
// gbp-dashboard/app/src/db/schema/crm-inquiries.ts
import {
  pgTable, uuid, text, integer, date, timestamp, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { crmStages } from './crm-stages';
import { clients } from './clients';

export const crmInquiries = pgTable(
  'crm_inquiries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: text('email'),
    hospital: text('hospital'),
    estimate: integer('estimate').default(0),
    stageId: uuid('stage_id').references(() => crmStages.id),
    source: text('source').default('direct'),
    inquiryDate: date('inquiry_date').defaultNow(),
    stageChangedAt: timestamp('stage_changed_at', { withTimezone: true }).defaultNow(),
    clientId: uuid('client_id').references(() => clients.id),
    metaLeadId: text('meta_lead_id'),
    notes: text('notes'),
    pluuugLegacyId: text('pluuug_legacy_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('crm_inquiries_stage_idx').on(table.stageId),
    index('crm_inquiries_source_idx').on(table.source),
    index('crm_inquiries_client_idx').on(table.clientId),
    index('crm_inquiries_created_at_idx').on(table.createdAt),
  ]
);

export const crmInquiriesRelations = relations(crmInquiries, ({ one }) => ({
  stage: one(crmStages, { fields: [crmInquiries.stageId], references: [crmStages.id] }),
  client: one(clients, { fields: [crmInquiries.clientId], references: [clients.id] }),
}));
```

- [ ] **Step 3: crm-contracts.ts 생성**

```typescript
// gbp-dashboard/app/src/db/schema/crm-contracts.ts
import {
  pgTable, uuid, text, integer, date, boolean, timestamp, index, check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { crmInquiries } from './crm-inquiries';
import { clients } from './clients';

export const crmContracts = pgTable(
  'crm_contracts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    inquiryId: uuid('inquiry_id').references(() => crmInquiries.id),
    clientId: uuid('client_id').references(() => clients.id),
    title: text('title').notNull(),
    amount: integer('amount').notNull().default(0),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: text('status').notNull().default('active'),
    autoRenew: boolean('auto_renew').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('crm_contracts_client_idx').on(table.clientId),
    index('crm_contracts_status_idx').on(table.status),
    index('crm_contracts_end_date_idx').on(table.endDate),
    check('crm_contracts_status_check', sql`${table.status} IN ('active', 'ended', 'cancelled')`),
  ]
);

export const crmContractsRelations = relations(crmContracts, ({ one }) => ({
  inquiry: one(crmInquiries, { fields: [crmContracts.inquiryId], references: [crmInquiries.id] }),
  client: one(clients, { fields: [crmContracts.clientId], references: [clients.id] }),
}));
```

- [ ] **Step 4: index.ts에 export 추가**

`gbp-dashboard/app/src/db/schema/index.ts` 끝에 추가:

```typescript
export * from './crm-stages';
export * from './crm-inquiries';
export * from './crm-contracts';
```

- [ ] **Step 5: Drizzle 마이그레이션 생성 + 적용**

```bash
cd gbp-dashboard/app
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 6: DB 트리거 수동 적용**

Supabase SQL Editor에서 실행 (Drizzle가 트리거를 자동 생성하지 않으므로):

```sql
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
```

- [ ] **Step 7: 초기 데이터 — crm_stages 10단계 삽입**

Supabase SQL Editor에서:

```sql
INSERT INTO crm_stages (name, sort_order, is_terminal, stale_days) VALUES
  ('광고유입', 1, false, 14),
  ('대행사건', 2, false, 14),
  ('소개유입', 3, false, 14),
  ('상담중', 4, false, 21),
  ('미팅예정', 5, false, 7),
  ('제안중', 6, false, 14),
  ('계약완료', 7, false, NULL),
  ('서비스중', 8, false, NULL),
  ('종료', 9, true, NULL),
  ('콜드보관', 10, true, NULL);
```

- [ ] **Step 8: 커밋**

```bash
git add gbp-dashboard/app/src/db/schema/crm-stages.ts \
        gbp-dashboard/app/src/db/schema/crm-inquiries.ts \
        gbp-dashboard/app/src/db/schema/crm-contracts.ts \
        gbp-dashboard/app/src/db/schema/index.ts
git commit -m "feat(crm): add crm_stages, crm_inquiries, crm_contracts schema"
```

---

## Task 2: CRM 인증 + 쿼리 레이어

**Files:**
- Create: `gbp-dashboard/app/src/lib/crm-auth.ts`
- Create: `gbp-dashboard/app/src/lib/db/crm-queries.ts`

- [ ] **Step 1: crm-auth.ts — API 키 인증**

```typescript
// gbp-dashboard/app/src/lib/crm-auth.ts
import { NextRequest } from 'next/server';

export function verifyCrmKey(request: NextRequest): boolean {
  const key = request.headers.get('x-crm-key');
  const expected = process.env.CRM_API_KEY;
  if (!expected) return false;
  return key === expected;
}
```

- [ ] **Step 2: crm-queries.ts — CRUD 함수**

```typescript
// gbp-dashboard/app/src/lib/db/crm-queries.ts
import { db } from '@/db';
import { crmStages, crmInquiries, crmContracts } from '@/db/schema';
import { eq, and, desc, sql, count, sum, type SQL } from 'drizzle-orm';

// --- Stages ---

export async function getAllStages() {
  return db.select().from(crmStages).orderBy(crmStages.sortOrder);
}

// --- Inquiries ---

export interface InquiryFilters {
  stageId?: string;
  source?: string;
  date?: string;
}

export async function getInquiries(filters: InquiryFilters = {}) {
  const conditions = [];
  if (filters.stageId) conditions.push(eq(crmInquiries.stageId, filters.stageId));
  if (filters.source) conditions.push(eq(crmInquiries.source, filters.source));

  let query = db
    .select({
      inquiry: crmInquiries,
      stageName: crmStages.name,
      stageSortOrder: crmStages.sortOrder,
      isTerminal: crmStages.isTerminal,
      stageChangedAt: crmInquiries.stageChangedAt,
    })
    .from(crmInquiries)
    .leftJoin(crmStages, eq(crmInquiries.stageId, crmStages.id))
    .orderBy(desc(crmInquiries.createdAt))
    .$dynamic();

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query;
}

export interface CreateInquiryData {
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  hospital?: string;
  estimate?: number;
  stageId?: string;
  source?: string;
  inquiryDate?: string;
  metaLeadId?: string;
  notes?: string;
}

export async function createInquiry(data: CreateInquiryData) {
  // stageId가 없으면 source에 따라 기본 단계 설정
  let stageId = data.stageId;
  if (!stageId) {
    const sourceStageMap: Record<string, string> = {
      meta_ad: '광고유입',
      agency: '대행사건',
      referral: '소개유입',
      direct: '상담중',
    };
    const stageName = sourceStageMap[data.source ?? 'direct'] ?? '상담중';
    const [stage] = await db
      .select({ id: crmStages.id })
      .from(crmStages)
      .where(eq(crmStages.name, stageName))
      .limit(1);
    stageId = stage?.id;
  }

  const result = await db
    .insert(crmInquiries)
    .values({
      name: data.name,
      contactName: data.contactName ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      hospital: data.hospital ?? null,
      estimate: data.estimate ?? 0,
      stageId: stageId ?? null,
      source: data.source ?? 'direct',
      metaLeadId: data.metaLeadId ?? null,
      notes: data.notes ?? null,
    })
    .returning();
  return result[0];
}

export async function updateInquiry(id: string, data: Partial<CreateInquiryData> & { clientId?: string }) {
  const result = await db
    .update(crmInquiries)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(crmInquiries.id, id))
    .returning();
  return result[0] ?? null;
}

// --- Contracts ---

export interface ContractFilters {
  status?: string;
  clientId?: string;
}

export async function getContracts(filters: ContractFilters = {}) {
  let query = db.select().from(crmContracts).orderBy(desc(crmContracts.startDate)).$dynamic();

  if (filters.status) {
    query = query.where(eq(crmContracts.status, filters.status));
  }
  if (filters.clientId) {
    query = query.where(eq(crmContracts.clientId, filters.clientId));
  }

  return query;
}

export interface CreateContractData {
  inquiryId?: string;
  clientId?: string;
  title: string;
  amount: number;
  startDate: string;
  endDate: string;
  status?: string;
  autoRenew?: boolean;
}

export async function createContract(data: CreateContractData) {
  const result = await db
    .insert(crmContracts)
    .values({
      inquiryId: data.inquiryId ?? null,
      clientId: data.clientId ?? null,
      title: data.title,
      amount: data.amount,
      startDate: data.startDate,
      endDate: data.endDate,
      status: data.status ?? 'active',
      autoRenew: data.autoRenew ?? true,
    })
    .returning();
  return result[0];
}

export async function updateContract(id: string, data: Partial<CreateContractData>) {
  const result = await db
    .update(crmContracts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(crmContracts.id, id))
    .returning();
  return result[0] ?? null;
}

// --- Summary ---

export async function getPipelineSummary() {
  const stages = await db
    .select({
      name: crmStages.name,
      sortOrder: crmStages.sortOrder,
      count: count(),
    })
    .from(crmInquiries)
    .innerJoin(crmStages, eq(crmInquiries.stageId, crmStages.id))
    .groupBy(crmStages.name, crmStages.sortOrder)
    .orderBy(crmStages.sortOrder);

  const [contractStats] = await db
    .select({
      activeCount: count(),
      activeMrr: sum(crmContracts.amount),
    })
    .from(crmContracts)
    .where(eq(crmContracts.status, 'active'));

  const [totalInquiries] = await db
    .select({ count: count() })
    .from(crmInquiries);

  const activeContracts = await db
    .select()
    .from(crmContracts)
    .where(eq(crmContracts.status, 'active'))
    .orderBy(crmContracts.endDate);

  return {
    total_inquiries: totalInquiries?.count ?? 0,
    stages: Object.fromEntries(stages.map((s) => [s.name, Number(s.count)])),
    active_contracts: contractStats?.activeCount ?? 0,
    active_mrr: Number(contractStats?.activeMrr ?? 0),
    contracts: activeContracts.map((c) => ({
      title: c.title,
      amount: c.amount,
      start: c.startDate,
      end: c.endDate,
    })),
  };
}
```

- [ ] **Step 3: 커밋**

```bash
git add gbp-dashboard/app/src/lib/crm-auth.ts \
        gbp-dashboard/app/src/lib/db/crm-queries.ts
git commit -m "feat(crm): add CRM auth + query layer"
```

---

## Task 3: CRM API 엔드포인트 7개

**Files:**
- Create: `gbp-dashboard/app/src/app/api/crm/inquiries/route.ts`
- Create: `gbp-dashboard/app/src/app/api/crm/inquiries/[id]/route.ts`
- Create: `gbp-dashboard/app/src/app/api/crm/stages/route.ts`
- Create: `gbp-dashboard/app/src/app/api/crm/contracts/route.ts`
- Create: `gbp-dashboard/app/src/app/api/crm/contracts/[id]/route.ts`
- Create: `gbp-dashboard/app/src/app/api/crm/summary/route.ts`

- [ ] **Step 1: /api/crm/stages — GET**

```typescript
// gbp-dashboard/app/src/app/api/crm/stages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { getAllStages } from '@/lib/db/crm-queries';

export async function GET(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const stages = await getAllStages();
  return NextResponse.json({ success: true, data: stages });
}
```

- [ ] **Step 2: /api/crm/inquiries — GET + POST**

```typescript
// gbp-dashboard/app/src/app/api/crm/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { getInquiries, createInquiry } from '@/lib/db/crm-queries';

export async function GET(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const filters = {
    stageId: url.searchParams.get('stageId') ?? undefined,
    source: url.searchParams.get('source') ?? undefined,
    date: url.searchParams.get('date') ?? undefined,
  };
  const data = await getInquiries(filters);
  return NextResponse.json({ success: true, data, meta: { total: data.length } });
}

export async function POST(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (!body.name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  const inquiry = await createInquiry(body);
  return NextResponse.json({ success: true, data: inquiry }, { status: 201 });
}
```

- [ ] **Step 3: /api/crm/inquiries/[id] — PATCH**

```typescript
// gbp-dashboard/app/src/app/api/crm/inquiries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { updateInquiry } from '@/lib/db/crm-queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const updated = await updateInquiry(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: updated });
}
```

- [ ] **Step 4: /api/crm/contracts — GET + POST**

```typescript
// gbp-dashboard/app/src/app/api/crm/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { getContracts, createContract } from '@/lib/db/crm-queries';

export async function GET(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const filters = {
    status: url.searchParams.get('status') ?? undefined,
    clientId: url.searchParams.get('clientId') ?? undefined,
  };
  const data = await getContracts(filters);
  return NextResponse.json({ success: true, data, meta: { total: data.length } });
}

export async function POST(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  if (!body.title || !body.startDate || !body.endDate) {
    return NextResponse.json({ error: 'title, startDate, endDate required' }, { status: 400 });
  }
  const contract = await createContract(body);
  return NextResponse.json({ success: true, data: contract }, { status: 201 });
}
```

- [ ] **Step 5: /api/crm/contracts/[id] — PATCH**

```typescript
// gbp-dashboard/app/src/app/api/crm/contracts/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { updateContract } from '@/lib/db/crm-queries';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const updated = await updateContract(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: updated });
}
```

- [ ] **Step 6: /api/crm/summary — GET**

```typescript
// gbp-dashboard/app/src/app/api/crm/summary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCrmKey } from '@/lib/crm-auth';
import { getPipelineSummary } from '@/lib/db/crm-queries';

export async function GET(request: NextRequest) {
  if (!verifyCrmKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const summary = await getPipelineSummary();
  return NextResponse.json({ success: true, data: summary });
}
```

- [ ] **Step 7: .env에 CRM_API_KEY 추가**

```bash
# gbp-dashboard/app/.env.local
CRM_API_KEY=agency_crm_2026  # 실제 배포 시 강력한 키로 변경
```

- [ ] **Step 8: 커밋**

```bash
git add gbp-dashboard/app/src/app/api/crm/
git commit -m "feat(crm): add 7 CRM API endpoints"
```

---

## Task 4: 데이터 마이그레이션

**Files:**
- Create: `gbp-dashboard/app/scripts/migrate-pluuug.ts`

- [ ] **Step 1: 마이그레이션 스크립트 생성**

```typescript
// gbp-dashboard/app/scripts/migrate-pluuug.ts
/**
 * Pluuug → Supabase CRM 마이그레이션
 * 실행: npx tsx scripts/migrate-pluuug.ts
 * --dry-run 으로 검증만 가능
 */
import 'dotenv/config';
import { db } from '../src/db';
import { crmStages, crmInquiries, crmContracts } from '../src/db/schema';
import { eq, sql } from 'drizzle-orm';

const PLUUUG_BASE = 'https://openapi.pluuug.com/v1';
const API_KEY = process.env.PLUUUG_API_KEY!;
const DRY_RUN = process.argv.includes('--dry-run');

async function pluuugGet(path: string): Promise<any[]> {
  const results: any[] = [];
  let page = 1;
  while (true) {
    const res = await fetch(`${PLUUUG_BASE}${path}?page=${page}&pageSize=100`, {
      headers: { 'X-API-KEY': API_KEY },
    });
    const data = await res.json();
    const items = data.results ?? [];
    results.push(...items);
    if (results.length >= (data.count ?? 0) || items.length === 0) break;
    page++;
  }
  return results;
}

async function main() {
  console.log(`=== Pluuug → CRM 마이그레이션 ${DRY_RUN ? '(DRY RUN)' : ''} ===\n`);

  // 1. 단계 매핑 (이미 crm_stages에 seed 완료)
  const stages = await db.select().from(crmStages);
  const stageMap = new Map(stages.map(s => [s.name, s.id]));
  console.log(`단계 ${stages.length}개 로드됨`);

  // 2. Pluuug 단계 목록 조회 (이름 매핑용)
  const pluuugStages = await pluuugGet('/inquiry/status');
  const pluuugStageIdToName = new Map(
    pluuugStages.map((s: any) => [s.id, s.title])
  );

  // 3. 의뢰 마이그레이션
  const inquiries = await pluuugGet('/inquiry');
  console.log(`Pluuug 의뢰 ${inquiries.length}건 조회됨`);

  const inquiryIdMap = new Map<string, string>(); // pluuug_id -> crm_id

  if (!DRY_RUN) {
    for (const inq of inquiries) {
      const pluuugStageName = typeof inq.status === 'object'
        ? (inq.status.title?.ko ?? inq.status.title ?? '기타')
        : String(inq.status);

      // 플러그 단계명 → 우리 단계 매핑
      const crmStageId = stageMap.get(pluuugStageName) ?? stageMap.get('상담중');

      const [created] = await db.insert(crmInquiries).values({
        name: inq.name ?? `의뢰 #${inq.id}`,
        contactName: inq.contactName ?? null,
        phone: inq.phone ?? null,
        email: inq.email ?? null,
        hospital: inq.hospital ?? inq.name ?? null,
        estimate: inq.estimate ?? 0,
        stageId: crmStageId ?? null,
        source: inq.source ?? 'direct',
        pluuugLegacyId: String(inq.id),
        createdAt: inq.createdAt ? new Date(inq.createdAt) : new Date(),
      }).returning();

      inquiryIdMap.set(String(inq.id), created.id);
    }
    console.log(`의뢰 ${inquiryIdMap.size}건 마이그레이션 완료`);
  }

  // 4. 계약 마이그레이션
  const contracts = await pluuugGet('/contract');
  console.log(`Pluuug 계약 ${contracts.length}건 조회됨`);

  let contractCount = 0;
  let orphanCount = 0;

  if (!DRY_RUN) {
    for (const c of contracts) {
      const inquiryId = c.inquiryId ? inquiryIdMap.get(String(c.inquiryId)) : null;
      if (!inquiryId && c.inquiryId) orphanCount++;

      const status = c.status === 'I' ? 'active' : (c.status === 'C' || c.status === 'T') ? 'ended' : 'active';

      await db.insert(crmContracts).values({
        inquiryId: inquiryId ?? null,
        title: c.title ?? `계약 #${c.id}`,
        amount: c.amount ?? 0,
        startDate: c.startDate ?? new Date().toISOString().split('T')[0],
        endDate: c.endDate ?? new Date().toISOString().split('T')[0],
        status,
        autoRenew: true,
      }).returning();

      contractCount++;
    }
    console.log(`계약 ${contractCount}건 마이그레이션 완료 (고아: ${orphanCount}건)`);
  }

  // 5. 검증
  console.log('\n=== 검증 ===');
  const activeContracts = await pluuugGet('/contract');
  const activeCount = activeContracts.filter((c: any) => c.status === 'I').length;
  const activeMrr = activeContracts
    .filter((c: any) => c.status === 'I')
    .reduce((sum: number, c: any) => sum + (c.amount ?? 0), 0);

  console.log(`Pluuug 활성 계약: ${activeCount}건, MRR: ${activeMrr.toLocaleString()}원`);
  console.log(`Pluuug 총 의뢰: ${inquiries.length}건`);

  if (!DRY_RUN) {
    // DB에서도 검증
    const { count: dbInquiryCount } = (await db.execute(
      sql`SELECT count(*) FROM crm_inquiries`
    ) as any).rows[0];
    const { count: dbActiveCount, mrr: dbMrr } = (await db.execute(
      sql`SELECT count(*) as count, coalesce(sum(amount), 0) as mrr FROM crm_contracts WHERE status = 'active'`
    ) as any).rows[0];

    console.log(`DB 의뢰: ${dbInquiryCount}건`);
    console.log(`DB 활성 계약: ${dbActiveCount}건, MRR: ${Number(dbMrr).toLocaleString()}원`);

    const mrrDiff = Math.abs(activeMrr - Number(dbMrr));
    if (Number(dbInquiryCount) !== inquiries.length) {
      console.error('❌ FAIL: 의뢰 건수 불일치!');
      process.exit(1);
    }
    if (Number(dbActiveCount) !== activeCount) {
      console.error('❌ FAIL: 활성 계약 건수 불일치!');
      process.exit(1);
    }
    if (mrrDiff > 10000) {
      console.error(`❌ FAIL: MRR 차이 ${mrrDiff.toLocaleString()}원 (허용: 10,000원)`);
      process.exit(1);
    }
    console.log('✅ PASS: 모든 검증 통과');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: dry-run 실행**

```bash
cd gbp-dashboard/app
npx tsx scripts/migrate-pluuug.ts --dry-run
```

Expected: Pluuug에서 건수 확인 로그 출력

- [ ] **Step 3: 실제 마이그레이션 실행**

```bash
npx tsx scripts/migrate-pluuug.ts
```

Expected: `✅ PASS: 모든 검증 통과`

- [ ] **Step 4: 커밋**

```bash
git add gbp-dashboard/app/scripts/migrate-pluuug.ts
git commit -m "feat(crm): migrate n inquiries + contracts from Pluuug"
```

---

## Task 5: 파이프라인 관리 UI

**Files:**
- Create: `gbp-dashboard/app/src/app/dashboard/pipeline/page.tsx`
- Create: `gbp-dashboard/app/src/app/dashboard/pipeline/pipeline-client.tsx`
- Modify: `gbp-dashboard/app/src/app/dashboard/layout.tsx` (네비에 pipeline 추가)

- [ ] **Step 1: page.tsx — 서버 컴포넌트 (데이터 fetch)**

```typescript
// gbp-dashboard/app/src/app/dashboard/pipeline/page.tsx
import { getAllStages } from '@/lib/db/crm-queries';
import { getInquiries, getContracts, getPipelineSummary } from '@/lib/db/crm-queries';
import { PipelineClient } from './pipeline-client';

export default async function PipelinePage() {
  const [stages, inquiries, contracts, summary] = await Promise.all([
    getAllStages(),
    getInquiries(),
    getContracts(),
    getPipelineSummary(),
  ]);

  return (
    <PipelineClient
      stages={stages}
      inquiries={inquiries}
      contracts={contracts}
      summary={summary}
    />
  );
}
```

- [ ] **Step 2: pipeline-client.tsx — 클라이언트 컴포넌트**

테이블 뷰 + 요약 카드 + 단계 필터 + 의뢰 상세 시트 + 계약 탭.
shadcn/ui 컴포넌트 활용 (Table, Card, Select, Sheet, Tabs, Badge).

> 구현 시 기존 대시보드 페이지 (`clients/` 등)의 패턴을 따를 것.
> 상세 구현은 실행 에이전트가 기존 코드 패턴을 참고하여 작성.

핵심 UI 요소:
- 상단: 요약 카드 4개 (총 의뢰, 활성 계약, MRR, 콜드 리드)
- 중단: 단계 필터 드롭다운 + 소스 필터 + 의뢰 테이블
- 테이블 행 클릭 → Sheet 열림 (상세 편집: 이름, 연락처, 메모, 단계 드롭다운)
- 하단 탭: 계약 목록 (만료 임박 빨간 뱃지)

- [ ] **Step 3: layout.tsx에 네비게이션 추가**

`layout.tsx`에서 기존 nav items 배열에 추가:

```typescript
{ name: 'Pipeline', href: '/dashboard/pipeline', icon: GitBranch },
```

(`GitBranch`는 `lucide-react`에서 import)

- [ ] **Step 4: 로컬에서 UI 확인**

```bash
cd gbp-dashboard/app
npm run dev
# http://localhost:3000/dashboard/pipeline 접속
```

- [ ] **Step 5: 커밋**

```bash
git add gbp-dashboard/app/src/app/dashboard/pipeline/ \
        gbp-dashboard/app/src/app/dashboard/layout.tsx
git commit -m "feat(crm): add pipeline management UI"
```

---

## Task 6: agency-landing 전환

**Files:**
- Modify: `agency-landing/api/_shared.py`
- Modify: `agency-landing/api/meta-leadgen.py`

- [ ] **Step 1: _shared.py — pluuug_post → crm_post**

`_shared.py`에서 Pluuug 관련 부분을 교체:

```python
# 삭제:
# PLUUUG_API_KEY = os.environ.get("PLUUUG_API_KEY", "")
# PLUUUG_BASE = "https://openapi.pluuug.com/v1"
# def pluuug_post(path, data) ...

# 추가:
CRM_API_KEY = os.environ.get("CRM_API_KEY", "")
CRM_BASE_URL = os.environ.get("CRM_BASE_URL", "")
CRM_BACKEND = os.environ.get("CRM_BACKEND", "supabase")  # 롤백: "pluuug"

# 롤백용 — Pluuug 키/URL은 전환 기간 중 유지
PLUUUG_API_KEY = os.environ.get("PLUUUG_API_KEY", "")
PLUUUG_BASE = "https://openapi.pluuug.com/v1"


def crm_post(path: str, data: dict, retries: int = 2) -> dict:
    """POST to CRM API with retry. Falls back to Pluuug if CRM_BACKEND=pluuug."""
    # 롤백 스위치
    if CRM_BACKEND == "pluuug":
        try:
            resp = requests.post(
                f"{PLUUUG_BASE}{path.replace('/api/crm/inquiries', '/inquiry')}",
                json=data,
                headers={"X-API-KEY": PLUUUG_API_KEY, "Content-Type": "application/json"},
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[_shared] pluuug_post fallback error: {e}")
            return {}

    if not CRM_BASE_URL or not CRM_API_KEY:
        print("[_shared] crm_post: CRM_BASE_URL or CRM_API_KEY not set")
        return {}
    for attempt in range(retries + 1):
        try:
            resp = requests.post(
                f"{CRM_BASE_URL}{path}",
                json=data,
                headers={
                    "x-crm-key": CRM_API_KEY,
                    "Content-Type": "application/json",
                },
                timeout=15,
            )
            resp.raise_for_status()
            result = resp.json()
            return result.get("data", result)
        except Exception as e:
            print(f"[_shared] crm_post attempt {attempt + 1} error: {e}")
            if attempt < retries:
                import time
                time.sleep(1)
    return {}
```

- [ ] **Step 2: meta-leadgen.py — import + 호출 변경**

```python
# 변경: import에서 pluuug_post → crm_post
from _shared import (
    parse_body, send_json, handle_options,
    telegram_send, crm_post,  # pluuug_post 제거
    google_places_search, google_place_details,
    google_places_search_multi, dashboard_send_lead,
)

# _process_lead() 함수 내:
# 변경 전:
#   pluuug_result = pluuug_post("/inquiry", {...})
#   inquiry_id = str(pluuug_result.get("id", ""))
# 변경 후:
    crm_result = crm_post("/api/crm/inquiries", {
        "name": f"{hospital or lead['name']} GBP 진단",
        "hospital": hospital or lead["name"],
        "contactName": lead["name"],
        "phone": lead["phone"],
        "email": lead["email"],
        "estimate": 500000,
        "source": "meta_ad",
        "metaLeadId": leadgen_id,
    })
    inquiry_id = str(crm_result.get("id", ""))
```

- [ ] **Step 3: diagnostic-complete.py — 동일 전환**

`pluuug_post` → `crm_post` 동일 패턴 적용.

- [ ] **Step 4: Vercel 환경변수 설정**

```bash
cd agency-landing
vercel env add CRM_API_KEY
vercel env add CRM_BASE_URL  # https://gbp-dashboard-url.vercel.app
```

- [ ] **Step 5: 커밋**

```bash
git add agency-landing/api/_shared.py \
        agency-landing/api/meta-leadgen.py \
        agency-landing/api/diagnostic-complete.py
git commit -m "feat(landing): replace Pluuug with CRM API"
```

---

## Task 7: agency-orchestrator 전환

**Files:**
- Modify: `agency-orchestrator/src/apis.py`
- Modify: `agency-orchestrator/src/config.py`
- Modify: `agency-orchestrator/src/jobs.py`

- [ ] **Step 1: config.py — 환경변수 교체**

```python
# 삭제: PLUUUG_API_KEY = _require("PLUUUG_API_KEY")
# 추가:
CRM_API_KEY = _require("CRM_API_KEY")
CRM_BASE_URL = _require("CRM_BASE_URL")
CRM_BACKEND = os.environ.get("CRM_BACKEND", "supabase")  # 롤백: "pluuug"
PLUUUG_API_KEY = os.environ.get("PLUUUG_API_KEY", "")  # 전환 기간 유지
```

- [ ] **Step 2: apis.py — PluuugAPI → CrmAPI**

기존 `PluuugAPI` 클래스를 `CrmAPI`로 교체. 메서드 시그니처 유지:

```python
class CrmAPI:
    """자체 CRM API 클라이언트 (GBP 대시보드 API)."""

    def __init__(self, api_key: str, base_url: str) -> None:
        self._headers = {"x-crm-key": api_key, "Content-Type": "application/json"}
        self._base = base_url
        self._client = httpx.Client(timeout=_TIMEOUT)

    def _get(self, path: str, params: dict | None = None) -> list[dict[str, Any]]:
        resp = self._client.get(
            f"{self._base}{path}",
            headers=self._headers,
            params=params or {},
        )
        data = resp.json()
        return data.get("data", []) if isinstance(data, dict) else data

    def get_inquiries(self, date: str | None = None) -> list[dict[str, Any]]:
        params = {"date": date} if date else {}
        return self._get("/api/crm/inquiries", params)

    def get_inquiry_stages(self) -> list[dict[str, Any]]:
        return self._get("/api/crm/stages")

    def get_contracts(self) -> list[dict[str, Any]]:
        return self._get("/api/crm/contracts")

    def get_active_contracts(self) -> list[dict[str, Any]]:
        contracts = self._get("/api/crm/contracts", {"status": "active"})
        return [
            {
                "title": c.get("title", ""),
                "amount": c.get("amount", 0),
                "start": c.get("startDate"),
                "end": c.get("endDate"),
            }
            for c in contracts
        ]

    def get_pipeline_summary(self) -> dict[str, Any]:
        resp = self._client.get(
            f"{self._base}/api/crm/summary",
            headers=self._headers,
        )
        data = resp.json()
        return data.get("data", {})
```

- [ ] **Step 3: jobs.py — import 변경**

```python
# 변경: from .apis import GranterAPI, MetaAdsAPI, PluuugAPI
# →     from .apis import GranterAPI, MetaAdsAPI, CrmAPI
```

orchestrator.py에서 인스턴스 생성부도 변경:

```python
# 변경: pluuug = PluuugAPI(config.PLUUUG_API_KEY)
# →     crm = CrmAPI(config.CRM_API_KEY, config.CRM_BASE_URL)
```

- [ ] **Step 4: .env 업데이트**

```bash
# agency-orchestrator/.env
# 삭제: PLUUUG_API_KEY=...
# 추가:
CRM_API_KEY=agency_crm_2026
CRM_BASE_URL=https://gbp-dashboard-url.vercel.app
```

- [ ] **Step 5: 테스트 실행**

```bash
cd agency-orchestrator
.venv/bin/python3 orchestrator.py test
```

- [ ] **Step 6: 커밋**

```bash
git add agency-orchestrator/src/apis.py \
        agency-orchestrator/src/config.py \
        agency-orchestrator/src/jobs.py \
        agency-orchestrator/orchestrator.py
git commit -m "feat(orchestrator): replace Pluuug with CRM API"
```

---

## Task 8: agency-pipeline 전환

**Files:**
- Create: `agency-pipeline/redteam/collectors/crm.py`
- Modify: `agency-pipeline/cold-check.py`
- Modify: `agency-pipeline/redteam/weekly_scan.py`
- Modify: `agency-pipeline/redteam/config.py`
- Delete: `agency-pipeline/redteam/collectors/pluuug.py`

- [ ] **Step 1: collectors/crm.py 생성**

```python
# agency-pipeline/redteam/collectors/crm.py
import httpx
from datetime import date, timedelta
from collections import Counter


def fetch_inquiries(api_key: str, base_url: str) -> list[dict]:
    headers = {"x-crm-key": api_key}
    with httpx.Client(base_url=base_url, headers=headers, timeout=30) as client:
        resp = client.get("/api/crm/inquiries")
        resp.raise_for_status()
        data = resp.json()
        return data.get("data", [])


def collect(api_key: str, base_url: str) -> dict:
    raw = fetch_inquiries(api_key, base_url)
    stages = Counter(
        inq.get("stageName", "기타") for inq in raw
    )
    # stale 탐지 — stage_changed_at 기준
    today = date.today()
    threshold = today - timedelta(days=14)
    stalls = [
        inq for inq in raw
        if inq.get("stageChangedAt")
        and date.fromisoformat(inq["stageChangedAt"][:10]) < threshold
        and not inq.get("isTerminal", False)
    ]
    return {
        "source": "crm",
        "pipeline": {"total": len(raw), "by_stage": dict(stages)},
        "stalled_inquiries": stalls,
    }
```

- [ ] **Step 2: cold-check.py 전환**

핵심 변경: Pluuug API → CRM API

```python
# 변경:
# PLUUUG_BASE → CRM_BASE_URL, PLUUUG_API_KEY → CRM_API_KEY
CRM_BASE_URL = os.environ.get("CRM_BASE_URL", "")
CRM_API_KEY = os.environ.get("CRM_API_KEY", "")

# main() 내:
# client = httpx.Client(base_url=PLUUUG_BASE, headers={"X-API-KEY": ...})
# → client = httpx.Client(base_url=CRM_BASE_URL, headers={"x-crm-key": CRM_API_KEY})

# stages_resp = client.get("/v1/inquiry/status")
# → stages_resp = client.get("/api/crm/stages")
# → stages = {s["name"]: s["id"] for s in stages_resp.json()["data"]}

# inq_resp = client.get("/v1/inquiry")
# → inq_resp = client.get("/api/crm/inquiries")
# → inquiries = inq_resp.json()["data"]

# stage_title = inq["status"]["title"]
# → stage_title = inq["stageName"]

# client.patch(f"/v1/inquiry/{inq['id']}", json={"status": {"id": cold_stage_id}})
# → client.patch(f"/api/crm/inquiries/{inq['inquiry']['id']}", json={"stageId": cold_stage_id})
```

- [ ] **Step 3: weekly_scan.py + config.py 변경**

```python
# config.py:
# pluuug_api_key → crm_api_key + crm_base_url

# weekly_scan.py:
# from .collectors.pluuug import collect as pluuug_collect
# → from .collectors.crm import collect as crm_collect
# pluuug_collect(env.pluuug_api_key) → crm_collect(env.crm_api_key, env.crm_base_url)
```

- [ ] **Step 4: pluuug.py 삭제**

```bash
rm agency-pipeline/redteam/collectors/pluuug.py
```

- [ ] **Step 5: 커밋**

```bash
git add agency-pipeline/redteam/collectors/crm.py \
        agency-pipeline/cold-check.py \
        agency-pipeline/redteam/weekly_scan.py \
        agency-pipeline/redteam/config.py
git rm agency-pipeline/redteam/collectors/pluuug.py
git commit -m "feat(pipeline): replace Pluuug with CRM API"
```

---

## Task 9: marketing-dashboard 전환

**Files:**
- Modify: `marketing-dashboard/src/lib/pluuug.ts` → rename to `crm.ts`
- Modify: `marketing-dashboard/src/lib/env.ts`

- [ ] **Step 1: pluuug.ts → crm.ts**

```typescript
// marketing-dashboard/src/lib/crm.ts
// Pluuug HMAC 인증 전체 제거, 단순 fetch로 교체

const CRM_BASE_URL = process.env.CRM_BASE_URL ?? '';
const CRM_API_KEY = process.env.CRM_API_KEY ?? '';

export async function getCrmSummary() {
  if (!CRM_BASE_URL || !CRM_API_KEY) {
    return { active_contracts: 0, active_mrr: 0, total_inquiries: 0, stages: {}, contracts: [] };
  }
  try {
    const res = await fetch(`${CRM_BASE_URL}/api/crm/summary`, {
      headers: { 'x-crm-key': CRM_API_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`CRM API error: ${res.status}`);
    const { data } = await res.json();
    return data;
  } catch (e) {
    console.error('[crm] getCrmSummary error:', e);
    return { active_contracts: 0, active_mrr: 0, total_inquiries: 0, stages: {}, contracts: [] };
  }
}
```

- [ ] **Step 2: env.ts — PLUUUG_API_KEY → CRM_API_KEY + CRM_BASE_URL**

env.ts의 Zod 스키마에서 `PLUUUG_API_KEY` → `CRM_API_KEY` + `CRM_BASE_URL` (optional).

- [ ] **Step 3: pluuug.ts import하는 파일 모두 crm.ts로 변경**

```bash
# marketing-dashboard 내에서 pluuug import 검색 후 crm으로 교체
```

- [ ] **Step 4: pluuug.ts 삭제**

```bash
rm marketing-dashboard/src/lib/pluuug.ts
```

- [ ] **Step 5: 커밋**

```bash
git add marketing-dashboard/src/lib/crm.ts \
        marketing-dashboard/src/lib/env.ts
git rm marketing-dashboard/src/lib/pluuug.ts
git commit -m "feat(marketing-dashboard): replace Pluuug with CRM API"
```

---

## Task 10: GBP 대시보드 레거시 정리

**Files:**
- Modify: `gbp-dashboard/app/src/db/schema/clients.ts`
- Modify: `gbp-dashboard/app/src/db/schema/diagnostic-leads.ts`
- Modify: `gbp-dashboard/app/src/lib/db/queries.ts`
- Delete: `gbp-dashboard/app/src/app/api/cron/pluuug-sync/route.ts`
- Delete: `gbp-dashboard/app/src/app/api/pluuug/sync/route.ts`

- [ ] **Step 1: clients.ts — pluuugInquiryId 컬럼 제거**

```typescript
// 삭제: pluuugInquiryId: text('pluuug_inquiry_id'),
// 삭제: index('clients_pluuug_inquiry_id_idx').on(table.pluuugInquiryId),
```

- [ ] **Step 2: diagnostic-leads.ts — pluuugId → crmInquiryId**

```typescript
// 변경: pluuugId: text('pluuug_id'),
// →     crmInquiryId: uuid('crm_inquiry_id').references(() => crmInquiries.id),
// import에 uuid 추가 + crmInquiries import 추가
```

- [ ] **Step 3: queries.ts — pluuug 함수 제거**

삭제:
- `getClientsWithPluuugId()` 함수 전체
- `CreateClientData` 인터페이스에서 `pluuugInquiryId` 필드
- `UpdateClientData` 인터페이스에서 `pluuugInquiryId` 필드
- `createClient()`에서 `pluuugInquiryId` 할당

- [ ] **Step 4: pluuug API 라우트 삭제**

```bash
rm -rf gbp-dashboard/app/src/app/api/cron/pluuug-sync/
rm -rf gbp-dashboard/app/src/app/api/pluuug/
```

- [ ] **Step 5: vercel.json에서 pluuug-sync 크론 제거**

`gbp-dashboard/app/vercel.json`에서 `pluuug-sync` 크론 항목 삭제.

- [ ] **Step 6: Drizzle 마이그레이션 생성 + 적용**

```bash
cd gbp-dashboard/app
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 7: 커밋**

```bash
git add -A gbp-dashboard/app/src/db/schema/ \
           gbp-dashboard/app/src/lib/db/queries.ts \
           gbp-dashboard/app/vercel.json
git rm -rf gbp-dashboard/app/src/app/api/cron/pluuug-sync/ \
           gbp-dashboard/app/src/app/api/pluuug/
git commit -m "chore(gbp): remove Pluuug legacy code and columns"
```

---

## Task 11: 전체 플로우 검증

- [ ] **Step 1: CRM API 기본 검증**

```bash
# 단계 조회
curl -H "x-crm-key: agency_crm_2026" https://gbp-dashboard-url.vercel.app/api/crm/stages

# 의뢰 조회
curl -H "x-crm-key: agency_crm_2026" https://gbp-dashboard-url.vercel.app/api/crm/inquiries

# 파이프라인 요약
curl -H "x-crm-key: agency_crm_2026" https://gbp-dashboard-url.vercel.app/api/crm/summary
```

Expected: 10단계, n건, 활성 계약 n건, MRR ~n만원

- [ ] **Step 2: 의뢰 생성 테스트**

```bash
curl -X POST -H "x-crm-key: agency_crm_2026" -H "Content-Type: application/json" \
  -d '{"name":"테스트병원 GBP 진단","hospital":"테스트병원","source":"meta_ad"}' \
  https://gbp-dashboard-url.vercel.app/api/crm/inquiries
```

Expected: 201, 의뢰 생성됨 (stage = 광고유입)

- [ ] **Step 3: 오케스트레이터 테스트**

```bash
cd agency-orchestrator
.venv/bin/python3 orchestrator.py test
```

Expected: 파이프라인 요약 정상 출력

- [ ] **Step 4: 대시보드 UI 확인**

`/dashboard/pipeline` 접속 → 의뢰 목록, 요약 카드, 계약 탭 확인

- [ ] **Step 5: 테스트 의뢰 삭제 + 최종 커밋**

```bash
git add -A
git commit -m "feat: complete Pluuug to CRM migration — all 5 projects converted"
```

---

## 환경변수 체크리스트

전환 후 각 프로젝트에 필요한 환경변수:

| 프로젝트 | 추가 | 제거 |
|---------|------|------|
| gbp-dashboard | `CRM_API_KEY` | `PLUUUG_API_KEY` |
| agency-landing | `CRM_API_KEY`, `CRM_BASE_URL` | `PLUUUG_API_KEY` |
| agency-orchestrator | `CRM_API_KEY`, `CRM_BASE_URL` | `PLUUUG_API_KEY` |
| agency-pipeline | `CRM_API_KEY`, `CRM_BASE_URL` | `PLUUUG_API_KEY` |
| marketing-dashboard | `CRM_API_KEY`, `CRM_BASE_URL` | `PLUUUG_API_KEY` |
