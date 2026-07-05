# GBP 대시보드 SOP 재설계 — 구현 계획

> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. 이 문서는 아카이브 이력용으로 보존.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 GBP 대시보드를 데이터 뷰어에서 운영 관리 도구로 전환. 액션 시스템 + 건강 점수 + 성과 트렌드 + 리포트 히스토리 탑재.

**Architecture:** 기존 Next.js 15 + Supabase + Drizzle ORM 스택 위에 3개 신규 테이블(`sop_checklist`, `health_score_snapshots`, `actions`) + 1개 ALTER(`reports`에 `sent_at` 추가). 건강 점수와 액션은 새 Cron(`/api/cron/health`)이 매일 계산/생성. 메인 대시보드 페이지를 액션 리스트 + 건강 카드 + 주간 요약 3단 구조로 재설계.

**Tech Stack:** Next.js 15 (App Router) / React 19 / Drizzle ORM / Supabase PostgreSQL / shadcn/ui / Recharts / franc-min

**Spec:** `docs/superpowers/specs/2026-04-13-gbp-dashboard-sop-redesign.md`

---

## 파일 구조

### 신규 생성

```
src/db/schema/sop-checklist.ts          — SOP 체크리스트 테이블
src/db/schema/health-score-snapshots.ts — 건강 점수 스냅샷 테이블
src/db/schema/actions.ts                — 액션 테이블
src/lib/health/calculator.ts            — 건강 점수 계산 로직
src/lib/health/action-generator.ts      — 액션 자동 생성 로직
src/app/api/cron/health/route.ts        — 건강 점수 + 액션 Cron
src/app/api/sop/route.ts               — SOP 체크리스트 API
src/app/api/sop/[clientId]/route.ts     — 거래처별 SOP API
src/app/api/actions/route.ts            — 액션 목록 API
src/app/api/actions/[id]/route.ts       — 액션 처리 API
src/app/api/health/route.ts             — 건강 점수 조회 API
src/app/api/health/trends/route.ts      — 건강 점수 트렌드 API
src/components/dashboard/action-list.tsx    — 액션 리스트 컴포넌트
src/components/dashboard/health-card.tsx    — 건강 점수 카드
src/components/dashboard/weekly-summary.tsx — 주간 성과 요약
src/components/dashboard/sop-checklist.tsx  — SOP 체크리스트 UI
src/components/dashboard/health-trend.tsx   — 건강 점수 트렌드 차트
src/components/dashboard/ranking-trend.tsx  — 순위 트렌드 차트 (거래처 상세용)
src/components/dashboard/review-trend.tsx   — 리뷰 트렌드 차트
src/components/dashboard/report-history.tsx — 리포트 히스토리 목록
```

### 수정

```
src/db/schema/index.ts                  — 신규 스키마 export 추가
src/db/schema/reports.ts                — sentAt 컬럼 추가
src/app/dashboard/page.tsx              — 메인 대시보드 전면 재설계
src/app/dashboard/clients/[id]/page.tsx — 거래처 상세 SOP+트렌드 탭 추가
src/components/layout/sidebar.tsx       — 사이드바 네비 정리
src/app/api/cron/weekly-report/route.ts  — 리포트 전송 시 sentAt 기록 (정확한 위치 구현 시 확인)
vercel.json                             — 신규 Cron 스케줄 추가
```

---

## Task 1: DB 스키마 — 신규 테이블 3개 + ALTER 1개

