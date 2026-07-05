# 고단백 거지맵 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 거지맵 시드를 GStack으로 긁어 단백질 g당 가격 효율로 줄세우는 토스 미니앱 백엔드+프론트+크롤러를 V1 MVP까지 구현.

**Architecture:** FastAPI(backend) + React/Vite(frontend) + Supabase Postgres+PostGIS(DB) + GStack `/scrape` `/skillify`(크롤러 박제) + Claude Haiku(단백질 추정). 기존 `toss-miniapp/` `bimong-haemong/` 스캐폴딩 패턴 재사용.

**Tech Stack:** Python 3.11, FastAPI, Supabase(Postgres+PostGIS), React 18, Vite, TypeScript, 토스 Bedrock SDK, Anthropic SDK(Haiku), Vercel, Fly.io, launchd cron.

**Spec:** `docs/superpowers/specs/2026-05-05-protein-budget-map-design.md`

---

## Phase 0 — 스캐폴딩

### Task 0.1: 프로젝트 폴더 생성 + 기존 패턴 복제

**Files:**
- Create: `protein-budget-map/CLAUDE.md`
- Create: `protein-budget-map/AGENTS.md`
- Copy from: `toss-miniapp/backend/` → `protein-budget-map/backend/` (Dockerfile, fly.toml, main.py 골격만)
- Copy from: `toss-miniapp/frontend/` → `protein-budget-map/frontend/` (vite + 토스 SDK 스텁)

- [ ] **Step 1: 폴더 생성**

```bash
mkdir -p protein-budget-map/{backend/{routers,services,migrations},frontend,crawler/{scrape_jobs,seeds}}
cd protein-budget-map
```

- [ ] **Step 2: backend 스캐폴딩 복제 (없는 파일은 빈 파일 생성)**

```bash
for f in Dockerfile fly.toml docker-entrypoint.sh requirements.txt; do
  if [ -f "../toss-miniapp/backend/$f" ]; then
    cp "../toss-miniapp/backend/$f" "backend/$f"
  else
    touch "backend/$f"
    echo "[!] toss-miniapp에 $f 없음 — 빈 파일로 생성, 수동 작성 필요"
  fi
done
touch backend/main.py
```

`backend/fly.toml` 내 `app = "..."` 줄을 `app = "protein-budget-map-api"`로 변경.

- [ ] **Step 3: frontend 스캐폴딩 복제 (없는 파일은 빈 파일/디폴트로)**

```bash
mkdir -p frontend/src/lib
for f in package.json vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json granite.config.ts; do
  if [ -f "../toss-miniapp/frontend/$f" ]; then
    cp "../toss-miniapp/frontend/$f" "frontend/$f"
  else
    echo "[!] toss-miniapp/frontend에 $f 없음 — 스킵 (수동 보강 필요)"
  fi
done
[ -d "../toss-miniapp/frontend/src/lib" ] && cp -r ../toss-miniapp/frontend/src/lib frontend/src/lib || mkdir -p frontend/src/lib
```

`granite.config.ts` 누락 시 토스 미니앱 빌드 안 되므로, 비몽사몽해몽(`bimong-haemong/granite.config.ts`)도 fallback 후보.

- [ ] **Step 4: CLAUDE.md 작성** — 프로젝트 한 줄 요약, 디렉토리 구조, 스택 (spec 4-49행 복붙해서 손질)

- [ ] **Step 5: 커밋**

```bash
git add protein-budget-map/
git commit -m "scaffold: protein-budget-map 폴더 + 토스 미니앱 패턴 복제"
```

---

### Task 0.2: 환경 변수 셋업

**Files:**
- Create: `protein-budget-map/backend/.env.example`
- Create: `protein-budget-map/frontend/.env.example`
- Create: `protein-budget-map/backend/.env` (gitignore)
- Modify: `protein-budget-map/.gitignore`

