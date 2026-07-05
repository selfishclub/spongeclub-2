---
name: 토스 미니앱 개발 — 공식 자원만 사용
description: 토스/앱인토스 작업 시 무조건 공식 문서·공식 스킬·공식 MCP 우선. 추측·블로그·일반 가이드 금지 (2026-05-05)
type: feedback
originSessionId: e66be60a-08e5-4489-b172-7616fe1a6e4a
---
토스 미니앱(앱인토스) 개발/입점 작업 시 다음 자원만 참조한다.

## 공식 자원

| 자원 | 위치 |
|---|---|
| 공식 문서 | https://developers-apps-in-toss.toss.im/ |
| 공식 스킬 | `knowledge-skills:docs-search` (Skill 도구로 호출) |
| 공식 스킬 | `knowledge-skills:project-validator` (granite.config.ts 검증) |
| 공식 MCP | `apps-in-toss` (`ax mcp start` via plugin) |
| Plugin marketplace | `toss/apps-in-toss-skills` |

## Why
사용자가 IsThisFair 입점 작업 중 "appName이 다릅니다" 에러 발생 (2026-05-05). 내가 application_draft.md에 `intoss://isthisfair` 권장값 적었지만 granite.config.ts·콘솔 매칭 룰 정확히 모른 채 작업해서 엉킴. 공식 자원 미사용 = 추측 작업 = 입점 단계 손실.

## How to apply
- 토스 작업 시 첫 액션은 `knowledge-skills:docs-search` 또는 `apps-in-toss` MCP 호출
- granite.config.ts 변경 후엔 `knowledge-skills:project-validator`로 검증
- 모르는 spec(appName 형식, IAP, mTLS, 콜백 등) WebFetch 추측 금지 → docs-search 사용
- 비몽사몽해몽·고단백 거지맵 등 다른 토스 미니앱 작업에도 동일 적용
