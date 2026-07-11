# 지식 위키 (Knowledge Wiki) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 워크스페이스에 흩어진 ~250개 마크다운 지식을 읽어, 그래프 + 위키 페이지가 담긴 자체 완결 `wiki.html` 한 장을 만드는 로컬 전용 파이썬 도구.

**Architecture:** 6단계 파이프라인(Collect → Parse → Resolve → Graph → Render → Run). 각 단계는 `wiki/` 아래 독립 모듈, 단일 책임, 픽스처로 단위 테스트. 그래프 레이아웃은 cytoscape.js(벤더링·인라인) 재사용, 나머지는 얇은 글루.

**Tech Stack:** Python 3 (stdlib 중심), `markdown` 라이브러리(md→HTML, 유일한 신규 의존성), cytoscape.js(HTML 인라인), pytest.

**Spec:** `docs/superpowers/specs/2026-07-05-knowledge-wiki-design.md`

---

## 파일 구조

```
knowledge-wiki/
├── build_wiki.py            # 진입점: 파이프라인 실행 + 요약 출력
├── wiki/
│   ├── __init__.py
│   ├── sources.py           # SOURCES 화이트리스트 정의
│   ├── collector.py         # SOURCES walk → 문서 레코드
│   ├── parser.py            # frontmatter/제목/본문HTML/링크raw/search_text
│   ├── resolver.py          # raw 링크 → 노드 id (dangling/out_of_scope/dedup)
│   ├── graph.py             # 노드+엣지+백링크 조립
│   └── render.py            # wiki.html 방출 (cytoscape 인라인)
├── templates/
│   ├── wiki.html.tmpl       # 3영역 레이아웃 + JS
│   └── cytoscape.min.js     # 벤더링된 라이브러리 (인라인 소스)
├── tests/
│   ├── test_collector.py
│   ├── test_parser.py
│   ├── test_resolver.py
│   └── test_graph.py
├── fixtures/                # 테스트용 미니 지식 폴더
├── requirements.txt         # markdown
├── .gitignore               # wiki.html
└── CLAUDE.md                # 경량 운영 메모
```

---

### Task 0: 프로젝트 골격 + 픽스처

**Files:**
- Create: `knowledge-wiki/wiki/__init__.py`, `knowledge-wiki/requirements.txt`, `knowledge-wiki/.gitignore`, `knowledge-wiki/CLAUDE.md`
- Create: `knowledge-wiki/fixtures/` (미니 지식 세트)

- [ ] **Step 1: 폴더·빈 패키지 생성**

```bash
mkdir -p "knowledge-wiki/wiki" "knowledge-wiki/templates" "knowledge-wiki/tests" "knowledge-wiki/fixtures/memory" "knowledge-wiki/fixtures/ontology"
touch "knowledge-wiki/wiki/__init__.py" "knowledge-wiki/tests/__init__.py"
printf 'markdown>=3.5\n' > "knowledge-wiki/requirements.txt"
printf 'wiki.html\n__pycache__/\n*.pyc\n.venv/\n' > "knowledge-wiki/.gitignore"
```

- [ ] **Step 2: 픽스처 파일 작성** — 링크 해석 모든 경우를 덮는 최소 세트

`fixtures/memory/alpha.md`:
```markdown
---
name: ""
metadata:
  type: project
---
# 알파 프로젝트
베타를 참고. [[beta]] 그리고 [[missing_note]] 도 가리킨다.
```
`fixtures/memory/beta.md`:
```markdown
---
metadata:
  type: feedback
---
# 베타 규칙
알파로 돌아가기 [[alpha]]. 외부 링크 https://example.com 는 무시.
```
`fixtures/memory/feedback_orphan.md` (frontmatter type 없음 → 접두어 추론):
```markdown
# 외톨이 피드백
아무도 안 가리키고 아무도 안 가리켜지는 노드.
```
`fixtures/ontology/pricing.md`:
```markdown
# 가격표
상위 규칙 [문서](../memory/beta.md) 참고. 앵커 [섹션](../memory/alpha.md#알파-프로젝트).
```

