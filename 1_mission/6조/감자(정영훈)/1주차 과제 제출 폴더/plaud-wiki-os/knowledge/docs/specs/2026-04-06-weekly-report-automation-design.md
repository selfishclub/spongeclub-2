> DEPRECATED 2026-05-03 — gbp-dashboard 폐기. 이 문서는 아카이브 이력용으로 보존.

# 주간 보고서 자동생성 설계서

**작성일:** 2026-04-06
**목적:** N개 거래처 GBP 주간 보고서를 100% 자동 생성 (작업자 대체)

---

## 1. 보고서 구조 (풀스펙 단일 양식)

모든 거래처에 동일 양식 적용. 슬라이드 수는 키워드 수에 따라 가변.

| 순서 | 슬라이드 | 데이터 소스 | 비고 |
|------|----------|------------|------|
| 1 | 커버 | clients 테이블 | 거래처명 + 기간 + 목차 |
| 2 | 고객 상호작용 | gbp_insights | 프로필 상호작용 + 경로요청, 전주 대비 |
| 3 | 조회수 & 검색어 | gbp_insights | 플랫폼별 분포 + 전주 비교 |
| 4~N | 키워드별 랭킹 | local_rankings | 히트맵 이미지 + ARP/ATRP/SoLV + 경쟁사 Top 5 (키워드당 1장) |
| N+1 | 리뷰 요약 | reviews | 신규/삭제/악성 + 평점 변동 + 언어 분포 |
| N+2 | 리뷰 & 업데이트 | reviews + gbp_updates | 최근 리뷰 텍스트 + GBP 포스트 목록 |
| N+3 | 변경사항 & 액션 | 자동 감지 | 순위 변동 경고 + 권장 조치 |

**예시:** 키워드 5개 거래처 → 5 + 4 = 9장

---

## 2. 아키텍처

```
[Vercel Cron 매주 월요일 07:00 KST]
    │
    ▼
[/api/cron/weekly-report] (GET, cron secret 인증)
    │
    ├─ getAllActiveClients()
    │
    ▼ (거래처별 루프)
[WeeklyReportGenerator]
    │
    ├─ aggregateWeeklyData(clientId)
    │   ├─ GBP Insights (전주 vs 이번주)
    │   ├─ local_rankings (최신 스캔 데이터 + gridData)
    │   ├─ reviews (신규/삭제/악성)
    │   ├─ gbp_updates (최근 포스트)
    │   └─ competitors (키워드별 Top 5)
    │
    ├─ generateWeeklyPptx(data)
    │   └─ template-engine + 신규 슬라이드 빌더들
    │
    ├─ reports 테이블에 기록
    │
    └─ 텔레그램 전송 (PPT 파일)

[대시보드 UI] → [POST /api/reports/weekly] (수동 트리거)
    └─ 동일 파이프라인, 단건 실행
```

---

## 3. 신규 슬라이드 빌더

기존 14개 빌더에 추가/수정:

| 빌더 | 신규/수정 | 설명 |
|------|----------|------|
| `weekly-cover` | 신규 | 거래처명 + 보고 기간 + 업종 배지 + 목차 |
| `interactions` | 신규 | 프로필 상호작용 + 경로요청 카드 (전주 대비 ▲/▼) |
| `views-search` | 신규 | 조회수 플랫폼별 분포 + 전주 비교 바차트 |
| `keyword-ranking` | 신규 | 히트맵 이미지(5x5 컬러 그리드) + ARP/ATRP/SoLV 배지 + 경쟁사 Top 5 테이블. 키워드당 1장, N회 반복 |
| `review-update` | 신규 | 최근 리뷰 텍스트(최대 3건) + GBP 포스트 목록(최대 2건) |
| `review-summary` | 수정 | 기존 빌더에 언어 분포 파이차트 병합 (별도 슬라이드 불필요) |
| `changes-actions` | 수정 | 기존 빌더 그대로 활용 |

---

## 4. 데이터 소스 통합

### DataForSEO → local_rankings 저장

`scan-all.ts`가 스캔 완료 후 Notion 업데이트와 동시에 `local_rankings` 테이블에도 INSERT.

```typescript
// scan-all.ts에 추가
await db.insert(localRankings).values({
  clientId,        // clients 테이블의 UUID (Notion hospitalName → clientId 매핑)
  keyword,
  gridSize: "5x5",
  gridData: scanResult.gridData,
  avgRank: scanResult.arp.toFixed(1),
  top3Percentage: scanResult.solv.toFixed(1),
  scanDate: scanResult.scanDate,
});
```

**매핑:** Notion "업장 관리" DB의 병원명 → `clients.name` 으로 매칭. 없으면 스킵 + 경고 로그.

### 경쟁사 데이터 저장

DataForSEO 스캔이 이미 `competitors` 목록을 반환함. 키워드별 경쟁사 Top 5를 `competitor_snapshots` 또는 별도 JSONB로 `local_rankings.metadata`에 저장.

**선택: `local_rankings`에 `metadata` JSONB 컬럼 추가.**