**Files:**
- Create: `src/db/schema/sop-checklist.ts`
- Create: `src/db/schema/health-score-snapshots.ts`
- Create: `src/db/schema/actions.ts`
- Modify: `src/db/schema/reports.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: `sop-checklist.ts` 스키마 작성**

```typescript
// src/db/schema/sop-checklist.ts
import { pgTable, uuid, text, boolean, timestamp, date, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const sopChecklist = pgTable('sop_checklist', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  itemKey: text('item_key').notNull(), // 'keyword_setup', 'basic_info', 'categories', 'photos', 'aeo_schema', 'qa_weekly'
  completed: boolean('completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  weekOf: date('week_of'), // NULL = 초기 세팅(영구), 값 = 해당 주 월요일
}, (table) => [
  uniqueIndex('sop_client_item_idx').on(table.clientId, table.itemKey).where(sql`week_of IS NULL`),
  uniqueIndex('sop_client_item_week_idx').on(table.clientId, table.itemKey, table.weekOf).where(sql`week_of IS NOT NULL`),
]);
```

- [ ] **Step 2: `health-score-snapshots.ts` 스키마 작성**

```typescript
// src/db/schema/health-score-snapshots.ts
import { pgTable, uuid, date, smallint, uniqueIndex } from 'drizzle-orm/pg-core';
import { clients } from './clients';

export const healthScoreSnapshots = pgTable('health_score_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  setupScore: smallint('setup_score').notNull().default(0),
  reviewScore: smallint('review_score').notNull().default(0),
  updateScore: smallint('update_score').notNull().default(0),
  keywordScore: smallint('keyword_score').notNull().default(0),
  qaScore: smallint('qa_score').notNull().default(0),
  totalScore: smallint('total_score').notNull().default(0),
}, (table) => [
  uniqueIndex('health_client_date_idx').on(table.clientId, table.date),
]);
```

- [ ] **Step 3: `actions.ts` 스키마 작성**

```typescript
// src/db/schema/actions.ts
import { pgTable, uuid, text, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { clients } from './clients';

export const actions = pgTable('actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'urgent', 'warning', 'scheduled', 'suggestion'
  actionKey: text('action_key').notNull(), // 중복 방지 키
  title: text('title').notNull(),
  description: text('description'),
  source: text('source').notNull().default('auto'), // 'auto' or 'manual'
  resolved: boolean('resolved').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('actions_client_key_unresolved_idx')
    .on(table.clientId, table.actionKey)
    .where(sql`resolved = false`),
]);
```

- [ ] **Step 4: `reports.ts`에 `sentAt` 컬럼 추가**

기존 `reports.ts`에 `sentAt` 컬럼 추가:

```typescript
sentAt: timestamp('sent_at', { withTimezone: true }),
```

- [ ] **Step 5: `index.ts`에 신규 스키마 export 추가**

기존 export 목록에 추가:

```typescript
export * from './sop-checklist';
export * from './health-score-snapshots';
export * from './actions';
```

- [ ] **Step 6: Drizzle 마이그레이션 생성 및 확인**

```bash
cd gbp-dashboard/app
npx drizzle-kit generate
```

생성된 SQL 확인 — 3개 CREATE TABLE + 1개 ALTER TABLE 포함 여부 검증.

- [ ] **Step 7: 마이그레이션 적용**

Supabase 대시보드 또는 CLI로 마이그레이션 SQL 실행.

- [ ] **Step 8: 커밋**

```bash
git add src/db/schema/sop-checklist.ts src/db/schema/health-score-snapshots.ts src/db/schema/actions.ts src/db/schema/reports.ts src/db/schema/index.ts drizzle/
git commit -m "feat(db): SOP 체크리스트, 건강 점수, 액션 테이블 추가"
```

---

## Task 2: 건강 점수 계산 로직

**Files:**
- Create: `src/lib/health/calculator.ts`

- [ ] **Step 1: 타입 정의 + 점수 상수**

```typescript
// src/lib/health/calculator.ts
export interface HealthScore {
  clientId: string;
  setupScore: number;   // 0~30
  reviewScore: number;   // 0~25
  updateScore: number;   // 0~20
  keywordScore: number;  // 0~15
  qaScore: number;       // 0~10
  totalScore: number;    // 0~100
}

