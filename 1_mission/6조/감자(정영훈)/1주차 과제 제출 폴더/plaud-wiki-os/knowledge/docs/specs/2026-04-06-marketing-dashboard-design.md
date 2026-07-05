> NOTE 2026-05-03 — gbp-dashboard 폐기됨. 이 설계서의 gbp-dashboard 패턴 참조는 유효하지 않음.

# Marketing Dashboard — 전 채널 통합 대시보드 설계

## 개요

LinkedIn, 뉴스레터(Beehiiv), Threads, Instagram, Meta Ads — 5개 마케팅 채널의 콘텐츠와 성과를 한 화면에서 보고 관리하는 내부 운영 대시보드.

**핵심 가치:** 각 엔진이 독립적으로 돌아가는 현재 구조에서, 전체 퍼널 현황 파악 + 콘텐츠 수정/스케줄 조정을 대시보드 하나에서 해결.

**사용자:** 본인만 (단, 외부 네트워크 접근 필요 → Vercel 배포)

## 아키텍처

```
┌─────────────┐    INSERT     ┌──────────────┐
│ content-eng  │──────────────▶│              │
│ threads-bot  │──────────────▶│   Supabase   │
│ insta-engine │──────────────▶│  (공유 DB)   │
│ orchestrator │──────────────▶│              │
└─────────────┘               └──────┬───────┘
                                     │ SELECT
                              ┌──────▼───────┐
                              │  marketing-  │
                              │  dashboard   │
                              │  (Next.js)   │
                              └──────────────┘
```

- 각 엔진이 Supabase에 직접 INSERT (JSONL 백업 유지)
- 대시보드는 SELECT만 + 콘텐츠 수정 시 UPDATE
- GBP 대시보드와 같은 Supabase 인스턴스, `mkt_` 접두어로 테이블 분리
- 프로젝트는 `marketing-dashboard/`로 GBP 대시보드와 완전 분리

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 프레임워크 | Next.js 15 (App Router) | GBP 대시보드 동일, 코드 재사용 |
| UI | shadcn/ui + Tailwind CSS 4 | GBP 대시보드 동일 |
| DB | Supabase PostgreSQL + Drizzle ORM | GBP 대시보드 동일 인스턴스 |
| 차트 | Recharts | GBP 대시보드 동일 |
| 인증 | 쿠키 기반 단순 인증 | GBP middleware.ts 동일 패턴 |
| 배포 | Vercel (Free) | GBP 대시보드 동일 |

## DB 스키마

### mkt_contents — 전 채널 콘텐츠 통합

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| channel | enum | linkedin, newsletter, threads, instagram, meta_ads |
| source_script | text? | 원본 릴스 스크립트 파일명 |
| title | text | 콘텐츠 제목/훅 |
| body | text | 본문 텍스트 |
| status | enum | draft, queued, published, failed |
| scheduled_at | timestamptz? | 발행 예정 시각 |
| published_at | timestamptz? | 실제 발행 시각 |
| external_id | text? | LinkedIn post ID, Beehiiv post ID 등 |
| external_url | text? | 발행된 URL |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### mkt_metrics — 성과 메트릭 (시계열)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| content_id | uuid FK | → mkt_contents |
| channel | enum | |
| fetched_at | timestamptz | 수집 시점 |
| impressions | int | |
| clicks | int | |
| likes | int | |
| comments | int | |
| shares | int | |
| saves | int | |
| followers_delta | int | 팔로워 증감 |
| extra | jsonb | 채널 고유 메트릭 (open_rate, ctr, cpc, roas 등) |

### mkt_channel_stats — 채널별 일간 집계 (KPI 카드용)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| channel | enum | |
| date | date | |
| total_impressions | int | |
| total_clicks | int | |
| total_spend | int | Meta Ads 전용 (원 단위) |
| total_conversions | int | |
| followers_count | int | |
| extra | jsonb | |

