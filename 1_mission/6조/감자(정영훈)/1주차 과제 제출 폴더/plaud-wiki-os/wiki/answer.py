import html as _html
import re as _re

import markdown as _md

MODEL = "claude-sonnet-4-6"

# 마크다운이 생성한 <a href>/<img src> 중 위험 스킴 무력화 (원시 HTML은
# 아래 _html.escape 로 이미 죽지만, 마크다운 링크/이미지 문법은 살아남으므로 방어)
_DANGER_SCHEME = _re.compile(r'(href|src)\s*=\s*"(?:javascript|vbscript|data):[^"]*"', _re.I)


def _sanitize_html(text):
    """LLM 출력을 안전한 HTML로: 원시 HTML 이스케이프 후 마크다운 변환,
    남은 위험 스킴 링크 무력화. (외부 이미지 비콘은 서버 CSP 가 추가 차단)"""
    escaped = _html.escape(text or "", quote=False)      # 원시 <img>/<script>/<svg> 전부 무력화
    rendered = _md.markdown(escaped, extensions=["extra"])
    return _DANGER_SCHEME.sub(r'\1="#"', rendered)
SYSTEM = ("너는 사용자의 개인 지식 베이스 위에서 답하는 한국어 어시스턴트다. "
          "아래 제공된 발췌만 근거로 정리해 답하라. 발췌에 없는 내용은 지어내지 말고 "
          "'해당 내용은 지식 베이스에 없음'이라 말하라. 근거로 쓴 항목은 [번호]로 인용하라. "
          "거래처 기밀을 존중하고 간결한 한국어로 답하라.")


def build_messages(question, hits):
    lines = []
    for i, h in enumerate(hits, 1):
        excerpt = (h.get("search_text") or "")[:1500]
        lines.append(f"[{i}] {h['title']} ({h.get('layer', '')}): {excerpt}")
    user = f"질문: {question}\n\n=== 발췌 ===\n" + "\n\n".join(lines)
    return {"system": SYSTEM, "user": user}


def _call_llm(system, user):
    import anthropic
    client = anthropic.Anthropic()          # ANTHROPIC_API_KEY 환경변수 사용
    resp = client.messages.create(
        model=MODEL, max_tokens=1500,
        system=system, messages=[{"role": "user", "content": user}])
    return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")


def answer(question, hits):
    if not hits:
        return {"answer_html": "<p>관련 지식을 찾지 못했습니다.</p>", "sources": []}
    m = build_messages(question, hits)
    text = _call_llm(m["system"], m["user"])
    answer_html = _sanitize_html(text)
    sources = [{"id": h["id"], "title": h["title"]} for h in hits]
    return {"answer_html": answer_html, "sources": sources}
