# Marketing Dashboard Phase 2 — 콘텐츠 생성 + 자산 관리 + 인사이트

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6채널 통합 대시보드에 AI 콘텐츠 생성, 콘텐츠 관계 추적, 성과 기반 인사이트를 추가하여 "보기만 하는 대시보드"를 "만들고 분석하는 운영 허브"로 진화시킨다.

**Architecture:** 기존 Next.js 16 App Router + Drizzle + Supabase 구조 위에 3개 모듈을 추가한다. (A) AI 콘텐츠 생성은 서버 액션 + Anthropic SDK로 처리, 생성 결과는 기존 `mkt_contents`에 `draft` 상태로 INSERT. (B) 콘텐츠 자산 관리는 `mkt_content_relations` 테이블로 원본-파생 관계 추적. (C) 인사이트는 기존 `mkt_metrics` + `mkt_channel_stats` 데이터를 집계 쿼리로 도출.

**Tech Stack:** Next.js 16 (App Router), Anthropic SDK (`@anthropic-ai/sdk`), Drizzle ORM, Supabase PostgreSQL, shadcn/ui, Recharts, Zod

---

## 기존 코드베이스 요약

| 항목 | 위치 | 설명 |
|------|------|------|
| DB 스키마 | `src/db/schema/` | contents, metrics, channel-stats, ad-campaigns, ad-daily |
| 쿼리 | `src/db/queries/*.ts` | contents.ts, metrics.ts, campaigns.ts, kpi.ts (디렉토리 구조) |
| API | `src/app/api/` | auth, contents, contents/[id], metrics, kpi, campaigns, naver-sync |
| 페이지 | `src/app/dashboard/` | overview, linkedin, newsletter, threads, instagram, ads, naver-blog |
| 컴포넌트 | `src/components/` | kpi-cards, content-queue, content-editor, channel-chart, follower-chart 등 |
| 상수 | `src/lib/constants.ts` | CHANNELS, CHANNEL_COLORS, CHANNEL_LABELS, LEAD_VALUE_KRW |
| 인증 | `src/middleware.ts` | mkt_auth 쿠키 기반 |

## 파일 구조 (신규/수정)

```
marketing-dashboard/src/
├── app/
│   ├── dashboard/
│   │   ├── create/                    ← [신규] 콘텐츠 생성 허브
│   │   │   ├── page.tsx               — 주제 정의 + 채널 선택
│   │   │   ├── blog/page.tsx          — 블로그 4단계 위저드
│   │   │   ├── instagram/page.tsx     — 카드뉴스 생성
│   │   │   ├── threads/page.tsx       — 쓰레드 생성
│   │   │   ├── linkedin/page.tsx      — LinkedIn 포스트 생성
│   │   │   └── newsletter/page.tsx    — 뉴스레터 초안 생성
│   │   ├── assets/page.tsx            ← [신규] 콘텐츠 자산 관리
│   │   └── insights/page.tsx          ← [신규] 인사이트 (탑 퍼포머 + 최적 시간 + 채널 비교)
│   └── api/
│       ├── generate/route.ts          ← [신규] AI 생성 엔드포인트
│       ├── topics/route.ts            ← [신규] 주제 CRUD
│       ├── relations/route.ts         ← [신규] 콘텐츠 관계 CRUD
│       └── insights/route.ts          ← [신규] 인사이트 집계 쿼리
├── components/
│   ├── topic-form.tsx                 ← [신규] 주제 정의 폼
│   ├── style-selector.tsx             ← [신규] 스타일 선택 카드
│   ├── generation-preview.tsx         ← [신규] AI 생성 결과 프리뷰 + 편집
│   ├── blog-wizard.tsx                ← [신규] 블로그 4단계 위저드
│   ├── content-tree.tsx               ← [신규] 원본→파생 트리 시각화
│   ├── top-performers.tsx             ← [신규] 탑 퍼포머 카드
│   ├── best-time-chart.tsx            ← [신규] 최적 발행 시간 히트맵
│   ├── cross-channel-compare.tsx      ← [신규] 채널 간 성과 비교
│   └── metric-sort-table.tsx          ← [신규] 전 채널 메트릭 소팅 테이블
├── db/
│   ├── schema/
│   │   ├── topics.ts                  ← [신규]
│   │   ├── content-relations.ts       ← [신규]
│   │   └── index.ts                   ← [수정] 새 스키마 export 추가
│   └── queries/
│       ├── topics.ts                  ← [신규]
│       ├── relations.ts               ← [신규]
│       └── insights.ts                ← [신규]
└── lib/
    ├── ai.ts                          ← [신규] Anthropic SDK 클라이언트 + 프롬프트 빌더
    ├── prompts/                        ← [신규] 채널별 시스템 프롬프트
    │   ├── blog.ts
    │   ├── instagram.ts
    │   ├── threads.ts
    │   ├── linkedin.ts
    │   └── newsletter.ts
    └── constants.ts                   ← [수정] 스타일 상수 추가
```

