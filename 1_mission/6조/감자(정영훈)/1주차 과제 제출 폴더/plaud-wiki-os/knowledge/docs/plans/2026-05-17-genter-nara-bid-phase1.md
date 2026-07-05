# genter-nara-bid Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 09:00 나라장터 신규 공고를 자동 폴링·키워드 필터·응찰 가능 자동 판정·LLM 매칭 점수화하여 Notion DB에 적재한다. 이 phase 끝에서 사용자(대표·담당자)는 Notion에서 매일 아침 응찰 가능한 SNS 홍보대행 공고 후보 리스트를 확인 가능하다.

**Architecture:** Python 3.11 단일 프로세스. launchd가 매일 09:00 `python -m scripts.poll_nara`를 실행. 4개 모듈로 분리(`nara_api`·`filter_rules`·`llm_client`·`notion_sync`) + entry point `poll_nara.py`. 모든 I/O 모듈은 단위 테스트에서 mock, 통합 테스트만 실제 API 일부 호출.

**Tech Stack:** Python 3.11, httpx (조달청 API + Notion HTTP), anthropic SDK (Haiku 호출), python-dotenv, pytest, pytest-mock, freezegun (날짜 고정), launchd (macOS).

**Scope:** spec v2의 Phase 1만 다룬다. Phase 2 (rfp_analyzer)·Phase 3 (HWP 변환)·Phase 4 (proposal_builder)·Phase 5 (launchd dispatcher)는 후속 plan으로 분리.

---

## Prerequisites (사람이 직접 수행, 코드 없음)

작업 시작 전에 사용자가 완료해야 할 사항. 이 plan의 task는 이것이 완료되어 있다고 가정한다.

- [ ] **data.go.kr 가입 + API 신청**
  - https://www.data.go.kr/ 회원가입 (우리 회사 명의)
  - "조달청_나라장터 입찰공고정보서비스" 검색 → 활용신청
  - 승인 후 발급된 일반 인증키(Decoding/Encoding 둘 다 메모)
  - 일일 호출 한도 확인 (기본 1만 회/일이면 충분)

- [ ] **Anthropic API 키 확인**
  - 기존 `~/.env` 또는 환경변수에서 키 확인 (기존 우리 회사 자산 재사용)

- [ ] **Notion Integration + DB 생성**
  - https://www.notion.so/my-integrations 에서 새 integration 생성: 이름 "G엔터 입찰"
  - Internal Integration Token 복사
  - Notion에 "G엔터 나라장터 매칭" 풀페이지 DB 생성, integration에 권한 부여
  - 필드 추가 (spec v2 Notion DB 스키마 참조):
    - 공고명 (Title), 공고번호 (Text), 수요기관 (Select), 카테고리 (Multi-select)
    - 추정가격 (Number), 마감일 (Date), 등록일 (Date)
    - 매칭점수 (Number), 매칭근거 (Rich text), 추천 포지셔닝 (Select)
    - 응찰가능여부 (Select), 응찰불가사유 (Multi-select)
    - 상태 (Status: 신규/검토중(강력권장)/검토중(권장)/검토중/응찰불가/참고)
    - RFP 분석 (Checkbox), 제안서 초안 (Checkbox)
    - 공고 원문 (URL), 첨부파일 (Files), LLM 비용 (Number), 메모 (Rich text)
  - DB ID 복사 (URL의 `?v=` 앞 32자리)
  - 사용자·담당자 둘 다 share

- [ ] **`.env` 작성** (`genter-nara-bid/.env`)
  ```
  NARA_API_KEY=...
  ANTHROPIC_API_KEY=sk-ant-...
  NOTION_TOKEN=secret_...
  NOTION_DB_ID=...
  ```

---

## File Structure

이 phase에서 생성·수정할 파일:

```
genter-nara-bid/
├── pyproject.toml                       # Create (Task 1)
├── .python-version                      # Create (Task 1)
├── .env.example                         # Create (Task 1)
├── scripts/
│   ├── __init__.py                      # Create (Task 1)
│   ├── poll_nara.py                     # Create (Task 6)
│   └── lib/
│       ├── __init__.py                  # Create (Task 1)
│       ├── filter_rules.py              # Create (Task 2)
│       ├── nara_api.py                  # Create (Task 3)
│       ├── llm_client.py                # Create (Task 4)
│       └── notion_sync.py               # Create (Task 5)
├── tests/
│   ├── __init__.py                      # Create (Task 1)
│   ├── conftest.py                      # Create (Task 1)
│   ├── test_filter_rules.py             # Create (Task 2)
│   ├── test_nara_api.py                 # Create (Task 3)
│   ├── test_llm_client.py               # Create (Task 4)
│   ├── test_notion_sync.py              # Create (Task 5)
│   └── test_poll_nara.py                # Create (Task 6)
├── data/
│   └── seen_bids.json                   # Create empty (Task 5)
└── launchd/
    └── com.company.genter-nara-poll.plist  # Create (Task 8)
```

**파일 책임 분리 원칙:**
- `nara_api.py` — 조달청 API 호출만. 응답 dict 그대로 반환.
- `filter_rules.py` — 순수 함수. 입력 dict → 판정 결과 dict.
- `llm_client.py` — Anthropic SDK 호출 + JSON 응답 파싱. 비즈니스 로직 없음.
- `notion_sync.py` — Notion API 호출 + seen_bids 캐시 관리.
- `poll_nara.py` — 위 4개 모듈 조합. main() entry point.

