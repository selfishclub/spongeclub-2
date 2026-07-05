"""웹UI '숨기기' 목록. 원본 파일은 절대 건드리지 않는다."""
import json
from pathlib import Path


def load_hidden(path) -> set:
    p = Path(path)
    if not p.exists():
        return set()
    try:
        return set(json.loads(p.read_text()))
    except (json.JSONDecodeError, TypeError):
        return set()


def add_hidden(path, slug: str) -> None:
    hidden = load_hidden(path)
    hidden.add(slug)
    Path(path).write_text(json.dumps(sorted(hidden), ensure_ascii=False, indent=2))


def filter_docs(docs, hidden: set) -> list:
    """hidden 은 doc 의 고유 id(layer/상대경로) 로 매칭한다.

    basename(파일명 stem)으로 매칭하면 동명 파일(CLAUDE.md 등)이 전부
    제거되는 결함이 있었다 — 반드시 고유 id 기준으로 걸러야 한다.
    """
    return [d for d in docs if d.get("id") not in hidden]
