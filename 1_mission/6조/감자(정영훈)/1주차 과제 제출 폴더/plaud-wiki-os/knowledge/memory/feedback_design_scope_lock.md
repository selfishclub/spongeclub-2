---
name: 디자인 변경 범위 고정
description: "텍스트 배치/디자인 톤 변경" 지시 시 슬라이드 구조·흐름·아키텍처 건드리지 말 것
type: feedback
originSessionId: 5afe73a8-a88f-4d7a-8919-b44dd848f5da
---
"X를 Y 스타일로 바꿔라"는 지시는 **시각 표현만**이지 구조·흐름·아키텍처가 아니다.

- "텍스트 배치를 Blinked로" → typography(폰트·크기·letter-spacing)만. 슬라이드 수·plan 구조·렌더 파이프라인 건드리지 마라
- "색상은 그대로" → 디자인 토큰 색상값 변경 금지
- "디자인 시스템 유지" → 컴포넌트(pill·accent-bar·gradient)는 그대로

**Why:** 2026-05-13 v16 Blinked 패턴 사용자 만족 → "Merge" 지시 받음. 슬라이드를 5장으로 줄이고 plan.json 구조까지 다 바꿨더니 사용자가 "야 씨발아 장수를 5장으로 바꿔버리면 어떻게 해. 텍스트 배치를 블링크애드로 만들라는거였지"라고 격앙. 4파일(run_text·run_image·trigger_worker·notion_uploader) 전면 롤백 필요했음.

**How to apply:**
1. "디자인을 X로" 지시 받으면 변경 범위를 **CSS/typography 파일 1개**로 제한
2. 슬라이드 수, archetype, 데이터 구조, 파이프라인 흐름은 명시적 지시 없으면 그대로
3. 머지 작업 시 AS-IS/TO-BE를 _시각 변경분만_으로 좁혀 컨펌. 흐름/구조 변경 들어가면 별도 항목으로 분리해 명시적 동의 받기
