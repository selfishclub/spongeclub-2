# 우리 회사 레드팀 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 6개 비즈니스 데이터 소스를 주기적으로 분석하여 아이젠하워 매트릭스로 분류된 보고서를 iMessage/노션/로컬에 전달하는 레드팀 시스템 구축

**Architecture:** `우리 회사-pipeline/redteam/` 디렉토리에 독립 모듈로 구현. 기존 오케스트레이터의 API 패턴(httpx, Config dataclass)을 참고하되, 기존 코드를 수정하지 않는다. Claude Code schedule(RemoteTrigger)로 주간/일일 에이전트 2개를 등록한다.

**Tech Stack:** Python 3, httpx, Claude Code schedule (RemoteTrigger), iMessage channel, Notion API

**Spec:** `docs/superpowers/specs/2026-03-31-우리 회사-redteam-design.md`

---

## 파일 구조

```
우리 회사-pipeline/redteam/
├── __init__.py
├── config.py              # 환경변수 로드 + 임계값 설정 로드
├── collectors/
│   ├── __init__.py
│   ├── granter.py         # 재무 데이터 수집 (Granter API)
│   ├── pluuug.py          # CRM/파이프라인 데이터 수집 (pluuug API)
│   ├── leads.py           # 리드 데이터 수집 (로컬 JSON 로그)
│   ├── clients.py         # 고객 데이터 수집 (온톨로지 파일)
│   ├── gbp.py             # GBP 랭킹 데이터 수집 (대시보드 데이터)
│   └── operations.py      # 운영 데이터 수집 (업무 로그)
├── analysis/
│   ├── __init__.py
│   ├── baseline.py        # 기준선 관리 (4주 이동평균)
│   ├── detector.py        # 이상치 탐지 (임계값 비교)
│   └── classifier.py      # 아이젠하워 4분류
├── reporters/
│   ├── __init__.py
│   ├── imessage.py        # iMessage 보고서 포맷 + 발송
│   ├── notion.py          # 노션 페이지 생성
│   └── local.py           # 로컬 JSON 저장
├── weekly_scan.py          # 주간 레드팀 진입점
├── daily_watchdog.py       # 일일 워치독 진입점
├── data/
│   ├── config.json         # 임계값 설정 (피드백으로 조정)
│   └── baseline.json       # 기준선 데이터
├── reports/                # 주간 보고 JSON
├── alerts/                 # 트리거 경보 JSON
└── tests/
    ├── test_config.py
    ├── test_granter.py
    ├── test_pluuug.py
    ├── test_baseline.py
    ├── test_detector.py
    ├── test_classifier.py
    ├── test_reporters.py
    └── test_weekly_scan.py
```

---

## Task 1: 프로젝트 초기화 + 설정 모듈

**Files:**
- Create: `우리 회사-pipeline/redteam/__init__.py`
- Create: `우리 회사-pipeline/redteam/config.py`
- Create: `우리 회사-pipeline/redteam/data/config.json`
- Create: `우리 회사-pipeline/redteam/tests/__init__.py`
- Create: `우리 회사-pipeline/redteam/tests/test_config.py`

- [ ] **Step 1: 디렉토리 구조 생성**

```bash
mkdir -p 우리 회사-pipeline/redteam/{collectors,analysis,reporters,data,reports,alerts,tests}
touch 우리 회사-pipeline/redteam/__init__.py
touch 우리 회사-pipeline/redteam/collectors/__init__.py
touch 우리 회사-pipeline/redteam/analysis/__init__.py
touch 우리 회사-pipeline/redteam/reporters/__init__.py
touch 우리 회사-pipeline/redteam/tests/__init__.py
```

- [ ] **Step 2: 초기 config.json 작성**

```json
{
  "thresholds": {
    "finance": {
      "revenue_drop": { "value": 20, "unit": "%", "adjusted": false },
      "cost_spike": { "value": 30, "unit": "%", "adjusted": false },
      "balance_min": { "value": 3000000, "unit": "won", "adjusted": false }
    },
    "leads": {
      "count_drop": { "value": 30, "unit": "%", "adjusted": false },
      "cpl_spike": { "value": 50, "unit": "%", "adjusted": false }
    },
    "clients": {
      "contract_expiry_days": { "value": 30, "unit": "days", "adjusted": false },
      "simultaneous_churn": { "value": 2, "unit": "count", "adjusted": false }
    },
    "marketing": {
      "conversion_drop": { "value": 40, "unit": "%", "adjusted": false },
      "pipeline_stall_days": { "value": 14, "unit": "days", "adjusted": false }
    },
    "gbp": {
      "rank_drop": { "value": 5, "unit": "positions", "adjusted": false }
    }
  },
  "classification_overrides": [],
  "disabled_checks": [],
  "feedback_history": []
}
```

- [ ] **Step 3: config.py 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_config.py
import pytest
from pathlib import Path
import json

def test_load_config_returns_thresholds():
    from redteam.config import load_config
    config = load_config()
    assert "thresholds" in config
    assert "finance" in config["thresholds"]
    assert config["thresholds"]["finance"]["revenue_drop"]["value"] == 20

def test_load_env_returns_api_keys():
    from redteam.config import load_env
    env = load_env()
    assert env.granter_api_key != ""
    assert env.pluuug_api_key != ""

def test_update_threshold():
    from redteam.config import load_config, update_threshold
    config = load_config()
    updated = update_threshold(config, "finance", "revenue_drop", 25, "테스트 조정")
    assert updated["thresholds"]["finance"]["revenue_drop"]["value"] == 25
    assert updated["thresholds"]["finance"]["revenue_drop"]["adjusted"] is True
    assert len(updated["feedback_history"]) == 1
```

- [ ] **Step 4: 테스트 실행 → FAIL 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_config.py -v
```

Expected: FAIL — `ModuleNotFoundError: No module named 'redteam.config'`

- [ ] **Step 5: config.py 구현**

