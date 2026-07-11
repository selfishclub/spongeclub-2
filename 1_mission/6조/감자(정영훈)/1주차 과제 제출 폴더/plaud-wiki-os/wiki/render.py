import json
from pathlib import Path

TPL = Path(__file__).parent.parent / "templates"


def render(graph, out_path):
    lib = (TPL / "cytoscape.min.js").read_text(encoding="utf-8")
    tmpl = (TPL / "wiki.html.tmpl").read_text(encoding="utf-8")
    # fix #3: escape "<" so any </script> inside node html/search_text cannot
    # terminate the inline <script> block.
    data = json.dumps(graph, ensure_ascii=False).replace("<", "\\u003c")
    html = tmpl.replace("/*CYTOSCAPE_LIB*/", lib).replace("/*GRAPH_DATA*/", data)
    Path(out_path).write_text(html, encoding="utf-8")
    return out_path