const SETUP_ITEMS = ['keyword_setup', 'basic_info', 'categories', 'photos', 'aeo_schema'] as const;
const SETUP_WEIGHTS: Record<string, number> = {
  keyword_setup: 8,
  basic_info: 7,
  categories: 5,
  photos: 5,
  aeo_schema: 5,
};
```

- [ ] **Step 2: 초기 세팅 점수 계산 함수**

```typescript
export async function calcSetupScore(db: DB, clientId: string): Promise<number> {
  const rows = await db.select()
    .from(sopChecklist)
    .where(and(
      eq(sopChecklist.clientId, clientId),
      isNull(sopChecklist.weekOf),
      eq(sopChecklist.completed, true),
    ));

  const completedKeys = new Set(rows.map(r => r.itemKey));
  return SETUP_ITEMS.reduce((sum, key) =>
    sum + (completedKeys.has(key) ? SETUP_WEIGHTS[key] : 0), 0);
}
```

- [ ] **Step 3: 리뷰 답글 점수 계산 함수**

최근 7일 리뷰 중 24시간 내 답글 비율 × 25점.

```typescript
export async function calcReviewScore(db: DB, clientId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentReviews = await db.select()
    .from(reviews)
    .where(and(
      eq(reviews.clientId, clientId),
      gte(reviews.publishedAt, sevenDaysAgo),
      eq(reviews.isDeleted, false),
    ));

  if (recentReviews.length === 0) return 25; // 리뷰 0건이면 만점

  const repliedIn24h = recentReviews.filter(r => {
    if (!r.reply || !r.repliedAt || !r.publishedAt) return false;
    const diff = new Date(r.repliedAt).getTime() - new Date(r.publishedAt).getTime();
    return diff <= 24 * 60 * 60 * 1000;
  });

  return Math.round((repliedIn24h.length / recentReviews.length) * 25);
}
```

- [ ] **Step 4: 업데이트 점수 계산 함수**

최근 7일 게시물을 언어별로 집계. `franc-min`으로 언어 분류. 언어별 2개 이상이면 만점.

```typescript
export async function calcUpdateScore(db: DB, clientId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const recentUpdates = await db.select()
    .from(gbpUpdates)
    .where(and(
      eq(gbpUpdates.clientId, clientId),
      gte(gbpUpdates.submittedAt, sevenDaysAgo),
      eq(gbpUpdates.status, 'submitted'),
    ));

  if (recentUpdates.length === 0) return 0;

  // 거래처의 targetCountries로 필요 언어 수 확인
  const client = await db.select({ targetCountries: clients.targetCountries })
    .from(clients)
    .where(eq(clients.id, clientId))
    .then(rows => rows[0]);

  const requiredLangs = (client?.targetCountries as string[] || []).length || 1;

  // 언어별 게시물 수 집계 (franc-min 사용)
  const langCounts: Record<string, number> = {};
  for (const update of recentUpdates) {
    const lang = detectLang(update.content || update.title || '');
    langCounts[lang] = (langCounts[lang] || 0) + 1;
  }

  // 각 언어가 2개 이상인 비율로 점수 계산
  const langsWithEnough = Object.values(langCounts).filter(c => c >= 2).length;
  const ratio = Math.min(langsWithEnough / requiredLangs, 1);
  return Math.round(ratio * 20);
}
```

- [ ] **Step 5: 키워드 포함률 점수 계산 함수**

최근 7일 답글 + 업데이트 중 타겟 키워드 포함 비율 × 15점.

```typescript
export async function calcKeywordScore(db: DB, clientId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 타겟 키워드 목록
  const keywords = await db.select({ keyword: targetKeywords.keyword })
    .from(targetKeywords)
    .where(and(
      eq(targetKeywords.clientId, clientId),
      eq(targetKeywords.isActive, true),
    ));

  if (keywords.length === 0) return 15; // 키워드 미설정이면 만점

  const keywordList = keywords.map(k => k.keyword.toLowerCase());

  // 최근 리뷰 답글
  const recentReplies = await db.select({ reply: reviews.reply })
    .from(reviews)
    .where(and(
      eq(reviews.clientId, clientId),
      gte(reviews.publishedAt, sevenDaysAgo),
      isNotNull(reviews.reply),
    ));

  // 최근 업데이트
  const recentUpdates = await db.select({ content: gbpUpdates.content, title: gbpUpdates.title })
    .from(gbpUpdates)
    .where(and(
      eq(gbpUpdates.clientId, clientId),
      gte(gbpUpdates.submittedAt, sevenDaysAgo),
    ));

  const allTexts = [
    ...recentReplies.map(r => r.reply || ''),
    ...recentUpdates.map(u => `${u.title || ''} ${u.content || ''}`),
  ];

  if (allTexts.length === 0) return 0;

  const withKeyword = allTexts.filter(text =>
    keywordList.some(kw => text.toLowerCase().includes(kw))
  );

  return Math.round((withKeyword.length / allTexts.length) * 15);
}
```

- [ ] **Step 6: Q&A 점수 계산 함수**

이번 주 `qa_weekly` 체크 여부.

```typescript
export async function calcQaScore(db: DB, clientId: string): Promise<number> {
  const mondayOfThisWeek = getMonday(new Date());

  const qaCheck = await db.select()
    .from(sopChecklist)
    .where(and(
      eq(sopChecklist.clientId, clientId),
      eq(sopChecklist.itemKey, 'qa_weekly'),
      eq(sopChecklist.weekOf, mondayOfThisWeek.toISOString().split('T')[0]),
      eq(sopChecklist.completed, true),
    ));

  return qaCheck.length > 0 ? 10 : 0;
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
```

- [ ] **Step 7: 종합 점수 계산 + DB 저장**

```typescript
export async function calculateAndSaveHealthScore(db: DB, clientId: string): Promise<HealthScore> {
  const [setupScore, reviewScore, updateScore, keywordScore, qaScore] = await Promise.all([
    calcSetupScore(db, clientId),
    calcReviewScore(db, clientId),
    calcUpdateScore(db, clientId),
    calcKeywordScore(db, clientId),
    calcQaScore(db, clientId),
  ]);

  const totalScore = setupScore + reviewScore + updateScore + keywordScore + qaScore;
  const today = new Date().toISOString().split('T')[0];

  // UPSERT — 같은 날 중복 방지
  await db.insert(healthScoreSnapshots)
    .values({ clientId, date: today, setupScore, reviewScore, updateScore, keywordScore, qaScore, totalScore })
    .onConflictDoUpdate({
      target: [healthScoreSnapshots.clientId, healthScoreSnapshots.date],
      set: { setupScore, reviewScore, updateScore, keywordScore, qaScore, totalScore },
    });

  return { clientId, setupScore, reviewScore, updateScore, keywordScore, qaScore, totalScore };
}
```

- [ ] **Step 8: 커밋**

```bash
git add src/lib/health/calculator.ts
git commit -m "feat: 건강 점수 계산 로직 (세팅/리뷰/업데이트/키워드/QA)"
```

---

## Task 3: 액션 자동 생성 로직

**Files:**
- Create: `src/lib/health/action-generator.ts`

- [ ] **Step 1: 미답변 리뷰 액션 생성**

```typescript
// src/lib/health/action-generator.ts
export async function generateReviewActions(db: DB, clientId: string): Promise<void> {
  const unrepliedReviews = await db.select()
    .from(reviews)
    .where(and(
      eq(reviews.clientId, clientId),
      isNull(reviews.reply),
      eq(reviews.isDeleted, false),
    ))
    .orderBy(asc(reviews.publishedAt));

  for (const review of unrepliedReviews) {
    const hoursElapsed = (Date.now() - new Date(review.publishedAt!).getTime()) / (1000 * 60 * 60);
    if (hoursElapsed < 12) continue; // 12시간 미만은 아직 여유 있음

    const type = hoursElapsed >= 18 ? 'urgent' : 'warning';
    const actionKey = `review_overdue__${review.id}`;

    await db.insert(actions)
      .values({
        clientId,
        type,
        actionKey,
        title: `리뷰 미답변 (${Math.round(hoursElapsed)}h 경과)`,
        description: `${review.authorName}: "${(review.comment || '').slice(0, 50)}..."`,
        source: 'auto',
      })
      .onConflictDoNothing();
  }
}
```

- [ ] **Step 2: 업데이트 부족 액션 생성**

```typescript
export async function generateUpdateActions(db: DB, clientId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monday = getMonday(new Date()).toISOString().split('T')[0];

  const updateCount = await db.select({ count: sql<number>`count(*)` })
    .from(gbpUpdates)
    .where(and(
      eq(gbpUpdates.clientId, clientId),
      gte(gbpUpdates.submittedAt, sevenDaysAgo),
      eq(gbpUpdates.status, 'submitted'),
    ))
    .then(rows => rows[0]?.count || 0);

  // 거래처의 targetCountries 수 × 2 = 필요 업데이트 수
  const client = await db.select({ targetCountries: clients.targetCountries })
    .from(clients)
    .where(eq(clients.id, clientId))
    .then(rows => rows[0]);

  const requiredLangs = (client?.targetCountries as string[] || []).length || 1;
  const requiredUpdates = requiredLangs * 2;

  if (updateCount < requiredUpdates) {
    await db.insert(actions)
      .values({
        clientId,
        type: 'warning',
        actionKey: `update_shortage__${monday}`,
        title: `이번주 업데이트 ${updateCount}/${requiredUpdates}`,
        description: `언어별 주 2개 기준 미달`,
        source: 'auto',
      })
      .onConflictDoNothing();
  }
}
```

- [ ] **Step 3: 초기 세팅 미완료 액션 생성**

```typescript
export async function generateSetupActions(db: DB, clientId: string): Promise<void> {
  const completedItems = await db.select({ itemKey: sopChecklist.itemKey })
    .from(sopChecklist)
    .where(and(
      eq(sopChecklist.clientId, clientId),
      isNull(sopChecklist.weekOf),
      eq(sopChecklist.completed, true),
    ));

  const completedKeys = new Set(completedItems.map(r => r.itemKey));
  const SETUP_LABELS: Record<string, string> = {
    keyword_setup: '키워드 선정',
    basic_info: 'GBP 기본정보',
    categories: '카테고리 설정',
    photos: '사진 배치',
    aeo_schema: 'AEO 스키마',
  };

  for (const [key, label] of Object.entries(SETUP_LABELS)) {
    if (!completedKeys.has(key)) {
      await db.insert(actions)
        .values({
          clientId,
          type: 'scheduled',
          actionKey: `setup_incomplete__${key}`,
          title: `초기 세팅 미완료: ${label}`,
          source: 'auto',
        })
        .onConflictDoNothing();
    }
  }
}
```

- [ ] **Step 4: 키워드 포함률 부족 액션 생성**

```typescript
export async function generateKeywordActions(db: DB, clientId: string): Promise<void> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monday = getMonday(new Date()).toISOString().split('T')[0];

  const keywords = await db.select({ keyword: targetKeywords.keyword })
    .from(targetKeywords)
    .where(and(eq(targetKeywords.clientId, clientId), eq(targetKeywords.isActive, true)));

  if (keywords.length === 0) return;
  const keywordList = keywords.map(k => k.keyword.toLowerCase());

  // 최근 답글 + 업데이트 텍스트
  const recentReplies = await db.select({ reply: reviews.reply })
    .from(reviews)
    .where(and(eq(reviews.clientId, clientId), gte(reviews.publishedAt, sevenDaysAgo), isNotNull(reviews.reply)));

  const recentUpdates = await db.select({ content: gbpUpdates.content, title: gbpUpdates.title })
    .from(gbpUpdates)
    .where(and(eq(gbpUpdates.clientId, clientId), gte(gbpUpdates.submittedAt, sevenDaysAgo)));

  const allTexts = [
    ...recentReplies.map(r => r.reply || ''),
    ...recentUpdates.map(u => `${u.title || ''} ${u.content || ''}`),
  ];

  if (allTexts.length === 0) return;

  const withKeyword = allTexts.filter(t => keywordList.some(kw => t.toLowerCase().includes(kw)));
  const rate = withKeyword.length / allTexts.length;

  if (rate < 0.5) { // 50% 미만이면 제안
    await db.insert(actions)
      .values({
        clientId,
        type: 'suggestion',
        actionKey: `keyword_low_rate__${monday}`,
        title: `키워드 포함률 ${Math.round(rate * 100)}%`,
        description: `최근 답글/업데이트 중 타겟 키워드 포함 비율이 낮습니다`,
        source: 'auto',
      })
      .onConflictDoNothing();
  }
}
```

- [ ] **Step 5: 답변된 리뷰 액션 자동 해소**

```typescript
export async function resolveCompletedActions(db: DB, clientId: string): Promise<void> {
  // 답글 달린 리뷰의 액션 해소
  const repliedReviews = await db.select({ id: reviews.id })
    .from(reviews)
    .where(and(
      eq(reviews.clientId, clientId),
      isNotNull(reviews.reply),
    ));

  for (const review of repliedReviews) {
    await db.update(actions)
      .set({ resolved: true, resolvedAt: new Date() })
      .where(and(
        eq(actions.clientId, clientId),
        eq(actions.actionKey, `review_overdue__${review.id}`),
        eq(actions.resolved, false),
      ));
  }
}
```

- [ ] **Step 5: 전체 거래처 일괄 실행 함수**

```typescript
export async function generateAllActions(db: DB): Promise<{ processed: number }> {
  const activeClients = await db.select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.isActive, true), eq(clients.contractStatus, 'active')));

  for (const client of activeClients) {
    await resolveCompletedActions(db, client.id);
    await generateReviewActions(db, client.id);
    await generateUpdateActions(db, client.id);
    await generateSetupActions(db, client.id);
    await generateKeywordActions(db, client.id);
  }

  return { processed: activeClients.length };
}
```

- [ ] **Step 6: 커밋**

```bash
git add src/lib/health/action-generator.ts
git commit -m "feat: 액션 자동 생성 + 해소 로직"
```

---

## Task 4: Cron API + SOP/액션/건강 점수 API

**Files:**
- Create: `src/app/api/cron/health/route.ts`
- Create: `src/app/api/sop/route.ts`
- Create: `src/app/api/sop/[clientId]/route.ts`
- Create: `src/app/api/actions/route.ts`
- Create: `src/app/api/actions/[id]/route.ts`
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/health/trends/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: 건강 점수 + 액션 Cron**

```typescript
// src/app/api/cron/health/route.ts
import { db } from '@/db';
import { calculateAndSaveHealthScore } from '@/lib/health/calculator';
import { generateAllActions } from '@/lib/health/action-generator';
import { verifyCronSecret } from '@/lib/cron/auth';

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const activeClients = await db.select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.isActive, true), eq(clients.contractStatus, 'active')));

  const scores = [];
  for (const client of activeClients) {
    const score = await calculateAndSaveHealthScore(db, client.id);
    scores.push(score);
  }

  const actionResult = await generateAllActions(db);

  return Response.json({
    success: true,
    data: { scores: scores.length, actions: actionResult.processed },
  });
}
```

- [ ] **Step 2: SOP 체크리스트 API (목록 + 토글)**

```typescript
// src/app/api/sop/[clientId]/route.ts
// GET: 해당 거래처의 SOP 체크 상태 반환
// PATCH: 체크 토글 (body: { itemKey, completed, weekOf? })
```

- [ ] **Step 3: 액션 API (목록 + 해소)**

```typescript
// src/app/api/actions/route.ts
// GET: 미해소 액션 목록 (긴급도 순 정렬)
// GET ?clientId=xxx: 특정 거래처 액션만