```python
# 우리 회사-pipeline/redteam/config.py
from dataclasses import dataclass
from pathlib import Path
import json
import os
from datetime import datetime
from dotenv import load_dotenv

REDTEAM_DIR = Path(__file__).parent
DATA_DIR = REDTEAM_DIR / "data"
REPORTS_DIR = REDTEAM_DIR / "reports"
ALERTS_DIR = REDTEAM_DIR / "alerts"

@dataclass(frozen=True)
class Env:
    granter_api_key: str
    pluuug_api_key: str

def load_env() -> Env:
    load_dotenv(REDTEAM_DIR.parent / ".env")
    return Env(
        granter_api_key=os.environ["GRANTER_API_KEY"],
        pluuug_api_key=os.environ["PLUUUG_API_KEY"],
    )

def load_config() -> dict:
    config_path = DATA_DIR / "config.json"
    with open(config_path) as f:
        return json.load(f)

def save_config(config: dict) -> None:
    config_path = DATA_DIR / "config.json"
    with open(config_path, "w") as f:
        json.dump(config, f, ensure_ascii=False, indent=2)

def update_threshold(config: dict, domain: str, metric: str, new_value: float, reason: str) -> dict:
    updated = json.loads(json.dumps(config))  # deep copy
    updated["thresholds"][domain][metric]["value"] = new_value
    updated["thresholds"][domain][metric]["adjusted"] = True
    updated["feedback_history"].append({
        "timestamp": datetime.now().isoformat(),
        "domain": domain,
        "metric": metric,
        "old_value": config["thresholds"][domain][metric]["value"],
        "new_value": new_value,
        "reason": reason,
    })
    return updated
```

- [ ] **Step 6: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_config.py -v
```

Expected: 3 passed

- [ ] **Step 7: 커밋**

```bash
git add 우리 회사-pipeline/redteam/
git commit -m "feat(redteam): 프로젝트 초기화 + 설정 모듈"
```

---

## Task 2: 재무 데이터 수집기 (Granter API)

**Files:**
- Create: `우리 회사-pipeline/redteam/collectors/granter.py`
- Create: `우리 회사-pipeline/redteam/tests/test_granter.py`

**참고 코드:** `우리 회사-orchestrator/src/apis.py` — Granter API 호출 패턴 (httpx, Basic Auth, POST `/api/public-docs/tickets`)

- [ ] **Step 1: 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_granter.py
import pytest
from datetime import date

def test_parse_transactions_separates_income_expense():
    from redteam.collectors.granter import parse_transactions
    raw = {
        "data": [
            {"transactionType": "IN", "amount": 5000000, "description": "A병원 월정액"},
            {"transactionType": "OUT", "amount": 200000, "description": "Meta 광고비"},
        ]
    }
    result = parse_transactions(raw)
    assert result["income"] == 5000000
    assert result["expense"] == 200000
    assert result["balance"] == 4800000

def test_weekly_summary_calculates_totals():
    from redteam.collectors.granter import weekly_summary
    transactions = [
        {"transactionType": "IN", "amount": 3000000},
        {"transactionType": "IN", "amount": 2000000},
        {"transactionType": "OUT", "amount": 1500000},
    ]
    result = weekly_summary(transactions)
    assert result["total_income"] == 5000000
    assert result["total_expense"] == 1500000
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_granter.py -v
```

- [ ] **Step 3: granter.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/granter.py
import httpx
import base64
from datetime import date, timedelta

GRANTER_BASE = "https://api.granter.co.kr"

def _auth_header(api_key: str) -> dict:
    encoded = base64.b64encode(f"{api_key}:".encode()).decode()
    return {"Authorization": f"Basic {encoded}"}

def fetch_transactions(api_key: str, start: date, end: date) -> dict:
    headers = _auth_header(api_key)
    with httpx.Client(base_url=GRANTER_BASE, headers=headers, timeout=30) as client:
        resp = client.post("/api/public-docs/tickets", json={
            "startDate": start.isoformat(),
            "endDate": end.isoformat(),
        })
        resp.raise_for_status()
        return resp.json()

def parse_transactions(raw: dict) -> dict:
    items = raw.get("data", [])
    income = sum(t["amount"] for t in items if t["transactionType"] == "IN")
    expense = sum(t["amount"] for t in items if t["transactionType"] == "OUT")
    return {"income": income, "expense": expense, "balance": income - expense}

def weekly_summary(transactions: list[dict]) -> dict:
    total_income = sum(t["amount"] for t in transactions if t["transactionType"] == "IN")
    total_expense = sum(t["amount"] for t in transactions if t["transactionType"] == "OUT")
    return {"total_income": total_income, "total_expense": total_expense}

def collect(api_key: str) -> dict:
    today = date.today()
    week_ago = today - timedelta(days=7)
    raw = fetch_transactions(api_key, week_ago, today)
    parsed = parse_transactions(raw)
    return {
        "source": "granter",
        "period": {"start": week_ago.isoformat(), "end": today.isoformat()},
        **parsed,
    }
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_granter.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add 우리 회사-pipeline/redteam/collectors/granter.py 우리 회사-pipeline/redteam/tests/test_granter.py
git commit -m "feat(redteam): 재무 데이터 수집기 (Granter API)"
```

---

## Task 3: CRM 데이터 수집기 (pluuug API)

**Files:**
- Create: `우리 회사-pipeline/redteam/collectors/pluuug.py`
- Create: `우리 회사-pipeline/redteam/tests/test_pluuug.py`

**참고 코드:** `우리 회사-orchestrator/src/apis.py` — pluuug API 호출 패턴 (httpx, `X-API-KEY` 헤더, GET `/v1/inquiry`)

- [ ] **Step 1: 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_pluuug.py
import pytest

def test_parse_inquiries_counts_by_stage():
    from redteam.collectors.pluuug import parse_inquiries
    raw = [
        {"id": 1, "status": "상담", "createdAt": "2026-03-25"},
        {"id": 2, "status": "상담", "createdAt": "2026-03-26"},
        {"id": 3, "status": "제안서", "createdAt": "2026-03-24"},
        {"id": 4, "status": "계약", "createdAt": "2026-03-20"},
    ]
    result = parse_inquiries(raw)
    assert result["by_stage"]["상담"] == 2
    assert result["by_stage"]["제안서"] == 1
    assert result["by_stage"]["계약"] == 1
    assert result["total"] == 4

def test_pipeline_stall_detects_old_inquiries():
    from redteam.collectors.pluuug import detect_stalls
    from datetime import date
    inquiries = [
        {"id": 1, "status": "상담", "createdAt": "2026-03-01"},
        {"id": 2, "status": "제안서", "createdAt": "2026-03-28"},
    ]
    stalls = detect_stalls(inquiries, today=date(2026, 3, 31), stall_days=14)
    assert len(stalls) == 1
    assert stalls[0]["id"] == 1
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_pluuug.py -v
```

- [ ] **Step 3: pluuug.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/pluuug.py
import httpx
from datetime import date, timedelta
from collections import Counter

PLUUUG_BASE = "https://openapi.pluuug.com"

def fetch_inquiries(api_key: str) -> list[dict]:
    headers = {"X-API-KEY": api_key}
    with httpx.Client(base_url=PLUUUG_BASE, headers=headers, timeout=30) as client:
        resp = client.get("/v1/inquiry")
        resp.raise_for_status()
        return resp.json()

