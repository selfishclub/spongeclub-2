# Content Engine 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 릴스 스크립트 1개를 LinkedIn 포스트(풀 자동) + 뉴스레터(반자동)로 변환하는 독립 콘텐츠 엔진 구축

**Architecture:** 독립 `content-engine/` 모듈. CLI 진입점(`generate.py`)으로 오케스트레이터(`orchestrator/`)가 subprocess 호출. Claude API(Sonnet)로 변환, LinkedIn API로 발행, Beehiiv API로 뉴스레터. 데이터는 JSONL. 기존 orchestrator 텔레그램 봇에 명령어 추가.

**Tech Stack:** Python 3.13, httpx, anthropic SDK, APScheduler (기존 오케스트레이터), python-dotenv

**Spec:** `docs/superpowers/specs/2026-04-06-content-engine-design.md`

---

## 파일 구조

```
content-engine/
├── src/
│   ├── __init__.py
│   ├── config.py           # 환경변수 로드
│   ├── transformer.py      # 스크립트 → 채널별 변환 (Claude API)
│   ├── linkedin.py         # LinkedIn API 발행/토큰 관리
│   ├── newsletter.py       # Beehiiv API 초안/발행
│   └── watcher.py          # 새 스크립트 파일 감지 + 변환 트리거
├── prompts/
│   ├── linkedin.md         # LinkedIn 변환 프롬프트
│   └── newsletter.md       # 뉴스레터 변환 프롬프트
├── data/
│   ├── scripts/            # 릴스 스크립트 원본 (.md)
│   │   └── processed/      # 처리 완료 파일
│   ├── linkedin/           # 발행 이력 + 큐 (JSONL)
│   └── newsletter/         # 소재 블록 + 발행 이력 (JSONL)
├── tests/
│   ├── test_transformer.py
│   ├── test_linkedin.py
│   ├── test_newsletter.py
│   └── test_watcher.py
├── generate.py             # CLI 진입점 (오케스트레이터 호출용)
├── .env.example
├── requirements.txt
└── README.md
```

---

### Task 1: 프로젝트 스캐폴딩 + config

**Files:**
- Create: `content-engine/src/__init__.py`
- Create: `content-engine/src/config.py`
- Create: `content-engine/.env.example`
- Create: `content-engine/requirements.txt`

- [ ] **Step 1: 디렉토리 구조 생성**

```bash
cd "/Users/user/Desktop/claude code"
mkdir -p content-engine/{src,prompts,data/{scripts/processed,linkedin,newsletter},tests}
touch content-engine/src/__init__.py
touch content-engine/tests/__init__.py
```

- [ ] **Step 2: requirements.txt 작성**

```
# content-engine/requirements.txt
anthropic>=0.40.0
httpx>=0.27.0
python-dotenv>=1.0.0
```

- [ ] **Step 3: .env.example 작성**

```
# content-engine/.env.example
ANTHROPIC_API_KEY=sk-ant-...
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
LINKEDIN_ACCESS_TOKEN=
LINKEDIN_REFRESH_TOKEN=
LINKEDIN_TOKEN_EXPIRES_AT=
LINKEDIN_PERSON_URN=urn:li:person:XXXXXXX
BEEHIIV_API_KEY=
BEEHIIV_PUBLICATION_ID=
```

- [ ] **Step 4: config.py 작성**

```python
# content-engine/src/config.py
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


def _env(key: str, default: str = "") -> str:
    return os.getenv(key, default)


# Paths
PROJECT_ROOT = _ROOT
DATA_DIR = _ROOT / "data"
SCRIPTS_DIR = DATA_DIR / "scripts"
PROCESSED_DIR = SCRIPTS_DIR / "processed"
LINKEDIN_DIR = DATA_DIR / "linkedin"
NEWSLETTER_DIR = DATA_DIR / "newsletter"
PROMPTS_DIR = _ROOT / "prompts"

# AI
ANTHROPIC_API_KEY = _env("ANTHROPIC_API_KEY")
TRANSFORM_MODEL = "claude-sonnet-4-6-20250514"
NEWSLETTER_MODEL = "claude-opus-4-6-20250527"

# LinkedIn
LINKEDIN_CLIENT_ID = _env("LINKEDIN_CLIENT_ID")
LINKEDIN_CLIENT_SECRET = _env("LINKEDIN_CLIENT_SECRET")
LINKEDIN_ACCESS_TOKEN = _env("LINKEDIN_ACCESS_TOKEN")
LINKEDIN_REFRESH_TOKEN = _env("LINKEDIN_REFRESH_TOKEN")
LINKEDIN_TOKEN_EXPIRES_AT = _env("LINKEDIN_TOKEN_EXPIRES_AT")
LINKEDIN_PERSON_URN = _env("LINKEDIN_PERSON_URN")

# Beehiiv
BEEHIIV_API_KEY = _env("BEEHIIV_API_KEY")
BEEHIIV_PUBLICATION_ID = _env("BEEHIIV_PUBLICATION_ID")
```

- [ ] **Step 5: venv 생성 + 의존성 설치**

```bash
cd "/Users/user/Desktop/claude code/content-engine"
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

- [ ] **Step 6: 커밋**

```bash
cd "/Users/user/Desktop/claude code"
git add content-engine/
git commit -m "feat(content-engine): 프로젝트 스캐폴딩 — config, 디렉토리, 의존성"
```

---

### Task 2: 프롬프트 템플릿

**Files:**
- Create: `content-engine/prompts/linkedin.md`
- Create: `content-engine/prompts/newsletter.md`

- [ ] **Step 1: LinkedIn 프롬프트 작성**

```markdown
# content-engine/prompts/linkedin.md
당신은 마케팅과 AI 자동화 전문가입니다. 아래 릴스 스크립트를 LinkedIn 포스트로 변환하세요.

