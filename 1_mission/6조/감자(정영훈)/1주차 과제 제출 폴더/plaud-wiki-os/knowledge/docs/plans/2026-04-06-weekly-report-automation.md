# 주간 보고서 자동생성 구현 계획

> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. Vercel Production(`app-blue-nu-93.vercel.app`) 비활성화 권장. 이 문서는 아카이브 이력용으로 보존.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 11개 거래처 GBP 주간 보고서를 DataForSEO 스캔 데이터 + GBP 인사이트 + 리뷰 데이터로 100% 자동 생성하여 텔레그램 전송

**Architecture:** scan-all.ts가 DataForSEO 결과를 local_rankings DB에 저장 → Vercel Cron이 DB 읽어서 PptxGenJS로 PPT 생성 → 텔레그램 전송. 기존 template-engine 패턴 따름.

**Tech Stack:** Next.js 15, PptxGenJS, Drizzle ORM, Supabase PostgreSQL, Telegram Bot API, DataForSEO

**Spec:** `docs/superpowers/specs/2026-04-06-weekly-report-automation-design.md`

---

## 파일 구조

### 신규 생성
| 파일 | 역할 |
|------|------|
| `src/lib/reports/weekly-aggregator.ts` | 주간 보고서용 데이터 수집 (인사이트+랭킹+리뷰+업데이트+경쟁사) |
| `src/lib/reports/slides/weekly-cover.ts` | 커버 슬라이드 (거래처명+업종+기간+목차) |
| `src/lib/reports/slides/interactions.ts` | 고객 상호작용 슬라이드 (프로필 상호작용+경로요청) |
| `src/lib/reports/slides/views-search.ts` | 조회수 & 검색어 슬라이드 |
| `src/lib/reports/slides/keyword-ranking.ts` | 키워드별 랭킹 슬라이드 (히트맵+경쟁사, 키워드당 1장) |
| `src/lib/reports/slides/review-update.ts` | 리뷰 & 업데이트 슬라이드 |
| `src/lib/reports/templates/weekly-full.json` | 풀스펙 주간 템플릿 |
| `src/app/api/reports/weekly/route.ts` | 수동 트리거 API |
| `src/app/api/cron/weekly-report/route.ts` | Cron 자동 생성 오케스트레이터 |

### 수정
| 파일 | 변경 내용 |
|------|----------|
| `src/lib/reports/template-engine.ts` | perKeyword 반복 로직 + 신규 빌더 등록 |
| `src/lib/reports/slides/review-summary.ts` | 언어분포 파이차트 병합 |
| `src/db/schema/local-rankings.ts` | metadata JSONB 컬럼 추가 |
| `scripts/scan-all.ts` | local_rankings DB INSERT + clientId 매핑 |
| `vercel.json` | weekly-report cron 추가 |
| `drizzle/0009_add_rankings_metadata.sql` | 마이그레이션 |

---

## Task 1: local_rankings에 metadata 컬럼 추가

**Files:**
- Create: `drizzle/0009_add_rankings_metadata.sql`
- Modify: `src/db/schema/local-rankings.ts`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
ALTER TABLE local_rankings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

- [ ] **Step 2: Drizzle 스키마에 metadata 컬럼 추가**

`src/db/schema/local-rankings.ts`에 추가:
```typescript
metadata: jsonb('metadata').default({}),
```

- [ ] **Step 3: 마이그레이션 실행**

```bash
PGPASSWORD="..." psql -h aws-1-ap-northeast-1.pooler.supabase.com -p 6543 -U postgres.zewudvxuavpyxicybqud -d postgres -f drizzle/0009_add_rankings_metadata.sql
```
Expected: `ALTER TABLE`

- [ ] **Step 4: 커밋**

```bash
git add drizzle/0009_add_rankings_metadata.sql src/db/schema/local-rankings.ts
git commit -m "feat: add metadata jsonb to local_rankings for competitor data"
```

---

## Task 2: scan-all.ts에 local_rankings DB INSERT 추가

**Files:**
- Modify: `scripts/scan-all.ts`

- [ ] **Step 1: clients 테이블에서 notion_page_id → clientId 매핑 함수 추가**

`scan-all.ts` 상단에 추가:
```typescript
async function getClientIdByName(hospitalName: string): Promise<string | null> {
  const result = await pgClient.query(
    `SELECT id FROM clients WHERE name = $1 AND is_active = true LIMIT 1`,
    [hospitalName]
  );
  return result.rows[0]?.id ?? null;
}
```

- [ ] **Step 2: 스캔 결과를 local_rankings에 INSERT하는 함수 추가**