- [ ] **Step 1: backend/.env.example 작성**

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=
ANTHROPIC_API_KEY=
SEED_TOKEN=
NOTIFY_IMESSAGE_HANDLE=any;-;[연락처]
```

- [ ] **Step 2: frontend/.env.example 작성**

```
VITE_API_BASE_URL=http://localhost:8000
VITE_DEFAULT_LAT=37.4979
VITE_DEFAULT_LNG=127.0276
```

- [ ] **Step 3: .gitignore에 `.env`, `node_modules/`, `__pycache__/`, `.DS_Store` 추가**

- [ ] **Step 4: 실제 .env 채우기** (사용자가 수동) — Supabase 프로젝트 생성, ANTHROPIC_API_KEY 발급, SEED_TOKEN은 `openssl rand -hex 32`

- [ ] **Step 5: 커밋**

```bash
git add protein-budget-map/.gitignore protein-budget-map/backend/.env.example protein-budget-map/frontend/.env.example
git commit -m "chore: env 템플릿 + gitignore"
```

---

### Task 0.3: Supabase 스키마 마이그레이션

**Files:**
- Create: `protein-budget-map/backend/migrations/0001_init.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성** — spec 데이터 모델 섹션 그대로

```sql
create extension if not exists postgis;
create extension if not exists pgcrypto;  -- gen_random_uuid()용

create table menus (
  id            uuid primary key default gen_random_uuid(),
  store_name    text not null,
  menu_name     text not null,
  menu_norm     text not null,
  price_krw     int  not null check (price_krw > 0),
  protein_g     numeric(5,1) not null,
  protein_confidence text not null check (protein_confidence in ('high','mid','low')),
  cost_per_g    numeric(7,2) generated always as (price_krw::numeric / nullif(protein_g,0)) stored,
  location      geography(point, 4326),
  source_url    text not null,
  source_type   text not null,
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
  status        text not null,
  menus_added   int  not null default 0,
  error_msg     text,
  ran_at        timestamptz not null default now()
);
```

- [ ] **Step 2: Supabase SQL Editor에 붙여넣고 실행**

- [ ] **Step 3: 검증** — Supabase SQL Editor에서 다음 4개 쿼리 실행, 모두 정상 결과 확인:

```sql
select postgis_version();           -- '3.x ...' 반환
select gen_random_uuid();           -- uuid 1개 반환
\d menus                            -- 컬럼·인덱스 정의 출력 (psql 또는 Table Editor)
select count(*) from pg_indexes where tablename='menus' and indexname='idx_menus_location';  -- 1
```

Supabase Table Editor에 `menus`, `protein_cache`, `scrape_runs` 3개 테이블 노출 확인.

- [ ] **Step 4: 커밋**

```bash
git add protein-budget-map/backend/migrations/0001_init.sql
git commit -m "db: 초기 스키마 (menus + protein_cache + scrape_runs)"
```

---

## Phase 1 — 백엔드 코어

### Task 1.1: Supabase 클라이언트 + 모델

**Files:**
- Create: `protein-budget-map/backend/supabase_io.py`
- Create: `protein-budget-map/backend/models.py`
- Create: `protein-budget-map/backend/tests/test_supabase_io.py`

- [ ] **Step 1: 실패 테스트 작성**

```python
# tests/test_supabase_io.py
from backend.supabase_io import insert_menu, query_nearby
from backend.models import MenuInsert

def test_insert_and_query_menu(supabase_test_client):
    m = MenuInsert(
        store_name="테스트국밥", menu_name="닭가슴살볶음",
        menu_norm="닭가슴살볶음", price_krw=6500, protein_g=32.0,
        protein_confidence="high", lat=37.4979, lng=127.0276,
        source_url="https://example.com", source_type="curated"
    )
    insert_menu(m)
    rows = query_nearby(lat=37.4979, lng=127.0276, radius_m=500, limit=10)
    assert any(r["menu_name"] == "닭가슴살볶음" for r in rows)
```

- [ ] **Step 2: 실패 확인**

Run: `pytest backend/tests/test_supabase_io.py -v`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: models.py + supabase_io.py 구현**

```python
# models.py
from pydantic import BaseModel

class MenuInsert(BaseModel):
    store_name: str
    menu_name: str
    menu_norm: str
    price_krw: int
    protein_g: float
    protein_confidence: str  # 'high'|'mid'|'low'
    lat: float
    lng: float
    source_url: str
    source_type: str  # 'instagram'|'blog'|'curated'
```

