# GBP 자동 진단 리포트 설계

## 목적
작업자가 수동으로 만들던 주간/월간 GBP 퍼포먼스 리포트를 자동화.
기존 고객 리텐션 + 신규 영업 겸용.

## 접근 방식
gbp-local 확장 (방식 1). 이미 DataForSEO 스캔 + PPT 리포트 엔진이 있으므로, Notion 연동 + 스케줄 훅만 추가.

## 데이터 모델

### clients.json 확장
```jsonc
{
  "id": "client-1",
  "name": "협조병원1",
  "bizName": "협조병원1",
  "lat": 37.4979,
  "lng": 127.0276,
  "keywords": ["강남 성형외과", "강남 코성형", "rhinoplasty gangnam"],
  "gridSize": 5,
  "gridSpacing": 1.5,
  "schedule": "weekly",
  "notionPageId": "xxx-xxx",
  "active": true
}
```

### Notion [Nova]프로젝트 DB 추가 속성
- `타겟 키워드` (rich_text) — 쉼표 구분
- `위도/경도` (rich_text) — "37.4979, 127.0276"
- `스캔 주기` (select) — weekly / monthly / both
- `GBP Client ID` (rich_text) — clients.json id 매칭

동기화 방향: Notion → clients.json (`gbp sync-config`)

## CLI 명령

```
gbp sync-config                # Notion → clients.json 동기화
gbp scan [clientId]            # 특정 클라이언트 스캔
gbp scan-all [--weekly|--monthly]  # 일괄 스캔
gbp report weekly [clientId]   # 주간 PPT 생성
gbp report monthly [clientId]  # 월간 PPT 생성
gbp report-all [--weekly|--monthly]  # 일괄 리포트 생성
```

## 리포트 PPT 구조

키워드당 2슬라이드, 작업자 리포트와 동일 레이아웃:

```
1. 표지 (병원명, 기간, 우리 회사 브랜딩)
2~N. 키워드별 반복:
   - A: 히트맵 비교 (전주/전월 vs 이번주/이번달 나란히)
   - B: 히트맵 확대 + 순위 변동 수치
N+1. 종료 슬라이드
```

히트맵 이미지: heatmap-html.ts → Playwright headless 캡처 → PPT 삽입
데이터 비교: rankings-{id}.json에서 최근 2회 스캔 비교

## 아카이빙

```
output/
├── {clientId}/
│   ├── weekly/
│   │   ├── 2026-03-31.pptx
│   │   └── ...
│   └── monthly/
│       ├── 2026-03.pptx
│       └── ...
└── index.json   ← 전체 리포트 목록 (날짜, 경로, 클라이언트)
```

## 오케스트레이터 연동

| 시각 | 작업 | 내용 |
|------|------|------|
| 매주 월 07:00 | weekly_scan_and_report | scan-all --weekly → report-all --weekly → 텔레그램 알림 |
| 매월 1일 07:30 | monthly_scan_and_report | scan-all --monthly → report-all --monthly → 텔레그램 알림 |

호출 방식: subprocess (`npx tsx src/cli.ts [명령]`, cwd=gbp-local)

텔레그램 알림: 클라이언트별 키워드 수, 평균 순위 변동 요약

## gbp-local 파일 구조 (리팩토링)

```
gbp-local/src/
├── cli.ts                  — 진입점
├── config/
│   └── notion-sync.ts      — Notion → clients.json
├── scan/
│   ├── dataforseo.ts       — DataForSEO API
│   └── batch.ts            — 일괄 스캔
├── report/
│   ├── template-engine.ts  — PPT 엔진
│   ├── pptx-renderer.ts    — 렌더링 유틸
│   ├── heatmap-image.ts    — 히트맵 → 이미지 (신규)
│   ├── weekly.ts           — 주간 PPT (신규)
│   ├── monthly.ts          — 월간 PPT (신규)
│   ├── archive.ts          — 아카이빙 (신규)
│   ├── slides/             — 슬라이드 빌더
│   └── templates/          — JSON 템플릿
├── gbp/
│   ├── client.ts           — GBP API
│   ├── reviews.ts          — 리뷰 동기화
│   └── write.ts            — GBP 쓰기
└── shared/
    ├── store.ts            — JSON 저장소
    ├── env.ts              — 환경변수
    └── telegram.ts         — 텔레그램
```

## 비용 추정
- DataForSEO: 클라이언트당 3키워드 × 25포인트 = 75태스크 ≈ $n/클라이언트/회
- N개 클라이언트 주간: ~$n/주
- Playwright: 무료 (로컬 실행)

## 리포트 양식
1차 결과물 확인 후 사용자 피드백으로 조정 예정.