```typescript
async function saveToLocalRankings(
  clientId: string,
  scanResult: ScanResult,
  scanDate: string
): Promise<void> {
  await pgClient.query(
    `INSERT INTO local_rankings (client_id, keyword, grid_size, grid_data, avg_rank, top3_percentage, scan_date, metadata)
     VALUES ($1, $2, '5x5', $3, $4, $5, $6, $7)`,
    [
      clientId,
      scanResult.keyword,
      JSON.stringify(scanResult.gridData),
      scanResult.arp.toFixed(1),
      scanResult.solv.toFixed(1),
      scanDate,
      JSON.stringify({
        competitors: scanResult.competitors.slice(0, 5).map(c => ({
          name: c.name, rating: c.rating, reviews: c.reviewCount, rank: c.avgRank,
        })),
        atrp: scanResult.atrp,
        radiusKm: scanResult.radiusKm,
        source: "dataforseo",
      }),
    ]
  );
}
```

- [ ] **Step 3: 메인 루프에서 스캔 후 DB 저장 호출**

병원별 루프 내, `updateKeywordResult()` 호출 직후에 추가:
```typescript
const clientId = await getClientIdByName(hospital.name);
if (clientId) {
  await saveToLocalRankings(clientId, scanResult, today);
} else {
  console.warn(`[WARN] clientId not found for "${hospital.name}", skipping DB insert`);
}
```

- [ ] **Step 4: 테스트 — dry-run으로 매핑 확인**

```bash
cd gbp-dashboard/app && npx tsx scripts/scan-all.ts --dry-run
```
Expected: 거래처 목록 출력, 매핑 실패 경고 없음

- [ ] **Step 5: 커밋**

```bash
git add scripts/scan-all.ts
git commit -m "feat: scan-all.ts saves results to local_rankings DB"
```

---

## Task 3: weekly-aggregator.ts 작성

**Files:**
- Create: `src/lib/reports/weekly-aggregator.ts`

- [ ] **Step 1: WeeklyData 인터페이스 정의**

```typescript
export interface WeeklyData {
  client: {
    id: string;
    name: string;
    category: string;
    targetCountries: string[];
    contractStatus: string;
  };
  period: { start: string; end: string; prevStart: string; prevEnd: string };
  interactions: {
    profileInteractions: number;
    prevProfileInteractions: number;
    directionRequests: number;
    prevDirectionRequests: number;
  };
  views: {
    total: number;
    prevTotal: number;
    byPlatform: { label: string; value: number }[];
  };
  keywords: {
    keyword: string;
    gridData: number[][];
    avgRank: number;
    top3Percentage: number;
    atrp: number;
    competitors: { name: string; rating: number; reviews: number; rank: number }[];
    prevAvgRank: number | null;
  }[];
  reviews: {
    total: number;
    avgRating: number;
    newCount: number;
    deletedCount: number;
    flaggedCount: number;
    prevTotal: number;
    prevAvgRating: number;
    languageDist: { language: string; count: number }[];
    recent: { authorName: string; rating: number; comment: string; language: string; publishedAt: Date }[];
  };
  updates: {
    title: string;
    updateType: string;
    createdAt: Date;
  }[];
}
```

- [ ] **Step 2: aggregateWeeklyData 함수 구현**

DB에서 데이터 수집:
- `clients` → 기본 정보
- `gbp_insights` → 이번주 vs 전주 (searchViews, mapViews, websiteClicks, phoneCalls, directionClicks)
- `local_rankings` → 최신 스캔 + 이전 스캔 (keyword, gridData, avgRank, top3Percentage, metadata)
- `reviews` → 이번주 신규/삭제/악성 + 언어분포 + 최근 3건
- `gbp_updates` → 이번주 포스트 목록

```typescript
export async function aggregateWeeklyData(clientId: string): Promise<WeeklyData> {
  // 기간 계산: 이번주 월~일, 전주 월~일
  // 각 테이블에서 Drizzle 쿼리
  // WeeklyData 조립하여 반환
}
```

- [ ] **Step 3: 빌드 확인**