## DB 스키마 추가

### mkt_topics — 주제 정의

```sql
CREATE TABLE mkt_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,              -- "피부과 과잉진료"
  target_audience TEXT NOT NULL,   -- "20-30대 여성, 피부 시술 관심"
  keywords TEXT[] NOT NULL,        -- {"피부과", "과잉진료", "시술비용"}
  core_message TEXT,               -- 핵심 메시지 (선택)
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### mkt_content_relations — 콘텐츠 관계

```sql
CREATE TABLE mkt_content_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES mkt_contents(id),
  child_id UUID NOT NULL REFERENCES mkt_contents(id),
  relation_type TEXT NOT NULL DEFAULT 'derived', -- derived | repurposed | translated
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(parent_id, child_id)
);
```

### mkt_contents 수정 — topic_id FK 추가

```sql
ALTER TABLE mkt_contents ADD COLUMN topic_id UUID REFERENCES mkt_topics(id);
ALTER TABLE mkt_contents ADD COLUMN generation_style TEXT; -- 생성 시 사용된 스타일
```

---

## 그룹 A: 콘텐츠 생성 엔진

### Task 1: 의존성 추가 + DB 스키마 마이그레이션

**Files:**
- Modify: `marketing-dashboard/package.json`
- Create: `marketing-dashboard/src/db/schema/topics.ts`
- Create: `marketing-dashboard/src/db/schema/content-relations.ts`
- Modify: `marketing-dashboard/src/db/schema/index.ts`
- Modify: `marketing-dashboard/src/db/schema/contents.ts` — topic_id, generation_style 컬럼 추가
- Create: `marketing-dashboard/drizzle/0002_content_generation.sql` (drizzle-kit generate로 생성)

- [ ] **Step 1: Anthropic SDK + react-markdown 설치**

```bash
cd marketing-dashboard && npm install @anthropic-ai/sdk react-markdown remark-gfm
```

- [ ] **Step 2: mkt_topics 스키마 파일 생성**

```typescript
// src/db/schema/topics.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const mktTopics = pgTable("mkt_topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  targetAudience: text("target_audience").notNull(),
  keywords: text("keywords").array().notNull(),
  coreMessage: text("core_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 3: mkt_content_relations 스키마 파일 생성**

```typescript
// src/db/schema/content-relations.ts
import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { mktContents } from "./contents";

export const mktContentRelations = pgTable("mkt_content_relations", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").references(() => mktContents.id).notNull(),
  childId: uuid("child_id").references(() => mktContents.id).notNull(),
  relationType: text("relation_type").notNull().default("derived"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique().on(table.parentId, table.childId),
]);
```

- [ ] **Step 4: contents 스키마에 topic_id + generation_style 추가**

`src/db/schema/contents.ts`에 추가:
```typescript
import { mktTopics } from "./topics";
// mktContents 테이블에 컬럼 추가:
topicId: uuid("topic_id").references(() => mktTopics.id),
generationStyle: text("generation_style"),
```

- [ ] **Step 5: schema/index.ts에 새 테이블 export**

```typescript
export * from "./topics";
export * from "./content-relations";
```

- [ ] **Step 6: drizzle-kit으로 마이그레이션 생성 + 실행**

```bash
npx drizzle-kit generate
npx drizzle-kit push
```

- [ ] **Step 7: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 콘텐츠 생성 DB 스키마 + Anthropic SDK 추가"
```

---

### Task 2: AI 클라이언트 + 채널별 프롬프트

**Files:**
- Create: `src/lib/ai.ts`
- Create: `src/lib/prompts/blog.ts`
- Create: `src/lib/prompts/instagram.ts`
- Create: `src/lib/prompts/threads.ts`
- Create: `src/lib/prompts/linkedin.ts`
- Create: `src/lib/prompts/newsletter.ts`
- Modify: `src/lib/constants.ts` — 스타일 상수 추가

- [ ] **Step 1: Anthropic 클라이언트 래퍼 생성**

```typescript
// src/lib/ai.ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface GenerateInput {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
}

