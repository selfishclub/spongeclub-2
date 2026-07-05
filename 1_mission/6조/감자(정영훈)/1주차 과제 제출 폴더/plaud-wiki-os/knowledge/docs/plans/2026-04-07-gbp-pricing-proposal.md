# GBP 프라이싱 제안서 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 외국인환자 유치 병원 대상 콜드 영업용 HTML 슬라이드 제안서를 구현한다.

**Architecture:** reveal.js 기반 단일 HTML 파일. CDN 의존으로 로컬에서 바로 열 수 있고, PDF 내보내기 지원. 다크 네이비 톤의 프리미엄 디자인.

**Tech Stack:** reveal.js 5.x (CDN), Pretendard 폰트 (CDN), 인라인 SVG 차트

**Spec:** `docs/superpowers/specs/2026-04-07-gbp-pricing-proposal-design.md`

---

## 파일 구조

```
company-proposal/
├── index.html          # 전체 프레젠테이션 (단일 파일)
└── assets/
    └── (이미지 필요 시)
```

핵심 파일은 `index.html` 하나. 모든 CSS, 차트, 콘텐츠가 인라인.

---

### Task 1: 스캐폴드 + 커버 슬라이드

**Files:**
- Create: `company-proposal/index.html`

- [ ] **Step 1: 프로젝트 디렉토리 생성**

```bash
mkdir -p company-proposal
```

- [ ] **Step 2: HTML 스캐폴드 작성**

`company-proposal/index.html` 생성:
- reveal.js 5.x CDN (`<link>` + `<script>`)
- Pretendard 폰트 CDN
- 커스텀 CSS: 다크 네이비 배경 (`#0a1628`), 화이트 텍스트, 블루 악센트 (`#3b82f6`)
- 16:9 비율 설정 (`width: 1920, height: 1080`)
- PDF 내보내기 지원 (`?print-pdf`)
- 슬라이드 01: 커버
  - "OUR COMPANY" 워드마크 (큰 볼드)
  - "Google Maps Growth for Medical Tourism"
  - 서브카피: "데이터 기반 글로벌 환자 유치 시스템"
  - 하단: "STRATEGIC PROPOSAL FOR MEDICAL TOURISM"

- [ ] **Step 3: 브라우저에서 확인**

```bash
open company-proposal/index.html
```