def parse_inquiries(inquiries: list[dict]) -> dict:
    stages = Counter(inq["status"] for inq in inquiries)
    return {"total": len(inquiries), "by_stage": dict(stages)}

def detect_stalls(inquiries: list[dict], today: date, stall_days: int = 14) -> list[dict]:
    threshold = today - timedelta(days=stall_days)
    return [
        inq for inq in inquiries
        if date.fromisoformat(inq["createdAt"]) < threshold
        and inq["status"] not in ("계약", "완료", "이탈")
    ]

def collect(api_key: str) -> dict:
    raw = fetch_inquiries(api_key)
    parsed = parse_inquiries(raw)
    stalls = detect_stalls(raw, date.today())
    return {
        "source": "pluuug",
        "pipeline": parsed,
        "stalled_inquiries": stalls,
    }
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_pluuug.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add 우리 회사-pipeline/redteam/collectors/pluuug.py 우리 회사-pipeline/redteam/tests/test_pluuug.py
git commit -m "feat(redteam): CRM 데이터 수집기 (pluuug API)"
```

---

## Task 4: 리드 + 고객 + GBP + 운영 수집기

**Files:**
- Create: `우리 회사-pipeline/redteam/collectors/leads.py`
- Create: `우리 회사-pipeline/redteam/collectors/clients.py`
- Create: `우리 회사-pipeline/redteam/collectors/gbp.py`
- Create: `우리 회사-pipeline/redteam/collectors/operations.py`

이 4개는 API가 아닌 로컬 파일/데이터를 읽는 수집기이므로 한 태스크로 묶는다.

- [ ] **Step 1: leads.py + clients.py + gbp.py 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_leads.py
import pytest
from datetime import date

def test_count_weekly_leads():
    from redteam.collectors.leads import count_weekly_leads
    logs = [
        {"date": "2026-03-25", "source": "meta", "count": 3},
        {"date": "2026-03-26", "source": "diagnostic", "count": 2},
        {"date": "2026-03-28", "source": "meta", "count": 4},
    ]
    result = count_weekly_leads(logs)
    assert result["total"] == 9
    assert result["by_source"]["meta"] == 7
    assert result["by_source"]["diagnostic"] == 2
```

```python
# 우리 회사-pipeline/redteam/tests/test_clients.py
import pytest
from datetime import date

def test_find_expiring_contracts():
    from redteam.collectors.clients import find_expiring_contracts
    clients = [
        {"name": "A병원", "contract_end": "2026-04-15"},
        {"name": "B병원", "contract_end": "2026-05-30"},
        {"name": "C병원", "contract_end": "2026-04-05"},
    ]
    expiring = find_expiring_contracts(clients, today=date(2026, 3, 31), days=30)
    assert len(expiring) == 2  # A병원(D-15), C병원(D-5)
    assert expiring[0]["name"] == "C병원"  # 가장 임박한 것 먼저

def test_no_expiring_contracts():
    from redteam.collectors.clients import find_expiring_contracts
    clients = [
        {"name": "A병원", "contract_end": "2026-12-31"},
    ]
    expiring = find_expiring_contracts(clients, today=date(2026, 3, 31), days=30)
    assert len(expiring) == 0
```

```python
# 우리 회사-pipeline/redteam/tests/test_gbp.py
import pytest

def test_detect_rank_drops():
    from redteam.collectors.gbp import detect_rank_drops
    current = [
        {"client": "A병원", "rank": 8},
        {"client": "B병원", "rank": 3},
    ]
    previous = [
        {"client": "A병원", "rank": 2},
        {"client": "B병원", "rank": 2},
    ]
    drops = detect_rank_drops(current, previous, threshold=5)
    assert len(drops) == 1
    assert drops[0]["client"] == "A병원"
    assert drops[0]["drop"] == 6
```

- [ ] **Step 2: leads.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/leads.py
from pathlib import Path
from collections import defaultdict
import json
from datetime import date, timedelta

def count_weekly_leads(logs: list[dict]) -> dict:
    by_source = defaultdict(int)
    for log in logs:
        by_source[log["source"]] += log["count"]
    total = sum(by_source.values())
    return {"total": total, "by_source": dict(by_source)}

def collect(logs_dir: Path) -> dict:
    """daily-logs/ 디렉토리에서 최근 7일 리드 데이터를 수집"""
    today = date.today()
    week_ago = today - timedelta(days=7)
    logs = []
    for f in sorted(logs_dir.glob("journal-*.json")):
        with open(f) as fp:
            data = json.load(fp)
            if "leads" in data:
                logs.extend(data["leads"])
    recent = [l for l in logs if date.fromisoformat(l.get("date", "")) >= week_ago]
    return {"source": "leads", **count_weekly_leads(recent)}
```

- [ ] **Step 3: clients.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/clients.py
from pathlib import Path
from datetime import date, timedelta
import re

ONTOLOGY_DIR = Path(__file__).parents[2] / ".." / "우리 회사-ontology" / "clients"

def find_expiring_contracts(clients: list[dict], today: date, days: int = 30) -> list[dict]:
    """계약 만료 임박 고객을 찾아 임박순으로 정렬"""
    threshold = today + timedelta(days=days)
    expiring = []
    for c in clients:
        end = c.get("contract_end")
        if not end:
            continue
        end_date = date.fromisoformat(end)
        if today <= end_date <= threshold:
            expiring.append({**c, "days_left": (end_date - today).days})
    return sorted(expiring, key=lambda x: x["days_left"])

def collect(ontology_dir: Path = ONTOLOGY_DIR) -> dict:
    """온톨로지 clients/ 디렉토리에서 고객 상태 파악"""
    clients = []
    for f in ontology_dir.glob("*.md"):
        if f.name.startswith("_"):
            continue
        content = f.read_text()
        # 계약 만료일 추출 시도 (contract_end: YYYY-MM-DD 패턴)
        match = re.search(r"contract_end:\s*(\d{4}-\d{2}-\d{2})", content)
        clients.append({
            "name": f.stem,
            "contract_end": match.group(1) if match else None,
            "file": str(f),
        })
    expiring = find_expiring_contracts(clients, date.today())
    return {"source": "clients", "count": len(clients), "clients": clients, "expiring": expiring}
```

- [ ] **Step 4: gbp.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/gbp.py
from pathlib import Path
import json

GBP_DATA_DIR = Path(__file__).parents[2] / ".." / "gbp-dashboard"

