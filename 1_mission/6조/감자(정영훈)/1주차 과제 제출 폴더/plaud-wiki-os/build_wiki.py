import os
from pathlib import Path
from wiki.sources import sources, ROOT
from wiki.collector import collect
from wiki.parser import parse
from wiki.resolver import resolve_links
from wiki.graph import build_graph
from wiki.render import render
from wiki.hidden import load_hidden, filter_docs

HERE = Path(__file__).parent


def _load_env():
    """knowledge-wiki/.env 를 os.environ 에 로드 (버킷 분류용 API 키)."""
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
    """parent dir path relative to workspace root, sanitized for a stable id."""
    try:
        rel = parent.resolve().relative_to(root.resolve()).as_posix()
    except ValueError:
        rel = parent.name
    rel = rel or parent.name or "root"
    return rel.replace("/", "_")


def main():
    _load_env()
    docs = collect(sources())
    # 이미 수집된 파일의 resolved abspath 집합 (fix #5: CLAUDE.md 중복 수집 방지)
    collected = {str(Path(d["abspath"]).resolve()) for d in docs}

    # CLAUDE.md 전역 수집 (fix #8: parent 경로 기반 안정 id)
    for p in sorted(ROOT.rglob("CLAUDE.md")):
        sp = str(p)
        if "/.git/" in sp or "/node_modules/" in sp:
            continue
        rp = str(p.resolve())
        if rp in collected:      # fix #5: 이미 다른 층에서 수집됨 → 스킵
            continue
        collected.add(rp)
        docs.append({"id": f"claude/{_rel_slug(p.parent, ROOT)}", "layer": "claude",
                     "abspath": sp, "basename": "CLAUDE"})

    hidden = load_hidden(Path(__file__).parent / "hidden.json")
    docs = filter_docs(docs, hidden)

    # 파싱 병합
    for d in docs:
        try:
            r = parse(Path(d["abspath"]).read_text(encoding="utf-8"))
        except (UnicodeDecodeError, OSError) as e:
            print(f"skip {d['abspath']}: {e}")
            r = {"title": d["basename"], "type": None,
                 "raw_links": [], "html": "", "search_text": ""}
        if not r["title"] or r["title"] == "(제목 없음)":
            r["title"] = d["basename"]
        d.update(r)

    edges, ghosts = resolve_links(docs)
    graph = build_graph(docs, edges, ghosts)
    try:
        from wiki.classify import assign_buckets
        assign_buckets(graph["nodes"])     # 캐시 사용 → 최초 이후 저렴
    except Exception as e:
        print(f"⚠️  버킷 분류 실패 ({e!r}) — layer 폴백으로 계속합니다.")
    out = render(graph, Path(__file__).parent / "wiki.html")
    s = graph["stats"]
    print(f"노드 {s['nodes']} · 엣지 {s['edges']} · 끊긴링크 {s['dangling']} · 고립 {s['isolated']}")
    print(f"→ {out}\n실행: open '{out}'")


if __name__ == "__main__":
    main()