```python
# supabase_io.py
import os
from supabase import create_client

_client = None
def client():
    global _client
    if _client is None:
        _client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
    return _client

def insert_menu(m):
    # upsert: store_name+menu_name 충돌 시 location·price·protein 모두 갱신 (덮어쓰기)
    return client().table("menus").upsert({
        **m.model_dump(exclude={"lat", "lng"}),
        "location": f"POINT({m.lng} {m.lat})",
    }, on_conflict="store_name,menu_name").execute()
    # 검증: 같은 store+menu로 다른 좌표 두번 insert → location이 두번째 값으로 갱신돼야 함
    # tests/test_supabase_io.py에 upsert 갱신 케이스 추가 필요

def query_nearby(lat, lng, radius_m, target_g=30, limit=20, cursor=None):
    # PostGIS RPC 함수로 거리 필터 + g/원 정렬
    return client().rpc("ranking_nearby", {
        "p_lat": lat, "p_lng": lng, "p_radius_m": radius_m,
        "p_limit": limit, "p_cursor": cursor,
    }).execute().data
```

- [ ] **Step 4: PostGIS RPC 함수 마이그레이션 추가** — `backend/migrations/0002_ranking_rpc.sql`

```sql
create or replace function ranking_nearby(
  p_lat double precision, p_lng double precision,
  p_radius_m int, p_limit int, p_cursor uuid default null
) returns table (
  id uuid, store_name text, menu_name text, price_krw int,
  protein_g numeric, cost_per_g numeric, confidence text,
  distance_m double precision, source_url text, source_type text
) language sql stable as $$
  select id, store_name, menu_name, price_krw, protein_g, cost_per_g,
         protein_confidence, st_distance(location, st_makepoint(p_lng,p_lat)::geography),
         source_url, source_type
  from menus
  where protein_confidence in ('high','mid')
    and st_dwithin(location, st_makepoint(p_lng,p_lat)::geography, p_radius_m)
    and (p_cursor is null or id > p_cursor)
  order by cost_per_g asc, id asc
  limit p_limit;
$$;
```

- [ ] **Step 5: 0002 RPC 마이그레이션 실행** — Supabase SQL Editor에 `0002_ranking_rpc.sql` 붙여넣고 실행. 검증:

```sql
select * from ranking_nearby(37.4979, 127.0276, 1500, 10);  -- 빈 배열이라도 에러 없어야 함
```

- [ ] **Step 6: 테스트 통과 확인 + requirements.txt에 `supabase>=2.5.0`, `pytest>=8.0`, `pydantic>=2.0` 추가 + 커밋**

```bash
git add protein-budget-map/backend/{supabase_io.py,models.py,tests/,migrations/0002*,requirements.txt}
git commit -m "feat(backend): Supabase IO + PostGIS 랭킹 RPC"
```

---

### Task 1.2: 메뉴명 정규화 + 단백질 추정 (Claude Haiku)

**Files:**
- Create: `protein-budget-map/backend/services/normalize.py`
- Create: `protein-budget-map/backend/services/protein_estimator.py`
- Create: `protein-budget-map/backend/tests/test_normalize.py`
- Create: `protein-budget-map/backend/tests/test_protein_estimator.py`

- [ ] **Step 1: normalize 실패 테스트**

```python
# tests/test_normalize.py
from backend.services.normalize import normalize_menu
def test_normalize():
    assert normalize_menu("닭가슴살 야채볶음!") == "닭가슴살야채볶음"
    assert normalize_menu("Chicken  Breast") == "chickenbreast"
    assert normalize_menu("닭 가슴 살") == "닭가슴살"
```

- [ ] **Step 2: 실패 확인 → 구현**

```python
# services/normalize.py
import unicodedata, re
def normalize_menu(name: str) -> str:
    s = unicodedata.normalize("NFC", name).lower()
    return re.sub(r"[\s\W_]+", "", s)
```

- [ ] **Step 3: protein_estimator 실패 테스트**

```python
# tests/test_protein_estimator.py
import pytest
from backend.services import protein_estimator

class _Block:
    def __init__(self, text): self.text = text
class _Resp:
    def __init__(self, text): self.content = [_Block(text)]

def test_estimate_chicken_breast(monkeypatch):
    fake_messages = type("M", (), {
        "create": staticmethod(lambda **kw: _Resp('{"protein_g": 30, "confidence": "high", "basis": "닭가슴살 200g"}'))
    })()
    fake_client = type("C", (), {"messages": fake_messages})()
    monkeypatch.setattr(protein_estimator, "Anthropic", lambda: fake_client)
    # Supabase 캐시 mock — miss 후 upsert
    monkeypatch.setattr(protein_estimator, "client", lambda: type("S", (), {
        "table": lambda self, name: type("T", (), {
            "select": lambda self,_: type("Q",(),{"eq":lambda self,k,v:type("E",(),{"execute":lambda self:type("R",(),{"data":[]})()})()})(),
            "upsert": lambda self,d: type("U",(),{"execute":lambda self:type("R",(),{"data":[d]})()})(),
        })()
    })())
    result = protein_estimator.estimate_protein("닭가슴살 야채볶음")
    assert result["protein_g"] == 30
    assert result["confidence"] == "high"
```

