_PREFIX = ("feedback", "project", "reference", "user")


def short_title(title: str, limit: int = 12) -> str:
    t = (title or "").strip()
    return t if len(t) <= limit else t[:limit].rstrip() + "…"


def _category(doc):
    if doc.get("type"):
        return doc["type"]
    layer = doc.get("layer", "misc")
    path = (doc.get("abspath", "") or doc.get("path", "")).replace("\\", "/")
    if layer == "rules":
        return "common" if "/common/" in path else "language"
    if layer == "docs":
        return "plans" if "/plans/" in path else "specs"
    if layer == "claude":
        return "constitution"
    bn = doc.get("basename", "")
    for p in _PREFIX:
        if bn.startswith(p + "_"):
            return p
    return layer


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
            "bucket": "그외",   # assign_buckets 가 내용 기반으로 덮어씀 (기본 폴백)
        })
    nodes.extend(ghosts)
    for n in nodes:
        n["short_title"] = short_title(n.get("title") or n["id"])
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