export async function generateContent({ systemPrompt, userPrompt, maxTokens = 4096 }: GenerateInput): Promise<string> {
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = msg.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type");
  return block.text;
}
```

- [ ] **Step 2: 스타일 상수 추가** (`src/lib/constants.ts`)

```typescript
export const INSTAGRAM_STYLES = [
  { id: "real_war", label: "리얼전", description: "진짜 vs 가짜 비교" },
  { id: "aida", label: "AIDA", description: "주목→흥미→욕구→행동" },
  { id: "pas", label: "PAS", description: "문제→자극→해결" },
  { id: "bab", label: "BAB", description: "이전→이후→브릿지" },
  { id: "listicle", label: "리스토럽", description: "번호 매기기 리스트" },
  { id: "educational", label: "학습용", description: "정보 전달 중심" },
  { id: "storytelling", label: "스토리텔링", description: "서사 구조" },
  { id: "daily", label: "일상 모음", description: "친근한 일상 공유" },
] as const;

export const THREADS_STYLES = [
  { id: "empathy", label: "공감형", description: "감정 공감 유도" },
  { id: "tips", label: "꿀팁", description: "실용 정보 공유" },
  { id: "debate", label: "논쟁", description: "의견 대립 유도" },
  { id: "community", label: "친목", description: "커뮤니티 소통" },
  { id: "facts", label: "팩트폭격", description: "데이터/팩트 기반" },
  { id: "growth", label: "성장기록", description: "성장 여정 공유" },
  { id: "myway", label: "마이웨이", description: "독자적 관점" },
  { id: "curation", label: "큐레이션", description: "콘텐츠 큐레이팅" },
] as const;

export type InstagramStyle = (typeof INSTAGRAM_STYLES)[number]["id"];
export type ThreadsStyle = (typeof THREADS_STYLES)[number]["id"];
```

- [ ] **Step 3: 채널별 프롬프트 파일 5개 생성**

각 파일은 `buildSystemPrompt(topic, style?)` + `buildUserPrompt(topic, options)` 함수를 export.

`src/lib/prompts/blog.ts`:
```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { mktTopics } from "@/db/schema/topics";

type Topic = InferSelectModel<typeof mktTopics>;

interface BlogOptions {
  step: 1 | 2 | 3 | 4;
  wordCount?: number;
  tone?: string;
  useEmoji?: boolean;
  referenceStyle?: string;
}

export function buildBlogSystemPrompt(): string {
  return `당신은 병원 마케팅 전문 블로그 작성자입니다.
SEO 최적화된 블로그 글을 작성합니다.
한국어로 작성하며, 자연스럽고 신뢰감 있는 톤을 유지합니다.`;
}

export function buildBlogUserPrompt(topic: Topic, options: BlogOptions): string {
  const base = `주제: ${topic.name}\n타겟: ${topic.targetAudience}\n키워드: ${topic.keywords.join(", ")}`;

  switch (options.step) {
    case 1:
      return `${base}\n\n이 주제에 대한 키워드 리서치와 상위노출 전략을 분석해주세요.\n- 메인 키워드 3개\n- 롱테일 키워드 5개\n- 검색 의도 분석\n- 추천 제목 5개`;
    case 2:
      return `${base}\n\n블로그 글 옵션을 정해주세요:\n- 추천 분량: ${options.wordCount ?? 2000}자\n- 이모지 사용: ${options.useEmoji ? "O" : "X"}\n- 톤: ${options.tone ?? "전문적이면서 친근"}\n- 구조 제안 (H2/H3 아웃라인)`;
    case 3:
      return `${base}\n\n참고 스타일: ${options.referenceStyle ?? "없음"}\n위 스타일을 분석하고, 글자수 분배와 섹션별 핵심 포인트를 정리해주세요.`;
    case 4:
      return `${base}\n\n분량: ${options.wordCount ?? 2000}자\n톤: ${options.tone ?? "전문적이면서 친근"}\n이모지: ${options.useEmoji ? "적절히 사용" : "사용 안 함"}\n\n위 조건에 맞는 완성 블로그 글을 작성해주세요. 마크다운 형식으로 출력합니다.`;
  }
}
```

`src/lib/prompts/instagram.ts`:
```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { mktTopics } from "@/db/schema/topics";
import type { InstagramStyle } from "@/lib/constants";

