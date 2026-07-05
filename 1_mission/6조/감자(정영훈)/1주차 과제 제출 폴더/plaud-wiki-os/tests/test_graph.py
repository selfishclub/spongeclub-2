from wiki.graph import build_graph
from wiki.resolver import resolve_links


def test_build_graph_nodes_edges_backlinks():
    docs = [
        {"id": "memory/alpha", "layer": "memory", "basename": "alpha", "abspath": "/x/alpha.md",
         "title": "알파", "type": "project", "html": "<p>a</p>", "search_text": "a",
         "raw_links": [("wikilink", "beta")]},
        {"id": "memory/beta", "layer": "memory", "basename": "beta", "abspath": "/x/beta.md",
         "title": "베타", "type": None, "html": "<p>b</p>", "search_text": "b", "raw_links": []},
    ]
    edges, ghosts = resolve_links(docs)
    g = build_graph(docs, edges, ghosts)
    ids = {n["id"] for n in g["nodes"]}
    assert "memory/alpha" in ids and "memory/beta" in ids
    beta = next(n for n in g["nodes"] if n["id"] == "memory/beta")
    assert "memory/alpha" in beta["backlinks"]           # 백링크
    # type 없는 memory 노드는 파일명 접두어로 category 추론
    assert beta["category"] in ("feedback", "project", "reference", "user", "memory")
    assert g["stats"]["nodes"] >= 2 and "dangling" in g["stats"]


def test_ghost_node_with_incoming_edge_no_crash():
    # 유령(dangling) 노드가 들어오는 엣지의 타깃일 때 백링크가 채워지고 크래시 없음 (fix #1)
    docs = [
        {"id": "memory/alpha", "layer": "memory", "basename": "alpha", "abspath": "/x/alpha.md",
         "title": "알파", "type": "project", "html": "<p>a</p>", "search_text": "a",
         "raw_links": [("wikilink", "missing_note")]},
    ]
    edges, ghosts = resolve_links(docs)
    g = build_graph(docs, edges, ghosts)
    ghost = next(n for n in g["nodes"] if n["dangling"])
    assert "memory/alpha" in ghost["backlinks"]
    assert g["stats"]["dangling"] == 1