def detect_rank_drops(current: list[dict], previous: list[dict], threshold: int = 5) -> list[dict]:
    """현재 vs 이전 랭킹을 비교하여 threshold 이상 하락한 고객 반환"""
    prev_map = {r["client"]: r["rank"] for r in previous}
    drops = []
    for r in current:
        prev_rank = prev_map.get(r["client"])
        if prev_rank is not None:
            drop = r["rank"] - prev_rank
            if drop >= threshold:
                drops.append({"client": r["client"], "prev_rank": prev_rank, "current_rank": r["rank"], "drop": drop})
    return sorted(drops, key=lambda x: -x["drop"])

def collect(data_dir: Path = GBP_DATA_DIR) -> dict:
    """GBP 대시보드 데이터에서 랭킹 변동 수집"""
    rankings = []
    for f in sorted(data_dir.glob("**/*.json")):
        try:
            with open(f) as fp:
                data = json.load(fp)
                if isinstance(data, dict) and "ranking" in data:
                    rankings.append(data)
        except (json.JSONDecodeError, KeyError):
            continue
    return {"source": "gbp", "rankings": rankings}
```

- [ ] **Step 5: operations.py 구현**

```python
# 우리 회사-pipeline/redteam/collectors/operations.py
from pathlib import Path
from datetime import date, timedelta
import json

def collect(logs_dir: Path) -> dict:
    """업무 로그에서 반복 패턴 수집 (정성적 분석용)"""
    today = date.today()
    week_ago = today - timedelta(days=7)
    logs = []
    for f in sorted(logs_dir.glob("journal-*.json")):
        try:
            with open(f) as fp:
                data = json.load(fp)
                logs.append(data)
        except (json.JSONDecodeError, KeyError):
            continue
    return {"source": "operations", "log_count": len(logs), "logs": logs}
```

- [ ] **Step 6: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_leads.py redteam/tests/test_clients.py redteam/tests/test_gbp.py -v
```

- [ ] **Step 7: 커밋**

```bash
git add 우리 회사-pipeline/redteam/collectors/ 우리 회사-pipeline/redteam/tests/test_clients.py 우리 회사-pipeline/redteam/tests/test_gbp.py
git commit -m "feat(redteam): 리드/고객/GBP/운영 데이터 수집기"
```

---

## Task 5: 기준선 관리 + 이상치 탐지

**Files:**
- Create: `우리 회사-pipeline/redteam/analysis/baseline.py`
- Create: `우리 회사-pipeline/redteam/analysis/detector.py`
- Create: `우리 회사-pipeline/redteam/tests/test_baseline.py`
- Create: `우리 회사-pipeline/redteam/tests/test_detector.py`

- [ ] **Step 1: baseline 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_baseline.py
import pytest

def test_moving_average_4weeks():
    from redteam.analysis.baseline import moving_average
    history = [
        {"week": "W10", "value": 100},
        {"week": "W11", "value": 120},
        {"week": "W12", "value": 80},
        {"week": "W13", "value": 100},
    ]
    avg = moving_average(history, weeks=4)
    assert avg == 100.0

def test_moving_average_insufficient_data():
    from redteam.analysis.baseline import moving_average
    history = [{"week": "W13", "value": 100}]
    avg = moving_average(history, weeks=4)
    assert avg == 100.0  # 있는 데이터로만 계산

def test_update_baseline_appends_and_trims():
    from redteam.analysis.baseline import update_baseline
    baseline = {"finance": {"income": [100, 110, 120, 130]}}
    updated = update_baseline(baseline, "finance", "income", 140, max_weeks=4)
    assert updated["finance"]["income"] == [110, 120, 130, 140]
```

- [ ] **Step 2: detector 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_detector.py
import pytest

def test_detect_drop_triggers_alert():
    from redteam.analysis.detector import check_threshold
    result = check_threshold(
        current=70,
        baseline=100,
        threshold_pct=20,
        direction="drop",
    )
    assert result["triggered"] is True
    assert result["change_pct"] == -30.0

def test_detect_drop_within_threshold():
    from redteam.analysis.detector import check_threshold
    result = check_threshold(
        current=85,
        baseline=100,
        threshold_pct=20,
        direction="drop",
    )
    assert result["triggered"] is False

def test_detect_spike_triggers_alert():
    from redteam.analysis.detector import check_threshold
    result = check_threshold(
        current=160,
        baseline=100,
        threshold_pct=50,
        direction="spike",
    )
    assert result["triggered"] is True

def test_detect_absolute_minimum():
    from redteam.analysis.detector import check_absolute
    result = check_absolute(current=2500000, minimum=3000000)
    assert result["triggered"] is True
```

- [ ] **Step 3: 테스트 실행 → FAIL 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_baseline.py redteam/tests/test_detector.py -v
```

- [ ] **Step 4: baseline.py 구현**

```python
# 우리 회사-pipeline/redteam/analysis/baseline.py
from pathlib import Path
import json
from redteam.config import DATA_DIR

BASELINE_PATH = DATA_DIR / "baseline.json"

def load_baseline() -> dict:
    if BASELINE_PATH.exists():
        with open(BASELINE_PATH) as f:
            return json.load(f)
    return {}

def save_baseline(baseline: dict) -> None:
    with open(BASELINE_PATH, "w") as f:
        json.dump(baseline, f, ensure_ascii=False, indent=2)

def moving_average(history: list[dict], weeks: int = 4) -> float:
    values = [h["value"] for h in history[-weeks:]]
    if not values:
        return 0.0
    return sum(values) / len(values)

def update_baseline(baseline: dict, domain: str, metric: str, value: float, max_weeks: int = 4) -> dict:
    updated = json.loads(json.dumps(baseline))
    if domain not in updated:
        updated[domain] = {}
    if metric not in updated[domain]:
        updated[domain][metric] = []
    updated[domain][metric].append(value)
    if len(updated[domain][metric]) > max_weeks:
        updated[domain][metric] = updated[domain][metric][-max_weeks:]
    return updated

def get_baseline_value(baseline: dict, domain: str, metric: str) -> float:
    values = baseline.get(domain, {}).get(metric, [])
    if not values:
        return 0.0
    return sum(values) / len(values)

def weeks_of_data(baseline: dict) -> int:
    """수집된 주 수 중 최소값 반환 (콜드 스타트 판단용)"""
    counts = []
    for domain in baseline.values():
        for metric_values in domain.values():
            if isinstance(metric_values, list):
                counts.append(len(metric_values))
    return min(counts) if counts else 0
```

- [ ] **Step 5: detector.py 구현**

```python
# 우리 회사-pipeline/redteam/analysis/detector.py

