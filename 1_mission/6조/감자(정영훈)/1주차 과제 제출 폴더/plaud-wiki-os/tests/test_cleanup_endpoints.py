import serve
from serve import _valid_slug, delete_recording_file


def test_delete_existing_recording(tmp_path):
    f = tmp_path / "2026-07-05-회의-abc12345.md"
    f.write_text("x")
    assert delete_recording_file(tmp_path, "2026-07-05-회의-abc12345") is True
    assert not f.exists()


def test_delete_rejects_path_escape(tmp_path):
    (tmp_path.parent / "victim.md").write_text("x")
    assert delete_recording_file(tmp_path, "../victim") is False
    assert (tmp_path.parent / "victim.md").exists()


def test_delete_missing_returns_false(tmp_path):
    assert delete_recording_file(tmp_path, "없는파일") is False


# ---- _valid_slug (slug/id 입력 검증) ----

def test_valid_slug_accepts_id_with_slash():
    assert _valid_slug("claude/gbp-dashboard") is True


def test_valid_slug_accepts_recording_slug_with_korean_and_hyphen():
    assert _valid_slug("2026-07-05-회의-abc12345") is True


def test_valid_slug_rejects_path_traversal():
    assert _valid_slug("../etc/passwd") is False


def test_valid_slug_rejects_too_long():
    assert _valid_slug("a" * 201) is False


def test_valid_slug_rejects_disallowed_chars():
    assert _valid_slug("id; rm -rf /") is False


def test_valid_slug_rejects_empty_or_non_string():
    assert _valid_slug("") is False
    assert _valid_slug(None) is False
    assert _valid_slug(123) is False


# ---- _rebuild_and_reload (성공/실패 시 캐시 재적재) ----

def test_rebuild_and_reload_success_updates_cache(monkeypatch):
    calls = []
    monkeypatch.setattr(serve.build_wiki, "main", lambda: calls.append("built"))
    monkeypatch.setattr(serve, "_load_graph", lambda: ["node-1"])
    monkeypatch.setattr(serve, "_build_embed_index", lambda nodes: "idx-for-" + nodes[0])
    try:
        ok = serve._rebuild_and_reload()
        assert ok is True
        assert calls == ["built"]
        assert serve._NODES == ["node-1"]
        assert serve._EMBED_INDEX == "idx-for-node-1"
    finally:
        serve._NODES = []
        serve._EMBED_INDEX = None


def test_rebuild_and_reload_failure_returns_false_without_raising(monkeypatch):
    def boom():
        raise RuntimeError("rebuild broke")
    monkeypatch.setattr(serve.build_wiki, "main", boom)
    assert serve._rebuild_and_reload() is False
