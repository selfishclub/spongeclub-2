# Plaud 녹음 → 지식위키 자동 적층 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plaud 녹음의 AI 요약노트를 매일 자동으로 긁어와 `knowledge-wiki/` 지식 그래프에 노드로 적층한다.

**Architecture:** launchd가 헤드리스 `claude -p`(공식 Plaud MCP 연결)로 새 녹음 요약을 JSON으로 받고 → 파이썬이 JSON을 `Recording`으로 파싱 → 마크다운 노드 생성 → 기존 slug 자동 링크 → `build_wiki.py` 재실행. 가져오기만 MCP, 나머지는 결정적 파이썬. (iMessage 리스너의 `claude -p` launchd 패턴 재사용.)

**Tech Stack:** Python 3(stdlib만, 신규 pip 의존성 0), 헤드리스 `claude -p` + 공식 Plaud MCP, pytest, launchd. 기존 `knowledge-wiki/wiki/` 패키지에 얹음.

## Global Constraints

- **신규 pip 의존성 0.** 파이썬은 stdlib만(json/subprocess/pathlib). 가져오기는 헤드리스 `claude -p` + 공식 Plaud MCP(추가 파이썬 라이브러리 없음).
- **불변성:** 새 객체 생성, 기존 객체 변형 금지. `Recording`은 `@dataclass(frozen=True)`.
- **파일 크기:** 파일당 <400줄, 함수 <50줄.
- **보안:** `recordings/`(노드+원장), `.env`, `wiki.html`은 gitignore. 토큰·요약 원문을 stdout/로그에 찍지 않는다(건수·id만).
- **테스트:** Plaud 실 API는 목킹. 최소 커버리지 80%. TDD(RED→GREEN→commit).
- 모든 신규 파이썬 파일은 `knowledge-wiki/wiki/` 아래(테스트는 `knowledge-wiki/tests/`), 커맨드는 `cd knowledge-wiki`에서 실행.

---

## File Structure

| 파일 | 책임 |
|------|------|
| `fetch_plaud.sh` | 헤드리스 `claude -p`(공식 Plaud MCP)로 새 녹음 요약을 JSON으로 stdout (신규) |
| `wiki/plaud_ingest.py` | JSON→`Recording` 파싱 + 오케스트레이션: 증분→노드→링크→원장→build (신규) |
| `wiki/plaud_node.py` | `Recording` → 마크다운(frontmatter+본문) 문자열 (신규) |
| `wiki/plaud_linker.py` | 본문 스캔 → 매칭된 기존 slug의 `## 관련` 섹션 생성 (신규) |
| `wiki/sources.py` | `recording` layer 등록 (수정) |
| `recordings/processed.json` | 원장(런타임 생성, gitignore) |
| `com.company.plaud-ingest.plist` | launchd 예약 (신규) |
| `AUTOMATION-RUNBOOK.md` | 자동화 등록 (수정, 루트) |
| `tests/test_plaud_*.py` | 각 모듈 단위테스트 (신규) |
| `fixtures/plaud_recordings.json` | Task 1에서 캡처한 MCP fetch 샘플 출력(민감정보 제거) |

---

### Task 1: 공식 Plaud MCP 설치 + fetch 스크립트 확정 + 샘플 캡처 (스파이크)

이 태스크는 **헤드리스 `claude -p`가 공식 Plaud MCP로 새 녹음 요약을 JSON으로 뱉는 경로를 확정**한다. 자동 테스트 대신 수동 검증. 산출물(`fetch_plaud.sh` + 샘플 JSON fixture)에 이후 태스크가 의존한다. **사용자 손 필요(MCP 설치·로그인).**

**Files:**
- Create: `knowledge-wiki/fetch_plaud.sh`
- Create: `knowledge-wiki/fixtures/plaud_recordings.json` (샘플 출력, 민감정보 제거)

**Produces:** `fetch_plaud.sh`(인자로 `since` 날짜를 받아 `[{id,title,date,summary}]` JSON을 stdout) + JSON 스키마 확정(키 이름 id/title/date/summary).