def check_threshold(current: float, baseline: float, threshold_pct: float, direction: str) -> dict:
    if baseline == 0:
        return {"triggered": False, "change_pct": 0.0, "reason": "기준선 없음"}
    change_pct = ((current - baseline) / baseline) * 100
    if direction == "drop":
        triggered = change_pct <= -threshold_pct
    elif direction == "spike":
        triggered = change_pct >= threshold_pct
    else:
        triggered = abs(change_pct) >= threshold_pct
    return {"triggered": triggered, "change_pct": round(change_pct, 1)}

def check_absolute(current: float, minimum: float) -> dict:
    triggered = current < minimum
    return {"triggered": triggered, "current": current, "minimum": minimum}
```

- [ ] **Step 6: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_baseline.py redteam/tests/test_detector.py -v
```

- [ ] **Step 7: 커밋**

```bash
git add 우리 회사-pipeline/redteam/analysis/
git commit -m "feat(redteam): 기준선 관리 + 이상치 탐지 엔진"
```

---

## Task 6: 아이젠하워 분류기

**Files:**
- Create: `우리 회사-pipeline/redteam/analysis/classifier.py`
- Create: `우리 회사-pipeline/redteam/tests/test_classifier.py`

- [ ] **Step 1: 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_classifier.py
import pytest

def test_classify_urgent_important():
    from redteam.analysis.classifier import classify_issue
    issue = {
        "domain": "finance",
        "metric": "balance_min",
        "triggered": True,
        "severity": "critical",
    }
    result = classify_issue(issue)
    assert result == "red"

def test_classify_important_not_urgent():
    from redteam.analysis.classifier import classify_issue
    issue = {
        "domain": "marketing",
        "metric": "conversion_drop",
        "triggered": True,
        "severity": "warning",
    }
    result = classify_issue(issue)
    assert result == "yellow"

def test_classify_automatable():
    from redteam.analysis.classifier import classify_issue
    issue = {
        "domain": "operations",
        "metric": "repetitive_task",
        "triggered": True,
        "severity": "low",
        "automatable": True,
    }
    result = classify_issue(issue)
    assert result == "blue"

def test_classify_with_override():
    from redteam.analysis.classifier import classify_issue
    issue = {
        "domain": "finance",
        "metric": "revenue_drop",
        "triggered": True,
        "severity": "critical",
    }
    overrides = [{"domain": "finance", "metric": "revenue_drop", "force_class": "yellow"}]
    result = classify_issue(issue, overrides=overrides)
    assert result == "yellow"

def test_group_issues_by_class():
    from redteam.analysis.classifier import group_by_class
    issues = [
        {"class": "red", "description": "잔액 위험"},
        {"class": "yellow", "description": "CPL 상승"},
        {"class": "blue", "description": "수작업"},
        {"class": "white", "description": "트렌드"},
    ]
    grouped = group_by_class(issues)
    assert len(grouped["red"]) == 1
    assert len(grouped["yellow"]) == 1
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

- [ ] **Step 3: classifier.py 구현**

```python
# 우리 회사-pipeline/redteam/analysis/classifier.py

# 기본 분류 규칙: (domain, severity) → class
CLASSIFICATION_RULES = {
    ("finance", "critical"): "red",
    ("leads", "critical"): "red",
    ("clients", "critical"): "red",
    ("finance", "warning"): "yellow",
    ("leads", "warning"): "yellow",
    ("marketing", "warning"): "yellow",
    ("marketing", "critical"): "yellow",
    ("clients", "warning"): "yellow",
    ("gbp", "warning"): "yellow",
    ("gbp", "critical"): "yellow",
    ("operations", "low"): "blue",
    ("operations", "warning"): "blue",
}

def classify_issue(issue: dict, overrides: list[dict] | None = None) -> str:
    # 오버라이드 확인
    if overrides:
        for ov in overrides:
            if ov["domain"] == issue["domain"] and ov["metric"] == issue["metric"]:
                return ov["force_class"]
    # automatable이면 blue
    if issue.get("automatable"):
        return "blue"
    key = (issue["domain"], issue.get("severity", "low"))
    return CLASSIFICATION_RULES.get(key, "white")

def group_by_class(issues: list[dict]) -> dict:
    grouped = {"red": [], "yellow": [], "blue": [], "white": []}
    for issue in issues:
        cls = issue.get("class", "white")
        grouped[cls].append(issue)
    return grouped
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

- [ ] **Step 5: 커밋**

```bash
git add 우리 회사-pipeline/redteam/analysis/classifier.py 우리 회사-pipeline/redteam/tests/test_classifier.py
git commit -m "feat(redteam): 아이젠하워 4분류기"
```

---

## Task 7: 보고 모듈 (iMessage + 노션 + 로컬)

**Files:**
- Create: `우리 회사-pipeline/redteam/reporters/imessage.py`
- Create: `우리 회사-pipeline/redteam/reporters/notion.py`
- Create: `우리 회사-pipeline/redteam/reporters/local.py`
- Create: `우리 회사-pipeline/redteam/tests/test_reporters.py`

- [ ] **Step 1: 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_reporters.py
import pytest

def test_format_weekly_report():
    from redteam.reporters.imessage import format_weekly_report
    report = {
        "period": "3/24~3/30",
        "red": [],
        "yellow": [{"description": "CPL 상승", "detail": "₩14,200 → ₩18,500", "action": "광고 소재 교체 검토"}],
        "blue": [{"description": "수작업 리포트", "detail": "주 2시간", "action": "자동화 가능", "automatable": True}],
        "white": [],
        "metrics": {"revenue": "₩520만", "leads": "12건", "balance": "₩4,100만"},
    }
    text = format_weekly_report(report)
    assert "레드팀 주간 리포트" in text
    assert "없음" in text  # red 없음
    assert "CPL 상승" in text
    assert "🤖" in text

def test_format_alert():
    from redteam.reporters.imessage import format_alert
    alert = {
        "metric": "리드 유입",
        "detail": "주간 30% 급감 (12건→8건)",
        "cause": "Meta 광고 노출 감소",
        "action": "광고 관리자 확인",
    }
    text = format_alert(alert)
    assert "🚨 레드팀 경보" in text
    assert "리드 유입" in text

def test_save_local_report(tmp_path):
    from redteam.reporters.local import save_report
    report = {"period": "W13", "issues": []}
    save_report(report, reports_dir=tmp_path)
    files = list(tmp_path.glob("*.json"))
    assert len(files) == 1
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

- [ ] **Step 3: imessage.py 구현**

```python
# 우리 회사-pipeline/redteam/reporters/imessage.py

EMOJI = {"red": "🔴", "yellow": "🟡", "blue": "🔵", "white": "⚪"}
LABEL = {"red": "긴급+중요", "yellow": "중요+비긴급", "blue": "긴급+비중요", "white": "참고"}

