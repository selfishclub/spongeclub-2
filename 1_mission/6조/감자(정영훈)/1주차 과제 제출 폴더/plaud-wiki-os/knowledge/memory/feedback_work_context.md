---
name: 작업 재개 시 git log 우선
description: "이어서 해" 같은 재개 요청 시 메모리보다 git log 최근 커밋을 먼저 확인할 것
type: feedback
originSessionId: 086cac45-bfdb-4f4e-a3d7-aa79f25d63ed
---
작업 재개 요청 시 메모리의 "다음 작업" 목록보다 `git log` 최근 커밋을 먼저 확인한다.

**Why:** 메모리는 마지막 저장 시점 기준이라 stale될 수 있음. 사용자가 "하던 작업 재개"를 요청했을 때 메모리만 보고 엉뚱한 폴더를 안내한 적 있음 (2026-03-31).

**How to apply:** 재개 요청이 오면 `git log --oneline -10` + `git status` 먼저 확인 → 실제 마지막 작업 파악 → 그 다음 메모리 참조.

**참고:** company-orchestrator는 폐기됨(2026-05-03). 회사 업무는 gbp-dashboard, marketing-dashboard, company-pipeline, company-web 등 개별 프로젝트 폴더에 분산.