// src/app/api/actions/[id]/route.ts
// PATCH: 액션 해소 (body: { resolved: true })
```

- [ ] **Step 4: 건강 점수 API (현재 + 트렌드)**

```typescript
// src/app/api/health/route.ts
// GET: 전체 거래처 최신 건강 점수

// src/app/api/health/trends/route.ts
// GET ?clientId=xxx&weeks=4: 건강 점수 시계열
```

- [ ] **Step 5: vercel.json에 Cron 추가**

```json
{
  "crons": [
    { "path": "/api/cron/health", "schedule": "0 21 * * *" }
  ]
}
```

매일 KST 06:00 (UTC 21:00) 실행. 기존 Cron과 시간 분산.

- [ ] **Step 6: 커밋**

```bash
git add src/app/api/cron/health/ src/app/api/sop/ src/app/api/actions/ src/app/api/health/ vercel.json
git commit -m "feat(api): 건강 점수 Cron + SOP/액션/건강 API 엔드포인트"
```

---

## Task 5: 메인 대시보드 UI 재설계

**Files:**
- Create: `src/components/dashboard/action-list.tsx`
- Create: `src/components/dashboard/health-card.tsx`
- Create: `src/components/dashboard/weekly-summary.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: 액션 리스트 컴포넌트**

긴급도별 색상 배지 + 거래처명 + 제목 + 경과 시간. 클릭 시 거래처 상세로 이동.
🔴 urgnet, 🟡 warning은 항상 표시. ⚪ suggestion은 접힘.

