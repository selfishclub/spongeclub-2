from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]   # 프로젝트 루트


def sources():
    return [
        ("ontology", ROOT / "sample-knowledge/ontology"),
        ("memory", ROOT / "sample-knowledge/memory"),
        ("rules", ROOT / "sample-knowledge/rules"),
        ("docs", ROOT / "sample-knowledge/docs"),
        ("recording", ROOT / "recordings"),
    ]
