"""녹음 본문 → 기존 slug로 자동 링크(## 관련 섹션). 본문은 건드리지 않는다."""
from pathlib import Path

ALIASES = {
    "행복한의원": "project_happy_clinic", "행복한": "project_happy_clinic",
    "미소치과": "project_smile_dental",
    "튼튼정형외과": "project_strong_ortho",
}


def build_alias_map(source_dirs) -> dict:
    amap = dict(ALIASES)
    for d in source_dirs:
        d = Path(d)
        if not d.exists():
            continue
        for p in d.rglob("*.md"):
            slug = p.stem
            if "_" in slug and len(slug) >= 8:   # project_*/feedback_* 등 구체 slug만; generic 단어 제외
                amap.setdefault(slug, slug)
    return amap


def related_section(text: str, alias_map: dict) -> str:
    found = []
    for alias, slug in alias_map.items():
        if alias and alias in text and slug not in found:
            found.append(slug)
    if not found:
        return ""
    lines = ["## 관련"] + [f"- [[{s}]]" for s in found]
    return "\n".join(lines) + "\n"