type Topic = InferSelectModel<typeof mktTopics>;

export function buildInstagramSystemPrompt(style: InstagramStyle): string {
  const styleGuides: Record<InstagramStyle, string> = {
    real_war: "진짜 vs 가짜를 비교하며 팩트 기반으로 독자의 판단을 돕는 카드뉴스",
    aida: "주목(Attention)→흥미(Interest)→욕구(Desire)→행동(Action) 구조의 카드뉴스",
    pas: "문제(Problem)→자극(Agitation)→해결(Solution) 구조의 카드뉴스",
    bab: "이전(Before)→이후(After)→브릿지(Bridge) 구조의 카드뉴스",
    listicle: "번호 매기기 형식으로 정보를 정리하는 리스티클 카드뉴스",
    educational: "정보 전달 중심의 교육형 카드뉴스",
    storytelling: "서사 구조로 공감을 끌어내는 스토리텔링 카드뉴스",
    daily: "친근한 일상 톤의 카드뉴스",
  };
  return `당신은 인스타그램 카드뉴스 전문 카피라이터입니다.\n스타일: ${styleGuides[style]}\n\n카드뉴스는 슬라이드 5-10장으로 구성합니다.\n각 슬라이드: 제목(짧고 강렬) + 본문(2-3줄) + CTA(마지막 슬라이드).\n한국어, 캐주얼하면서 전문적인 톤.`;
}

export function buildInstagramUserPrompt(topic: Topic): string {
  return `주제: ${topic.name}\n타겟: ${topic.targetAudience}\n키워드: ${topic.keywords.join(", ")}\n핵심 메시지: ${topic.coreMessage ?? topic.name}\n\n위 조건으로 인스타그램 카드뉴스를 생성해주세요.\n각 슬라이드를 [슬라이드 N] 형식으로 구분해주세요.`;
}
```

`src/lib/prompts/threads.ts`, `linkedin.ts`, `newsletter.ts`도 동일 패턴으로 생성. 각각:
- **threads.ts**: ThreadsStyle 8종에 대한 스타일 가이드, 280자 내외 숏폼
- **linkedin.ts**: 프로페셔널 톤, 1인칭 관점, 3문단 구조 + 해시태그
- **newsletter.ts**: 소재 블록(인트로/본문 2-3개/아웃트로) 조합, Beehiiv 포맷

- [ ] **Step 4: 커밋**

```bash
git add -A && git commit -m "feat(phase2): AI 클라이언트 + 채널별 프롬프트 빌더"
```

---

### Task 3: 주제 정의 API + UI

**Files:**
- Create: `src/db/queries/topics.ts`
- Create: `src/app/api/topics/route.ts`
- Create: `src/components/topic-form.tsx`
- Create: `src/app/dashboard/create/page.tsx`
- Modify: `src/components/channel-nav.tsx` — "콘텐츠 생성" 네비 추가

- [ ] **Step 1: topics 쿼리 파일**

```typescript
// src/db/queries/topics.ts
import { db } from "@/db";
import { mktTopics } from "@/db/schema/topics";
import { desc, eq } from "drizzle-orm";

export async function getAllTopics() {
  return db.select().from(mktTopics).orderBy(desc(mktTopics.createdAt));
}

export async function getTopicById(id: string) {
  const rows = await db.select().from(mktTopics).where(eq(mktTopics.id, id));
  return rows[0] ?? null;
}

export async function createTopic(data: { name: string; targetAudience: string; keywords: string[]; coreMessage?: string }) {
  const rows = await db.insert(mktTopics).values(data).returning();
  return rows[0];
}
```

- [ ] **Step 2: topics API 라우트**

```typescript
// src/app/api/topics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAllTopics, createTopic } from "@/db/queries/topics";