---

## Tasks

### Task 1: 프로젝트 셋업

**Files:**
- Create: `genter-nara-bid/pyproject.toml`
- Create: `genter-nara-bid/.python-version`
- Create: `genter-nara-bid/.env.example`
- Create: `genter-nara-bid/scripts/__init__.py`
- Create: `genter-nara-bid/scripts/lib/__init__.py`
- Create: `genter-nara-bid/tests/__init__.py`
- Create: `genter-nara-bid/tests/conftest.py`

- [ ] **Step 1: pyproject.toml 작성**

`genter-nara-bid/pyproject.toml`:
```toml
[project]
name = "genter-nara-bid"
version = "0.1.0"
description = "G엔터 나라장터 입찰 자동화"
requires-python = ">=3.11"
dependencies = [
    "httpx>=0.27",
    "anthropic>=0.40",
    "python-dotenv>=1.0",
    "pydantic>=2.7",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-mock>=3.12",
    "freezegun>=1.4",
    "respx>=0.21",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
```

- [ ] **Step 2: .python-version, .env.example, __init__.py 파일 작성**

`.python-version`:
```
3.11
```

`.env.example`:
```
NARA_API_KEY=
ANTHROPIC_API_KEY=
NOTION_TOKEN=
NOTION_DB_ID=
```

`scripts/__init__.py`, `scripts/lib/__init__.py`, `tests/__init__.py` 모두 빈 파일.

`tests/conftest.py`:
```python
import os
from pathlib import Path
import pytest
from dotenv import load_dotenv

@pytest.fixture(autouse=True)
def env_setup(monkeypatch):
    monkeypatch.setenv("NARA_API_KEY", "test-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic")
    monkeypatch.setenv("NOTION_TOKEN", "test-notion")
    monkeypatch.setenv("NOTION_DB_ID", "test-db-id")

@pytest.fixture
def project_root():
    return Path(__file__).parent.parent
```

- [ ] **Step 3: venv 생성 + 의존성 설치**

```bash
cd "/Users/user/Desktop/claude code/genter-nara-bid"
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

Expected: "Successfully installed httpx-... anthropic-... pytest-..."

- [ ] **Step 4: pytest 동작 확인**

```bash
pytest -v
```

Expected: "no tests ran in 0.0Xs" — 에러 없이 종료.

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/pyproject.toml genter-nara-bid/.python-version genter-nara-bid/.env.example genter-nara-bid/scripts/__init__.py genter-nara-bid/scripts/lib/__init__.py genter-nara-bid/tests/__init__.py genter-nara-bid/tests/conftest.py
git commit -m "chore(genter-nara-bid): Python 3.11 프로젝트 셋업 + pytest"
```

`genter-nara-bid/.venv/`는 `.gitignore`에 이미 포함됨.

---

### Task 2: filter_rules — 응찰 가능 자동 판정 (TDD)

8개 룰 (5 제외 R1~R5 + 3 가점 R6~R8). 순수 함수. spec의 "응찰 가능 자동 판정 룰" 섹션 코드화.

**Files:**
- Create: `genter-nara-bid/scripts/lib/filter_rules.py`
- Test: `genter-nara-bid/tests/test_filter_rules.py`

- [ ] **Step 1: 테스트 먼저 작성 (8개 룰 + 종합)**

`tests/test_filter_rules.py`:
```python
from scripts.lib.filter_rules import evaluate_bid

def make_bid(title="공고", body="", price=10_000_000):
    return {"bidNtceNm": title, "bidNtceDtlsCn": body, "presmptPrce": price}

def test_R1_single_record_5천만_exclusion():
    bid = make_bid(body="최근 3년 단일 건 5천만원 이상 실적 보유 업체")
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert "R1" in result["exclusion_codes"]

def test_R2_재무3개년_exclusion():
    bid = make_bid(body="최근 3개년 재무제표 제출 요망")
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert "R2" in result["exclusion_codes"]

def test_R3_3억_초과_exclusion():
    bid = make_bid(price=350_000_000)
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert "R3" in result["exclusion_codes"]

def test_R4_공동수급_의무_exclusion():
    bid = make_bid(body="컨소시엄 필수, 공동수급 의무 사업")
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert "R4" in result["exclusion_codes"]

def test_R5_직접생산확인증명서_exclusion():
    bid = make_bid(body="직접생산확인증명서 필수")
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert "R5" in result["exclusion_codes"]

def test_R6_5천만이하_bonus():
    bid = make_bid(price=30_000_000)
    result = evaluate_bid(bid)
    assert result["eligible"] is True
    assert result["bonus"] >= 20

def test_R7_소기업제한_bonus():
    bid = make_bid(body="소기업·소상공인 제한경쟁 입찰")
    result = evaluate_bid(bid)
    assert result["bonus"] >= 15

def test_R8_의료관광_특별우선_bonus():
    bid = make_bid(title="외국인 의료관광 홍보 영상 제작")
    result = evaluate_bid(bid)
    assert result["bonus"] >= 10

def test_eligible_clean_bid():
    bid = make_bid(title="지자체 SNS 홍보대행", body="홍보 콘텐츠 제작", price=40_000_000)
    result = evaluate_bid(bid)
    assert result["eligible"] is True
    assert result["exclusion_codes"] == []
    assert result["bonus"] >= 20  # R6 5천만 이하

def test_multiple_exclusions_listed():
    bid = make_bid(body="최근 3개년 재무제표 + 컨소시엄 필수", price=400_000_000)
    result = evaluate_bid(bid)
    assert result["eligible"] is False
    assert set(result["exclusion_codes"]) >= {"R2", "R3", "R4"}
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
pytest tests/test_filter_rules.py -v
```

