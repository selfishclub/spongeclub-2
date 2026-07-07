---
name: API key .env 자동 오픈
description: 사용자가 API key 등 환경변수 추가해야 할 때 .env 파일을 자동으로 열어주기. 사용자가 경로 찾아가지 않게.
type: feedback
originSessionId: 5afe73a8-a88f-4d7a-8919-b44dd848f5da
---
API key·토큰·시크릿을 `.env`에 추가하라고 안내할 때, 사용자가 파일 경로 찾아 직접 열게 두지 말 것. 항상 `open <env_path>`를 자동 실행해서 편집기로 띄워준 뒤 안내한다.

**Why:** 사용자는 ADHD 성향 + 흐름 끊김 싫어함. "1분 작업"이라도 경로 찾기·터미널 진입·편집기 열기 3단계가 흐름 끊음. 1-step (이미 열린 파일에 붙여넣기)로 줄여야 사용자 손 안 가는 자동화 목적과 부합.

**How to apply:**
1. `.env`에 키 추가 안내 직전에 자동으로 `Bash`로 `open <abs_path>` 실행
2. 그 후 텍스트 안내 — "방금 열린 파일에 `KEY_NAME=값` 한 줄 추가하고 저장"
3. 자주 쓰는 경로 우선순위:
   - `~/.config/personal-brand/.env` — 카드뉴스 자동화
   - `~/Desktop/claude code/company-pipeline/.env` — 광고/Supabase/Meta
   - 프로젝트별 `.env` — 그 외
4. 키 추가 후 검증 명령 (있으면) 실행해서 확인까지 자동

**예외:** 사용자가 명시적으로 "내가 알아서 할게" 또는 "경로만 알려줘"라고 한 경우는 자동 오픈 생략.
