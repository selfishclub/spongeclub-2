# 고단백 거지맵 — 단백질 g당 가격 효율 추천 토스 미니앱

## 개요

거지맵(가성비 식당 큐레이션)을 비틀어, **단백질 g당 가격 효율**로 메뉴를 줄세워주는 근손실 방어 식단 추천 토스 미니앱.

**한 줄**: "지금 내 위치 근처에서 단백질 1g 가장 싸게 채울 수 있는 메뉴는?"

**포지셔닝**: 토스 미니앱 입점 → 헬창·다이어터 자연 유입 → (V2) 단백질 보충제·도시락 정기구독 광고 또는 우리 회사 본업 리드 전환 보조.

## 핵심 개념: g/원 효율 지표

```
효율(₩/g) = 메뉴 가격 / 추정 단백질 g
낮을수록 가성비 ↑
```

랭킹 기준은 **g/원** 하나. 단순할수록 헬창 의사결정 빠름. 가격·단백질 절대량은 보조 지표로 카드에 병기.

## 데이터 파이프라인 (GStack 백본)

```
[시드 소스]
   거지맵 큐레이션 (인스타 #거지맵, 가성비 블로그, 거지맵 모음 페이지)
        ↓
   /scrape ── 첫 호출: 헤드리스 브라우저로 프로토타입, JSON 반환
        ↓
   /skillify ── 잘 되면 script.ts + 테스트 + 픽스처로 박제 (~200ms 재호출)
        ↓
[정규화 + 단백질 추정]
   raw_menu (상호, 메뉴명, 가격, 위치, 출처URL)
        ↓
   Claude Haiku ── 메뉴명 → 추정 단백질 g (캐싱)
        ↓
[Supabase 저장]
   menus 테이블: 상호 / 메뉴 / 가격 / 단백질g / g당원가 / 위경도 / 출처
```

## 유저 플로우 (토스 미니앱)

```
[진입]
토스 미니앱 ── Bedrock SDK Login + 위치 권한
    ↓
[메인]
"한 끼 목표 단백질량" 슬라이더 (기본 30g)
    ↓
g/원 효율 랭킹 리스트 (지도 X, 카드 우선)
    ↓
[카드 한 장]
"○○국밥 — 닭가슴살 야채볶음
 단백질 32g · 6,500원 · 단백질 1g당 203원
 도보 4분 · 출처: 거지맵 #강남점심"
    ↓
[탭]
"지도 열기" / "출처 보기"
결제·예약 X. 정보 큐레이션만.
```

## 아키텍처

```
toss-protein-map/
├── backend/                FastAPI (toss-miniapp 패턴 재사용)
│   ├── main.py
│   ├── routers/
│   │   ├── menus.py        ── 위치+목표g → 랭킹 API
│   │   └── seed.py         ── /scrape 결과 적재용 webhook
│   ├── services/
│   │   ├── protein_estimator.py  ── Claude Haiku로 메뉴명 → g 추정
│   │   ├── ranking.py      ── g/원 정렬 + 위치 필터
│   │   └── supabase_io.py
│   └── requirements.txt
├── frontend/               React + Vite (toss-miniapp 패턴)
│   ├── src/pages/
│   │   ├── Home.tsx        ── 슬라이더 + 랭킹 리스트
│   │   └── MenuDetail.tsx
│   └── lib/toss-sdk.ts
├── crawler/
│   ├── seeds.json          ── 시드 URL 목록 (거지맵 인스타·블로그)
│   ├── scrape_jobs/        ── /skillify 박제 결과 (script.ts × N)
│   └── runner.py           ── cron 진입점, 주1회 갱신
└── CLAUDE.md
```

## 단백질 추정 (LLM 캐싱)

- 모델: Claude Haiku (싸고 빠름)
- 입력: 메뉴명 (이미지·재료표 X — V1은 이름만)
- 출력: `{ protein_g: number, confidence: 'high'|'mid'|'low', basis: string }`
- 캐시 저장소: Supabase `protein_cache` 테이블 (별도 Redis 없음)
- 캐시 키: 메뉴명 정규화 — 소문자 + 공백·특수문자 제거 + 한글 자모 NFC 정규화
  - 예: "닭가슴살 야채볶음!" → "닭가슴살야채볶음"
