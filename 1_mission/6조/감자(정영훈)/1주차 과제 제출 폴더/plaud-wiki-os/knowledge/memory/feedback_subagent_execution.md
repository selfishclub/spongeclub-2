---
name: 구현은 항상 서브에이전트로
description: 구현 계획 실행 시 항상 서브에이전트 분산 방식 사용, 인라인 실행 선택지 제공 불필요
type: feedback
---

구현 계획 실행 시 항상 서브에이전트 분산(subagent-driven-development) 방식으로 진행.

**Why:** 사용자가 매번 서브에이전트를 선택하므로, 선택지를 물어보지 않고 바로 서브에이전트로 진행.

**How to apply:** 구현 계획이 확정되면 실행 방식을 묻지 말고 바로 superpowers:subagent-driven-development 스킬을 호출하여 진행.
