"""Plaud fetch(JSON) → Recording 파싱 + 적층 오케스트레이션."""
import json
import re
import subprocess
from pathlib import Path

from wiki.plaud_types import Recording
from wiki.plaud_node import to_markdown, filename
from wiki.plaud_linker import build_alias_map, related_section
from wiki.plaud_actions import actions_section, extract_actions, send_telegram


DATE_RE = re.compile(r"\d{4}-\d{2}-\d{2}")


def parse_recordings(raw: str) -> list:
    if not raw or not raw.strip():
        return []
    text = raw.strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\[\s*\{.*\}\s*\]", text, re.DOTALL)   # 텍스트에 감싸인 JSON 객체배열만 추출
        if not m:
            return []
        try:
            data = json.loads(m.group(0))
        except json.JSONDecodeError:
            return []
    if not isinstance(data, list):
        return []
    out = []
    for it in data:
        if not isinstance(it, dict):
            continue
        rid = re.sub(r"[^\w.-]", "", str(it.get("id") or ""))   # id 살균
        if not rid:
            continue
        date = str(it.get("date") or "")[:10]
        if not DATE_RE.fullmatch(date):                          # 유효 날짜만
            continue
        out.append(Recording(
            id=rid,
            title=(it.get("title") or "무제").strip(),
            date=date,
            summary=it.get("summary"),
        ))
    return out


def fetch_recordings(script_path, since: str) -> list:
    proc = subprocess.run([str(script_path), since], capture_output=True,
                          text=True, timeout=600)
    if proc.returncode != 0:
        raise RuntimeError(
            f"fetch 실패 (exit {proc.returncode}): {(proc.stderr or '').strip()[:500]}")
    return parse_recordings(proc.stdout)


def load_ledger(path) -> dict:
    p = Path(path)
    return json.loads(p.read_text()) if p.exists() else {}


def save_ledger(path, data: dict) -> None:
    Path(path).write_text(json.dumps(data, ensure_ascii=False, indent=2))


def ingest(recordings, recordings_dir, source_dirs, ledger_path, action_hook=None) -> list:
    recordings_dir = Path(recordings_dir)
    recordings_dir.mkdir(parents=True, exist_ok=True)
    ledger = load_ledger(ledger_path)
    alias_map = build_alias_map(source_dirs)
    made = []
    for rec in recordings:
        if rec.id in ledger:
            continue
        fpath = recordings_dir / filename(rec)
        if fpath.exists():                       # 멱등: 파일 있으면 원장만 보정
            ledger[rec.id] = rec.date
            continue
        actions = []
        if action_hook is not None:
            try:
                actions = action_hook(rec) or []
            except Exception:
                actions = []                     # 실패 격리: 액션 추출 실패해도 적층은 성공
        extra = actions_section(actions)
        related = related_section((rec.summary or rec.transcript or ""), alias_map)
        combined = extra + ("\n" if extra and related else "") + related
        fpath.write_text(to_markdown(rec, combined), encoding="utf-8")
        ledger[rec.id] = rec.date
        made.append(fpath.name)
    save_ledger(ledger_path, ledger)
    return made


def _load_env(env_path) -> dict:
    env = {}
    p = Path(env_path)
    if not p.exists():
        return env
    for line in p.read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def _make_action_hook(api_key, tg_token, tg_chat):
    def hook(rec):
        acts = extract_actions(rec.summary or rec.transcript or "", api_key)
        if acts and tg_token and tg_chat:
            send_telegram(tg_token, tg_chat, rec.title, rec.date, acts)
        return acts
    return hook


if __name__ == "__main__":
    import sys
    import build_wiki
    from wiki.sources import sources as _sources
    here = Path(__file__).resolve().parent.parent
    since = sys.argv[1] if len(sys.argv) > 1 else "1970-01-01"
    env = _load_env(here / ".env")
    api_key = env.get("ANTHROPIC_API_KEY")
    tg_token = env.get("TELEGRAM_BOT_TOKEN")
    tg_chat = env.get("TELEGRAM_CHAT_ID")
    hook = _make_action_hook(api_key, tg_token, tg_chat) if api_key else None
    recs = fetch_recordings(here / "fetch_plaud.sh", since)
    made = ingest(recs, here / "recordings",
                  [p for _, p in _sources()], here / "recordings" / "processed.json",
                  action_hook=hook)
    print(f"신규 녹음 {len(made)}건 적층")     # 제목·원문은 출력 안 함(보안)
    build_wiki.main()
