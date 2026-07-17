# Marketing Dashboard Implementation Plan

> NOTE 2026-05-03 — gbp-dashboard 폐기됨. 이 플랜의 "GBP 대시보드와 동일 패턴 사용" 참조는 유효하지 않음. 이 문서는 아카이브 이력용으로 보존.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5개 마케팅 채널(LinkedIn, Newsletter, Threads, Instagram, Meta Ads)의 콘텐츠와 성과를 통합 관리하는 내부 대시보드 구축

**Architecture:** 독립 Next.js 프로젝트(`marketing-dashboard/`)가 Supabase 공유 DB에서 SELECT. 각 Python 엔진이 Supabase에 직접 INSERT. GBP 대시보드와 동일 스택(Drizzle+shadcn+Recharts), 동일 인증(쿠키).

**Tech Stack:** Next.js (latest, App Router), shadcn/ui v4, Tailwind CSS 4, Drizzle ORM 0.45, Supabase PostgreSQL, Recharts 3, Zod 4, Vercel

**Spec:** `docs/superpowers/specs/2026-04-06-marketing-dashboard-design.md`

**Reference:** GBP 대시보드 (`gbp-dashboard/app/`) — 패턴 복사 대상

---

## File Map

```
marketing-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 — 루트 레이아웃 (Geist 폰트, globals.css)
│   │   ├── page.tsx                   — / → /dashboard 리다이렉트
│   │   ├── globals.css                — Tailwind v4 테마 + 채널 컬러
│   │   ├── login/page.tsx             — 비밀번호 로그인
│   │   ├── api/auth/route.ts          — POST 비밀번호 검증 → 쿠키 세팅
│   │   ├── api/contents/route.ts      — GET 콘텐츠 목록, PATCH 수정
│   │   ├── api/contents/[id]/route.ts — PATCH 개별 콘텐츠 수정
│   │   ├── api/metrics/route.ts       — GET 메트릭 조회 (채널/기간 필터)
│   │   ├── api/kpi/route.ts           — GET KPI 집계
│   │   ├── api/campaigns/route.ts     — GET Meta Ads 캠페인 목록
│   │   └── dashboard/
│   │       ├── layout.tsx             — 대시보드 공통 레이아웃 (탭 네비게이션)
│   │       ├── page.tsx               — Overview (KPI + 큐 + 차트)
│   │       ├── linkedin/page.tsx
│   │       ├── newsletter/page.tsx
│   │       ├── threads/page.tsx
│   │       ├── instagram/page.tsx
│   │       └── ads/page.tsx
│   ├── components/
│   │   ├── ui/                        — shadcn 컴포넌트 (button, card, dialog, table 등)
│   │   ├── kpi-cards.tsx              — 상단 KPI 4개 카드
│   │   ├── content-queue.tsx          — 콘텐츠 큐 목록
│   │   ├── content-editor.tsx         — 수정 모달 (body + scheduled_at)
│   │   ├── channel-chart.tsx          — 채널별 성과 바 차트
│   │   ├── channel-nav.tsx            — 탭 네비게이션
│   │   ├── period-filter.tsx          — 7일/30일/90일 필터
│   │   ├── content-table.tsx          — 발행 이력 테이블 (채널별 재사용)
│   │   └── follower-chart.tsx         — 팔로워 추이 라인 차트
│   ├── db/
│   │   ├── index.ts                   — Drizzle 클라이언트
│   │   ├── schema/
│   │   │   ├── index.ts               — 전체 export
│   │   │   ├── contents.ts            — mkt_contents 테이블
│   │   │   ├── metrics.ts             — mkt_metrics 테이블
│   │   │   ├── channel-stats.ts       — mkt_channel_stats 테이블
│   │   │   ├── ad-campaigns.ts        — mkt_ad_campaigns 테이블
│   │   │   └── ad-daily.ts            — mkt_ad_daily 테이블
│   │   └── queries/
│   │       ├── contents.ts            — 콘텐츠 CRUD
│   │       ├── metrics.ts             — 메트릭 조회
│   │       ├── kpi.ts                 — KPI 집계 쿼리
│   │       └── campaigns.ts           — 캠페인 조회
│   ├── lib/
│   │   ├── env.ts                     — Zod 환경변수 검증
│   │   ├── constants.ts               — 채널 enum, 컬러코드, 리드 추정가치
│   │   └── utils.ts                   — 포맷팅 유틸
│   └── middleware.ts                  — mkt_auth 쿠키 인증
├── drizzle.config.ts
├── package.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── .env
├── CLAUDE.md
└── .gitignore
```

---

## Task 1: 프로젝트 스캐폴드

