# -*- coding: utf-8 -*-
"""
SNS 인증 도우미 (수집봇 ③)
--------------------------------------------------
아람님이 **실제로 올린** SNS 게시물 링크를 주면, /sns인증 제출을 자동화합니다.
관리자 승인 후 +1셸을 받게 됩니다.

⚠️ 이 도구는 '실제 게시물이 있을 때 제출을 대신 해주는' 용도입니다.
   게시물 없이 인증을 자동으로 쏘는 기능은 의도적으로 넣지 않았습니다.
   (관리자가 일일이 승인하는 구조라 허위 인증은 걸리고, 클럽 보상 규칙에 어긋납니다)

사용:
  python sns_verify.py https://www.instagram.com/p/XXXXXXX/
  python sns_verify.py <링크> --dry-run    # 입력만 확인하고 제출 안 함
"""

import sys
from datetime import datetime

import auto_send

SNS_COMMAND = "/sns인증"
CONFIRM_PHRASE = "SNS 인증으로 +1"


def looks_like_url(s):
    return s.startswith("http://") or s.startswith("https://")


def run(link, dry_run=False):
    print(f"\n===== SNS 인증 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} =====")
    print("링크:", link)

    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(auto_send.PROFILE_DIR, headless=True,
                                                   viewport={"width": 1280, "height": 950})
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(auto_send.get_channel_url(), wait_until="domcontentloaded", timeout=60000)
        box = page.locator(auto_send.COMPOSER)
        box.wait_for(state="visible", timeout=30000)
        page.wait_for_timeout(8000)

        before = page.evaluate(
            "(p) => (document.body ? document.body.innerText.split(p).length - 1 : 0)",
            CONFIRM_PHRASE)

        auto_send.clear_composer(page, box)
        # 1) 인라인 형태로 시도: /sns인증 <링크>
        box.type(SNS_COMMAND + " ", delay=60)
        page.wait_for_timeout(1500)
        box.type(link, delay=25)
        page.wait_for_timeout(800)
        print("입력창:", repr(box.inner_text()[:120]))

        if dry_run:
            print("[DRY-RUN] 제출하지 않고 종료합니다.")
            auto_send.clear_composer(page, box)
            ctx.close()
            return

        box.press("Enter")
        page.wait_for_timeout(5000)

        # 2) 링크 입력 창(모달)이 뜨는 방식이면 여기서 처리
        dialog = page.locator('[role="dialog"]')
        if dialog.count() > 0:
            print("[모달 감지] 링크 입력 창이 떴습니다. 채워서 제출합니다.")
            page.screenshot(path="_sns_dialog.png")
            inputs = dialog.locator('input[type="text"], input[type="url"], textarea')
            if inputs.count() > 0:
                inputs.first.fill(link)
                page.wait_for_timeout(500)
                for label in ["제출", "확인", "Submit", "저장"]:
                    try:
                        dialog.get_by_role("button", name=label).click(timeout=2500)
                        print("  제출 버튼 클릭:", label)
                        break
                    except Exception:
                        continue
            page.wait_for_timeout(5000)

        # 3) 검증: 인증 확인 메시지가 새로 떴는지 폴링
        success = False
        for _ in range(10):
            page.wait_for_timeout(2000)
            after = page.evaluate(
                "(p) => (document.body ? document.body.innerText.split(p).length - 1 : 0)",
                CONFIRM_PHRASE)
            if after > before:
                success = True
                break

        page.screenshot(path="_sns_result.png")
        ctx.close()

    if success:
        print("[성공] SNS 인증 제출 완료 — 관리자 승인 후 +1셸이 지급됩니다.")
    else:
        print("[확인 불가] 인증 확인 메시지를 찾지 못했습니다. "
              "_sns_result.png 를 열어 실제 화면을 확인해 주세요.")
        sys.exit(1)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args or not looks_like_url(args[0]):
        print("사용법: python sns_verify.py <실제 올린 SNS 게시물 링크> [--dry-run]")
        print("예시:   python sns_verify.py https://www.instagram.com/p/XXXXXXX/")
        sys.exit(2)
    run(args[0], dry_run="--dry-run" in sys.argv)
