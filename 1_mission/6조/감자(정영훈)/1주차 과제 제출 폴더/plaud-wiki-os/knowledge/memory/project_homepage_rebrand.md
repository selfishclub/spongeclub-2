---
name: 홈페이지 리브랜딩
description: company.kr 홈페이지 스토리텔링 기반 재설계 — 진행 상태, 기술 스택, 다음 단계
type: project
originSessionId: 5e6e0cf0-5a82-4a87-9599-9b98598b7ce6
---
## 프로젝트 요약

company.kr 홈페이지를 기능 나열형 → 스토리텔링 기반으로 전면 재설계.

## 2026-04-21 업데이트 — DESIGN.md 시스템 도입

AI slop 문제 해결 위해 DESIGN.md 단일 스펙 도입 (Vercel + Resend + Sentry 레퍼런스 머지).

- **스펙 파일:** `company-web/DESIGN.md` (372줄) — 모든 섹션 재생성의 단일 진실
- **다크 캔버스:** `#0E0F10` 웜 니어-블랙 (Resend 순흑 X, Sentry 퍼플 X)
- **Anti-slop 규칙 10개 명시:** AI 이미지/lorem/가짜 숫자/이모지 아이콘 금지
- **참조 도구:** `tools/awesome-design-md/`, `tools/design-md-chrome/`, getdesign.md (npx getdesign@latest add ...)

### 재작업 완료 컴포넌트 (7개)
- `StoryHero.tsx` — 라이트→다크존, glow 1개로 축소
- `ReframeSection.tsx` — 다크 에디토리얼, 2열 비교 구조 (좌: 기존 채널 성과, 우: 통합 흐름)
- `FinalCTAStory.tsx` — 다크 CTA, glow 제거, 시간 표기 3분 통일
- `FooterStory.tsx` — `#080909` 통일, 프로스트 보더
- `OurWaySection.tsx` — 7노드 오비탈 → 6카드 그리드 (Google Maps/YouTube/Instagram/검색광고/Naver/홈페이지)
- `ProofCard.tsx` — Sentry stat 카드 (big number + label + supporting)
- `Badge.tsx` — `dark-frost`, `dark-accent` variant 추가
- `ProofSection.tsx` — ProofCard 사용으로 재작성

### 다크존 토큰 (globals.css 추가)
`--dark-canvas`, `--dark-canvas-deeper`, `--dark-text`, `--dark-text-muted`, `--dark-frost-border`, `--dark-frost-border-soft`, `--dark-ring-shadow`

### 비주얼 검증 미완 (다음 단계)
- 데브 서버 띄워서 실제 렌더링 확인 필요
- 실제 사진/스크린샷 교체 (메모리 기존 미완료 작업 #2)
- Vercel 배포

## 현재 상태 (2026-04-04)

**코드 위치:** `/Users/user/Desktop/claude code/company-web/`
**브랜치:** landing-wargame-loop

**완료된 것:**
- 스토리 구조 설계 완료 (디자인 레퍼런스 사이트 참고, 외부 피드백 반영)
- 메인 홈 9섹션 스토리 구현 + 디자인 v2 (하이브리드: 다크 히어로 + 라이트 본문)
- 서비스 페이지 6개 (/google-maps, /youtube, /instagram, /search-ads, /naver, /website)
- 성공사례 페이지 (/case-studies) — Before/After 패널 + 숫자 중심
- 가격(/pricing), FAQ(/faq) 별도 페이지
- 사이트맵/SEO 업데이트 (13개 라우트)
- 디자인 토큰 다크→라이트 전환
- Lucide React 아이콘 적용 (이모지 제거)
- Framer Motion 스크롤 애니메이션
- 네비게이션 서비스 드롭다운 + 모바일 메뉴

**디자인 시스템:**
- 하이브리드: 다크 네이비 #0F1923 (히어로/재정의/CTA) + 화이트/#F6F6F6 교차 (본문)
- 폰트: Pretendard, H1 48~64px/black, Body 18px
- 레퍼런스: 레퍼런스1(다크톤·신뢰), 레퍼런스2(수치배지), 레퍼런스3(전환·여백)
- 아이콘: lucide-react

**스토리 아크 (메인):**
1. 히어로 — 다크, 진단 검색창 + 신뢰 배지 (숫자 카운팅)
2. 공감 — "왜 환자는 안 늘까요?"
3. 문제 재정의 — 다크 반전, "이게 진짜 성공일까요?"
4. 환자 여정 — 타임라인 (구글→유튜브→인스타→예약)
5. 우리 방식 — 채널 카드 6개 (hover 반전)
6. 증거 — 성과 숫자 3건
7. 대표 메시지 — 인용문
8. CTA — 다크, "무료 진단 시작하기"
9. 푸터

**서비스별 킬러 메시지:**
- Google Maps: 외국인 고단가 블루오션 + 구글 점유율 상승
- YouTube: 롱폼 끝까지 본 환자 = 무조건 결제
- Instagram: 알고리즘이 환자를 찾아가는 유도탄
- 검색광고: 건당 n만원 디비 vs 의도 있는 검색 환자
- Naver: 상위 노출 보장, 안 되면 돈 안 받음
- 홈페이지: 글벽·견적뻥 아닌 전환형, 마케터가 함께 설계

## 미완료 작업

1. **디자인 추가 다듬기** — 애니메이션·박스 디자인 폴리시, 서비스 페이지 디자인 통일
2. **실제 사진/이미지** — 대시보드 스크린샷, 구글맵 캡처 교체 (AI 이미지 금지)
3. **서비스 페이지 증거 섹션** — 각 서비스별 커스텀 콘텐츠
4. **반응형 최적화** — 모바일 테스트
5. **Vercel 배포** — company.kr 도메인 연결
6. **오케스트레이터 연동** — JSON 데이터 자동 업데이트
7. 원장님 추천사 수집 (사용자 액션)
8. 대표/팀 사진 (사용자 액션)
9. 사업자등록번호 (사용자 액션)
10. Microsoft Clarity 연동

## 주요 문서

- 스펙: `docs/superpowers/specs/2026-04-04-company-homepage-story-redesign.md`
- 계획: `docs/superpowers/plans/2026-04-04-company-homepage-story-redesign.md`
- 와이어프레임: `.superpowers/brainstorm/70571-1775234833/`
- 디자인 시스템: `.superpowers/brainstorm/70571-1775234833/design-system.html`

## 기술 스택

- Next.js 16.2.2 (App Router, SSG) + TypeScript
- Tailwind v4 (@theme CSS 변수)
- Framer Motion (애니메이션)
- Lucide React (아이콘)
- 데이터: JSON 파일 기반

## 재개 방법

1. `git log --oneline -10 -- company-web/` 최근 커밋 확인
2. 이 메모리 참고하여 미완료 작업 중 다음 항목 진행
3. http://localhost:3000 에서 현재 상태 확인
