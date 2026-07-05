from wiki.plaud_linker import related_section, build_alias_map


def test_related_section_matches_alias():
    amap = {"행복한": "project_happy_clinic", "미소치과": "project_smile_dental"}
    out = related_section("오늘 행복한 미팅에서 결정", amap)
    assert "## 관련" in out
    assert "[[project_happy_clinic]]" in out
    assert "미소치과" not in out  # 미언급은 링크 안 함


def test_related_section_dedupes_and_empty():
    amap = {"행복한": "project_happy_clinic", "행복한의원": "project_happy_clinic"}
    out = related_section("행복한 행복한의원 반복", amap)
    assert out.count("[[project_happy_clinic]]") == 1
    assert related_section("아무 관련 없음", {"행복한": "x"}) == ""


def test_build_alias_map_excludes_generic_stems(tmp_path):
    (tmp_path/"performance.md").write_text("x")
    (tmp_path/"project_happy_clinic.md").write_text("x")
    amap = build_alias_map([tmp_path])
    assert "project_happy_clinic" in amap
    assert "performance" not in amap
