---
name: recall 자연어 검색
description: 과거 Claude 세션 jsonl을 SQLite FTS5로 인덱싱한 자연어 검색 시스템
type: project
originSessionId: 0065062e-36b4-49a3-9cd5-2162010e0736
---
과거 Claude 세션 자연어 검색 시스템 구축 완료 (2026-04-27).

**구성 요소:**
- 인덱서: `~/.claude/bin/recall-index.py` (Python, 의존성 0)
- CLI: `~/.claude/bin/recall` (검색)
- DB: `~/.claude/index/sessions.db` (SQLite FTS5)
- 슬래시 커맨드: `/recall <쿼리>`
- cron: 매일 03:00 증분 인덱싱

**현재 인덱싱 범위**: 현재 프로젝트 폴더만 (134개 파일, 8,859건). `--all` 플래그로 전체 프로젝트 확장 가능.

**Why**: "그때 GBP 진단 광고 어떻게 했지?" 같은 질문에 답하려면 자연어 검색이 필요. instinct 시스템(continuous-learning-v2)은 패턴 추출용이라 raw 대화 검색 안 됨.

**How to apply**:
- 사용자가 "그때 X 어떻게 했지?", "이전에 Y 한 적 있어?", "X 결정 어디서 했지?" 류 질문하면 `/recall` 또는 `recall "키워드"` 사용.
- 대형 작업 재개 시 git log + recall로 맥락 복원.
- 검색 안 되면 `recall --reindex`로 갱신.