### mkt_ad_campaigns — Meta Ads 캠페인

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| campaign_id | text | Meta campaign ID |
| campaign_name | text | |
| status | enum | active, paused, completed |
| budget_daily | int | 원 단위 |
| spend_total | int | |
| impressions | int | |
| clicks | int | |
| ctr | numeric | |
| cpc | int | |
| conversions | int | |
| roas | numeric | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### mkt_ad_daily — Meta Ads 일간 시계열

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| campaign_id | text FK | → mkt_ad_campaigns.campaign_id |
| date | date | |
| spend | int | 원 단위 |
| impressions | int | |
| clicks | int | |
| conversions | int | |
| conversion_value | int | 전환 가치 (원 단위, 리드당 추정가치 × 전환수) |
| ctr | numeric | |
| cpc | int | |
| roas | numeric | |

## 화면 구성

### 메인 대시보드 (/dashboard)

**상단 KPI 카드 4개:**
- 총 노출 (전 채널 합산, 주간 변동률)
- 총 전환 (상담 신청 등, 주간 변동률)
- 광고 지출 (Meta Ads, 주간 변동률)
- ROI (전환 가치 / 지출, 주간 변동률)

**왼쪽: 콘텐츠 큐**
- 다음 7일 발행 예정 콘텐츠 목록
- 채널별 컬러 코드 (LinkedIn=#0077b5, Newsletter=#ff6b35, Threads=#000, Instagram=#e1306c, Ads=#1877f2)
- 각 항목: 채널 아이콘 + 제목 + 예정일시 + 상태
- ✏️ 클릭 → 인라인 수정 모달 (본문 편집 + 스케줄 변경)

**오른쪽: 채널별 성과**
- 바 차트 (채널별 노출 비교)
- 기간 필터: 7일 / 30일 / 90일
- 채널별 핵심 메트릭 요약 행

### 채널별 상세 페이지

**LinkedIn (/dashboard/linkedin)**
- 발행 이력 테이블 (제목, 발행일, 노출, 좋아요, 댓글, 클릭)
- 팔로워 증감 추이 차트
- 큐 관리 (queued 상태 편집/순서 변경)

**Newsletter (/dashboard/newsletter)**
- 구독자 수 추이 차트
- 발행 이력 (제목, 오픈율, 클릭율, 해지율)
- draft 상태 초안 편집

**Threads (/dashboard/threads)**
- 포스트 이력 (좋아요, 리포스트)
- 팔로워 추이

**Instagram (/dashboard/instagram)**
- 릴스 성과 (조회수, 좋아요, 저장, 팔로워 증감)
- 팔로워 추이

**Meta Ads (/dashboard/ads)**
- 캠페인 목록 (상태, 예산, 지출, CTR, CPC, ROAS)
- 일간 지출/전환 추이 차트
- 크리에이티브별 성과 (mkt_contents와 조인)

## 데이터 흐름

### 엔진 → Supabase (INSERT)

| 엔진 | 트리거 | 대상 테이블 |
|------|--------|------------|
| content-engine/transformer.py | 변환 완료 | mkt_contents (status: queued) |
| content-engine/linkedin.py | 발행 성공 | mkt_contents UPDATE (status: published) |
| content-engine/linkedin.py | 24h/72h 후 | mkt_metrics INSERT |
| content-engine/newsletter.py | 초안 생성 | mkt_contents (status: draft) |
| content-engine/newsletter.py | 발행 | mkt_contents UPDATE (status: published) |
| content-engine/newsletter.py | 24h/7d 후 | mkt_metrics INSERT |
| threads-bot | 발행 시 | mkt_contents INSERT (status: published) |
| threads-bot | 24h/72h 후 | mkt_metrics INSERT |
| instagram-engine | 릴스 발행 기록 시 | mkt_contents INSERT (status: published) |
| instagram-engine | 24h/72h 후 | mkt_metrics INSERT |
| orchestrator (MetaAdsAPI) | 매일 09:00 | mkt_ad_campaigns UPSERT + mkt_channel_stats INSERT |

### 메트릭 수집 타이밍

| 채널 | 수집 시점 | 방식 |
|------|----------|------|
| LinkedIn | 발행 24h 후 + 72h 후 | APScheduler delayed job |
| Newsletter | 발행 24h 후 + 7d 후 | APScheduler delayed job |
| Threads | 발행 24h 후 + 72h 후 | APScheduler delayed job |
| Instagram | 발행 24h 후 + 72h 후 | APScheduler delayed job |
| Meta Ads | 매일 09:00 | APScheduler cron job |

### 대시보드 → 엔진 (콘텐츠 수정)

대시보드가 `mkt_contents`의 body/scheduled_at을 직접 UPDATE. 엔진은 발행 시점에 DB에서 `status: queued AND scheduled_at ≤ now()` 조건으로 재조회 후 발행. APScheduler job은 고정 시각(평일 10:00 등)에 실행되되, 실제 발행 대상은 항상 DB 기준. 대시보드↔엔진 직접 통신 없음.

**Newsletter 고유 메트릭:** 해지율(unsubscribe_rate)은 `mkt_metrics.extra` jsonb에 `{"unsubscribe_rate": 0.8}` 형태로 저장.

## 엔진 수정 범위

각 Python 엔진에 최소한의 변경:

1. `supabase-py` 의존성 추가 (requirements.txt)
2. Supabase 클라이언트 초기화 (config.py에 URL + KEY)
3. 발행/메트릭 저장 함수에 INSERT 1줄 추가
4. 기존 JSONL 저장 로직은 그대로 유지 (백업)

## 인증

GBP 대시보드와 동일한 쿠키 기반 단순 인증:
- `mkt_auth` 쿠키
- `/login` 페이지에서 비밀번호 입력
- middleware.ts에서 쿠키 검증
- API routes도 동일 쿠키로 보호

## 파일 구조

```
marketing-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── login/page.tsx
│   │   └── dashboard/
│   │       ├── page.tsx              — Overview
│   │       ├── linkedin/page.tsx
│   │       ├── newsletter/page.tsx
│   │       ├── threads/page.tsx
│   │       ├── instagram/page.tsx
│   │       └── ads/page.tsx
│   ├── components/
│   │   ├── kpi-cards.tsx
│   │   ├── content-queue.tsx
│   │   ├── channel-chart.tsx
│   │   ├── content-editor.tsx
│   │   └── schedule-picker.tsx
│   ├── db/
│   │   ├── schema/index.ts
│   │   └── queries.ts
│   ├── lib/
│   │   └── env.ts
│   └── middleware.ts
├── drizzle.config.ts
├── package.json
├── .env
├── CLAUDE.md
└── README.md
```

## 성과 메트릭 상세

### 채널별 기본 메트릭

| 채널 | 메트릭 |
|------|--------|
| LinkedIn | 노출, 좋아요, 댓글, 클릭, 팔로워 증감 |
| Newsletter | 구독자 수, 오픈율, 클릭율, 구독 해지율 |
| Meta Ads | 지출, 노출, 클릭, CTR, CPC, 전환, ROAS |
| Threads | 좋아요, 리포스트, 팔로워 증감 |
| Instagram | 릴스 조회수, 좋아요, 저장, 팔로워 증감 |

### 상단 KPI 카드 (전 채널 합산)

1. **총 노출** — 전 채널 impressions 합산
2. **��� 전환** — 상담 신청 + 구독 + 폼 제출
3. **광고 지출** — Meta Ads spend
4. **ROI** — mkt_ad_daily.conversion_value 합산 / spend 합산 (리드당 추정가치는 settings에서 수동 설정, 초기값 n원)

## 결정 요약

| 항목 | 결정 |
|------|------|
| 아키텍처 | 독립 프로젝트 + Supabase 공유 DB |
| 데이터 흐름 | 엔진 → Supabase 직접 INSERT |
| 콘텐츠 수정 | 초안 수정 + 스케줄 조정 (대시보드 → DB UPDATE) |
| 채널 범위 | 5채널 동시 구축 |
| 인증 | 쿠키 기반 단순 인증 (GBP 동일) |
| 스택 | Next.js 15 + shadcn/ui + Drizzle + Supabase + Vercel |
| GBP 대시보드 관계 | 완전 분리 (고객용 vs 내부 운영용) |
