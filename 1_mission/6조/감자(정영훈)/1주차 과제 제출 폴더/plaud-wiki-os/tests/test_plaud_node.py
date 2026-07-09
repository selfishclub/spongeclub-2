from wiki.plaud_types import Recording
from wiki.plaud_node import slugify, to_markdown, filename


def test_slugify_keeps_hangul_and_date():
    assert slugify("행복한의원 회의 3차!", "2026-07-05") == "2026-07-05-행복한의원-회의-3차"


def test_to_markdown_has_frontmatter_and_summary():
    rec = Recording(id="x1", title="행복한의원 회의", date="2026-07-05", summary="핵심 결정 A")
    md = to_markdown(rec)
    assert md.startswith("---\n")
    assert "name: recording_2026-07-05-행복한의원-회의" in md
    assert "source: plaud" in md
    assert "recording_id: x1" in md
    assert "핵심 결정 A" in md


def test_to_markdown_falls_back_to_transcript_when_no_summary():
    rec = Recording(id="x2", title="메모", date="2026-07-05", summary=None, transcript="원문 텍스트")
    assert "원문 텍스트" in to_markdown(rec)


def test_filename():
    rec = Recording(id="x", title="아이디어", date="2026-07-05")
    fn = filename(rec)
    assert fn.startswith("2026-07-05-아이디어-") and fn.endswith(".md")
