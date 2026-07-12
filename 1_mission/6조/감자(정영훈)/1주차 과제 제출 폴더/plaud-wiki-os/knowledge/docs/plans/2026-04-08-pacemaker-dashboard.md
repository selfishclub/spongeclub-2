# Pacemaker Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우리 회사 월 n만원 목표 달성을 위한 페이스메이커 대시보드 — 매일 업무 기록 → AI 평가 → 다음 액션 제안

**Architecture:** marketing-dashboard에 `/pacemaker` 라우트 추가. 기존 Drizzle + Supabase + Google Generative AI 인프라 재활용. 액션 중심형 올인원 레이아웃 (입력 폼 최상단).

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Supabase PostgreSQL, shadcn/ui, Recharts, Google Generative AI, Zod

**Spec:** `docs/superpowers/specs/2026-04-08-pacemaker-dashboard-design.md`

---

## File Structure

### New Files
```
src/db/schema/journals.ts          — pac_journals + pac_ai_comments 테이블 정의
src/db/schema/goals.ts             — pac_goals + pac_monthly_stats 테이블 정의
src/db/queries/journals.ts         — 일지 CRUD 쿼리
src/db/queries/goals.ts            — 목표/통계 쿼리
src/lib/prompts/pacemaker.ts       — AI 페이스메이커 프롬프트
src/app/api/pacemaker/journal/route.ts  — 일지 API (GET/POST)
src/app/api/pacemaker/ai-comment/route.ts — AI 코멘트 생성 API
src/app/api/pacemaker/stats/route.ts    — KPI/통계 API
src/app/api/pacemaker/goals/route.ts    — 목표 관리 API (GET/PUT)
src/app/pacemaker/page.tsx              — 메인 페이지 (Server Component)
src/app/pacemaker/layout.tsx            — 레이아웃
src/components/pacemaker/journal-form.tsx    — 업무일지 입력 폼
src/components/pacemaker/ai-comment.tsx      — AI 코멘트 표시
src/components/pacemaker/goal-progress.tsx   — 목표 달성률 KPI
src/components/pacemaker/journal-history.tsx — 최근 7일 히스토리
src/components/pacemaker/revenue-chart.tsx   — 월별 매출 추이 차트
```

### Modified Files
```
src/db/schema/index.ts             — pac_ 스키마 export 추가
drizzle.config.ts                  — tablesFilter에 pac_* 추가
src/lib/constants.ts               — 페이스메이커 카테고리 상수 추가
```

---

## Task 1: DB 스키마 정의