- [ ] **Step 3: CLAUDE.md 작성** (경량)

```markdown
# knowledge-wiki

내 지식 베이스(ontology/memory/rules/CLAUDE.md/docs ~250개)를 그래프+위키 HTML로 뽑는 로컬 전용 도구.

- 실행: `python3 build_wiki.py` → `wiki.html` 생성 → `open wiki.html`
- **wiki.html은 거래처 민감정보 포함. 절대 공유·업로드·커밋 금지 (.gitignore 처리됨).**
- 자동 실행 아님(수동). 지식 늘면 재실행으로 갱신.
- 설계: `../docs/superpowers/specs/2026-07-05-knowledge-wiki-design.md`
```

- [ ] **Step 4: Commit**

```bash
git add knowledge-wiki/
git commit -m "chore(knowledge-wiki): 프로젝트 골격 + 테스트 픽스처"
```

---

### Task 1: Collector — SOURCES walk

**Files:**
- Create: `knowledge-wiki/wiki/sources.py`, `knowledge-wiki/wiki/collector.py`
- Test: `knowledge-wiki/tests/test_collector.py`

- [ ] **Step 1: 실패 테스트** — 픽스처 루트를 주면 문서 레코드 목록을 안정 id로 반환

```python
from pathlib import Path
from wiki.collector import collect

def test_collect_walks_whitelist(tmp_path=None):
    root = Path(__file__).parent.parent / "fixtures"
    src = [("memory", root / "memory"), ("ontology", root / "ontology")]
    docs = collect(src)
    ids = {d["id"] for d in docs}
    assert "memory/alpha" in ids
    assert "ontology/pricing" in ids
    assert all("layer" in d and "abspath" in d for d in docs)
```

- [ ] **Step 2: 실패 확인** — `cd knowledge-wiki && python -m pytest tests/test_collector.py -v` → FAIL(import)

- [ ] **Step 3: 최소 구현**

`sources.py`: `SOURCES` 리스트 정의(실제 5개 경로, `~` 확장). collector 테스트는 픽스처 주입이라 SOURCES 자체는 build 시만 사용.
`collector.py`:
```python
from pathlib import Path

def collect(sources):
    """sources: list of (layer, dir_path). return list of doc records."""
    docs = []
    for layer, base in sources:
        base = Path(base)
        if not base.exists():
            continue
        for p in sorted(base.rglob("*.md")):
            rel = p.relative_to(base).with_suffix("")
            docs.append({
                "id": f"{layer}/{rel.as_posix()}",
                "layer": layer,
                "abspath": str(p),
                "basename": p.stem,
            })
    return docs
```

- [ ] **Step 4: 통과 확인** — `python -m pytest tests/test_collector.py -v` → PASS
- [ ] **Step 5: Commit** — `git add knowledge-wiki/wiki knowledge-wiki/tests && git commit -m "feat(knowledge-wiki): collector — SOURCES walk"`

---

### Task 2: Parser — frontmatter/제목/본문HTML/링크/search_text

**Files:**
- Create: `knowledge-wiki/wiki/parser.py`
- Test: `knowledge-wiki/tests/test_parser.py`

- [ ] **Step 1: 실패 테스트**

```python
from wiki.parser import parse

def test_parse_title_links_type():
    text = ('---\nmetadata:\n  type: project\n---\n'
            '# 알파 프로젝트\n베타 [[beta]] 참고. [문서](../memory/beta.md)\n')
    r = parse(text)
    assert r["title"] == "알파 프로젝트"
    assert r["type"] == "project"
    assert ("wikilink", "beta") in r["raw_links"]
    assert ("mdlink", "../memory/beta.md") in r["raw_links"]
    assert "<h1" in r["html"]
    assert "베타" in r["search_text"] and "<" not in r["search_text"]

def test_parse_title_fallback_and_prefix_type():
    r = parse("본문만 있고 제목 없음")
    assert r["title"]  # 빈 문자열 아님 (호출측이 파일명으로 대체)
    assert r["type"] is None  # frontmatter 없음
```

