# -*- coding: utf-8 -*-
"""
자동 셀 선물 봇 - 순환 엔진
------------------------------------
누구에게 오늘의 셀을 줄지 '공정하게 돌아가며' 정하는 핵심 로직.
- 한 사람에게 몰리지 않도록, 가장 오래 안 준 사람부터 우선.
- mode = "rotate_all"  : 나(owner)를 뺀 조원 전체를 순환
- mode = "favorites"   : config의 favorites 목록 안에서만 순환
- 매일 준 기록은 state.json 에 남아서, 봇을 껐다 켜도 순서가 이어집니다.
"""

import json
import os
import random
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE, "config.json")
MEMBERS_PATH = os.path.join(BASE, "data", "members.json")
STATE_PATH = os.path.join(BASE, "state.json")


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def load_state():
    if os.path.exists(STATE_PATH):
        return load_json(STATE_PATH)
    return {"history": [], "given_count": {}}


def eligible_recipients(config, members):
    """오늘의 셸을 받을 수 있는 후보 목록(닉네임 기준).
    본인 제외는 owner_slack_id가 있으면 그걸로, 없으면 owner_nickname으로 합니다.
    (공개 배포본은 Slack ID 없이 닉네임만으로 동작)"""
    team = config["team"]
    owner_id = config.get("owner_slack_id") or ""
    owner_nick = config.get("owner_nickname") or ""
    roster = members[team]["members"]

    # 나 자신은 제외
    if owner_id:
        pool = [m for m in roster if m.get("slack_id") != owner_id]
    elif owner_nick:
        pool = [m for m in roster if m.get("nickname") != owner_nick]
    else:
        raise ValueError("config에 owner_slack_id 또는 owner_nickname 중 하나는 있어야 합니다.")

    if config.get("mode") == "favorites":
        favs = set(config.get("favorites", []))
        pool = [m for m in pool if m["nickname"] in favs]

    return pool


def pick_recipient(config, members, state):
    """
    공정 순환 규칙:
    1) 아직 한 번도 안 준 사람이 있으면 그 사람부터 (명단 순서대로).
    2) 모두 한 번 이상 받았으면, 가장 적게 받은 사람 중 '가장 오래전에 받은' 사람.
    이렇게 하면 자연스럽게 11명이 골고루 한 바퀴씩 돌아갑니다.
    """
    pool = eligible_recipients(config, members)
    if not pool:
        raise ValueError("받을 수 있는 조원이 없습니다. config의 mode/favorites를 확인하세요.")

    counts = state.get("given_count", {})
    history = state.get("history", [])
    last_given_index = {h["nickname"]: i for i, h in enumerate(history)}

    def sort_key(m):
        nick = m["nickname"]
        received = counts.get(nick, 0)
        # 아직 안 받은 사람은 last_given을 -1로 둬서 최우선
        last_idx = last_given_index.get(nick, -1)
        return (received, last_idx)

    pool_sorted = sorted(pool, key=sort_key)
    return pool_sorted[0]


def pick_comment(config, seed=None):
    comments = config.get("comments") or ["오늘의 셀 보내드려요!"]
    if seed is not None:
        random.seed(seed)
    return random.choice(comments)


def record_given(state, member, today=None):
    """준 기록을 state에 남깁니다."""
    today = today or date.today().isoformat()
    nick = member["nickname"]
    state.setdefault("given_count", {})
    state.setdefault("history", [])
    state["given_count"][nick] = state["given_count"].get(nick, 0) + 1
    state["history"].append({
        "date": today,
        "nickname": nick,
        "name": member.get("name", ""),
        "slack_id": member.get("slack_id", ""),
    })
    return state


def plan_today(commit=False, today=None):
    """오늘 누구에게 줄지 계산해서 돌려줍니다. commit=True면 기록까지 저장."""
    config = load_json(CONFIG_PATH)
    members = load_json(MEMBERS_PATH)
    state = load_state()

    target = pick_recipient(config, members, state)
    today = today or date.today().isoformat()
    comment = pick_comment(config, seed=today)  # 날짜별로 코멘트 고정(재실행해도 동일)

    command = f"/셸보내기 @{target['nickname']} {comment}"

    if commit:
        record_given(state, target, today=today)
        save_json(STATE_PATH, state)

    return {
        "date": today,
        "target": target,
        "comment": comment,
        "command": command,
        "mode": config.get("mode"),
    }


def show_distribution():
    """지금까지 누구에게 몇 번 줬는지 요약."""
    state = load_state()
    counts = state.get("given_count", {})
    return dict(sorted(counts.items(), key=lambda x: -x[1]))


if __name__ == "__main__":
    import sys
    commit = "--commit" in sys.argv
    result = plan_today(commit=commit)
    print("=" * 48)
    print(f"  오늘 날짜 : {result['date']}")
    print(f"  순환 모드 : {result['mode']}")
    print(f"  오늘의 대상: {result['target']['nickname']} ({result['target']['name']})")
    print(f"  보낼 명령 : {result['command']}")
    print("=" * 48)
    if commit:
        print("\n[기록 저장됨] 지금까지 분배 현황:")
        for nick, cnt in show_distribution().items():
            print(f"   - {nick}: {cnt}회")
    else:
        print("\n(미리보기 모드입니다. 실제 기록은 --commit 옵션을 붙여야 저장됩니다.)")