커버 슬라이드가 다크 네이비 배경에 깔끔하게 표시되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add company-proposal/
git commit -m "feat: GBP 제안서 스캐폴드 + 커버 슬라이드"
```

---

### Task 2: 시장 논리 슬라이드 (02~04)

**Files:**
- Modify: `company-proposal/index.html`

- [ ] **Step 1: 슬라이드 02 — 시장 변화**

섹션 라벨: `MARKET INSIGHT 01`
제목: "의료관광 시장의 구조적 전환"
서브: "내수 시장의 한계를 넘어, 글로벌 환자를 선점해야 할 시점입니다."

콘텐츠:
- 좌측: 내수소비 성장률 둔화 설명 텍스트 + 인라인 SVG 하락 차트
- 우측: 외국인 환자 급증 하이라이트
  - 방한 관광객: 18,453,270명 (↑15.2%)
  - 관광소비: 15.7조 (↑20.5%)
  - 의료관광: 60만명+ 돌파

레이아웃: 2컬럼 (좌: 문제, 우: 기회)

- [ ] **Step 2: 슬라이드 03 — 환자 여정**

섹션 라벨: `MARKET INSIGHT 02`
제목: "외국인 환자는 어떻게 병원을 찾는가?"
서브: "한국 의료서비스를 찾는 글로벌 환자의 검색 여정은 구글에서 시작됩니다."

콘텐츠:
- 여정 플로우 (4단계 화살표):
  1. Google 검색 "plastic surgery seoul"
  2. Google Maps에서 주변 병원 탐색
  3. 리뷰/평점 비교
  4. 예약 또는 직접 방문
- 하단 비교: 네이버맵/카카오맵 → "외국인 접근 불가" (언어, 본인인증)
- 구글 지도 → "유일한 글로벌 터치포인트"

레이아웃: 수평 플로우 + 하단 비교 박스

- [ ] **Step 3: 슬라이드 04 — 데이터 근거**

섹션 라벨: `MARKET INSIGHT 03`
제목: "데이터로 입증되는 K-의료 수요"
서브: "외국인의 한국 의료 검색량과 선호도는 역대 최고치를 갱신하고 있습니다."

콘텐츠:
- 좌측: 한국 의료관광 검색 관심도 추이 (인라인 SVG 우상향 차트, Google Trends 스타일)
- 우측: 아시아 의료관광 선호 도시 랭킹 카드
  1. 태국 방콕
  2. 인도 뉴델리
  3. **대한민국 서울** (강조)
  4. 싱가포르

레이아웃: 2컬럼

- [ ] **Step 4: 브라우저에서 3장 확인**

슬라이드 02~04가 자연스럽게 넘어가는지, 레이아웃/타이포/컬러 확인.

- [ ] **Step 5: 커밋**

```bash
git add company-proposal/index.html
git commit -m "feat: 시장 논리 슬라이드 3장 (02~04)"
```

---

### Task 3: 플랫폼 인사이트 슬라이드 (05~06)

**Files:**
- Modify: `company-proposal/index.html`

- [ ] **Step 1: 슬라이드 05 — 왜 구글 지도인가**

배경: 라이트 그레이 (#f8fafc) — 톤 전환
섹션 라벨: `PLATFORM INSIGHT`
제목: "왜 글로벌 스탠다드, '구글 지도'인가?"
서브: "외국인 환자가 의존하는 유일한 탐색 매체이자, 마케팅 선점 효과가 극대화되는 블루오션입니다."

콘텐츠: 4개 카드 가로 배치
1. 글로벌 1위 지도 플랫폼 — MAU 10억+, 256개국
2. 국내 매체의 구조적 한계 — 언어/인증 장벽으로 외국인 접근 제한
3. 환자 동선 직접 타겟팅 — 실시간 위치 기반 병원 노출 → 예약/방문
4. 수요 대비 압도적 저경쟁 — 의료 GBP 최적화는 이제 막 시작된 블루오션

레이아웃: 4컬럼 카드 그리드

- [ ] **Step 2: 슬라이드 06 — 의료관광 특화 문제**

배경: 다크 네이비 복귀
섹션 라벨: `PROBLEM`
제목: "지금 대부분 병원의 구글 지도 현실"
서브: "체계적인 GBP 관리 없이는 글로벌 환자 유입 기회를 놓치고 있습니다."

콘텐츠: 4개 문제 카드 (2×2 그리드)
- 다국어 리뷰 관리 부재 → 악성 리뷰 방치, 신뢰도 하락
- GBP 프로필 미최적화 → 검색 노출 저조, 경쟁사에 밀림
- 경쟁사 대비 콘텐츠 부족 → 외국인에게 정보 전달 실패
- 데이터 기반 의사결정 불가 → 효과 측정 없이 감으로 운영

각 카드에 아이콘(이모지 또는 SVG 심볼) + 문제 + 결과

- [ ] **Step 3: 브라우저 확인 + 커밋**

```bash
git add company-proposal/index.html
git commit -m "feat: 플랫폼 인사이트 슬라이드 2장 (05~06)"
```

---

### Task 4: 솔루션 슬라이드 (07~09)

**Files:**
- Modify: `company-proposal/index.html`

- [ ] **Step 1: 슬라이드 07 — 풀퍼널 시스템**

배경: 라이트
섹션 라벨: `CORE STRATEGY 01`
제목: "트래픽을 자산으로 바꾸는 '풀퍼널' 시스템"
서브: "고객의 최초 인지부터 최종 예약까지의 모든 여정을 설계하여 마케팅 예산의 누수를 원천 차단합니다."

콘텐츠: 3단계 수평 플로우 (좌→우, 화살표 연결)
- Phase 1: 알고리즘 장악 (Organic SEO) — 구글 로컬 검색 알고리즘을 역이용하여 상위 노출
- Phase 2: 수요 선제 타격 (Targeted Ads) — 잠재 환자 스마트폰에 선제적 노출
- Phase 3: 이탈 제로화 (Conversion System) — 다국어 랜딩페이지로 예약 직결

레이아웃: 3컬럼, 그라데이션 강조 (Phase 3이 가장 진한 블루)

- [ ] **Step 2: 슬라이드 08 — 8단계 프로세스**

배경: 라이트
섹션 라벨: `CORE STRATEGY 02`
제목: "우리 회사 8단계 통합 밀착 관리 프로세스"
서브: "단순 프로필 관리를 넘어 타겟팅(Ads)과 전환율(CVR)까지 아우르는 통합 마케팅 시스템입니다."

콘텐츠: 4×2 카드 그리드 (번호 + 제목 + 1줄 설명)
01 프로필 최적화 세팅
02 다국어 콘텐츠 기획
03 타겟팅 광고 세팅
04 전환율 관리
05 브랜드 평판 방어
06 핵심 키워드 최적화
07 고품질 트래픽 모니터링
08 월간 데이터 분석

- [ ] **Step 3: 슬라이드 09 — 우리 회사 차별점**

배경: 다크 네이비
섹션 라벨: `WHY OUR COMPANY`
제목: "왜 우리 회사인가?"
서브: "대행사 중 유일하게 기술 기반 자동화 시스템을 보유하고 있습니다."

콘텐츠: 5개 차별점 (아이콘 + 제목 + 설명)
- AI 기반 자동 리포트 — PPT 자동 생성, 수작업 제로
- 실시간 순위 트래킹 대시보드 — 클라이언트 전용 포털 제공
- 다국어 악성 리뷰 자동 감지 — 한/영/중/일 리뷰 실시간 모니터링 + 즉시 알림
- 경쟁사 모니터링 — 경쟁 병원 프로필/리뷰 변화 추적
- 데이터 기반 키워드 전략 — 검색량/경쟁도 분석으로 최적 키워드 선정

좌측: 대시보드 목업 (간단한 CSS 모의 UI)
우측: 차별점 리스트

- [ ] **Step 4: 브라우저 확인 + 커밋**

```bash
git add company-proposal/index.html
git commit -m "feat: 솔루션 슬라이드 3장 (07~09)"
```

---

### Task 5: 사례 + 프라이싱 슬라이드 (10~13)

**Files:**
- Modify: `company-proposal/index.html`

- [ ] **Step 1: 슬라이드 10 — 성공 사례**

배경: 라이트
섹션 라벨: `PROVEN SUCCESS`

3개 사례를 가로 배치. 각 사례 카드:
- 업종 태그 뱃지 (성형외과/피부과/치과)
- "관리 전" 박스: GBP 조회수 [___], 주요 키워드 순위 [___]
- → 화살표
- "관리 후" 박스: GBP 조회수 [___], 주요 키워드 순위 [___] (주황 강조 테두리)
- 관리 기간: [___개월]
- 플레이스홀더 텍스트: "데이터 준비 중"

`data-case="1"`, `data-case="2"`, `data-case="3"` 속성으로 마킹.

- [ ] **Step 2: 슬라이드 11 — 패키지 가치 구성**

배경: 라이트
섹션 라벨: `VALUE PROPOSITION`
제목: "우리 회사 통합 패키지 가치 구성 (Total Value)"

서비스 항목별 개별 가치 합산 테이블:
- GBP 프로필 최적화: [TBD]원
- 다국어 콘텐츠 (영/중/일): [TBD]원
- Google Ads 세팅+운영: [TBD]원
- 다국어 랜딩페이지: [TBD]원
- 실시간 대시보드: [TBD]원
- 월간 AI 리포트: [TBD]원
- 합계: 월 최대 [TBD]원

하단 안내: "다음 슬라이드에서 장기 파트너십 특별 할인 혜택을 제안합니다."

- [ ] **Step 3: 슬라이드 12 — 프라이싱 티어**

배경: 라이트
섹션 라벨: `PARTNERSHIP PROPOSAL`
제목: "Standard 기반 장기 파트너십 혜택 (권장)"

3개 카드 가로 배치:
- **3개월 약정** — 기본 인프라 구축 (일반 카드)
  - 총 가치 ~~[TBD]~~원 → [TBD]원/월
  - 포함: 체크리스트 4~5개
- **6개월 약정** — "가장 많이 도입하는 플랜" 뱃지 (보라/블루 강조 카드)
  - 총 가치 ~~[TBD]~~원 → [TBD]원/월
  - 포함: 체크리스트 5~6개
- **12개월 약정** — "최고 비용 효율" 뱃지 (일반 카드)
  - 총 가치 ~~[TBD]~~원 → [TBD]원/월
  - 포함: 체크리스트 5~6개

하단 주석: "상기 플랜은 약정 기간을 기준으로 한 패키지 혜택가이며, VAT 별도 금액입니다."

- [ ] **Step 4: 슬라이드 13 — BEP**

배경: 블루 그라데이션
섹션 라벨: `BREAK-EVEN POINT (BEP)`
제목: "안정적인 투자금 회수 및 이익 창출 구조"
서브: "마케팅 비용은 지출이 아닌 투자입니다."

좌측: 큰 숫자 "[N]명" — 월간 확보 필요 신규 환자
우측: 설명 블록
- "Standard 12개월 (월 [TBD]만원) 진행 시"
- "구글 검색을 통한 외국인 환자 약 [N]명 확보만으로도"
- "마케팅 예산의 원금 회수가 가능하도록 설계되었습니다."
- 업종별 평균 객단가 참고:
  - 성형외과: n만원~n만원/건
  - 피부과: n만원~n만원/건
  - 치과: n만원~n만원/건

- [ ] **Step 5: 전체 13장 브라우저 확인 + 커밋**

```bash
git add company-proposal/index.html
git commit -m "feat: 사례+프라이싱 슬라이드 4장 (10~13)"
```

---

### Task 6: 디자인 폴리싱 + 최종 검수

**Files:**
- Modify: `company-proposal/index.html`

- [ ] **Step 1: 전체 슬라이드 통과 검수**

13장 전체를 순서대로 넘기면서:
- 폰트 크기/위치 일관성
- 다크/라이트 배경 전환 자연스러운지
- 카드/차트/플로우 레이아웃 깨짐 없는지
- [TBD] 마커 일관되게 표시되는지
- 모바일/태블릿 뷰에서 깨지지 않는지 (reveal.js 기본 반응형)

- [ ] **Step 2: PDF 내보내기 테스트**

```bash
open "company-proposal/index.html?print-pdf"
```

인쇄 레이아웃에서 13장이 정상 출력되는지 확인.

- [ ] **Step 3: 최종 커밋**

```bash
git add company-proposal/
git commit -m "feat: GBP 프라이싱 제안서 v1 완성"
```
