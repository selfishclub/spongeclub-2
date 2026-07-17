# 지식 위키 — 대화형 챗(RAG) 확장 Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** 브라우저 위키 옆에 챗창을 붙여, 자연어로 물으면 형 지식 베이스에서 관련 문서를 찾아 Claude(Sonnet)가 정리해 답하고, **답변의 출처 노드를 그래프에 하이라이트**한다.

**Architecture:** 정적 `wiki.html`은 그대로. 새로 **로컬 서버**(`serve.py`, stdlib, 127.0.0.1)가 (1) wiki.html 서빙 (2) `POST /ask` 처리 — 시작 시 파이프라인으로 그래프를 메모리에 올려두고, 질문마다 키워드 검색 top-K → Claude Sonnet에 발췌 전달 → 답변+출처 반환. 브라우저 챗 패널이 `/ask`를 fetch.

**Tech Stack:** Python stdlib(`http.server`), `anthropic` SDK 0.88(설치됨), `markdown`(설치됨). 새 의존성 0.

**전제:** `ANTHROPIC_API_KEY` 환경변수 필요(API 콘솔 키, 사용량 과금). 모델 `claude-sonnet-4-6`.

**기존 스펙/계획:** `2026-07-05-knowledge-wiki-design.md`, `2026-07-05-knowledge-wiki.md`.

---

## 프라이버시·보안 (필수)

- 서버는 **127.0.0.1에만 바인딩**(0.0.0.0 금지) — 네트워크 노출 안 함.
- API 키는 **환경변수에서만** 읽음. HTML·로그·응답에 절대 안 실림.
- 정적 서빙은 **화이트리스트 경로만**(`/`, `/wiki.html`) — 경로 탐색 차단.
- `POST /ask`: JSON 검증, 질문 길이 캡(2000자), top-K 캡.
- 챗은 거래처 민감정보 발췌를 Sonnet에 전송(사용자 승인 완료). 답변·발췌 파일 캐시 남기면 gitignore.

---

## 파일 구조 (추가/수정)

```
knowledge-wiki/
├── serve.py              # [신규] 로컬 서버: wiki.html 서빙 + POST /ask
├── wiki/
│   ├── retrieve.py       # [신규] 키워드 검색 top-K (BM25-lite)
│   └── answer.py         # [신규] 발췌→프롬프트→Sonnet 호출→{answer, sources}
├── templates/wiki.html.tmpl   # [수정] 챗 패널 + /ask fetch + 출처 하이라이트
└── tests/
    ├── test_retrieve.py  # [신규]
    └── test_answer.py    # [신규] (LLM 호출은 monkeypatch로 목킹)
```

---

### Task 1: retrieve.py — 키워드 검색 top-K

**Files:** Create `wiki/retrieve.py`, `tests/test_retrieve.py`

- [ ] **Step 1: 실패 테스트**

```python
from wiki.retrieve import search

def _nodes():
    return [
        {"id":"a","title":"가격 정책","layer":"ontology","search_text":"gbp 언어당 50만원 구글애즈 마크업","dangling":False},
        {"id":"b","title":"광고 운영","layer":"ontology","search_text":"메타 광고 인스타 릴스 리드","dangling":False},
        {"id":"c","title":"빈 유령","layer":"dangling","search_text":"","dangling":True},
    ]

def test_search_ranks_relevant_first():
    hits = search("가격 정책 정리", _nodes(), k=2)
    assert hits[0]["id"] == "a"
    assert all(h["id"] != "c" for h in hits)   # dangling/빈 노드 제외

def test_search_korean_substring():
    hits = search("마크업", _nodes(), k=3)
    assert hits and hits[0]["id"] == "a"
```

- [ ] **Step 2: 실패 확인** — `cd knowledge-wiki && python3 -m pytest tests/test_retrieve.py -v`

- [ ] **Step 3: 구현** — 한국어는 공백 토큰화가 부실하므로 **질문 토큰의 부분문자열 매칭 + 제목 부스트 + idf 가중**을 섞은 BM25-lite. dangling·빈 search_text 제외.

```python
import math, re
_TOK = re.compile(r"[0-9A-Za-z가-힣]+")

def _tokens(s):
    return _TOK.findall((s or "").lower())

def search(query, nodes, k=8):
    cand = [n for n in nodes if not n.get("dangling") and n.get("search_text")]
    if not cand:
        return []
    q = [t for t in _tokens(query) if len(t) >= 2]
    if not q:
        q = _tokens(query)
    N = len(cand)
    # df: 후보 중 해당 토큰을 부분문자열로 포함하는 문서 수
    df = {t: sum(1 for n in cand if t in n["search_text"] or t in n["title"].lower()) for t in set(q)}
    def score(n):
        st, ti = n["search_text"], n["title"].lower()
        s = 0.0
        for t in q:
            tf = st.count(t) + 3 * ti.count(t)          # 제목 부스트
            if tf:
                idf = math.log(1 + N / (1 + df.get(t, 0)))
                s += idf * tf / (tf + 1.5)               # 포화
        return s
    ranked = sorted(cand, key=score, reverse=True)
    return [n for n in ranked if score(n) > 0][:k]
```