Expected: ImportError 또는 ModuleNotFoundError — `scripts.lib.filter_rules` 모듈 없음.

- [ ] **Step 3: filter_rules.py 구현**

`scripts/lib/filter_rules.py`:
```python
import re
from typing import TypedDict

class Evaluation(TypedDict):
    eligible: bool
    exclusion_codes: list[str]
    bonus: int

# 정규식 패턴
R1_PATTERNS = [
    r"단일\s*건.*5천만원\s*이상",
    r"최근\s*\d+년.*5천만원\s*이상\s*실적",
    r"금\s*5천만원\s*이상.*실적",
]
R2_PATTERNS = [
    r"최근\s*3개년\s*재무제표",
    r"3개\s*사업연도.*재무",
]
R4_PATTERNS = [
    r"공동수급.*의무",
    r"컨소시엄\s*(필수|의무)",
    r"공동이행\s*의무",
]
R5_PATTERNS = [
    r"직접생산확인증명서.*(필수|요구)",
]
R7_PATTERNS = [
    r"소기업[·\s]*소상공인.*제한경쟁",
    r"소기업\s*제한",
]
R8_KEYWORDS = ["의료관광", "외국인 관광", "뷰티", "K-콘텐츠", "K-컬처", "AI 홍보", "디지털 전환"]

def _matches_any(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text) for p in patterns)

def evaluate_bid(bid: dict) -> Evaluation:
    """공고 dict를 평가하여 응찰 가능 여부와 가점을 반환한다."""
    title = bid.get("bidNtceNm", "")
    body = bid.get("bidNtceDtlsCn", "")
    price = int(bid.get("presmptPrce") or 0)
    full_text = f"{title}\n{body}"

    exclusions = []
    # R1~R5 제외 룰
    if _matches_any(full_text, R1_PATTERNS):
        exclusions.append("R1")
    if _matches_any(full_text, R2_PATTERNS):
        exclusions.append("R2")
    if price >= 300_000_000:
        exclusions.append("R3")
    if _matches_any(full_text, R4_PATTERNS):
        exclusions.append("R4")
    if _matches_any(full_text, R5_PATTERNS):
        exclusions.append("R5")

    # R6~R8 가점
    bonus = 0
    if 0 < price <= 50_000_000:
        bonus += 20
    if _matches_any(full_text, R7_PATTERNS):
        bonus += 15
    if any(kw in full_text for kw in R8_KEYWORDS):
        bonus += 10

    return Evaluation(
        eligible=(len(exclusions) == 0),
        exclusion_codes=exclusions,
        bonus=bonus,
    )
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_filter_rules.py -v
```

Expected: 모든 테스트 PASS (10건).

- [ ] **Step 5: Commit**

```bash
cd "/Users/user/Desktop/claude code"
git add genter-nara-bid/scripts/lib/filter_rules.py genter-nara-bid/tests/test_filter_rules.py
git commit -m "feat(genter-nara-bid): 응찰 가능 자동 판정 룰 8종 (R1~R8)"
```

---

### Task 3: nara_api — 조달청 API 클라이언트 (TDD)

조달청 OpenAPI 호출. httpx + respx로 mock.

**Files:**
- Create: `genter-nara-bid/scripts/lib/nara_api.py`
- Test: `genter-nara-bid/tests/test_nara_api.py`

- [ ] **Step 1: 테스트 작성**

`tests/test_nara_api.py`:
```python
import httpx
import respx
from datetime import datetime
from scripts.lib.nara_api import fetch_new_bids

NARA_URL = "http://apis.data.go.kr/1230000/UcontrctSrvcInfoService/getUcontrctSrvcInfoServcPPSSrch"

@respx.mock
def test_fetch_new_bids_parses_response():
    respx.get(NARA_URL).mock(return_value=httpx.Response(200, json={
        "response": {
            "header": {"resultCode": "00"},
            "body": {
                "totalCount": 2,
                "items": [
                    {"bidNtceNo": "20260517001", "bidNtceNm": "지자체 SNS 운영 대행", "presmptPrce": "30000000", "bidNtceDtlsCn": "홍보 콘텐츠 제작"},
                    {"bidNtceNo": "20260517002", "bidNtceNm": "유튜브 영상 제작", "presmptPrce": "20000000", "bidNtceDtlsCn": "숏폼"},
                ]
            }
        }
    }))
    bids = fetch_new_bids(start=datetime(2026, 5, 16, 9), end=datetime(2026, 5, 17, 9))
    assert len(bids) == 2
    assert bids[0]["bidNtceNo"] == "20260517001"

@respx.mock
def test_fetch_new_bids_api_error_raises():
    respx.get(NARA_URL).mock(return_value=httpx.Response(200, json={
        "response": {"header": {"resultCode": "99", "resultMsg": "Invalid key"}}
    }))
    import pytest
    with pytest.raises(RuntimeError, match="Invalid key"):
        fetch_new_bids(start=datetime(2026, 5, 16, 9), end=datetime(2026, 5, 17, 9))

@respx.mock
def test_fetch_new_bids_pagination():
    # 페이지 1: 100건, 페이지 2: 30건
    items_p1 = [{"bidNtceNo": f"P1-{i}", "bidNtceNm": "x", "presmptPrce": "0", "bidNtceDtlsCn": ""} for i in range(100)]
    items_p2 = [{"bidNtceNo": f"P2-{i}", "bidNtceNm": "x", "presmptPrce": "0", "bidNtceDtlsCn": ""} for i in range(30)]
    respx.get(NARA_URL).mock(side_effect=[
        httpx.Response(200, json={"response": {"header": {"resultCode": "00"}, "body": {"totalCount": 130, "items": items_p1}}}),
        httpx.Response(200, json={"response": {"header": {"resultCode": "00"}, "body": {"totalCount": 130, "items": items_p2}}}),
    ])
    bids = fetch_new_bids(start=datetime(2026, 5, 16, 9), end=datetime(2026, 5, 17, 9))
    assert len(bids) == 130
```

