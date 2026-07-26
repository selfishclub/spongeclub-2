# -*- coding: utf-8 -*-
"""
방식 B: 브라우저 완전자동 (아람님 PC 전용)
------------------------------------------------
매일 밤, 아람님 PC에서 실제 Slack 웹을 열어 '/셀 전달하기 @닉네임 코멘트' 를
사람이 입력하듯 타이핑하고 전송합니다. 진짜 0-탭 완전 자동.

Slack은 봇/API가 다른 앱의 슬래시 명령을 대신 실행할 수 없기 때문에,
이 방식만이 셀을 100% 무인으로 실제 전달할 수 있습니다.

준비 (최초 1회):
  pip install playwright
  playwright install chromium
  python auto_send.py --login     # 창이 뜨면 Slack에 직접 로그인 → 콘솔에서 Enter
그 다음부터:
  python auto_send.py             # 로그인 세션 재사용해서 자동 전송
  python auto_send.py --dry-run   # 계산만, 실제 전송은 안 함

* Slack UI가 바뀌면 셀렉터 보정이 필요할 수 있어요. 처음엔 --headful 로 눈으로 확인하세요.
"""

import os
import sys
import time

import rotation

BASE = os.path.dirname(os.path.abspath(__file__))
PROFILE_DIR = os.path.join(BASE, ".slack_profile")  # 로그인 세션 저장 폴더 (gitignore)

# 5조 채널 URL. 워크스페이스/채널 ID는 config·members에서 가져옵니다.
WORKSPACE = "https://app.slack.com/client"


COMPOSER = '[data-qa="texty_input"]'   # Slack 메시지 입력창
SLASH_COMMAND = "/셸보내기"            # 스폰지셸봇의 실제 명령어 (셀 아님, 띄어쓰기 없음)
CONFIRM_PHRASE = "셸을 보냈어요"        # 셸봇 확인 메시지에 들어가는 문구


def count_confirms(page):
    """채널에 보이는 '셀을 보냈어요' 확인 메시지 개수. (텍스트가 여러 태그로
    쪼개져 있어 locator로는 안 잡히므로 본문 전체 텍스트에서 직접 셈)"""
    return page.evaluate(
        "(p) => (document.body ? document.body.innerText.split(p).length - 1 : 0)",
        CONFIRM_PHRASE,
    )


def clear_composer(page, box):
    """입력창에 남아있는 draft(임시저장 글)를 완전히 비웁니다.
    이걸 안 하면 예전 글자 위에 덧붙여져 명령이 깨집니다."""
    # 자동완성 팝업이 클릭을 가로막을 수 있으므로 click 대신 locator.press로 포커스+입력
    for _ in range(4):
        if box.inner_text().strip() == "":
            return True
        try:
            box.press("Escape")          # 열려있는 자동완성/명령 팝업 닫기
            page.wait_for_timeout(250)
            box.press("Control+a")
            page.wait_for_timeout(200)
            box.press("Delete")
            page.wait_for_timeout(400)
        except Exception:
            page.wait_for_timeout(400)
    return box.inner_text().strip() == ""


def get_channel_url():
    """앱 클라이언트 주소로 직접 접속(중간 리디렉션 없음)."""
    members = rotation.load_json(rotation.MEMBERS_PATH)
    config = rotation.load_json(rotation.CONFIG_PATH)
    team = config["team"]
    channel_id = members[team]["channel_id"]
    team_id = os.environ.get("SLACK_TEAM_ID") or members.get("team_id", "")
    return f"https://app.slack.com/client/{team_id}/{channel_id}"


