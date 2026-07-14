---
name: macos-mail-app-applescript
description: 사용자 환경에서 Mail.app AppleScript 자동화가 권한 부재로 timeout(-1712). 자동 메일 발송 시 우회 경로 필요.
metadata: 
  node_type: memory
  type: reference
  originSessionId: 3ee1af43-2812-46e2-8879-02b251322e4e
---

## 증상

```bash
osascript -e 'tell application "Mail" to get name of every account'
# → Mail에 오류 발생: AppleEvent 시간이 초과되었습니다. (-1712)
```

Mail.app `activate` 후 `with timeout of 60 seconds` 로 wrap 해도 동일 timeout. 자동화 권한 미허용 또는 첫 launch dialog 잠금 상태로 추정.

## How to apply

- 자동 이메일 발송을 요구하는 작업에서 Mail.app AppleScript를 우선 시도하지 말 것
- 우회 옵션 우선순위:
  1. SendUserFile로 첨부물 직접 전달 + 사용자가 직접 메일 클라이언트에서 발송 (가장 빠름)
  2. Gmail SMTP (앱 비밀번호 필요) — Python smtplib, .env에 자격증명 저장
  3. Mail.app 자동화 권한을 시스템 환경설정 > 개인정보 보호 > 자동화에서 Terminal/Claude에 허용한 뒤 재시도
- 사용자에게 시간 끌지 말고 빠르게 옵션 제시 (Mail.app 디버깅에 매달리지 말 것)

## Why

2026-05-24 서비스M 보건복지부 사업계획서 보완 작업에서 자동 발송 시도했으나 timeout. 우회 1번(SendUserFile)으로 즉시 해결.