- [ ] **Step 2: 실패 확인**

```bash
pytest tests/test_nara_api.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`scripts/lib/nara_api.py`:
```python
import os
from datetime import datetime
import httpx

NARA_URL = "http://apis.data.go.kr/1230000/UcontrctSrvcInfoService/getUcontrctSrvcInfoServcPPSSrch"
PAGE_SIZE = 100

def fetch_new_bids(start: datetime, end: datetime) -> list[dict]:
    """주어진 시간 범위에 등록된 용역 입찰공고를 모두 가져온다."""
    api_key = os.environ["NARA_API_KEY"]
    bids: list[dict] = []
    page = 1
    while True:
        params = {
            "serviceKey": api_key,
            "type": "json",
            "pageNo": page,
            "numOfRows": PAGE_SIZE,
            "inqryDiv": "1",  # 등록일 기준
            "inqryBgnDt": start.strftime("%Y%m%d%H%M"),
            "inqryEndDt": end.strftime("%Y%m%d%H%M"),
        }
        r = httpx.get(NARA_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        header = data["response"]["header"]
        if header["resultCode"] != "00":
            raise RuntimeError(f"Nara API error: {header.get('resultMsg', 'unknown')}")
        body = data["response"]["body"]
        items = body.get("items") or []
        bids.extend(items)
        if len(bids) >= body.get("totalCount", 0) or not items:
            break
        page += 1
    return bids
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_nara_api.py -v
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add genter-nara-bid/scripts/lib/nara_api.py genter-nara-bid/tests/test_nara_api.py
git commit -m "feat(genter-nara-bid): 나라장터 OpenAPI 클라이언트"
```

---

### Task 4: llm_client — Claude Haiku 매칭 점수화 (TDD)

**Files:**
- Create: `genter-nara-bid/scripts/lib/llm_client.py`
- Test: `genter-nara-bid/tests/test_llm_client.py`

- [ ] **Step 1: 테스트 작성**

`tests/test_llm_client.py`:
```python
import json
from unittest.mock import MagicMock
from scripts.lib.llm_client import score_bid

GENTER_PROFILE = "n천명 크리에이터 DB, 숏폼·인플루언서 마케팅 전문, 의료·뷰티·금융 등 다업종 수행."

def test_score_bid_returns_parsed_json(mocker):
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text=json.dumps({
            "score": 78,
            "position": "A",
            "category": ["콘텐츠"],
            "rationale": "지자체 SNS 운영 대행, n천명 DB 활용 적합",
            "flags": ["응찰가능"],
        }))]
    )
    mocker.patch("scripts.lib.llm_client._client", return_value=mock_client)

    bid = {"bidNtceNm": "지자체 SNS 운영", "bidNtceDtlsCn": "월 콘텐츠 8건", "presmptPrce": 40_000_000}
    result = score_bid(bid, GENTER_PROFILE)

    assert result["score"] == 78
    assert result["position"] == "A"
    assert "콘텐츠" in result["category"]

def test_score_bid_handles_invalid_json(mocker):
    mock_client = MagicMock()
    mock_client.messages.create.return_value = MagicMock(
        content=[MagicMock(text="이것은 JSON이 아님")]
    )
    mocker.patch("scripts.lib.llm_client._client", return_value=mock_client)

    bid = {"bidNtceNm": "x", "bidNtceDtlsCn": "", "presmptPrce": 0}
    result = score_bid(bid, GENTER_PROFILE)

    # 파싱 실패 시 기본값 반환
    assert result["score"] == 0
    assert result["position"] == "A"
    assert "파싱 실패" in result["rationale"]
