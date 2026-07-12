#!/usr/bin/env bash
# 헤드리스 claude로 공식 Plaud MCP에서 새 녹음 요약을 JSON으로 출력.
# 사용: ./fetch_plaud.sh 2026-07-01   (해당 날짜 이후 녹음. 생략 시 전체)
# 첫 실행 시 브라우저가 열리면 Plaud "Authorize" 클릭 필요(이후 토큰 자동 갱신).
set -euo pipefail
SINCE="${1:-1970-01-01}"

PROMPT="Plaud MCP 도구로 다음을 수행해라.
1) list_files를 date_from=${SINCE} 로 호출해 녹음 목록을 가져와라 (최대 50개).
2) 각 녹음에 대해 get_note로 AI 요약 노트를 가져와라 (note_list의 auto_sum_note 마크다운).
3) 401/Not authenticated 오류가 나면 login 도구를 호출해 인증 완료 후 재시도해라.
최종 출력은 다른 설명·코드펜스 없이 JSON 배열만:
[{\"id\":\"<파일 ID>\",\"title\":\"<이름>\",\"date\":\"YYYY-MM-DD\",\"summary\":\"<요약 마크다운>\"}]
녹음이 없으면 [] 만 출력. duration 등 다른 필드는 넣지 마라."

exec claude -p "$PROMPT" \
  --model sonnet \
  --allowedTools "mcp__plaud__login,mcp__plaud__get_current_user,mcp__plaud__list_files,mcp__plaud__get_file,mcp__plaud__get_note" \
  --output-format text
