# -*- coding: utf-8 -*-
"""
셸 기회 감지 알림봇 (수집봇 ①)
--------------------------------------------------
셸을 벌 수 있는 기회(선착순 이벤트, 공유회 개최 모집, 셸 지급 공지 등)가
채널에 올라오면 감지해서 내 Slack DM으로 즉시 알려줍니다.

선착순 이벤트는 속도가 생명이라, 놓치면 사라지는 기회를 잡아주는 게 목적입니다.
(실제 참여는 아람님이 직접 합니다 — 봇이 대신 참여하지 않습니다)

실행:
  python collector.py            # 새 기회 감지 → DM 알림
  python collector.py --dry-run  # 감지만 하고 DM은 안 보냄
  python collector.py --reset    # 기준점 초기화(현재 메시지를 모두 '읽음' 처리)
"""

import hashlib
import json
import os
import sys
from datetime import datetime

import auto_send
import rotation

BASE = os.path.dirname(os.path.abspath(__file__))
SEEN_PATH = os.path.join(BASE, "collector_seen.json")

# 감시할 채널 (셸 기회가 올라오는 곳)
WATCH_CHANNELS = [
    {"id": "C0B0UKLEMJL", "name": "00-공통-전체공지"},
    {"id": "C0BCXBSS0LB", "name": "2기-공지사항"},
    {"id": "C0BD3HPDPPF", "name": "이기적스폰지공유회-신청"},
    {"id": "C0BD0KH4UQK", "name": "03-공통-유닛-sns-똑딱"},
    {"id": "C0BD4Q7RK5L", "name": "2기-5조-치코"},
]

# 셸 기회를 뜻하는 신호어
KEYWORDS = [
    "선착순", "이벤트", "셸 지급", "셸지급", "셸을 드", "셸 드려", "셸 드립니다",
    "+1셸", "셸 1개", "셸1개", "셸 2개", "셸 3개", "셸 5개", "셸 10개", "셸 20개",
    "개최자", "개최 모집", "공유회 개최", "개최하실", "모집합니다", "모집중",
    "인증하시", "인증하면", "참여하시면", "참여하면", "증정", "드리겠습니다",
]

# 알림에서 제외할 잡음 (일상적인 셸 주고받기 봇 메시지)
NOISE = ["오늘의 셸을 보냈어요", "SNS 인증으로 +1"]

SELF_DM = "D0BCVUYVDC7"   # 아람님 본인 DM 채널


def load_seen():
    if os.path.exists(SEEN_PATH):
        return set(json.load(open(SEEN_PATH, encoding="utf-8")))
    return set()


def save_seen(seen):
    json.dump(sorted(seen), open(SEEN_PATH, "w", encoding="utf-8"),
              ensure_ascii=False, indent=0)


def msg_key(channel_id, text):
    return hashlib.sha1(f"{channel_id}|{text[:200]}".encode("utf-8")).hexdigest()[:16]


def channel_url(channel_id):
    members = rotation.load_json(rotation.MEMBERS_PATH)
    team_id = members.get("team_id", "")
    return f"https://app.slack.com/client/{team_id}/{channel_id}"


def scrape_messages(page, channel_id):
    """채널의 최근 메시지 텍스트 목록을 가져옵니다."""
    page.goto(channel_url(channel_id), wait_until="domcontentloaded", timeout=60000)
    try:
        page.wait_for_selector('[data-qa="message_content"]', timeout=25000)
    except Exception:
        return []
    page.wait_for_timeout(3500)
    return [t.strip() for t in
            page.locator('[data-qa="message_content"]').all_text_contents() if t.strip()]


def is_opportunity(text):
    if any(n in text for n in NOISE):
        return False
    return any(k in text for k in KEYWORDS)


def build_alert(found):
    lines = [f":rotating_light: *셸 기회 발견!* ({datetime.now().strftime('%m/%d %H:%M')})", ""]
    for f in found:
        preview = " ".join(f["text"].split())[:180]
        # 브라우저로 직접 입력하므로 <url|텍스트> 문법은 쓸 수 없음 (그냥 글자로 나옴).
        # 평문 URL을 넣으면 Slack이 자동으로 링크로 만들어 줍니다.
        lines.append(f"[#{f['channel']}] {preview}\n{f['url']}")
    lines.append("\n_선착순이면 서두르세요!_")
    return "\n".join(lines)


def send_dm(page, message):
    """본인 DM으로 알림 전송."""
    page.goto(channel_url(SELF_DM), wait_until="domcontentloaded", timeout=60000)
    box = page.locator(auto_send.COMPOSER)
    box.wait_for(state="visible", timeout=30000)
    page.wait_for_timeout(2500)
    auto_send.clear_composer(page, box)
    for line in message.split("\n"):
        box.type(line, delay=8)
        page.keyboard.press("Shift+Enter")   # 줄바꿈(전송 아님)
    page.wait_for_timeout(400)
    box.press("Enter")
    page.wait_for_timeout(2500)


def run(dry_run=False, reset=False):
    print(f"\n===== 수집봇 실행 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} =====")
    seen = set() if reset else load_seen()
    first_run = reset or not os.path.exists(SEEN_PATH)
    found = []

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(auto_send.PROFILE_DIR, headless=True,
                                                   viewport={"width": 1280, "height": 900})
        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        for ch in WATCH_CHANNELS:
            try:
                msgs = scrape_messages(page, ch["id"])
            except Exception as e:
                print(f"  [건너뜀] #{ch['name']}: {e}")
                continue
            new_hits = 0
            for text in msgs:
                key = msg_key(ch["id"], text)
                if key in seen:
                    continue
                seen.add(key)
                if is_opportunity(text):
                    new_hits += 1
                    found.append({"channel": ch["name"], "text": text,
                                  "url": channel_url(ch["id"])})
            print(f"  #{ch['name']}: 메시지 {len(msgs)}개 / 새 기회 {new_hits}개")

        if first_run and not dry_run:
            print("\n[첫 실행] 현재 메시지를 기준점으로 저장했습니다. "
                  "다음 실행부터 '새로 올라온' 기회만 알려드려요.")
            found = []

        if found and not dry_run:
            send_dm(page, build_alert(found))
            print(f"\n[DM 발송] 기회 {len(found)}건 알림 완료")
        elif found:
            print("\n[DRY-RUN] 발송 안 함. 감지된 기회:")
            for f in found:
                print("   -", f["channel"], ":", " ".join(f["text"].split())[:120])
        else:
            print("\n새로운 셸 기회 없음.")

        ctx.close()

    save_seen(seen)


if __name__ == "__main__":
    run(dry_run="--dry-run" in sys.argv, reset="--reset" in sys.argv)