```

- [ ] **Step 2: 실패 확인**

```bash
pytest tests/test_llm_client.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`scripts/lib/llm_client.py`:
```python
import json
import os
from functools import lru_cache
import anthropic

MODEL = "claude-haiku-4-5-20251001"

@lru_cache(maxsize=1)
def _client():
    return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

SYSTEM_PROMPT = """당신은 G엔터의 입찰 검토 분석가다.
입찰공고와 G엔터 프로필을 받아 다음 JSON으로만 응답한다 (다른 설명 금지):
{
  "score": 0~100 (적합도),
  "position": "A" | "B" | "A+H" | "B+H",
  "category": ["콘텐츠"|"인플루언서"|"글로벌"] 중 1개 이상,
  "rationale": "한 문장",
  "flags": ["응찰가능","특별우선타겟","고난도" 중 해당 항목]
}
포지셔닝 기준: A=SNS홍보대행 보수적, B=AI 인플루언서 혁신, H=중화권/의료관광 하이브리드."""

def score_bid(bid: dict, genter_profile: str) -> dict:
    """공고 1건을 평가하여 점수·포지셔닝 JSON 반환. 파싱 실패 시 안전한 기본값."""
    user_msg = f"""# G엔터 프로필
{genter_profile}

# 입찰공고
공고명: {bid.get('bidNtceNm', '')}
추정가격: {bid.get('presmptPrce', 0)}원
내용 요지: {bid.get('bidNtceDtlsCn', '')[:1000]}

위 공고를 평가하여 JSON으로만 답하라."""

    response = _client().messages.create(
        model=MODEL,
        max_tokens=400,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    text = response.content[0].text.strip()
    try:
        # JSON 블록 추출 (LLM이 ```json 감쌀 경우 대비)
        if "```" in text:
            text = text.split("```")[1].lstrip("json").strip()
        return json.loads(text)
    except (json.JSONDecodeError, IndexError):
        return {
            "score": 0,
            "position": "A",
            "category": [],
            "rationale": "LLM 응답 파싱 실패",
            "flags": [],
        }
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_llm_client.py -v
```

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add genter-nara-bid/scripts/lib/llm_client.py genter-nara-bid/tests/test_llm_client.py
git commit -m "feat(genter-nara-bid): Claude Haiku 매칭 점수화 클라이언트"
```

---

### Task 5: notion_sync — Notion API 래퍼 (TDD)

**Files:**
- Create: `genter-nara-bid/scripts/lib/notion_sync.py`
- Test: `genter-nara-bid/tests/test_notion_sync.py`
- Create: `genter-nara-bid/data/seen_bids.json` (빈 `[]`)

- [ ] **Step 1: 테스트 작성**

`tests/test_notion_sync.py`:
```python
import json
from pathlib import Path
import httpx
import respx
from scripts.lib.notion_sync import (
    upsert_bid_page, load_seen, save_seen, build_page_properties,
)

NOTION_API = "https://api.notion.com/v1"

def test_build_page_properties_eligible():
    bid = {
        "bidNtceNo": "20260517001",
        "bidNtceNm": "지자체 SNS 운영",
        "ntceInsttNm": "용인시",
        "presmptPrce": "40000000",
        "bidNtceUrl": "https://g2b.go.kr/x",
    }
    eval_result = {"eligible": True, "exclusion_codes": [], "bonus": 20}
    score_result = {"score": 70, "position": "A", "category": ["콘텐츠"], "rationale": "fit", "flags": ["응찰가능"]}

    props = build_page_properties(bid, eval_result, score_result)

    assert props["공고명"]["title"][0]["text"]["content"] == "지자체 SNS 운영"
    assert props["공고번호"]["rich_text"][0]["text"]["content"] == "20260517001"
    assert props["추정가격"]["number"] == 40_000_000
    assert props["매칭점수"]["number"] == 90  # 70 + 20 bonus
    assert props["응찰가능여부"]["select"]["name"] == "가능"
    assert props["상태"]["status"]["name"] in ("검토중(권장)", "검토중(강력권장)")

def test_build_page_properties_ineligible():
    bid = {"bidNtceNo": "x", "bidNtceNm": "y", "presmptPrce": "0"}
    eval_result = {"eligible": False, "exclusion_codes": ["R3"], "bonus": 0}
    score_result = {"score": 60, "position": "A", "category": [], "rationale": "x", "flags": []}

    props = build_page_properties(bid, eval_result, score_result)
    assert props["응찰가능여부"]["select"]["name"] == "불가"
    assert props["상태"]["status"]["name"] == "응찰불가"

@respx.mock
def test_upsert_bid_page_creates(tmp_path):
    respx.post(f"{NOTION_API}/pages").mock(return_value=httpx.Response(200, json={"id": "page-id"}))
    bid = {"bidNtceNo": "20260517001", "bidNtceNm": "x", "presmptPrce": "0"}
    eval_result = {"eligible": True, "exclusion_codes": [], "bonus": 0}
    score_result = {"score": 50, "position": "A", "category": [], "rationale": "x", "flags": []}
    page_id = upsert_bid_page(bid, eval_result, score_result)
    assert page_id == "page-id"

def test_seen_bids_roundtrip(tmp_path, monkeypatch):
    p = tmp_path / "seen.json"
    monkeypatch.setattr("scripts.lib.notion_sync.SEEN_PATH", p)
    save_seen({"a", "b"})
    assert load_seen() == {"a", "b"}

def test_load_seen_missing_file(tmp_path, monkeypatch):
    p = tmp_path / "nope.json"
    monkeypatch.setattr("scripts.lib.notion_sync.SEEN_PATH", p)
    assert load_seen() == set()
```

- [ ] **Step 2: 실패 확인**

```bash
pytest tests/test_notion_sync.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`scripts/lib/notion_sync.py`:
```python
import json
import os
from pathlib import Path
import httpx

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
SEEN_PATH = Path(__file__).parent.parent.parent / "data" / "seen_bids.json"


