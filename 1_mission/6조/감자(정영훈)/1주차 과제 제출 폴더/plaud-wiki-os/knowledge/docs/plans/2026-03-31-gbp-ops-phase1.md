# GBP 운영 대시보드 Phase 1 — 구현 계획

> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. 이 문서는 아카이브 이력용으로 보존.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 gbp-dashboard에 스캔 이력/알림 센터/비용 트래커/빠른 조치 4개 운영 기능을 추가하여, 외부에서 GBP 자동화 상태를 확인하고 조치할 수 있게 한다.

**Architecture:** Vercel(Next.js)은 UI + API, Supabase는 공유 DB (기존 GBP 테이블 + 신규 ops 테이블), 서버 맥의 ops-agent.py가 명령 큐를 폴링하여 로컬 스크립트를 실행하고 결과를 DB에 기록한다.

**Tech Stack:** Next.js 15 (App Router), Drizzle ORM, Supabase (PostgreSQL), Python (ops-agent), shadcn/ui, Recharts

**Spec:** `docs/superpowers/specs/2026-03-31-gbp-ops-dashboard-design.md`

---

## 파일 구조

### 신규 파일

```
src/db/schema/scan-runs.ts          — scan_runs 테이블 Drizzle 스키마
src/db/schema/ops-commands.ts       — ops_commands 테이블 Drizzle 스키마
drizzle/0005_ops_tables.sql         — 마이그레이션 SQL
src/app/api/scans/route.ts          — GET 스캔 이력 조회
src/app/api/scans/balance/route.ts  — GET DataForSEO 잔액 (5분 캐시)
src/app/api/alerts/route.ts         — GET 알림 목록
src/app/api/alerts/[id]/route.ts    — PATCH 알림 읽음 처리
src/app/api/ops/scan/route.ts       — POST 수동 스캔 명령
src/app/api/ops/report/route.ts     — POST PPT 재생성 명령
src/app/api/ops/status/route.ts     — GET 명령 실행 상태 조회
src/app/dashboard/scans/page.tsx    — 스캔 이력 페이지 (서버 컴포넌트)
src/app/dashboard/scans/scans-page-client.tsx — 스캔 이력 클라이언트
src/lib/db/ops-queries.ts           — scan_runs, ops_commands 쿼리 함수
ops-agent/ops-agent.py              — 서버 맥 명령 폴링 에이전트
ops-agent/com.ourcompany.ops-agent.plist — launchd 설정
```

### 수정 파일

```
src/db/schema/notification-log.ts   — read_at, action_taken 컬럼 추가
src/db/schema/index.ts              — 신규 스키마 export 추가
scripts/scan-all.ts                 — scan_runs 기록 + 알림 생성 로직 추가
src/app/dashboard/alerts/alerts-page-client.tsx — 신규 알림 타입 + 읽음 처리 + 조치 버튼
src/app/dashboard/alerts/page.tsx   — 쿼리 수정 (미읽음 필터)
src/components/layout/sidebar.tsx   — 알림 배지 + 스캔 메뉴 추가
src/lib/notifications/formatter.ts  — 신규 알림 포맷 함수 추가
```

---

## Task 1: DB 스키마 — scan_runs, ops_commands 테이블

