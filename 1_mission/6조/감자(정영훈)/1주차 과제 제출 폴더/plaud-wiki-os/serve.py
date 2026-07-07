"""로컬 전용 챗 서버 (127.0.0.1). wiki.html 서빙 + POST /ask.

시작 시 파이프라인으로 그래프를 메모리에 적재하고, 질문마다
키워드 검색 top-K → Claude Sonnet 발췌 정리 → {answer_html, sources} 반환.

- 127.0.0.1 에만 바인딩 (네트워크 노출 없음).
- 정적 서빙은 화이트리스트 경로(/ , /wiki.html)만 — 경로 탐색 차단.
- API 키는 ANTHROPIC_API_KEY 환경변수에서만 읽음 (/ask 호출 시점에만 필요).
"""
import json
import os
import re
import sys
import threading
import traceback
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import build_wiki
from wiki.sources import sources, ROOT
from wiki.collector import collect
from wiki.parser import parse
from wiki.resolver import resolve_links
from wiki.graph import build_graph
from wiki.retrieve import search
from wiki.answer import answer as make_answer
from wiki.hidden import load_hidden, add_hidden, filter_docs

HERE = Path(__file__).parent
HOST, PORT = "127.0.0.1", 8787
MAX_Q = 2000
TOP_K = 8
MAX_BODY = 64 * 1024                       # 요청 본문 상한 (메모리 고갈 방지)
ALLOWED_HOSTS = {f"{HOST}:{PORT}", f"localhost:{PORT}"}   # DNS 리바인딩 차단
# 거래처 데이터 든 페이지 → 외부 이미지/fetch 전면 차단 (프롬프트 인젝션 비콘 백스톱)
CSP = ("default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
       "img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'")
# slug/id 입력 검증: 단어문자·점·슬래시(고유id 구분자)·하이픈·한글·공백만 허용, 200자 상한
_SLUG_RE = re.compile(r'^[\w./\- 가-힣]+$')
_NODES = []   # 메모리 적재된 노드
_EMBED_INDEX = None   # 임베딩 인덱스 (None 이면 키워드 검색으로 폴백)
_CLEANUP_LOCK = threading.Lock()   # hide-node/delete-recording(+재빌드) 직렬화


def _load_env():
    """knowledge-wiki/.env 를 os.environ 에 로드 (있으면). anthropic SDK 가 키를 읽도록."""
    envf = HERE / ".env"
    if not envf.exists():
        return
    for line in envf.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _rel_slug(parent, root):
    """parent 디렉터리를 워크스페이스 루트 기준 안정 id 로 변환."""
    try:
        rel = parent.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        rel = parent.name
    rel = rel or parent.name or "root"
    return rel.replace("/", "_")


def _load_graph():
    """build_wiki.py 와 동일 파이프라인으로 노드 목록을 만들어 반환."""
    docs = collect(sources())
    collected = {str(Path(d["abspath"]).resolve()) for d in docs}

    # CLAUDE.md 전역 수집 (build_wiki 와 동일 규칙)
    for p in sorted(ROOT.rglob("CLAUDE.md")):
        sp = str(p)
        if "/.git/" in sp or "/node_modules/" in sp:
            continue
        rp = str(p.resolve())
        if rp in collected:
            continue
        collected.add(rp)
        docs.append({"id": f"claude/{_rel_slug(p.parent, ROOT)}", "layer": "claude",
                     "abspath": sp, "basename": "CLAUDE"})

    hidden = load_hidden(HERE / "hidden.json")
    docs = filter_docs(docs, hidden)

    for d in docs:
        try:
            r = parse(Path(d["abspath"]).read_text(encoding="utf-8"))
        except (UnicodeDecodeError, OSError):
            r = {"title": d["basename"], "type": None,
                 "raw_links": [], "html": "", "search_text": ""}
        if not r.get("title") or r["title"] == "(제목 없음)":
            r["title"] = d["basename"]
        d.update(r)

    edges, ghosts = resolve_links(docs)
    nodes = build_graph(docs, edges, ghosts)["nodes"]
    try:
        from wiki.classify import assign_buckets
        assign_buckets(nodes)          # 캐시 사용 → 최초 이후 저렴
    except Exception as e:             # 분류 실패해도 그래프는 계속 동작
        print(f"⚠️  버킷 분류 실패 ({e!r}) — layer 폴백으로 계속합니다.")
    return nodes


def _valid_slug(value) -> bool:
    """slug/id 형식 검증: 문자열, 200자 이하, 허용 문자만, 상위 경로 탈출(..) 금지."""
    return (isinstance(value, str) and 0 < len(value) <= 200
            and ".." not in value and bool(_SLUG_RE.fullmatch(value)))


def delete_recording_file(recordings_dir, slug: str) -> bool:
    """recordings/ 내부의 md 파일만 삭제. 경로 탈출 차단."""
    base = Path(recordings_dir).resolve()
    target = (base / f"{slug}.md").resolve()
    if target.parent != base or not target.exists():
        return False
    target.unlink()
    return True


def _build_embed_index(nodes):
    """로컬 임베딩 인덱스 구축. 실패하면 None 반환 → 키워드 검색으로 폴백.

    fastembed import·모델 다운로드가 실패해도 서버는 계속 동작해야 한다.
    """
    try:
        from wiki.embed import build_index, MODEL_NAME
        print(f"임베딩 인덱스 구축 중 (로컬 모델 {MODEL_NAME})...")
        idx = build_index(nodes)
        print(f"임베딩 인덱스 준비 완료 ({len(idx.ids)}개 벡터). 시맨틱 검색 사용.")
        return idx
    except Exception as e:
        print(f"⚠️  임베딩 사용 불가 ({e!r}) — 키워드 검색으로 폴백합니다.")
        return None


