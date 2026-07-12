# Wargame Loop + Demo Preview 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능 구현 후 자동 검수 루프(최대 20회)와 데모 프리뷰를 통합하여, 비개발자도 오류 없는 결과물을 받을 수 있게 한다.

**Architecture:** Claude Code 스킬 2개(`wargame`, `demo-preview`)를 만들고, 기존 에이전트(code-reviewer, security-reviewer, e2e-runner, build-error-resolver)를 서브에이전트로 병렬 호출한다. 검수 결과는 HTML 리포트로 저장하고, 반복 실수 패턴은 `wargame-lessons.md`에 누적하여 다음 검수에 반영한다.

**Tech Stack:** Claude Code Skills (SKILL.md), 기존 에이전트, Playwright (E2E), Python http.server (정적 프리뷰)

**Spec:** `docs/superpowers/specs/2026-04-06-wargame-loop-design.md`

---

## 파일 구조

| 파일 | 역할 | 작업 |
|------|------|------|
| `skills/wargame/SKILL.md` | 검수 루프 스킬 본체 | 생성 |
| `skills/demo-preview/SKILL.md` | 데모 프리뷰 스킬 | 생성 |
| `reports/wargame/wargame-lessons.md` | 반복 실수 패턴 DB | 생성 (초기 템플릿) |
| `reports/wargame/.gitkeep` | 리포트 디렉토리 유지 | 생성 |
| `.gitignore` | 리포트 HTML/상태/PID 제외 | 수��� |
| `CLAUDE.md` | Step 4-A 확장 + 단축어 추가 | 수정 |

---

## Task 1: 리포트 디렉토리 + Lessons 템플릿 + .gitignore

**Files:**
- Create: `reports/wargame/.gitkeep`
- Create: `reports/wargame/wargame-lessons.md`
- Modify: `.gitignore`

- [ ] **Step 1: 디렉토리 생성**

```bash
mkdir -p reports/wargame/screenshots
touch reports/wargame/.gitkeep
```

- [ ] **Step 2: wargame-lessons.md 초기 템플릿 작성**

```markdown
# Wargame Lessons — 반복 실수 패턴 DB

> 워게임 루프에서 자동 누적. 수동 편집 가능.
> 마지막 업데이트: (워게임 실행 시 자동 갱신)

## 반복 패턴

(아직 기록된 패턴이 없습니다. 워게임 실행 후 자동으로 누적됩니다.)

## 카테고리 정의

| 카테고리 | 설명 |
|----------|------|
| `unused-import` | 미사용 import/변수 |
| `type-missing` | 타입 선언 누락 |
| `env-sync` | 환경변수 불일치 (.env ↔ .env.example) |
| `xss-risk` | XSS 취약점 |
| `auth-missing` | 인증/인가 누락 |
| `e2e-selector` | E2E 셀렉터 깨짐 |
| `build-dep` | 의존성 문제 |
| `기타` | 위에 해당 없음 |
```

- [ ] **Step 3: .gitignore에 wargame 제외 항목 추가**

`.gitignore` 파일 끝에 추가:

```
# Wargame reports (HTML, screenshots, state)
reports/wargame/*.html
reports/wargame/screenshots/
reports/wargame/.state.json
reports/wargame/.demo.pid
```

wargame-lessons.md와 .gitkeep만 git 추적.

- [ ] **Step 4: 커밋**

```bash
git add reports/wargame/.gitkeep reports/wargame/wargame-lessons.md .gitignore
git commit -m "chore: wargame 리포트 디렉토리 + lessons 템플릿 + gitignore"
```

---

## Task 2A: Wargame 스킬 — 코어 루프

검수 루프의 프론트매터, 심각도 분류, Phase 1~3, 자동 수정 로직.

**Files:**
- Create: `skills/wargame/SKILL.md`

**참고 파일 (읽기 전용):**
- `skills/verification-loop/SKILL.md` — Phase 구조 참고
- `agents/code-reviewer.md`, `agents/security-reviewer.md`, `agents/e2e-runner.md`, `agents/build-error-resolver.md`
- `docs/superpowers/specs/2026-04-06-wargame-loop-design.md` — 심각도, 루프 구조

- [ ] **Step 1: 프론트매터 + 개요 + 트리거 섹션 작성**

