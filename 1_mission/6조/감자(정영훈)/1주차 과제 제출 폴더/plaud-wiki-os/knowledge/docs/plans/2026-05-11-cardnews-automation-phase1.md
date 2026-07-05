# 카드뉴스 자동화 Phase 1 — 콘텐츠 생성 파이프라인 + 9시 보고

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매일 새벽 05:00 launchd 실행 → 주제 결정 → 카피 8장 + 이미지 매칭 + YAML deck + Pencil prompt 파일 + 캡션 생성 → 09:00 iMessage 알림 + 드래프트 경로 전달. 사용자는 9시에 prompt 파일을 Pencil agent에 던지는 것만 수동.

**Architecture:** 모듈러 Python 파이프라인. 각 단계 독립 모듈 + 단위 테스트. launchd 새벽 트리거 → `run_daily.py` entry point가 순차 실행 → 모든 산출물은 `personal-brand/drafts/YYYY-MM-DD/`. 실패 시 9시 알림에 플래그 포함.

**Tech Stack:** Python 3.13, pytest, Anthropic SDK (Claude API), Notion API (Nova DB 큐), PyYAML, iMessage 채널(알림), launchd.

**Phase 1 범위 (포함):**

- 주제 결정, 카피 8장, 이미지 매칭, 캡션, YAML deck, Pencil prompt 파일, 9시 iMessage 알림.

**Phase 1 범위 (제외):**

- Pencil 빌드 자동화(Phase 2), localhost 대시보드(Phase 2), PNG export·IG 발행(Phase 3), DM 응대(Phase 4).

---

## File Structure

```
personal-brand/auto/
├── __init__.py
├── config.py                  # env, paths, constants
├── topic_picker.py            # Nova DB 큐 폴링 + Claude 보충
├── copy_writer.py             # 카피 8장 생성 + §6 셀프체크
├── image_matcher.py           # 기존 14장 풀에서 매칭
├── caption_writer.py          # 캡션 생성 (insight-06 baseline)
├── deck_builder.py            # YAML deck 생성
├── prompt_packer.py           # Pencil prompt md 작성
├── notifier.py                # iMessage 알림 발송
├── run_daily.py               # 새벽 entry point
├── rules/
│   └── copy_rules.md          # §6 카피 작성 규칙 (LLM 시스템 프롬프트 주입용)
└── tests/
    ├── __init__.py
    ├── conftest.py
    ├── fixtures/
    │   ├── topic_sample.json
    │   ├── images_pool.json
    │   └── insight06_caption.txt
    ├── test_topic_picker.py
    ├── test_copy_writer.py
    ├── test_image_matcher.py
    ├── test_caption_writer.py
    ├── test_deck_builder.py
    ├── test_prompt_packer.py
    ├── test_notifier.py
    └── test_run_daily.py

personal-brand/auto/launchd/
└── com.agency.cardnews-daily.plist

personal-brand/drafts/                # 산출물 (gitignore)
└── YYYY-MM-DD/
    ├── topic.json
    ├── copy.md
    ├── images.json
    ├── caption.txt
    ├── deck.yaml
    ├── pencil-prompt.md
    └── run.log
```

**Responsibilities per file:**

- `config.py`: env 로드(.env), 경로 상수, Notion DB ID, IG_USER_ID, ANTHROPIC_API_KEY 등
- `topic_picker.py`: Nova 미션 DB에서 `상태=대기 AND 태그=카드뉴스` 조회. 비면 Claude로 메모리·최근 세션·광고 데이터 컨텍스트 받아 보충 생성
- `copy_writer.py`: 주제 입력 → 8장 카피 + 캡션 hook 텍스트. Claude API + `rules/copy_rules.md` 시스템 프롬프트. 셀프체크 통과까지 최대 3회 재생성
- `image_matcher.py`: 카피 내용 → 14장 풀에서 의미 매칭 (간단 keyword score). Hook/Empathy/Turn 또는 Hook/Empathy/Summary 3장
- `caption_writer.py`: 카피 + 8장 요약 → caption.txt (§6.6 baseline 구조)
- `deck_builder.py`: 카피 + 이미지 매칭 → deck.yaml (deck_fill.py 호환 포맷)
- `prompt_packer.py`: deck.yaml + 카피 + 이미지 경로 → Pencil agent에 던질 사람 친화적 md
- `notifier.py`: 9시 iMessage self-chat 발송. 성공/실패 상태 + 드래프트 경로 + 카피 미리보기
- `run_daily.py`: 순차 실행, 단계별 실패는 로그에 기록 후 다음 단계 계속, 09:00 알림 무조건 발송

---

## Pre-flight: 환경 확인

이 plan을 실행하기 전에 사용자가 채워야 할 항목:

1. **Notion API Token** — `~/.config/personal-brand/.env`에 `NOTION_TOKEN=secret_xxx` (이미 다른 프로젝트에 있으면 재사용)
2. **Anthropic API Key** — 같은 .env에 `ANTHROPIC_API_KEY=sk-ant-xxx`
3. **Nova 미션 DB의 "카드뉴스" 태그 추가** — 사용자가 Notion 가서 수동 추가 (또는 별도 DB ID 알려주기)
4. **iMessage self-chat 채널 이미 가동 중** — 메모리 `feedback_imessage_notifications.md` 기준

이 항목들은 Task 0에서 확인하고, 미달이면 사용자에게 1줄 요청 후 중단.

---

## Tasks

### Task 0: 디렉토리 + config + 환경 확인

**Files:**

- Create: `personal-brand/auto/__init__.py`
- Create: `personal-brand/auto/config.py`
- Create: `personal-brand/auto/tests/__init__.py`
- Create: `personal-brand/auto/tests/conftest.py`
- Create: `~/.config/personal-brand/.env` (사용자 수동, 키만 안내)
- Modify: `.gitignore` (personal-brand/drafts/ 추가)

- [ ] **Step 0.1: 디렉토리 생성**

```bash
mkdir -p personal-brand/auto/{rules,tests/fixtures,launchd}
mkdir -p personal-brand/drafts
mkdir -p ~/.config/personal-brand
touch personal-brand/auto/__init__.py
touch personal-brand/auto/tests/__init__.py
```

- [ ] **Step 0.2: .gitignore에 drafts 추가**

`.gitignore` 끝에 추가:

```
personal-brand/drafts/
```

- [ ] **Step 0.3: config.py 작성**