## 규칙
- 300-500자 (한국어 기준)
- 구조: [훅] → [인사이트] → [사례/수치] → [CTA]
- 훅: 스크롤을 멈추게 하는 첫 줄. 질문, 반직관적 주장, 수치 중 택 1.
- 인사이트: 릴스 핵심 메시지를 텍스트로 풀어쓰기. 전문가 톤.
- 사례/수치: 구체적 근거 1개 이상.
- CTA: "이런 경험 있으신가요?" 또는 뉴스레터 구독 유도.
- 이모지 최소화 (0-2개).
- 해시태그 3-5개 (#마케팅 #AI자동화 등).
- "마케팅 × AI" 관점 유지. 병원마케팅은 직접 언급하지 않되, 간접 사례로 활용 가능.

## 출력 형식
JSON:
```json
{
  "hook": "첫 줄",
  "body": "본문 전체 (훅 포함)",
  "hashtags": ["마케팅", "AI자동화", ...],
  "cta_type": "engagement|newsletter"
}
```

## 릴스 스크립트
{script}
```

- [ ] **Step 2: 뉴스레터 프롬프트 작성**

```markdown
# content-engine/prompts/newsletter.md
당신은 마케팅과 AI 자동화 전문가이자 뉴스레터 작가입니다. 아래 릴스 스크립트를 뉴스레터 소재 블록으로 변환하세요.

## 규칙
- 1500-2000자 (한국어 기준)
- 릴스에서 짧게 다룬 내용을 깊게 풀어쓰기.
- 실제 세팅 과정, 수치, 실패담 포함.
- 독자가 바로 따라할 수 있는 액션 아이템 1-2개.
- 마지막에 병원마케팅 사례를 자연스럽게 녹여서 전환 유도.
- 톤: 친근하지만 전문적. 대화체.

## 출력 형식
JSON:
```json
{
  "topic": "주제 한 줄",
  "tags": ["ai", "ads", ...],
  "linkedin_summary": "LinkedIn 포스트 핵심 1줄 (연결 맥락용)",
  "deep_dive_draft": "본문 전체",
  "action_items": ["액션 1", "액션 2"],
  "hospital_hook": "병원마케팅 전환 문장"
}
```

## 릴스 스크립트
{script}
```

- [ ] **Step 3: 커밋**

```bash
git add content-engine/prompts/
git commit -m "feat(content-engine): LinkedIn + 뉴스레터 프롬프트 템플릿"
```

---

### Task 3: transformer.py — 콘텐츠 변환 엔진

**Files:**
- Create: `content-engine/src/transformer.py`
- Create: `content-engine/tests/test_transformer.py`

- [ ] **Step 1: 테스트 작성**

```python
# content-engine/tests/test_transformer.py
from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest

from src.transformer import transform_script, _load_prompt, _parse_json_response


def test_load_prompt_substitutes_script():
    """프롬프트 템플릿에서 {script} 자리에 스크립트가 들어가는지."""
    with patch("builtins.open", MagicMock(return_value=MagicMock(
        __enter__=lambda s: s,
        __exit__=lambda *a: None,
        read=lambda s: "Prompt: {script}",
    ))):
        result = _load_prompt("linkedin", "테스트 스크립트")
        assert result == "Prompt: 테스트 스크립트"


def test_parse_json_response_extracts_json():
    """마크다운 코드블록에서 JSON을 파싱하는지."""
    raw = '```json\n{"hook": "테스트"}\n```'
    result = _parse_json_response(raw)
    assert result["hook"] == "테스트"


def test_parse_json_response_plain():
    """코드블록 없는 순수 JSON도 파싱하는지."""
    raw = '{"hook": "테스트"}'
    result = _parse_json_response(raw)
    assert result["hook"] == "테스트"


def test_parse_json_response_invalid():
    """파싱 실패 시 빈 dict 반환."""
    result = _parse_json_response("not json at all")
    assert result == {}


@patch("src.transformer._call_claude")
def test_transform_script_returns_both_channels(mock_claude):
    """스크립트 변환 시 linkedin + newsletter 두 결과 반환."""
    mock_claude.side_effect = [
        '{"hook":"훅","body":"본문","hashtags":["AI"],"cta_type":"engagement"}',
        '{"topic":"주제","tags":["ai"],"linkedin_summary":"요약","deep_dive_draft":"본문","action_items":["1"],"hospital_hook":"병원"}',
    ]
    result = transform_script("테스트 스크립트")
    assert "linkedin" in result
    assert "newsletter" in result
    assert result["linkedin"]["hook"] == "훅"
    assert result["newsletter"]["topic"] == "주제"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd "/Users/user/Desktop/claude code/content-engine"
.venv/bin/python -m pytest tests/test_transformer.py -v
```

Expected: FAIL (모듈 없음)

- [ ] **Step 3: transformer.py 구현**

```python
# content-engine/src/transformer.py
from __future__ import annotations

import json
import logging
from pathlib import Path

import anthropic

from src import config

logger = logging.getLogger(__name__)


def _load_prompt(channel: str, script: str) -> str:
    """프롬프트 템플릿을 로드하고 {script} 치환."""
    path = config.PROMPTS_DIR / f"{channel}.md"
    with open(path) as f:
        template = f.read()
    return template.replace("{script}", script)


def _parse_json_response(raw: str) -> dict:
    """Claude 응답에서 JSON을 추출. 마크다운 코드블록 처리."""
    cleaned = raw.strip()
    if "```json" in cleaned:
        cleaned = cleaned.split("```json")[1].split("```")[0]
    elif "```" in cleaned:
        cleaned = cleaned.split("```")[1].split("```")[0]
    try:
        return json.loads(cleaned.strip())
    except (json.JSONDecodeError, IndexError):
        logger.error("JSON 파싱 실패: %s", raw[:200])
        return {}


def _call_claude(prompt: str, model: str) -> str:
    """Anthropic SDK로 Claude 호출."""
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=model,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def transform_script(script: str) -> dict:
    """릴스 스크립트를 LinkedIn + Newsletter 소재로 변환.

    Returns:
        {"linkedin": {...}, "newsletter": {...}}
    """
    linkedin_prompt = _load_prompt("linkedin", script)
    linkedin_raw = _call_claude(linkedin_prompt, config.TRANSFORM_MODEL)
    linkedin_data = _parse_json_response(linkedin_raw)

    newsletter_prompt = _load_prompt("newsletter", script)
    newsletter_raw = _call_claude(newsletter_prompt, config.NEWSLETTER_MODEL)
    newsletter_data = _parse_json_response(newsletter_raw)

    return {
        "linkedin": linkedin_data,
        "newsletter": newsletter_data,
    }
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
cd "/Users/user/Desktop/claude code/content-engine"
.venv/bin/python -m pytest tests/test_transformer.py -v
```

Expected: 5 passed

- [ ] **Step 5: 커밋**

```bash
git add content-engine/src/transformer.py content-engine/tests/test_transformer.py
git commit -m "feat(content-engine): transformer — Claude API로 스크립트 변환"
```

---

### Task 4: linkedin.py — LinkedIn API 발행

**Files:**
- Create: `content-engine/src/linkedin.py`
- Create: `content-engine/tests/test_linkedin.py`

- [ ] **Step 1: 테스트 작성**

```python
# content-engine/tests/test_linkedin.py
from __future__ import annotations

import json
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.linkedin import (
    enqueue_post,
    dequeue_post,
    publish_post,
    check_token_expiry,
    _build_post_payload,
)


@pytest.fixture
def tmp_linkedin_dir(tmp_path):
    queue_dir = tmp_path / "linkedin"
    queue_dir.mkdir()
    return queue_dir


def test_enqueue_post_writes_jsonl(tmp_linkedin_dir):
    """포스트를 큐에 추가하면 JSONL에 기록."""
    with patch("src.linkedin.config") as mock_cfg:
        mock_cfg.LINKEDIN_DIR = tmp_linkedin_dir
        enqueue_post({"hook": "훅", "body": "본문", "hashtags": ["AI"], "cta_type": "engagement"}, "test.md")

    queue_file = tmp_linkedin_dir / "queue.jsonl"
    assert queue_file.exists()
    line = json.loads(queue_file.read_text().strip())
    assert line["source_script"] == "test.md"
    assert line["status"] == "pending"


def test_dequeue_post_returns_oldest_pending(tmp_linkedin_dir):
    """큐에서 가장 오래된 pending 포스트를 반환."""
    queue_file = tmp_linkedin_dir / "queue.jsonl"
    entries = [
        {"id": "1", "status": "published", "body": "old"},
        {"id": "2", "status": "pending", "body": "this one"},
        {"id": "3", "status": "pending", "body": "newer"},
    ]
    queue_file.write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in entries))

    with patch("src.linkedin.config") as mock_cfg:
        mock_cfg.LINKEDIN_DIR = tmp_linkedin_dir
        post = dequeue_post()

    assert post["id"] == "2"