- [ ] **Step 2: 실패 확인** — FAIL(import)

- [ ] **Step 3: 최소 구현**

```python
import re, html as _html
import markdown as md

_FM = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
_WIKI = re.compile(r"\[\[([^\]]+)\]\]")
_MD = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
_TAG = re.compile(r"<[^>]+>")

def _frontmatter(text):
    m = _FM.match(text)
    if not m:
        return {}, text
    block, body = m.group(1), text[m.end():]
    fm = {"type": None}
    tm = re.search(r"^\s*type:\s*(\S+)", block, re.MULTILINE)
    if tm:
        fm["type"] = tm.group(1).strip().strip('"')
    return fm, body

def parse(text):
    fm, body = _frontmatter(text)
    # 제목: 첫 H1
    h1 = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    title = h1.group(1).strip() if h1 else ""
    # 링크 raw (glob/확장자없음/외부URL은 resolver가 거른다; 여기선 원문만)
    raw = [("wikilink", s.strip()) for s in _WIKI.findall(body)]
    raw += [("mdlink", s.strip()) for s in _MD.findall(body)]
    html_body = md.markdown(_html.escape(body, quote=False) if False else body,
                            extensions=["extra", "sane_lists"])
    plain = _TAG.sub(" ", html_body).lower()
    return {
        "title": title or "(제목 없음)",
        "type": fm.get("type"),
        "raw_links": raw,
        "html": html_body,
        "search_text": re.sub(r"\s+", " ", plain).strip(),
    }
```
> 원시 script 이스케이프: `markdown`은 기본적으로 raw HTML을 통과시키므로, 소스 md의 `<script>`가 위험하면 `md.markdown(..., extensions=[...])` 전에 `<script`/`</script`만 무력화. v1 소스는 형이 쓴 신뢰 문서이므로 기본 통과 + `<script`만 치환한다.

수정: `html_body` 라인 위에 `body = body.replace("<script", "&lt;script")` 추가.

- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): parser — frontmatter/title/html/links"`

---

### Task 3: Resolver — raw 링크 → 노드 id

**Files:**
- Create: `knowledge-wiki/wiki/resolver.py`
- Test: `knowledge-wiki/tests/test_resolver.py`

- [ ] **Step 1: 실패 테스트**

```python
from wiki.resolver import resolve_links

def _docs():
    return [
        {"id": "memory/alpha", "layer": "memory", "basename": "alpha",
         "abspath": "/k/fixtures/memory/alpha.md",
         "raw_links": [("wikilink","beta"),("wikilink","missing_note")]},
        {"id": "memory/beta", "layer": "memory", "basename": "beta",
         "abspath": "/k/fixtures/memory/beta.md", "raw_links": [("wikilink","alpha")]},
        {"id": "ontology/pricing", "layer": "ontology", "basename": "pricing",
         "abspath": "/k/fixtures/ontology/pricing.md",
         "raw_links": [("mdlink","../memory/beta.md"),("mdlink","../memory/alpha.md#x"),
                       ("mdlink","https://example.com"),("mdlink","nope.md")]},
    ]

def test_wikilink_and_mdlink_and_dangling():
    edges, ghosts = resolve_links(_docs())
    E = {(e["source"], e["target"], e["kind"]) for e in edges}
    assert ("memory/alpha","memory/beta","wikilink") in E
    assert ("ontology/pricing","memory/beta","mdlink") in E      # 상대경로
    assert ("ontology/pricing","memory/alpha","mdlink") in E     # 앵커 제거
    # 외부 URL은 엣지 아님
    assert not any(e["target"].startswith("http") for e in edges)
    # dangling: missing_note 유령 노드 생성
    assert any(g["dangling"] and "missing_note" in g["id"] for g in ghosts)

def test_edge_dedup():
    d = [{"id":"memory/a","layer":"memory","basename":"a","abspath":"/x/a.md",
          "raw_links":[("wikilink","b"),("wikilink","b")]},
         {"id":"memory/b","layer":"memory","basename":"b","abspath":"/x/b.md","raw_links":[]}]
    edges, _ = resolve_links(d)
    assert len(edges) == 1
```