def run(dry_run=False, login=False, headful=False):
    from datetime import datetime
    print(f"\n===== 실행 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} =====")
    result = rotation.plan_today(commit=False)  # 전송 성공 후에만 commit
    target = result["target"]
    comment = result["comment"]
    print(f"오늘의 대상: {target['nickname']}({target['name']}) / 코멘트: {comment}")

    if dry_run:
        print("[DRY-RUN] 실제 전송하지 않습니다.")
        return

    from playwright.sync_api import sync_playwright

    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            PROFILE_DIR,
            headless=not (headful or login),
            args=["--disable-blink-features=AutomationControlled"],
        )
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        if login:
            page.goto(get_channel_url(), wait_until="domcontentloaded", timeout=60000)
            print("\n>>> 새로 뜬 창에서 Slack에 로그인하세요.")
            print(">>> 로그인해서 5조 채널이 보이면 자동으로 저장됩니다. (최대 5분 대기)")
            try:
                page.wait_for_selector(COMPOSER, timeout=300000)  # 로그인 성공=입력창 보임
                page.wait_for_timeout(2000)
                print("\n[로그인 세션 저장 완료] 이제 --login 없이 실행하면 자동 전송됩니다.")
            except Exception:
                print("\n[시간 초과] 로그인이 확인되지 않았어요. 다시 시도해 주세요.")
            ctx.close()
            return

        page.goto(get_channel_url(), wait_until="domcontentloaded", timeout=60000)

        # 입력창 찾기 (Slack 메시지 composer)
        box = page.locator(COMPOSER)
        box.wait_for(state="visible", timeout=30000)

        # 메시지 목록이 렌더링될 때까지 대기 (검증 정확도를 위해 필수)
        page.wait_for_timeout(8000)

        # 전송 전, 기존 '셀 보냈어요' 확인 메시지 개수 기록 (검증용)
        before = count_confirms(page)

        # 0) 입력창에 남은 draft 완전 제거 (필수! 안 하면 명령이 깨짐)
        if not clear_composer(page, box):
            print("[중단] 입력창을 비우지 못했습니다. 남은 내용:", repr(box.inner_text()[:80]))
            ctx.close()
            sys.exit(1)

        # 1) 슬래시 명령 입력 (뒤에 공백을 넣어 명령을 확정하고 자동완성 팝업을 닫음)
        box.type(SLASH_COMMAND + " ", delay=60)
        page.wait_for_timeout(1500)

        # 2) 받는 사람 멘션: @닉네임 입력 후 자동완성에서 첫 항목 선택
        box.type(f"@{target['nickname']}", delay=80)
        page.wait_for_timeout(1500)
        page.keyboard.press("Enter")   # 멘션 자동완성 선택
        page.wait_for_timeout(500)

        # 3) 코멘트 입력 후 전송
        box.type(f" {comment}", delay=40)
        page.wait_for_timeout(500)
        page.keyboard.press("Enter")   # 전송
        page.wait_for_timeout(4000)

        # 4) 검증: 셸봇 확인 메시지가 새로 생겼는지 폴링(최대 30초).
        #    셸봇 응답이 늦게 렌더링되므로 한 번만 보고 판단하면 성공을 실패로 오판함.
        after, composer_cleared, success = before, False, False
        for _ in range(15):
            page.wait_for_timeout(2000)
            after = count_confirms(page)
            composer_cleared = (box.inner_text().strip() == "")
            if after > before or composer_cleared:
                success = True
                break
        if not success:
            page.screenshot(path="last_failure.png")   # 실패 시 화면 저장(원인 파악용)
        ctx.close()

    if success:
        state = rotation.load_state()
        rotation.record_given(state, target, today=result["date"])
        rotation.save_json(rotation.STATE_PATH, state)
        print(f"[성공] {result['date']} {target['nickname']}({target['name']})에게 셀 전달 확인됨. 기록 저장.")
    else:
        print(f"[실패/미확인] {result['date']} {target['nickname']} 전송 확인 실패 "
              f"(before={before}, after={after}, cleared={composer_cleared}). 기록 저장 안 함.")
        sys.exit(1)


if __name__ == "__main__":
    run(
        dry_run="--dry-run" in sys.argv,
        login="--login" in sys.argv,
        headful="--headful" in sys.argv,
    )
