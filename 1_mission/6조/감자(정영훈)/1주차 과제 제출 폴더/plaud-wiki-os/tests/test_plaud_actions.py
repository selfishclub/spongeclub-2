import json
from wiki.plaud_actions import extract_actions, actions_section, send_telegram

def test_extract_actions_parses_json_array():
    fake = lambda prompt: '["제안서 초안 보내기", "순위 재측정"]'
    out = extract_actions("요약...", "sk-test", _call=fake)
    assert out == ["제안서 초안 보내기", "순위 재측정"]

def test_extract_actions_bad_output_returns_empty():
    assert extract_actions("요약", "sk", _call=lambda p: "액션 없음!") == []
    assert extract_actions("요약", "sk", _call=lambda p: '{"not":"list"}') == []
    assert extract_actions("", "sk", _call=lambda p: '["x"]') == []   # 빈 요약은 호출 안 함

def test_actions_section_format():
    assert "## 다음 액션" in actions_section(["A", "B"])
    assert "- [ ] A" in actions_section(["A", "B"])
    assert actions_section([]) == ""

def test_send_telegram_payload_plain_text():
    sent = {}
    def fake_open(req, timeout=15):
        sent["url"] = req.full_url
        sent["data"] = json.loads(req.data.decode())
        class R:
            def read(self): return b'{"ok":true}'
            def __enter__(self): return self
            def __exit__(self, *a): return False
        return R()
    ok = send_telegram("tok", "123", "미팅", "2026-07-05", ["액션1"], _open=fake_open)
    assert ok and "sendMessage" in sent["url"]
    assert "액션1" in sent["data"]["text"] and "parse_mode" not in sent["data"]
