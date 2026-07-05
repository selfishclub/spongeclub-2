from wiki.retrieve import search


def _nodes():
    return [
        {"id": "a", "title": "가격 정책", "layer": "ontology",
         "search_text": "gbp 언어당 50만원 구글애즈 마크업", "dangling": False},
        {"id": "b", "title": "광고 운영", "layer": "ontology",
         "search_text": "메타 광고 인스타 릴스 리드", "dangling": False},
        {"id": "c", "title": "빈 유령", "layer": "dangling",
         "search_text": "", "dangling": True},
    ]


def test_search_ranks_relevant_first():
    hits = search("가격 정책 정리", _nodes(), k=2)
    assert hits[0]["id"] == "a"
    assert all(h["id"] != "c" for h in hits)   # dangling/빈 노드 제외


def test_search_korean_substring():
    hits = search("마크업", _nodes(), k=3)
    assert hits and hits[0]["id"] == "a"


def test_search_excludes_dangling_and_empty():
    hits = search("빈 유령", _nodes(), k=8)
    assert all(h["id"] != "c" for h in hits)


def test_search_respects_topk():
    nodes = [
        {"id": str(i), "title": "광고 " + str(i), "layer": "ontology",
         "search_text": "메타 광고 리드 " + str(i), "dangling": False}
        for i in range(20)
    ]
    hits = search("광고", nodes, k=5)
    assert len(hits) == 5


def test_search_no_match_returns_empty():
    hits = search("존재하지않는키워드zzz", _nodes(), k=8)
    assert hits == []