- [ ] **Step 1: 공식 Plaud MCP 설치.** [docs.plaud.ai/plaud-mcp-cli/mcp](https://docs.plaud.ai/plaud-mcp-cli/mcp)의 인스톨러 실행(Node ≥20). 인스톨러가 AI 클라이언트를 감지해 MCP 설정을 써줌. Claude에 Plaud 로그인 1회. (구글 로그인 계정이면 web.plaud.ai "비밀번호 찾기"로 비번 먼저 설정.)

- [ ] **Step 2: MCP 툴 확인.** 대화 세션에서 Plaud MCP 툴 이름을 확인(예: `plaud_list_recordings`, `plaud_get_summary`). fetch 프롬프트에 쓸 정확한 동작을 파악.

- [ ] **Step 3: fetch 스크립트 작성.** `knowledge-wiki/fetch_plaud.sh`:

```bash
#!/usr/bin/env bash
# 헤드리스 claude로 공식 Plaud MCP에서 새 녹음 요약을 JSON으로 출력.
# 사용: ./fetch_plaud.sh 2026-07-01   (해당 날짜 이후 녹음)
set -euo pipefail
SINCE="${1:-1970-01-01}"
PROMPT="Plaud MCP를 사용해 ${SINCE} 이후 날짜의 녹음을 나열하고, 각 녹음의 AI 요약을 가져와라. \
결과를 다른 설명 없이 JSON 배열로만 출력: [{\"id\":\"...\",\"title\":\"...\",\"date\":\"YYYY-MM-DD\",\"summary\":\"...\"}]. \
녹음이 없으면 []만 출력."
claude -p "$PROMPT" --output-format text
```
`chmod +x knowledge-wiki/fetch_plaud.sh`. (MCP를 무인 claude가 물게 하는 설정 경로는 설치 시 확정 — 필요하면 `--mcp-config` 또는 프로젝트 `.mcp.json`.)

- [ ] **Step 4: 실제 실행으로 형식 확인.** Run: `cd knowledge-wiki && ./fetch_plaud.sh 2026-01-01 | tee /tmp/plaud_out.json`
Expected: `[{...}]` JSON. 파싱되는지 확인: `python3 -c "import json,wiki.plaud_ingest as p;print(len(p.parse_recordings(open('/tmp/plaud_out.json').read())))"`.
형식이 안 맞으면(감싸는 텍스트/키 이름 다름) Step 3 프롬프트를 조정해 `[{"id","title","date","summary"}]` 형태가 나오게 한다.
**주의:** 테스트용 `fixtures/plaud_recordings.json`은 이미 커밋된 합성 샘플이다. 실제 녹음 데이터로 덮어쓰지 마라(민감정보). 파싱 검증은 합성 fixture로 이미 커버됨.

- [ ] **Step 5: Commit** (fetch 스크립트만).

```bash
cd "/Users/user/Desktop/claude code"
git add knowledge-wiki/fetch_plaud.sh
git commit -m "feat(knowledge-wiki): 공식 Plaud MCP fetch 스크립트"
```

---

### Task 2: plaud_ingest 파싱 — JSON → Recording

fetch가 뱉은 JSON을 `Recording`으로 파싱하는 부분(오케스트레이션은 Task 5에서 같은 파일에 추가).

**Files:**
- Create: `knowledge-wiki/wiki/plaud_types.py` (`Recording` dataclass — 순환 import 방지용 단독 모듈)
- Create: `knowledge-wiki/wiki/plaud_ingest.py` (`parse_recordings`, `fetch_recordings`)
- Test: `knowledge-wiki/tests/test_plaud_parse.py`

**Interfaces:**
- Consumes: `fixtures/plaud_recordings.json` (Task 1 스키마: id/title/date/summary)
- Produces:
  - `wiki/plaud_types.py`: `@dataclass(frozen=True) Recording(id: str, title: str, date: str, summary: str|None = None, transcript: str|None = None)`
  - `parse_recordings(raw: str) -> list[Recording]` — fetch stdout(JSON 문자열)을 파싱. JSON 파싱 실패/빈 문자열 → `[]`.
  - `fetch_recordings(script_path, since: str) -> list[Recording]` — `fetch_plaud.sh` 실행(subprocess) → `parse_recordings`.

- [ ] **Step 1: 실패 테스트 작성.**

```python
# tests/test_plaud_parse.py
import json
from pathlib import Path
from wiki.plaud_types import Recording
from wiki.plaud_ingest import parse_recordings

FX = Path(__file__).resolve().parent.parent / "fixtures"

def test_parse_fixture_maps_fields():
    raw = (FX / "plaud_recordings.json").read_text()
    recs = parse_recordings(raw)
    assert recs and isinstance(recs[0], Recording)
    assert recs[0].id and recs[0].title
    assert len(recs[0].date) == 10          # 'YYYY-MM-DD'

def test_parse_empty_and_garbage_return_empty():
    assert parse_recordings("[]") == []
    assert parse_recordings("") == []
    assert parse_recordings("설명 없이 JSON만 출력하랬는데 실패") == []

def test_parse_extracts_json_when_wrapped_in_text():
    raw = '여기 결과입니다:\n[{"id":"a","title":"회의","date":"2026-07-05","summary":"결정 A"}]\n끝'
    recs = parse_recordings(raw)
    assert len(recs) == 1 and recs[0].summary == "결정 A"
```

- [ ] **Step 2: 실패 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_parse.py -v` → FAIL.

- [ ] **Step 3: 구현.**

```python
# wiki/plaud_types.py
"""공유 데이터 타입 (순환 import 방지용 단독 모듈)."""
from dataclasses import dataclass

@dataclass(frozen=True)
class Recording:
    id: str
    title: str
    date: str            # 'YYYY-MM-DD'
    summary: str | None = None
    transcript: str | None = None
```

```python
# wiki/plaud_ingest.py
"""Plaud fetch(JSON) → Recording 파싱 + 적층 오케스트레이션."""
import json
import re
import subprocess
from wiki.plaud_types import Recording

def parse_recordings(raw: str) -> list:
    if not raw or not raw.strip():
        return []
    text = raw.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\[.*\]", text, re.DOTALL)   # 텍스트에 감싸인 JSON 배열 추출
        if not m:
            return []
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return []
    if not isinstance(data, list):
        return []
    out = []
    for it in data:
        if not isinstance(it, dict) or not it.get("id"):
            continue
        out.append(Recording(
            id=str(it["id"]),
            title=(it.get("title") or "무제").strip(),
            date=str(it.get("date") or "")[:10],
            summary=it.get("summary"),
        ))
    return out

def fetch_recordings(script_path, since: str) -> list:
    proc = subprocess.run([str(script_path), since], capture_output=True,
                          text=True, timeout=600)
    return parse_recordings(proc.stdout)
```

- [ ] **Step 4: 통과 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_parse.py -v` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add knowledge-wiki/wiki/plaud_types.py knowledge-wiki/wiki/plaud_ingest.py knowledge-wiki/tests/test_plaud_parse.py
git commit -m "feat(knowledge-wiki): fetch JSON→Recording 파싱"
```

---

### Task 3: plaud_node — Recording → 마크다운 노드

**Files:**
- Create: `knowledge-wiki/wiki/plaud_node.py`
- Test: `knowledge-wiki/tests/test_plaud_node.py`

**Interfaces:**
- Consumes: `Recording` (Task 2)
- Produces:
  - `slugify(title: str, date: str) -> str` → `'2026-07-05-<제목>'` (한글 유지, 공백·특수문자→`-`)
  - `to_markdown(rec: Recording, related: str = "") -> str` → frontmatter+본문 문자열
  - `filename(rec: Recording) -> str` → `'2026-07-05-<제목>.md'`

- [ ] **Step 1: 실패 테스트.**

```python
# tests/test_plaud_node.py
from wiki.plaud_types import Recording
from wiki.plaud_node import slugify, to_markdown, filename

def test_slugify_keeps_hangul_and_date():
    assert slugify("A의원 회의 3차!", "2026-07-05") == "2026-07-05-a의원-회의-3차"

def test_to_markdown_has_frontmatter_and_summary():
    rec = Recording(id="x1", title="A의원 회의", date="2026-07-05", summary="핵심 결정 A")
    md = to_markdown(rec)
    assert md.startswith("---\n")
    assert "name: recording_2026-07-05-a의원-회의" in md
    assert "source: plaud" in md
    assert "recording_id: x1" in md
    assert "핵심 결정 A" in md

def test_to_markdown_falls_back_to_transcript_when_no_summary():
    rec = Recording(id="x2", title="메모", date="2026-07-05", summary=None, transcript="원문 텍스트")
    assert "원문 텍스트" in to_markdown(rec)

def test_filename():
    rec = Recording(id="x", title="아이디어", date="2026-07-05")
    assert filename(rec) == "2026-07-05-아이디어.md"
```

- [ ] **Step 2: 실패 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_node.py -v` → FAIL.

- [ ] **Step 3: 구현.**

```python
# wiki/plaud_node.py
"""Plaud Recording → 기존 위키 파서가 읽는 마크다운 노드."""
import re
from wiki.plaud_types import Recording

def slugify(title: str, date: str) -> str:
    base = title.strip().lower()
    base = re.sub(r"[^\w가-힣]+", "-", base, flags=re.UNICODE).strip("-")
    base = base or "무제"
    return f"{date}-{base}"

def filename(rec: Recording) -> str:
    return f"{slugify(rec.title, rec.date)}.md"

def to_markdown(rec: Recording, related: str = "") -> str:
    slug = slugify(rec.title, rec.date)
    body = (rec.summary or rec.transcript or "").strip() or "(내용 없음)"
    parts = [
        "---",
        f"name: recording_{slug}",
        f"date: {rec.date}",
        "source: plaud",
        f"recording_id: {rec.id}",
        "---",
        "",
        f"# {rec.title}",
        "",
        body,
    ]
    if related.strip():
        parts += ["", related.rstrip()]
    return "\n".join(parts) + "\n"
```

- [ ] **Step 4: 통과 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_node.py -v` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add knowledge-wiki/wiki/plaud_node.py knowledge-wiki/tests/test_plaud_node.py
git commit -m "feat(knowledge-wiki): Recording→마크다운 노드 변환"
```

---

### Task 4: plaud_linker — 자동 `## 관련` 링크

**Files:**
- Create: `knowledge-wiki/wiki/plaud_linker.py`
- Test: `knowledge-wiki/tests/test_plaud_linker.py`

**Interfaces:**
- Produces:
  - `build_alias_map(source_dirs: list[Path]) -> dict[str, str]` — 각 소스 디렉터리의 `*.md` 파일명(slug)을 자기 자신에 매핑 + 하드코딩 별칭 병합
  - `related_section(text: str, alias_map: dict[str,str]) -> str` — 본문에서 별칭 스캔 → `"## 관련\n- [[slug]]\n..."` (매칭 없으면 빈 문자열)

별칭 사전(하드코딩 시드, 확장 가능):

```python
ALIASES = {
    "A의원": "project_a_clinic_gbp", "A의원 의원": "project_a_clinic_gbp",
    "B의원": "project_b_seocho_keywords",
    "C의원": "project_c_sinsa_keyword", "G엔터": "project_g_nara_bid",
}
```

- [ ] **Step 1: 실패 테스트.**

```python
# tests/test_plaud_linker.py
from wiki.plaud_linker import related_section

def test_related_section_matches_alias():
    amap = {"A의원": "project_a_clinic_gbp", "B의원": "project_b_seocho_keywords"}
    out = related_section("오늘 A의원 미팅에서 결정", amap)
    assert "## 관련" in out
    assert "[[project_a_clinic_gbp]]" in out
    assert "B의원" not in out  # 미언급은 링크 안 함

def test_related_section_dedupes_and_empty():
    amap = {"A의원": "project_a_clinic_gbp", "A의원 의원": "project_a_clinic_gbp"}
    out = related_section("A의원 A의원 의원 반복", amap)
    assert out.count("[[project_a_clinic_gbp]]") == 1
    assert related_section("아무 관련 없음", {"A의원": "x"}) == ""
```

- [ ] **Step 2: 실패 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_linker.py -v` → FAIL.

- [ ] **Step 3: 구현.**

```python
# wiki/plaud_linker.py
"""녹음 본문 → 기존 slug로 자동 링크(## 관련 섹션). 본문은 건드리지 않는다."""
from pathlib import Path

ALIASES = {
    "A의원": "project_a_clinic_gbp", "A의원 의원": "project_a_clinic_gbp",
    "B의원": "project_b_seocho_keywords",
    "C의원": "project_c_sinsa_keyword", "G엔터": "project_g_nara_bid",
}

def build_alias_map(source_dirs) -> dict:
    amap = dict(ALIASES)
    for d in source_dirs:
        d = Path(d)
        if not d.exists():
            continue
        for p in d.rglob("*.md"):
            slug = p.stem
            amap.setdefault(slug, slug)          # 파일명 자체도 별칭
    return amap

def related_section(text: str, alias_map: dict) -> str:
    found = []
    for alias, slug in alias_map.items():
        if alias and alias in text and slug not in found:
            found.append(slug)
    if not found:
        return ""
    lines = ["## 관련"] + [f"- [[{s}]]" for s in found]
    return "\n".join(lines) + "\n"
```

- [ ] **Step 4: 통과 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_linker.py -v` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add knowledge-wiki/wiki/plaud_linker.py knowledge-wiki/tests/test_plaud_linker.py
git commit -m "feat(knowledge-wiki): 녹음 본문 자동 링크(## 관련)"
```

---

### Task 5: plaud_ingest — 오케스트레이션 + 증분 원장

Task 2에서 만든 `plaud_ingest.py`에 적층 로직을 추가한다. 입력은 fetch가 이미 요약까지 담아 준 `list[Recording]`(별도 client 없음).

**Files:**
- Modify: `knowledge-wiki/wiki/plaud_ingest.py` (Task 2 파일에 추가)
- Test: `knowledge-wiki/tests/test_plaud_ingest.py`

**Interfaces:**
- Consumes: `Recording`(Task 2, 요약 포함), `plaud_node`(3), `plaud_linker`(4)
- Produces:
  - `ingest(recordings: list[Recording], recordings_dir: Path, source_dirs: list[Path], ledger_path: Path) -> list[str]`
    — 새 녹음만 노드 생성(멱등), 원장 갱신, 생성된 파일명 리스트 반환. `build_wiki` 호출은 하지 않음(호출부 분리).
  - `load_ledger(path) / save_ledger(path, data)`

- [ ] **Step 1: 실패 테스트.**

```python
# tests/test_plaud_ingest.py
import json
from pathlib import Path
from wiki.plaud_types import Recording
from wiki.plaud_ingest import ingest

def test_ingest_creates_new_and_skips_seen(tmp_path):
    recs = [Recording(id="a", title="A의원 회의", date="2026-07-05", summary="결정 A"),
            Recording(id="b", title="아이디어", date="2026-07-05", summary="브레인 B")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    made = ingest(recs, rec_dir, [tmp_path], ledger)
    assert len(made) == 2
    node = rec_dir / "2026-07-05-a의원-회의.md"
    assert node.exists() and "결정 A" in node.read_text()
    # 2회차: 이미 본 것 스킵
    made2 = ingest(recs, rec_dir, [tmp_path], ledger)
    assert made2 == []
    assert set(json.loads(ledger.read_text()).keys()) == {"a", "b"}

def test_ingest_is_idempotent_on_existing_file(tmp_path):
    recs = [Recording(id="a", title="메모", date="2026-07-05", summary="x")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    ingest(recs, rec_dir, [tmp_path], ledger)
    ledger.write_text("{}")                      # 원장만 비워도
    made = ingest(recs, rec_dir, [tmp_path], ledger)
    assert made == []                            # 파일 존재 → 미덮어씀
```

- [ ] **Step 2: 실패 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_ingest.py -v` → FAIL.

- [ ] **Step 3: 구현.** `plaud_ingest.py` 상단 import에 `from pathlib import Path` / `from wiki.plaud_node import to_markdown, filename` / `from wiki.plaud_linker import build_alias_map, related_section` 추가하고, 아래를 append:

```python
def load_ledger(path) -> dict:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}

def save_ledger(path, data: dict) -> None:
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2))

def ingest(recordings, recordings_dir, source_dirs, ledger_path) -> list:
    recordings_dir = Path(recordings_dir); recordings_dir.mkdir(parents=True, exist_ok=True)
    ledger = load_ledger(ledger_path)
    alias_map = build_alias_map(source_dirs)
    made = []
    for rec in recordings:
        if rec.id in ledger:
            continue
        fpath = recordings_dir / filename(rec)
        if fpath.exists():                       # 멱등: 파일 있으면 원장만 보정
            ledger[rec.id] = rec.date
            continue
        related = related_section((rec.summary or rec.transcript or ""), alias_map)
        fpath.write_text(to_markdown(rec, related), encoding="utf-8")
        ledger[rec.id] = rec.date
        made.append(fpath.name)
    save_ledger(ledger_path, ledger)
    return made
```

- [ ] **Step 4: 통과 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_plaud_ingest.py -v` → PASS.

- [ ] **Step 5: Commit.**

```bash
git add knowledge-wiki/wiki/plaud_ingest.py knowledge-wiki/tests/test_plaud_ingest.py
git commit -m "feat(knowledge-wiki): 증분 수집 오케스트레이션 + 원장"
```

---

### Task 6: sources 등록 + CLI 엔트리 + build 통합

**Files:**
- Modify: `knowledge-wiki/wiki/sources.py`
- Modify: `knowledge-wiki/wiki/plaud_ingest.py` (`__main__` 추가)
- Test: `knowledge-wiki/tests/test_sources.py` (신규)

**Interfaces:**
- Consumes: `ingest`(5), `sources`(등록됨)
- Produces: `python3 -m wiki.plaud_ingest` 실행 시 수집→노드 생성→`build_wiki.main()` 호출까지.

- [ ] **Step 1: 실패 테스트.**

```python
# tests/test_sources.py
from wiki.sources import sources

def test_recording_layer_registered():
    layers = {name for name, _ in sources()}
    assert "recording" in layers
```

- [ ] **Step 2: 실패 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_sources.py -v` → FAIL.

- [ ] **Step 3: sources.py 수정.** `sources()`의 리스트에 한 줄 추가:

```python
        ("docs", ROOT / "docs/superpowers"),
        ("recording", Path(__file__).resolve().parent.parent / "recordings"),
```

- [ ] **Step 4: 통과 확인.** Run: `cd knowledge-wiki && python3 -m pytest tests/test_sources.py -v` → PASS.

- [ ] **Step 5: ingest에 `__main__` 엔트리 추가.** `plaud_ingest.py` 하단:

```python
if __name__ == "__main__":
    import sys
    import build_wiki
    from wiki.sources import sources as _sources
    here = Path(__file__).resolve().parent.parent
    since = sys.argv[1] if len(sys.argv) > 1 else "1970-01-01"
    recs = fetch_recordings(here / "fetch_plaud.sh", since)
    made = ingest(recs, here / "recordings",
                  [p for _, p in _sources()], here / "recordings" / "processed.json")
    print(f"신규 녹음 {len(made)}건 적층")     # 제목·원문은 출력 안 함(보안)
    build_wiki.main()
```

- [ ] **Step 6: 전체 테스트 + 수동 실행 검증.**

```bash
cd knowledge-wiki && python3 -m pytest -v && python3 -m wiki.plaud_ingest && open wiki.html
```
Expected: 전체 PASS. 그래프에 `recording` 노드가 새로 보이고, 관련 거래처 노드와 선으로 연결됨.

- [ ] **Step 7: Commit.**

```bash
git add knowledge-wiki/wiki/sources.py knowledge-wiki/wiki/plaud_ingest.py knowledge-wiki/tests/test_sources.py
git commit -m "feat(knowledge-wiki): recording 소스 등록 + ingest CLI 엔트리"
```

---

### Task 7: gitignore + launchd 예약 + 런북 등록

**Files:**
- Modify: `knowledge-wiki/.gitignore`
- Create: `knowledge-wiki/com.company.plaud-ingest.plist`
- Modify: `AUTOMATION-RUNBOOK.md` (루트)

- [ ] **Step 1: gitignore.** ✅ 이미 완료 — `knowledge-wiki/.gitignore`에 `recordings/` 추가됨(커밋 2198859). `fixtures/plaud_recordings.json`은 합성 샘플이라 커밋 유지(실데이터 아님). 추가 조치 불필요.

- [ ] **Step 2: launchd plist 작성.** `knowledge-wiki/com.company.plaud-ingest.plist` (매일 08:00). 경로·python 절대경로는 `which python3`로 확인 후 기입:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.company.plaud-ingest</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-m</string><string>wiki.plaud_ingest</string>
  </array>
  <key>WorkingDirectory</key>
  <string>/Users/user/Desktop/claude code/knowledge-wiki</string>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
  <key>StandardOutPath</key><string>/tmp/plaud-ingest.log</string>
  <key>StandardErrorPath</key><string>/tmp/plaud-ingest.err</string>
</dict></plist>
```

- [ ] **Step 3: 로드 + dry-run.**

```bash
cp "/Users/user/Desktop/claude code/knowledge-wiki/com.company.plaud-ingest.plist" ~/Library/LaunchAgents/
launchctl unload ~/Library/LaunchAgents/com.company.plaud-ingest.plist 2>/dev/null
launchctl load ~/Library/LaunchAgents/com.company.plaud-ingest.plist
launchctl start com.company.plaud-ingest
sleep 5 && cat /tmp/plaud-ingest.log
```
Expected: `신규 녹음 N건 적층` + 그래프 갱신. 터미널에 FDA(전체 디스크 접근) 필요할 수 있음(기존 launchd 자동화와 동일).

- [ ] **Step 4: AUTOMATION-RUNBOOK 등록.** 루트 `AUTOMATION-RUNBOOK.md`에 항목 추가: 이름 `com.company.plaud-ingest`, 스케줄 매일 08:00, 동작 "Plaud 녹음→지식위키 노드 적층", 상태 가동, 로그 `/tmp/plaud-ingest.log`.

- [ ] **Step 5: Commit.**

```bash
cd "/Users/user/Desktop/claude code"
git add knowledge-wiki/.gitignore knowledge-wiki/com.company.plaud-ingest.plist AUTOMATION-RUNBOOK.md
git commit -m "chore(knowledge-wiki): Plaud 적층 launchd 예약 + 런북 등록 + gitignore"
```

---

## Self-Review

- **스펙 커버리지:** §3 흐름(fetch=MCP, 나머지=파이썬)=Task1·2·5·6, §4 구성요소=Task1(fetch.sh)·2(파싱)·3(노드)·4(링커)·5(원장)·6(sources), §4.1 노드포맷=Task3, §4.3 자동링커=Task4, §5 증분/멱등=Task5, §6 보안(gitignore/무로그)=Task7·Global, §7 폴백(요약 없으면 트랜스크립트)=Task3 `to_markdown`(summary or transcript), §8 테스트=각 Task, §9 미확정(MCP툴명·MCP설정경로·실행시각)=Task1(설치 확인)·Task7(08:00), §10 런북=Task7. 누락 없음.
- **플레이스홀더:** Task 1의 MCP 툴명/설정 경로는 "설치 후 확인" 스파이크로 처리(공식 MCP라 설치 시 확정) — fetch.sh가 동작 확인된 뒤 Task 2 진행. 그 외 TODO 없음.
- **타입 일관성:** `Recording`(frozen, id/title/date/summary/transcript) — `wiki/plaud_types.py`에 단독 정의(순환 import 방지), Task2·3·5에서 `from wiki.plaud_types import Recording`로 동일 사용. `ingest(recordings, recordings_dir, source_dirs, ledger_path)` 시그니처 Task5·6 일치(client 인자 없음). `parse_recordings`/`fetch_recordings`/`related_section`/`build_alias_map`/`to_markdown`/`filename`/`slugify` 이름 태스크 간 일치 확인.
