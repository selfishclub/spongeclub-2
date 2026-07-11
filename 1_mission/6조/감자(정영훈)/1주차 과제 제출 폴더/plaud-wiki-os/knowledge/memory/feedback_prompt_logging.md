---
name: Prompt Logging & Analysis System
description: 사용자의 모든 프롬프트가 자동 기록되고, 매일 업무일지/주간 분석이 생성되는 시스템. 호출 트리거 포함.
type: feedback
originSessionId: dfa1206b-31f3-4a5f-877e-f8d6b39d73ae
---
사용자의 모든 Claude Code 프롬프트는 UserPromptSubmit 훅으로 `~/.claude/logs/user-prompts/YYYY-MM-DD.jsonl`에 원문 그대로 자동 기록된다.

**Why:** 사용자가 (1) 세션 중단/터미널 종료 시 맥락 복원, (2) 본인의 프롬프팅 습관 고도화 (brain-dump → 구조화된 지시)를 원함. 2026-04-19에 구축.

**How to apply:**
- 훅 스크립트: `~/.claude/hooks/log-prompt.sh` (모든 세션에 전역 적용)
- 매일 23:00 KST — `com.claude.prompt-work-journal.plist`가 그날 프롬프트로 업무일지 생성 → `~/.claude/logs/work-journal/YYYY-MM-DD.md` (Sonnet 4.6 사용)
- 매주 일요일 23:30 KST — `com.claude.prompt-weekly-analysis.plist`가 지난 7일 프롬프팅 분석 → `~/.claude/logs/prompt-analysis/YYYY-MM-DD-weekly.md` (Opus 4.7 사용)

**호출 트리거 (사용자가 이 표현 쓰면 즉시 실행):**
- "프롬프팅 분석해" / "이번 주 프롬프팅 리뷰" → `~/.claude/logs/prompt-analysis/` 최신 파일 확인 or `prompt-weekly-analysis.sh` 수동 실행
- "업무 일지 뽑아줘" / "오늘 뭐 했어" → `~/.claude/logs/work-journal/` 최신 파일 확인 or `prompt-work-journal.sh` 수동 실행
- "프롬프트 기록 보여줘" → `~/.claude/logs/user-prompts/` 해당 날짜 jsonl 요약

**분석 관점 (주간 분석 기준):**
- 모호성 (목표/제약 부재)
- 맥락 부족 (앞 대화 참조 불명확)
- 목표-수단 혼동
- 방향 튼 지시 (같은 주제에서 말 바뀜)
- brain-dump vs 구조화된 지시 비율
- 반복 단축어/표현 패턴

**주의사항:**
- 민감 정보 포함 가능 — 로그는 로컬에만 보관, 외부 전송 금지
- 재개 시 `git log` 우선 규칙 유지 (feedback_work_context.md)
- 업무일지는 기존 `com.company.daily-journal.plist`(22:17)와 별개. 이건 "프롬프트 기반" 업무일지.
