"""임베딩 시맨틱 검색의 랭킹 로직 테스트 (무거운 모델 다운로드 없이).

FAKE 임베더를 주입해 결정적 벡터로 랭킹·제외 로직만 검증한다.
"""
import numpy as np

from wiki.embed import build_index, semantic_search


class FakeEmbedder:
    """텍스트에 미리 정해둔 벡터를 반환하는 결정적 가짜 임베더.

    fastembed 인터페이스( .embed(texts) → 벡터 이터러블 )를 모사한다.
    매칭 우선순위: 등록된 키가 텍스트에 포함되면 그 벡터, 아니면 영벡터.
    """
    def __init__(self, table, dim=3):
        self.table = table
        self.dim = dim

    def embed(self, texts):
        for t in texts:
            vec = None
            for key, v in self.table.items():
                if key in t:
                    vec = v
                    break
            yield np.asarray(vec if vec is not None else [0.0] * self.dim,
                             dtype=np.float32)


def _nodes():
    return [
        {"id": "price", "title": "가격 정책",
         "search_text": "gbp 언어당 50만원 구글애즈 마크업", "dangling": False},
        {"id": "ads", "title": "광고 운영",
         "search_text": "메타 광고 인스타 릴스 리드", "dangling": False},
        {"id": "gbp", "title": "GBP 순위 측정",
         "search_text": "로컬팔콘 그리드 반경 순위", "dangling": False},
        {"id": "ghost", "title": "빈 유령",
         "search_text": "", "dangling": True},
    ]


# 각 노드/질의를 3차원 축에 배치 — 코사인 유사도 랭킹을 결정적으로 만든다.
_TABLE = {
    "가격": [1.0, 0.0, 0.0],
    "광고": [0.0, 1.0, 0.0],
    "GBP": [0.0, 0.0, 1.0],
}


def test_semantic_search_ranks_most_similar_first():
    emb = FakeEmbedder(_TABLE)
    nodes = _nodes()
    index = build_index(nodes, embedder=emb)
    hits = semantic_search("가격 정책 알려줘", index, nodes, k=3, embedder=emb)
    assert hits[0]["id"] == "price"


def test_semantic_search_ranks_gbp_query():
    emb = FakeEmbedder(_TABLE)
    nodes = _nodes()
    index = build_index(nodes, embedder=emb)
    hits = semantic_search("GBP 순위 측정 방법", index, nodes, k=3, embedder=emb)
    assert hits[0]["id"] == "gbp"


def test_semantic_search_excludes_dangling_and_empty():
    emb = FakeEmbedder(_TABLE)
    nodes = _nodes()
    index = build_index(nodes, embedder=emb)
    # 인덱스에 dangling/빈 노드가 들어가지 않음
    assert "ghost" not in index.ids
    hits = semantic_search("광고 운영", index, nodes, k=8, embedder=emb)
    assert all(h["id"] != "ghost" for h in hits)


def test_build_index_skips_dangling():
    emb = FakeEmbedder(_TABLE)
    nodes = _nodes()
    index = build_index(nodes, embedder=emb)
    assert set(index.ids) == {"price", "ads", "gbp"}
    assert index.vectors.shape[0] == 3


def test_semantic_search_empty_query_returns_empty():
    emb = FakeEmbedder(_TABLE)
    nodes = _nodes()
    index = build_index(nodes, embedder=emb)
    assert semantic_search("   ", index, nodes, k=8, embedder=emb) == []


def test_semantic_search_empty_index_returns_empty():
    emb = FakeEmbedder(_TABLE)
    index = build_index([], embedder=emb)
    assert semantic_search("가격", index, [], k=8, embedder=emb) == []
