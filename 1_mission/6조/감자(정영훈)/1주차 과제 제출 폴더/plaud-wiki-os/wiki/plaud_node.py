"""Plaud Recording → 기존 위키 파서가 읽는 마크다운 노드."""
import hashlib
import re

from wiki.plaud_types import Recording


def slugify(title: str, date: str) -> str:
    base = title.strip().lower()
    base = re.sub(r"[^\w가-힣]+", "-", base, flags=re.UNICODE).strip("-")
    base = base or "무제"
    return f"{date}-{base}"


def _short_id(rid: str) -> str:
    return hashlib.sha1(str(rid).encode("utf-8")).hexdigest()[:8]


def filename(rec: Recording) -> str:
    return f"{slugify(rec.title, rec.date)}-{_short_id(rec.id)}.md"


def to_markdown(rec: Recording, related: str = "") -> str:
    slug = slugify(rec.title, rec.date)
    body = (rec.summary or rec.transcript or "").strip() or "(내용 없음)"
    parts = [
        "---",
        f"name: recording_{slug}",
        f"date: {rec.date}",
        "source: plaud",
        f"recording_id: {rec.id}",
        "---",
        "",
        f"# {rec.title}",
        "",
        body,
    ]
    if related.strip():
        parts += ["", related.rstrip()]
    return "\n".join(parts) + "\n"