```typescript
// src/components/dashboard/action-list.tsx
// Props: actions: Action[]
// 렌더: 긴급도 그룹핑 → 카드 목록
// 0건: "모든 거래처 관리 정상 🟢"
```

- [ ] **Step 2: 건강 점수 카드 컴포넌트**

카드마다: 거래처명 + 점수 + 전주 대비 증감 + 색상 (🟢/🟡/🔴).

```typescript
// src/components/dashboard/health-card.tsx
// Props: client: { id, name, score, prevScore }
// 색상: >= 90 green, >= 70 yellow, < 70 red
// 클릭 → /dashboard/clients/[id]
```

- [ ] **Step 3: 주간 성과 요약 컴포넌트**

3개 KPI 카드: 평균 순위 변동, 총 리뷰 증감(답글 완료율), 관리 점수 평균.

```typescript
// src/components/dashboard/weekly-summary.tsx
// Props: summary: { avgRank, rankChange, newReviews, replyRate, avgHealthScore, scoreChange }
```

- [ ] **Step 4: 메인 대시보드 페이지 재설계**

기존 `dashboard/page.tsx`를 3단 구조로 재설계:

```tsx
// src/app/dashboard/page.tsx
export default async function DashboardPage() {
  const [actions, healthScores, weeklySummary] = await Promise.all([
    fetchActions(),
    fetchHealthScores(),
    fetchWeeklySummary(),
  ]);

  return (
    <div className="space-y-6">
      <ActionList actions={actions} />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {healthScores.map(score => (
          <HealthCard key={score.clientId} {...score} />
        ))}
      </div>
      <WeeklySummary data={weeklySummary} />
    </div>
  );
}
```