def format_weekly_report(report: dict) -> str:
    lines = [f"📊 우리 회사 레드팀 주간 리포트 ({report['period']})", ""]
    for cls in ["red", "yellow", "blue", "white"]:
        emoji = EMOJI[cls]
        label = LABEL[cls]
        items = report.get(cls, [])
        if cls == "blue":
            lines.append(f"{emoji} {label} (자동화 가능 🤖 표시)")
        else:
            lines.append(f"{emoji} {label}")
        if not items:
            lines.append("  없음")
        else:
            for i, item in enumerate(items, 1):
                bot = " 🤖" if item.get("automatable") else ""
                lines.append(f"  {i}. {bot}{item['description']} ({item['detail']})")
                lines.append(f"     → {item['action']}")
        lines.append("")
    metrics = report.get("metrics", {})
    if metrics:
        lines.append("📈 핵심 지표 요약")
        for k, v in metrics.items():
            lines.append(f"  {k}: {v}")
    return "\n".join(lines)

def format_alert(alert: dict) -> str:
    lines = [
        "🚨 레드팀 경보",
        f"{alert['metric']}: {alert['detail']}",
        f"원인 추정: {alert['cause']}",
        f"권장 액션: {alert['action']}",
    ]
    return "\n".join(lines)
```

- [ ] **Step 4: local.py 구현**

```python
# 우리 회사-pipeline/redteam/reporters/local.py
from pathlib import Path
from datetime import date
import json

def save_report(report: dict, reports_dir: Path) -> Path:
    reports_dir.mkdir(parents=True, exist_ok=True)
    week_num = date.today().isocalendar()[1]
    year = date.today().year
    filename = f"{year}-W{week_num:02d}-report.json"
    path = reports_dir / filename
    with open(path, "w") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    return path

def save_alert(alert: dict, alerts_dir: Path) -> Path:
    alerts_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{date.today().isoformat()}-{alert.get('metric', 'unknown')}.json"
    path = alerts_dir / filename
    with open(path, "w") as f:
        json.dump(alert, f, ensure_ascii=False, indent=2)
    return path
```

- [ ] **Step 5: notion.py 구현**

```python
# 우리 회사-pipeline/redteam/reporters/notion.py
# 노션 API를 통해 주간 보고서 페이지를 생성한다.
# 실제 Notion MCP 도구를 Claude Code 세션에서 호출하므로,
# 여기서는 노션에 넣을 데이터 구조만 준비한다.

def build_notion_report(report: dict) -> dict:
    """노션 페이지 생성용 데이터 구조 반환"""
    title = f"레드팀 주간 리포트 ({report['period']})"
    blocks = []
    for cls, label in [("red", "긴급+중요"), ("yellow", "중요+비긴급"),
                        ("blue", "긴급+비중요"), ("white", "참고")]:
        items = report.get(cls, [])
        blocks.append({"type": "heading_2", "text": f"{label}"})
        if not items:
            blocks.append({"type": "paragraph", "text": "없음"})
        else:
            for item in items:
                bot = " 🤖" if item.get("automatable") else ""
                blocks.append({
                    "type": "bulleted_list_item",
                    "text": f"{bot}{item['description']} ({item['detail']}) → {item['action']}",
                })
    return {"title": title, "blocks": blocks}
```

- [ ] **Step 6: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_reporters.py -v
```

- [ ] **Step 7: 커밋**

```bash
git add 우리 회사-pipeline/redteam/reporters/
git commit -m "feat(redteam): 보고 모듈 (iMessage + 노션 + 로컬)"
```

---

## Task 8: 주간 스캔 진입점

**Files:**
- Create: `우리 회사-pipeline/redteam/weekly_scan.py`
- Create: `우리 회사-pipeline/redteam/tests/test_weekly_scan.py`

- [ ] **Step 1: 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_weekly_scan.py
import pytest

def test_run_analysis_returns_classified_report(monkeypatch):
    from redteam.weekly_scan import run_analysis
    # 수집기를 모킹하여 가짜 데이터 반환
    fake_data = {
        "finance": {"income": 5000000, "expense": 2000000, "balance": 4000000},
        "leads": {"total": 12, "by_source": {"meta": 8, "diagnostic": 4}},
        "pluuug": {"pipeline": {"total": 10, "by_stage": {"상담": 5, "제안서": 3, "계약": 2}}, "stalled_inquiries": []},
        "clients": {"count": 8},
        "gbp": {"rankings": []},
        "operations": {"log_count": 7},
    }
    fake_baseline = {
        "finance": {"income": [5200000, 5100000, 5300000, 5000000]},
        "leads": {"total": [14, 12, 15, 13]},
    }
    report = run_analysis(fake_data, fake_baseline, config=None)
    assert "period" in report
    assert "red" in report
    assert "yellow" in report
    assert "blue" in report
    assert "white" in report
    assert "metrics" in report
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

- [ ] **Step 3: weekly_scan.py 구현**

