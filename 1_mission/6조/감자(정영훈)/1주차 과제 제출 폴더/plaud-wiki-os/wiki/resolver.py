import re
from pathlib import Path
from urllib.parse import unquote, quote

# 렌더된 본문에서 여는 <a> 태그의 href 만 잡는다 (markdown 은 href 를 첫 속성으로 출력).
_HREF = re.compile(r'<a href="([^"]*)"')


def _internal_md_key(doc_abspath, raw):
    """본문 mdlink href → 대상 파일의 resolved abspath 문자열. 외부/앵커/비-.md 는 None."""
    if raw.startswith(("http://", "https://", "mailto:", "#")):
        return None
    path = unquote(raw.split("#", 1)[0])
    if not path.endswith(".md"):
        return None
    return str((Path(doc_abspath).parent / path).resolve())


def _dangling_stem(raw):
    """dangling ghost 라벨 = 링크 경로의 파일명(확장자·앵커 제거). resolve_links·본문 재작성 공용."""
    return Path(unquote(raw.split("#", 1)[0])).stem


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
                           "category": "dangling", "type": None, "path": "",
                           "backlinks": [], "bucket": "dangling"})
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
                key = _internal_md_key(d["abspath"], raw)
                if key is None:              # 외부 URL·앵커·확장자 없음 스킵
                    continue
                tgt = abspath_to_id.get(key)
                add_edge(src, tgt or add_ghost(_dangling_stem(raw), kind), kind)

    # 본문 인라인 링크를 SPA 내부 이동(data-goto)으로 재배선.
    # 렌더된 <a href="X.md"> 는 클릭 시 실제 URL 로 이동해 서버 404("not found") 를 냈다.
    # edge/ghost 와 동일한 abspath_to_id·add_ghost 를 재사용해 대상 노드 id 로 치환한다.
    for d in docs:
        html = d.get("html", "")
        if "<a href=" not in html:
            continue

        def _repl(m, _abspath=d["abspath"]):
            raw = m.group(1)
            if raw.startswith(("http://", "https://")):   # 외부 → 새 탭, referrer 차단
                return f'<a href="{raw}" target="_blank" rel="noopener noreferrer"'
            key = _internal_md_key(_abspath, raw)
            if key is None:                                # 앵커/비-md → 원본 유지
                return m.group(0)
            tgt = abspath_to_id.get(key) or add_ghost(_dangling_stem(raw), "mdlink")
            return f'<a data-goto="{quote(tgt, safe="")}"'   # href 제거 → 브라우저 이동 안 함

        d["html"] = _HREF.sub(_repl, html)
    return edges, ghosts