- [ ] **Step 4: 통과 확인** — PASS
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): retrieve — 키워드 검색 top-K"`

---

### Task 2: answer.py — 발췌→Sonnet→{answer, sources}

**Files:** Create `wiki/answer.py`, `tests/test_answer.py`

- [ ] **Step 1: 실패 테스트** (LLM 호출은 목킹, 프롬프트 조립·소스 매핑만 검증)

```python
from wiki import answer as A

def test_build_prompt_includes_excerpts():
    hits = [{"id":"a","title":"가격","layer":"ontology","search_text":"gbp 50만"},
            {"id":"b","title":"광고","layer":"ontology","search_text":"메타 광고"}]
    msgs = A.build_messages("가격 정리해줘", hits)
    body = msgs["user"]
    assert "가격" in body and "광고" in body and "[1]" in body and "[2]" in body

def test_answer_maps_sources(monkeypatch):
    hits = [{"id":"a","title":"가격","layer":"ontology","search_text":"gbp 50만"}]
    monkeypatch.setattr(A, "_call_llm", lambda system, user: "정리: [1] 참고")
    out = A.answer("가격?", hits)
    assert "정리" in out["answer_html"]
    assert out["sources"][0]["id"] == "a"
```

- [ ] **Step 2: 실패 확인**

- [ ] **Step 3: 구현**

```python
import os, html
import markdown as _md

MODEL = "claude-sonnet-4-6"
SYSTEM = ("너는 대표의 개인 지식 베이스 위에서 답하는 한국어 어시스턴트다. "
          "아래 제공된 발췌만 근거로 정리해 답하라. 발췌에 없는 내용은 지어내지 말고 "
          "'해당 내용은 지식 베이스에 없음'이라 말하라. 근거로 쓴 항목은 [번호]로 인용하라. "
          "거래처 기밀을 존중하고 간결한 한국어로 답하라.")

def build_messages(question, hits):
    lines = []
    for i, h in enumerate(hits, 1):
        excerpt = (h.get("search_text") or "")[:1500]
        lines.append(f"[{i}] {h['title']} ({h['layer']}): {excerpt}")
    user = f"질문: {question}\n\n=== 발췌 ===\n" + "\n\n".join(lines)
    return {"system": SYSTEM, "user": user}

def _call_llm(system, user):
    import anthropic
    client = anthropic.Anthropic()          # ANTHROPIC_API_KEY 환경변수 사용
    resp = client.messages.create(
        model=MODEL, max_tokens=1500,
        system=system, messages=[{"role": "user", "content": user}])
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")

def answer(question, hits):
    if not hits:
        return {"answer_html": "<p>관련 지식을 찾지 못했습니다.</p>", "sources": []}
    m = build_messages(question, hits)
    text = _call_llm(m["system"], m["user"])
    answer_html = _md.markdown(text.replace("<script", "&lt;script"), extensions=["extra"])
    sources = [{"id": h["id"], "title": h["title"]} for h in hits]
    return {"answer_html": answer_html, "sources": sources}
```

- [ ] **Step 4: 통과 확인** — PASS (목킹이라 API 키 불필요)
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): answer — 발췌→Sonnet→답변/출처"`

---

### Task 3: serve.py — 로컬 서버

**Files:** Create `serve.py`

- [ ] **Step 1: 구현** — stdlib ThreadingHTTPServer, 127.0.0.1. 시작 시 파이프라인으로 그래프 메모리 적재. `GET /` → wiki.html, `POST /ask` → retrieve+answer.