```python
# 우리 회사-pipeline/redteam/weekly_scan.py
"""주간 레드팀 스캔 진입점.

Claude Code schedule 에이전트가 이 모듈의 설명을 참고하여
데이터 수집 → 분석 → 보고 파이프라인을 실행한다.
"""
from datetime import date, timedelta
from redteam.config import load_config, load_env, REPORTS_DIR
from redteam.analysis.baseline import load_baseline, save_baseline, update_baseline, get_baseline_value, weeks_of_data
from redteam.analysis.detector import check_threshold, check_absolute
from redteam.analysis.classifier import classify_issue, group_by_class
from redteam.reporters.local import save_report

def collect_all(env) -> dict:
    """6개 소스에서 데이터 수집"""
    from redteam.collectors.granter import collect as granter_collect
    from redteam.collectors.pluuug import collect as pluuug_collect
    from redteam.collectors.leads import collect as leads_collect
    from redteam.collectors.clients import collect as clients_collect
    from redteam.collectors.gbp import collect as gbp_collect
    from redteam.collectors.operations import collect as ops_collect
    from pathlib import Path

    logs_dir = Path(__file__).parent.parent / "daily-logs"
    return {
        "finance": granter_collect(env.granter_api_key),
        "pluuug": pluuug_collect(env.pluuug_api_key),
        "leads": leads_collect(logs_dir),
        "clients": clients_collect(),
        "gbp": gbp_collect(),
        "operations": ops_collect(logs_dir),
    }

def run_analysis(data: dict, baseline: dict, config: dict | None = None) -> dict:
    """수집된 데이터를 기준선과 비교하여 이슈 발견 및 분류"""
    if config is None:
        config = load_config()
    thresholds = config["thresholds"]
    overrides = config.get("classification_overrides", [])
    issues = []

    # 재무 검사
    finance = data.get("finance", {})
    income_bl = get_baseline_value(baseline, "finance", "income")
    if income_bl > 0:
        result = check_threshold(finance.get("income", 0), income_bl,
                                  thresholds["finance"]["revenue_drop"]["value"], "drop")
        if result["triggered"]:
            issues.append({
                "domain": "finance", "metric": "revenue_drop", "severity": "critical",
                "description": "매출 급감",
                "detail": f"전주 대비 {result['change_pct']}%",
                "action": "매출 원인 분석 필요",
            })
    # 잔액 절대값 검사
    balance_result = check_absolute(finance.get("balance", 0),
                                      thresholds["finance"]["balance_min"]["value"])
    if balance_result["triggered"]:
        issues.append({
            "domain": "finance", "metric": "balance_min", "severity": "critical",
            "description": "잔액 위험",
            "detail": f"₩{finance.get('balance', 0):,}",
            "action": "현금흐름 즉시 점검",
        })

    # 리드 검사
    leads = data.get("leads", {})
    leads_bl = get_baseline_value(baseline, "leads", "total")
    if leads_bl > 0:
        result = check_threshold(leads.get("total", 0), leads_bl,
                                  thresholds["leads"]["count_drop"]["value"], "drop")
        if result["triggered"]:
            issues.append({
                "domain": "leads", "metric": "count_drop", "severity": "critical",
                "description": "리드 유입 급감",
                "detail": f"전주 대비 {result['change_pct']}%",
                "action": "광고 소재/예산 확인",
            })

    # 파이프라인 병목 검사
    pluuug = data.get("pluuug", {})
    stalls = pluuug.get("stalled_inquiries", [])
    if stalls:
        issues.append({
            "domain": "marketing", "metric": "pipeline_stall_days", "severity": "warning",
            "description": f"파이프라인 병목 {len(stalls)}건",
            "detail": f"{len(stalls)}건이 {thresholds['marketing']['pipeline_stall_days']['value']}일 이상 정체",
            "action": "정체 리드 팔로업 필요",
        })

    # 분류
    for issue in issues:
        issue["class"] = classify_issue(issue, overrides)
    grouped = group_by_class(issues)

    today = date.today()
    week_ago = today - timedelta(days=7)
    return {
        "period": f"{week_ago.month}/{week_ago.day}~{today.month}/{today.day}",
        "red": grouped["red"],
        "yellow": grouped["yellow"],
        "blue": grouped["blue"],
        "white": grouped["white"],
        "metrics": {
            "매출": f"₩{finance.get('income', 0):,}",
            "리드": f"{leads.get('total', 0)}건",
            "잔액": f"₩{finance.get('balance', 0):,}",
            "파이프라인": _pipeline_summary(pluuug),
        },
    }

def _pipeline_summary(pluuug: dict) -> str:
    stages = pluuug.get("pipeline", {}).get("by_stage", {})
    if not stages:
        return "데이터 없음"
    parts = [f"{k} {v}" for k, v in stages.items()]
    return " → ".join(parts)
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_weekly_scan.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add 우리 회사-pipeline/redteam/weekly_scan.py 우리 회사-pipeline/redteam/tests/test_weekly_scan.py
git commit -m "feat(redteam): 주간 스캔 진입점"
```

---

## Task 9: 일일 워치독 진입점

**Files:**
- Create: `우리 회사-pipeline/redteam/daily_watchdog.py`
- Create: `우리 회사-pipeline/redteam/tests/test_daily_watchdog.py`

- [ ] **Step 1: 워치독 테스트 작성**

```python
# 우리 회사-pipeline/redteam/tests/test_daily_watchdog.py
import pytest

def test_watchdog_cold_start_returns_empty(monkeypatch):
    """콜드 스타트(2주 미만)이면 경보 0건"""
    from redteam import daily_watchdog
    from redteam.analysis import baseline
    monkeypatch.setattr(baseline, "weeks_of_data", lambda b: 1)
    monkeypatch.setattr(daily_watchdog, "load_baseline", lambda: {})
    monkeypatch.setattr(daily_watchdog, "load_config", lambda: {"thresholds": {}})
    monkeypatch.setattr(daily_watchdog, "load_env", lambda: type("E", (), {"granter_api_key": "", "pluuug_api_key": ""})())
    result = daily_watchdog.run_watchdog()
    assert result == []

def test_watchdog_balance_alert(monkeypatch):
    """잔액이 최소 기준 이하면 경보 1건"""
    from redteam import daily_watchdog
    from redteam.analysis import baseline
    monkeypatch.setattr(baseline, "weeks_of_data", lambda b: 4)
    monkeypatch.setattr(daily_watchdog, "load_baseline", lambda: {"finance": {"income": [5000000]}})
    monkeypatch.setattr(daily_watchdog, "load_config", lambda: {
        "thresholds": {
            "finance": {"balance_min": {"value": 3000000}},
            "leads": {"count_drop": {"value": 30}},
            "clients": {"contract_expiry_days": {"value": 30}, "simultaneous_churn": {"value": 2}},
        }
    })
    monkeypatch.setattr(daily_watchdog, "load_env", lambda: type("E", (), {"granter_api_key": "k", "pluuug_api_key": "k"})())
    # 잔액 200만 (최소 300만 이하)
    monkeypatch.setattr(daily_watchdog, "_check_finance", lambda env, thresholds: [{
        "metric": "잔액 위험", "detail": "₩2,000,000", "cause": "비용 증가", "action": "점검"
    }])
    monkeypatch.setattr(daily_watchdog, "_check_leads", lambda env, thresholds, baseline: [])
    monkeypatch.setattr(daily_watchdog, "_check_clients", lambda thresholds: [])
    result = daily_watchdog.run_watchdog()
    assert len(result) == 1
    assert result[0]["metric"] == "잔액 위험"
```

- [ ] **Step 2: 테스트 실행 → FAIL 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_daily_watchdog.py -v
```

- [ ] **Step 3: daily_watchdog.py 구현**

```python
# 우리 회사-pipeline/redteam/daily_watchdog.py
"""일일 워치독 진입점.

핵심 지표(잔액, 리드 수, 고객 이탈)만 빠르게 체크.
🔴 이상치 발견 시에만 iMessage 경보 발송.
"""
from redteam.config import load_config, load_env, ALERTS_DIR
from redteam.analysis.baseline import load_baseline, get_baseline_value, weeks_of_data
from redteam.analysis.detector import check_threshold, check_absolute
from redteam.reporters.imessage import format_alert
from redteam.reporters.local import save_alert