```yaml
---
name: wargame
description: "자동 검수 루프 — 빌드/코드품질/E2E를 반복 실행하여 오류 0까지 수정. 최대 20라운드."
origin: custom
---
```

트리거 섹션: "검수해", "워게임" 수동 + 자율모드(Step 4-A) 자동.
결과물 요약: HTML 리포트 + lessons 누적 + 커밋.

- [ ] **Step 2: 이슈 심각도 분류 섹션 작성**

스펙의 심각도 테이블 포함:

| 등급 | PASS 차단 | 자동 수정 |
|------|-----------|-----------|
| CRITICAL | 차단 | 수정 |
| HIGH | 차단 | 수정 |
| MEDIUM | 차단 안 함 | 리포트만 |
| LOW | 차단 안 함 | 리포트만 |

PASS 조건 명시: CRITICAL + HIGH = 0건.

- [ ] **Step 3: Phase 1 (빌드 검증) 작성**

프로젝트 타입 자동 감지:
```
next.config.* → npm run build
package.json → npm run build (또는 pnpm build)
*.py (main) → python3 구문 체크 + import 테스트
기타 → 빌드 스킵
```
실패 시: build-error-resolver 에이전트(model: sonnet) 호출 → 수정 → 재빌드.

- [ ] **Step 4: Phase 2 (코드 품질 — 병렬) 작성**

3개 서브에이전트 병렬 디스패치:

```
Agent 1: code-reviewer (model: sonnet)
  "변경된 파일 리뷰. 이슈마다 CRITICAL/HIGH/MEDIUM/LOW 등급 부여."
  
Agent 2: security-reviewer (model: sonnet)
  "보안 취약점 스캔. OWASP Top 10."

Agent 3: 언어별 reviewer (python-reviewer / typescript-reviewer)
  프로젝트 주 언어 자동 감지 → 해당 reviewer 호출
```

lessons 연동: `reports/wargame/wargame-lessons.md` 로드 → 반복 패턴을 리뷰어에게 "우선 체크" 지시.

- [ ] **Step 5: Phase 3 (E2E 테스트) 작성**

```
next.config.* 또는 index.html 존재 → e2e-runner 에이전트(model: sonnet) 호출
스크린샷 → reports/wargame/screenshots/ 저장
그 외 → Phase 3 스킵
```

- [ ] **Step 6: 이슈 수집 & 자동 수정 로직 작성**

1. Phase 1~3 결과 합산
2. CRITICAL/HIGH만 수정 대상 (최소 변경 원칙)
3. 수정 전후 diff 리포트 기록
4. MEDIUM/LOW는 리포트에 기록만

- [ ] **Step 7: 루프 제어 & 판정 로직 작성**

```
CRITICAL + HIGH = 0 → PASS, 종료
CRITICAL + HIGH > 0 → 수정 후 Round N+1

조기 종료:
  연속 2라운드 동일 오류 → FAIL
  컨텍스트 60% 도달 → STOPPED
  Round 20 도달 → FAIL
```

- [ ] **Step 8: 커밋**

```bash
git add skills/wargame/SKILL.md
git commit -m "feat: wargame 스킬 — 코어 루프 (Phase 1~3 + 판정)"
```

---

## Task 2B: Wargame 스킬 — 리포트 & 패턴 학습

**Files:**
- Modify: `skills/wargame/SKILL.md` (하단에 섹션 추가)

- [ ] **Step 1: HTML 리포트 생성 섹션 작성**

리포트 구조 (스펙 2절 그대로):
- 파일명: `{ISO날짜시간}-{프로젝트명}.html`
- 저장: `reports/wargame/`
- 내용: 프로젝트명, 라운드 수, PASS/FAIL, 라운드별 Phase 결과, 수정 내역, 변경 요약, 스크린샷
- 생성 후 `open` 명령으로 브라우저에 자동 표시

- [ ] **Step 2: 30일 리포트 정리 로직 작성**

워게임 시작 시:
```bash
find reports/wargame/ -name "*.html" -mtime +30
```
30일 이상 리포트 발견 시 "오래된 리포트 N개 정리할까요?" 1회 제안.

- [ ] **Step 3: 패턴 학습 섹션 작성**

카테고리 매칭 기준 (스펙 4절):