- [ ] **Step 4: protein_estimator 구현**

```python
# services/protein_estimator.py
import os, json
from anthropic import Anthropic
from .normalize import normalize_menu
from ..supabase_io import client

PROMPT = """다음 한국 메뉴의 단백질 추정량을 JSON으로 답해라. 1인분 기준.
메뉴: {menu}
출력: {{"protein_g": number, "confidence": "high"|"mid"|"low", "basis": "<근거 한 줄>"}}
JSON만 출력. 다른 말 금지."""

def estimate_protein(menu_name: str) -> dict:
    norm = normalize_menu(menu_name)
    cached = client().table("protein_cache").select("*").eq("menu_norm", norm).execute().data
    if cached:
        return cached[0]

    a = Anthropic()
    resp = a.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=200,
        messages=[{"role": "user", "content": PROMPT.format(menu=menu_name)}],
    )
    parsed = json.loads(resp.content[0].text)
    client().table("protein_cache").upsert({
        "menu_norm": norm, "protein_g": parsed["protein_g"],
        "confidence": parsed["confidence"], "basis": parsed["basis"],
    }).execute()
    return parsed
```

- [ ] **Step 5: 테스트 통과 + requirements.txt에 `anthropic>=0.40` + 커밋**

```bash
git add protein-budget-map/backend/services/ protein-budget-map/backend/tests/
git commit -m "feat(backend): 메뉴명 정규화 + Haiku 단백질 추정 (캐싱)"
```

---

### Task 1.3: 랭킹 API 엔드포인트

**Files:**
- Create: `protein-budget-map/backend/routers/menus.py`
- Modify: `protein-budget-map/backend/main.py` (라우터 등록)
- Create: `protein-budget-map/backend/tests/test_menus_api.py`

- [ ] **Step 1: API 실패 테스트** (FastAPI TestClient)

```python
# tests/test_menus_api.py
from fastapi.testclient import TestClient
from backend.main import app
client = TestClient(app)

def test_ranking_requires_lat_lng():
    r = client.get("/api/menus/ranking")
    assert r.status_code == 400

def test_ranking_returns_items():
    r = client.get("/api/menus/ranking?lat=37.4979&lng=127.0276&radius_m=1500")
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "next_cursor" in body
    if body["items"]:
        item = body["items"][0]
        assert all(k in item for k in ["store_name","menu_name","price_krw","protein_g","cost_per_g","distance_m"])
```

- [ ] **Step 2: routers/menus.py 구현** — spec API 계약 그대로

```python
# routers/menus.py
from fastapi import APIRouter, HTTPException, Query
from ..supabase_io import query_nearby

router = APIRouter(prefix="/api/menus", tags=["menus"])

@router.get("/ranking")
def ranking(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(1500, ge=100, le=10000),
    target_g: int = Query(30, ge=10, le=200),
    limit: int = Query(20, ge=1, le=50),
    cursor: str | None = None,
):
    try:
        rows = query_nearby(lat, lng, radius_m, target_g, limit, cursor)
    except Exception as e:
        raise HTTPException(status_code=503, detail="DB unavailable", headers={"Retry-After": "30"})
    next_cursor = rows[-1]["id"] if rows and len(rows) == limit else None
    return {"items": rows, "next_cursor": next_cursor}
```

- [ ] **Step 3: main.py에 라우터 등록 + CORS**

```python
# main.py
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import menus, seed

app = FastAPI()

allowed = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed,
    allow_methods=["GET","POST"],
    allow_headers=["*"],
)

app.include_router(menus.router)
app.include_router(seed.router)
```

`backend/.env.example`에도 추가:
```
ALLOWED_ORIGINS=http://localhost:5173,https://protein-budget-map.vercel.app
```

배포 후 Fly.io secrets에 실제 Vercel 도메인 포함된 값 설정 필요 (Task 4.1).

- [ ] **Step 4: 테스트 통과 확인** — `pytest backend/tests/test_menus_api.py -v`

