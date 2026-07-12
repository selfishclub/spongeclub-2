from wiki.parser import parse


def test_parse_title_links_type():
    text = ('---\nmetadata:\n  type: project\n---\n'
            '# 알파 프로젝트\n베타 [[beta]] 참고. [문서](../memory/beta.md)\n')
    r = parse(text)
    assert r["title"] == "알파 프로젝트"
    assert r["type"] == "project"
    assert ("wikilink", "beta") in r["raw_links"]
    assert ("mdlink", "../memory/beta.md") in r["raw_links"]
    assert "<h1" in r["html"]
    assert "베타" in r["search_text"] and "<" not in r["search_text"]


def test_parse_title_fallback_and_prefix_type():
    r = parse("본문만 있고 제목 없음")
    assert r["title"]  # 빈 문자열 아님 (호출측이 파일명으로 대체)
    assert r["type"] is None  # frontmatter 없음


def test_parse_neutralizes_script():
    r = parse("# 위험\n<script>alert(1)</script> 본문")
    assert "<script" not in r["html"]
    assert "&lt;script" in r["html"]
