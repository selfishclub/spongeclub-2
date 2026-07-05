---
name: notion-emoji-as-icon
description: Notion 미션 등록 시 이모지는 제목이 아닌 페이지 아이콘으로 설정
type: feedback
---

미션 등록 시 이모지를 제목 텍스트에 넣지 말고, 페이지 icon 속성으로 설정할 것.

**Why:** 사용자가 제목에 이모지 넣는 것을 싫어함. Notion UI에서 아이콘으로 보이는 게 깔끔.
**How to apply:** mcp__notion__API-post-page 호출 시 icon: {"emoji": "..."} 파라미터 사용.