- [ ] **Step 5: 커밋**

```bash
git add protein-budget-map/backend/routers/menus.py protein-budget-map/backend/main.py protein-budget-map/backend/tests/test_menus_api.py
git commit -m "feat(backend): 랭킹 API + 위치 검증"
```

---

### Task 1.4: 시드 적재 webhook

**Files:**
- Create: `protein-budget-map/backend/routers/seed.py`
- Create: `protein-budget-map/backend/tests/test_seed_api.py`

- [ ] **Step 1: 실패 테스트**

```python
def test_seed_requires_token():
    r = client.post("/api/seed/ingest", json={"seed_url":"x", "items":[]})
    assert r.status_code == 401

def test_seed_ingest_ok(monkeypatch):
    # SEED_TOKEN env, estimate_protein mock, insert_menu mock
    monkeypatch.setenv("SEED_TOKEN", "test")
    r = client.post("/api/seed/ingest",
        headers={"X-Seed-Token": "test"},
        json={"seed_url": "https://example.com", "items": [
            {"store_name":"A","menu_name":"닭가슴살","price_krw":6000,"lat":37.5,"lng":127.0,"source_url":"u"}
        ]})
    assert r.status_code == 200
    assert r.json()["added"] == 1
```

- [ ] **Step 2: routers/seed.py 구현**

```python
import os
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from ..supabase_io import insert_menu, client
from ..services.protein_estimator import estimate_protein
from ..services.normalize import normalize_menu
from ..models import MenuInsert

router = APIRouter(prefix="/api/seed", tags=["seed"])

class SeedItem(BaseModel):
    store_name: str
    menu_name: str
    price_krw: int
    lat: float
    lng: float
    source_url: str

class SeedPayload(BaseModel):
    seed_url: str
    items: list[SeedItem]

@router.post("/ingest")
def ingest(payload: SeedPayload, x_seed_token: str = Header(default="")):
    if x_seed_token != os.environ.get("SEED_TOKEN"):
        raise HTTPException(401, "invalid token")
    added = skipped = 0
    for it in payload.items:
        try:
            est = estimate_protein(it.menu_name)
            insert_menu(MenuInsert(
                store_name=it.store_name, menu_name=it.menu_name,
                menu_norm=normalize_menu(it.menu_name),
                price_krw=it.price_krw, protein_g=est["protein_g"],
                protein_confidence=est["confidence"],
                lat=it.lat, lng=it.lng,
                source_url=it.source_url,
                source_type="curated" if "instagram" not in payload.seed_url else "instagram",
            ))
            added += 1
        except Exception:
            skipped += 1
    run = client().table("scrape_runs").insert({
        "seed_url": payload.seed_url, "status": "ok" if added else "fail",
        "menus_added": added,
    }).execute()
    return {"added": added, "skipped": skipped, "run_id": run.data[0]["id"]}
```

- [ ] **Step 3: 테스트 통과 확인 + 커밋**

```bash
git add protein-budget-map/backend/routers/seed.py protein-budget-map/backend/tests/test_seed_api.py
git commit -m "feat(backend): 시드 적재 webhook (X-Seed-Token 인증)"
```

---

## Phase 2 — 크롤러 (GStack 박제)

### Task 2.1: 첫 시드 URL 1개로 `/scrape` 프로토타입

**Files:**
- Create: `protein-budget-map/crawler/seeds/seeds.json`
- Create: `protein-budget-map/crawler/scrape_jobs/` (빈 폴더)

- [ ] **Step 1: 시드 URL 1개 결정 — 우선순위 엄수** (spec 리스크 섹션 인스타 ToS 가드)

  1순위: **공개 큐레이션 블로그·웹사이트** (네이버 블로그, 망고플레이트 가성비 태그, 거지맵 모음 사이트)
  2순위: RSS·공개 API 가능 소스
  3순위 (마지막): 인스타 — 본인 계정 미사용·공개 페이지만·주1회 미만 호출

V1은 1순위만으로 시드 1개 확보. 인스타는 V2.

`crawler/seeds/seeds.json`:
```json
[
  { "name": "gangnam-protein-blog-001", "url": "<블로그 URL>", "type": "blog" }
]
```

GStack 사전 세팅: `gstack` CLI 설치돼 있는지 확인 (`which gstack`). 없으면 사용자에게 요청.

- [ ] **Step 2: GStack `/scrape` 인터랙티브 호출** (사용자 또는 에이전트 직접)