| 카테고리 | 매칭 기준 |
|----------|-----------|
| `unused-import` | 미사용 import/변수 |
| `type-missing` | 타입 선언 누락 |
| `env-sync` | .env ↔ .env.example 차이 |
| `xss-risk` | innerHTML, dangerouslySetInnerHTML |
| `auth-missing` | API 엔드포인트 보호 안 됨 |
| `e2e-selector` | 클래스명/ID 변경 후 테스트 미수정 |
| `build-dep` | 패키지 미설치, 버전 충돌 |
| `기타` | 자유 분류 |

학습 흐름:
1. 과거 `reports/wargame/*.html` 스캔
2. 현재 오류 카테고리 ↔ 과거 매칭
3. 2회 이상 → `wargame-lessons.md` 카운트 증가/신규 등록
4. 10회 이상 → "rules/에 승격할까요?" 사용자 제안

- [ ] **Step 4: 커밋 컨벤션 섹션 작성**

```
PASS:    wargame: PASS round N/20 — 수정 M건
FAIL:    wargame: FAIL round N/20 — 잔여 M건
STOPPED: wargame: STOPPED round N/20 — context limit, 잔여 M건
```

- [ ] **Step 5: 커밋**

```bash
git add skills/wargame/SKILL.md
git commit -m "feat: wargame 스킬 — 리포트 생성 + 패턴 학습 + 커밋 컨벤션"
```

---

## Task 2C: Wargame 스킬 — 상태 저장 & 재개

**Files:**
- Modify: `skills/wargame/SKILL.md` (하단에 섹션 추가)

- [ ] **Step 1: 세션 재개용 상태 저장 섹션 작성**

매 라운드 종료 시 `reports/wargame/.state.json` 저장:

```json
{
  "project": "gbp-dashboard",
  "started": "2026-04-06T14:30:00",
  "current_round": 3,
  "max_rounds": 20,
  "status": "in_progress",
  "remaining_issues": [
    {"category": "type-missing", "severity": "HIGH", "file": "src/api.ts", "description": "..."}
  ],
  "fixes_applied": [
    {"round": 1, "file": "src/utils.ts", "change": "unused import 제거"}
  ]
}
```

- [ ] **Step 2: "이어서 해" 재개 로직 작성**

재개 시:
1. `reports/wargame/.state.json` 존재 확인
2. 있으면 로드 → "워게임 Round N/20에서 중단됨. 잔여 이슈 M건. 이어서 할까요?"
3. 승인 → 해당 라운드부터 재개
4. 없으면 → 새 워게임 시작

- [ ] **Step 3: 토큰 예산 경고 섹션 작성**

컨텍스트 60% 도달 감지 시:
1. 현재 라운드까지 리포트 저장
2. `.state.json` 저장
3. `wargame: STOPPED round N/20 — context limit` 커밋
4. "새 세션에서 '이어서 해'로 재개 가능" 안내

- [ ] **Step 4: 커밋**

```bash
git add skills/wargame/SKILL.md
git commit -m "feat: wargame 스킬 — 상태 저장/재개 + 토큰 예산 관리"
```

---

## Task 3: Demo Preview 스킬 작성

**Files:**
- Create: `skills/demo-preview/SKILL.md`

**참고:** `docs/superpowers/specs/2026-04-06-wargame-loop-design.md` 섹션 3

- [ ] **Step 1: 프론트매터 + 개요 작성**

```yaml
---
name: demo-preview
description: "프로젝트 결과물을 브라우저에서 바로 확인. 웹=dev서버, 스크립트=HTML 리포트 변환."
origin: custom
---
```

트리거: "데모 띄워" 수동 + 워게임 PASS 후 자동.

- [ ] **Step 2: 프로젝트 타입 감지 + 서버 실행 로직 작성**

| 감지 기준 | 동작 |
|-----------|------|
| `next.config.*` | `npm run dev -- --port {port}` |
| `package.json` scripts.dev | `npm run dev` |
| `index.html` | `python3 -m http.server {port} --bind 0.0.0.0` |
| `*.py` (웹 아님) | 실행 → 결과 HTML 변환 → `python3 -m http.server --bind 0.0.0.0` |
| 워게임 리포트 | `open reports/wargame/{latest}.html` (서버 불필요) |

**중요:** `--bind 0.0.0.0` 으로 바인딩 → Chrome 원격 데스크톱에서도 접속 가능.

