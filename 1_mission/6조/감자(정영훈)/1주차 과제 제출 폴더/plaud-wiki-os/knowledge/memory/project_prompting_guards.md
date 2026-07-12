---
name: Prompting Guards (UserPromptSubmit / Session Registry)
description: 사용자 프롬프팅 실수를 훅으로 구조적 차단하는 시스템. 단답/중복/세션충돌/디자인레퍼런스 4종 가드. 설치 2026-04-21, 4번 추가 2026-05-11.
type: project
originSessionId: ad111284-233f-4986-9263-fda247839cc5
---
2026-04-19 주간 프롬프팅 분석에서 드러난 반복 실수를 훅으로 자동 감지·경고하는 시스템. 설치 2026-04-21.

**Why:** 분석 결과가 "읽히기만 하고 행동으로 안 내려옴"이 최대 문제였음. "네가 더 잘해" 대신 훅/레지스트리로 구조적 차단. 차단은 아니고 관성 깨기가 목적(exit 0, additionalContext 주입).

**설치된 가드:**
1. `~/.claude/hooks/short-answer-guard.sh` — 3자 이하/화이트리스트(`ㅇㅇ`, `ㄱㄱ`, `1`, `a` 등) 단답 감지 → Claude에게 "첫 줄에서 이유·기대 되묻기" 지시 주입
2. `~/.claude/hooks/duplicate-detector.sh` — 60초 내 동일 프롬프트(정규화 비교) 감지 → "제약 누적 형태로 전환" 지시 주입. jsonl 마지막 엔트리는 자기 자신이므로 제외.
3. `~/.claude/hooks/session-register.sh` + `session-unregister.sh` — `~/.claude/sessions/active.json` 유지. 같은 cwd로 다른 세션 열리면 "이 폴더 다른 세션 작업 중" 경고 주입
4. `/session-registry` 슬래시 커맨드 — 살아있는 세션 즉시 조회
5. `~/.claude/hooks/design-reference-guard.sh` (2026-05-11 추가) — 카피·디자인·문서·IR·카드뉴스·랜딩·.pen·pptx 등 키워드 + 레퍼런스 명시(`참고/reference/.html/.pen` 또는 파일 경로) 없을 때 → "참고할 .pen/HTML/PDF 경로?" 1줄 확인 강제. `feedback_design_html_reference_sop` 자동 발화. 의도: 추상 디자인 시스템 설계 대신 reference 기반 모방으로 유도.

**wire-up:** `~/.claude/settings.json`
- UserPromptSubmit: log-prompt.sh → short-answer-guard.sh → duplicate-detector.sh → design-reference-guard.sh (순서대로)
- SessionStart: ccbot hook + session-register.sh (gstack-session-update는 스킬 비활성화로 2026-05-11 제거됨)
- SessionEnd: ccbot stop + session-unregister.sh

**How to apply:**
- 튜닝 요청 오면("단답 허용 범위 좀 줄여/늘려", "중복 감지 60초 → 30초") 스크립트 직접 수정
- 오탐 많으면 화이트리스트 조정 (short-answer-guard.sh 내부 리스트)
- 새 터미널에서 Claude Code 열 때부터 적용됨 (기존 세션엔 미적용)
- 관련: `feedback_prompt_logging.md`(주간 분석 시스템), 2026-04-19 분석 파일(`~/.claude/logs/prompt-analysis/2026-04-19-weekly.md`)

**미구현(보류):** "되돌리기 비싼 위임 감지"(`전부 고쳐`, `알아서 해` 트리거). 오탐 우려로 4번은 설치 안 함. 1~3번 효과 관찰 후 재고.