**Files:**
- Create: `src/db/schema/scan-runs.ts`
- Create: `src/db/schema/ops-commands.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: scan-runs.ts 작성**

```typescript
// src/db/schema/scan-runs.ts
import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const scanRuns = pgTable(
  "scan_runs",
  {
    id: serial("id").primaryKey(),
    hospitalName: text("hospital_name").notNull(),
    keywordsCount: integer("keywords_count"),
    successCount: integer("success_count"),
    failCount: integer("fail_count"),
    costUsd: numeric("cost_usd", { precision: 8, scale: 4 }),
    avgRank: numeric("avg_rank", { precision: 4, scale: 2 }),
    top3Pct: numeric("top3_pct", { precision: 5, scale: 2 }),
    triggeredBy: text("triggered_by").default("schedule"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("scan_runs_hospital_idx").on(table.hospitalName),
    index("scan_runs_started_at_idx").on(table.startedAt),
  ]
);
```

- [ ] **Step 2: ops-commands.ts 작성**

```typescript
// src/db/schema/ops-commands.ts
import {
  pgTable,
  serial,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const opsCommands = pgTable(
  "ops_commands",
  {
    id: serial("id").primaryKey(),
    command: text("command").notNull(),
    params: jsonb("params").default({}),
    status: text("status").default("pending"),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
  },
  (table) => [
    index("ops_commands_status_idx").on(table.status),
  ]
);
```

- [ ] **Step 3: index.ts에 export 추가**

`src/db/schema/index.ts` 끝에 추가:
```typescript
export * from './scan-runs';
export * from './ops-commands';
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/scan-runs.ts src/db/schema/ops-commands.ts src/db/schema/index.ts
git commit -m "feat(db): scan_runs, ops_commands Drizzle 스키마 추가"
```

---

## Task 2: notification_log 스키마 수정

**Files:**
- Modify: `src/db/schema/notification-log.ts`

- [ ] **Step 1: read_at, actionTaken 컬럼 추가**

`notification-log.ts`의 테이블 정의에 2개 컬럼 추가:

```typescript
// 기존 isSuccess 아래에 추가
readAt: timestamp("read_at", { withTimezone: true }),
actionTaken: text("action_taken"),
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema/notification-log.ts
git commit -m "feat(db): notification_log에 read_at, action_taken 컬럼 추가"
```

---

## Task 3: DB 마이그레이션 생성 및 적용

**Files:**
- Create: `drizzle/0005_ops_tables.sql`

- [ ] **Step 1: 마이그레이션 SQL 생성**

```bash
cd gbp-dashboard/app
npx drizzle-kit generate
```

생성된 SQL 파일명을 `0005_ops_tables.sql`로 확인.

- [ ] **Step 2: 마이그레이션 적용**

```bash
npx drizzle-kit push
```

Expected: `scan_runs`, `ops_commands` 테이블 생성 + `notification_log`에 `read_at`, `action_taken` 컬럼 추가.

- [ ] **Step 3: 적용 확인**

```bash
npx drizzle-kit studio
```

Drizzle Studio에서 3개 테이블 변경 확인 후 종료.

- [ ] **Step 4: Commit**

```bash
git add drizzle/
git commit -m "feat(db): ops_tables 마이그레이션 (scan_runs, ops_commands, notification_log 수정)"
```

---

## Task 4: 쿼리 함수 — ops-queries.ts

**Files:**
- Create: `src/lib/db/ops-queries.ts`

- [ ] **Step 1: 쿼리 함수 작성**

```typescript
// src/lib/db/ops-queries.ts
import { db } from "@/db";
import { scanRuns, opsCommands, notificationLog } from "@/db/schema";
import { desc, eq, sql, and, isNull } from "drizzle-orm";

// ── scan_runs ──

export async function getScanHistory(limit = 30) {
  return db
    .select()
    .from(scanRuns)
    .orderBy(desc(scanRuns.startedAt))
    .limit(limit);
}

export async function insertScanRun(data: {
  hospitalName: string;
  keywordsCount: number;
  triggeredBy?: string;
  startedAt: Date;
}) {
  const [row] = await db
    .insert(scanRuns)
    .values(data)
    .returning({ id: scanRuns.id });
  return row.id;
}

export async function completeScanRun(
  id: number,
  data: {
    successCount: number;
    failCount: number;
    costUsd: string;
    avgRank: string;
    top3Pct: string;
    completedAt: Date;
    errorMessage?: string;
  }
) {
  await db.update(scanRuns).set(data).where(eq(scanRuns.id, id));
}

// ── ops_commands ──

export async function createOpsCommand(command: string, params: Record<string, unknown> = {}) {
  const [row] = await db
    .insert(opsCommands)
    .values({ command, params })
    .returning({ id: opsCommands.id });
  return row.id;
}

export async function getOpsCommandStatus(id: number) {
  const [row] = await db
    .select()
    .from(opsCommands)
    .where(eq(opsCommands.id, id));
  return row ?? null;
}

// ── notification_log (확장) ──

export async function getUnreadAlertCount() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationLog)
    .where(isNull(notificationLog.readAt));
  return row?.count ?? 0;
}

