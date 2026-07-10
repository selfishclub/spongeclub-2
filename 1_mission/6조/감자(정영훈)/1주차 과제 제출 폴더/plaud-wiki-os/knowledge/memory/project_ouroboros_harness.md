---
name: project-ouroboros-harness
description: "Ouroboros Agent OS로 하네스 전면 교체 중 — 1단계 설치 완료, 2단계 보류"
metadata: 
  node_type: memory
  type: project
  originSessionId: 75d24158-e886-4728-9169-da4e3749fe47
---

Ouroboros(Q00/ouroboros, "Agent OS" — 스펙 우선 워크플로우 interview→crystallize→execute→evaluate→evolve)로 Claude Code 하네스를 **전면 교체**하기로 결정 (2026-06-03).

**1단계 완료 (2026-06-03):**
- `claude plugin marketplace add Q00/ouroboros` + `claude plugin install ouroboros@ouroboros` → v0.40.1 (user scope)
- 플러그인 경로: `~/.claude/plugins/cache/ouroboros/ouroboros/0.40.1`
- MCP는 `uvx --from 'ouroboros-ai[mcp,claude]' ouroboros mcp serve`로 구동 (uv 0.11.1 설치됨, 캐시 예열 완료)
- Python 3.13.5 OK

**다음 액션:** 사용자가 Claude 재시작 → 새 세션에서 `/ouroboros:setup` 실행 (MCP 전역 등록 + 선택적 CLAUDE.md 블록 추가).

**2단계 보류 (의도적):** 기존 하네스(superpowers, 자체 CLAUDE.md 업무수신 프로세스, 다수 스킬) 정리/교체는 Ouroboros가 실제 워크플로우에서 검증된 뒤 별도 컨펌으로 진행. setup의 CLAUDE.md 자동 병합은 멈추고 수동 백업 후 정리 — 형님 CLAUDE.md가 매우 커스텀(거래처 규제 게이트 §4.2 등)이라 자동 병합 위험.

롤백: `ouroboros uninstall` 또는 `claude plugin uninstall ouroboros@ouroboros`.