def _rebuild_and_reload() -> bool:
    """hidden.json/recordings 변경 직후 wiki.html 재생성 + 메모리 캐시(_NODES/_EMBED_INDEX) 재적재.

    실패해도 이미 반영된 파일 변경(hidden.json 추가, 녹음 삭제) 자체는 유효하므로
    예외를 삼키고 False 를 반환한다 — 호출자는 이를 "재빌드만 실패"로 처리한다.
    """
    global _NODES, _EMBED_INDEX
    try:
        build_wiki.main()
        _NODES = _load_graph()
        _EMBED_INDEX = _build_embed_index(_NODES)
        return True
    except Exception:
        traceback.print_exc(file=sys.stderr)
        return False


class H(BaseHTTPRequestHandler):
    def _send(self, code, body, ctype="application/json; charset=utf-8", extra=None):
        b = body.encode("utf-8") if isinstance(body, str) else body
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        try:
            self.wfile.write(b)
        except (BrokenPipeError, ConnectionResetError):
            pass   # 클라이언트가 로딩 취소/연결 종료 — 무해

    def _bad_host(self):
        if self.headers.get("Host", "") not in ALLOWED_HOSTS:
            self._send(400, "bad host", "text/plain; charset=utf-8")
            return True
        return False

    def do_GET(self):
        if self._bad_host():
            return
        if self.path in ("/", "/wiki.html"):
            f = HERE / "wiki.html"
            if not f.exists():
                return self._send(404, "wiki.html 없음. 먼저 python3 build_wiki.py 실행",
                                  "text/plain; charset=utf-8")
            return self._send(200, f.read_bytes(), "text/html; charset=utf-8",
                              extra={"Content-Security-Policy": CSP})
        self._send(404, "not found", "text/plain; charset=utf-8")

    def _read_json_body(self):
        n = min(int(self.headers.get("Content-Length", 0) or 0), MAX_BODY)
        return json.loads(self.rfile.read(n) or b"{}")

    def _read_slug(self, data):
        """body 의 slug(또는 노드 고유 id) 를 검증. 부적합하면 400 응답 후 None 반환."""
        slug = data.get("slug")
        if not isinstance(slug, str) or not slug.strip():
            self._send(400, json.dumps({"error": "slug가 필요합니다"}, ensure_ascii=False))
            return None
        if not _valid_slug(slug):
            self._send(400, json.dumps({"error": "잘못된 slug 형식입니다"}, ensure_ascii=False))
            return None
        return slug

    def do_POST(self):
        if self._bad_host():
            return
        routes = {"/ask": self._handle_ask,
                  "/delete-recording": self._handle_delete_recording,
                  "/hide-node": self._handle_hide_node}
        handler = routes.get(self.path)
        if handler is None:
            return self._send(404, "not found", "text/plain; charset=utf-8")
        handler()

    def _handle_ask(self):
        try:
            data = self._read_json_body()
            q = str(data.get("question", ""))[:MAX_Q].strip()
            if not q:
                return self._send(400, json.dumps({"error": "질문이 비었습니다"},
                                                  ensure_ascii=False))
            if _EMBED_INDEX is not None:
                from wiki.embed import semantic_search
                hits = semantic_search(q, _EMBED_INDEX, _NODES, k=TOP_K)
            else:
                hits = search(q, _NODES, k=TOP_K)
            out = make_answer(q, hits)
            self._send(200, json.dumps(out, ensure_ascii=False))
        except Exception:
            traceback.print_exc(file=sys.stderr)   # 상세는 서버 로그로만
            self._send(500, json.dumps({"error": "서버 오류가 발생했습니다"},
                                       ensure_ascii=False))

    def _handle_delete_recording(self):
        try:
            slug = self._read_slug(self._read_json_body())
            if slug is None:
                return
            with _CLEANUP_LOCK:
                ok = delete_recording_file(HERE / "recordings", slug)
                rebuilt = _rebuild_and_reload() if ok else False
            self._send(200, json.dumps({"ok": ok, "rebuilt": rebuilt}, ensure_ascii=False))
        except Exception:
            traceback.print_exc(file=sys.stderr)
            self._send(500, json.dumps({"error": "서버 오류가 발생했습니다"},
                                       ensure_ascii=False))

    def _handle_hide_node(self):
        try:
            node_id = self._read_slug(self._read_json_body())
            if node_id is None:
                return
            with _CLEANUP_LOCK:
                add_hidden(HERE / "hidden.json", node_id)
                rebuilt = _rebuild_and_reload()
            self._send(200, json.dumps({"ok": True, "rebuilt": rebuilt}, ensure_ascii=False))
        except Exception:
            traceback.print_exc(file=sys.stderr)
            self._send(500, json.dumps({"error": "서버 오류가 발생했습니다"},
                                       ensure_ascii=False))

    def log_message(self, *a):
        pass


def main():
    global _NODES, _EMBED_INDEX
    _load_env()
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("⚠️  ANTHROPIC_API_KEY 없음 — 그래프·검색은 되지만 챗 답변은 실패합니다.")
        print("   knowledge-wiki/.env 에 ANTHROPIC_API_KEY=... 를 넣으세요.")
    print("그래프 메모리 적재 중...")
    _NODES = _load_graph()
    _EMBED_INDEX = _build_embed_index(_NODES)
    print(f"노드 {len(_NODES)}개 적재. http://{HOST}:{PORT} 열기")
    if not os.environ.get("WIKI_NO_OPEN"):   # launchd 상시가동 시 브라우저 팝업 억제
        webbrowser.open(f"http://{HOST}:{PORT}")
    ThreadingHTTPServer((HOST, PORT), H).serve_forever()


if __name__ == "__main__":
    main()