**Files:**
- Create: `marketing-dashboard/package.json`
- Create: `marketing-dashboard/next.config.ts`
- Create: `marketing-dashboard/tsconfig.json`
- Create: `marketing-dashboard/postcss.config.mjs`
- Create: `marketing-dashboard/drizzle.config.ts`
- Create: `marketing-dashboard/.gitignore`
- Create: `marketing-dashboard/.env`
- Create: `marketing-dashboard/CLAUDE.md`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd /Users/user/Desktop/claude\ code
npx create-next-app@latest marketing-dashboard \
  --typescript --tailwind --eslint --app --src-dir \
  --no-import-alias --turbopack
```

- [ ] **Step 2: 핵심 의존성 설치**

```bash
cd marketing-dashboard
npm install drizzle-orm postgres recharts zod @radix-ui/react-dialog @radix-ui/react-slot class-variance-authority clsx tailwind-merge lucide-react
npm install -D drizzle-kit
```

- [ ] **Step 3: shadcn/ui 초기화 + 컴포넌트 설치**

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog input label table tabs select textarea badge
```

- [ ] **Step 4: drizzle.config.ts 작성**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

- [ ] **Step 5: .env 작성**

```
DATABASE_URL=postgresql://...supabase-connection-string...
ADMIN_PASSWORD=...
```

GBP 대시보드의 DATABASE_URL과 동일한 Supabase 인스턴스 사용.

- [ ] **Step 6: postcss.config.mjs 확인**

GBP 대시보드와 동일하게 `@tailwindcss/postcss` 플러그인만 사용하는지 확인.

- [ ] **Step 7: CLAUDE.md 작성**

프로젝트 개요, 기술 스택, 도메인 용어, 파일 구조 설명 포함.

- [ ] **Step 8: next.config.ts 설정**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
};

export default nextConfig;
```

- [ ] **Step 9: 빌드 확인**

```bash
npm run build
```
Expected: 빌드 성공

- [ ] **Step 10: 커밋**

```bash
git add marketing-dashboard/
git commit -m "feat(marketing-dashboard): 프로젝트 스캐폴드 — Next.js + shadcn + Drizzle"
```

---

## Task 2: DB 스키마 + 마이그레이션

**Files:**
- Create: `marketing-dashboard/src/db/index.ts`
- Create: `marketing-dashboard/src/db/schema/contents.ts`
- Create: `marketing-dashboard/src/db/schema/metrics.ts`
- Create: `marketing-dashboard/src/db/schema/channel-stats.ts`
- Create: `marketing-dashboard/src/db/schema/ad-campaigns.ts`
- Create: `marketing-dashboard/src/db/schema/ad-daily.ts`
- Create: `marketing-dashboard/src/db/schema/index.ts`
- Create: `marketing-dashboard/src/lib/env.ts`
- Create: `marketing-dashboard/src/lib/constants.ts`

- [ ] **Step 1: env.ts — 환경변수 검증**

```typescript
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  ADMIN_PASSWORD: z.string().min(1).default("changeme"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten());
  process.exit(1);
}

export const env = parsed.data;
```

- [ ] **Step 2: constants.ts — 채널 enum + 컬러 코드**

```typescript
export const CHANNELS = ["linkedin", "newsletter", "threads", "instagram", "meta_ads"] as const;
export type Channel = (typeof CHANNELS)[number];