**Files:**
- Create: `src/db/schema/journals.ts`
- Create: `src/db/schema/goals.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `drizzle.config.ts`

- [ ] **Step 1: pac_journals + pac_ai_comments 스키마 생성**

```typescript
// src/db/schema/journals.ts
import { pgTable, uuid, text, date, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const journalCategoryEnum = pgEnum("pac_category", [
  "sales", "marketing", "operations", "planning", "other",
]);

export const pacJournals = pgTable("pac_journals", {
  id: uuid("id").defaultRandom().primaryKey(),
  date: date("date").notNull(),
  content: text("content").notNull(),
  category: journalCategoryEnum("category").notNull(),
  revenueDelta: integer("revenue_delta"),
  contractsDelta: integer("contracts_delta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pacAiComments = pgTable("pac_ai_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  journalId: uuid("journal_id").references(() => pacJournals.id).notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: pac_goals + pac_monthly_stats 스키마 생성**

```typescript
// src/db/schema/goals.ts
import { pgTable, uuid, text, date, integer, timestamp } from "drizzle-orm/pg-core";

export const pacGoals = pgTable("pac_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetRevenue: integer("target_revenue").notNull(),
  targetDate: date("target_date").notNull(),
  currentRevenue: integer("current_revenue").notNull().default(0),
  currentContracts: integer("current_contracts").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const pacMonthlyStats = pgTable("pac_monthly_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  yearMonth: text("year_month").notNull(),
  revenue: integer("revenue").notNull().default(0),
  contracts: integer("contracts").notNull().default(0),
  entriesCount: integer("entries_count").notNull().default(0),
});
```

- [ ] **Step 3: 스키마 index.ts에 export 추가**

`src/db/schema/index.ts`에 추가:
```typescript
export * from "./journals";
export * from "./goals";
```

- [ ] **Step 4: drizzle.config.ts tablesFilter 수정**

```typescript
tablesFilter: ["mkt_*", "pac_*"],
```

- [ ] **Step 5: DB 마이그레이션 생성 및 적용**

```bash
cd marketing-dashboard
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 6: 커밋**

```bash
git add src/db/schema/journals.ts src/db/schema/goals.ts src/db/schema/index.ts drizzle.config.ts
git commit -m "feat(pacemaker): DB 스키마 정의 — journals, goals, monthly_stats"
```

---

## Task 2: 상수 + 유틸 추가

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: 페이스메이커 카테고리 상수 추가**

`src/lib/constants.ts` 하단에 추가:
```typescript
export const PAC_CATEGORIES = ["sales", "marketing", "operations", "planning", "other"] as const;
export type PacCategory = (typeof PAC_CATEGORIES)[number];

export const PAC_CATEGORY_LABELS: Record<PacCategory, string> = {
  sales: "영업",
  marketing: "마케팅",
  operations: "운영",
  planning: "기획",
  other: "기타",
};

export const PAC_CATEGORY_COLORS: Record<PacCategory, string> = {
  sales: "#3b82f6",
  marketing: "#8b5cf6",
  operations: "#f59e0b",
  planning: "#10b981",
  other: "#6b7280",
};
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/constants.ts
git commit -m "feat(pacemaker): 카테고리 상수 추가"
```

---

## Task 3: DB 쿼리 함수

**Files:**
- Create: `src/db/queries/journals.ts`
- Create: `src/db/queries/goals.ts`

- [ ] **Step 1: journals 쿼리 작성**

```typescript
// src/db/queries/journals.ts
import { db } from "@/db";
import { pacJournals, pacAiComments } from "@/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { PacCategory } from "@/lib/constants";

interface CreateJournalInput {
  date: string;
  content: string;
  category: PacCategory;
  revenueDelta?: number;
  contractsDelta?: number;
}

export async function createJournal(data: CreateJournalInput) {
  return db.insert(pacJournals).values({
    date: data.date,
    content: data.content,
    category: data.category,
    revenueDelta: data.revenueDelta ?? null,
    contractsDelta: data.contractsDelta ?? null,
  }).returning();
}

export async function getJournals(since: string, limit = 30) {
  return db.select().from(pacJournals)
    .where(gte(pacJournals.date, since))
    .orderBy(desc(pacJournals.date))
    .limit(limit);
}

export async function getJournalsByDate(date: string) {
  return db.select().from(pacJournals)
    .where(eq(pacJournals.date, date))
    .orderBy(desc(pacJournals.createdAt));
}

export async function getJournalWithComment(journalId: string) {
  const journal = await db.select().from(pacJournals)
    .where(eq(pacJournals.id, journalId))
    .limit(1);
  
  if (!journal[0]) return null;

  const comments = await db.select().from(pacAiComments)
    .where(eq(pacAiComments.journalId, journalId))
    .orderBy(desc(pacAiComments.createdAt))
    .limit(1);

  return { ...journal[0], aiComment: comments[0] ?? null };
}

export async function getRecentJournalsWithComments(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const journals = await db.select().from(pacJournals)
    .where(gte(pacJournals.date, since))
    .orderBy(desc(pacJournals.date));

  const journalIds = journals.map((j) => j.id);
  if (journalIds.length === 0) return [];

  const comments = await db.select().from(pacAiComments)
    .where(sql`${pacAiComments.journalId} = ANY(${journalIds})`);

  const commentMap = new Map(comments.map((c) => [c.journalId, c]));

  return journals.map((j) => ({
    ...j,
    aiComment: commentMap.get(j.id) ?? null,
  }));
}

export async function saveAiComment(journalId: string, comment: string) {
  return db.insert(pacAiComments).values({
    journalId,
    comment,
  }).returning();
}
```

- [ ] **Step 2: goals 쿼리 작성**

```typescript
// src/db/queries/goals.ts
import { db } from "@/db";
import { pacGoals, pacMonthlyStats, pacJournals } from "@/db/schema";
import { desc, eq, sql, gte } from "drizzle-orm";

export async function getActiveGoal() {
  const goals = await db.select().from(pacGoals)
    .orderBy(desc(pacGoals.updatedAt))
    .limit(1);
  return goals[0] ?? null;
}

export async function upsertGoal(data: {
  targetRevenue: number;
  targetDate: string;
  currentRevenue: number;
  currentContracts: number;
}) {
  const existing = await getActiveGoal();
  
  if (existing) {
    return db.update(pacGoals)
      .set({
        targetRevenue: data.targetRevenue,
        targetDate: data.targetDate,
        currentRevenue: data.currentRevenue,
        currentContracts: data.currentContracts,
        updatedAt: new Date(),
      })
      .where(eq(pacGoals.id, existing.id))
      .returning();
  }

  return db.insert(pacGoals).values({
    targetRevenue: data.targetRevenue,
    targetDate: data.targetDate,
    currentRevenue: data.currentRevenue,
    currentContracts: data.currentContracts,
  }).returning();
}

export async function getMonthlyStats(months = 6) {
  return db.select().from(pacMonthlyStats)
    .orderBy(desc(pacMonthlyStats.yearMonth))
    .limit(months);
}

export async function upsertMonthlyStats(yearMonth: string, data: {
  revenue?: number;
  contracts?: number;
  entriesCount?: number;
}) {
  const existing = await db.select().from(pacMonthlyStats)
    .where(eq(pacMonthlyStats.yearMonth, yearMonth))
    .limit(1);

  if (existing[0]) {
    return db.update(pacMonthlyStats)
      .set({
        revenue: data.revenue ?? existing[0].revenue,
        contracts: data.contracts ?? existing[0].contracts,
        entriesCount: data.entriesCount ?? existing[0].entriesCount,
      })
      .where(eq(pacMonthlyStats.id, existing[0].id))
      .returning();
  }

  return db.insert(pacMonthlyStats).values({
    yearMonth,
    revenue: data.revenue ?? 0,
    contracts: data.contracts ?? 0,
    entriesCount: data.entriesCount ?? 0,
  }).returning();
}

export async function getPacemakerStats() {
  const goal = await getActiveGoal();
  const monthlyStats = await getMonthlyStats(6);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const journalCount = await db.select({
    count: sql<number>`count(*)`,
  }).from(pacJournals)
    .where(gte(pacJournals.date, thirtyDaysAgo));

  return {
    goal,
    monthlyStats,
    recentEntries: journalCount[0]?.count ?? 0,
  };
}
```

- [ ] **Step 3: 커밋**

```bash
git add src/db/queries/journals.ts src/db/queries/goals.ts
git commit -m "feat(pacemaker): DB 쿼리 함수 — journals, goals, stats"
```

---

## Task 4: AI 프롬프트

**Files:**
- Create: `src/lib/prompts/pacemaker.ts`

- [ ] **Step 1: 페이스메이커 프롬프트 작성**

```typescript
// src/lib/prompts/pacemaker.ts

export function buildPacemakerSystemPrompt(): string {
  return `당신은 우리 회사의 페이스메이커입니다.
병원마케팅 대행사의 대표가 월 매출 n만원을 달성하도록 돕는 코치 역할입니다.

규칙:
- 한국어로 답변
- 2-3문장으로 간결하게
- 첫 문장: 오늘 업무에서 목표 달성에 기여한 점 (구체적으로)
- 둘째 문장: 내일 가장 먼저 해야 할 액션 1개 (실행 가능하게)
- 셋째 문장(선택): 리스크나 놓치고 있는 부분이 있으면 짧게 언급
- 칭찬은 근거 있게, 비판은 건설적으로
- 숫자/데이터가 있으면 반드시 활용`;
}

export function buildPacemakerUserPrompt(data: {
  content: string;
  category: string;
  currentRevenue: number;
  targetRevenue: number;
  currentContracts: number;
  percentage: number;
  revenueDelta?: number | null;
  contractsDelta?: number | null;
}): string {
  const parts = [
    `목표: 월 매출 ${(data.targetRevenue / 10000).toLocaleString()}만원`,
    `현재: ${(data.currentRevenue / 10000).toLocaleString()}만원 (달성률 ${data.percentage}%)`,
    `활성 계약: ${data.currentContracts}개`,
    ``,
    `오늘의 업무일지:`,
    data.content,
    `카테고리: ${data.category}`,
  ];

  if (data.revenueDelta) {
    parts.push(`매출 변동: ${data.revenueDelta > 0 ? "+" : ""}${(data.revenueDelta / 10000).toLocaleString()}만원`);
  }
  if (data.contractsDelta) {
    parts.push(`계약 변동: ${data.contractsDelta > 0 ? "+" : ""}${data.contractsDelta}건`);
  }

  return parts.join("\n");
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/prompts/pacemaker.ts
git commit -m "feat(pacemaker): AI 페이스메이커 프롬프트"
```

---

## Task 5: API 라우트

**Files:**
- Create: `src/app/api/pacemaker/journal/route.ts`
- Create: `src/app/api/pacemaker/ai-comment/route.ts`
- Create: `src/app/api/pacemaker/stats/route.ts`
- Create: `src/app/api/pacemaker/goals/route.ts`

- [ ] **Step 1: journal API (GET/POST)**

```typescript
// src/app/api/pacemaker/journal/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJournal, getJournals, getRecentJournalsWithComments } from "@/db/queries/journals";

const createSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  content: z.string().min(1),
  category: z.enum(["sales", "marketing", "operations", "planning", "other"]),
  revenueDelta: z.number().optional(),
  contractsDelta: z.number().optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString().split("T")[0];

  const journals = await getRecentJournalsWithComments(days);
  return NextResponse.json(journals);
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const [created] = await createJournal(parsed.data);
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "저장 중 오류 발생";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: ai-comment API**

```typescript
// src/app/api/pacemaker/ai-comment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getJournalWithComment, saveAiComment } from "@/db/queries/journals";
import { getActiveGoal } from "@/db/queries/goals";
import { generateContent } from "@/lib/ai";
import { buildPacemakerSystemPrompt, buildPacemakerUserPrompt } from "@/lib/prompts/pacemaker";
import { PAC_CATEGORY_LABELS } from "@/lib/constants";
import type { PacCategory } from "@/lib/constants";

const schema = z.object({
  journalId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const journal = await getJournalWithComment(parsed.data.journalId);
    if (!journal) {
      return NextResponse.json(
        { success: false, error: "일지를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    const goal = await getActiveGoal();
    const currentRevenue = goal?.currentRevenue ?? 0;
    const targetRevenue = goal?.targetRevenue ?? DEFAULT_TARGET_REVENUE;
    const percentage = targetRevenue > 0
      ? Math.round((currentRevenue / targetRevenue) * 100)
      : 0;

    const systemPrompt = buildPacemakerSystemPrompt();
    const userPrompt = buildPacemakerUserPrompt({
      content: journal.content,
      category: PAC_CATEGORY_LABELS[journal.category as PacCategory] ?? journal.category,
      currentRevenue,
      targetRevenue,
      currentContracts: goal?.currentContracts ?? 0,
      percentage,
      revenueDelta: journal.revenueDelta,
      contractsDelta: journal.contractsDelta,
    });

    const comment = await generateContent({
      systemPrompt,
      userPrompt,
      maxTokens: 512,
    });

    const [saved] = await saveAiComment(journal.id, comment);

    return NextResponse.json({ success: true, data: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI 코멘트 생성 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: stats API**

```typescript
// src/app/api/pacemaker/stats/route.ts
import { NextResponse } from "next/server";
import { getPacemakerStats } from "@/db/queries/goals";

export async function GET() {
  const stats = await getPacemakerStats();
  return NextResponse.json(stats);
}
```

- [ ] **Step 4: goals API (GET/PUT)**

```typescript
// src/app/api/pacemaker/goals/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getActiveGoal, upsertGoal } from "@/db/queries/goals";

const updateSchema = z.object({
  targetRevenue: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  currentRevenue: z.number().min(0),
  currentContracts: z.number().min(0),
});

export async function GET() {
  const goal = await getActiveGoal();
  return NextResponse.json(goal);
}

export async function PUT(request: NextRequest) {
  try {
    const body: unknown = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const [updated] = await upsertGoal(parsed.data);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "목표 수정 실패";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/api/pacemaker/
git commit -m "feat(pacemaker): API 라우트 — journal, ai-comment, stats, goals"
```

---

## Task 6: UI 컴포넌트

**Files:**
- Create: `src/components/pacemaker/journal-form.tsx`
- Create: `src/components/pacemaker/ai-comment.tsx`
- Create: `src/components/pacemaker/goal-progress.tsx`
- Create: `src/components/pacemaker/journal-history.tsx`
- Create: `src/components/pacemaker/revenue-chart.tsx`

- [ ] **Step 1: journal-form.tsx 작성**

업무일지 입력 폼. "use client". 카테고리 태그, 내용, 매출/계약 변동. 저장 시 POST → AI 코멘트 요청.

- [ ] **Step 2: ai-comment.tsx 작성**

AI 코멘트 표시 컴포넌트. 로딩 스피너 + 코멘트 텍스트.

- [ ] **Step 3: goal-progress.tsx 작성**

KPI 카드 3개: 달성률, 현재 매출, 계약 수. shadcn Card 사용.

- [ ] **Step 4: journal-history.tsx 작성**

최근 7일 업무 히스토리 리스트. 날짜, 카테고리 뱃지, 내용 요약, AI 코멘트 축약.

- [ ] **Step 5: revenue-chart.tsx 작성**

"use client". Recharts 라인 차트. 월별 매출 추이 + 목표 기준선.

- [ ] **Step 6: 커밋**

```bash
git add src/components/pacemaker/
git commit -m "feat(pacemaker): UI 컴포넌트 — form, ai-comment, progress, history, chart"
```

---

## Task 7: 페이지 + 레이아웃

**Files:**
- Create: `src/app/pacemaker/page.tsx`
- Create: `src/app/pacemaker/layout.tsx`

- [ ] **Step 1: layout.tsx 작성**

```typescript
// src/app/pacemaker/layout.tsx
import Link from "next/link";

export default function PacemakerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Pacemaker</h1>
          <p className="text-sm text-muted-foreground">월 n만원 목표 달성 페이스메이커</p>
        </div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:underline">
          ← 대시보드
        </Link>
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: page.tsx 작성 (Server Component)**

Server component로 데이터 fetch → 클라이언트 컴포넌트에 전달.
`export const dynamic = "force-dynamic"` 패턴 사용.
Promise.all로 goal, journals, monthlyStats 동시 조회.

- [ ] **Step 3: 대시보드 네비게이션에 Pacemaker 링크 추가**

기존 `src/app/dashboard/layout.tsx`에 Pacemaker 링크 추가.

- [ ] **Step 4: 빌드 검증**

```bash
cd marketing-dashboard
npm run build
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/pacemaker/ src/app/dashboard/layout.tsx
git commit -m "feat(pacemaker): 메인 페이지 + 레이아웃 + 네비게이션 연동"
```

---

## Task 8: 초기 데이터 시드 + 통합 검증

- [ ] **Step 1: 초기 목표 데이터 시드**

Supabase에 pac_goals 초기 데이터 INSERT:
- target_revenue: n원 (목표 매출)
- target_date: 2026-12-31
- current_revenue: n원 (현재 매출)
- current_contracts: n건

- [ ] **Step 2: dev 서버로 전체 플로우 검증**

```bash
cd marketing-dashboard && npm run dev
```

1. `/pacemaker` 접속 → 레이아웃 확인
2. 업무일지 작성 → 저장 → DB 확인
3. AI 코멘트 생성 → 표시 확인
4. KPI 카드 데이터 표시 확인
5. 히스토리 리스트 표시 확인

- [ ] **Step 3: 최종 커밋**

```bash
git add -A
git commit -m "feat(pacemaker): 통합 검증 완료 — 페이스메이커 대시보드 v1"
```
