import json
from wiki.hidden import load_hidden, add_hidden, filter_docs


def test_load_missing_returns_empty(tmp_path):
    assert load_hidden(tmp_path / "hidden.json") == set()


def test_add_and_load_roundtrip(tmp_path):
    p = tmp_path / "hidden.json"
    add_hidden(p, "project_x")
    add_hidden(p, "project_y")
    add_hidden(p, "project_x")          # 중복 무시
    assert load_hidden(p) == {"project_x", "project_y"}


def test_filter_docs_removes_hidden():
    docs = [{"id": "layer/a", "basename": "a"}, {"id": "layer/b", "basename": "b"}]
    assert filter_docs(docs, {"layer/b"}) == [{"id": "layer/a", "basename": "a"}]


def test_filter_docs_same_basename_different_id_only_target_removed():
    docs = [{"id": "claude/root", "basename": "CLAUDE"},
            {"id": "claude/gbp-dashboard", "basename": "CLAUDE"}]
    out = filter_docs(docs, {"claude/gbp-dashboard"})
    assert out == [{"id": "claude/root", "basename": "CLAUDE"}]
