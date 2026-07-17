import json
from pathlib import Path
from wiki.plaud_types import Recording
from wiki.plaud_ingest import ingest

def test_ingest_creates_new_and_skips_seen(tmp_path):
    recs = [Recording(id="a", title="행복한의원 회의", date="2026-07-05", summary="결정 A"),
            Recording(id="b", title="아이디어", date="2026-07-05", summary="브레인 B")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    made = ingest(recs, rec_dir, [tmp_path], ledger)
    assert len(made) == 2
    matches = list(rec_dir.glob("2026-07-05-행복한의원-회의-*.md"))
    assert len(matches) == 1 and "결정 A" in matches[0].read_text()
    made2 = ingest(recs, rec_dir, [tmp_path], ledger)
    assert made2 == []
    assert set(json.loads(ledger.read_text()).keys()) == {"a", "b"}

def test_ingest_is_idempotent_on_existing_file(tmp_path):
    recs = [Recording(id="a", title="메모", date="2026-07-05", summary="x")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    ingest(recs, rec_dir, [tmp_path], ledger)
    ledger.write_text("{}")
    made = ingest(recs, rec_dir, [tmp_path], ledger)
    assert made == []

def test_ingest_same_day_same_title_no_data_loss(tmp_path):
    recs = [Recording(id="a", title="주간 미팅", date="2026-07-05", summary="예산 확정"),
            Recording(id="b", title="주간 미팅", date="2026-07-05", summary="내용 B")]
    rec_dir = tmp_path/"recordings"; ledger = rec_dir/"processed.json"
    made = ingest(recs, rec_dir, [tmp_path], ledger)
    assert len(made) == 2
    bodies = "".join((rec_dir/f).read_text() for f in made)
    assert "예산 확정" in bodies and "내용 B" in bodies

def test_ingest_action_hook_appends_section(tmp_path):
    recs = [Recording(id="h1", title="미팅", date="2026-07-05", summary="요약")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    made = ingest(recs, rec_dir, [tmp_path], ledger,
                  action_hook=lambda rec: ["제안서 보내기"])
    body = (rec_dir / made[0]).read_text()
    assert "## 다음 액션" in body and "- [ ] 제안서 보내기" in body

def test_ingest_action_hook_failure_isolated(tmp_path):
    def boom(rec): raise RuntimeError("LLM down")
    recs = [Recording(id="h2", title="미팅2", date="2026-07-05", summary="요약")]
    rec_dir = tmp_path / "recordings"; ledger = rec_dir / "processed.json"
    made = ingest(recs, rec_dir, [tmp_path], ledger, action_hook=boom)
    assert len(made) == 1
    assert "## 다음 액션" not in (rec_dir / made[0]).read_text()