- [ ] **Step 5: 빌드 확인**

```bash
cd gbp-dashboard/app && npm run build
```

- [ ] **Step 6: 커밋**

```bash
git add src/components/dashboard/action-list.tsx src/components/dashboard/health-card.tsx src/components/dashboard/weekly-summary.tsx src/app/dashboard/page.tsx
git commit -m "feat(ui): 메인 대시보드 3단 재설계 (액션+건강+요약)"
```

---

## Task 6: 거래처 상세 — SOP + 트렌드 탭

**Files:**
- Create: `src/components/dashboard/sop-checklist.tsx`
- Create: `src/components/dashboard/health-trend.tsx`
- Create: `src/components/dashboard/review-trend.tsx`
- Create: `src/components/dashboard/report-history.tsx`
- Modify: `src/app/dashboard/clients/[id]/page.tsx`

- [ ] **Step 1: SOP 체크리스트 컴포넌트**

초기 세팅 5항목 + 이번 주 Q&A 체크. 체크 토글 시 PATCH `/api/sop/[clientId]`.

```typescript
// src/components/dashboard/sop-checklist.tsx
// Props: clientId, checklist: SopItem[], healthScore: HealthScore
// 상단: 건강 점수 N/100 (색상 원형)
// 초기 세팅 섹션: 5개 체크박스
// 주간 운영 섹션: 자동 감지 항목은 읽기 전용 표시, Q&A만 체크 가능
```

