---
name: iMessage 리스너 데몬
description: iMessage self-chat 자동 폴링 리스너 — 30초 간격, claude -p Sonnet 처리, AppleScript 응답
type: project
originSessionId: fd3ffdbc-0543-44cb-84c9-d12a1c94182a
---
iMessage self-chat 원격 명령 시스템 가동 중 (2026-04-07)

**Why:** 사용자가 자리 비울 때 iMessage로 터미널 제어 필요. 기존에는 플러그인이 수동 조회만 가능(push 없음)하여 메시지 무응답.

**How to apply:**
- 리스너 위치: `~/.claude/channels/imessage/listener.py`
- launchd 활성: `com.claude.imessage-listener` (PID 1595, 4/12부터 가동) — 이전 메모리 "launchd 불가" 거짓 (2026-05-07 정정)
- 수동 재시작 시: launchctl unload/load 또는 nohup
- allowlist: `[연락처]` + `[연락처]` (폰번호)
- 응답 태그: "— Claude (auto-reply)" (무한루프 방지)
- 텔레그램 채널은 페어링 미완, 별도 설정 필요