```python
# personal-brand/auto/config.py
"""환경 변수 + 경로 + 상수."""
from __future__ import annotations
import os
from pathlib import Path
from datetime import date

ROOT = Path(__file__).resolve().parent.parent  # personal-brand/
AUTO_DIR = Path(__file__).resolve().parent      # personal-brand/auto/
DRAFTS_DIR = ROOT / "drafts"
IMAGES_DIR = ROOT / "images"
CARDNEWS_PEN = ROOT / "cardnews.pen"
RULES_PATH = AUTO_DIR / "rules" / "copy_rules.md"

ENV_PATH = Path.home() / ".config" / "personal-brand" / ".env"


def _load_env() -> dict[str, str]:
    out: dict[str, str] = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            out[k.strip()] = v.strip().strip('"').strip("'")
    return out


_env = _load_env()

NOTION_TOKEN = _env.get("NOTION_TOKEN") or os.environ.get("NOTION_TOKEN", "")
ANTHROPIC_API_KEY = _env.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_API_KEY", "")
NOVA_MISSION_DB_ID = "2ce7def7-859f-81d0-b7c4-fca5697722e3"
CARDNEWS_TAG = "카드뉴스"

# iMessage self-chat
IMESSAGE_CHAT_ID = "any;-;[연락처]"

# Claude 모델
CLAUDE_MODEL = "claude-sonnet-4-6"  # 카피용. 새벽 작업은 비용보다 품질 우선이면 opus.

def today_dir() -> Path:
    """오늘 드래프트 디렉토리. 없으면 생성."""
    d = DRAFTS_DIR / date.today().isoformat()
    d.mkdir(parents=True, exist_ok=True)
    return d


def require_env() -> list[str]:
    """누락된 환경변수 리스트. run_daily 시작 시 호출."""
    missing = []
    if not NOTION_TOKEN:
        missing.append("NOTION_TOKEN")
    if not ANTHROPIC_API_KEY:
        missing.append("ANTHROPIC_API_KEY")
    return missing
```

- [ ] **Step 0.4: conftest.py 작성 — fixture 경로 픽업**

```python
# personal-brand/auto/tests/conftest.py
from pathlib import Path
import pytest

FIXTURES = Path(__file__).parent / "fixtures"

@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES
```

- [ ] **Step 0.5: §6 카피 규칙을 copy_rules.md로 추출**

`personal-brand/auto/rules/copy_rules.md` — SOP의 §6 전체를 그대로 복사. 단, 헤딩은 `# 카피 작성 규칙`부터 시작. 향후 SOP 변경 시 이 파일도 동기화한다는 1줄 헤더 추가:

```markdown
# 카피 작성 규칙

> 이 파일은 `personal-brand/SOP.md` §6의 사본이다. SOP 변경 시 함께 갱신한다.

[SOP §6 전체 내용 그대로 복사]
```

- [ ] **Step 0.6: env 파일 안내**

사용자에게 1회 알림:

```
~/.config/personal-brand/.env 에 다음 두 줄을 채워주세요:
NOTION_TOKEN=secret_xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

- [ ] **Step 0.7: 커밋**

```bash
git add personal-brand/auto/ .gitignore
git commit -m "feat(cardnews-auto): scaffold config + rules + test infra"
```

---

### Task 1: topic_picker — Nova DB 큐 폴링 + Claude 보충

**Files:**

- Create: `personal-brand/auto/topic_picker.py`
- Create: `personal-brand/auto/tests/test_topic_picker.py`
- Create: `personal-brand/auto/tests/fixtures/notion_queue_response.json`

**Interface:**

```python
def pick_topic() -> dict:
    """반환: {"source": "queue"|"claude", "title": str, "angle": str, "notion_page_id": str|None}"""
```

- [ ] **Step 1.1: fixture — Notion 응답 샘플 작성**

`tests/fixtures/notion_queue_response.json`:

```json
{
  "results": [
    {
      "id": "abc-123",
      "properties": {
        "이름": {"title": [{"plain_text": "구글 지도 상위노출 3축"}]},
        "상태": {"status": {"name": "대기"}},
        "태그": {"multi_select": [{"name": "카드뉴스"}]},
        "앵글": {"rich_text": [{"plain_text": "Relevance·Distance·Prominence 3축 해부"}]}
      }
    }
  ]
}
```

- [ ] **Step 1.2: failing test — 큐 우선 케이스**

`tests/test_topic_picker.py`:

```python
from unittest.mock import patch
import json
from personal-brand.auto import topic_picker  # 또는 sys.path 조정

def test_picks_from_queue_when_available(fixtures_dir):
    with open(fixtures_dir / "notion_queue_response.json") as f:
        resp = json.load(f)
    with patch.object(topic_picker, "_query_notion", return_value=resp["results"]):
        out = topic_picker.pick_topic()
    assert out["source"] == "queue"
    assert out["title"] == "구글 지도 상위노출 3축"
    assert out["notion_page_id"] == "abc-123"
```

- [ ] **Step 1.3: 테스트 실패 확인**

`pytest personal-brand/auto/tests/test_topic_picker.py -v` → ModuleNotFoundError.

- [ ] **Step 1.4: topic_picker.py 최소 구현**

```python
# personal-brand/auto/topic_picker.py
"""Nova 미션 DB 큐 폴링. 빌 때 Claude로 보충."""
from __future__ import annotations
import json
import urllib.request
from typing import Any
from . import config

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"


