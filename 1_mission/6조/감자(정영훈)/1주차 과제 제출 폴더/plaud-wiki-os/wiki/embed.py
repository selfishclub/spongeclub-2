"""로컬 전용 임베딩(시맨틱) 검색. 외부 API 없이 fastembed 로 100% 로컬 실행.

거래처 기밀이 든 지식 베이스라 임베딩은 반드시 로컬에서만 계산한다.
모델은 한국어를 잘 다루는 작은 다국어 모델(paraphrase-multilingual-MiniLM,
약 220MB). fastembed 가 e5-small 을 지원하지 않아 이 모델을 택함(비-e5 →
passage/query 프리픽스 없음).

벡터는 노드 텍스트 해시로 캐시(.embed_cache.npz)해 서버 재시작을 빠르게 한다.
이 캐시는 거래처 데이터에서 파생 → .gitignore 처리 필수.
"""
import hashlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np

# fastembed 미지원 e5-small 대신, ≤300MB 다국어 모델. 비-e5라 프리픽스 불필요.
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
IS_E5 = "e5" in MODEL_NAME.lower()
MAX_TEXT = 2000                                   # search_text 절단 길이
_CACHE = Path(__file__).resolve().parent.parent / ".embed_cache.npz"

_MODEL = None                                     # 지연 로드 캐시


def _get_model():
    """fastembed TextEmbedding 을 지연 로드(최초 호출 시 모델 다운로드)."""
    global _MODEL
    if _MODEL is None:
        from fastembed import TextEmbedding
        _MODEL = TextEmbedding(model_name=MODEL_NAME)
    return _MODEL


@dataclass(frozen=True)
class EmbedIndex:
    ids: tuple            # 노드 id 순서 (vectors 행과 일치)
    vectors: np.ndarray   # (N, dim) L2-정규화된 float32
    model_name: str


def _node_text(node):
    """임베딩 대상 텍스트: 제목 + 절단된 search_text."""
    st = (node.get("search_text") or "")[:MAX_TEXT]
    text = f"{node.get('title', '')}\n{st}"
    return f"passage: {text}" if IS_E5 else text


def _query_text(query):
    return f"query: {query}" if IS_E5 else query


def _candidates(nodes):
    return [n for n in nodes if not n.get("dangling") and n.get("search_text")]


def _embed(texts, embedder):
    """embedder.embed(texts) → (N, dim) float32 행렬."""
    src = embedder if embedder is not None else _get_model()
    vecs = list(src.embed(list(texts)))
    return np.asarray(vecs, dtype=np.float32).reshape(len(texts), -1)


def _normalize(mat):
    norms = np.linalg.norm(mat, axis=1, keepdims=True)
    return mat / np.clip(norms, 1e-12, None)


def _content_hash(model_name, texts):
    h = hashlib.sha256()
    h.update(model_name.encode("utf-8"))
    for t in texts:
        h.update(b"\x00")
        h.update(t.encode("utf-8"))
    return h.hexdigest()


def _load_cache(want_hash):
    """캐시 해시가 일치하면 (ids, vectors) 반환, 아니면 None."""
    if not _CACHE.exists():
        return None
    try:
        data = np.load(_CACHE, allow_pickle=False)
        if str(data["hash"]) != want_hash:
            return None
        return tuple(str(i) for i in data["ids"]), data["vectors"].astype(np.float32)
    except (OSError, KeyError, ValueError):
        return None


def _save_cache(want_hash, ids, vectors):
    try:
        np.savez(_CACHE, hash=want_hash,
                 ids=np.asarray(ids, dtype=object).astype(str), vectors=vectors)
    except OSError:
        pass   # 캐시 실패는 치명적 아님 — 재임베딩으로 계속 동작


def build_index(nodes, embedder=None):
    """비-dangling 노드를 임베딩해 EmbedIndex 반환. 내용 해시로 디스크 캐시.

    embedder 를 주입하면(테스트용) 실제 모델 다운로드 없이 동작한다.
    """
    cand = _candidates(nodes)
    ids = tuple(n["id"] for n in cand)
    texts = [_node_text(n) for n in cand]
    if not cand:
        return EmbedIndex(ids=(), vectors=np.zeros((0, 0), dtype=np.float32),
                          model_name=MODEL_NAME)

    want_hash = _content_hash(MODEL_NAME, texts)
    if embedder is None:
        cached = _load_cache(want_hash)
        if cached is not None:
            cids, cvecs = cached
            if cids == ids:
                return EmbedIndex(ids=ids, vectors=cvecs, model_name=MODEL_NAME)

    vectors = _normalize(_embed(texts, embedder))
    if embedder is None:
        _save_cache(want_hash, ids, vectors)
    return EmbedIndex(ids=ids, vectors=vectors, model_name=MODEL_NAME)


def semantic_search(query, index, nodes, k=8, embedder=None):
    """질의를 임베딩해 코사인 유사도 top-K 노드 dict 반환.

    dangling·빈 search_text 노드는 인덱스에 없으므로 자연히 제외된다.
    """
    if index is None or len(index.ids) == 0 or not (query or "").strip():
        return []
    by_id = {n["id"]: n for n in nodes}
    qv = _normalize(_embed([_query_text(query)], embedder))[0]
    sims = index.vectors @ qv                       # 정규화됨 → 내적 = 코사인
    order = np.argsort(-sims)[:k]
    hits = []
    for i in order:
        node = by_id.get(index.ids[int(i)])
        if node is not None and not node.get("dangling") and node.get("search_text"):
            hits.append(node)
    return hits