```bash
cd gbp-dashboard/app && npx tsc --noEmit
```
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/lib/reports/weekly-aggregator.ts
git commit -m "feat: weekly data aggregator for full-spec report"
```

---

## Task 4: 신규 슬라이드 빌더 5개 작성

**Files:**
- Create: `src/lib/reports/slides/weekly-cover.ts`
- Create: `src/lib/reports/slides/interactions.ts`
- Create: `src/lib/reports/slides/views-search.ts`
- Create: `src/lib/reports/slides/keyword-ranking.ts`
- Create: `src/lib/reports/slides/review-update.ts`

### 4-1: weekly-cover.ts

- [ ] **Step 1: 커버 슬라이드 빌더 작성**

```typescript
// 거래처명 (38pt, secondaryColor) + 업종 배지
// 보고 기간: "2026.03.31 ~ 2026.04.06"
// 목차: 01 고객 상호작용 / 02 조회수 / 03 키워드 랭킹 / 04 리뷰
// 하단: 우리 회사 로고 텍스트
```

기존 `cover.ts`를 참고하되, 업종 배지(category → 한국어 라벨)와 키워드 수 표시 추가.

- [ ] **Step 2: 커밋**

### 4-2: interactions.ts

- [ ] **Step 3: 고객 상호작용 슬라이드 빌더 작성**

```typescript
// 좌측: 프로필 상호작용 카드 (이번주 수치 + 전주 대비 ▲/▼ %)
// 우측: 경로요청 카드 (동일 구조)
// 하단: "프로필 상호작용 = 전화 + 메시지 + 예약 + 경로" 설명 텍스트
```

기존 `gbp-insights.ts`의 KPI 카드 패턴 재사용. `addTitle`, 테마 적용.

- [ ] **Step 4: 커밋**

### 4-3: views-search.ts

- [ ] **Step 5: 조회수 슬라이드 빌더 작성**

```typescript
// 좌측: 이번주 총 조회수 (큰 숫자) + 전주 대비 변동
// 우측: 플랫폼별 분포 바차트 (지도-모바일, 검색-모바일, 검색-데스크톱, 지도-데스크톱)
```

`addBarChart` 활용. `views.byPlatform` 데이터로 렌더링.

- [ ] **Step 6: 커밋**

### 4-4: keyword-ranking.ts (핵심)

- [ ] **Step 7: 키워드별 랭킹 슬라이드 빌더 작성**

```typescript
// 이 빌더는 키워드당 1회 호출됨 (template-engine에서 반복)
// 
// 상단: 키워드 텍스트 + ARP/ATRP/SoLV 배지 3개
// 좌측 (60%): 5x5 히트맵 그리드
//   - 각 셀: 사각형 도형 + 순위 숫자
//   - 색상: 1-3 초록(C8E6C9), 4-10 노랑(FFF9C4), 11+ 빨강(FFCDD2), 0 회색(E0E0E0)
//   - 중앙 셀: ★ 마커 (비즈니스 위치)
// 우측 (40%): 경쟁사 Top 5 테이블
//   - 순위, 업체명, 평점, 리뷰수
// 하단: 전주 대비 순위 변동 텍스트 ("2위 → 1위 ▲")
```

기존 `ranking-heatmap.ts`의 그리드 렌더링 코드를 참고하되, 키워드당 1장으로 분리.
`metadata.competitors`에서 경쟁사 데이터 조회.

- [ ] **Step 8: 커밋**

### 4-5: review-update.ts

- [ ] **Step 9: 리뷰 & 업데이트 슬라이드 빌더 작성**

```typescript
// 좌측 (50%): GBP 포스트 목록 (최대 2건)
//   - 포스트 제목 + 유형 + 날짜
// 우측 (50%): 최근 리뷰 (최대 3건)
//   - 작성자 + 별점 + 코멘트 (truncate 100자) + 언어 배지
// 하단: "이번 주 발행 소식글 N건, 신규 리뷰 N건" 요약
```

- [ ] **Step 10: 커밋**

```bash
git add src/lib/reports/slides/weekly-cover.ts src/lib/reports/slides/interactions.ts src/lib/reports/slides/views-search.ts src/lib/reports/slides/keyword-ranking.ts src/lib/reports/slides/review-update.ts
git commit -m "feat: 5 new slide builders for weekly full report"
```

---

## Task 5: template-engine 수정 + 템플릿 등록

**Files:**
- Modify: `src/lib/reports/template-engine.ts`
- Create: `src/lib/reports/templates/weekly-full.json`

- [ ] **Step 1: SLIDE_BUILDER_MAP에 신규 빌더 5개 등록**

`template-engine.ts`에 import 추가 + MAP에 등록:
```typescript
import { buildWeeklyCoverSlide } from "./slides/weekly-cover";
import { buildInteractionsSlide } from "./slides/interactions";
import { buildViewsSearchSlide } from "./slides/views-search";
import { buildKeywordRankingSlide } from "./slides/keyword-ranking";
import { buildReviewUpdateSlide } from "./slides/review-update";