- [ ] **Step 2: 실패 확인** — FAIL

- [ ] **Step 3: 최소 구현**

```python
from pathlib import Path
from urllib.parse import unquote

def resolve_links(docs):
    by_id = {d["id"]: d for d in docs}
    abspath_to_id = {str(Path(d["abspath"]).resolve()): d["id"] for d in docs}
    # 위키링크: memory 층 basename → id (먼저 온 것 우선, 대소문자 구분)
    basename_to_id = {}
    for d in docs:
        if d["layer"] == "memory" and d["basename"] not in basename_to_id:
            basename_to_id[d["basename"]] = d["id"]
    edges, seen, ghosts, ghost_ids = [], set(), [], set()

    def add_edge(src, tgt, kind):
        key = (src, tgt, kind)
        if key not in seen:
            seen.add(key)
            edges.append({"source": src, "target": tgt, "kind": kind})

    def add_ghost(label, kind):
        gid = f"__dangling__/{label}"
        if gid not in ghost_ids:
            ghost_ids.add(gid)
            ghosts.append({"id": gid, "title": label, "layer": "dangling",
                           "dangling": True, "out_of_scope": False,
                           "html": "", "search_text": "", "wordcount": 0,
                           "category": "dangling", "type": None, "path": ""})
        return gid

    for d in docs:
        src = d["id"]
        for kind, raw in d.get("raw_links", []):
            if kind == "wikilink":
                if "*" in raw:          # glob 스킵
                    continue
                tgt = basename_to_id.get(raw)
                add_edge(src, tgt or add_ghost(raw, kind), kind)
            else:  # mdlink
                if raw.startswith(("http://", "https://")):
                    continue
                path = unquote(raw.split("#", 1)[0])
                if not path.endswith(".md"):     # 확장자 없음 스킵
                    continue
                resolved = str((Path(d["abspath"]).parent / path).resolve())
                tgt = abspath_to_id.get(resolved)
                add_edge(src, tgt or add_ghost(Path(path).stem, kind), kind)
    return edges, ghosts
```
> SOURCES 밖 실제 파일도 `abspath_to_id`에 없으므로 dangling 처리된다(스펙 §5-2 out_of_scope는 v1에선 dangling과 동일 취급, 라벨만 파일명).

- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): resolver — 링크 해석/dangling/dedup"`

---

### Task 4: Graph builder — 노드+엣지+백링크

**Files:**
- Create: `knowledge-wiki/wiki/graph.py`
- Test: `knowledge-wiki/tests/test_graph.py`

- [ ] **Step 1: 실패 테스트**

```python
from wiki.graph import build_graph

def test_build_graph_nodes_edges_backlinks():
    docs = [
        {"id":"memory/alpha","layer":"memory","basename":"alpha","abspath":"/x/alpha.md",
         "title":"알파","type":"project","html":"<p>a</p>","search_text":"a",
         "raw_links":[("wikilink","beta")]},
        {"id":"memory/beta","layer":"memory","basename":"beta","abspath":"/x/beta.md",
         "title":"베타","type":None,"html":"<p>b</p>","search_text":"b","raw_links":[]},
    ]
    from wiki.resolver import resolve_links
    edges, ghosts = resolve_links(docs)
    g = build_graph(docs, edges, ghosts)
    ids = {n["id"] for n in g["nodes"]}
    assert "memory/alpha" in ids and "memory/beta" in ids
    beta = next(n for n in g["nodes"] if n["id"]=="memory/beta")
    assert "memory/alpha" in beta["backlinks"]           # 백링크
    # type 없는 memory 노드는 파일명 접두어로 category 추론
    assert beta["category"] in ("feedback","project","reference","user","memory")
    assert g["stats"]["nodes"] >= 2 and "dangling" in g["stats"]
```

