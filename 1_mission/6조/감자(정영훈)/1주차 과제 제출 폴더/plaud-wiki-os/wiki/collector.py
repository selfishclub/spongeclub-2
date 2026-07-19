from pathlib import Path


def collect(sources):
    """sources: list of (layer, dir_path). return list of doc records.

    memory layer is flat (non-recursive *.md per spec §3); other layers rglob.
    """
    docs = []
    for layer, base in sources:
        base = Path(base)
        if not base.exists():
            continue
        paths = base.glob("*.md") if layer == "memory" else base.rglob("*.md")
        for p in sorted(paths):
            rel = p.relative_to(base).with_suffix("")
            docs.append({
                "id": f"{layer}/{rel.as_posix()}",
                "layer": layer,
                "abspath": str(p),
                "basename": p.stem,
            })
    return docs