- 신뢰도 cutoff: **`mid` 이상만 랭킹 노출**. `low`는 DB 저장은 하되 API 응답에서 제외.

## 데이터 모델 (Supabase Postgres)

```sql
-- PostGIS 확장 활성화 필요 (위경도 인덱스용)
create extension if not exists postgis;

create table menus (
  id            uuid primary key default gen_random_uuid(),
  store_name    text not null,                    -- 상호
  menu_name     text not null,                    -- 메뉴
  menu_norm     text not null,                    -- 정규화 메뉴명 (캐시 조인 키)
  price_krw     int  not null check (price_krw > 0),
  protein_g     numeric(5,1) not null,            -- 추정 단백질
  protein_confidence text not null check (protein_confidence in ('high','mid','low')),
  cost_per_g    numeric(7,2) generated always as (price_krw::numeric / nullif(protein_g,0)) stored,
  location      geography(point, 4326),           -- 위경도
  source_url    text not null,
  source_type   text not null,                    -- 'instagram' | 'blog' | 'curated'
  scraped_at    timestamptz not null default now(),
  unique (store_name, menu_name)
);
create index idx_menus_location on menus using gist (location);
create index idx_menus_cost     on menus (cost_per_g) where protein_confidence in ('high','mid');

create table protein_cache (
  menu_norm     text primary key,
  protein_g     numeric(5,1) not null,
  confidence    text not null,
  basis         text,
  estimated_at  timestamptz not null default now()
);

create table scrape_runs (
  id            uuid primary key default gen_random_uuid(),
  seed_url      text not null,
  status        text not null,                    -- 'ok' | 'fail'
  menus_added   int  not null default 0,
  error_msg     text,
  ran_at        timestamptz not null default now()
);
```

## API 계약

### `GET /api/menus/ranking`

근처 메뉴를 g/원 효율 순으로 줄세움.

**Request (query string)**:
```
lat=37.5012        // 위도, 필수
lng=127.0396       // 경도, 필수
radius_m=1500      // 반경(m), 기본 1500
target_g=30        // 한 끼 목표 단백질g, 기본 30 (메인 표시는 변하지 않고 보조 라벨용)
limit=20           // 기본 20, 최대 50
cursor=<id>        // 페이지네이션, 옵션
```

**Response 200**:
```json
{
  "items": [
    {
      "id": "uuid",
      "store_name": "○○국밥",
      "menu_name": "닭가슴살 야채볶음",
      "price_krw": 6500,
      "protein_g": 32.0,
      "cost_per_g": 203.13,
      "confidence": "high",
      "distance_m": 380,
      "source_url": "https://instagram.com/p/...",
      "source_type": "instagram"
    }
  ],
  "next_cursor": "uuid_or_null"
}
```

**에러**:
- `400` — `lat`/`lng` 누락 또는 범위 밖
- `503` — Supabase 다운 (재시도 헤더 `Retry-After: 30`)

### `POST /api/seed/ingest`

`/scrape` 결과 적재 webhook. 인증: `X-Seed-Token` 헤더 (env `SEED_TOKEN`).

**Request body**:
```json
{
  "seed_url": "https://instagram.com/explore/tags/거지맵",
  "items": [
    { "store_name": "...", "menu_name": "...", "price_krw": 6500,
      "lat": 37.5012, "lng": 127.0396, "source_url": "..." }
  ]
}
```

**Response 200**: `{ "added": 12, "skipped": 3, "run_id": "uuid" }`

## 에러 처리 정책