- [ ] **Step 3: 포트 자동 할당 로직 작성**

```bash
python3 -c "import socket; s=socket.socket(); s.bind(('',0)); print(s.getsockname()[1]); s.close()"
```

3000~9999 범위에서 비어있는 포트 선택.

- [ ] **Step 4: 서버 생명주기 관리 작성**

- PID 파일: `reports/wargame/.demo.pid`
- 시작 시 기존 PID 확인 → 살아있으면 종료 후 새로 시작
- `open http://localhost:{port}` 로 브라우저 열기
- URL을 터미널에 출력 (iMessage 연결 시 iMessage에도 전송)

- [ ] **Step 5: "데모 꺼" 종료 로직 작성**

```bash
kill $(cat reports/wargame/.demo.pid) 2>/dev/null
rm -f reports/wargame/.demo.pid
```

- [ ] **Step 6: 커밋**

```bash
git add skills/demo-preview/SKILL.md
git commit -m "feat: demo-preview 프리뷰 스킬 생성"
```

---

## Task 4: CLAUDE.md 수정

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Step 4-A에 검수 블록 추가**

`CLAUDE.md`에서 `**에러:** 3회 자동 시도` 로 시작하는 줄을 찾고, 그 아래에 추가:

```markdown
**검수:** 구현 완료 후 /wargame 자동 실행. PASS 시 데모 띄움 + 완료 커밋.
FAIL 시 `STOPPED wargame: {잔여이슈}` 커밋 후 중단.
```

- [ ] **Step 2: 단축어 테이블에 3개 추가**

`CLAUDE.md`에서 `| 이거 위험해?` 줄을 찾고, 그 아래에 추가:

```markdown
| 검수해 / 워게임 | 검수 루프 시작 (/wargame) |
| 데모 띄워 | 프리뷰만 (검수 없이) |
| 데모 꺼 | 프리뷰 서버 종료 |
```

- [ ] **Step 3: diff로 변경 범위 검증**

```bash
git diff CLAUDE.md
```

Step 4-A 검수 블록(2줄)과 단축어 3줄만 추가되었는지 확인. 다른 섹션 무변경.

- [ ] **Step 4: 커밋**

```bash
git add CLAUDE.md
git commit -m "feat: CLAUDE.md에 워게임/데모 단축어 + Step 4-A 검수 블록 추가"
```

---

## Task 5: 통합 검증

**모든 파일이 제자리에 있고, 스킬이 올바르게 인식되는지 확인.**

- [ ] **Step 1: 파일 존재 확인**

```bash
ls -la skills/wargame/SKILL.md
ls -la skills/demo-preview/SKILL.md
ls -la reports/wargame/wargame-lessons.md
ls -la reports/wargame/.gitkeep
```

4개 모두 존재.

- [ ] **Step 2: SKILL.md 프론트매터 검증**

```bash
head -5 skills/wargame/SKILL.md
head -5 skills/demo-preview/SKILL.md
```

`---` YAML 프론트매터 시작 확인.

- [ ] **Step 3: CLAUDE.md 구조 검증**

```bash
grep -n "검수:" CLAUDE.md
grep -n "워게임" CLAUDE.md
```

Step 4-A에 "검수:" 줄 존재, 단축어 테이블에 "워게임" 줄 존재.

- [ ] **Step 4: wargame-lessons.md 카테고리 검증**

```bash
grep -c "|" reports/wargame/wargame-lessons.md
```

카테고리 테이블 (8행) 존재 확인.

- [ ] **Step 5: .gitignore 검증**

```bash
grep "wargame" .gitignore
```

4개 제외 패턴 존재 확인.

- [ ] **Step 6: 전체 커밋 히스토리 확인**

```bash
git log --oneline -7
```

예상 (최신 순):
```
feat: CLAUDE.md에 워게임/데모 단축어 + Step 4-A 검수 블록 추가
feat: demo-preview 프리뷰 스킬 생성
feat: wargame 스킬 — 상태 저장/재개 + 토큰 예산 관리
feat: wargame 스킬 — 리포트 생성 + 패턴 학습 + 커밋 컨벤션
feat: wargame 스킬 — 코어 루프 (Phase 1~3 + 판정)
chore: wargame 리포트 디렉토리 + lessons 템플릿 + gitignore
docs: wargame loop + demo preview 설계 스펙
```