// SLIDE_BUILDER_MAP에 추가:
"weekly-cover": buildWeeklyCoverSlide,
"interactions": buildInteractionsSlide,
"views-search": buildViewsSearchSlide,
"keyword-ranking": buildKeywordRankingSlide,
"review-update": buildReviewUpdateSlide,
```

- [ ] **Step 2: generateReport에 perKeyword 반복 로직 추가**

`generateReport()` 함수의 슬라이드 루프 내:
```typescript
for (const slideTemplate of template.slides) {
  if (!slideTemplate.enabled) continue;
  const builder = SLIDE_BUILDER_MAP[slideTemplate.type];
  if (!builder) continue;

  if (slideTemplate.options?.perKeyword && 'keywords' in data && Array.isArray(data.keywords)) {
    // 키워드당 1장씩 반복
    for (const kw of data.keywords) {
      builder(pptx, { ...data, currentKeyword: kw }, slideTemplate, theme);
    }
  } else {
    builder(pptx, data, slideTemplate, theme);
  }
}
```

- [ ] **Step 3: weekly-full.json 템플릿 작성**

```json
{
  "name": "Weekly Full Report",
  "type": "weekly",
  "slides": [
    { "type": "weekly-cover", "enabled": true },
    { "type": "interactions", "enabled": true },
    { "type": "views-search", "enabled": true },
    { "type": "keyword-ranking", "enabled": true, "options": { "perKeyword": true } },
    { "type": "review-summary", "enabled": true },
    { "type": "review-update", "enabled": true },
    { "type": "changes-actions", "enabled": true }
  ],
  "theme": {
    "primaryColor": "1B2A4A",
    "secondaryColor": "6B4EFF",
    "fontFamily": "Malgun Gothic",
    "fontSize": { "title": 24, "body": 12, "small": 9 }
  }
}
```

- [ ] **Step 4: 빌드 확인**

```bash
cd gbp-dashboard/app && npx tsc --noEmit
```

- [ ] **Step 5: 커밋**

```bash
git add src/lib/reports/template-engine.ts src/lib/reports/templates/weekly-full.json
git commit -m "feat: register weekly builders + perKeyword loop + weekly-full template"
```

---

## Task 6: 수동 트리거 API

**Files:**
- Create: `src/app/api/reports/weekly/route.ts`

- [ ] **Step 1: POST /api/reports/weekly 라우트 작성**

```typescript
// Body: { clientId: string }
// 1. aggregateWeeklyData(clientId)
// 2. loadTemplate("weekly-full.json")
// 3. generateReport(template, data)
// 4. reports 테이블에 메타데이터 기록
// 5. PPTX 바이너리 응답 (Content-Disposition: attachment)
```

- [ ] **Step 2: 빌드 확인**

```bash
cd gbp-dashboard/app && npx next build 2>&1 | tail -5
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/reports/weekly/route.ts
git commit -m "feat: POST /api/reports/weekly manual trigger"
```

---

## Task 7: Cron 오케스트레이터

**Files:**
- Create: `src/app/api/cron/weekly-report/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Cron 엔드포인트 작성**

```typescript
// GET /api/cron/weekly-report (cron secret 인증)
// 1. 활성 거래처 목록 조회 (is_active=true, contract_status='active')
// 2. 거래처별 fan-out: fetch /api/reports/weekly { clientId }
//    - Promise.allSettled로 병렬 실행
// 3. 성공한 건: 텔레그램 sendDocument(buffer, filename)
// 4. 실패한 건: 에러 로그
// 5. 완료 요약 텔레그램 메시지: "주간보고 N/M건 생성 완료"
```

- [ ] **Step 2: vercel.json에 cron 추가**

```json
{
  "path": "/api/cron/weekly-report",
  "schedule": "0 22 * * 0"
}
```
(일요일 22:00 UTC = 월요일 07:00 KST)

- [ ] **Step 3: 빌드 확인**

```bash
cd gbp-dashboard/app && npx next build 2>&1 | tail -5
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/cron/weekly-report/route.ts vercel.json
git commit -m "feat: weekly report cron orchestrator with fan-out"
```

---

## Task 8: 통합 테스트 + 배포

- [ ] **Step 1: 단건 수동 생성 테스트**

대시보드에서 또는 curl로:
```bash
curl -X POST https://app-blue-nu-93.vercel.app/api/reports/weekly \
  -H "Content-Type: application/json" \
  -d '{"clientId":"dcb50b1a-b426-4335-9bcb-34801b336111"}' \
  --output test-weekly.pptx
```
Expected: 협조병원1 주간보고서 PPTX 다운로드

- [ ] **Step 2: PPT 내용 검증**

열어서 확인:
- 커버: 거래처명 + 기간
- 상호작용: 수치 표시 (데이터 없으면 0 표시)
- 키워드별 히트맵: 키워드 수만큼 슬라이드
- 리뷰: 최근 리뷰 텍스트
- 변경사항: 자동 감지 결과

- [ ] **Step 3: Vercel 프로덕션 배포**

```bash
cd gbp-dashboard/app && vercel --prod
```

- [ ] **Step 4: 텔레그램 전송 테스트**

Cron 엔드포인트 수동 호출:
```bash
curl -X GET "https://app-blue-nu-93.vercel.app/api/cron/weekly-report" \
  -H "Authorization: Bearer <CRON_SECRET>"
```
Expected: 텔레그램에 PPT 파일 수신

- [ ] **Step 5: 최종 커밋**

```bash
git add -A
git commit -m "feat: weekly report automation - full pipeline deployed"
```