| 상황 | 동작 | 사용자 노출 |
|------|------|-------------|
| Haiku 추정 실패(timeout/오류) | 3회 재시도(지수 백오프), 실패 시 `confidence='low'`로 적재하고 랭킹 제외 | 없음 |
| Haiku 응답 파싱 실패 | 같은 메뉴 24h 동안 재추정 안 함, `scrape_runs.error_msg` 기록 | 없음 |
| Supabase 다운 | API는 503 + `Retry-After: 30` 반환. 프론트는 "잠시 후 다시" 토스트 + 재시도 버튼 | "잠시 후 다시 시도해주세요" |
| 위치 권한 거부 | 기본 좌표(강남역 37.4979, 127.0276) 사용 + 안내 배너 노출 | "위치 권한 켜면 더 정확해요" |
| 시드 사이트 구조 변경 (`/skillify` script 깨짐) | `scrape_runs.status='fail'` 적재 → cron이 **iMessage self-chat 알림** 발송 (memory `feedback_imessage_notifications`) | 없음 |
| 결과 0건 (반경 내 메뉴 없음) | 200 + `items=[]` + `next_cursor=null`. 프론트는 "근처에 데이터 없음, 반경 확장" CTA | 빈 상태 화면 |

## MVP 범위 (V1)

- 1차 지역: **강남·역삼·선릉** (헬창 밀집)
- 메뉴 시드 200~500개
- 결제·예약 없음, 정보 큐레이션만
- 회원가입 없음 (토스 SDK Login만)

## V2 후보 (스코프 외)

- 광고: 단백질 보충제·도시락 정기구독 카드
- 사용자 제보 (가격 갱신)
- 즐겨찾기·식단 기록
- 지역 확장 (홍대·잠실·판교)

## 검증 (브라우저 dogfood 필수)

빌드 통과 ≠ 작동. 실제 토스 미니앱 시뮬레이터 또는 모바일 WebView에서:
1. 슬라이더 조정 → 랭킹 갱신 응답 **< 500ms** (P95)
2. 카드 출처 링크 → HTTP 200 + 외부 브라우저 정상 오픈 (5/5 샘플)
3. `confidence='low'` 메뉴는 어떤 반경·목표g에서도 노출 0건
4. 위치 권한 거부 시 기본좌표(강남역) fallback 동작
5. Lighthouse Mobile 성능 ≥ 70

## 리스크

- **단백질 추정 정확도**: 메뉴명만으로 추정은 오차 ±20%. V1은 신뢰도 표기로 우회. V2에서 사용자 피드백 루프.
- **거지맵 시드 휘발성**: 인스타 해시태그·블로그는 구조 자주 변함. `/skillify` 박제가 깨지면 `/scrape` 재프로토타입 필요. 갱신 cron에 실패 알림 필수.
- **인스타그램 ToS**: 인스타 스크래핑은 robots.txt·약관 위반 소지. V1 우선순위 = **(1) 큐레이션 블로그·웹사이트 시드 → (2) RSS/공개 API 가능 소스 → (3) 인스타는 마지막**. 인스타 시드는 본인 계정 로그인 없이 공개 페이지만 접근, 호출 빈도 주1회 미만으로 제한.
- **토스 입점 심사**: 결제 없는 정보 미니앱 입점 가능 여부 — 기존 IsThisFair·비몽사몽해몽 사례로 가능성 확인됨. 심사 가이드 재확인 필요.

## 기술 스택

- 백엔드: FastAPI + Supabase (Postgres + PostGIS)
- 프론트: React + Vite + 토스 Bedrock SDK
- 크롤러: GStack `/scrape` + `/skillify` 박제 + Python cron (launchd, 주1회)
- LLM: Claude Haiku (단백질 추정)
- 배포: **Vercel(frontend) + Fly.io(backend)** — 기존 비몽사몽해몽 패턴 동일
- 인증: 비로그인 진입 허용 (V1은 정보 큐레이션만). 토스 SDK Login은 V2 즐겨찾기 도입 시 활성화.
- 시드 적재 webhook 인증: `X-Seed-Token` 헤더 (env `SEED_TOKEN`)
- 갱신 실패 알림: iMessage self-chat (`[연락처]`) — 기존 알림 채널 재사용

## 다음 단계

1. spec 리뷰 → 사용자 승인
2. writing-plans 스킬로 단계별 구현 플랜 작성
3. (구현 단계) 거지맵 시드 URL 1개 정해서 `/scrape` 프로토타입부터
