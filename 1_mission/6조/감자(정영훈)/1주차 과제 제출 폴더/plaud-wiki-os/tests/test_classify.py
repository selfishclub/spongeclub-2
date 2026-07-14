"""사업 도메인 분류 테스트 — 실제 API 호출 없이 _call_llm 을 모킹.

배칭·dangling·폴백·오버라이드·캐시 라운드트립을 결정적으로 검증한다.
"""
import json

from wiki import classify as C


def _nodes():
    return [
        {"id": "price", "title": "가격 정책",
         "search_text": "gbp 언어당 50만원", "dangling": False},
        {"id": "selfproduct", "title": "자체 서비스 사업계획서",
         "search_text": "자체 플랫폼 구축 운영", "dangling": False},
        {"id": "brand", "title": "퍼스널 브랜딩 카드뉴스",
         "search_text": "개인 브랜딩 콘텐츠 제작", "dangling": False},
        {"id": "pyrule", "title": "파이썬 규칙",
         "search_text": "PEP8 타입힌트 pytest", "dangling": False},
        {"id": "ghost", "title": "빈 유령", "search_text": "", "dangling": True},
    ]


def _fake_call(buckets_by_title):
    """제목 키워드로 버킷을 정하는 결정적 가짜 LLM. 호출 카운터 포함."""
    calls = {"n": 0}

    def call(system, user):
        calls["n"] += 1
        # user 안의 "[i] 제목: ..." 파싱해 번호별 버킷 배정
        out = []
        for line in user.splitlines():
            line = line.strip()
            if not (line.startswith("[") and "]" in line):
                continue
            idx = int(line[1:line.index("]")])
            rest = line[line.index("]") + 1:]
            bucket = C.FALLBACK
            for kw, b in buckets_by_title.items():
                if kw in rest:
                    bucket = b
                    break
            out.append({"i": idx, "bucket": bucket, "confidence": 0.9, "reason": "테스트"})
        return "```json\n" + json.dumps(out, ensure_ascii=False) + "\n```"

    return call, calls


_MAP = {"가격": "대행사업", "자체": "자체제품",
        "브랜딩": "퍼스널브랜딩", "파이썬": "그외"}


def _isolate(tmp_path, monkeypatch):
    """캐시·오버라이드 경로를 임시 디렉터리로 격리."""
    monkeypatch.setattr(C, "_CACHE", tmp_path / ".classify_cache.json")
    monkeypatch.setattr(C, "_OVERRIDES", tmp_path / "overrides.json")


def test_assigns_bucket_to_every_nondangling_node(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    call, _ = _fake_call(_MAP)
    nodes = _nodes()
    C.assign_buckets(nodes, call=call)
    by_id = {n["id"]: n for n in nodes}
    assert by_id["price"]["bucket"] == "대행사업"
    assert by_id["selfproduct"]["bucket"] == "자체제품"
    assert by_id["brand"]["bucket"] == "퍼스널브랜딩"
    assert by_id["pyrule"]["bucket"] == "그외"
    # 모든 비-dangling 노드가 4종 중 하나
    for n in nodes:
        if not n["dangling"]:
            assert n["bucket"] in C.BUCKETS


def test_dangling_gets_dangling_bucket(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    call, _ = _fake_call(_MAP)
    nodes = _nodes()
    C.assign_buckets(nodes, call=call)
    assert next(n for n in nodes if n["id"] == "ghost")["bucket"] == "dangling"


def test_unknown_bucket_falls_back(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    # LLM 이 4종 밖의 버킷을 반환 → 그외 폴백
    def bad_call(system, user):
        return json.dumps([{"i": 1, "bucket": "엉뚱한버킷", "confidence": 0.9, "reason": "x"}])
    nodes = [{"id": "x", "title": "무언가", "search_text": "내용", "dangling": False}]
    C.assign_buckets(nodes, call=bad_call)
    assert nodes[0]["bucket"] == "그외"


def test_missing_item_falls_back(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    # LLM 이 빈 배열 반환 → 모든 노드 미분류 → 그외
    nodes = [{"id": "x", "title": "무언가", "search_text": "내용", "dangling": False}]
    C.assign_buckets(nodes, call=lambda s, u: "[]")
    assert nodes[0]["bucket"] == "그외"


def test_overrides_take_precedence(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    (tmp_path / "overrides.json").write_text(
        json.dumps({"pyrule": "대행사업"}, ensure_ascii=False), encoding="utf-8")
    call, _ = _fake_call(_MAP)
    nodes = _nodes()
    C.assign_buckets(nodes, call=call)
    # LLM 은 pyrule→그외 였지만 오버라이드가 이김
    assert next(n for n in nodes if n["id"] == "pyrule")["bucket"] == "대행사업"


def test_invalid_override_ignored(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    (tmp_path / "overrides.json").write_text(
        json.dumps({"pyrule": "없는버킷"}, ensure_ascii=False), encoding="utf-8")
    call, _ = _fake_call(_MAP)
    nodes = _nodes()
    C.assign_buckets(nodes, call=call)
    assert next(n for n in nodes if n["id"] == "pyrule")["bucket"] == "그외"


def test_cache_roundtrip_skips_llm(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    call, calls = _fake_call(_MAP)
    nodes = _nodes()
    C.classify_nodes(nodes, call=call)
    assert calls["n"] >= 1                       # 최초엔 LLM 호출됨
    first = calls["n"]
    # 두 번째 호출: 동일 노드 → 캐시 히트 → LLM 재호출 없음
    C.classify_nodes(_nodes(), call=call)
    assert calls["n"] == first


def test_cache_partial_reclassifies_only_new(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    call, calls = _fake_call(_MAP)
    C.classify_nodes(_nodes(), call=call)
    first = calls["n"]
    # 새 노드 하나 추가 → 그 노드만 재분류 (기존은 캐시)
    nodes = _nodes() + [{"id": "new", "title": "가격 추가", "search_text": "새 내용",
                         "dangling": False}]
    res = C.classify_nodes(nodes, call=call)
    assert calls["n"] == first + 1               # 배치 1회만 추가
    assert res["new"]["bucket"] == "대행사업"


def test_write_review_produces_sections(tmp_path, monkeypatch):
    _isolate(tmp_path, monkeypatch)
    call, _ = _fake_call(_MAP)
    nodes = _nodes()
    out = tmp_path / "review.md"
    counts = C.write_review(nodes, out, call=call)
    text = out.read_text(encoding="utf-8")
    assert "저신뢰(검토 필요)" in text
    assert "대행사업" in text and "자체제품" in text
    assert counts["대행사업"] == 1