```python
import json, webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from wiki.sources import sources, ROOT
from wiki.collector import collect
from wiki.parser import parse
from wiki.resolver import resolve_links
from wiki.graph import build_graph
from wiki.retrieve import search
from wiki.answer import answer as make_answer

HERE = Path(__file__).parent
HOST, PORT = "127.0.0.1", 8787
_NODES = []   # 메모리 적재된 노드

def _load_graph():
    docs = collect(sources())
    seen = {str(Path(d["abspath"]).resolve()) for d in docs}
    for p in sorted(ROOT.rglob("CLAUDE.md")):
        if "/.git/" in str(p) or str(p.resolve()) in seen:
            continue
        docs.append({"id": f"claude/{p.parent.name}", "layer": "claude",
                     "abspath": str(p), "basename": "CLAUDE"})
    for d in docs:
        try:
            r = parse(Path(d["abspath"]).read_text(encoding="utf-8"))
        except (UnicodeDecodeError, OSError):
            r = {"title": d["basename"], "type": None, "raw_links": [], "html": "", "search_text": ""}
        if not r.get("title") or r["title"] == "(제목 없음)":
            r["title"] = d["basename"]
        d.update(r)
    edges, ghosts = resolve_links(docs)
    return build_graph(docs, edges, ghosts)["nodes"]

class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json"):
        b = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        if self.path in ("/", "/wiki.html"):
            f = HERE / "wiki.html"
            if not f.exists():
                return self._send(404, "wiki.html 없음. 먼저 python3 build_wiki.py 실행", "text/plain; charset=utf-8")
            return self._send(200, f.read_bytes(), "text/html; charset=utf-8")
        self._send(404, "not found", "text/plain")

    def do_POST(self):
        if self.path != "/ask":
            return self._send(404, "not found", "text/plain")
        try:
            n = int(self.headers.get("Content-Length", 0))
            data = json.loads(self.rfile.read(n) or b"{}")
            q = str(data.get("question", ""))[:2000].strip()
            if not q:
                return self._send(400, json.dumps({"error": "질문이 비었습니다"}))
            hits = search(q, _NODES, k=8)
            out = make_answer(q, hits)
            self._send(200, json.dumps(out, ensure_ascii=False))
        except Exception as e:
            self._send(500, json.dumps({"error": f"{type(e).__name__}: {e}"}, ensure_ascii=False))

    def log_message(self, *a):
        pass

def main():
    global _NODES
    print("그래프 메모리 적재 중...")
    _NODES = _load_graph()
    print(f"노드 {len(_NODES)}개 적재. http://{HOST}:{PORT} 열기")
    webbrowser.open(f"http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 스모크 테스트** — 서버 없이 `_load_graph()`만 호출해 노드>200 확인(별도 test 또는 수동). LLM·서버 통합은 Task 5 실측.
- [ ] **Step 3: Commit** — `git commit -m "feat(knowledge-wiki): serve — 로컬 챗 서버(127.0.0.1)"`

---

### Task 4: 챗 패널 UI (템플릿 수정)

**Files:** Modify `templates/wiki.html.tmpl`

- [ ] **Step 1: 우측 페이지 하단(또는 별도 탭)에 챗 패널 추가** — 입력창 + 전송 버튼 + 답변 영역 + "출처" 목록.
- [ ] **Step 2: JS** — 전송 시 `fetch("/ask", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({question})})`. 응답의 `answer_html`을 답변 영역에 삽입, `sources[]`를 클릭 가능한 칩으로. 칩 클릭 → 기존 `cy` 핸들로 해당 노드 하이라이트 + 페이지 열기(기존 노드클릭 로직 재사용). 로딩 스피너, 에러 표시.
- [ ] **Step 3: file:// 안내** — `location.protocol === "file:"`이면 챗 입력 비활성화 + "서버로 열어야 챗 작동: python3 serve.py" 안내.
- [ ] **Step 4: 재빌드로 반영** — `python3 build_wiki.py` (템플릿 변경분이 wiki.html에 들어감).
- [ ] **Step 5: Commit** — `git commit -m "feat(knowledge-wiki): 챗 패널 UI + 출처 그래프 하이라이트"`

---

### Task 5: 실측 통합 (API 키 설정 후)

- [ ] **Step 1: 전체 테스트** — `python3 -m pytest -v` 전부 PASS
- [ ] **Step 2: API 키 설정** — `.env` 또는 셸에 `ANTHROPIC_API_KEY` (사용자 승인 후, env 자동 open)
- [ ] **Step 3: 서버 기동** — `python3 serve.py` → 브라우저 자동 오픈
- [ ] **Step 4: 실제 질문 검증** — 예: "우리 가격 정책 정리해줘" → 답변 + 출처 노드 하이라이트 확인. "GBP 순위 측정 어떻게?" 등 2~3개.
- [ ] **Step 5: Commit** — 문서/런북 갱신

---

## 검증 (완료 판정)

- pytest 전부 PASS(목킹으로 LLM 제외).
- 서버 기동 → 브라우저 챗에 질문 → 근거 있는 한국어 답변 + 출처 노드 하이라이트.
- **보안 검증(security-reviewer):** 127.0.0.1 바인딩, 경로 탐색 차단, 키 미노출, 입력 캡.
- 별도 서브에이전트가 브라우저로 실동작 검증(자기검증 금지).