```
/scrape <블로그 URL>
intent: "한국 가성비 식당 메뉴 + 가격 + 위치 추출 → JSON"
```

결과 JSON 예시 (사용자가 검토):
```json
[{"store_name":"...","menu_name":"...","price_krw":6500,"lat":...,"lng":...}]
```

- [ ] **Step 3: 결과를 webhook으로 보내 적재 시도** (curl)

```bash
curl -X POST http://localhost:8000/api/seed/ingest \
  -H "X-Seed-Token: $SEED_TOKEN" \
  -H "Content-Type: application/json" \
  -d @scrape_result.json
```

응답 `{"added": N, "skipped": M}` 확인.

- [ ] **Step 4: 결과 합리적이면 `/skillify` 호출 → 영구 박제**

```
/skillify
```

`crawler/scrape_jobs/gangnam-protein-blog-001/script.ts` + 테스트 + 픽스처 생성됨.

- [ ] **Step 5: 커밋**

```bash
git add protein-budget-map/crawler/
git commit -m "crawler: 시드 1개 /scrape → /skillify 박제"
```

---

### Task 2.2: 크롤러 runner + cron 진입점

**Files:**
- Create: `protein-budget-map/crawler/runner.py`
- Create: `protein-budget-map/crawler/notify.py`

- [ ] **Step 1: notify.py — iMessage 알림** (memory `feedback_imessage_notifications`)

```python
# crawler/notify.py
import subprocess, os
def notify_failure(seed_name, error):
    handle = os.environ.get("NOTIFY_IMESSAGE_HANDLE", "any;-;[연락처]")
    msg = f"[고단백거지맵] 크롤러 실패: {seed_name}\n{error[:200]}"
    subprocess.run([
        "osascript", "-e",
        f'tell application "Messages" to send "{msg}" to participant "{handle}"'
    ], check=False)
```

- [ ] **Step 2: runner.py 작성** — seeds.json 순회, 박제된 script 실행, webhook 호출, 실패 시 notify

```python
# crawler/runner.py
import json, os, subprocess, sys, requests, pathlib
from notify import notify_failure

ROOT = pathlib.Path(__file__).parent
SEEDS = json.loads((ROOT / "seeds/seeds.json").read_text())
API = os.environ["API_BASE_URL"]
TOKEN = os.environ["SEED_TOKEN"]

def run_one(seed):
    job_dir = ROOT / "scrape_jobs" / seed["name"]
    if not job_dir.exists():
        notify_failure(seed["name"], "박제 안 됨")
        return
    try:
        out = subprocess.check_output(["bun", "run", str(job_dir / "script.ts")], timeout=180)
        items = json.loads(out)
        r = requests.post(f"{API}/api/seed/ingest",
            headers={"X-Seed-Token": TOKEN},
            json={"seed_url": seed["url"], "items": items}, timeout=60)
        r.raise_for_status()
        print(f"[{seed['name']}] {r.json()}")
    except Exception as e:
        notify_failure(seed["name"], str(e))

if __name__ == "__main__":
    for s in SEEDS:
        run_one(s)
```

- [ ] **Step 3: 로컬 수동 실행 테스트**

```bash
API_BASE_URL=http://localhost:8000 SEED_TOKEN=$SEED_TOKEN python crawler/runner.py
```

응답에 `added` 양수 확인.

- [ ] **Step 4: launchd plist 작성** — `protein-budget-map/crawler/com.agency.protein-crawler.plist` (주1회 월요일 03:00)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.agency.protein-crawler</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/env</string><string>python3</string>
    <string>/Users/user/Desktop/claude code/protein-budget-map/crawler/runner.py</string>
  </array>
  <key>StartCalendarInterval</key>
  <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>3</integer></dict>
  <key>StandardOutPath</key><string>/tmp/protein-crawler.log</string>
  <key>StandardErrorPath</key><string>/tmp/protein-crawler.err</string>