def _check_finance(env, thresholds: dict) -> list[dict]:
    alerts = []
    from redteam.collectors.granter import collect as granter_collect
    try:
        finance = granter_collect(env.granter_api_key)
        result = check_absolute(finance.get("balance", 0),
                                  thresholds["finance"]["balance_min"]["value"])
        if result["triggered"]:
            alerts.append({
                "metric": "잔액 위험",
                "detail": f"₩{finance['balance']:,} (최소 ₩{result['minimum']:,})",
                "cause": "수입 감소 또는 비용 증가",
                "action": "현금흐름 즉시 점검",
            })
    except Exception:
        pass
    return alerts

def _check_leads(env, thresholds: dict, baseline: dict) -> list[dict]:
    alerts = []
    from redteam.collectors.leads import collect as leads_collect
    from pathlib import Path
    try:
        logs_dir = Path(__file__).parent.parent / "daily-logs"
        leads = leads_collect(logs_dir)
        leads_bl = get_baseline_value(baseline, "leads", "total")
        if leads_bl > 0:
            result = check_threshold(leads.get("total", 0), leads_bl,
                                      thresholds["leads"]["count_drop"]["value"], "drop")
            if result["triggered"]:
                alerts.append({
                    "metric": "리드 유입 급감",
                    "detail": f"전주 대비 {result['change_pct']}%",
                    "cause": "Meta 광고 성과 변동 가능",
                    "action": "광고 관리자 확인",
                })
    except Exception:
        pass
    return alerts

def _check_clients(thresholds: dict) -> list[dict]:
    alerts = []
    from redteam.collectors.clients import collect as clients_collect
    try:
        data = clients_collect()
        expiring = data.get("expiring", [])
        churn_threshold = thresholds["clients"]["simultaneous_churn"]["value"]
        if len(expiring) >= churn_threshold:
            names = ", ".join(c["name"] for c in expiring[:3])
            alerts.append({
                "metric": "고객 이탈 위험",
                "detail": f"계약 만료 임박 {len(expiring)}건 ({names})",
                "cause": "갱신 논의 미진행",
                "action": "고객별 갱신 연락 즉시 시작",
            })
    except Exception:
        pass
    return alerts

def run_watchdog() -> list[dict]:
    """핵심 지표 체크 → 🔴 경보 목록 반환"""
    env = load_env()
    config = load_config()
    baseline = load_baseline()
    thresholds = config["thresholds"]

    # 콜드 스타트: 2주 미만이면 경보 안 함
    if weeks_of_data(baseline) < 2:
        return []

    alerts = []
    alerts.extend(_check_finance(env, thresholds))
    alerts.extend(_check_leads(env, thresholds, baseline))
    alerts.extend(_check_clients(thresholds))
    return alerts
```

- [ ] **Step 4: 테스트 실행 → PASS 확인**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/test_daily_watchdog.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add 우리 회사-pipeline/redteam/daily_watchdog.py 우리 회사-pipeline/redteam/tests/test_daily_watchdog.py
git commit -m "feat(redteam): 일일 워치독 진입점 (잔액+리드+고객 이탈)"
```

---

## Task 10: 스케줄 에이전트 등록

Claude Code의 `schedule` 스킬을 사용하여 두 개의 RemoteTrigger를 등록한다.

- [ ] **Step 1: 주간 레드팀 스케줄 등록**

`/schedule` 스킬을 사용하여 등록:
- 이름: `우리 회사-redteam-weekly`
- 크론: `0 9 * * 1` (매주 월요일 09:00)
- 프롬프트: 아래 내용

```
우리 회사 레드팀 주간 스캔을 실행해라.

1. 우리 회사-pipeline/redteam/weekly_scan.py의 collect_all()로 6개 소스 데이터 수집
2. run_analysis()로 기준선 대비 분석 + 아이젠하워 분류
3. baseline.json 업데이트 (이번 주 데이터 추가)
4. 결과를 3곳에 보고:
   - iMessage self-chat으로 주간 보고서 발송 (format_weekly_report 형식)
   - 노션 개인 워크스페이스에 보고서 페이지 생성
   - 우리 회사-pipeline/redteam/reports/에 JSON 저장
5. 콜드 스타트 2주 미만이면 데이터 수집+기준선 업데이트만 하고 보고 스킵

작업 디렉토리: /Users/user/Desktop/claude-code
```

- [ ] **Step 2: 일일 워치독 스케줄 등록**

`/schedule` 스킬을 사용하여 등록:
- 이름: `우리 회사-redteam-watchdog`
- 크론: `0 8 * * *` (매일 08:00)
- 프롬프트: 아래 내용

```
우리 회사 레드팀 일일 워치독을 실행해라.

1. 우리 회사-pipeline/redteam/daily_watchdog.py의 run_watchdog() 실행
2. 🔴 경보가 있으면:
   - iMessage self-chat으로 경보 발송 (format_alert 형식)
   - 우리 회사-pipeline/redteam/alerts/에 JSON 저장
3. 🔴 경보가 없으면 아무것도 하지 마라 (무출력)

작업 디렉토리: /Users/user/Desktop/claude-code
```

- [ ] **Step 3: 등록 확인**

`/schedule list` 명령으로 두 에이전트가 등록되었는지 확인:
- `우리 회사-redteam-weekly` (cron: `0 9 * * 1`)
- `우리 회사-redteam-watchdog` (cron: `0 8 * * *`)

- [ ] **Step 4: 커밋 (README 등 문서화)**

```bash
git add 우리 회사-pipeline/redteam/
git commit -m "feat(redteam): 스케줄 에이전트 등록 완료"
```

---

## Task 11: 통합 테스트 + 수동 실행 검증

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd 우리 회사-pipeline && python -m pytest redteam/tests/ -v --tb=short
```

Expected: 모든 테스트 PASS

- [ ] **Step 2: 주간 스캔 수동 실행**

schedule 에이전트를 수동으로 한 번 실행하여 전체 파이프라인 검증:
- 데이터 수집 → 분석 → iMessage 보고 → 노션 기록 → 로컬 저장

- [ ] **Step 3: 결과 확인**

- iMessage에 주간 보고서가 도착했는지 확인
- 노션에 페이지가 생성되었는지 확인
- `redteam/reports/`에 JSON이 저장되었는지 확인
- `redteam/data/baseline.json`이 업데이트되었는지 확인

- [ ] **Step 4: 최종 커밋**

```bash
git add -A && git commit -m "feat(redteam): 우리 회사 레드팀 시스템 완성"
```