def _headers():
    return {
        "Authorization": f"Bearer {os.environ['NOTION_TOKEN']}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _status_from(eval_result: dict, score: int, flags: list[str]) -> str:
    if not eval_result["eligible"]:
        return "응찰불가"
    if score >= 70 and "특별우선타겟" in flags:
        return "검토중(강력권장)"
    if score >= 70:
        return "검토중(권장)"
    if score >= 30:
        return "검토중"
    return "참고"


def build_page_properties(bid: dict, eval_result: dict, score_result: dict) -> dict:
    """공고+평가+점수 → Notion 페이지 properties."""
    score = score_result["score"] + eval_result["bonus"]
    flags = score_result.get("flags", [])
    return {
        "공고명": {"title": [{"text": {"content": bid.get("bidNtceNm", "")}}]},
        "공고번호": {"rich_text": [{"text": {"content": bid.get("bidNtceNo", "")}}]},
        "수요기관": {"select": {"name": bid.get("ntceInsttNm", "미정")}},
        "카테고리": {"multi_select": [{"name": c} for c in score_result.get("category", [])]},
        "추정가격": {"number": int(bid.get("presmptPrce") or 0)},
        "매칭점수": {"number": score},
        "매칭근거": {"rich_text": [{"text": {"content": score_result.get("rationale", "")[:1900]}}]},
        "추천 포지셔닝": {"select": {"name": score_result.get("position", "A")}},
        "응찰가능여부": {"select": {"name": "가능" if eval_result["eligible"] else "불가"}},
        "응찰불가사유": {"multi_select": [{"name": c} for c in eval_result.get("exclusion_codes", [])]},
        "상태": {"status": {"name": _status_from(eval_result, score, flags)}},
        "공고 원문": {"url": bid.get("bidNtceUrl") or None},
    }


def upsert_bid_page(bid: dict, eval_result: dict, score_result: dict) -> str:
    """공고를 Notion DB에 1건 추가(또는 갱신). 반환: page_id."""
    db_id = os.environ["NOTION_DB_ID"]
    props = build_page_properties(bid, eval_result, score_result)
    r = httpx.post(
        f"{NOTION_API}/pages",
        headers=_headers(),
        json={"parent": {"database_id": db_id}, "properties": props},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["id"]


def load_seen() -> set[str]:
    if not SEEN_PATH.exists():
        return set()
    return set(json.loads(SEEN_PATH.read_text()))


def save_seen(bids: set[str]) -> None:
    SEEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    SEEN_PATH.write_text(json.dumps(sorted(bids), ensure_ascii=False))
```

빈 `data/seen_bids.json` 생성:
```bash
mkdir -p genter-nara-bid/data
echo '[]' > genter-nara-bid/data/seen_bids.json
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_notion_sync.py -v
```

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add genter-nara-bid/scripts/lib/notion_sync.py genter-nara-bid/tests/test_notion_sync.py genter-nara-bid/data/seen_bids.json
git commit -m "feat(genter-nara-bid): Notion DB 동기화 + seen_bids 캐시"
```

---

### Task 6: poll_nara — 메인 entry point (통합 + TDD)

4개 모듈 조합. 키워드 1차 필터 포함. dry-run 모드 지원.

**Files:**
- Create: `genter-nara-bid/scripts/poll_nara.py`
- Test: `genter-nara-bid/tests/test_poll_nara.py`

- [ ] **Step 1: 테스트 작성**

`tests/test_poll_nara.py`:
```python
from unittest.mock import MagicMock
from scripts.poll_nara import keyword_match, run

def test_keyword_match_content():
    assert keyword_match({"bidNtceNm": "지자체 SNS 운영", "bidNtceDtlsCn": ""}) == ["콘텐츠"]

def test_keyword_match_influencer():
    assert keyword_match({"bidNtceNm": "인플루언서 체험단", "bidNtceDtlsCn": ""}) == ["인플루언서"]

def test_keyword_match_global():
    assert keyword_match({"bidNtceNm": "외국인 의료관광 홍보", "bidNtceDtlsCn": "샤오홍슈"}) == ["글로벌"]

def test_keyword_match_no_match():
    assert keyword_match({"bidNtceNm": "건물 청소 용역", "bidNtceDtlsCn": ""}) == []

def test_run_filters_and_loads(mocker):
    fetched = [
        {"bidNtceNo": "1", "bidNtceNm": "SNS 운영", "bidNtceDtlsCn": "콘텐츠", "presmptPrce": "40000000", "bidNtceUrl": ""},
        {"bidNtceNo": "2", "bidNtceNm": "건물 청소", "bidNtceDtlsCn": "", "presmptPrce": "10000000", "bidNtceUrl": ""},
        {"bidNtceNo": "3", "bidNtceNm": "유튜브 영상 제작", "bidNtceDtlsCn": "숏폼", "presmptPrce": "20000000", "bidNtceUrl": ""},
    ]
    mocker.patch("scripts.poll_nara.fetch_new_bids", return_value=fetched)
    mocker.patch("scripts.poll_nara.load_seen", return_value={"3"})  # #3는 이미 본 것
    save_seen = mocker.patch("scripts.poll_nara.save_seen")
    upsert = mocker.patch("scripts.poll_nara.upsert_bid_page", return_value="page-id")
    score = mocker.patch("scripts.poll_nara.score_bid", return_value={
        "score": 70, "position": "A", "category": ["콘텐츠"], "rationale": "x", "flags": [],
    })

    summary = run(dry_run=False)

    # #1만 신규 + 키워드 매치 → 1건 적재
    assert summary["fetched"] == 3
    assert summary["new"] == 2  # #1, #2
    assert summary["matched"] == 1  # #1 only (건물 청소 제외)
    assert summary["loaded"] == 1
    assert upsert.call_count == 1
    save_seen.assert_called_once()

def test_run_dry_run_no_writes(mocker):
    mocker.patch("scripts.poll_nara.fetch_new_bids", return_value=[
        {"bidNtceNo": "1", "bidNtceNm": "SNS 운영", "bidNtceDtlsCn": "", "presmptPrce": "40000000", "bidNtceUrl": ""},
    ])
    mocker.patch("scripts.poll_nara.load_seen", return_value=set())
    save_seen = mocker.patch("scripts.poll_nara.save_seen")
    upsert = mocker.patch("scripts.poll_nara.upsert_bid_page")
    mocker.patch("scripts.poll_nara.score_bid", return_value={
        "score": 70, "position": "A", "category": ["콘텐츠"], "rationale": "x", "flags": [],
    })

    summary = run(dry_run=True)
    assert summary["matched"] == 1
    assert summary["loaded"] == 0
    upsert.assert_not_called()
    save_seen.assert_not_called()
```

- [ ] **Step 2: 실패 확인**

```bash
pytest tests/test_poll_nara.py -v
```

Expected: ModuleNotFoundError.

- [ ] **Step 3: 구현**

`scripts/poll_nara.py`:
```python
"""매일 09:00 launchd로 실행. 신규 공고 폴링 → 필터 → Notion 적재."""
import argparse
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

# 프로젝트 루트의 .env 로드
load_dotenv(Path(__file__).parent.parent / ".env")

from scripts.lib.nara_api import fetch_new_bids
from scripts.lib.filter_rules import evaluate_bid
from scripts.lib.llm_client import score_bid
from scripts.lib.notion_sync import upsert_bid_page, load_seen, save_seen

KEYWORDS = {
    "콘텐츠": ["SNS", "누리소통망", "홍보", "홍보대행", "콘텐츠 제작", "숏폼", "유튜브", "인스타그램", "온라인 홍보", "채널 운영", "릴스", "소셜미디어"],
    "인플루언서": ["인플루언서", "크리에이터", "체험단", "KOL", "왕홍"],
    "글로벌": ["해외 홍보", "K-콘텐츠", "샤오홍슈", "小紅書", "외국인 관광", "중화권", "의료관광"],
}

GENTER_PROFILE_SHORT = (
    "주식회사 G엔터 — n천명 크리에이터 DB 보유, 숏폼·인플루언서 마케팅 전문. "
    "Instagram Reels/YouTube Shorts/Threads 특화. 의료·뷰티·금융·법률·환경 등 10대 업종 수행, "
    "협력병원1 샤오홍슈 왕홍 마케팅 + 협력업체1 + 지자체 협력프로젝트1 실적 보유. "
    "정직원 n명, 20nn년 설립, 단독 입찰만, 5천만 이하 사업 우선 응찰."
)

logger = logging.getLogger(__name__)


def keyword_match(bid: dict) -> list[str]:
    """공고가 매칭되는 카테고리 리스트 반환 (빈 리스트면 무관 공고)."""
    full_text = f"{bid.get('bidNtceNm', '')}\n{bid.get('bidNtceDtlsCn', '')}"
    matched = []
    for category, keywords in KEYWORDS.items():
        if any(kw in full_text for kw in keywords):
            matched.append(category)
    return matched


def run(dry_run: bool = False) -> dict:
    """1일 폴링 실행. 요약 dict 반환."""
    now = datetime.now()
    start = now - timedelta(days=1)
    logger.info(f"폴링 범위: {start} ~ {now}")

    fetched = fetch_new_bids(start=start, end=now)
    seen = load_seen()
    new_bids = [b for b in fetched if b["bidNtceNo"] not in seen]
    matched_bids = [b for b in new_bids if keyword_match(b)]
    logger.info(f"fetched={len(fetched)} new={len(new_bids)} matched={len(matched_bids)}")

    loaded = 0
    new_seen = set(seen)
    for bid in matched_bids:
        eval_result = evaluate_bid(bid)
        score_result = score_bid(bid, GENTER_PROFILE_SHORT)
        if dry_run:
            logger.info(f"[DRY] {bid['bidNtceNo']} score={score_result['score']+eval_result['bonus']} eligible={eval_result['eligible']}")
            continue
        try:
            upsert_bid_page(bid, eval_result, score_result)
            loaded += 1
            new_seen.add(bid["bidNtceNo"])
        except Exception as e:
            logger.exception(f"Notion 적재 실패 ({bid['bidNtceNo']}): {e}")

    # seen 캐시는 신규(매칭 무관)도 모두 기록 (재처리 방지)
    if not dry_run:
        new_seen.update(b["bidNtceNo"] for b in new_bids)
        save_seen(new_seen)

    summary = {"fetched": len(fetched), "new": len(new_bids), "matched": len(matched_bids), "loaded": loaded}
    logger.info(f"요약: {summary}")
    return summary


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
        handlers=[
            logging.FileHandler(Path(__file__).parent.parent / "logs" / "poll" / f"{datetime.now():%Y%m%d}.log"),
            logging.StreamHandler(sys.stdout),
        ],
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Notion 적재 없이 검증만")
    args = parser.parse_args()

    Path(__file__).parent.parent.joinpath("logs/poll").mkdir(parents=True, exist_ok=True)
    summary = run(dry_run=args.dry_run)
    print(summary)


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pytest tests/test_poll_nara.py -v && pytest tests/ -v --tb=short
```

Expected: 5 PASS (poll_nara) + 전체 단위 테스트 모두 PASS (filter_rules 10 + nara_api 3 + llm_client 2 + notion_sync 5 + poll_nara 5 = 25건).

- [ ] **Step 5: Commit**

```bash
git add genter-nara-bid/scripts/poll_nara.py genter-nara-bid/tests/test_poll_nara.py
git commit -m "feat(genter-nara-bid): poll_nara 메인 entry point (키워드 필터 + 통합)"
```

---

### Task 7: 수동 검증 — 실제 API 1회 실행

코드 없음. 실제 API 키로 dry-run 후 실제 적재.

- [ ] **Step 1: dry-run 실행 (Notion 적재 없음)**

```bash
cd genter-nara-bid
source .venv/bin/activate
python -m scripts.poll_nara --dry-run
```

Expected: 어제~오늘 신규 공고 수, 매칭 건수, 각 매칭 건 점수 로그 출력. Notion에는 아무것도 들어가지 않음.

확인사항:
- `fetched` 숫자가 적정한지 (보통 50~200)
- `matched` 건수 (보통 3~10)
- LLM 점수가 0이 아닌 합리적 값
- 에러 없이 종료

- [ ] **Step 2: 실제 1회 실행 (Notion 적재)**

```bash
python -m scripts.poll_nara
```

Expected: Notion DB에 매칭 건들이 행으로 추가됨.

- [ ] **Step 3: Notion DB 육안 검증**

브라우저에서 Notion DB 열어 확인:
- 모든 필드 정상 채워졌는지
- 점수·상태·포지셔닝 합리적인지
- 응찰불가 사유 정확한지

문제 있으면 task 2~6 코드 수정 후 재실행. 검증 통과까지 commit 없음.

- [ ] **Step 4: 검증 결과 기록**

`genter-nara-bid/logs/phase1_validation.md` 작성:
```markdown
# Phase 1 검증 (YYYY-MM-DD)
- fetched: N
- matched: N
- loaded: N
- 사용자 검토 의견:
- 조정 필요 항목:
```

- [ ] **Step 5: Commit (검증 통과 시)**

```bash
git add genter-nara-bid/logs/phase1_validation.md
git commit -m "test(genter-nara-bid): Phase 1 수동 검증 통과"
```

---

### Task 8: launchd 등록 — 매일 09:00 자동 실행

**Files:**
- Create: `genter-nara-bid/launchd/com.company.genter-nara-poll.plist`

- [ ] **Step 1: plist 작성**

`genter-nara-bid/launchd/com.company.genter-nara-poll.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.company.genter-nara-poll</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/user/Desktop/claude code/genter-nara-bid/.venv/bin/python</string>
        <string>-m</string>
        <string>scripts.poll_nara</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/user/Desktop/claude code/genter-nara-bid</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>9</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/user/Desktop/claude code/genter-nara-bid/logs/poll/launchd.out</string>
    <key>StandardErrorPath</key>
    <string>/Users/user/Desktop/claude code/genter-nara-bid/logs/poll/launchd.err</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
```

- [ ] **Step 2: 설치 및 로드**

```bash
cp "/Users/user/Desktop/claude code/genter-nara-bid/launchd/com.company.genter-nara-poll.plist" ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.company.genter-nara-poll.plist
launchctl list | grep genter-nara
```

Expected: `com.company.genter-nara-poll` 항목이 PID 또는 `-`(미실행)으로 나타남.

- [ ] **Step 3: 1회 즉시 트리거 (테스트)**

```bash
launchctl start com.company.genter-nara-poll
sleep 30
tail -50 "/Users/user/Desktop/claude code/genter-nara-bid/logs/poll/launchd.out"
```

Expected: 정상 로그 출력 + 요약 dict.

- [ ] **Step 4: Full Disk Access 확인**

만약 권한 오류 발생 시: 시스템 설정 > 개인 정보 보호 및 보안 > 전체 디스크 접근 권한 → `bash`, `python3`, `.venv/bin/python` 추가.

(메모리 `project_imessage_listener`에 동일 패턴 검증됨)

- [ ] **Step 5: Commit**

```bash
git add genter-nara-bid/launchd/com.company.genter-nara-poll.plist
git commit -m "feat(genter-nara-bid): launchd 매일 09:00 자동 폴링"
```

---

## Phase 1 완료 기준

- [ ] 25개 단위 테스트 모두 PASS
- [ ] 수동 검증 (Task 7) 통과 — Notion에 매칭 결과 정상 적재
- [ ] launchd 등록 후 1주일간 매일 09:00 정상 실행 확인
- [ ] 일 평균 매칭 적재 건수 ≥ 3
- [ ] `응찰불가` 자동 판정 정확도 사용자 샘플 검수 ≥ 90%

## 다음 Phase (별도 plan으로 작성)

- **Phase 2**: `rfp_analyzer.py` — Notion `RFP 분석` 체크박스 트리거, HWPX 처리, 6 STEP 분석
- **Phase 3**: HWP 구포맷 LibreOffice 변환, 변환 실패 Plan B
- **Phase 4**: `proposal_builder.py` — 9챕터 LLM 생성, docx 조립
- **Phase 5**: `draft_dispatcher.py` (매 5분 cron), Notion 폴링 통합

Phase 1이 1주일 안정 운영되면 Phase 2 plan을 새로 작성한다 (`docs/superpowers/plans/2026-XX-XX-genter-nara-bid-phase2.md`).