export async function getAlerts(limit = 50) {
  return db
    .select()
    .from(notificationLog)
    .orderBy(desc(notificationLog.sentAt))
    .limit(limit);
}

export async function markAlertRead(id: string, actionTaken?: string) {
  await db
    .update(notificationLog)
    .set({
      readAt: new Date(),
      ...(actionTaken ? { actionTaken } : {}),
    })
    .where(eq(notificationLog.id, id));
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/db/ops-queries.ts
git commit -m "feat: ops 쿼리 함수 (scan_runs, ops_commands, alerts)"
```

---

## Task 5: scan-all.ts 수정 — DB 기록 + 알림 생성

**Files:**
- Modify: `scripts/scan-all.ts`

- [ ] **Step 1: Supabase 연결 + scan_runs 기록 로직 추가**

`scan-all.ts` 상단에 import 추가:

```typescript
import postgres from "postgres";
```

main() 함수 안에서 각 병원 스캔 시작/완료 시점에 DB 기록 추가. `postgres` 패키지로 직접 연결 (Drizzle ORM은 Next.js 런타임용이므로 스크립트에서는 직접 SQL 사용).

```typescript
// main() 시작 부분에 추가
const dbUrl = process.env.DATABASE_URL;
const pgClient = dbUrl ? postgres(dbUrl) : null;

// 각 병원 루프 시작에 추가
let scanRunId: number | null = null;
if (pgClient) {
  const [row] = await pgClient`
    INSERT INTO scan_runs (hospital_name, keywords_count, triggered_by, started_at)
    VALUES (${hospital.name}, ${keywords.length}, ${hospitalFilter ? 'manual' : 'schedule'}, ${new Date()})
    RETURNING id
  `;
  scanRunId = row.id;
}

// 각 병원 루프 끝에 추가 (results 집계 후)
if (pgClient && scanRunId) {
  const avgRank = results.length > 0
    ? (results.reduce((s, r) => s + r.arp, 0) / results.length).toFixed(2)
    : null;
  const avgTop3 = results.length > 0
    ? (results.reduce((s, r) => s + r.solv, 0) / results.length).toFixed(2)
    : null;

  await pgClient`
    UPDATE scan_runs SET
      success_count = ${scanned},
      fail_count = ${failed},
      cost_usd = ${(results.length * 25 * 0.0004).toFixed(4)},
      avg_rank = ${avgRank},
      top3_pct = ${avgTop3},
      completed_at = ${new Date()}
    WHERE id = ${scanRunId}
  `;
}

// main() 끝에 추가
if (pgClient) await pgClient.end();
```

- [ ] **Step 2: 순위 하락 감지 + 알림 기록**

각 키워드 스캔 후 이전 결과와 비교하여 순위 하락 시 알림 기록:

```typescript
// 키워드 스캔 성공 직후 (updateKeywordResult 호출 후)에 추가
if (pgClient && result.arp > 3 && result.solv < 50) {
  await pgClient`
    INSERT INTO notification_log (id, channel, event_type, message, sent_at, is_success)
    VALUES (
      gen_random_uuid(),
      'dashboard',
      'rank_drop',
      ${`${hospital.name} — "${kw.keyword}" 평균 ${result.arp}위, Top3 ${result.solv}%`},
      ${new Date()},
      true
    )
  `;
}
```

- [ ] **Step 3: 잔액 부족 알림**

main() 끝 부분, 최종 잔액 체크 후:

```typescript
if (pgClient) {
  const balanceResult = await checkBalance();
  // checkBalance()가 콘솔에만 출력하므로, 별도로 API 호출
  const authHeader = "Basic " + Buffer.from(
    `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
  ).toString("base64");
  const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
  });
  const json = await res.json();
  const balance = json?.tasks?.[0]?.result?.[0]?.money?.balance ?? 0;

  if (balance < 0.5) {
    await pgClient`
      INSERT INTO notification_log (id, channel, event_type, message, sent_at, is_success)
      VALUES (
        gen_random_uuid(),
        'dashboard',
        'balance_low',
        ${`DataForSEO 잔액 부족: $${balance.toFixed(2)}`},
        ${new Date()},
        true
      )
    `;
  }
}
```

- [ ] **Step 4: 테스트 실행**

```bash
cd gbp-dashboard/app
npx tsx scripts/scan-all.ts --hospital "협조병원1"
```

Expected: 스캔 완료 + Supabase `scan_runs`에 1행 추가 확인.

- [ ] **Step 5: Commit**

```bash
git add scripts/scan-all.ts
git commit -m "feat: scan-all.ts DB 기록 + 순위하락/잔액부족 알림 생성"
```

---

## Task 6: API Routes — 스캔 이력 + 잔액

**Files:**
- Create: `src/app/api/scans/route.ts`
- Create: `src/app/api/scans/balance/route.ts`

- [ ] **Step 1: GET /api/scans**

```typescript
// src/app/api/scans/route.ts
import { NextResponse } from "next/server";
import { getScanHistory } from "@/lib/db/ops-queries";

export async function GET() {
  const scans = await getScanHistory(50);
  return NextResponse.json({ success: true, data: scans });
}
```

- [ ] **Step 2: GET /api/scans/balance (5분 캐시)**

```typescript
// src/app/api/scans/balance/route.ts
import { NextResponse } from "next/server";

let cachedBalance: { value: number; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5분

export async function GET() {
  if (cachedBalance && Date.now() - cachedBalance.fetchedAt < CACHE_TTL) {
    return NextResponse.json({ success: true, data: { balance: cachedBalance.value, cached: true } });
  }

  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    return NextResponse.json({ success: false, error: "DataForSEO 인증 정보 없음" }, { status: 500 });
  }

  const authHeader = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
  const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
  });
  const json = await res.json();
  const balance = json?.tasks?.[0]?.result?.[0]?.money?.balance ?? 0;

  cachedBalance = { value: balance, fetchedAt: Date.now() };
  return NextResponse.json({ success: true, data: { balance, cached: false } });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scans/
git commit -m "feat(api): GET /api/scans, GET /api/scans/balance"
```

---

## Task 7: API Routes — 알림

**Files:**
- Create: `src/app/api/alerts/route.ts`
- Create: `src/app/api/alerts/[id]/route.ts`

- [ ] **Step 1: GET /api/alerts**

```typescript
// src/app/api/alerts/route.ts
import { NextResponse } from "next/server";
import { getAlerts, getUnreadAlertCount } from "@/lib/db/ops-queries";

export async function GET() {
  const [alerts, unreadCount] = await Promise.all([
    getAlerts(50),
    getUnreadAlertCount(),
  ]);
  return NextResponse.json({ success: true, data: { alerts, unreadCount } });
}
```

- [ ] **Step 2: PATCH /api/alerts/[id]**

```typescript
// src/app/api/alerts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { markAlertRead } from "@/lib/db/ops-queries";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  await markAlertRead(id, body.actionTaken);
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/alerts/
git commit -m "feat(api): GET /api/alerts, PATCH /api/alerts/[id]"
```

---

## Task 8: API Routes — 빠른 조치 (ops)

**Files:**
- Create: `src/app/api/ops/scan/route.ts`
- Create: `src/app/api/ops/report/route.ts`
- Create: `src/app/api/ops/status/route.ts`

- [ ] **Step 1: POST /api/ops/scan**

```typescript
// src/app/api/ops/scan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOpsCommand } from "@/lib/db/ops-queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const hospital = body.hospital;
  if (!hospital) {
    return NextResponse.json({ success: false, error: "hospital 필수" }, { status: 400 });
  }
  const id = await createOpsCommand("scan", { hospital });
  return NextResponse.json({ success: true, data: { commandId: id } });
}
```

- [ ] **Step 2: POST /api/ops/report**

```typescript
// src/app/api/ops/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createOpsCommand } from "@/lib/db/ops-queries";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const hospital = body.hospital;
  if (!hospital) {
    return NextResponse.json({ success: false, error: "hospital 필수" }, { status: 400 });
  }
  const id = await createOpsCommand("report", { hospital });
  return NextResponse.json({ success: true, data: { commandId: id } });
}
```

- [ ] **Step 3: GET /api/ops/status**

```typescript
// src/app/api/ops/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getOpsCommandStatus } from "@/lib/db/ops-queries";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, error: "id 필수" }, { status: 400 });
  }
  const command = await getOpsCommandStatus(Number(id));
  if (!command) {
    return NextResponse.json({ success: false, error: "명령 없음" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: command });
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ops/
git commit -m "feat(api): POST /api/ops/scan, POST /api/ops/report, GET /api/ops/status"
```

---

## Task 9: 스캔 이력 페이지 UI

**Files:**
- Create: `src/app/dashboard/scans/page.tsx`
- Create: `src/app/dashboard/scans/scans-page-client.tsx`

- [ ] **Step 1: 서버 컴포넌트 (page.tsx)**

```typescript
// src/app/dashboard/scans/page.tsx
export const dynamic = "force-dynamic";

import { getScanHistory } from "@/lib/db/ops-queries";
import { ScansPageClient } from "./scans-page-client";

export default async function ScansPage() {
  const scans = await getScanHistory(50);
  return <ScansPageClient scans={scans} />;
}
```

- [ ] **Step 2: 클라이언트 컴포넌트 (scans-page-client.tsx)**

스캔 이력 테이블 + 잔액 카드 + 수동 스캔 버튼을 포함하는 클라이언트 컴포넌트.

핵심 요소:
- 상단: DataForSEO 잔액 카드 (`/api/scans/balance` fetch)
- 중단: 스캔 이력 테이블 (병원명, 키워드 수, 성공/실패, 비용, 평균 순위, Top3%, 시작 시각, 트리거)
- 하단: 수동 스캔 버튼 (병원명 입력 → `POST /api/ops/scan` → 상태 폴링)

shadcn/ui 컴포넌트 사용: Table, Badge, Button, Input, Card.

- [ ] **Step 3: 빌드 확인**

```bash
cd gbp-dashboard/app
npm run build
```

Expected: 빌드 성공.

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/scans/
git commit -m "feat(ui): 스캔 이력 페이지 + 잔액 카드 + 수동 스캔"
```

---

## Task 10: 알림 센터 페이지 개선

**Files:**
- Modify: `src/app/dashboard/alerts/alerts-page-client.tsx`
- Modify: `src/app/dashboard/alerts/page.tsx`

- [ ] **Step 1: 알림 타입 배지 확장**

`alerts-page-client.tsx`의 `eventTypeBadge()` 함수에 추가:

```typescript
case "rank_drop":
  return <Badge variant="destructive">순위 하락</Badge>;
case "scan_failed":
  return <Badge variant="destructive">스캔 실패</Badge>;
case "balance_low":
  return <Badge className="bg-amber-600">잔액 부족</Badge>;
```

- [ ] **Step 2: 읽음 처리 + 조치 버튼 추가**

`NotificationRow` 인터페이스에 추가:
```typescript
readAt: Date | null;
actionTaken: string | null;
```

각 행에 "읽음 처리" 버튼 추가. 클릭 시 `PATCH /api/alerts/[id]` 호출.
알림 타입별 조치 버튼:
- `rank_drop` → "상세 보기" (해당 병원 랭킹 페이지로 링크)
- `scan_failed` → "재실행" (`POST /api/ops/scan`)
- `balance_low` → "충전" (DataForSEO 결제 페이지 외부 링크)

- [ ] **Step 3: 미읽음 필터 토글**

상단에 "미읽음만" 토글 추가. `readAt === null`인 알림만 필터.

- [ ] **Step 4: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/alerts/
git commit -m "feat(ui): 알림 센터 — 순위하락/스캔실패/잔액부족 타입 + 읽음 처리 + 조치 버튼"
```

---

## Task 11: 사이드바 — 스캔 메뉴 + 알림 배지

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: navItems에 스캔 추가**

```typescript
const navItems = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/dashboard/clients", label: "병원 관리" },
  { href: "/dashboard/reviews", label: "리뷰 모니터링" },
  { href: "/dashboard/rankings", label: "순위 추적" },
  { href: "/dashboard/scans", label: "스캔 이력" },  // 추가
  { href: "/dashboard/keywords", label: "키워드 리서치" },
  { href: "/dashboard/reports", label: "보고서" },
  { href: "/dashboard/alerts", label: "알림" },
  { href: "/dashboard/settings", label: "설정" },
];
```

- [ ] **Step 2: 알림 배지 (미읽음 수)**

`Sidebar` 컴포넌트에서 `/api/alerts` fetch하여 `unreadCount`를 가져오고, "알림" 메뉴 옆에 배지 표시.

```typescript
// 알림 메뉴 라벨 옆에 조건부 배지
{item.href === "/dashboard/alerts" && unreadCount > 0 && (
  <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-5 text-center">
    {unreadCount}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(ui): 사이드바에 스캔 이력 메뉴 + 알림 배지 추가"
```

---

## Task 12: ops-agent.py — 서버 맥 명령 폴링 에이전트

**Files:**
- Create: `ops-agent/ops-agent.py`
- Create: `ops-agent/com.ourcompany.ops-agent.plist`

- [ ] **Step 1: ops-agent.py 작성**

```python
#!/usr/bin/env python3
"""
서버 맥 ops 에이전트 — Supabase ops_commands 폴링 → 로컬 스크립트 실행
"""
import os
import json
import time
import subprocess
import urllib.request
from datetime import datetime, timezone

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
GBP_APP_DIR = os.path.expanduser("~/Desktop/claude code/gbp-dashboard/app")
POLL_INTERVAL = 30  # 초

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def supabase_request(method, path, body=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())


def claim_pending_command():
    """pending 명령 1개를 원자적으로 running으로 변경하고 가져온다."""
    try:
        # status=pending인 가장 오래된 1건을 running으로 변경
        result = supabase_request(
            "PATCH",
            "ops_commands?status=eq.pending&order=created_at.asc&limit=1",
            {"status": "running", "executed_at": datetime.now(timezone.utc).isoformat()},
        )
        return result[0] if result else None
    except Exception:
        return None


def execute_command(cmd):
    """명령 실행 후 결과 반환."""
    command = cmd["command"]
    params = cmd.get("params", {})

    try:
        if command == "scan":
            hospital = params.get("hospital", "")
            result = subprocess.run(
                ["npx", "tsx", "scripts/scan-all.ts", "--hospital", hospital],
                cwd=GBP_APP_DIR,
                capture_output=True,
                text=True,
                timeout=600,
            )
            return {
                "status": "done" if result.returncode == 0 else "failed",
                "result": {"stdout": result.stdout[-2000:], "stderr": result.stderr[-500:]},
            }

        elif command == "report":
            hospital = params.get("hospital", "")
            result = subprocess.run(
                ["npx", "tsx", "scripts/scan-all.ts", "--hospital", hospital, "--no-report"],
                cwd=GBP_APP_DIR,
                capture_output=True,
                text=True,
                timeout=600,
            )
            return {
                "status": "done" if result.returncode == 0 else "failed",
                "result": {"stdout": result.stdout[-2000:], "stderr": result.stderr[-500:]},
            }

        else:
            return {"status": "failed", "result": {"error": f"알 수 없는 명령: {command}"}}

    except subprocess.TimeoutExpired:
        return {"status": "failed", "result": {"error": "실행 시간 초과 (10분)"}}
    except Exception as e:
        return {"status": "failed", "result": {"error": str(e)}}


def update_command_result(cmd_id, status, result):
    supabase_request(
        "PATCH",
        f"ops_commands?id=eq.{cmd_id}",
        {"status": status, "result": result},
    )


def main():
    print(f"ops-agent 시작 — 폴링 간격 {POLL_INTERVAL}초")
    while True:
        cmd = claim_pending_command()
        if cmd:
            print(f"[{datetime.now():%H:%M:%S}] 명령 수령: {cmd['command']} (id={cmd['id']})")
            outcome = execute_command(cmd)
            update_command_result(cmd["id"], outcome["status"], outcome["result"])
            print(f"[{datetime.now():%H:%M:%S}] 완료: {outcome['status']}")
        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: launchd plist 작성**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ourcompany.ops-agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/python3</string>
        <string>/Users/user/Desktop/project/ops-agent/ops-agent.py</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>SUPABASE_URL</key>
        <string>https://zewudvxuavpyxicybqud.supabase.co</string>
        <key>SUPABASE_SERVICE_KEY</key>
        <string>YOUR_SERVICE_KEY_HERE</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/ops-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/ops-agent-error.log</string>
</dict>
</plist>
```

> ⚠️ `SUPABASE_SERVICE_KEY`는 사용자가 Supabase 대시보드에서 복사해서 넣어야 함.

- [ ] **Step 3: Commit**

```bash
git add ops-agent/
git commit -m "feat: ops-agent.py — Supabase 명령 폴링 + 로컬 스크립트 실행 에이전트"
```

---

## Task 13: 통합 테스트

- [ ] **Step 1: 대시보드 빌드 + 로컬 실행**

```bash
cd gbp-dashboard/app
npm run build && npm run dev
```

브라우저에서 `http://localhost:3000/dashboard/scans` 접속 확인.

- [ ] **Step 2: 수동 스캔 테스트**

대시보드에서 수동 스캔 버튼 → 병원명 "협조병원1" 입력 → 명령 생성 확인.
Supabase `ops_commands` 테이블에 pending 레코드 생성 확인.

- [ ] **Step 3: ops-agent 실행 테스트**

```bash
cd ops-agent
SUPABASE_URL=https://zewudvxuavpyxicybqud.supabase.co \
SUPABASE_SERVICE_KEY=YOUR_KEY \
python3 ops-agent.py
```

30초 내에 명령을 수령하고 스캔 실행 확인. `scan_runs`에 결과 기록 확인.

- [ ] **Step 4: 알림 확인**

스캔 완료 후 `notification_log`에 알림 기록 확인.
대시보드 `/dashboard/alerts`에서 새 알림 표시 확인.
사이드바 알림 배지에 미읽음 수 표시 확인.

- [ ] **Step 5: 읽음 처리 테스트**

알림 "읽음 처리" 버튼 클릭 → `read_at` 업데이트 확인.
배지 수 감소 확인.

- [ ] **Step 6: 최종 Commit**

```bash
git add -A
git commit -m "feat: GBP 운영 대시보드 Phase 1 완료 — 스캔 이력 + 알림 센터 + 비용 트래커 + 빠른 조치"
```
