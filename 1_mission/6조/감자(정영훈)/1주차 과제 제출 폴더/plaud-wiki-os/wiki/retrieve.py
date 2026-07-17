import math
import re

_TOK = re.compile(r"[0-9A-Za-z가-힣]+")


def _tokens(s):
    return _TOK.findall((s or "").lower())


def search(query, nodes, k=8):
    """키워드 검색 top-K (BM25-lite).

    한국어는 공백 토큰화가 부실하므로 질문 토큰의 부분문자열 매칭 +
    제목 부스트 + idf 가중을 섞는다. dangling·빈 search_text 노드는 제외.
    """
    cand = [n for n in nodes if not n.get("dangling") and n.get("search_text")]
    if not cand:
        return []
    q = [t for t in _tokens(query) if len(t) >= 2]
    if not q:
        q = _tokens(query)
    if not q:
        return []
    N = len(cand)
    # df: 후보 중 해당 토큰을 부분문자열로 포함하는 문서 수
    df = {t: sum(1 for n in cand if t in n["search_text"] or t in n["title"].lower())
          for t in set(q)}

    def score(n):
        st, ti = n["search_text"], n["title"].lower()
        s = 0.0
        for t in q:
            tf = st.count(t) + 3 * ti.count(t)          # 제목 부스트
            if tf:
                idf = math.log(1 + N / (1 + df.get(t, 0)))
                s += idf * tf / (tf + 1.5)               # 포화
        return s

    scored = [(score(n), n) for n in cand]
    scored = [pair for pair in scored if pair[0] > 0]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [n for _, n in scored[:k]]
