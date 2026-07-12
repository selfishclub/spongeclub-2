---
name: 디자인 SOP — HTML Reference 기반 (2026-05-10)
description: AI에게 추상 디자인 시스템(변수·컴포넌트)으로 시키면 일관되게 AI slop 산출. 마음에 드는 reference의 HTML 코드를 직접 가져와서 템플릿화 → AI에게 그대로 만들라고 하는 방식이 ground truth. Pencil deck·카드뉴스·랜딩·리포트 등 모든 시각 산출물에 적용.
type: feedback
originSessionId: ef508474-d3c5-4c6b-bfba-fbcacdbf3e4c
---
## 핵심

1. **AI는 추상에서 디자인 못 한다.** "M3 톤", "Stripe스럽게" → AI slop. 구체 reference만 ground truth.
2. **Reference = 코드 (HTML/CSS).** 텍스트 묘사 X. Stripe HTML 통째로 던져야 작동.
3. **템플릿 = 디자인 + 콘텐츠 분리.** 디자인은 reference 그대로, 콘텐츠만 placeholder 치환.
4. **검증 = 픽셀 diff.** 결과물이 reference와 시각적으로 일치하는지 사이드 바이 사이드.

## 워크플로 (5단계)

1. Reference HTML 수집 (Chrome dev tools / SingleFile 확장 / 직접 작성)
2. HTML 정제 (외부 의존성 제거, self-contained)
3. 템플릿화 (`{{COVER_TITLE}}` 같은 placeholder + 메타데이터 헤더)
4. AI 프롬프트 (디자인 100% 동일, 콘텐츠만 치환)
5. 검증 + 반복 (시각 diff → 구체 fix prompt)

## SOP 문서 위치

`/Users/user/Desktop/claude code/design system/HTML_REFERENCE_SOP.md`

## 템플릿 라이브러리

`/Users/user/Desktop/claude code/design system/templates/{deck,card_news,landing}/`

## 자주 하는 실수

- ❌ "M3 풍으로", "Stripe스럽게" — 추상 요청
- ❌ 일부 element만 reference로 — context 부족
- ❌ 여러 reference 섞기 — frankenstein
- ❌ 콘텐츠 정리 안 하고 디자인부터 — 방향 흔들림
- ❌ AI에게 "예쁘게 알아서" — AI slop 보장
- ✅ 콘텐츠 마크다운 먼저 → reference 한 개 → 템플릿화 → AI 프롬프트

## 메모리 연결

- [GStack 평가](project_gstack_evaluation.md) — "디자인은 레퍼런스 HTML 직접 steal이 정답" 본 SOP의 근거
- [Pencil 역할 분담 (강화)](feedback_pencil_role_split.md) — Claude는 직접 .pen 수정 X
- [번역투/AI투 표현 금지](feedback_no_translationese.md) — 콘텐츠 영역에 별도 적용

**Why:** 2026-05-10 서비스M deck 작업에서 디자인 시스템 변수·컴포넌트로 작업한 결과 모두 AI slop 산출. 사용자가 "마음에 드는 장표 HTML 가져와서 템플릿화"라는 정답 도달. 이 방향이 메모리 [GStack 평가]와 일치하므로 SOP화.
**How to apply:** 모든 deck·카드뉴스·랜딩 작업 시 — 콘텐츠 마크다운 먼저, 그 다음 reference HTML, 템플릿화, AI prompt, 시각 diff 검증. 추상 디자인 지시 (M3·Stripe·Toss스럽게) 사용 금지.