- [ ] **Step 2: 실패 확인** — FAIL

- [ ] **Step 3: 최소 구현**

```python
_PREFIX = ("feedback", "project", "reference", "user")

def _category(doc):
    if doc.get("type"):
        return doc["type"]
    bn = doc.get("basename", "")
    for p in _PREFIX:
        if bn.startswith(p + "_"):
            return p
    return doc.get("layer", "misc")

def build_graph(docs, edges, ghosts):
    nodes = []
    for d in docs:
        st = d.get("search_text", "")
        nodes.append({
            "id": d["id"], "title": d.get("title") or d["basename"],
            "layer": d["layer"], "category": _category(d), "type": d.get("type"),
            "path": d.get("abspath", ""), "html": d.get("html", ""),
            "search_text": st, "wordcount": len(st.split()),
            "dangling": False, "out_of_scope": False, "backlinks": [],
        })
    nodes.extend(ghosts)
    by_id = {n["id"]: n for n in nodes}
    for e in edges:
        tgt = by_id.get(e["target"])
        if tgt is not None and e["source"] not in tgt["backlinks"]:
            tgt["backlinks"].append(e["source"])
    isolated = sum(1 for n in nodes if not n["backlinks"]
                   and not any(e["source"] == n["id"] for e in edges))
    stats = {"nodes": len(nodes), "edges": len(edges),
             "dangling": len(ghosts), "isolated": isolated}
    return {"nodes": nodes, "edges": edges, "stats": stats}
```

- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): graph — 노드/엣지/백링크/통계"`

---

### Task 5: Renderer — wiki.html (cytoscape 인라인)

**Files:**
- Create: `knowledge-wiki/wiki/render.py`, `knowledge-wiki/templates/wiki.html.tmpl`
- Vendor: `knowledge-wiki/templates/cytoscape.min.js` (다운로드해 저장)

- [ ] **Step 1: cytoscape 벤더링**

```bash
curl -sL https://unpkg.com/cytoscape@3.30.2/dist/cytoscape.min.js \
  -o "knowledge-wiki/templates/cytoscape.min.js"
test -s "knowledge-wiki/templates/cytoscape.min.js" && echo OK
```

- [ ] **Step 2: 템플릿 작성** `wiki.html.tmpl` — 3영역(검색바 / 좌: `#cy` 그래프 / 우: `#page`), 자리표시자: `/*CYTOSCAPE_LIB*/`, `/*GRAPH_DATA*/`. JS: 노드 색=layer, 크기=wordcount, 클릭→우측 `html` 렌더+백링크/나가는링크 목록, 검색→title+search_text 필터 하이라이트, 층 체크박스 필터. (전체 인라인, 외부 요청 0)

- [ ] **Step 3: render 구현**

```python
import json
from pathlib import Path

TPL = Path(__file__).parent.parent / "templates"

def render(graph, out_path):
    lib = (TPL / "cytoscape.min.js").read_text(encoding="utf-8")
    tmpl = (TPL / "wiki.html.tmpl").read_text(encoding="utf-8")
    data = json.dumps(graph, ensure_ascii=False)
    html = tmpl.replace("/*CYTOSCAPE_LIB*/", lib).replace("/*GRAPH_DATA*/", data)
    Path(out_path).write_text(html, encoding="utf-8")
    return out_path
```

- [ ] **Step 4: 스모크 테스트** — 작은 graph dict로 render 호출 → 산출 HTML에 `cytoscape` 문자열과 노드 title 포함 확인

