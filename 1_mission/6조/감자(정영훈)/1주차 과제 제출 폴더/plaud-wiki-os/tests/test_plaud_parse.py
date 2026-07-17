import json
from pathlib import Path

from wiki.plaud_types import Recording
from wiki.plaud_ingest import parse_recordings

FX = Path(__file__).resolve().parent.parent / "fixtures"


def test_parse_fixture_maps_fields():
    raw = (FX / "plaud_recordings.json").read_text()
    recs = parse_recordings(raw)
    assert recs and isinstance(recs[0], Recording)
    assert recs[0].id and recs[0].title
    assert len(recs[0].date) == 10          # 'YYYY-MM-DD'


def test_parse_empty_and_garbage_return_empty():
    assert parse_recordings("[]") == []
    assert parse_recordings("") == []
    assert parse_recordings("설명 없이 JSON만 출력하랬는데 실패") == []


def test_parse_extracts_json_when_wrapped_in_text():
    raw = '여기 결과입니다:\n[{"id":"a","title":"회의","date":"2026-07-05","summary":"결정 A"}]\n끝'
    recs = parse_recordings(raw)
    assert len(recs) == 1 and recs[0].summary == "결정 A"


def test_parse_extracts_json_with_leading_bracket_noise():
    raw = '항목 [1], [2] 참고. 결과:\n[{"id":"a","title":"회의","date":"2026-07-05","summary":"A"}]\n끝'
    recs = parse_recordings(raw)
    assert len(recs) == 1 and recs[0].id == "a"


def test_parse_skips_invalid_date():
    raw = '[{"id":"z","title":"제목만","summary":"내용"}]'
    assert parse_recordings(raw) == []


def test_fetch_recordings_raises_on_nonzero_exit(monkeypatch):
    from wiki import plaud_ingest

    class R:
        returncode = 1
        stdout = ""
        stderr = "auth expired"

    monkeypatch.setattr(plaud_ingest.subprocess, "run", lambda *a, **k: R())
    import pytest
    with pytest.raises(RuntimeError):
        plaud_ingest.fetch_recordings("/x/fetch.sh", "2026-01-01")
