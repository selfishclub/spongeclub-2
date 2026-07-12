from pathlib import Path
from wiki.collector import collect


def test_collect_walks_whitelist():
    root = Path(__file__).parent.parent / "fixtures"
    src = [("memory", root / "memory"), ("ontology", root / "ontology")]
    docs = collect(src)
    ids = {d["id"] for d in docs}
    assert "memory/alpha" in ids
    assert "ontology/pricing" in ids
    assert all("layer" in d and "abspath" in d for d in docs)