```sql
ALTER TABLE local_rankings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

`metadata` 구조:
```json
{
  "competitors": [
    { "name": "경쟁업체1", "rating": 4.5, "reviews": 81, "rank": 1 },
    ...
  ],
  "radiusKm": 1.5,
  "source": "dataforseo"
}
```

---

## 5. 히트맵 이미지 생성

PPT에 넣을 히트맵을 **PptxGenJS 네이티브 도형**으로 직접 렌더링 (외부 이미지 의존 없음):

```
┌─────────────────────────────────────────┐
│  keyword: "english speaking dentist"    │
│  ARP: 1.44  ATRP: 1.44  SoLV: 100%    │
│                                         │
│  ┌───┬───┬───┬───┬───┐                 │
│  │ 1 │ 1 │ 2 │ 1 │ 1 │  ← 5x5 그리드  │
│  ├───┼───┼───┼───┼───┤    초록(1-3)    │
│  │ 1 │ 2 │ 1 │ 3 │ 2 │    노랑(4-10)  │
│  ├───┼───┼───┼───┼───┤    빨강(11+)   │
│  │ 2 │ 1 │ ★ │ 1 │ 1 │    ★=비즈니스  │
│  ├───┼───┼───┼───┼───┤                 │
│  │ 3 │ 2 │ 1 │ 1 │ 2 │                 │
│  ├───┼───┼───┼───┼───┤  경쟁사 Top 5:  │
│  │ 1 │ 1 │ 2 │ 1 │ 1 │  1. AAA (4.9★) │
│  └───┴───┴───┴───┴───┘  2. BBB (4.8★) │
│                          3. CCC (4.7★) │
└─────────────────────────────────────────┘
```

기존 `ranking-heatmap.ts` 빌더가 이미 5x5 그리드를 PptxGenJS 도형으로 그리는 코드가 있음. 이를 확장하여:
- 좌측: 히트맵 그리드 (기존 코드 재사용)
- 우측 상단: ARP/ATRP/SoLV 배지
- 우측 하단: 경쟁사 Top 5 테이블

---

## 6. 주간 보고서 JSON 템플릿

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

`keyword-ranking`은 `perKeyword: true` 옵션으로 키워드 수만큼 슬라이드 반복 생성.

---

## 7. 트리거

### 자동 (Cron)

```
/api/cron/weekly-report  — 매주 월요일 07:00 KST (일요일 22:00 UTC)
```

`vercel.json` 추가:
```json
{ "path": "/api/cron/weekly-report", "schedule": "0 22 * * 0" }
```

흐름:
1. 전 거래처 순회 (is_active = true, contract_status = 'active')
2. 거래처별 PPT 생성
3. reports 테이블 기록
4. 텔레그램 전송 (거래처별 개별 파일)
5. 완료 요약 메시지

### 수동 (대시보드)

```
POST /api/reports/weekly  — body: { clientId: string }
```

대시보드 클라이언트 상세 페이지에 "주간 보고서 생성" 버튼 추가.

---

## 8. 파일 구조

```
src/lib/reports/
├── templates/
│   ├── weekly-full.json          ← 신규 (풀스펙 주간 템플릿)
│   ├── weekly.json               ← 기존 (유지)
│   └── ...
├── slides/
│   ├── weekly-cover.ts           ← 신규
│   ├── interactions.ts           ← 신규
│   ├── views-search.ts           ← 신규
│   ├── keyword-ranking.ts        ← 신규 (키워드당 반복)
│   ├── review-update.ts          ← 신규
│   ├── review-summary.ts         ← 수정 (언어분포 병합)
│   ├── changes-actions.ts        ← 기존 활용
│   └── ...
├── weekly-aggregator.ts          ← 신규 (주간 데이터 수집)
├── template-engine.ts            ← 수정 (perKeyword 반복 로직)
└── ...

src/app/api/
├── cron/weekly-report/route.ts   ← 신규
├── reports/weekly/route.ts       ← 신규 (수동 트리거)
└── ...

scripts/
└── scan-all.ts                   ← 수정 (local_rankings DB 저장 추가)
```

---

## 9. DB 변경

```sql
-- local_rankings에 metadata 컬럼 추가 (경쟁사 + 스캔 소스 정보)
ALTER TABLE local_rankings ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
```

---

## 10. 실행 아키텍처

**두 시스템은 명시적으로 분리:**

| 시스템 | 실행 방식 | 역할 |
|--------|----------|------|
| scan-all.ts | 로컬 ops-agent (launchd) | DataForSEO 스캔 → Notion 업데이트 + `local_rankings` DB INSERT |
| /api/cron/weekly-report | Vercel Cron | DB에서 데이터 읽기 → PPT 생성 → 텔레그램 전송 |

**실행 순서 (월요일):**
1. 06:00 KST — ops-agent가 `scan-all.ts` 실행 (DataForSEO → Notion + local_rankings INSERT)
2. 07:00 KST — Vercel Cron이 `/api/cron/weekly-report` 호출 (DB 읽기 → PPT → 텔레그램)

**scan-all.ts의 local_rankings INSERT:** Notion hospitalName → `clients.notion_page_id`로 매핑하여 clientId 확보. `notion_page_id`가 없는 거래처는 스킵 + 경고 로그.

### 전제 조건

- GBP Insights: 기존 `/api/cron/insights` (매일 21:00 UTC)
- 리뷰: 기존 `/api/cron/reviews` (매일 21:00 UTC)
- DataForSEO 스캔: ops-agent scan-all.ts (매주 월요일 06:00 KST)

### PPT 파일 처리

Vercel `/tmp`에 생성 → 텔레그램 Bot API로 전송 (50MB 이하) → `reports` 테이블에 메타데이터 기록. 영구 파일 저장 불필요 (텔레그램이 파일 보관).

### 타임아웃 대응

Vercel 함수 타임아웃(300초) 대비: 거래처별 PPT 생성을 개별 fetch 호출로 fan-out.
```
/api/cron/weekly-report (오케스트레이터)
  → fetch /api/reports/weekly { clientId: A } 
  → fetch /api/reports/weekly { clientId: B }
  → ... (Promise.allSettled)
```

---

## 11. 성공 기준

- N개 거래처 보고서가 월요일 아침 자동 생성됨
- 키워드별 히트맵 + 수치 + 경쟁사가 포함됨
- 리뷰/업데이트 현황이 반영됨
- 텔레그램으로 자동 전송됨
- 대시보드에서 수동 생성도 가능함