const createSchema = z.object({
  name: z.string().min(1),
  targetAudience: z.string().min(1),
  keywords: z.array(z.string()).min(1),
  coreMessage: z.string().optional(),
});

export async function GET() {
  const topics = await getAllTopics();
  return NextResponse.json({ success: true, data: topics });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });
  const topic = await createTopic(parsed.data);
  return NextResponse.json({ success: true, data: topic });
}
```

- [ ] **Step 3: 주제 정의 폼 컴포넌트**

```typescript
// src/components/topic-form.tsx — "use client"
// 필드: name(text), targetAudience(text), keywords(태그 입력), coreMessage(textarea, 선택)
// 제출 → POST /api/topics → 성공 시 topic.id를 채널 선택으로 전달
```

- [ ] **Step 4: 생성 허브 페이지**

```typescript
// src/app/dashboard/create/page.tsx
// 상단: TopicForm (주제 정의)
// 하단: 채널 선택 카드 6개 (블로그, 인스타, 쓰레드, LinkedIn, 뉴스레터)
// 주제 선택 후 채널 클릭 → /dashboard/create/{channel}?topicId={id}
// 기존 주제 목록도 표시 (재사용)
```

- [ ] **Step 5: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 주제 정의 API + 생성 허브 UI"
```

---

### Task 4: AI 생성 API 엔드포인트

**Files:**
- Create: `src/app/api/generate/route.ts`

- [ ] **Step 1: 생성 API 구현**

```typescript
// src/app/api/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTopicById } from "@/db/queries/topics";
import { generateContent } from "@/lib/ai";
import { buildBlogSystemPrompt, buildBlogUserPrompt } from "@/lib/prompts/blog";
import { buildInstagramSystemPrompt, buildInstagramUserPrompt } from "@/lib/prompts/instagram";
// ... 다른 채널 import

const generateSchema = z.object({
  topicId: z.string().uuid(),
  channel: z.enum(["naver_blog", "instagram", "threads", "linkedin", "newsletter"]),
  style: z.string().optional(),
  options: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ success: false, error: parsed.error.message }, { status: 400 });

  const topic = await getTopicById(parsed.data.topicId);
  if (!topic) return NextResponse.json({ success: false, error: "주제를 찾을 수 없습니다" }, { status: 404 });

  let systemPrompt: string;
  let userPrompt: string;

  switch (parsed.data.channel) {
    case "naver_blog":
      systemPrompt = buildBlogSystemPrompt();
      userPrompt = buildBlogUserPrompt(topic, { step: (parsed.data.options?.step as 1|2|3|4) ?? 4 });
      break;
    case "instagram":
      systemPrompt = buildInstagramSystemPrompt((parsed.data.style ?? "aida") as any);
      userPrompt = buildInstagramUserPrompt(topic);
      break;
    // ... threads, linkedin, newsletter 분기
    default:
      return NextResponse.json({ success: false, error: "지원하지 않는 채널" }, { status: 400 });
  }

  const result = await generateContent({ systemPrompt, userPrompt });
  return NextResponse.json({ success: true, data: { content: result, channel: parsed.data.channel } });
}
```

- [ ] **Step 2: .env에 ANTHROPIC_API_KEY 추가 확인**

```bash
# Vercel 환경변수에도 추가
vercel env add ANTHROPIC_API_KEY
```

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat(phase2): AI 콘텐츠 생성 API 엔드포인트"
```

---

### Task 5: 블로그 4단계 위저드 UI

**Files:**
- Create: `src/components/blog-wizard.tsx`
- Create: `src/app/dashboard/create/blog/page.tsx`

- [ ] **Step 1: 블로그 위저드 컴포넌트**

```typescript
// src/components/blog-wizard.tsx — "use client"
// 4단계 스텝퍼:
// Step 1: 키워드 리서치 → POST /api/generate (step:1) → 결과 표시 + "다음" 버튼
// Step 2: 분량/이모지/톤 옵션 선택 (라디오/슬라이더)
// Step 3: 참고글 스타일 입력(URL 또는 텍스트) → POST /api/generate (step:3) → 구조 분석 결과
// Step 4: "생성" 클릭 → POST /api/generate (step:4) → 마크다운 프리뷰 + 편집
// 최종: "저장" → POST /api/contents (channel: naver_blog, status: draft, topicId, generationStyle)
```

상태 관리: `useState`로 현재 스텝 + 각 스텝 결과 저장. 이전 단계로 돌아가기 가능.

- [ ] **Step 2: 블로그 생성 페이지**

```typescript
// src/app/dashboard/create/blog/page.tsx
// URL: /dashboard/create/blog?topicId=xxx
// searchParams에서 topicId 추출 → topic 로드 → BlogWizard에 전달
```

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 블로그 4단계 위저드 UI"
```

