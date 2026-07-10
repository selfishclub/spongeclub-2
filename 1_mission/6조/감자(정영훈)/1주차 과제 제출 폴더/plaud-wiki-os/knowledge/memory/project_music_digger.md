---
name: 음악 디깅 봇
description: iMessage 디깅 봇 디자인 독 — Phase 0 (50줄 프로토타입) 검증 후 Phase 1 (iMessage 통합) 진입 결정. 매몰비용 회피 (2026-05-05)
type: project
originSessionId: d61873f9-0dd7-4adf-b0c6-de82f20a34c9
---
음악 디깅 코파일럿. iMessage self-chat에서 `dig: <곡명> by <아티스트>` → 장르 분해 + 원류 3곡 + 200자 큐레이션 에세이.

**현재 상태**: PROTOTYPE_PENDING — Outside Voice의 근본 challenge 수용. Phase 1 인프라 빌드 전에 핵심 가설 1시간 검증.

## Phase 0 (오늘 저녁 1시간) ⭐ 다음 액션

`~/Desktop/claude code/music-digger/prototype.py` 50줄 작성:
- Claude Sonnet 4.6 + 단일 프롬프트
- CLI: `python prototype.py "곡명 by 아티스트"`
- 외부 의존성 0 (anthropic SDK만)

7개 시드 곡 검증:
1. In The End — Linkin Park
2. Helter Skelter — The Beatles
3. Billie Jean — Michael Jackson
4. Antifreeze — 검정치마 (한국 인디)
5. 별이 빛나는 밤에 — 봄여름가을겨울 (semi-niche)
6. 본인이 모르는 최근 K-인디 1곡 (hallucination 가드)
7. **Spaghetti Monster by Imaginary Band** (가짜 곡 — LLM이 거짓 응답 만드는지 테스트)

**PASS 조건**: 5/7 곡에서 본인 "와 이거다" A의원 + well-known 4/5 외부 검증 일치 + 가짜 곡 거부.
**FAIL 조건**: 디깅 욕구 충족 못 느낌 → 즉시 디스컨티뉴.

## Phase 1 (Phase 0 PASS 시): iMessage 통합

신규 패키지 `music-digger/` + 기존 iMessage 리스너 재활용.

**Pre-Phase 1 Spike (~2시간)**:
- Spike 1: 리스너 sync/async + import 격리 검증 (1시간)
- Spike 2: iOS 공유 시트 friction 측정 (30분)
- Spike 3: 중간 ack 메시지 패턴 (15분)

**Outside Voice 발견 cascade (Phase 1 진입 시 결정)**:
- 캐시 유지/제거 (D6) — 1인 사용에서 over-engineering 가능성
- 50개 테스트 → 핵심 4개로 축소 (parser 12 + formatter 3 + cli E2E 1 + LLM eval 7곡)
- KPI reframe: 측정 가능한 신호로 (주 사용 횟수, 캐시 히트율, 본인 회고)
- Phase 2 PMF 정의: 친구 추천 1회 이상 + 봇 없을 때 아쉬움

## 디자인 독 위치

`/Users/user/.gstack/projects/claudecode/user-feat-marketing-dashboard-design-20260505-021933.md`

테스트 플랜: `/Users/user/.gstack/projects/claudecode/user-feat-marketing-dashboard-eng-review-test-plan-20260505-025131.md`

## 리뷰 이력

- 1차 spec review: 5/10 (모순·모호 다수)
- 2차 spec review: 7/10 (스코프 잠금 OK, 통합 빈틈)
- 3차 spec review: 7.5/10 (잔여 9개 Reviewer Concerns)
- plan-eng-review: 4개 섹션 + Outside Voice (Claude subagent)
- Outside Voice 핵심 발견 = "iMessage 빌드 전에 50줄 프로토타입으로 가설 검증부터" → A 수용

## Why
ADHD + 마케팅 대행사 풀로딩에서 **5-10일 매몰비용 위험 회피**. 1시간 검증 후 진행/중단 명확히. CLAUDE.md "로컬 퍼스트, 과도 인프라 금지" 원칙과 일치.

## How to apply
"음악 디깅 봇 이어서" 요청 시 Phase 0 결과부터 확인. PASS면 Phase 1 진입 (Pre-Phase 1 Spike 3개 → 캐시 D6 결정 → 구현). FAIL이면 디스컨티뉴 처리 또는 다른 접근.