export const CONTENT_STATUSES = ["draft", "queued", "published", "failed"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CHANNEL_COLORS: Record<Channel, string> = {
  linkedin: "#0077b5",
  newsletter: "#ff6b35",
  threads: "#000000",
  instagram: "#e1306c",
  meta_ads: "#1877f2",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  linkedin: "LinkedIn",
  newsletter: "Newsletter",
  threads: "Threads",
  instagram: "Instagram",
  meta_ads: "Meta Ads",
};

export const LEAD_VALUE_KRW = 50_000; // 리드당 추정가치 초기값
```

- [ ] **Step 3: db/index.ts — Drizzle 클라이언트**

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

- [ ] **Step 4: schema/contents.ts**

```typescript
import { pgTable, uuid, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const channelEnum = pgEnum("mkt_channel", [
  "linkedin", "newsletter", "threads", "instagram", "meta_ads",
]);

export const contentStatusEnum = pgEnum("mkt_content_status", [
  "draft", "queued", "published", "failed",
]);

export const mktContents = pgTable("mkt_contents", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: channelEnum("channel").notNull(),
  sourceScript: text("source_script"),
  title: text("title").notNull(),
  body: text("body").notNull(),
  status: contentStatusEnum("status").notNull().default("draft"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 5: schema/metrics.ts**

```typescript
import { pgTable, uuid, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { channelEnum, mktContents } from "./contents";

export const mktMetrics = pgTable("mkt_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentId: uuid("content_id").references(() => mktContents.id).notNull(),
  channel: channelEnum("channel").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  likes: integer("likes").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  shares: integer("shares").default(0).notNull(),
  saves: integer("saves").default(0).notNull(),
  followersDelta: integer("followers_delta").default(0).notNull(),
  extra: jsonb("extra"),
});
```

- [ ] **Step 6: schema/channel-stats.ts**

```typescript
import { pgTable, uuid, date, integer, jsonb } from "drizzle-orm/pg-core";
import { channelEnum } from "./contents";

export const mktChannelStats = pgTable("mkt_channel_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  channel: channelEnum("channel").notNull(),
  date: date("date").notNull(),
  totalImpressions: integer("total_impressions").default(0).notNull(),
  totalClicks: integer("total_clicks").default(0).notNull(),
  totalSpend: integer("total_spend").default(0).notNull(),
  totalConversions: integer("total_conversions").default(0).notNull(),
  followersCount: integer("followers_count").default(0).notNull(),
  extra: jsonb("extra"),
});
```

- [ ] **Step 7: schema/ad-campaigns.ts**

```typescript
import { pgTable, uuid, text, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

export const adStatusEnum = pgEnum("mkt_ad_status", ["active", "paused", "completed"]);

export const mktAdCampaigns = pgTable("mkt_ad_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: text("campaign_id").notNull().unique(),
  campaignName: text("campaign_name").notNull(),
  status: adStatusEnum("status").notNull().default("active"),
  budgetDaily: integer("budget_daily").default(0).notNull(),
  spendTotal: integer("spend_total").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  ctr: numeric("ctr"),
  cpc: integer("cpc").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  roas: numeric("roas"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 8: schema/ad-daily.ts**

```typescript
import { pgTable, uuid, text, date, integer, numeric } from "drizzle-orm/pg-core";
import { mktAdCampaigns } from "./ad-campaigns";

export const mktAdDaily = pgTable("mkt_ad_daily", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignId: text("campaign_id").references(() => mktAdCampaigns.campaignId).notNull(),
  date: date("date").notNull(),
  spend: integer("spend").default(0).notNull(),
  impressions: integer("impressions").default(0).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  conversions: integer("conversions").default(0).notNull(),
  conversionValue: integer("conversion_value").default(0).notNull(),
  ctr: numeric("ctr"),
  cpc: integer("cpc").default(0).notNull(),
  roas: numeric("roas"),
});
```

- [ ] **Step 9: schema/index.ts — 전체 export**

```typescript
export * from "./contents";
export * from "./metrics";
export * from "./channel-stats";
export * from "./ad-campaigns";
export * from "./ad-daily";
```

- [ ] **Step 10: Drizzle 마이그레이션 생성 + 실행**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

Expected: 5개 테이블 + 3개 enum 생성

- [ ] **Step 11: 커밋**

```bash
git add marketing-dashboard/src/db/ marketing-dashboard/src/lib/ marketing-dashboard/drizzle/
git commit -m "feat(marketing-dashboard): DB 스키마 5테이블 + Drizzle 마이그레이션"
```

---

## Task 3: 인증 (미들웨어 + 로그인)

**Files:**
- Create: `marketing-dashboard/src/middleware.ts`
- Create: `marketing-dashboard/src/app/login/page.tsx`
- Create: `marketing-dashboard/src/app/api/auth/route.ts`
- Create: `marketing-dashboard/src/app/page.tsx`

- [ ] **Step 1: middleware.ts — 쿠키 인증**

GBP 대시보드 `gbp-dashboard/app/src/middleware.ts` 패턴 복사. 쿠키 이름만 `mkt_auth`로 변경.

```typescript
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "mkt_auth";
const LOGIN_PATH = "/login";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api") || pathname.startsWith("/dashboard")) {
    const authCookie = request.cookies.get(COOKIE_NAME);
    if (!authCookie?.value) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }
      const loginUrl = new URL(LOGIN_PATH, request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
```

- [ ] **Step 2: api/auth/route.ts — 비밀번호 검증**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  if (password !== env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("mkt_auth", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30일
  });

  return response;
}
```

- [ ] **Step 3: login/page.tsx — 로그인 폼**

GBP 대시보드 로그인 패턴 참고. shadcn Card + Input + Button 사용.

- [ ] **Step 4: page.tsx — 루트 리다이렉트**

```typescript
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
```

- [ ] **Step 5: 로그인 플로우 수동 테스트**

```bash
npm run dev
```

브라우저에서:
1. `localhost:3000` → `/login`으로 리다이렉트 확인
2. 비밀번호 입력 → `/dashboard`로 이동 확인
3. 쿠키 삭제 후 `/dashboard` 접근 → `/login` 리다이렉트 확인

- [ ] **Step 6: 커밋**

```bash
git add marketing-dashboard/src/middleware.ts marketing-dashboard/src/app/
git commit -m "feat(marketing-dashboard): 쿠키 인증 + 로그인 페이지"
```

---

## Task 4: DB 쿼리 레이어

**Files:**
- Create: `marketing-dashboard/src/db/queries/contents.ts`
- Create: `marketing-dashboard/src/db/queries/metrics.ts`
- Create: `marketing-dashboard/src/db/queries/kpi.ts`
- Create: `marketing-dashboard/src/db/queries/campaigns.ts`

- [ ] **Step 1: queries/contents.ts**

```typescript
import { db } from "@/db";
import { mktContents } from "@/db/schema";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import type { Channel, ContentStatus } from "@/lib/constants";

// 콘텐츠 큐 (다음 7일, status: draft|queued)
export async function getContentQueue() {
  const now = new Date();
  const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return db.select().from(mktContents)
    .where(and(
      gte(mktContents.scheduledAt, now),
      lte(mktContents.scheduledAt, weekLater),
    ))
    .orderBy(asc(mktContents.scheduledAt));
}

// 채널별 발행 이력
export async function getContentsByChannel(channel: Channel, limit = 50) {
  return db.select().from(mktContents)
    .where(eq(mktContents.channel, channel))
    .orderBy(desc(mktContents.createdAt))
    .limit(limit);
}

// 콘텐츠 수정 (body + scheduledAt)
export async function updateContent(id: string, data: { body?: string; scheduledAt?: Date }) {
  return db.update(mktContents)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(mktContents.id, id))
    .returning();
}
```

- [ ] **Step 2: queries/metrics.ts**

```typescript
import { db } from "@/db";
import { mktMetrics, mktChannelStats } from "@/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import type { Channel } from "@/lib/constants";

// 콘텐츠별 최신 메트릭
export async function getLatestMetrics(contentId: string) {
  return db.select().from(mktMetrics)
    .where(eq(mktMetrics.contentId, contentId))
    .orderBy(desc(mktMetrics.fetchedAt))
    .limit(1);
}

// 전 채널 일간 통계 (Overview용)
export async function getAllChannelStats(since: Date) {
  return db.select().from(mktChannelStats)
    .where(gte(mktChannelStats.date, since.toISOString().split("T")[0]))
    .orderBy(desc(mktChannelStats.date));
}

// 채널별 일간 통계 (기간 필터)
export async function getChannelStats(channel: Channel, since: Date) {
  return db.select().from(mktChannelStats)
    .where(and(
      eq(mktChannelStats.channel, channel),
      gte(mktChannelStats.date, since.toISOString().split("T")[0]),
    ))
    .orderBy(desc(mktChannelStats.date));
}
```

- [ ] **Step 3: queries/kpi.ts**

```typescript
import { db } from "@/db";
import { mktChannelStats, mktAdDaily } from "@/db/schema";
import { sql, gte } from "drizzle-orm";

// KPI 집계: 기간 내 전 채널 합산
export async function getKpiSummary(since: Date) {
  const sinceStr = since.toISOString().split("T")[0];

  const stats = await db.select({
    totalImpressions: sql<number>`coalesce(sum(${mktChannelStats.totalImpressions}), 0)`,
    totalClicks: sql<number>`coalesce(sum(${mktChannelStats.totalClicks}), 0)`,
    totalConversions: sql<number>`coalesce(sum(${mktChannelStats.totalConversions}), 0)`,
  }).from(mktChannelStats)
    .where(gte(mktChannelStats.date, sinceStr));

  const ads = await db.select({
    totalSpend: sql<number>`coalesce(sum(${mktAdDaily.spend}), 0)`,
    totalConversionValue: sql<number>`coalesce(sum(${mktAdDaily.conversionValue}), 0)`,
  }).from(mktAdDaily)
    .where(gte(mktAdDaily.date, sinceStr));

  return {
    impressions: stats[0]?.totalImpressions ?? 0,
    conversions: stats[0]?.totalConversions ?? 0,
    spend: ads[0]?.totalSpend ?? 0,
    roi: ads[0]?.totalSpend ? (ads[0].totalConversionValue / ads[0].totalSpend) : 0,
  };
}
```

- [ ] **Step 4: queries/campaigns.ts**

```typescript
import { db } from "@/db";
import { mktAdCampaigns, mktAdDaily } from "@/db/schema";
import { eq, desc, gte } from "drizzle-orm";

export async function getCampaigns() {
  return db.select().from(mktAdCampaigns)
    .orderBy(desc(mktAdCampaigns.updatedAt));
}

export async function getCampaignDaily(campaignId: string, since: Date) {
  return db.select().from(mktAdDaily)
    .where(eq(mktAdDaily.campaignId, campaignId))
    .where(gte(mktAdDaily.date, since.toISOString().split("T")[0]))
    .orderBy(desc(mktAdDaily.date));
}
```

- [ ] **Step 5: 커밋**

```bash
git add marketing-dashboard/src/db/queries/
git commit -m "feat(marketing-dashboard): DB 쿼리 레이어 — 콘텐츠, 메트릭, KPI, 캠페인"
```

---

## Task 5: API Routes

**Files:**
- Create: `marketing-dashboard/src/app/api/kpi/route.ts`
- Create: `marketing-dashboard/src/app/api/contents/route.ts`
- Create: `marketing-dashboard/src/app/api/contents/[id]/route.ts`
- Create: `marketing-dashboard/src/app/api/metrics/route.ts`
- Create: `marketing-dashboard/src/app/api/campaigns/route.ts`

- [ ] **Step 1: api/kpi/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getKpiSummary } from "@/db/queries/kpi";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = Number(searchParams.get("days") ?? "7");
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const kpi = await getKpiSummary(since);
  return NextResponse.json(kpi);
}
```

- [ ] **Step 2: api/contents/route.ts**

GET: 채널/상태 필터링. 큐 조회 포함.

- [ ] **Step 3: api/contents/[id]/route.ts**

PATCH: body, scheduledAt 수정.

- [ ] **Step 4: api/metrics/route.ts**

GET: 채널별 + 기간별 메트릭 조회.

- [ ] **Step 5: api/campaigns/route.ts**

GET: 캠페인 목록 + 일간 시계열.

- [ ] **Step 6: 빌드 확인**

```bash
npm run build
```

- [ ] **Step 7: 커밋**

```bash
git add marketing-dashboard/src/app/api/
git commit -m "feat(marketing-dashboard): API routes — KPI, 콘텐츠, 메트릭, 캠페인"
```

---

## Task 6: 대시보드 레이아웃 + 공통 컴포넌트

**Files:**
- Create: `marketing-dashboard/src/app/dashboard/layout.tsx`
- Create: `marketing-dashboard/src/components/channel-nav.tsx`
- Create: `marketing-dashboard/src/components/period-filter.tsx`
- Create: `marketing-dashboard/src/lib/utils.ts`
- Modify: `marketing-dashboard/src/app/globals.css`

- [ ] **Step 1: globals.css — 채널 컬러 CSS 변수 추가**

GBP 대시보드 globals.css 패턴 복사 + 채널별 컬러 변수 추가:

```css
--channel-linkedin: #0077b5;
--channel-newsletter: #ff6b35;
--channel-threads: #000000;
--channel-instagram: #e1306c;
--channel-ads: #1877f2;
```

- [ ] **Step 2: utils.ts — 포맷팅 유틸**

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatKRW(n: number): string {
  return `₩${n.toLocaleString()}`;
}

export function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}
```

- [ ] **Step 3: channel-nav.tsx — 탭 네비게이션**

`/dashboard`, `/dashboard/linkedin`, ... 탭. 현재 경로 하이라이트. 채널별 컬러 인디케이터.

- [ ] **Step 4: period-filter.tsx — 기간 필터**

7일/30일/90일 버튼 그룹. URL searchParams로 상태 관리.

- [ ] **Step 5: dashboard/layout.tsx**

```typescript
import { ChannelNav } from "@/components/channel-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <ChannelNav />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: 빌드 확인 + 커밋**

```bash
npm run build
git add marketing-dashboard/src/
git commit -m "feat(marketing-dashboard): 대시보드 레이아웃 + 채널 네비게이션 + 유틸"
```

---

## Task 7: Overview 페이지 (KPI + 큐 + 차트)

**Files:**
- Create: `marketing-dashboard/src/components/kpi-cards.tsx`
- Create: `marketing-dashboard/src/components/content-queue.tsx`
- Create: `marketing-dashboard/src/components/channel-chart.tsx`
- Create: `marketing-dashboard/src/app/dashboard/page.tsx`

- [ ] **Step 1: kpi-cards.tsx**

4개 카드 컴포넌트. props: `{ impressions, conversions, spend, roi, prevImpressions, ... }`. 주간 변동률 계산 + 색상 표시 (상승=green, 하락=red).

- [ ] **Step 2: content-queue.tsx**

다음 7일 콘텐츠 목록. 채널 컬러 왼쪽 보더. 제목 + 예정일시 + 상태 뱃지. ✏️ 버튼 → content-editor 모달 트리거.

- [ ] **Step 3: channel-chart.tsx**

Recharts BarChart. 채널별 노출 비교. 채널 컬러 적용. 기간 필터 연동.

- [ ] **Step 4: dashboard/page.tsx — Overview 조합**

```typescript
import { KpiCards } from "@/components/kpi-cards";
import { ContentQueue } from "@/components/content-queue";
import { ChannelChart } from "@/components/channel-chart";

export default async function DashboardPage() {
  // Server Component: DB 직접 조회
  const kpi = await getKpiSummary(sevenDaysAgo);
  const queue = await getContentQueue();
  const channelData = await getAllChannelStats(sevenDaysAgo);

  return (
    <div className="space-y-6">
      <KpiCards data={kpi} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContentQueue items={queue} />
        <ChannelChart data={channelData} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 수동 테스트**

`npm run dev` → `/dashboard` 접근. KPI 카드 4개 + 큐 + 차트 렌더링 확인. (데이터 없으면 빈 상태 UI 확인)

- [ ] **Step 6: 커밋**

```bash
git add marketing-dashboard/src/
git commit -m "feat(marketing-dashboard): Overview 페이지 — KPI 카드 + 콘텐츠 큐 + 채널 차트"
```

---

## Task 8: 콘텐츠 수정 모달

**Files:**
- Create: `marketing-dashboard/src/components/content-editor.tsx`
- Create: `marketing-dashboard/src/components/schedule-picker.tsx`

- [ ] **Step 1: content-editor.tsx**

shadcn Dialog. props: `content` 객체. 수정 필드: body (Textarea), scheduledAt (날짜+시간 input). 저장 버튼 → `PATCH /api/contents/[id]` 호출. 성공 시 `router.refresh()`.

- [ ] **Step 2: schedule-picker.tsx**

날짜 + 시간 선택기. `<input type="datetime-local">` 기반. 값 변경 시 부모로 콜백.

- [ ] **Step 3: content-queue.tsx에 모달 연결**

큐 아이템의 ✏️ 버튼 클릭 → ContentEditor 모달 open. 수정 완료 시 큐 목록 자동 갱신.

- [ ] **Step 4: 수동 테스트**

큐 아이템 수정 → DB 반영 확인.

- [ ] **Step 5: 커밋**

```bash
git add marketing-dashboard/src/components/
git commit -m "feat(marketing-dashboard): 콘텐츠 수정 모달 — 본문 편집 + 스케줄 변경"
```

---

## Task 9: 채널 상세 페이지 — LinkedIn + Newsletter

**Files:**
- Create: `marketing-dashboard/src/components/content-table.tsx`
- Create: `marketing-dashboard/src/components/follower-chart.tsx`
- Create: `marketing-dashboard/src/app/dashboard/linkedin/page.tsx`
- Create: `marketing-dashboard/src/app/dashboard/newsletter/page.tsx`

- [ ] **Step 1: content-table.tsx — 재사용 가능한 발행 이력 테이블**

shadcn Table. 채널별로 다른 메트릭 컬럼. props: `{ contents, metrics, columns }`.

| 공통 컬럼 | 채널별 추가 컬럼 |
|----------|----------------|
| 제목, 발행일, 상태 | LinkedIn: 노출, 좋아요, 댓글, 클릭 |
| | Newsletter: 오픈율, 클릭율, 해지율 |

- [ ] **Step 2: follower-chart.tsx**

Recharts LineChart. 팔로워 추이. `mkt_channel_stats.followers_count` 데이터. 기간 필터 연동.

- [ ] **Step 3: linkedin/page.tsx**

발행 이력 테이블 + 팔로워 차트 + queued 콘텐츠 수정 영역.

- [ ] **Step 4: newsletter/page.tsx**

구독자 수 추이 + 발행 이력 (오픈율/클릭율/해지율) + draft 초안 편집.

- [ ] **Step 5: 수동 테스트 + 커밋**

```bash
git add marketing-dashboard/src/
git commit -m "feat(marketing-dashboard): LinkedIn + Newsletter 채널 상세 페이지"
```

---

## Task 10: 채널 상세 페이지 — Threads + Instagram

**Files:**
- Create: `marketing-dashboard/src/app/dashboard/threads/page.tsx`
- Create: `marketing-dashboard/src/app/dashboard/instagram/page.tsx`

- [ ] **Step 1: threads/page.tsx**

포스트 이력 (좋아요, 리포스트) + 팔로워 추이 차트. content-table + follower-chart 재사용.

- [ ] **Step 2: instagram/page.tsx**

릴스 성과 (조회수=impressions, 좋아요, 저장=saves, 팔로워 증감) + 팔로워 추이. 동일 컴포넌트 재사용.

- [ ] **Step 3: 수동 테스트 + 커밋**

```bash
git add marketing-dashboard/src/app/dashboard/threads/ marketing-dashboard/src/app/dashboard/instagram/
git commit -m "feat(marketing-dashboard): Threads + Instagram 채널 상세 페이지"
```

---

## Task 11: 채널 상세 페이지 — Meta Ads

**Files:**
- Create: `marketing-dashboard/src/app/dashboard/ads/page.tsx`
- Create: `marketing-dashboard/src/components/campaign-table.tsx`
- Create: `marketing-dashboard/src/components/spend-chart.tsx`

- [ ] **Step 1: campaign-table.tsx**

캠페인 목록 테이블. 컬럼: 캠페인명, 상태 뱃지, 일 예산, 총 지출, CTR, CPC, 전환, ROAS.

- [ ] **Step 2: spend-chart.tsx**

Recharts AreaChart. 일간 지출 + 전환 이중 축 차트. `mkt_ad_daily` 데이터.

- [ ] **Step 3: ads/page.tsx**

캠페인 목록 + 지출/전환 추이 차트 + 기간 필터.

- [ ] **Step 4: 수동 테스트 + 커밋**

```bash
git add marketing-dashboard/src/app/dashboard/ads/ marketing-dashboard/src/components/
git commit -m "feat(marketing-dashboard): Meta Ads 채널 상세 — 캠페인 목록 + 지출 차트"
```

---

## Task 12: 엔진 Supabase 연동 — 공통 모듈

**Files:**
- Create: `engine-sdk/supabase_client.py` (루트 레벨, 엔진들이 공유)
- Create: `engine-sdk/requirements.txt`

이 SDK는 각 Python 엔진이 import해서 사용하는 공통 Supabase 헬퍼. 루트에 배치하여 각 엔진이 `sys.path` 또는 심링크로 접근.

- [ ] **Step 1: supabase_client.py**

```python
"""
마케팅 대시보드 Supabase 공통 클라이언트.
각 엔진에서 import해서 사용:
  from engine_sdk.supabase_client import mkt_db
  mkt_db.insert_content(channel="linkedin", title="...", body="...", status="queued")
"""
import os
from supabase import create_client

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

_client = create_client(SUPABASE_URL, SUPABASE_KEY)

class MktDB:
    def insert_content(self, *, channel: str, title: str, body: str,
                       status: str = "draft", scheduled_at: str | None = None,
                       source_script: str | None = None) -> dict:
        return _client.table("mkt_contents").insert({
            "channel": channel,
            "title": title,
            "body": body,
            "status": status,
            "scheduled_at": scheduled_at,
            "source_script": source_script,
        }).execute().data[0]

    def update_content(self, content_id: str, **kwargs) -> dict:
        return _client.table("mkt_contents").update(kwargs).eq("id", content_id).execute().data[0]

    def insert_metrics(self, *, content_id: str, channel: str,
                       impressions: int = 0, clicks: int = 0,
                       likes: int = 0, comments: int = 0,
                       shares: int = 0, saves: int = 0,
                       followers_delta: int = 0, extra: dict | None = None) -> dict:
        return _client.table("mkt_metrics").insert({
            "content_id": content_id,
            "channel": channel,
            "impressions": impressions,
            "clicks": clicks,
            "likes": likes,
            "comments": comments,
            "shares": shares,
            "saves": saves,
            "followers_delta": followers_delta,
            "extra": extra,
        }).execute().data[0]

    def upsert_campaign(self, **kwargs) -> dict:
        return _client.table("mkt_ad_campaigns").upsert(kwargs, on_conflict="campaign_id").execute().data[0]

    def insert_ad_daily(self, **kwargs) -> dict:
        return _client.table("mkt_ad_daily").insert(kwargs).execute().data[0]

    def insert_channel_stats(self, **kwargs) -> dict:
        return _client.table("mkt_channel_stats").insert(kwargs).execute().data[0]

mkt_db = MktDB()
```

- [ ] **Step 2: requirements.txt**

```
supabase>=2.0.0
```

- [ ] **Step 3: 커밋**

```bash
git add engine-sdk/
git commit -m "feat: Python 엔진용 Supabase 공통 SDK (engine-sdk)"
```

---

## Task 13: 엔진 연동 — content-engine

**Files:**
- Modify: `content-engine/requirements.txt` — supabase 추가
- Modify: `content-engine/src/config.py` — SUPABASE_URL, SUPABASE_SERVICE_KEY 추가
- Modify: `content-engine/src/transformer.py` — 변환 완료 시 mkt_contents INSERT
- Modify: `content-engine/src/linkedin.py` — 발행 시 UPDATE, 메트릭 수집 시 INSERT
- Modify: `content-engine/src/newsletter.py` — 초안/발행/메트릭 동일

- [ ] **Step 1: config.py에 Supabase 환경변수 추가**

- [ ] **Step 2: transformer.py — 변환 완료 시 INSERT**

기존 JSONL 저장 바로 아래에 `mkt_db.insert_content(...)` 1줄 추가.

- [ ] **Step 3: linkedin.py — 발행 시 UPDATE + 메트릭 수집**

발행 성공 콜백에 `mkt_db.update_content(id, status="published", published_at=..., external_id=...)` 추가.
메트릭 수집 함수에 `mkt_db.insert_metrics(...)` 추가.

- [ ] **Step 4: newsletter.py — 동일 패턴**

- [ ] **Step 5: 기존 JSONL 로직 유지 확인**

기존 코드는 건드리지 않고 Supabase INSERT만 추가했는지 확인.

- [ ] **Step 6: 커밋**

```bash
git add content-engine/
git commit -m "feat(content-engine): Supabase 연동 — 대시보드용 데이터 INSERT"
```

---

## Task 14: 엔진 연동 — orchestrator (Meta Ads)

**Files:**
- Modify: `orchestrator/requirements.txt`
- Modify: `orchestrator/src/apis.py` — MetaAdsAPI에 Supabase 저장 추가
- Modify: `orchestrator/src/config.py` — Supabase 환경변수

- [ ] **Step 1: MetaAdsAPI 데이터 수집 후 Supabase INSERT 추가**

기존 `fetch_campaign_data()` 결과를 `mkt_db.upsert_campaign(...)` + `mkt_db.insert_ad_daily(...)` + `mkt_db.insert_channel_stats(...)` 으로 저장.

- [ ] **Step 2: .env에 SUPABASE_URL, SUPABASE_SERVICE_KEY 추가**

- [ ] **Step 3: 커밋**

```bash
git add orchestrator/
git commit -m "feat(orchestrator): Meta Ads 데이터 Supabase 연동"
```

---

## Task 15: 엔진 연동 — threads-bot + instagram-engine

**Files:**
- Modify: `threads-bot/requirements.txt` — supabase 추가
- Modify: `threads-bot/` — 발행 시 mkt_contents INSERT, 메트릭 수집 시 mkt_metrics INSERT
- Modify: `instagram-engine/requirements.txt` — supabase 추가
- Modify: `instagram-engine/` — 릴스 발행 기록 시 mkt_contents INSERT, 메트릭 수집 시 mkt_metrics INSERT

- [ ] **Step 1: threads-bot에 engine-sdk 연동**

발행 함수에 `mkt_db.insert_content(channel="threads", ...)` 추가. 메트릭 수집 함수에 `mkt_db.insert_metrics(...)` 추가.

- [ ] **Step 2: instagram-engine에 engine-sdk 연동**

동일 패턴. `channel="instagram"`.

- [ ] **Step 3: 커밋**

```bash
git add threads-bot/ instagram-engine/
git commit -m "feat: threads-bot + instagram-engine Supabase 연동"
```

---

## Task 16: Vercel 배포 + 최종 검증

**Files:**
- Modify: `marketing-dashboard/.env` (Vercel 환경변수로 이전)

- [ ] **Step 1: Vercel 프로젝트 연결**

```bash
cd marketing-dashboard
vercel link
```

- [ ] **Step 2: 환경변수 설정**

```bash
vercel env add DATABASE_URL
vercel env add ADMIN_PASSWORD
```

- [ ] **Step 3: 프리뷰 배포**

```bash
vercel
```

- [ ] **Step 4: 전체 플로우 검증**

1. 로그인 → 대시보드 접근
2. Overview: KPI 카드 + 큐 + 차트 렌더링
3. 각 채널 탭 전환
4. 콘텐츠 수정 모달 동작
5. Meta Ads 캠페인 목록

- [ ] **Step 5: 프로덕션 배포**

```bash
vercel --prod
```

- [ ] **Step 6: 최종 커밋**

```bash
git add .
git commit -m "feat(marketing-dashboard): Vercel 배포 완료"
```