def test_dequeue_post_returns_none_when_empty(tmp_linkedin_dir):
    """큐가 비어있으면 None 반환."""
    with patch("src.linkedin.config") as mock_cfg:
        mock_cfg.LINKEDIN_DIR = tmp_linkedin_dir
        post = dequeue_post()

    assert post is None


def test_build_post_payload():
    """LinkedIn API 페이로드 구조 확인."""
    payload = _build_post_payload("테스트 본문\n#AI", "urn:li:person:ABC")
    assert payload["author"] == "urn:li:person:ABC"
    assert "테스트 본문" in payload["specificContent"]["com.linkedin.ugc.ShareContent"]["shareCommentary"]["text"]


def test_check_token_expiry_warns_when_near():
    """토큰 만료 7일 이내면 경고 반환."""
    near_future = str(int(time.time()) + 86400 * 5)  # 5일 후
    with patch("src.linkedin.config") as mock_cfg:
        mock_cfg.LINKEDIN_TOKEN_EXPIRES_AT = near_future
        result = check_token_expiry()

    assert result["warn"] is True
    assert result["days_left"] <= 7


def test_check_token_expiry_ok_when_far():
    """토큰 만료 7일 넘으면 정상."""
    far_future = str(int(time.time()) + 86400 * 30)  # 30일 후
    with patch("src.linkedin.config") as mock_cfg:
        mock_cfg.LINKEDIN_TOKEN_EXPIRES_AT = far_future
        result = check_token_expiry()

    assert result["warn"] is False
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
.venv/bin/python -m pytest tests/test_linkedin.py -v
```

- [ ] **Step 3: linkedin.py 구현**

```python
# content-engine/src/linkedin.py
from __future__ import annotations

import json
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

from src import config

logger = logging.getLogger(__name__)

LINKEDIN_API_BASE = "https://api.linkedin.com/v2"


