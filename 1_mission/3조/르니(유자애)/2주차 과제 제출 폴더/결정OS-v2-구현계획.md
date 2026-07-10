# 결정 OS v2 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/결정` 스킬을 GROW 뼈대 + 유형별 프레임워크 + 반영→질문+발판 패턴으로 개선한다.

**Architecture:** `C:\Users\wwyut\.claude\plugins\결정\결정.md` 마크다운 파일 하나를 수정한다. Claude Code가 이 파일을 읽어 대화 흐름 지시를 따른다. 별도 서버·API·코드 없음.

**Tech Stack:** Claude Code 스킬 시스템 (마크다운 파일), Git

## Global Constraints

- 스킬 파일 위치: `C:\Users\wwyut\.claude\plugins\결정\결정.md`
- 제출 사본 위치: `1_mission\3조\르니(유자애)\1주차 과제 제출 폴더\결정.md`
- 말투: 짧고 직접적. "~해보면 어떨까요?" 같은 컨설턴트 말투 금지
- 턴 제한 없음 (자연스러운 흐름 우선)
- 질문 1턴에 1개
- 결론 카드에 유저가 쓴 언어 그대로 사용

---

### Task 1: 스킬 파일 전면 재작성 ✅

`C:\Users\wwyut\.claude\plugins\결정\결정.md` 를 v2 내용으로 덮어씀.

---

### Task 2: 스킬 동작 검증 (3가지 유형 테스트)

> ⚠️ 각 테스트는 **새 Claude Code 세션**에서 진행한다.

- [x] **방향형 고민 테스트**
  ```
  /결정
  지금 사이드 프로젝트를 계속할지, 아니면 잠깐 쉴지 모르겠어
  ```
  - [x] 첫 응답이 반영으로 시작하는가? — PASS
  - [x] G턴 질문에 발판 3개가 붙어 있는가? — PASS
  - [x] O턴에서 pre-mortem 또는 후회 최소화 질문이 나오는가? — PASS
  - [x] 결론 카드에 📌 / 🎯 / ⚠️ / 👣 / 📅 다섯 항목이 모두 있는가? — PASS

- [x] **선택형 고민 테스트**
  ```
  /결정
  다음 달 여행을 제주도로 갈지 부산으로 갈지 못 고르겠어
  ```
  - [x] O턴에서 가정 탐색 질문이 나오는가? — PASS
  - [x] 발판이 선택지가 아닌 예시로 제시되는가? — PASS (유저가 발판 밖 답을 냈고 그대로 결론에 반영됨)

- [x] **"모르겠어" 시나리오 테스트**
  - [x] 방향 포기 없이 다른 각도 질문으로 이어가는가? — 테스트 당시엔 스킬 파일에 명시 규칙이 없어 모델 재량으로만 통과. 2026-07-10에 "모르겠어" 대응 규칙을 공통 규칙에 추가해 문서화 완료.

> 2026-07-10 fresh-agent 3개로 검증. 부가로 O턴 예문 3곳의 "완전히 다른 뭔가인지" 표현 누락도 발견해 공통 규칙과 통일시킴.

---

### Task 3: 제출 사본 업데이트 및 커밋

- [x] `2주차 과제 제출 폴더\결정.md` 업데이트 (2026-07-10, "모르겠어" 대응 규칙 + 발판 문구 통일 패치 반영)
- [ ] 커밋 및 PR 생성