</dict></plist>
```

- [ ] **Step 5: launchd 등록 + 커밋**

```bash
cp crawler/com.agency.protein-crawler.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.agency.protein-crawler.plist
git add protein-budget-map/crawler/
git commit -m "feat(crawler): runner + iMessage 실패 알림 + launchd 주1회"
```

---

## Phase 3 — 프론트엔드

### Task 3.1: API 클라이언트 + 타입

**Files:**
- Create: `protein-budget-map/frontend/src/lib/api.ts`
- Create: `protein-budget-map/frontend/src/types.ts`

- [ ] **Step 1: types.ts**

```ts
export type MenuItem = {
  id: string; store_name: string; menu_name: string;
  price_krw: number; protein_g: number; cost_per_g: number;
  confidence: 'high'|'mid'|'low'; distance_m: number;
  source_url: string; source_type: 'instagram'|'blog'|'curated';
};
export type RankingResponse = { items: MenuItem[]; next_cursor: string | null };
```

- [ ] **Step 2: api.ts**

```ts
const BASE = import.meta.env.VITE_API_BASE_URL;
export async function fetchRanking(p: {lat:number;lng:number;radius_m?:number;target_g?:number;limit?:number}) {
  const q = new URLSearchParams({...p, radius_m: String(p.radius_m??1500), target_g: String(p.target_g??30), limit: String(p.limit??20)} as any);
  const r = await fetch(`${BASE}/api/menus/ranking?${q}`);
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json() as Promise<import("../types").RankingResponse>;
}
```

- [ ] **Step 3: 커밋**

```bash
git add protein-budget-map/frontend/src/{lib/api.ts,types.ts}
git commit -m "feat(frontend): API client + 타입"
```

---

### Task 3.2: Home.tsx — 슬라이더 + 위치 + 랭킹 리스트

**Files:**
- Create: `protein-budget-map/frontend/src/pages/Home.tsx`
- Create: `protein-budget-map/frontend/src/components/MenuCard.tsx`
- Create: `protein-budget-map/frontend/src/lib/geo.ts`
- Modify: `protein-budget-map/frontend/src/App.tsx`

- [ ] **Step 1: geo.ts — 위치 권한 + fallback**

```ts
const FALLBACK = {
  lat: Number(import.meta.env.VITE_DEFAULT_LAT ?? 37.4979),
  lng: Number(import.meta.env.VITE_DEFAULT_LNG ?? 127.0276),
};
export async function getLocation(): Promise<{lat:number;lng:number;fallback:boolean}> {
  if (!navigator.geolocation) return {...FALLBACK, fallback: true};
  return new Promise((res) => {
    navigator.geolocation.getCurrentPosition(
      (p) => res({lat: p.coords.latitude, lng: p.coords.longitude, fallback: false}),
      () => res({...FALLBACK, fallback: true}),
      {timeout: 5000}
    );
  });
}
```

- [ ] **Step 2: MenuCard.tsx**

```tsx
import { MenuItem } from "../types";
export function MenuCard({m}: {m: MenuItem}) {
  return (
    <div className="card">
      <div className="store">{m.store_name}</div>
      <div className="menu">{m.menu_name}</div>
      <div className="stats">
        단백질 <b>{m.protein_g}g</b> · {m.price_krw.toLocaleString()}원
        · g당 <b>{m.cost_per_g.toFixed(0)}원</b>
        · 도보 {Math.round(m.distance_m / 80)}분
      </div>
      <a href={m.source_url} target="_blank" rel="noreferrer">출처 보기 →</a>
    </div>
  );
}
```

- [ ] **Step 3: Home.tsx**

```tsx
import { useEffect, useState } from "react";
import { fetchRanking } from "../lib/api";
import { getLocation } from "../lib/geo";
import { MenuCard } from "../components/MenuCard";
import { MenuItem } from "../types";

