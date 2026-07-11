---
name: Notion DB 사용 가이드
description: 2026-05-11 변경 — 대표OS 잘 안 씀. 신규 프로젝트는 별도 DB. 기존 Nova ID는 참고용.
type: feedback
originSessionId: 9f2acf25-e6d1-4993-a00e-2d13531eb78e
---
**2026-05-11 변경:** 사용자가 대표OS [Nova] 시리즈 잘 안 씀. 신규 프로젝트는 별도 DB 사용.

**기존 Nova DB (참고용 보존):**
- 미션 DB: 2ce7def7-859f-81d0-b7c4-fca5697722e3
- 프로젝트 DB: 2ce7def7-859f-8197-8c98-c2c416ecf118
- 지식 DB: 2ce7def7-859f-81ab-b0eb-d4db12425bb9

**현재 활성 DB:**
- 카드뉴스 큐: "대표 지도 콘텐츠 기획안" — `2c17def7-859f-810f-9c76-e134d23da654`
  - 필터: `Status=아이데이션 AND 카테고리 contains 카드뉴스`
  - 완료 후: `Status=작성완료`
  - 페이지 본문에 메모·인스타 링크·뉴스 URL 자유 첨부 (모바일 입력)
  - 시드 페이지: 35d7def7-859f-81c0-a8bb-de964e6775c1

**How to apply:** 새 프로젝트마다 어떤 DB 쓸지 사용자에게 묻거나, 기획 단계에서 명확한 의도가 있으면 신설. 대표OS 자동 사용 금지.
