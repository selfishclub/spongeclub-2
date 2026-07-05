# Agent Orchestration

## 자주 쓰는 에이전트

| Agent | 용도 |
|-------|------|
| general-purpose | 다목적 조사, 멀티스텝 작업 |
| Explore | 코드베이스 빠른 탐색/grep |
| code-reviewer | 코드 작성 후 리뷰 |
| architect | 시스템 설계 결정 |
| security-reviewer | 인증/시크릿/입력 처리 후 |
| python-reviewer | Python 코드 리뷰 |
| typescript-reviewer | TS/JS 코드 리뷰 |
| planner | 복잡한 기능 설계 |

## 호출 원칙

- 독립적 작업 2개 이상 → 단일 메시지 다중 Agent 호출 (병렬)
- 서브에이전트는 새 컨텍스트로 시작하므로 프롬프트에 필요한 맥락 모두 포함
- 기능 단위로 명확한 산출물 지정