---

### Task 6: 인스타그램 카드뉴스 생성 UI

**Files:**
- Create: `src/components/style-selector.tsx`
- Create: `src/components/generation-preview.tsx`
- Create: `src/app/dashboard/create/instagram/page.tsx`

- [ ] **Step 1: 스타일 선택 카드 컴포넌트**

```typescript
// src/components/style-selector.tsx — "use client"
// props: styles (id, label, description)[], selected, onSelect
// 그리드 레이아웃, 클릭 시 선택 표시 (border-primary)
// INSTAGRAM_STYLES와 THREADS_STYLES 모두에서 재사용
```

- [ ] **Step 2: 생성 결과 프리뷰 컴포넌트**

```typescript
// src/components/generation-preview.tsx — "use client"
// props: content (string), channel, onEdit, onSave
// 마크다운 렌더링 (블로그) 또는 슬라이드별 분리 표시 (카드뉴스)
// 인라인 편집 모드 (Textarea) + "mkt_contents에 저장" 버튼
```

- [ ] **Step 3: 인스타그램 생성 페이지**

```typescript
// src/app/dashboard/create/instagram/page.tsx
// 흐름: 스타일 선택 → "생성" → 로딩 → 슬라이드별 프리뷰 → 편집 → 저장
// 저장 시 POST /api/contents (channel: instagram, status: draft, generationStyle: style.id)
```

- [ ] **Step 4: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 인스타그램 카드뉴스 생성 UI"
```

---

### Task 7: 쓰레드 + LinkedIn + 뉴스레터 생성 UI

**Files:**
- Create: `src/app/dashboard/create/threads/page.tsx`
- Create: `src/app/dashboard/create/linkedin/page.tsx`
- Create: `src/app/dashboard/create/newsletter/page.tsx`

- [ ] **Step 1: 쓰레드 생성 페이지**

StyleSelector (THREADS_STYLES 8종) + GenerationPreview 재사용. 280자 내외 숏폼.

- [ ] **Step 2: LinkedIn 생성 페이지**

스타일 선택 없이 바로 생성 (프로페셔널 톤 단일 스타일). 생성 → 프리뷰 → 저장.

- [ ] **Step 3: 뉴스레터 생성 페이지**

기존 발행된 콘텐츠(mkt_contents에서 published 상태)를 소재 블록으로 선택 → 엮어서 뉴스레터 초안 생성. 체크박스로 소재 선택 + "초안 생성" + 프리뷰.

- [ ] **Step 4: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 쓰레드/LinkedIn/뉴스레터 생성 UI"
```

---

## 그룹 B: 콘텐츠 자산 관리

### Task 8: 콘텐츠 관계 추적 API + UI

**Files:**
- Create: `src/db/queries/relations.ts`
- Create: `src/app/api/relations/route.ts`
- Create: `src/components/content-tree.tsx`
- Create: `src/app/dashboard/assets/page.tsx`

- [ ] **Step 1: relations 쿼리**

```typescript
// src/db/queries/relations.ts
// getContentTree(parentId) — 원본 + 모든 파생 콘텐츠 + 각각의 최신 메트릭
// createRelation(parentId, childId, type)
// getOrphanContents() — 관계 없는 콘텐츠 목록 (연결 유도)
```

- [ ] **Step 2: relations API**

```typescript
// src/app/api/relations/route.ts
// GET — 전체 관계 트리 (원본 기준 그룹핑)
// POST — 관계 생성 { parentId, childId, relationType }
```

- [ ] **Step 3: 콘텐츠 트리 시각화 컴포넌트**

```typescript
// src/components/content-tree.tsx — "use client"
// 원본 콘텐츠(릴스 등) → 파생 콘텐츠(LinkedIn, 블로그, 뉴스레터, Threads) 트리
// 각 노드: 채널 아이콘 + 제목 + 핵심 메트릭(노출/좋아요)
// 관계 없는 콘텐츠는 "연결" 버튼 표시
// 라이브러리 없이 CSS grid + 연결선(border)으로 구현
```

