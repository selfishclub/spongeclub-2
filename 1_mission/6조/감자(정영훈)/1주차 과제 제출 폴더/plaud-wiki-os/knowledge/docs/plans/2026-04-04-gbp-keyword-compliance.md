# GBP 키워드 준수 시스템 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작업자가 GBP 업데이트 작성 시 타겟 키워드를 반드시 포함하도록 강제하는 시스템 구축

**Architecture:** Drizzle ORM으로 target_keywords + update_keyword_assignments 테이블 추가. Gemini API로 초안 생성. 클라이언트 사이드 실시간 검증 + 서버 사이드 제출 시 검증 이중 체크.

**Tech Stack:** Next.js 16 (App Router) / Drizzle ORM / Supabase PostgreSQL / Gemini API / shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-04-gbp-keyword-compliance-design.md`

---

### Task 1: DB 스키마 — target_keywords 테이블

**Files:**
- Create: `src/db/schema/target-keywords.ts`
- Modify: `src/db/schema/index.ts`
- Modify: `src/db/schema/clients.ts` (relations 추가)

- [ ] **Step 1: target_keywords 스키마 파일 생성**

```typescript
// src/db/schema/target-keywords.ts
import {
  pgTable, uuid, text, boolean, date, timestamp, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { clients } from './clients';

export const targetKeywords = pgTable(
  'target_keywords',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
    keyword: text('keyword').notNull(),
    category: text('category').default('general'),
    isActive: boolean('is_active').default(true),
    startDate: date('start_date'),
    endDate: date('end_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('target_keywords_client_id_idx').on(table.clientId),
    index('target_keywords_is_active_idx').on(table.isActive),
  ]
);

export const targetKeywordsRelations = relations(targetKeywords, ({ one }) => ({
  client: one(clients, {
    fields: [targetKeywords.clientId],
    references: [clients.id],
  }),
}));
```

- [ ] **Step 2: index.ts에 export 추가**

`src/db/schema/index.ts` 끝에 추가:
```typescript
export * from './target-keywords';
```

- [ ] **Step 3: clients.ts relations에 targetKeywords 추가**

`src/db/schema/clients.ts`에서:
- import 추가: `import { targetKeywords } from './target-keywords';`
- clientsRelations의 many에 추가: `targetKeywords: many(targetKeywords),`

- [ ] **Step 4: Drizzle 마이그레이션 생성 및 적용**

```bash
cd gbp-dashboard/app
npx drizzle-kit generate --name add_target_keywords
npx drizzle-kit push
```

- [ ] **Step 5: 커밋**

```bash
git add src/db/schema/target-keywords.ts src/db/schema/index.ts src/db/schema/clients.ts drizzle/
git commit -m "feat(gbp): add target_keywords schema"
```

---

### Task 2: DB 스키마 — gbp_updates 확장 + update_keyword_assignments

**Files:**
- Modify: `src/db/schema/gbp-updates.ts` (keyword_compliance, generated_by_ai 컬럼 추가)
- Create: `src/db/schema/update-keyword-assignments.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: gbp-updates.ts에 컬럼 추가**

```typescript
// 기존 컬럼 뒤에 추가:
keywordCompliance: text('keyword_compliance'), // 'pass' | 'fail' | null
generatedByAi: boolean('generated_by_ai').default(false),
```

- [ ] **Step 2: update-keyword-assignments.ts 생성**

```typescript
// src/db/schema/update-keyword-assignments.ts
import {
  pgTable, uuid, boolean, jsonb, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { gbpUpdates } from './gbp-updates';
import { targetKeywords } from './target-keywords';

export const updateKeywordAssignments = pgTable(
  'update_keyword_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    updateId: uuid('update_id').references(() => gbpUpdates.id, { onDelete: 'cascade' }).notNull(),
    keywordId: uuid('keyword_id').references(() => targetKeywords.id, { onDelete: 'cascade' }).notNull(),
    isCompliant: boolean('is_compliant').default(false),
    missingTokens: jsonb('missing_tokens').default([]),
  },
  (table) => [
    index('uka_update_id_idx').on(table.updateId),
    index('uka_keyword_id_idx').on(table.keywordId),
  ]
);

export const updateKeywordAssignmentsRelations = relations(updateKeywordAssignments, ({ one }) => ({
  update: one(gbpUpdates, {
    fields: [updateKeywordAssignments.updateId],
    references: [gbpUpdates.id],
  }),
  keyword: one(targetKeywords, {
    fields: [updateKeywordAssignments.keywordId],
    references: [targetKeywords.id],
  }),
}));
```

- [ ] **Step 3: index.ts에 export, gbpUpdates relations에 assignments 추가**

- [ ] **Step 4: 마이그레이션 생성 및 적용**

```bash
npx drizzle-kit generate --name add_keyword_assignments
npx drizzle-kit push
```

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(gbp): add keyword assignments + compliance columns"
```

---

### Task 3: 타겟 키워드 CRUD 라이브러리

**Files:**
- Create: `src/lib/keywords/targets.ts`

- [ ] **Step 1: targets.ts 생성 — CRUD 함수**

```typescript
// src/lib/keywords/targets.ts
import { db } from '@/db';
import { targetKeywords } from '@/db/schema/target-keywords';
import { eq, and, desc } from 'drizzle-orm';

export async function getTargetKeywords(clientId: string, activeOnly = true) {
  const conditions = [eq(targetKeywords.clientId, clientId)];
  if (activeOnly) conditions.push(eq(targetKeywords.isActive, true));

  return db
    .select()
    .from(targetKeywords)
    .where(and(...conditions))
    .orderBy(desc(targetKeywords.createdAt));
}

export async function createTargetKeyword(data: {
  clientId: string;
  keyword: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}) {
  const result = await db
    .insert(targetKeywords)
    .values({
      clientId: data.clientId,
      keyword: data.keyword,
      category: data.category ?? 'general',
      startDate: data.startDate ?? null,
      endDate: data.endDate ?? null,
    })
    .returning();
  return result[0];
}

export async function toggleTargetKeyword(id: string, isActive: boolean) {
  const result = await db
    .update(targetKeywords)
    .set({ isActive })
    .where(eq(targetKeywords.id, id))
    .returning();
  return result[0];
}

export async function deleteTargetKeyword(id: string) {
  await db.delete(targetKeywords).where(eq(targetKeywords.id, id));
}
```

- [ ] **Step 2: 커밋**

```bash
git commit -m "feat(gbp): add target keywords CRUD library"
```

---

### Task 4: 키워드 검증 로직

**Files:**
- Create: `src/lib/keywords/compliance.ts`

- [ ] **Step 1: compliance.ts 생성**

```typescript
// src/lib/keywords/compliance.ts

interface ComplianceResult {
  keyword: string;
  isCompliant: boolean;
  missingTokens: string[];
  totalTokens: string[];
}

export function validateKeywordCompliance(
  content: string,
  keywords: string[]
): { allPassed: boolean; results: ComplianceResult[] } {
  const normalizedContent = content.toLowerCase();

  const results = keywords.map((keyword) => {
    const tokens = keyword
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const missingTokens = tokens.filter(
      (token) => !normalizedContent.includes(token.toLowerCase())
    );

    return {
      keyword,
      isCompliant: missingTokens.length === 0,
      missingTokens,
      totalTokens: tokens,
    };
  });

  return {
    allPassed: results.every((r) => r.isCompliant),
    results,
  };
}
```

- [ ] **Step 2: 커밋**

```bash
git commit -m "feat(gbp): add keyword compliance validation logic"
```

---

### Task 5: API — 타겟 키워드 CRUD 엔드포인트

**Files:**
- Create: `src/app/api/keywords/targets/route.ts`
- Create: `src/app/api/keywords/targets/[id]/route.ts`

- [ ] **Step 1: GET + POST 라우트 생성**

`src/app/api/keywords/targets/route.ts`:
- GET: clientId 쿼리 파라미터로 타겟 키워드 목록 반환
- POST: clientId, keyword, category, startDate, endDate로 생성

- [ ] **Step 2: PATCH + DELETE 라우트 생성**

`src/app/api/keywords/targets/[id]/route.ts`:
- PATCH: isActive 토글
- DELETE: 삭제

- [ ] **Step 3: 커밋**

```bash
git commit -m "feat(gbp): add target keywords API endpoints"
```

---

### Task 6: API — 키워드 검증 엔드포인트

**Files:**
- Create: `src/app/api/keywords/validate/route.ts`

- [ ] **Step 1: validate 라우트 생성**

POST body: `{ content: string, keywords: string[] }`
→ `validateKeywordCompliance` 호출 → 결과 반환

- [ ] **Step 2: 커밋**

```bash
git commit -m "feat(gbp): add keyword validation API endpoint"
```

---

### Task 7: API — Gemini AI 초안 생성

**Files:**
- Create: `src/lib/ai/generate-post.ts`
- Create: `src/app/api/ai/generate-post/route.ts`

- [ ] **Step 1: Gemini API 클라이언트 + 프롬프트 구성**

`src/lib/ai/generate-post.ts`:
- 환경변수: `GEMINI_API_KEY`
- 입력: keywords[], clientInfo (name, address, keyTreatments)
- Gemini API 직접 호출 (fetch)
- 프롬프트: 키워드 모든 구성 단어를 자연스럽게 포함하는 GBP 포스트 작성

- [ ] **Step 2: API 라우트 생성**

`src/app/api/ai/generate-post/route.ts`:
- POST body: `{ clientId, keywordIds }`
- DB에서 client 정보 + 키워드 조회
- `generatePost()` 호출
- 결과 반환

- [ ] **Step 3: 커밋**

```bash
git commit -m "feat(gbp): add Gemini AI post generation"
```

---

### Task 8: UI — 키워드 관리 페이지

**Files:**
- Create: `src/app/dashboard/clients/[id]/keywords/page.tsx`
- Create: `src/app/dashboard/clients/[id]/keywords/keywords-client.tsx`

- [ ] **Step 1: 서버 컴포넌트 page.tsx**

clientId 전달만.

- [ ] **Step 2: keywords-client.tsx — 키워드 목록 + CRUD UI**

기존 updates-client.tsx 패턴 따름:
- 키워드 목록 테이블 (키워드, 카테고리, 기간, 활성 상태 뱃지)
- 추가 다이얼로그 (keyword, category 셀렉트, startDate/endDate)
- 활성화/비활성화 토글 버튼
- 삭제 버튼 (확인 후)

- [ ] **Step 3: 클라이언트 상세 네비게이션에 "키워드" 탭 추가**

`src/app/dashboard/clients/[id]/client-detail-client.tsx`에 키워드 탭 링크 추가.

- [ ] **Step 4: 커밋**

```bash
git commit -m "feat(gbp): add target keywords management UI"
```

---

### Task 9: UI — 업데이트 작성 다이얼로그 확장

**Files:**
- Modify: `src/app/dashboard/clients/[id]/updates/updates-client.tsx`

- [ ] **Step 1: 키워드 선택 UI 추가**

다이얼로그에:
1. 활성 키워드 목록 fetch
2. 체크박스로 키워드 선택
3. 선택된 키워드 표시

- [ ] **Step 2: "AI 초안 생성" 버튼 추가**

- 키워드 1개 이상 선택 시 활성화
- 클릭 → `/api/ai/generate-post` 호출
- 결과를 title + content textarea에 채움
- 로딩 상태 표시

- [ ] **Step 3: 실시간 키워드 검증 표시**

- content 변경될 때마다 `validateKeywordCompliance` 클라이언트 사이드 실행
- 각 키워드별 pass(초록)/fail(빨강) 뱃지
- 누락 단어 표시
- 전체 pass일 때만 "저장" 버튼 활성화

- [ ] **Step 4: 서버 사이드 검증 추가**

`src/app/api/gbp/updates/route.ts` POST에:
- keywordIds가 있으면 검증 실행
- fail이면 400 반환
- pass이면 update_keyword_assignments 레코드 생성 + keywordCompliance = 'pass'

- [ ] **Step 5: 커밋**

```bash
git commit -m "feat(gbp): add keyword selection + AI draft + compliance validation to update dialog"
```

---

### Task 10: UI — 업데이트 목록에 준수율 표시

**Files:**
- Modify: `src/app/dashboard/clients/[id]/updates/updates-client.tsx`

- [ ] **Step 1: 테이블에 키워드 준수 컬럼 추가**

- keywordCompliance 값에 따라 뱃지 표시
- pass → 초록 "통과", fail → 빨강 "미달", null → 회색 "미지정"

- [ ] **Step 2: 헤더에 전체 준수율 표시**

- 전체 업데이트 중 pass 비율 계산
- "키워드 준수율: 85% (17/20)" 형태

- [ ] **Step 3: 커밋**

```bash
git commit -m "feat(gbp): show keyword compliance in updates list"
```
