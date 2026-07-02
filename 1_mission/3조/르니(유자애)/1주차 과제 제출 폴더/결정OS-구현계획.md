# 결정 OS 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Claude Code에서 `/결정` 슬래시 커맨드를 치면 고민 → 결론 카드로 닫아주는 스킬 하나를 만든다.

**Architecture:** `.claude\plugins\결정\결정.md` 에 스킬 파일 하나를 만든다. Claude Code가 이 파일을 읽어 대화 흐름 지시를 따른다. 별도 서버·API·코드 없음.

**Tech Stack:** Claude Code 스킬 시스템 (마크다운 파일), Git

## Global Constraints

- 파일 위치: `C:\Users\wwyut\.claude\skills\결정\SKILL.md` (전역 위치)
- 제출 사본: `1_mission\3조\르니(유자애)\1주차 과제 제출 폴더\결정.md`
- 질문 최대 3번 안에 결론 카드 출력
- 결론 카드 형식: 📌 결정 / 🎯 기준 / 📅 날짜 세 줄

---

### Task 1: 스킬 파일 생성

**Files:**
- Create: `C:\Users\wwyut\.claude\plugins\결정\결정.md`

**Interfaces:**
- Produces: `/결정` 슬래시 커맨드로 호출 가능한 스킬

- [ ] **Step 1: 스킬 파일 작성**

`C:\Users\wwyut\.claude\plugins\결정\결정.md` 를 아래 내용으로 생성:

```markdown
---
name: 결정
description: "이거 결정 못 하겠어"가 나올 때 쓰는 스킬. 고민을 던지면 유형 파악 → 핵심 질문 → 결론 카드로 닫아준다.
---

# 결정 OS

고민을 받으면 아래 흐름으로 진행한다. 말투는 짧고 직접적으로. "~해보면 어떨까요?" 같은 컨설턴트 말투 금지.

## 1단계 — 고민 유형 파악

고민을 읽고 유형을 자동 판단한다. 사용자에게 유형을 묻지 않는다.

- **선택형**: 선택지가 이미 있는 고민 ("A vs B 중 뭐가 나을까")
- **방향형**: 계속/그만 여부를 모르는 고민 ("이걸 계속 해야 하나")
- **우선순위형**: 순서를 모르는 고민 ("뭘 먼저 할지 모르겠어")

## 2단계 — 핵심 질문 (최대 3번)

유형에 따라 질문 1개로 시작한다. 답을 들은 뒤 필요하면 1개 더.
질문은 누적 최대 3번. 그 안에 반드시 결론으로 닫는다.
사용자가 "모르겠어"라고 해도 Claude가 방향을 제시하고 닫는다.

유형별 첫 질문:
- 선택형 → "둘 중 어느 쪽이 더 오래 남는 선택이에요?"
- 방향형 → "지금 이게 부담인가요, 아니면 그냥 귀찮은 건가요?"
- 우선순위형 → "지금 당장 안 하면 제일 타격 큰 게 뭐예요?"

## 3단계 — 결론 카드 출력

재확인 질문 없이 바로 아래 형식으로 출력한다:

```
📌 결정: [선택한 것]
🎯 기준: [결정의 근거 한 줄]
📅 날짜: YYYY-MM-DD
```
```

- [ ] **Step 2: 파일 생성 확인**

Claude Code를 재시작하거나 새 세션을 열어서 `/결정` 이 스킬 목록에 뜨는지 확인.

- [ ] **Step 3: 커밋 (스킬 파일은 레포 외부라 git 불필요)**

스킬 파일은 `C:\Users\wwyut\.claude\` 아래라 spongeclub-2 레포와 별개. 커밋 없이 바로 사용 가능.

---

### Task 2: 스킬 동작 검증

**Files:**
- 없음 (대화 테스트)

**Interfaces:**
- Consumes: Task 1에서 만든 `/결정` 스킬

- [ ] **Step 1: 선택형 고민으로 테스트**

새 Claude Code 세션에서:
```
/결정
지금 사이드 프로젝트를 계속할지, 아니면 잠깐 쉴지 모르겠어
```

기대 결과:
1. Claude가 방향형으로 판단, "지금 이게 부담인가요, 아니면 그냥 귀찮은 건가요?" 질문
2. 답변 후 추가 질문 1개 이하
3. 결론 카드 출력 (📌 / 🎯 / 📅 세 줄)

- [ ] **Step 2: 선택형 고민으로 테스트**

```
/결정
다음 달에 여행을 제주도로 갈지, 부산으로 갈지 못 고르겠어
```

기대 결과:
1. Claude가 선택형으로 판단, "둘 중 어느 쪽이 더 오래 남는 선택이에요?" 질문
2. 3번 안에 결론 카드 출력

- [ ] **Step 3: "모르겠어" 시나리오 테스트**

2번째 질문에 "모르겠어"로 답했을 때 Claude가 방향 제시 후 카드 출력하는지 확인.

---

### Task 3: 제출 파일 준비

**Files:**
- Create: `1_mission\3조\르니(유자애)\1주차 과제 제출 폴더\결정.md` (스킬 사본)
- Modify: `1_mission\3조\르니(유자애)\1주차 과제 제출 폴더\submission.md`

**Interfaces:**
- Consumes: Task 1의 스킬 파일 내용
- Consumes: Task 2의 테스트 결과 스크린샷

- [ ] **Step 1: 스킬 파일 사본 복사**

`C:\Users\wwyut\.claude\plugins\결정\결정.md` 내용을 `1주차 과제 제출 폴더\결정.md` 에 그대로 복사.

- [ ] **Step 2: 테스트 결과 스크린샷 저장**

Task 2 검증 결과 화면을 캡처해서 `1주차 과제 제출 폴더\이미지첨부\` 에 저장.

- [ ] **Step 3: submission.md 미션 3 섹션 업데이트**

`submission.md` 의 `## ⚙️ 미션 3. 내 OS 구현` 섹션을 채운다:

```markdown
## ⚙️ 미션 3. 내 OS 구현

- **결과물:** 결정 OS 스킬 (`/결정` 슬래시 커맨드)
  - 고민을 던지면 유형 파악(선택형/방향형/우선순위형) → 질문 최대 3번 → 결론 카드 출력
  - 파일: `결정.md` (Claude Code 전역 스킬로 설치)
- **링크 / 스크린샷:** `이미지첨부/` 폴더 참고
```

- [ ] **Step 4: 커밋 & 제출**

```bash
git add "1_mission/3조/르니(유자애)/1주차 과제 제출 폴더/"
git commit -m "르니(유자애) 1주차 미션3: 결정 OS 스킬 구현"
```

그 다음 `/제출` 스킬로 PR 생성.
