from wiki.resolver import resolve_links


def _docs():
    return [
        {"id": "memory/alpha", "layer": "memory", "basename": "alpha",
         "abspath": "/k/fixtures/memory/alpha.md",
         "raw_links": [("wikilink", "beta"), ("wikilink", "missing_note")]},
        {"id": "memory/beta", "layer": "memory", "basename": "beta",
         "abspath": "/k/fixtures/memory/beta.md", "raw_links": [("wikilink", "alpha")]},
        {"id": "ontology/pricing", "layer": "ontology", "basename": "pricing",
         "abspath": "/k/fixtures/ontology/pricing.md",
         "raw_links": [("mdlink", "../memory/beta.md"), ("mdlink", "../memory/alpha.md#x"),
                       ("mdlink", "https://example.com"), ("mdlink", "nope.md")]},
    ]


def test_wikilink_and_mdlink_and_dangling():
    edges, ghosts = resolve_links(_docs())
    E = {(e["source"], e["target"], e["kind"]) for e in edges}
    assert ("memory/alpha", "memory/beta", "wikilink") in E
    assert ("ontology/pricing", "memory/beta", "mdlink") in E      # 상대경로
    assert ("ontology/pricing", "memory/alpha", "mdlink") in E     # 앵커 제거
    # 외부 URL은 엣지 아님
    assert not any(e["target"].startswith("http") for e in edges)
    # dangling: missing_note 유령 노드 생성
    assert any(g["dangling"] and "missing_note" in g["id"] for g in ghosts)
    # 유령 노드는 backlinks 키를 반드시 가진다 (fix #1)
    assert all("backlinks" in g for g in ghosts)


def test_edge_dedup():
    d = [{"id": "memory/a", "layer": "memory", "basename": "a", "abspath": "/x/a.md",
          "raw_links": [("wikilink", "b"), ("wikilink", "b")]},
         {"id": "memory/b", "layer": "memory", "basename": "b", "abspath": "/x/b.md",
          "raw_links": []}]
    edges, _ = resolve_links(d)
    assert len(edges) == 1