- [ ] **Step 4: 자산 관리 페이지**

```typescript
// src/app/dashboard/assets/page.tsx
// 상단: 원본 콘텐츠 필터 (채널별, 기간별)
// 메인: ContentTree 목록 (원본별로 파생 펼치기)
// 사이드: 미연결 콘텐츠 목록 + 드래그앤드롭 또는 선택→연결
```

- [ ] **Step 5: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 콘텐츠 관계 추적 + 자산 관리 UI"
```

---

### Task 9: 전 채널 메트릭 소팅 + 임베드

**Files:**
- Create: `src/components/metric-sort-table.tsx`
- Modify: 각 채널 페이지 (linkedin, newsletter, threads, instagram, ads)

- [ ] **Step 1: 범용 메트릭 소팅 테이블**

```typescript
// src/components/metric-sort-table.tsx — "use client"
// props: contents (content + metrics join)[], columns (동적), defaultSort
// 기능: 컬럼 헤더 클릭으로 정렬 (노출순, 좋아요순, 댓글순, 저장순 등)
// 외부 URL 있으면 임베드 아이콘 (링크 열기)
// Instagram 그리드처럼 다른 채널도 발행물 미리보기 + 메트릭 오버레이
```

- [ ] **Step 2: 각 채널 페이지에 MetricSortTable 적용**

기존 ContentTable/InstagramGrid를 MetricSortTable로 교체 또는 병행. 채널별 컬럼 설정:
- LinkedIn: 노출, 좋아요, 댓글, 클릭
- Threads: 좋아요, 리포스트
- Newsletter: 오픈율, 클릭율
- Instagram: 조회수, 좋아요, 저장, 댓글
- Meta Ads: 지출, CTR, CPC, ROAS

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 전 채널 메트릭 소팅 테이블"
```

---

## 그룹 C: 분석/인사이트

### Task 10: 인사이트 집계 쿼리 + API

**Files:**
- Create: `src/db/queries/insights.ts`
- Create: `src/app/api/insights/route.ts`

- [ ] **Step 1: 인사이트 쿼리 3종**

```typescript
// src/db/queries/insights.ts

// 1. 탑 퍼포머 — 채널별 상위 5개 콘텐츠 (노출 기준)
export async function getTopPerformers(channel?: string, days = 30) {
  // mkt_contents JOIN mkt_metrics
  // ORDER BY impressions DESC LIMIT 5
  // + 평균 대비 몇 % 높은지 계산
}

// 2. 최적 발행 시간 — 요일×시간대별 평균 성과
export async function getBestTimeToPost(channel?: string, days = 90) {
  // mkt_contents.published_at에서 요일(0-6) + 시간(0-23) 추출
  // GROUP BY dayOfWeek, hour → AVG(impressions, likes)
  // 7×24 히트맵 데이터 반환
}

// 3. 크로스채널 비교 — 같은 topic_id를 가진 콘텐츠의 채널별 성과
export async function getCrossChannelComparison(days = 30) {
  // mkt_contents JOIN mkt_metrics WHERE topic_id IS NOT NULL
  // GROUP BY topic_id, channel → SUM(impressions, likes)
  // 같은 소재가 어디서 가장 잘 먹히는지
}
```

- [ ] **Step 2: insights API 라우트**

```typescript
// src/app/api/insights/route.ts
// GET ?type=top_performers|best_time|cross_channel&channel=&days=
```