- [ ] **Step 2: 건강 점수 트렌드 차트**

Recharts LineChart. 최근 4/8/12주 건강 점수 추이.

```typescript
// src/components/dashboard/health-trend.tsx
// Props: data: { date, totalScore }[]
// X축: 날짜, Y축: 0~100
// 기준선: 90점(초록), 70점(노랑) 수평선 표시
```

- [ ] **Step 3: 리뷰 트렌드 차트**

신규 리뷰 수 + 평균 별점 + 평균 응답 시간. 기존 `review_snapshots` 테이블 활용.

```typescript
// src/components/dashboard/review-trend.tsx
// Props: data: ReviewSnapshot[]
// 이중 Y축: 좌측 리뷰 수(bar), 우측 별점(line)
```

- [ ] **Step 4: 순위 트렌드 차트**

키워드별 순위 추이. 기존 `local_rankings` 테이블에서 `scan_date` 기준 시계열 쿼리.

```typescript
// src/components/dashboard/ranking-trend.tsx
// Props: clientId, weeks: 4|8|12
// 쿼리: local_rankings WHERE client_id = ? ORDER BY scan_date
// Recharts LineChart: 키워드별 라인, X축 날짜, Y축 순위 (역순: 1위가 위)
```

- [ ] **Step 5: 리포트 히스토리 컴포넌트**

기존 `reports` 테이블에서 해당 거래처의 리포트 목록. 열기 + 재전송 버튼.

