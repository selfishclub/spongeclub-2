# -*- coding: utf-8 -*-
"""
방식 A: 리마인더 + 원탭
------------------------------------
매일 정해진 시각에 '오늘의 셀 대상'을 계산해서,
아람님(owner)에게 Slack DM으로 '누구에게 줄지 + 바로 쓸 수 있는 명령어'를 보냅니다.
아람님은 알림을 보고 5조 채널에서 한 번만 보내면 끝.

- 외부 라이브러리 없이 Python 표준 기능(urllib)만 사용 → GitHub Actions에서 그대로 실행됨.
- 필요한 환경변수: SLACK_BOT_TOKEN (chat:write, im:write 권한)
"""

import json
import os
import sys
import urllib.request
import urllib.parse

import rotation

SLACK_API = "https://slack.com/api/"


def slack_call(method, token, payload):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        SLACK_API + method,
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json; charset=utf-8",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def open_dm(token, user_id):
    r = slack_call("conversations.open", token, {"users": user_id})
    if not r.get("ok"):
        raise RuntimeError(f"conversations.open 실패: {r.get('error')}")
    return r["channel"]["id"]


def build_message(result):
    t = result["target"]
    cmd = result["command"]
    return (
        f":shell: *오늘의 셀 순서 안내* ({result['date']})\n\n"
        f"오늘은 *{t['nickname']}({t['name']})* 님 차례예요!\n"
        f"아래를 5조 채널에서 보내주세요 👇 (`@{t['nickname']}` 는 입력창에서 직접 멘션으로 골라주세요)\n\n"
        f"```{cmd}```\n"
        f"_안 주면 자정에 사라지니 잊지 말고 오늘 안에 보내주세요!_"
    )


def main():
    token = os.environ.get("SLACK_BOT_TOKEN", "").strip()
    dry_run = "--dry-run" in sys.argv or not token

    result = rotation.plan_today(commit=not dry_run)
    message = build_message(result)

    if dry_run:
        print("[DRY-RUN] SLACK_BOT_TOKEN 없음 → 실제 전송 안 함. 미리보기:\n")
        print(message)
        return

    config = rotation.load_json(rotation.CONFIG_PATH)
    owner_id = config["owner_slack_id"]
    dm_channel = open_dm(token, owner_id)
    r = slack_call("chat.postMessage", token, {"channel": dm_channel, "text": message})
    if not r.get("ok"):
        raise RuntimeError(f"chat.postMessage 실패: {r.get('error')}")
    print(f"[전송 완료] {result['target']['nickname']} → DM ts={r.get('ts')}")


if __name__ == "__main__":
    main()
