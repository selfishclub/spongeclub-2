def test_render_smoke(tmp_path):
    from wiki.render import render
    g = {"nodes": [{"id": "a", "title": "알파", "layer": "memory", "html": "<p>x</p>",
                    "backlinks": [], "category": "project", "wordcount": 1, "search_text": "x"}],
         "edges": [], "stats": {"nodes": 1, "edges": 0, "dangling": 0, "isolated": 1}}
    out = render(g, tmp_path / "w.html")
    t = open(out, encoding="utf-8").read()
    assert "cytoscape" in t and "알파" in t


def test_render_escapes_script_in_data(tmp_path):
    from wiki.render import render
    g = {"nodes": [{"id": "a", "title": "t", "layer": "memory",
                    "html": "<p></script><script>bad()</script></p>",
                    "backlinks": [], "category": "x", "wordcount": 1, "search_text": "y"}],
         "edges": [], "stats": {"nodes": 1, "edges": 0, "dangling": 0, "isolated": 1}}
    out = render(g, tmp_path / "w.html")
    t = open(out, encoding="utf-8").read()
    # the injected data must not contain a raw </script that could break out
    assert "</script>bad" not in t
    assert "\\u003c/script>bad" in t or "\\u003c/script>" in t