def _query_notion() -> list[dict]:
    """미션 DB에서 상태=대기 AND 태그=카드뉴스 페이지 1개 반환."""
    url = f"{NOTION_API}/databases/{config.NOVA_MISSION_DB_ID}/query"
    body = {
        "filter": {
            "and": [
                {"property": "상태", "status": {"equals": "대기"}},
                {"property": "태그", "multi_select": {"contains": config.CARDNEWS_TAG}},
            ]
        },
        "page_size": 1,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {config.NOTION_TOKEN}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as r:
        data = json.loads(r.read())
    return data.get("results", [])


def _extract_text(prop: dict, kind: str) -> str:
    arr = prop.get(kind, [])
    return "".join(part.get("plain_text", "") for part in arr) if arr else ""


def _from_queue(page: dict) -> dict:
    props = page["properties"]
    return {
        "source": "queue",
        "title": _extract_text(props["이름"], "title"),
        "angle": _extract_text(props.get("앵글", {}), "rich_text"),
        "notion_page_id": page["id"],
    }


def _claude_fallback() -> dict:
    """큐 빈 날 보충. Claude에게 메모리/광고 데이터 기반 1개 제안 요청."""
    # 최소 구현: 환경 OK면 Claude API 호출. 실제 프롬프트는 별도 함수.
    from anthropic import Anthropic
    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    prompt = (
        "당신은 병원마케팅 대표의 퍼스널 브랜딩 콘텐츠 큐레이터입니다. "
        "오늘 인스타 카드뉴스 1편을 제안하세요. 형식 JSON: {title, angle}. "
        "주제는 구글 지도·AI 검색 최적화·병원 마케팅 실전 사례 중 하나. "
        "최근 30일 안에 다룬 주제는 피하되, 큐가 비어있으므로 시의성 있는 주제."
    )
    msg = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    text = msg.content[0].text.strip()
    # 가장 단순한 파싱
    data = json.loads(text[text.find("{"): text.rfind("}") + 1])
    return {
        "source": "claude",
        "title": data["title"],
        "angle": data.get("angle", ""),
        "notion_page_id": None,
    }


def pick_topic() -> dict:
    pages = _query_notion()
    if pages:
        return _from_queue(pages[0])
    return _claude_fallback()
```

- [ ] **Step 1.5: 테스트 통과 확인**

```bash
pytest personal-brand/auto/tests/test_topic_picker.py::test_picks_from_queue_when_available -v
```

Expected: PASS.

- [ ] **Step 1.6: failing test — Claude 보충 케이스**

`tests/test_topic_picker.py` 추가:

```python
def test_falls_back_to_claude_when_queue_empty():
    with patch.object(topic_picker, "_query_notion", return_value=[]), \
         patch.object(topic_picker, "_claude_fallback", return_value={
             "source": "claude", "title": "예시 주제", "angle": "예시 앵글",
             "notion_page_id": None,
         }):
        out = topic_picker.pick_topic()
    assert out["source"] == "claude"
    assert out["title"] == "예시 주제"
```

- [ ] **Step 1.7: 테스트 통과 확인 + 커밋**

```bash
pytest personal-brand/auto/tests/test_topic_picker.py -v
git add personal-brand/auto/topic_picker.py personal-brand/auto/tests/test_topic_picker.py personal-brand/auto/tests/fixtures/notion_queue_response.json
git commit -m "feat(cardnews-auto): topic_picker with Nova DB queue + Claude fallback"
```

---

### Task 2: copy_writer — 카피 8장 생성 + §6 셀프체크

**Files:**

- Create: `personal-brand/auto/copy_writer.py`
- Create: `personal-brand/auto/tests/test_copy_writer.py`

**Interface:**

```python
def write_copy(topic: dict) -> dict:
    """반환: {"slides": [{"position": "01_hook", "headline": "...", "body": "...", "tags": [...]}, ...] x8,
              "self_check": {"passed": bool, "violations": [...], "attempts": int}}"""
```

- [ ] **Step 2.1: failing test — 8장 카피 생성 + 검사 통과**

`tests/test_copy_writer.py`:

```python
from unittest.mock import patch, MagicMock
from personal_brand.auto import copy_writer

SAMPLE_TOPIC = {
    "source": "queue", "title": "구글 지도 상위노출 3축",
    "angle": "Relevance·Distance·Prominence", "notion_page_id": "abc-123",
}

FAKE_LLM_OUTPUT = """
{
  "slides": [
    {"position": "01_hook", "headline": "리뷰 300개인데, 우리 병원만 왜 3등일까요?", "body": "대부분은 리뷰 수를 더 늘리자고 답합니다.", "tags": ["hook"]},
    {"position": "02_empathy", "headline": "리뷰 수만 늘리면 된다?", "body": "❌ 잘못된 접근 4가지...", "tags": ["empathy"]},
    {"position": "03_core", "headline": "Relevance가 먼저입니다", "body": "...", "tags": ["core"]},
    {"position": "04_core", "headline": "Distance는 사용자 위치", "body": "...", "tags": ["core"]},
    {"position": "05_core", "headline": "Prominence가 진짜 변수", "body": "...", "tags": ["core"]},
    {"position": "06_turn", "headline": "리뷰 300개여도 3축 틀어지면 5점도 무의미합니다", "body": "...", "tags": ["turn"]},
    {"position": "07_summary", "headline": "체크리스트 3축", "body": "...", "tags": ["summary"]},
    {"position": "08_cta", "headline": "원장님 가장 약한 축은?", "body": "DM 무료 진단", "tags": ["cta"]}
  ]
}
"""

def test_writes_8_slides_and_passes_check():
    fake_msg = MagicMock()
    fake_msg.content = [MagicMock(text=FAKE_LLM_OUTPUT)]
    with patch.object(copy_writer, "_call_claude", return_value=FAKE_LLM_OUTPUT):
        out = copy_writer.write_copy(SAMPLE_TOPIC)
    assert len(out["slides"]) == 8
    assert out["slides"][0]["position"] == "01_hook"
    assert out["self_check"]["passed"] is True
```

- [ ] **Step 2.2: 셀프체크 unit test**

```python
def test_self_check_flags_translation_connector():
    text = "구글 지도를 통해 환자를 가져옵니다."
    violations = copy_writer.scan_violations(text)
    assert any(v["rule"] == "번역투 연결어" for v in violations)


def test_self_check_flags_passive_voice():
    text = "환자가 늘려집니다."
    violations = copy_writer.scan_violations(text)
    assert any(v["rule"] == "수동태" for v in violations)


def test_self_check_passes_clean_copy():
    text = "신사 본점에 '[C의원 일본어 표기] 新沙(신사)' 6개월 박았더니 일본어 자동완성 1위입니다."
    violations = copy_writer.scan_violations(text)
    assert violations == []
```

- [ ] **Step 2.3: 테스트 실패 확인**

`pytest personal-brand/auto/tests/test_copy_writer.py -v` → ImportError.

- [ ] **Step 2.4: copy_writer.py 구현**

```python
# personal-brand/auto/copy_writer.py
"""주제 → 8장 카피. §6 셀프체크 통과까지 최대 3회 재생성."""
from __future__ import annotations
import json
import re
from . import config

# 금지어/금지 패턴 — SOP §6.2 직접 코드화
FORBIDDEN_CONNECTORS = ["을 통해", "를 통해", "을 기반으로", "를 기반으로",
                        "을 바탕으로", "를 바탕으로", "에 대하여"]
FORBIDDEN_ABSTRACT_NOUNS_SOLO = ["극대화", "최적화", "선점", "확보", "차별화",
                                  "솔루션", "전략", "노하우", "시스템"]
FORBIDDEN_ADJECTIVES = ["혁신적인", "검증된", "효율적인", "전문적인", "최고의", "완벽한"]
FORBIDDEN_ENDINGS = ["경험해 보세요", "할 수 있습니다", "되어집니다", "되어진다"]
INTERNAL_JARGON = ["박힌", "직격", "광맥", "정합", "캡처", "베이스라인", "USP",
                   "시딩", "백오피스 유입", "Pack", "SoLV", "AGR"]

# 외국어 키워드 패턴 — 일본어/중국어 후 한글 괄호가 없으면 위반
RE_JP = re.compile(r"[぀-ヿ一-龯]+")
RE_KO_PAREN = re.compile(r"\([가-힣]+\)")


def scan_violations(text: str) -> list[dict]:
    out = []
    for c in FORBIDDEN_CONNECTORS:
        if c in text:
            out.append({"rule": "번역투 연결어", "match": c})
    for n in FORBIDDEN_ABSTRACT_NOUNS_SOLO:
        if re.search(rf"\b{n}\b", text) and not re.search(rf"{n}[가-힣]", text):
            out.append({"rule": "B2B 추상명사 단독", "match": n})
    for a in FORBIDDEN_ADJECTIVES:
        if a in text:
            out.append({"rule": "상투적 형용사", "match": a})
    for e in FORBIDDEN_ENDINGS:
        if e in text:
            out.append({"rule": "어색한 종결어미", "match": e})
    for j in INTERNAL_JARGON:
        if j in text:
            out.append({"rule": "내부 은어", "match": j})
    # 수동태 휴리스틱
    if re.search(r"[가-힣]+(되어집니다|되어진다|졌습니다)", text):
        out.append({"rule": "수동태", "match": "되어집니다/졌습니다"})
    # 명사 연쇄 ~의 ~의 ~의 (3연속 이상)
    if re.search(r"[가-힣]+의\s*[가-힣]+의\s*[가-힣]+", text):
        out.append({"rule": "명사 연쇄", "match": "~의 ~의 ~"})
    # 외국어 키워드 해석 병기 누락
    for m in RE_JP.finditer(text):
        word = m.group()
        # 한글 단어가 아닌 경우만
        if not re.match(r"^[가-힣]+$", word):
            tail = text[m.end(): m.end() + 20]
            if not RE_KO_PAREN.match(tail):
                out.append({"rule": "외국어 해석 병기 누락", "match": word})
    return out


def _call_claude(system: str, user: str) -> str:
    from anthropic import Anthropic
    client = Anthropic(api_key=config.ANTHROPIC_API_KEY)
    msg = client.messages.create(
        model=config.CLAUDE_MODEL,
        max_tokens=4096,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    return msg.content[0].text


def _build_prompt(topic: dict, prior_violations: list[dict] | None = None) -> tuple[str, str]:
    system = config.RULES_PATH.read_text()
    user = (
        f"주제: {topic['title']}\n"
        f"앵글: {topic.get('angle', '')}\n\n"
        "8장 카드뉴스 카피를 JSON으로 작성하세요. 구조:\n"
        '{"slides": [{"position": "01_hook"|...|"08_cta", "headline": "...", "body": "...", "tags": [...]}]}\n\n'
        "각 슬라이드는 위 규칙 100% 준수. 헤드라인은 한 줄, 본문은 3~5줄."
    )
    if prior_violations:
        user += (
            "\n\n[재작성 요청] 직전 시도 위반:\n"
            + "\n".join(f"- {v['rule']}: {v['match']}" for v in prior_violations)
        )
    return system, user


def write_copy(topic: dict) -> dict:
    last_violations: list[dict] = []
    for attempt in range(1, 4):
        system, user = _build_prompt(topic, last_violations or None)
        raw = _call_claude(system, user)
        # JSON 추출
        start = raw.find("{")
        end = raw.rfind("}") + 1
        data = json.loads(raw[start:end])
        slides = data["slides"]
        all_violations = []
        for s in slides:
            all_violations.extend(scan_violations(s["headline"]))
            all_violations.extend(scan_violations(s["body"]))
        if not all_violations:
            return {"slides": slides,
                    "self_check": {"passed": True, "violations": [], "attempts": attempt}}
        last_violations = all_violations
    return {"slides": slides,
            "self_check": {"passed": False, "violations": last_violations, "attempts": 3}}
```

- [ ] **Step 2.5: 테스트 통과 확인 + 커밋**

```bash
pytest personal-brand/auto/tests/test_copy_writer.py -v
git add personal-brand/auto/copy_writer.py personal-brand/auto/tests/test_copy_writer.py
git commit -m "feat(cardnews-auto): copy_writer with §6 self-check (3-retry)"
```

---

### Task 3: image_matcher — 14장 풀에서 의미 매칭

**Files:**

- Create: `personal-brand/auto/image_matcher.py`
- Create: `personal-brand/auto/tests/test_image_matcher.py`
- Create: `personal-brand/auto/tests/fixtures/images_pool.json`

**Interface:**

```python
def match_images(slides: list[dict]) -> dict:
    """반환: {"01_hook": "personal-brand/images/xxx.png",
              "02_empathy": "...", "06_turn": "..." (또는 07_summary)}"""
```

매칭 로직: SOP §3.3 — 이미지 3장 배치(01 Hook 필수 + 02 Empathy 또는 03 Core 첫 장 + 06 Turn 또는 07 Summary). Phase 1에서는 단순 키워드 매칭으로 시작 → 향후 임베딩 매칭으로 교체.

- [ ] **Step 3.1: fixture — images_pool.json**

이미지 풀 메타데이터. 사용자가 사후 보완 가능하게 간단한 키워드 태깅.

```json
[
  {"file": "generated-1776914775953.png", "keywords": ["지도", "구글맵", "리뷰", "병원"]},
  {"file": "generated-1776918544262.png", "keywords": ["검색", "AI", "AEO"]},
  {"file": "generated-1776918582883.png", "keywords": ["다국어", "외국인", "환자"]}
]
```

(나머지 11장은 Task 0에서 사용자가 채우는 작업으로 분리. Task 3 첫 구현은 3장으로 검증)

- [ ] **Step 3.2: failing test**

```python
import json
from personal_brand.auto import image_matcher

def test_matches_three_slots_by_keywords(fixtures_dir, monkeypatch):
    monkeypatch.setattr(image_matcher, "POOL_PATH", fixtures_dir / "images_pool.json")
    slides = [
        {"position": "01_hook", "headline": "구글 지도 리뷰", "body": "병원 검색", "tags": ["hook"]},
        {"position": "02_empathy", "headline": "외국인 환자가 안 와요", "body": "다국어 부재", "tags": ["empathy"]},
        {"position": "03_core", "headline": "...", "body": "...", "tags": ["core"]},
        {"position": "04_core", "headline": "...", "body": "...", "tags": ["core"]},
        {"position": "05_core", "headline": "...", "body": "...", "tags": ["core"]},
        {"position": "06_turn", "headline": "AI 검색 시대", "body": "...", "tags": ["turn"]},
        {"position": "07_summary", "headline": "...", "body": "...", "tags": ["summary"]},
        {"position": "08_cta", "headline": "...", "body": "...", "tags": ["cta"]},
    ]
    out = image_matcher.match_images(slides)
    assert "01_hook" in out
    assert out["01_hook"].endswith("generated-1776914775953.png")
    # 02_empathy 또는 03_core 중 하나
    assert any(k in out for k in ["02_empathy", "03_core"])
    # 06_turn 또는 07_summary 중 하나
    assert any(k in out for k in ["06_turn", "07_summary"])
    assert len(out) == 3
```

- [ ] **Step 3.3: 구현**

```python
# personal-brand/auto/image_matcher.py
"""카피 → 14장 이미지 풀에서 3장 매칭 (단순 키워드 score)."""
from __future__ import annotations
import json
from pathlib import Path
from . import config

POOL_PATH = config.AUTO_DIR / "rules" / "images_pool.json"  # 사용자가 관리

SLOT_PRIORITY = [
    ["01_hook"],
    ["02_empathy", "03_core"],
    ["06_turn", "07_summary"],
]


def _score(slide_text: str, keywords: list[str]) -> int:
    return sum(1 for kw in keywords if kw in slide_text)


def match_images(slides: list[dict]) -> dict:
    with open(POOL_PATH) as f:
        pool = json.load(f)
    by_pos = {s["position"]: s for s in slides}
    used: set[str] = set()
    out: dict[str, str] = {}
    for group in SLOT_PRIORITY:
        # 그룹 내에서 가장 점수 높은 (슬라이드 × 이미지) 페어
        best = None
        for pos in group:
            if pos not in by_pos:
                continue
            text = by_pos[pos]["headline"] + " " + by_pos[pos]["body"]
            for img in pool:
                if img["file"] in used:
                    continue
                s = _score(text, img["keywords"])
                if s > 0 and (best is None or s > best[2]):
                    best = (pos, img["file"], s)
        if best:
            out[best[0]] = str(config.IMAGES_DIR / best[1])
            used.add(best[1])
    return out
```

- [ ] **Step 3.4: 테스트 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_image_matcher.py -v
git add personal-brand/auto/image_matcher.py personal-brand/auto/tests/test_image_matcher.py personal-brand/auto/tests/fixtures/images_pool.json
git commit -m "feat(cardnews-auto): image_matcher with keyword scoring"
```

- [ ] **Step 3.5: 실제 images_pool.json 시드 작업 (사용자 협업)**

사용자가 `personal-brand/images/` 14장을 보고 각각 키워드 3~5개 태깅. 결과를 `personal-brand/auto/rules/images_pool.json`에 저장. 이 단계는 사용자 작업이라 plan 안에서는 안내만:

```
[사용자 작업] personal-brand/images/ 의 14장에 키워드 태깅. 양식:
[{"file": "<파일명>.png", "keywords": ["키워드1", "키워드2", ...]}, ...]
```

---

### Task 4: caption_writer — 캡션 생성 (insight-06 baseline)

**Files:**

- Create: `personal-brand/auto/caption_writer.py`
- Create: `personal-brand/auto/tests/test_caption_writer.py`
- Create: `personal-brand/auto/tests/fixtures/insight06_caption.txt` (기존 캡션 복사)

**Interface:**

```python
def write_caption(topic: dict, slides: list[dict]) -> str:
    """SOP §6.6 baseline 구조의 캡션 텍스트 반환."""
```

- [ ] **Step 4.1: fixture 복사 + failing test**

```bash
cp personal-brand/captions/insight-06.txt personal-brand/auto/tests/fixtures/insight06_caption.txt
```

```python
from personal_brand.auto import caption_writer

def test_caption_has_baseline_structure():
    topic = {"title": "구글 지도 상위노출 3축", "angle": "Relevance·Distance·Prominence"}
    slides = [...]  # 8개 slide dict
    fake_llm_output = "..."  # mock
    with patch.object(caption_writer, "_call_claude", return_value=fake_llm_output):
        cap = caption_writer.write_caption(topic, slides)
    assert "병원마케팅 대표" in cap  # 서명
    assert "#병원마케팅" in cap  # 해시태그
    assert "🔖" in cap or "저장" in cap  # CTA
```

- [ ] **Step 4.2: 구현**

```python
# personal-brand/auto/caption_writer.py
from __future__ import annotations
from . import config, copy_writer

BASELINE = """[1줄 후킹]
[본문 3~5줄, Status→Impact, 동사 종결]

🔖 저장 / 💬 DM 키워드 「{dm_keyword}」 / ➕ 팔로우

#병원마케팅 #구글지도상위노출 #GBP #로컬SEO #피부과마케팅 #치과마케팅 #성형외과마케팅 #병원원장님 #개원의 #AI검색최적화 #우리회사

──────
병원마케팅 대표
구글 지도 · AI 검색 최적화"""


def _call_claude(system: str, user: str) -> str:
    return copy_writer._call_claude(system, user)


def write_caption(topic: dict, slides: list[dict]) -> str:
    system = config.RULES_PATH.read_text() + "\n\n출력은 인스타 캡션 텍스트만. 마크다운 X."
    slides_summary = "\n".join(f"- {s['position']}: {s['headline']}" for s in slides)
    user = (
        f"주제: {topic['title']}\n"
        f"앵글: {topic.get('angle', '')}\n\n"
        f"8장 카드 요약:\n{slides_summary}\n\n"
        f"아래 baseline 구조로 캡션을 작성하세요. 해시태그는 9~12개로 조정 가능.\n\n"
        f"---\n{BASELINE}\n---"
    )
    cap = _call_claude(system, user).strip()
    # 셀프체크
    violations = copy_writer.scan_violations(cap)
    if violations:
        cap += f"\n\n<!-- 셀프체크 위반: {len(violations)}개 — 9시 검수 시 확인 -->"
    return cap
```

- [ ] **Step 4.3: 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_caption_writer.py -v
git add personal-brand/auto/caption_writer.py personal-brand/auto/tests/
git commit -m "feat(cardnews-auto): caption_writer with insight-06 baseline"
```

---

### Task 5: deck_builder — YAML deck 생성 (deck_fill.py 호환)

**Files:**

- Create: `personal-brand/auto/deck_builder.py`
- Create: `personal-brand/auto/tests/test_deck_builder.py`

**Interface:**

```python
def build_deck(slides: list[dict], images: dict) -> str:
    """deck_fill.py가 소비할 YAML 문자열 반환."""
```

archetype 매핑: SOP `project_personal_brand` 메모리의 7종 reusable 템플릿 표 따름.

- 01 hook → `CardImageHook` (or pmMBy)
- 02 empathy → `CardImageEmpathy` (이미지면) / `CardTextBody` (텍스트면)
- 03 core (첫) → `CardImageBody` (이미지면) / `CardTextBody`
- 04, 05 core → `CardTextBody`
- 06 turn → `CardTextTurn` (or `CardImageBody` if 이미지)
- 07 summary → `CardTextSummary`
- 08 cta → `CardTextCTA`

- [ ] **Step 5.1: failing test**

```python
import yaml
from personal_brand.auto import deck_builder

def test_builds_deck_with_image_slots():
    slides = [
        {"position": "01_hook", "headline": "리뷰 300개", "body": "왜 3등?", "tags": ["hook"]},
        # ... 8개
    ]
    images = {"01_hook": "./images/x.png", "02_empathy": "./images/y.png", "07_summary": "./images/z.png"}
    out = deck_builder.build_deck(slides, images)
    data = yaml.safe_load(out)
    assert data["deck"].startswith("auto-")
    assert len(data["slides"]) == 8
    assert data["slides"][0]["archetype"] == "CardImageHook"
    assert data["slides"][0]["content"]["image"].endswith("x.png")
```

- [ ] **Step 5.2: 구현**

```python
# personal-brand/auto/deck_builder.py
from __future__ import annotations
from datetime import date
import yaml

ARCHETYPE_MAP_WITH_IMAGE = {
    "01_hook": "CardImageHook",
    "02_empathy": "CardImageEmpathy",
    "03_core": "CardImageBody",
    "06_turn": "CardImageBody",
    "07_summary": "CardImageBody",
}
ARCHETYPE_MAP_TEXT = {
    "01_hook": "CardImageHook",  # 01은 항상 이미지
    "02_empathy": "CardTextBody",
    "03_core": "CardTextBody",
    "04_core": "CardTextBody",
    "05_core": "CardTextBody",
    "06_turn": "CardTextTurn",
    "07_summary": "CardTextSummary",
    "08_cta": "CardTextCTA",
}


def _archetype_for(position: str, has_image: bool) -> str:
    if has_image and position in ARCHETYPE_MAP_WITH_IMAGE:
        return ARCHETYPE_MAP_WITH_IMAGE[position]
    return ARCHETYPE_MAP_TEXT.get(position, "CardTextBody")


def _content_for(slide: dict, image: str | None) -> dict:
    pos = slide["position"]
    base = {"headline": slide["headline"], "body": slide["body"]}
    if image:
        base["image"] = image
    if pos == "08_cta":
        base["cta_save"] = "🔖 저장"
        base["cta_dm"] = "💬 DM"
        base["cta_follow"] = "➕ 팔로우"
    return base


def build_deck(slides: list[dict], images: dict) -> str:
    deck = {
        "deck": f"auto-{date.today().isoformat()}",
        "canvas": {
            "width": 1080, "height": 1350, "fill": "$bg-cream",
            "padding": 80, "parent": "root", "base_x": 5400, "base_y": 0, "gap_x": 1200,
        },
        "slides": [],
    }
    for s in slides:
        img = images.get(s["position"])
        deck["slides"].append({
            "page_name": f"AUTO-{s['position']}",
            "archetype": _archetype_for(s["position"], img is not None),
            "content": _content_for(s, img),
        })
    return yaml.safe_dump(deck, allow_unicode=True, sort_keys=False)
```

- [ ] **Step 5.3: 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_deck_builder.py -v
git add personal-brand/auto/deck_builder.py personal-brand/auto/tests/test_deck_builder.py
git commit -m "feat(cardnews-auto): deck_builder maps slides to archetypes"
```

---

### Task 6: prompt_packer — Pencil agent 던질 md

**Files:**

- Create: `personal-brand/auto/prompt_packer.py`
- Create: `personal-brand/auto/tests/test_prompt_packer.py`

**Interface:**

```python
def pack_prompt(deck_yaml: str, slides: list[dict], images: dict, date_str: str) -> str:
    """Pencil agent에 던질 사람 친화적 md. 사용자가 그대로 복붙."""
```

- [ ] **Step 6.1: failing test**

```python
from personal_brand.auto import prompt_packer

def test_prompt_includes_yaml_and_instructions():
    out = prompt_packer.pack_prompt("deck: x\nslides: []", [], {}, "2026-05-11")
    assert "cardnews.pen" in out
    assert "deck_fill.py" in out
    assert "deck: x" in out  # YAML embed
    assert "2026-05-11" in out
```

- [ ] **Step 6.2: 구현**

```python
# personal-brand/auto/prompt_packer.py
TEMPLATE = """# Pencil 카드뉴스 빌드 요청 — {date_str}

오늘자 자동 생성 카드뉴스 8장을 Pencil로 빌드 부탁드립니다.

## 절차

1. `personal-brand/cardnews.pen` 백업 → `cardnews.{date_str}.pen`
2. 아래 deck.yaml을 `personal-brand/template-fill/deck_fill.py`로 처리:
```

   cd personal-brand/template-fill
   python3 deck_fill.py {draft_dir}/deck.yaml > {draft_dir}/operations.txt

```
3. operations.txt 내용을 Pencil MCP `batch_design`으로 실행 (parent=root, base_y=새 y 좌표)
4. 빌드 후 8장 페이지 좌표 출력 → 9시 대시보드로 전달

## 이미지 매핑

{image_block}

## deck.yaml (이미 디스크에도 있음)

```yaml
{deck_yaml}
```

## 카피 8장 (참고용)

{copy_block}
"""

def pack_prompt(deck_yaml: str, slides: list[dict], images: dict, date_str: str) -> str:
    draft_dir = f"personal-brand/drafts/{date_str}"
    image_block = "\n".join(f"- {pos}: {path}" for pos, path in images.items()) or "(없음)"
    copy_block = "\n".join(
        f"### {s['position']}\n**{s['headline']}**\n\n{s['body']}\n"
        for s in slides
    )
    return TEMPLATE.format(
        date_str=date_str, draft_dir=draft_dir, deck_yaml=deck_yaml,
        image_block=image_block, copy_block=copy_block,
    )

```

- [ ] **Step 6.3: 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_prompt_packer.py -v
git add personal-brand/auto/prompt_packer.py personal-brand/auto/tests/test_prompt_packer.py
git commit -m "feat(cardnews-auto): prompt_packer for Pencil agent handoff"
```

---

### Task 7: notifier — iMessage self-chat 알림

**Files:**

- Create: `personal-brand/auto/notifier.py`
- Create: `personal-brand/auto/tests/test_notifier.py`

**Interface:**

```python
def send_morning_report(date_str: str, status: dict) -> None:
    """status = {"topic": str, "slides_ok": bool, "violations": int, "draft_dir": str, "errors": list}"""
```

발송 방식: 메모리 `project_imessage_listener` 기준 — 같은 self-chat에 메시지 전송. 가장 단순한 방법은 AppleScript `osascript` 또는 기존 채널 도구. Phase 1에서는 osascript로 직접 발송.

- [ ] **Step 7.1: failing test**

```python
from unittest.mock import patch
from personal_brand.auto import notifier

def test_sends_imessage_with_status_summary():
    status = {"topic": "구글 지도 3축", "slides_ok": True, "violations": 0,
              "draft_dir": "/path/2026-05-11", "errors": []}
    with patch.object(notifier, "_run_osascript") as mock_send:
        notifier.send_morning_report("2026-05-11", status)
    mock_send.assert_called_once()
    msg = mock_send.call_args[0][0]
    assert "구글 지도 3축" in msg
    assert "OK" in msg or "통과" in msg


def test_includes_error_summary_when_failed():
    status = {"topic": "TBD", "slides_ok": False, "violations": 3,
              "draft_dir": "/path", "errors": ["copy_writer: API 429"]}
    with patch.object(notifier, "_run_osascript") as mock_send:
        notifier.send_morning_report("2026-05-11", status)
    msg = mock_send.call_args[0][0]
    assert "실패" in msg or "오류" in msg
    assert "copy_writer" in msg
```

- [ ] **Step 7.2: 구현**

```python
# personal-brand/auto/notifier.py
from __future__ import annotations
import subprocess
from . import config


def _run_osascript(message: str) -> None:
    """iMessage self-chat으로 발송."""
    script = f'''
tell application "Messages"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant "[연락처]" of targetService
    send "{message.replace('"', '\\"')}" to targetBuddy
end tell
'''
    subprocess.run(["osascript", "-e", script], check=True, timeout=15)


def send_morning_report(date_str: str, status: dict) -> None:
    head = "✅ 카드뉴스 OK" if status["slides_ok"] else "⚠️ 카드뉴스 실패"
    lines = [
        f"{head} ({date_str})",
        f"주제: {status['topic']}",
        f"셀프체크: {'통과' if status['slides_ok'] else f'{status[\"violations\"]}건 위반'}",
        f"드래프트: {status['draft_dir']}",
    ]
    if status["errors"]:
        lines.append("오류:")
        lines.extend(f"- {e}" for e in status["errors"])
    lines.append("")
    lines.append("8:55에 pencil-prompt.md를 Pencil agent에 던져주세요.")
    _run_osascript("\n".join(lines))
```

- [ ] **Step 7.3: 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_notifier.py -v
git add personal-brand/auto/notifier.py personal-brand/auto/tests/test_notifier.py
git commit -m "feat(cardnews-auto): notifier sends morning report via iMessage"
```

---

### Task 8: run_daily — entry point + dry-run

**Files:**

- Create: `personal-brand/auto/run_daily.py`
- Create: `personal-brand/auto/tests/test_run_daily.py`

**Interface:**

```python
def main(dry_run: bool = False) -> int:
    """0 = success, 1 = partial failure (알림은 항상 발송), 2 = critical (env missing)."""
```

- [ ] **Step 8.1: failing test — happy path**

```python
from unittest.mock import patch, MagicMock
from personal_brand.auto import run_daily

def test_main_runs_full_pipeline(tmp_path, monkeypatch):
    # config 경로 가짜로
    monkeypatch.setattr("personal_brand.auto.config.DRAFTS_DIR", tmp_path)
    with patch("personal_brand.auto.topic_picker.pick_topic", return_value={"source": "queue", "title": "T", "angle": "A", "notion_page_id": "p"}), \
         patch("personal_brand.auto.copy_writer.write_copy", return_value={"slides": [{"position": f"0{i+1}_x", "headline": "h", "body": "b", "tags": []} for i in range(8)], "self_check": {"passed": True, "violations": [], "attempts": 1}}), \
         patch("personal_brand.auto.image_matcher.match_images", return_value={}), \
         patch("personal_brand.auto.caption_writer.write_caption", return_value="cap"), \
         patch("personal_brand.auto.notifier.send_morning_report") as mock_notify:
        rc = run_daily.main()
    assert rc == 0
    mock_notify.assert_called_once()
```

- [ ] **Step 8.2: 구현**

```python
# personal-brand/auto/run_daily.py
from __future__ import annotations
import json
import sys
import traceback
from datetime import date
from . import (config, topic_picker, copy_writer, image_matcher,
                caption_writer, deck_builder, prompt_packer, notifier)


def main(dry_run: bool = False) -> int:
    missing = config.require_env()
    if missing:
        print(f"[fatal] env missing: {missing}", file=sys.stderr)
        return 2

    date_str = date.today().isoformat()
    draft = config.today_dir()
    errors: list[str] = []
    topic = None
    copy_result = None
    images = {}
    caption = ""
    deck = ""
    prompt_md = ""

    try:
        topic = topic_picker.pick_topic()
        (draft / "topic.json").write_text(json.dumps(topic, ensure_ascii=False, indent=2))
    except Exception as e:
        errors.append(f"topic_picker: {e}")
        traceback.print_exc()

    if topic:
        try:
            copy_result = copy_writer.write_copy(topic)
            (draft / "copy.md").write_text(
                f"# {topic['title']}\n\n"
                + "\n\n".join(f"## {s['position']}\n\n**{s['headline']}**\n\n{s['body']}"
                              for s in copy_result["slides"])
            )
        except Exception as e:
            errors.append(f"copy_writer: {e}")
            traceback.print_exc()

    if copy_result:
        try:
            images = image_matcher.match_images(copy_result["slides"])
            (draft / "images.json").write_text(json.dumps(images, ensure_ascii=False, indent=2))
        except Exception as e:
            errors.append(f"image_matcher: {e}")
            traceback.print_exc()

        try:
            caption = caption_writer.write_caption(topic, copy_result["slides"])
            (draft / "caption.txt").write_text(caption)
        except Exception as e:
            errors.append(f"caption_writer: {e}")

        try:
            deck = deck_builder.build_deck(copy_result["slides"], images)
            (draft / "deck.yaml").write_text(deck)
        except Exception as e:
            errors.append(f"deck_builder: {e}")

        try:
            prompt_md = prompt_packer.pack_prompt(deck, copy_result["slides"], images, date_str)
            (draft / "pencil-prompt.md").write_text(prompt_md)
        except Exception as e:
            errors.append(f"prompt_packer: {e}")

    status = {
        "topic": topic["title"] if topic else "(주제 결정 실패)",
        "slides_ok": bool(copy_result and copy_result["self_check"]["passed"]),
        "violations": len(copy_result["self_check"]["violations"]) if copy_result else 999,
        "draft_dir": str(draft),
        "errors": errors,
    }

    if not dry_run:
        try:
            notifier.send_morning_report(date_str, status)
        except Exception as e:
            print(f"[warn] notifier 실패: {e}", file=sys.stderr)

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main(dry_run="--dry-run" in sys.argv))
```

- [ ] **Step 8.3: 통과 + 커밋**

```bash
pytest personal-brand/auto/tests/test_run_daily.py -v
git add personal-brand/auto/run_daily.py personal-brand/auto/tests/test_run_daily.py
git commit -m "feat(cardnews-auto): run_daily entry point with error-tolerant pipeline"
```

---

### Task 9: launchd plist — 새벽 05:00 자동 실행

**Files:**

- Create: `personal-brand/auto/launchd/com.agency.cardnews-daily.plist`
- Create: `personal-brand/auto/launchd/install.sh`

- [ ] **Step 9.1: plist 작성**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.agency.cardnews-daily</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/user/Desktop/claude code/personal-brand/auto/launchd/run.sh</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>5</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/cardnews-daily.out.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/cardnews-daily.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

- [ ] **Step 9.2: run.sh wrapper**

`personal-brand/auto/launchd/run.sh`:

```bash
#!/bin/bash
set -e
cd "/Users/user/Desktop/claude code"
/usr/bin/python3 -m personal-brand.auto.run_daily
```

(파일은 chmod +x 필요)

- [ ] **Step 9.3: install.sh — 사용자가 1회 실행**

```bash
#!/bin/bash
set -e
PLIST="$HOME/Library/LaunchAgents/com.agency.cardnews-daily.plist"
cp "$(dirname "$0")/com.agency.cardnews-daily.plist" "$PLIST"
launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"
echo "설치 완료. 다음 실행: 내일 05:00."
echo "테스트: launchctl start com.agency.cardnews-daily"
```

- [ ] **Step 9.4: 권한 + 커밋**

```bash
chmod +x personal-brand/auto/launchd/run.sh personal-brand/auto/launchd/install.sh
git add personal-brand/auto/launchd/
git commit -m "feat(cardnews-auto): launchd daily 05:00 trigger"
```

---

### Task 10: 첫 dry-run + 사용자 검증

- [ ] **Step 10.1: 사용자 .env 채우기 확인**

```bash
cat ~/.config/personal-brand/.env  # NOTION_TOKEN, ANTHROPIC_API_KEY 둘 다 있는지
```

- [ ] **Step 10.2: 수동 dry-run 1회 실행**

```bash
cd "/Users/user/Desktop/claude code"
python3 -m personal-brand.auto.run_daily --dry-run
```

기대 결과:

- `personal-brand/drafts/2026-05-11/` 폴더에 7개 파일 생성:
  - topic.json, copy.md, images.json, caption.txt, deck.yaml, pencil-prompt.md
- iMessage 알림은 발송 X (dry-run)
- exit code 0

- [ ] **Step 10.3: 실제 실행 (알림 포함)**

```bash
python3 -m personal-brand.auto.run_daily
```

iMessage 도착 확인.

- [ ] **Step 10.4: launchd 등록**

```bash
bash personal-brand/auto/launchd/install.sh
```

- [ ] **Step 10.5: 사용자 검토 게이트**

사용자가 9시에 받은 iMessage + `pencil-prompt.md` 검토. OK면 Phase 2(대시보드 + Pencil 빌드 자동화)로 진행.

---

## 자가 검증 (Self-Review)

**Spec coverage:**

- SOP §3 데일리 타임라인 05:00~05:50 → Task 1~6 / 09:00 알림 → Task 7 / cron → Task 9 ✓
- SOP §6 카피 규칙 → Task 0 (rules/copy_rules.md) + Task 2 (scan_violations) ✓
- SOP §7.1 남은 결정 (큐 상태 머신, 이미지 모델, 사진 풀): images_pool.json 시드 Task 3.5에 안내. 큐 상태 머신은 topic_picker가 "상태=대기" 단일 필터로 시작 → Phase 2 확장 예정. 신규 이미지 생성 모델은 Phase 1 제외 (기존 14장 풀만).

**Placeholder scan:** "TBD"·"implement later" 없음. 각 step에 코드 또는 명령 포함.

**Type consistency:** `pick_topic()`·`write_copy()`·`match_images()`·`build_deck()`·`pack_prompt()`·`send_morning_report()` 시그니처 task 간 일치.

**Known gap:**

- `images_pool.json` 시드는 사용자 협업 작업. Task 3.5에서 안내만 함. 사용자가 채우기 전까지는 Task 3 통합 테스트 (실제 14장 매칭)는 무의미.
- `copy_rules.md`는 Task 0에서 수동 복사. SOP §6과 자동 동기화는 안 함 (의도적, 변경 빈도 낮음).