```typescript
// src/components/dashboard/report-history.tsx
// Props: reports: Report[]
// 리스트: 날짜 | 유형(주간/월간/스캔) | 📄 열기 | 📤 재전송
```

- [ ] **Step 5: 거래처 상세 페이지에 탭 추가**

기존 페이지에 SOP + 성과 트렌드 섹션 추가. 기존 리뷰/순위/경쟁사 탭은 유지.

```tsx
// 기존 탭: 리뷰 | 순위 | 경쟁사 | 키워드 | 업데이트 | 캘린더
// 추가: SOP (좌측 패널) + 트렌드 (우측 패널) + 리포트 (하단)
```

- [ ] **Step 6: 빌드 확인**

```bash
cd gbp-dashboard/app && npm run build
```

- [ ] **Step 7: 커밋**

```bash
git add src/components/dashboard/sop-checklist.tsx src/components/dashboard/health-trend.tsx src/components/dashboard/review-trend.tsx src/components/dashboard/report-history.tsx src/app/dashboard/clients/\[id\]/page.tsx
git commit -m "feat(ui): 거래처 상세 SOP 체크리스트 + 성과 트렌드 + 리포트 히스토리"
```

---

## Task 7: 사이드바 + 초기 데이터 세팅

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 사이드바 네비 정리**

메인 대시보드 링크가 "홈"으로, 기존 개별 페이지(리뷰, 순위 등)는 거래처 상세 안으로 이동했으므로 사이드바에서 정리.

```
홈 (메인 대시보드 — 액션+건강+요약)
거래처 (목록)
리드/파이프라인
스캔
설정
```

- [ ] **Step 2: 기존 11개 거래처에 SOP 초기 행 INSERT**

각 active 거래처마다 5개 초기 세팅 항목을 `sop_checklist`에 INSERT. 한 번만 실행하는 시드 스크립트 또는 API.

```typescript
// src/app/api/sop/seed/route.ts (1회용)
// 모든 active 거래처 × 5개 항목 = INSERT
```

- [ ] **Step 3: 빌드 확인 + 브라우저 테스트**

```bash
cd gbp-dashboard/app && npm run dev
```

브라우저에서 확인:
1. 메인 대시보드: 액션 리스트 + 건강 카드 + 주간 요약 렌더링
2. 거래처 카드 클릭 → 상세 페이지 SOP 탭 확인
3. SOP 체크박스 토글 → 점수 변동 확인

- [ ] **Step 4: 커밋**

```bash
git add src/components/layout/sidebar.tsx src/app/api/sop/seed/
git commit -m "feat: 사이드바 정리 + SOP 초기 데이터 시드"
```

---

## Task 8: 리포트 파이프라인 연동

**Files:**
- Modify: 리포트 전송 완료 시점의 파일 (구현 시 `src/app/api/cron/weekly-report/route.ts` 또는 `src/lib/reports/pptx-renderer.ts` 확인 필요)

- [ ] **Step 1: 리포트 생성 시 `sentAt` 기록**

기존 weekly-report Cron에서 텔레그램 전송 성공 시 `sentAt` 업데이트:

```typescript
// 기존 리포트 전송 로직 후:
await db.update(reports)
  .set({ sentAt: new Date() })
  .where(eq(reports.id, reportId));
```

- [ ] **Step 2: 커밋**

```bash
git add src/lib/reports/pptx-renderer.ts
git commit -m "feat: 리포트 전송 시 sentAt 기록"
```

---

## Task 9: 최종 통합 + 검증

- [ ] **Step 1: 전체 빌드 확인**

```bash
cd gbp-dashboard/app && npm run build
```

- [ ] **Step 2: 브라우저 E2E 검증**

1. 메인 대시보드 — 3단 구조 정상 렌더링
2. 액션 카드 클릭 → 거래처 상세 이동
3. SOP 체크 토글 → 건강 점수 반영
4. 건강 점수 트렌드 차트 표시
5. 리포트 히스토리 목록 표시
6. Cron `/api/cron/health` 수동 호출 → 점수 생성 확인

- [ ] **Step 3: 최종 커밋**

```bash
git commit -m "feat(gbp-dashboard): SOP 운영 대시보드 전면 재설계 완료"
```