- [ ] **Step 3: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 인사이트 집계 쿼리 + API"
```

---

### Task 11: 인사이트 UI — 탑 퍼포머 + 최적 시간 + 채널 비교

**Files:**
- Create: `src/components/top-performers.tsx`
- Create: `src/components/best-time-chart.tsx`
- Create: `src/components/cross-channel-compare.tsx`
- Create: `src/app/dashboard/insights/page.tsx`

- [ ] **Step 1: 탑 퍼포머 카드**

```typescript
// src/components/top-performers.tsx
// 채널 탭 (전체/개별 채널) + 상위 5개 콘텐츠 카드
// 각 카드: 제목, 채널, 발행일, 핵심 메트릭, 평균 대비 배수
// "재가공" 버튼 → /dashboard/create?topicId=xxx로 이동 (원본 주제 기반 재생성)
```

- [ ] **Step 2: 최적 발행 시간 히트맵**

```typescript
// src/components/best-time-chart.tsx
// 7(요일) × 24(시간) 그리드, 셀 색상 = 평균 성과 (초록: 높음, 회색: 낮음)
// 채널 필터 가능
// Recharts 커스텀 또는 div 기반 히트맵
```

- [ ] **Step 3: 크로스채널 비교**

```typescript
// src/components/cross-channel-compare.tsx
// 같은 주제(topic_id)로 만든 콘텐츠의 채널별 성과 바 차트
// X축: 주제명, 각 주제 내에서 채널별 색상 바
// "이 소재는 LinkedIn에서 가장 잘 먹혔습니다" 같은 인사이트 텍스트 자동 생성
```

- [ ] **Step 4: 인사이트 페이지 조합**

```typescript
// src/app/dashboard/insights/page.tsx
// 3섹션 수직 배치:
// 1. TopPerformers (전 채널 탭)
// 2. BestTimeChart (채널 필터)
// 3. CrossChannelCompare (주제별)
// 상단 기간 필터 공유 (7일/30일/90일)
```

- [ ] **Step 5: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 인사이트 대시보드 (탑 퍼포머 + 최적 시간 + 채널 비교)"
```

---

### Task 12: 네비게이션 + 최종 통합

**Files:**
- Modify: `src/components/channel-nav.tsx` — 3개 신규 섹션 링크
- Modify: `src/app/dashboard/page.tsx` — 오버뷰에 "AI 생성" 퀵 액션 추가

- [ ] **Step 1: 사이드 네비 업데이트**

기존 채널 목록 아래에:
```
── 구분선 ──
📝 콘텐츠 생성   /dashboard/create
📦 자산 관리     /dashboard/assets
📊 인사이트      /dashboard/insights
```

- [ ] **Step 2: 오버뷰 페이지에 퀵 액션 카드**

KPI 카드 아래에 "AI 콘텐츠 생성" CTA 버튼 → /dashboard/create

- [ ] **Step 3: 전체 빌드 검증**

```bash
cd marketing-dashboard && npm run build
```

- [ ] **Step 4: 커밋**

```bash
git add -A && git commit -m "feat(phase2): 네비게이션 통합 + 빌드 검증"
```

---

## 환경변수

| 변수 | 설명 | 위치 |
|------|------|------|
| `ANTHROPIC_API_KEY` | Claude API 키 | .env + Vercel |

기존 변수(`DATABASE_URL`, `ADMIN_PASSWORD`)는 변경 없음.

**주의:** `src/lib/env.ts`에 `ANTHROPIC_API_KEY` 타입 안전 파싱 추가 필요 (Task 2에서 처리).

## 실행 순서 요약

```
Task 1  → DB 스키마 + 의존성 (기반)
Task 2  → AI 클라이언트 + 프롬프트 (기반)
Task 3  → 주제 정의 (생성 허브 진입점)
Task 4  → 생성 API (핵심 엔진)
Task 5  → 블로그 위저드
Task 6  → 인스타 카드뉴스
Task 7  → 쓰레드 + LinkedIn + 뉴스레터
Task 8  → 콘텐츠 관계 추적
Task 9  → 메트릭 소팅 테이블
Task 10 → 인사이트 쿼리
Task 11 → 인사이트 UI
Task 12 → 네비 통합 + 최종 빌드
```

**병렬 가능:**
- Task 5, 6, 7 (채널별 생성 UI — Task 4 이후 독립 실행 가능)
- Task 8, 9 (자산 관리 — Task 1 이후 독립 실행 가능)
- Task 10, 11 (인사이트 — Task 1 이후 독립 실행 가능)

## 의존성 그래프

```
Task 1 ──┬── Task 2 ──┬── Task 4 ──┬── Task 5
         │            │            ├── Task 6
         │            │            └── Task 7
         │            └── Task 3 ──┘ (Task 4는 Task 3의 getTopicById 사용)
         ├── Task 8
         ├── Task 9
         ├── Task 10 ── Task 11
         └── Task 12 (모두 완료 후, channel-nav 네비 통합 포함)
```
