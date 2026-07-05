---
name: Pencil 작업은 항상 새 파일
description: Pencil MCP로 새 디자인/시범/변환 작업 시 무조건 새 .pen 파일을 cp/생성해서 시작. 임시 메모리 작업 금지
type: feedback
originSessionId: 7c2c3bb0-2589-4e43-99a8-b2da8acc8fbb
---
Pencil MCP로 새 작업할 때는 항상 별도 .pen 파일을 cp나 신규 생성으로 만들어서 시작해라. 기존 파일에 직접 임시 작업 금지.

**Why:** Pencil MCP는 변경분을 메모리에서만 들고 있다가 서버 끊기거나 open_document 재호출되면 디스크 저장 안 된 상태로 휘발됨. 시범/변환 작업을 원본에 임시로 만들면 사용자가 확인하기 전에 날아가는 사고가 반복됨 (2026-05-05 toss 톤 변환 23슬라이드 휘발 사고).

**How to apply:**
- Pencil 신규 작업 첫 단계 = `cp 원본.pen 새이름.pen` 또는 `open_document("new")` → 그 파일에서만 작업
- 시범/A/B 비교도 새 파일에서. 원본에 "임시 노드"로 만들지 마라
- 작업 완료 후 즉시 export(PDF/PNG)로 디스크 flush까지 같은 호출 사이클 안에서 끝낼 것