def enqueue_post(linkedin_data: dict, source_script: str) -> str:
    """변환된 LinkedIn 포스트를 발행 큐에 추가."""
    post_id = str(uuid.uuid4())[:8]
    entry = {
        "id": post_id,
        "source_script": source_script,
        "channel": "linkedin",
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "published_at": None,
        **linkedin_data,
    }
    queue_file = config.LINKEDIN_DIR / "queue.jsonl"
    with open(queue_file, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return post_id


def dequeue_post() -> dict | None:
    """큐에서 가장 오래된 pending 포스트를 반환."""
    queue_file = config.LINKEDIN_DIR / "queue.jsonl"
    if not queue_file.exists():
        return None
    lines = queue_file.read_text().strip().split("\n")
    for line in lines:
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("status") == "pending":
            return entry
    return None


def _mark_published(post_id: str) -> None:
    """큐에서 해당 포스트를 published로 변경."""
    queue_file = config.LINKEDIN_DIR / "queue.jsonl"
    if not queue_file.exists():
        return
    lines = queue_file.read_text().strip().split("\n")
    updated = []
    for line in lines:
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("id") == post_id:
            entry["status"] = "published"
            entry["published_at"] = datetime.now(timezone.utc).isoformat()
        updated.append(json.dumps(entry, ensure_ascii=False))
    queue_file.write_text("\n".join(updated) + "\n")


def _build_post_payload(text: str, person_urn: str) -> dict:
    """LinkedIn UGC Post API 페이로드 생성."""
    return {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }


def refresh_access_token() -> dict:
    """LinkedIn refresh token으로 access token 갱신.

    Returns:
        {"success": bool, "new_access_token": str|None, "error": str|None}
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                "https://www.linkedin.com/oauth/v2/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": config.LINKEDIN_REFRESH_TOKEN,
                    "client_id": config.LINKEDIN_CLIENT_ID,
                    "client_secret": config.LINKEDIN_CLIENT_SECRET,
                },
            )
        data = resp.json()
        if resp.status_code == 200 and "access_token" in data:
            # .env의 토큰 값을 업데이트 (token.json 파일로 관리)
            token_file = config.LINKEDIN_DIR / "token.json"
            token_data = {
                "access_token": data["access_token"],
                "refresh_token": data.get("refresh_token", config.LINKEDIN_REFRESH_TOKEN),
                "expires_at": str(int(time.time()) + data.get("expires_in", 5184000)),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            token_file.write_text(json.dumps(token_data, indent=2))
            return {"success": True, "new_access_token": data["access_token"], "error": None}
        else:
            return {"success": False, "new_access_token": None, "error": resp.text[:300]}
    except Exception as exc:
        return {"success": False, "new_access_token": None, "error": str(exc)}


def _get_access_token() -> str:
    """토큰 파일이 있으면 그걸 쓰고, 없으면 .env에서."""
    token_file = config.LINKEDIN_DIR / "token.json"
    if token_file.exists():
        data = json.loads(token_file.read_text())
        return data.get("access_token", config.LINKEDIN_ACCESS_TOKEN)
    return config.LINKEDIN_ACCESS_TOKEN


def publish_post(post: dict) -> dict:
    """LinkedIn API로 포스트 발행. 401 시 토큰 자동 갱신 1회 시도.

    Returns:
        {"success": True/False, "post_id": str, "error": str|None}
    """
    body_text = post.get("body", "")
    hashtags = post.get("hashtags", [])
    if hashtags:
        body_text += "\n\n" + " ".join(f"#{tag}" for tag in hashtags)

    payload = _build_post_payload(body_text, config.LINKEDIN_PERSON_URN)

    for attempt in range(2):
        try:
            token = _get_access_token()
            with httpx.Client(timeout=30) as client:
                resp = client.post(
                    f"{LINKEDIN_API_BASE}/ugcPosts",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {token}",
                        "X-Restli-Protocol-Version": "2.0.0",
                    },
                )
            if resp.status_code == 201:
                _mark_published(post["id"])
                return {"success": True, "post_id": post["id"], "error": None}
            elif resp.status_code == 401 and attempt == 0:
                logger.warning("LinkedIn 401 — refresh token으로 갱신 시도")
                refresh_result = refresh_access_token()
                if not refresh_result["success"]:
                    return {"success": False, "post_id": post["id"], "error": f"토큰 갱신 실패: {refresh_result['error']}"}
                continue
            else:
                logger.error("LinkedIn API 실패 %d: %s", resp.status_code, resp.text[:300])
                return {"success": False, "post_id": post["id"], "error": resp.text[:300]}
        except Exception as exc:
            logger.error("LinkedIn 발행 에러: %s", exc)
            return {"success": False, "post_id": post["id"], "error": str(exc)}
    return {"success": False, "post_id": post["id"], "error": "max retries"}


def check_token_expiry() -> dict:
    """LinkedIn refresh token 만료일 확인.

    Returns:
        {"warn": bool, "days_left": int, "expires_at": str}
    """
    expires_at = config.LINKEDIN_TOKEN_EXPIRES_AT
    if not expires_at:
        return {"warn": True, "days_left": 0, "expires_at": "unknown"}

    expires_ts = int(expires_at)
    now_ts = int(time.time())
    days_left = max(0, (expires_ts - now_ts) // 86400)

    return {
        "warn": days_left <= 7,
        "days_left": days_left,
        "expires_at": datetime.fromtimestamp(expires_ts, tz=timezone.utc).isoformat(),
    }
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
.venv/bin/python -m pytest tests/test_linkedin.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add content-engine/src/linkedin.py content-engine/tests/test_linkedin.py
git commit -m "feat(content-engine): LinkedIn API 발행 + 큐 관리 + 토큰 만료 체크"
```

---

### Task 5: newsletter.py — Beehiiv API 연동

**Files:**
- Create: `content-engine/src/newsletter.py`
- Create: `content-engine/tests/test_newsletter.py`

- [ ] **Step 1: 테스트 작성**

```python
# content-engine/tests/test_newsletter.py
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.newsletter import (
    store_block,
    get_unused_blocks,
    build_newsletter_draft,
    create_beehiiv_draft,
    publish_beehiiv_post,
)


@pytest.fixture
def tmp_newsletter_dir(tmp_path):
    d = tmp_path / "newsletter"
    d.mkdir()
    return d


def test_store_block_writes_jsonl(tmp_newsletter_dir):
    """소재 블록 저장 시 JSONL에 기록."""
    with patch("src.newsletter.config") as mock_cfg:
        mock_cfg.NEWSLETTER_DIR = tmp_newsletter_dir
        store_block({"topic": "AI 광고", "tags": ["ai"]}, "test.md")

    blocks_file = tmp_newsletter_dir / "blocks.jsonl"
    assert blocks_file.exists()
    block = json.loads(blocks_file.read_text().strip())
    assert block["source_script"] == "test.md"
    assert block["used_in_newsletter"] is None


def test_get_unused_blocks_filters_used(tmp_newsletter_dir):
    """사용되지 않은 블록만 반환."""
    blocks_file = tmp_newsletter_dir / "blocks.jsonl"
    entries = [
        {"id": "1", "topic": "A", "used_in_newsletter": "2026-04-01"},
        {"id": "2", "topic": "B", "used_in_newsletter": None},
        {"id": "3", "topic": "C", "used_in_newsletter": None},
    ]
    blocks_file.write_text("\n".join(json.dumps(e, ensure_ascii=False) for e in entries))

    with patch("src.newsletter.config") as mock_cfg:
        mock_cfg.NEWSLETTER_DIR = tmp_newsletter_dir
        unused = get_unused_blocks()

    assert len(unused) == 2
    assert unused[0]["topic"] == "B"


@patch("src.newsletter._call_claude")
def test_build_newsletter_draft_uses_opus(mock_claude):
    """뉴스레터 초안 생성 시 Opus 모델 사용."""
    mock_claude.return_value = "뉴스레터 초안 내용"
    blocks = [
        {"topic": "A", "deep_dive_draft": "내용A", "action_items": ["1"]},
        {"topic": "B", "deep_dive_draft": "내용B", "action_items": ["2"]},
    ]
    with patch("src.newsletter.config") as mock_cfg:
        mock_cfg.NEWSLETTER_MODEL = "claude-opus-4-6-20250527"
        mock_cfg.PROMPTS_DIR = Path("/tmp")
        result = build_newsletter_draft(blocks)

    assert "뉴스레터 초안 내용" in result
    mock_claude.assert_called_once()
    call_args = mock_claude.call_args
    assert "claude-opus-4-6" in call_args[0][1]
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
.venv/bin/python -m pytest tests/test_newsletter.py -v
```

- [ ] **Step 3: newsletter.py 구현**

```python
# content-engine/src/newsletter.py
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import anthropic
import httpx

from src import config

logger = logging.getLogger(__name__)

BEEHIIV_API_BASE = "https://api.beehiiv.com/v2"


def _call_claude(prompt: str, model: str) -> str:
    """Anthropic SDK로 Claude 호출."""
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
    message = client.messages.create(
        model=model,
        max_tokens=8192,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


def store_block(newsletter_data: dict, source_script: str) -> str:
    """뉴스레터 소재 블록을 저장."""
    block_id = str(uuid.uuid4())[:8]
    entry = {
        "id": block_id,
        "source_script": source_script,
        "channel": "newsletter",
        "status": "stored",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used_in_newsletter": None,
        **newsletter_data,
    }
    blocks_file = config.NEWSLETTER_DIR / "blocks.jsonl"
    with open(blocks_file, "a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return block_id


def get_unused_blocks() -> list[dict]:
    """아직 뉴스레터에 사용되지 않은 소재 블록 목록."""
    blocks_file = config.NEWSLETTER_DIR / "blocks.jsonl"
    if not blocks_file.exists():
        return []
    blocks = []
    for line in blocks_file.read_text().strip().split("\n"):
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("used_in_newsletter") is None:
            blocks.append(entry)
    return blocks


def _mark_blocks_used(block_ids: list[str], newsletter_date: str) -> None:
    """블록들을 사용 완료로 마킹."""
    blocks_file = config.NEWSLETTER_DIR / "blocks.jsonl"
    if not blocks_file.exists():
        return
    lines = blocks_file.read_text().strip().split("\n")
    updated = []
    for line in lines:
        if not line:
            continue
        entry = json.loads(line)
        if entry.get("id") in block_ids:
            entry["used_in_newsletter"] = newsletter_date
        updated.append(json.dumps(entry, ensure_ascii=False))
    blocks_file.write_text("\n".join(updated) + "\n")


def build_newsletter_draft(blocks: list[dict]) -> str:
    """소재 블록들을 엮어 뉴스레터 초안 생성 (Opus)."""
    blocks_summary = "\n\n---\n\n".join(
        f"## {b['topic']}\n{b.get('deep_dive_draft', '')}\n\n액션: {', '.join(b.get('action_items', []))}"
        for b in blocks
    )
    prompt = (
        "아래 소재 블록들을 하나의 주간 뉴스레터로 엮어주세요.\n"
        "톤: 친근하지만 전문적. 대화체.\n"
        "구조: 인트로(이번 주 핵심 1줄) → 소재별 섹션 → 마무리(다음 주 예고 + CTA)\n"
        "HTML 형식으로 출력하세요.\n\n"
        f"{blocks_summary}"
    )
    return _call_claude(prompt, config.NEWSLETTER_MODEL)


def create_beehiiv_draft(title: str, html_content: str) -> dict:
    """Beehiiv에 초안 생성.

    Returns:
        {"success": bool, "post_id": str|None, "preview_url": str|None, "error": str|None}
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.post(
                f"{BEEHIIV_API_BASE}/publications/{config.BEEHIIV_PUBLICATION_ID}/posts",
                json={
                    "title": title,
                    "content": [{"type": "html", "html": html_content}],
                    "status": "draft",
                },
                headers={
                    "Authorization": f"Bearer {config.BEEHIIV_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
        data = resp.json()
        if resp.status_code in (200, 201):
            return {
                "success": True,
                "post_id": data.get("data", {}).get("id"),
                "preview_url": data.get("data", {}).get("preview_url"),
                "error": None,
            }
        else:
            return {"success": False, "post_id": None, "preview_url": None, "error": resp.text[:300]}
    except Exception as exc:
        return {"success": False, "post_id": None, "preview_url": None, "error": str(exc)}


def publish_beehiiv_post(post_id: str) -> dict:
    """Beehiiv 초안을 발행 상태로 전환.

    Returns:
        {"success": bool, "error": str|None}
    """
    try:
        with httpx.Client(timeout=30) as client:
            resp = client.put(
                f"{BEEHIIV_API_BASE}/publications/{config.BEEHIIV_PUBLICATION_ID}/posts/{post_id}",
                json={"status": "published"},
                headers={
                    "Authorization": f"Bearer {config.BEEHIIV_API_KEY}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code in (200, 204):
            _clear_draft_state()
            return {"success": True, "error": None}
        else:
            return {"success": False, "error": resp.text[:300]}
    except Exception as exc:
        return {"success": False, "error": str(exc)}


def save_draft_state(post_id: str, preview_url: str, block_ids: list[str]) -> None:
    """현재 Beehiiv 초안 상태를 저장 (텔레그램 승인 플로우용)."""
    state_file = config.NEWSLETTER_DIR / "draft_state.json"
    state = {
        "beehiiv_post_id": post_id,
        "preview_url": preview_url,
        "block_ids": block_ids,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2))


def load_draft_state() -> dict | None:
    """현재 초안 상태 로드. 없으면 None."""
    state_file = config.NEWSLETTER_DIR / "draft_state.json"
    if not state_file.exists():
        return None
    return json.loads(state_file.read_text())


def _clear_draft_state() -> None:
    """발행 완료 후 초안 상태 파일 삭제."""
    state_file = config.NEWSLETTER_DIR / "draft_state.json"
    if state_file.exists():
        state_file.unlink()
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
.venv/bin/python -m pytest tests/test_newsletter.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add content-engine/src/newsletter.py content-engine/tests/test_newsletter.py
git commit -m "feat(content-engine): Beehiiv 뉴스레터 — 소재 축적, 초안 생성, 발행"
```

---

### Task 6: watcher.py — 파일 감지 + 변환 트리거

**Files:**
- Create: `content-engine/src/watcher.py`
- Create: `content-engine/tests/test_watcher.py`

- [ ] **Step 1: 테스트 작성**

```python
# content-engine/tests/test_watcher.py
from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src.watcher import scan_new_scripts, process_script


@pytest.fixture
def tmp_data(tmp_path):
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    processed = scripts / "processed"
    processed.mkdir()
    linkedin = tmp_path / "linkedin"
    linkedin.mkdir()
    newsletter = tmp_path / "newsletter"
    newsletter.mkdir()
    return tmp_path


def test_scan_new_scripts_finds_md_files(tmp_data):
    """scripts/ 폴더에서 .md 파일만 감지."""
    (tmp_data / "scripts" / "reel-1.md").write_text("스크립트 1")
    (tmp_data / "scripts" / "reel-2.md").write_text("스크립트 2")
    (tmp_data / "scripts" / "notes.txt").write_text("이건 무시")

    with patch("src.watcher.config") as mock_cfg:
        mock_cfg.SCRIPTS_DIR = tmp_data / "scripts"
        result = scan_new_scripts()

    assert len(result) == 2
    assert all(p.suffix == ".md" for p in result)


def test_scan_new_scripts_ignores_processed(tmp_data):
    """processed/ 안의 파일은 무시."""
    (tmp_data / "scripts" / "reel-1.md").write_text("새 것")
    (tmp_data / "scripts" / "processed" / "old.md").write_text("처리됨")

    with patch("src.watcher.config") as mock_cfg:
        mock_cfg.SCRIPTS_DIR = tmp_data / "scripts"
        result = scan_new_scripts()

    assert len(result) == 1


@patch("src.watcher.linkedin.enqueue_post")
@patch("src.watcher.newsletter.store_block")
@patch("src.watcher.transformer.transform_script")
def test_process_script_transforms_and_stores(mock_transform, mock_store, mock_enqueue, tmp_data):
    """스크립트 처리 시 변환 → LinkedIn 큐 + Newsletter 저장 → processed로 이동."""
    script_file = tmp_data / "scripts" / "reel-1.md"
    script_file.write_text("테스트 스크립트")

    mock_transform.return_value = {
        "linkedin": {"hook": "훅", "body": "본문"},
        "newsletter": {"topic": "주제", "deep_dive_draft": "내용"},
    }

    with patch("src.watcher.config") as mock_cfg:
        mock_cfg.SCRIPTS_DIR = tmp_data / "scripts"
        mock_cfg.PROCESSED_DIR = tmp_data / "scripts" / "processed"
        process_script(script_file)

    mock_transform.assert_called_once_with("테스트 스크립트")
    mock_enqueue.assert_called_once()
    mock_store.assert_called_once()
    assert not script_file.exists()
    assert (tmp_data / "scripts" / "processed" / "reel-1.md").exists()
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
.venv/bin/python -m pytest tests/test_watcher.py -v
```

- [ ] **Step 3: watcher.py 구현**

```python
# content-engine/src/watcher.py
from __future__ import annotations

import logging
import shutil
from pathlib import Path

from src import config
from src import transformer
from src import linkedin
from src import newsletter

logger = logging.getLogger(__name__)


def scan_new_scripts() -> list[Path]:
    """scripts/ 폴더에서 새 .md 파일 목록 반환 (processed/ 제외)."""
    scripts_dir = config.SCRIPTS_DIR
    if not scripts_dir.exists():
        return []
    return sorted(
        p for p in scripts_dir.glob("*.md")
        if p.is_file()
    )


def process_script(script_path: Path) -> dict:
    """스크립트 파일 1개를 변환 → LinkedIn 큐 + Newsletter 저장 → processed로 이동.

    Returns:
        {"linkedin_id": str, "newsletter_id": str, "script": str}
    """
    script_text = script_path.read_text()
    filename = script_path.name

    logger.info("변환 시작: %s", filename)
    result = transformer.transform_script(script_text)

    linkedin_id = ""
    newsletter_id = ""

    if result.get("linkedin"):
        linkedin_id = linkedin.enqueue_post(result["linkedin"], filename)
        logger.info("LinkedIn 큐 추가: %s (from %s)", linkedin_id, filename)

    if result.get("newsletter"):
        newsletter_id = newsletter.store_block(result["newsletter"], filename)
        logger.info("Newsletter 블록 저장: %s (from %s)", newsletter_id, filename)

    # processed/로 이동
    dest = config.PROCESSED_DIR / filename
    shutil.move(str(script_path), str(dest))
    logger.info("처리 완료 → %s", dest)

    return {"linkedin_id": linkedin_id, "newsletter_id": newsletter_id, "script": filename}


def run_watch_cycle() -> list[dict]:
    """전체 감지 사이클. 새 스크립트 모두 처리.

    Returns:
        처리된 스크립트별 결과 리스트
    """
    scripts = scan_new_scripts()
    if not scripts:
        return []

    results = []
    for script_path in scripts:
        try:
            result = process_script(script_path)
            results.append(result)
        except Exception as exc:
            logger.error("스크립트 처리 실패 (%s): %s", script_path.name, exc)
    return results
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
.venv/bin/python -m pytest tests/test_watcher.py -v
```

- [ ] **Step 5: 커밋**

```bash
git add content-engine/src/watcher.py content-engine/tests/test_watcher.py
git commit -m "feat(content-engine): watcher — 스크립트 파일 감지 + 변환 트리거"
```

---

### Task 7: generate.py — CLI 진입점

**Files:**
- Create: `content-engine/generate.py`

- [ ] **Step 1: generate.py 작성**

```python
#!/usr/bin/env python3
# content-engine/generate.py
"""Content Engine CLI — 오케스트레이터가 subprocess로 호출.

Usage:
    python generate.py watch          # 새 스크립트 감지 + 변환
    python generate.py publish        # LinkedIn 큐에서 1개 발행
    python generate.py newsletter     # 뉴스레터 초안 생성
    python generate.py token-check    # LinkedIn 토큰 만료 확인
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone

from src import config
from src.watcher import run_watch_cycle
from src.linkedin import dequeue_post, publish_post, check_token_expiry
from src.newsletter import get_unused_blocks, build_newsletter_draft, create_beehiiv_draft, save_draft_state, load_draft_state, publish_beehiiv_post


def cmd_watch() -> dict:
    results = run_watch_cycle()
    return {"action": "watch", "processed": len(results), "details": results}


def cmd_publish() -> dict:
    post = dequeue_post()
    if not post:
        return {"action": "publish", "result": "skip", "reason": "큐 비어있음"}
    result = publish_post(post)
    return {"action": "publish", "result": result}


def cmd_newsletter() -> dict:
    blocks = get_unused_blocks()
    if len(blocks) < 2:
        return {"action": "newsletter", "result": "skip", "reason": f"소재 부족 ({len(blocks)}개)"}

    selected = blocks[:4]
    draft_html = build_newsletter_draft(selected)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    title = f"마케팅 × AI 위클리 — {today}"
    beehiiv_result = create_beehiiv_draft(title, draft_html)

    # 초안 상태 저장 (텔레그램 승인 플로우용)
    if beehiiv_result.get("success") and beehiiv_result.get("post_id"):
        save_draft_state(
            post_id=beehiiv_result["post_id"],
            preview_url=beehiiv_result.get("preview_url", ""),
            block_ids=[b["id"] for b in selected],
        )

    return {
        "action": "newsletter",
        "blocks_used": len(selected),
        "beehiiv": beehiiv_result,
    }


def cmd_newsletter_publish() -> dict:
    """텔레그램 /뉴스레터발행 명령어 처리."""
    state = load_draft_state()
    if not state:
        return {"action": "newsletter-publish", "result": "skip", "reason": "발행할 초안 없음"}
    result = publish_beehiiv_post(state["beehiiv_post_id"])
    return {"action": "newsletter-publish", "result": result}


def cmd_token_check() -> dict:
    return {"action": "token-check", **check_token_expiry()}


def main() -> None:
    commands = {
        "watch": cmd_watch,
        "publish": cmd_publish,
        "newsletter": cmd_newsletter,
        "newsletter-publish": cmd_newsletter_publish,
        "token-check": cmd_token_check,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        print(json.dumps({"error": f"Usage: {sys.argv[0]} [{'/'.join(commands)}]"}))
        sys.exit(1)

    result = commands[sys.argv[1]]()
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 실행 테스트**

```bash
cd "/Users/user/Desktop/claude code/content-engine"
.venv/bin/python generate.py --help 2>&1 || true
.venv/bin/python generate.py watch
```

Expected: `{"action": "watch", "processed": 0, "details": []}` (스크립트 없으니 0)

- [ ] **Step 3: 커밋**

```bash
git add content-engine/generate.py
git commit -m "feat(content-engine): CLI 진입점 — watch/publish/newsletter/token-check"
```

---

### Task 8: 오케스트레이터 연동

**Files:**
- Modify: `orchestrator/src/jobs.py` (잡 함수 추가)
- Modify: `orchestrator/orchestrator.py` (스케줄러 잡 등록)

- [ ] **Step 1: orchestrator 구조 파악**

`orchestrator/orchestrator.py`의 기존 잡 등록 패턴, `src/jobs.py`의 기존 잡 함수 구조, `src/telegram_bot.py`의 TelegramBot 클래스 확인. 기존 패턴: `jobs.py`에 함수 정의 → `orchestrator.py`에서 `scheduler.add_job()` 등록.

- [ ] **Step 2: `orchestrator/src/jobs.py`에 content-engine 잡 4개 추가**

기존 `instagram_content()` 패턴을 따라 잡 함수 추가:

```python
# content-engine 잡 함수들
def content_watch(bot: TelegramBot, project_root: Path) -> None:
    """5분마다: 새 스크립트 감지 → 변환."""
    engine_dir = project_root / "content-engine"
    venv_python = engine_dir / ".venv" / "bin" / "python3"
    python_cmd = str(venv_python) if venv_python.exists() else "python3"
    try:
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "watch"],
            capture_output=True, text=True, timeout=180, cwd=str(engine_dir),
        )
        if result.returncode != 0:
            logger.error("content-watch failed: %s", result.stderr[:300])
            return
        data = json.loads(result.stdout)
        if data.get("processed", 0) > 0:
            bot.send(f"[Content Engine] {data['processed']}개 스크립트 변환 완료")
    except Exception as exc:
        logger.error("content-watch error: %s", exc)


def content_publish(bot: TelegramBot, project_root: Path) -> None:
    """평일 10시: LinkedIn 발행."""
    engine_dir = project_root / "content-engine"
    venv_python = engine_dir / ".venv" / "bin" / "python3"
    python_cmd = str(venv_python) if venv_python.exists() else "python3"
    try:
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "publish"],
            capture_output=True, text=True, timeout=60, cwd=str(engine_dir),
        )
        if result.returncode != 0:
            logger.error("content-publish failed: %s", result.stderr[:300])
            return
        data = json.loads(result.stdout)
        if data.get("result") != "skip":
            bot.send(f"[LinkedIn] 포스트 발행 완료: {data['result'].get('post_id', '')}")
    except Exception as exc:
        logger.error("content-publish error: %s", exc)


def content_newsletter(bot: TelegramBot, project_root: Path) -> None:
    """금요일 14시: 뉴스레터 초안 생성."""
    engine_dir = project_root / "content-engine"
    venv_python = engine_dir / ".venv" / "bin" / "python3"
    python_cmd = str(venv_python) if venv_python.exists() else "python3"
    try:
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "newsletter"],
            capture_output=True, text=True, timeout=300, cwd=str(engine_dir),
        )
        if result.returncode != 0:
            logger.error("content-newsletter failed: %s", result.stderr[:300])
            return
        data = json.loads(result.stdout)
        if data.get("result") == "skip":
            bot.send(f"[뉴스레터] 스킵: {data['reason']}")
        elif data.get("beehiiv", {}).get("success"):
            preview = data["beehiiv"].get("preview_url", "")
            bot.send(
                f"[뉴스레터] 초안 생성 완료 ({data['blocks_used']}개 소재)\n"
                f"미리보기: {preview}\n\n"
                f"/뉴스레터발행 으로 발행\n"
                f"/뉴스레터수정 [피드백] 으로 수정"
            )
    except Exception as exc:
        logger.error("content-newsletter error: %s", exc)


def content_token_check(bot: TelegramBot, project_root: Path) -> None:
    """매일 09시: LinkedIn 토큰 만료 확인."""
    engine_dir = project_root / "content-engine"
    venv_python = engine_dir / ".venv" / "bin" / "python3"
    python_cmd = str(venv_python) if venv_python.exists() else "python3"
    try:
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "token-check"],
            capture_output=True, text=True, timeout=30, cwd=str(engine_dir),
        )
        if result.returncode != 0:
            return
        data = json.loads(result.stdout)
        if data.get("warn"):
            bot.send(f"⚠️ [LinkedIn] 토큰 만료 {data['days_left']}일 남음. 재인증 필요.")
    except Exception as exc:
        logger.error("content-token-check error: %s", exc)
```

스케줄러 등록:

```python
# content-engine 스케줄
scheduler.add_job(content_watch, IntervalTrigger(minutes=5),
    args=[bot, cfg.project_root], id="content_watch", misfire_grace_time=300)

scheduler.add_job(content_publish, CronTrigger(hour=10, minute=0, day_of_week="mon-fri"),
    args=[bot, cfg.project_root], id="content_publish", misfire_grace_time=3600)

scheduler.add_job(content_newsletter, CronTrigger(hour=14, minute=0, day_of_week="fri"),
    args=[bot, cfg.project_root], id="content_newsletter", misfire_grace_time=3600)

scheduler.add_job(content_token_check, CronTrigger(hour=9, minute=0),
    args=[bot, cfg.project_root], id="content_token_check", misfire_grace_time=3600)
```

- [ ] **Step 3: 텔레그램 명령어 추가**

`orchestrator/src/ai_agent.py`(텔레그램 메시지 핸들러)에 뉴스레터 인텐트 추가. 기존 인텐트 분류 패턴을 따름:

```python
def handle_newsletter_command(bot: TelegramBot, project_root: Path, command: str) -> None:
    """뉴스레터 텔레그램 명령어 처리."""
    engine_dir = project_root / "content-engine"
    venv_python = engine_dir / ".venv" / "bin" / "python3"
    python_cmd = str(venv_python) if venv_python.exists() else "python3"

    if command == "/뉴스레터발행":
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "newsletter-publish"],
            capture_output=True, text=True, timeout=60, cwd=str(engine_dir),
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            r = data.get("result", {})
            if isinstance(r, dict) and r.get("success"):
                bot.send("[뉴스레터] 발행 완료!")
            else:
                bot.send(f"[뉴스레터] {data.get('reason', '실패')}")

    elif command.startswith("/뉴스레터수정"):
        result = subprocess.run(
            [python_cmd, str(engine_dir / "generate.py"), "newsletter"],
            capture_output=True, text=True, timeout=300, cwd=str(engine_dir),
        )
        if result.returncode == 0:
            data = json.loads(result.stdout)
            if data.get("beehiiv", {}).get("success"):
                preview = data["beehiiv"].get("preview_url", "")
                bot.send(f"[뉴스레터] 초안 재생성 완료\n미리보기: {preview}\n/뉴스레터발행 으로 발행")
```

- [ ] **Step 4: 커밋**

```bash
git add orchestrator/src/jobs.py orchestrator/orchestrator.py orchestrator/src/ai_agent.py
git commit -m "feat(orchestrator): content-engine 스케줄 잡 4개 + 뉴스레터 텔레그램 명령어"
```

---

### Task 9: 통합 테스트 + README

**Files:**
- Create: `content-engine/README.md`

- [ ] **Step 1: E2E 테스트 — 스크립트 드롭 → 변환 확인**

```bash
# 테스트 스크립트 생성
cat > "/Users/user/Desktop/claude code/content-engine/data/scripts/test-reel.md" << 'EOF'
# AI로 광고비 n% 줄인 방법

요즘 광고비가 너무 비싸다는 분들 많으시죠?
저는 AI를 활용해서 광고 크리에이티브를 자동 생성하고,
A/B 테스트를 자동화해서 광고비를 n% 줄였습니다.

핵심은 세 가지입니다:
1. 크리에이티브 자동 생성 (5가지 심리 훅)
2. 성과 기반 자동 예산 배분
3. 저성과 소재 자동 OFF

이걸 병원에 적용하면 어떻게 될까요?
실제로 저희 고객사는 월 n만원 광고비에서
n만원을 절감하면서 리드는 오히려 20% 늘었습니다.
EOF

# watch 실행
cd "/Users/user/Desktop/claude code/content-engine"
.venv/bin/python generate.py watch
```

Expected: LinkedIn 큐 + Newsletter 블록 생성, test-reel.md → processed/로 이동

- [ ] **Step 2: 결과 확인**

```bash
cat data/linkedin/queue.jsonl
cat data/newsletter/blocks.jsonl
ls data/scripts/processed/
```

- [ ] **Step 3: README 작성**

```markdown
# Content Engine

릴스 스크립트 → LinkedIn 포스트 + 뉴스레터 자동 변환 파이프라인.

## 사용법

### 스크립트 투입
`data/scripts/`에 .md 파일 드롭. 5분 내 자동 감지.

### 수동 실행
\`\`\`bash
.venv/bin/python generate.py watch        # 새 스크립트 변환
.venv/bin/python generate.py publish      # LinkedIn 발행
.venv/bin/python generate.py newsletter   # 뉴스레터 초안
.venv/bin/python generate.py token-check  # 토큰 확인
\`\`\`

### 텔레그램 명령어
- `/뉴스레터발행` — 초안 발행
- `/뉴스레터수정 [피드백]` — 초안 수정

## 스케줄
- 5분마다: 스크립트 감지
- 평일 10시: LinkedIn 발행
- 금요일 14시: 뉴스레터 초안
- 매일 09시: 토큰 만료 체크

## 환경변수
`.env.example` 참고.
```

- [ ] **Step 4: 커밋**

```bash
git add content-engine/
git commit -m "feat(content-engine): 통합 테스트 + README"
```

---

### Task 10: LinkedIn OAuth 초기 설정 가이드

**Files:**
- Create: `content-engine/docs/linkedin-oauth-setup.md`

- [ ] **Step 1: OAuth 설정 가이드 작성**

LinkedIn Developer Console에서 앱 생성 → OAuth 토큰 발급까지의 단계별 안내 문서 작성. 사용자가 수동으로 1회 수행해야 하는 절차.

포함 내용:
1. https://developer.linkedin.com/ 에서 앱 생성
2. Products → "Share on LinkedIn" + "Sign In with LinkedIn" 추가
3. OAuth 2.0 리다이렉트 URL 설정
4. 초기 access token + refresh token 발급 스크립트
5. `.env`에 토큰 저장

- [ ] **Step 2: 커밋**

```bash
git add content-engine/docs/
git commit -m "docs(content-engine): LinkedIn OAuth 초기 설정 가이드"
```

---

### Task 11: Beehiiv 초기 설정 + 구독 페이지

- [ ] **Step 1: Beehiiv 계정 생성 + API 키 발급**

사용자 수동 작업:
1. https://beehiiv.com 가입
2. Publication 생성
3. Settings → API → API key 발급
4. Publication ID 확인
5. `.env`에 저장

- [ ] **Step 2: LinkedIn CTA용 구독 URL 확인**

Beehiiv 구독 페이지 URL을 LinkedIn 포스트 CTA에 사용.

- [ ] **Step 3: 커밋**

```bash
git commit -m "docs(content-engine): Beehiiv 설정 가이드"
```

---

## 실행 순서 요약

| 순서 | Task | 의존성 | 예상 시간 |
|------|------|--------|-----------|
| 1 | 스캐폴딩 + config | 없음 | 3분 |
| 2 | 프롬프트 템플릿 | 없음 | 3분 |
| 3 | transformer.py | Task 1, 2 | 8분 |
| 4 | linkedin.py | Task 1 | 8분 |
| 5 | newsletter.py | Task 1 | 8분 |
| 6 | watcher.py | Task 3, 4, 5 | 5분 |
| 7 | generate.py (CLI) | Task 6 | 3분 |
| 8 | 오케스트레이터 연동 | Task 7 | 10분 |
| 9 | 통합 테스트 + README | Task 8 | 5분 |
| 10 | LinkedIn OAuth 가이드 | 없음 | 5분 |
| 11 | Beehiiv 설정 | 없음 | 3분 |

**병렬 가능:** Task 3, 4, 5는 독립적 → 동시 실행 가능.
**사용자 액션 필요:** Task 10 (LinkedIn 앱 생성), Task 11 (Beehiiv 가입).
