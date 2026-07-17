from wiki.graph import short_title, build_graph


def test_short_title_truncates_long():
    assert short_title("아주아주아주아주 긴 노드 제목입니다") == "아주아주아주아주 긴 노…"
    assert short_title("짧은 제목") == "짧은 제목"


def test_build_graph_nodes_have_short_title():
    docs = [
        {"id": "memory/alpha", "layer": "memory", "basename": "alpha", "abspath": "/x/alpha.md",
         "title": "아주아주아주아주 긴 노드 제목입니다", "type": "project", "html": "<p>a</p>",
         "search_text": "a", "raw_links": []},
    ]
    g = build_graph(docs, [], [])
    alpha = next(n for n in g["nodes"] if n["id"] == "memory/alpha")
    assert alpha["short_title"] == "아주아주아주아주 긴 노…"
