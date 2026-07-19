import re
import markdown as md

_FM = re.compile(r"^---\n(.*?)\n---\n", re.DOTALL)
_WIKI = re.compile(r"\[\[([^\]]+)\]\]")
_MD = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
_TAG = re.compile(r"<[^>]+>")


def _frontmatter(text):
    m = _FM.match(text)
    if not m:
        return {}, text
    block, body = m.group(1), text[m.end():]
    fm = {"type": None}
    tm = re.search(r"^\s*type:\s*(\S+)", block, re.MULTILINE)
    if tm:
        fm["type"] = tm.group(1).strip().strip('"')
    return fm, body


def parse(text):
    fm, body = _frontmatter(text)
    # 제목: 첫 H1
    h1 = re.search(r"^#\s+(.+)$", body, re.MULTILINE)
    title = h1.group(1).strip() if h1 else ""
    # 링크 raw (glob/확장자없음/외부URL은 resolver가 거른다; 여기선 원문만)
    raw = [("wikilink", s.strip()) for s in _WIKI.findall(body)]
    raw += [("mdlink", s.strip()) for s in _MD.findall(body)]
    # 원시 script 태그 무력화 (raw HTML은 markdown이 그대로 통과시키므로)
    body = body.replace("<script", "&lt;script").replace("</script", "&lt;/script")
    html_body = md.markdown(body, extensions=["extra", "sane_lists"])
    plain = _TAG.sub(" ", html_body).lower()
    return {
        "title": title or "(제목 없음)",
        "type": fm.get("type"),
        "raw_links": raw,
        "html": html_body,
        "search_text": re.sub(r"\s+", " ", plain).strip(),
    }