export function Home() {
  const [target, setTarget] = useState(30);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loc, setLoc] = useState<{lat:number;lng:number;fallback:boolean}|null>(null);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => { getLocation().then(setLoc); }, []);
  useEffect(() => {
    if (!loc) return;
    fetchRanking({lat: loc.lat, lng: loc.lng, target_g: target})
      .then(r => setItems(r.items)).catch(e => setErr(String(e)));
  }, [loc, target]);

  return (
    <div className="home">
      {loc?.fallback && <div className="banner">위치 권한 켜면 더 정확해요 (현재: 강남역 기준)</div>}
      <label>한 끼 목표 단백질: {target}g
        <input type="range" min={10} max={80} step={5} value={target}
               onChange={e=>setTarget(Number(e.target.value))}/>
      </label>
      {err && <div className="error">잠시 후 다시 시도해주세요</div>}
      {items.length === 0 && !err && <div className="empty">근처 데이터 없음</div>}
      <div className="list">{items.map(m => <MenuCard key={m.id} m={m}/>)}</div>
    </div>
  );
}
```

- [ ] **Step 4: App.tsx에 Home 연결**

- [ ] **Step 5: 로컬 dev 실행 + 시각 확인 + 커밋**

```bash
cd frontend && npm run dev
# 브라우저에서 슬라이더, 카드, 위치배너 동작 확인
git add protein-budget-map/frontend/src/
git commit -m "feat(frontend): Home — 슬라이더 + 위치 + 랭킹 카드"
```

---

## Phase 4 — 배포 + dogfood

### Task 4.1: backend Fly.io 배포

- [ ] **Step 1: fly auth + secrets 설정**

```bash
cd protein-budget-map/backend
fly auth login   # 필요 시
fly apps create protein-budget-map-api
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_KEY=... ANTHROPIC_API_KEY=... SEED_TOKEN=...
```

- [ ] **Step 2: 배포**

```bash
fly deploy
```

- [ ] **Step 3: 헬스 체크**

```bash
curl https://protein-budget-map-api.fly.dev/api/menus/ranking?lat=37.4979&lng=127.0276
```

200 + JSON 응답 확인.

- [ ] **Step 4: 커밋 (fly.toml 변경 있으면)**

```bash
git add protein-budget-map/backend/fly.toml
git commit -m "deploy(backend): Fly.io 배포"
```

---

### Task 4.2: frontend Vercel 배포

- [ ] **Step 1: Vercel 프로젝트 연결**

```bash
cd protein-budget-map/frontend
vercel link
vercel env add VITE_API_BASE_URL  # https://protein-budget-map-api.fly.dev
vercel env add VITE_DEFAULT_LAT 37.4979
vercel env add VITE_DEFAULT_LNG 127.0276
```

- [ ] **Step 2: 배포**

```bash
vercel --prod
```

- [ ] **Step 3: 모바일 사파리에서 직접 열어보기** — 위치 권한 팝업 → 허용 → 카드 표시 확인

- [ ] **Step 4: Lighthouse Mobile 측정**

`npx lighthouse <URL> --form-factor=mobile --view`
Performance ≥ 70 확인.

**미달(< 70) 시 처리**:
- 이미지 lazy-load·압축 → 재측정
- 번들 사이즈 큰 의존성 제거 → 재측정
- 그래도 안 되면 Task 4.4(입점) 보류 + 사용자에게 보고

- [ ] **Step 5: 커밋 (vercel.json 등 있으면)**

```bash
git add protein-budget-map/frontend/vercel.json
git commit -m "deploy(frontend): Vercel + 환경변수"
```

---

### Task 4.3: 검증 체크리스트 통과

- [ ] **Step 1: 슬라이더 → 랭킹 갱신 < 500ms (P95)** — Chrome DevTools Network 5회 측정

- [ ] **Step 2: 카드 출처 링크 5/5 HTTP 200**

- [ ] **Step 3: `confidence='low'` 메뉴 노출 0건** — Supabase에 low 1개 강제 삽입 후 API 응답 확인

- [ ] **Step 4: 위치 권한 거부 → 강남역 좌표 fallback + 안내 배너 노출**

- [ ] **Step 5: 모든 항목 통과 시 PR 생성 또는 main 머지**

```bash
git push origin <branch>
gh pr create --title "feat: 고단백 거지맵 V1" --body "spec/plan 링크 + 검증 결과"
```

---

### Task 4.4: 토스 미니앱 입점 신청 (V1 외부 의존)

- [ ] **Step 1: 토스 디벨로퍼 콘솔에서 미니앱 등록** — 스펙 시트 (이름, 카테고리, 도메인)

- [ ] **Step 2: Bedrock SDK Login 비활성화 확인** (V1은 비로그인 진입)

- [ ] **Step 3: 심사 제출 + 결과 대기** — 비몽사몽해몽 심사 가이드 준용

- [ ] **Step 4: 심사 통과 시 메모리 저장**

`~/.claude/projects/.../memory/project_protein_budget_map.md`에 입점 상태 기록.

---

## 완료 기준

- [ ] 모든 Task 통과 (Phase 0~4)
- [ ] 검증 체크리스트 5/5 통과
- [ ] 시드 1개 이상 박제 + cron 가동 확인
- [ ] 모바일 실측 화면 스크린샷 확보
- [ ] 메모리 업데이트 (`project_protein_budget_map.md`)