```python
def test_render_smoke(tmp_path):
    from wiki.render import render
    g = {"nodes":[{"id":"a","title":"알파","layer":"memory","html":"<p>x</p>",
                   "backlinks":[],"category":"project","wordcount":1,"search_text":"x"}],
         "edges":[], "stats":{"nodes":1,"edges":0,"dangling":0,"isolated":1}}
    out = render(g, tmp_path / "w.html")
    t = open(out, encoding="utf-8").read()
    assert "cytoscape" in t and "알파" in t
```

- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): renderer — wiki.html + cytoscape 인라인"`

---

### Task 6: Runner + 실제 빌드

**Files:**
- Create: `knowledge-wiki/build_wiki.py`
- Modify: `knowledge-wiki/wiki/sources.py` (실제 5개 경로 확정)

- [ ] **Step 1: sources.py 실제 경로**

```python
from pathlib import Path
HOME = Path.home()
ROOT = Path(__file__).resolve().parents[2]   # claude code 워크스페이스 루트
MEM = HOME / ".claude/projects/-Users-user-Desktop-claude-code/memory"

def sources():
    return [
        ("ontology", ROOT / "company-ontology"),
        ("memory", MEM),
        ("rules", HOME / ".claude/rules"),
        ("docs", ROOT / "docs/superpowers"),
        # CLAUDE.md 20개는 collector가 별도 수집 (아래 build_wiki에서 glob)
    ]
```

- [ ] **Step 2: build_wiki.py**

```python
from pathlib import Path
from wiki.sources import sources, ROOT
from wiki.collector import collect
from wiki.parser import parse
from wiki.resolver import resolve_links
from wiki.graph import build_graph
from wiki.render import render

def main():
    docs = collect(sources())
    # CLAUDE.md 전역 수집
    for p in sorted(ROOT.rglob("CLAUDE.md")):
        if "/.git/" in str(p):
            continue
        docs.append({"id": f"claude/{p.parent.name}", "layer": "claude",
                     "abspath": str(p), "basename": "CLAUDE"})
    # 파싱 병합
    for d in docs:
        try:
            r = parse(Path(d["abspath"]).read_text(encoding="utf-8"))
        except (UnicodeDecodeError, OSError) as e:
            print(f"skip {d['abspath']}: {e}"); r = {"title":d["basename"],"type":None,
                "raw_links":[],"html":"","search_text":""}
        if not r["title"] or r["title"] == "(제목 없음)":
            r["title"] = d["basename"]
        d.update(r)
    edges, ghosts = resolve_links(docs)
    graph = build_graph(docs, edges, ghosts)
    out = render(graph, Path(__file__).parent / "wiki.html")
    s = graph["stats"]
    print(f"노드 {s['nodes']} · 엣지 {s['edges']} · 끊긴링크 {s['dangling']} · 고립 {s['isolated']}")
    print(f"→ {out}\n실행: open '{out}'")

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: 전체 테스트** — `cd knowledge-wiki && python -m pytest -v` → 전부 PASS, 커버리지 확인
- [ ] **Step 4: 실제 빌드 (승인 후 markdown 설치)**

```bash
cd knowledge-wiki && pip install -r requirements.txt && python3 build_wiki.py && open wiki.html
```
Expected: 요약 출력(노드 ~250) + 브라우저에 그래프.

- [ ] **Step 5: Commit** — `git add knowledge-wiki && git commit -m "feat(knowledge-wiki): runner + 실제 빌드 파이프라인 완성"` (wiki.html은 gitignore)

---

## 검증 (완료 판정)

- `python -m pytest` 전부 PASS, 커버리지 80%+.
- 실제 빌드가 노드 ~250개 그래프를 브라우저에 띄움.
- 노드 클릭 → 우측에 내용+백링크, 검색 동작, 층 필터 동작, 끊긴 링크 빨간 노드 확인.
- 별도 서브에이전트가 결과 검증(작업자 자기검증 금지, CLAUDE.md §8).
