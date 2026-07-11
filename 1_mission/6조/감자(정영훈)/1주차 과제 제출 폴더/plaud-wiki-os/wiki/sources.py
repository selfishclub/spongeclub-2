from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]   # 프로젝트 루트


def sources():
    return [
        ("ontology", ROOT / "knowledge/ontology"),
        ("memory", ROOT / "knowledge/memory"),
        ("rules", ROOT / "knowledge/rules"),
        ("docs", ROOT / "knowledge/docs"),
        ("recording", ROOT / "recordings"),
    ]
