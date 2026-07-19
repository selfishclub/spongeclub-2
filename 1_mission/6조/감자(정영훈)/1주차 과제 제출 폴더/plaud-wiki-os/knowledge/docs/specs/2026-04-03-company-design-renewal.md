# 우리 회사 홈페이지 디자인 리뉴얼 스펙

## 개요

ourcompany.kr 홈페이지의 디자인 퀄리티 전면 업그레이드. 기존 14개 섹션 구조와 콘텐츠는 유지하면서, 디자인 시스템(컬러/타이포/컴포넌트)을 재정의하고 일괄 적용한다.

## 문제 정의

기존 구현의 디자인 한계:
1. **폰트가 밋밋함** — Pretendard 단일 폰트, 웨이트/사이즈 위계 부족
2. **컴포넌트 퀄리티 낮음** — 카드, 버튼 등이 generic한 느낌
3. **레이아웃 단조로움** — 대부분 3-column 그리드 반복, 섹션 간 리듬감 없음
4. **브랜드 컬러 불일치** — 로고는 네이비+핑크인데 웹은 블루(#4F7CFF) 사용

## 디자인 방향

### 레퍼런스
- **Linear** (linear.app) — 극한의 타이포 위계, 미니멀 컴포넌트, 테두리 없는 카드
- **Basement Studio** (basement.studio) — 자신감 있는 에이전시 톤, 볼드 헤딩, 모듈형 그리드

### 핵심 원칙
1. **타이포그래피로 위계를 만든다** — 사이즈/웨이트 대비로 시선 유도
2. **컴포넌트에 디테일을 넣는다** — 글라스모피즘, 미세 보더, hover 인터랙션
3. **섹션 간 리듬감** — 풀폭/카드그리드/텍스트블록을 교차 배치
4. **브랜드 컬러 일관성** — 로고 기반 팔레트로 통일

## 디자인 시스템

### 1. 컬러 토큰

```
--brand-bg:        #0A0A0A      (배경)
--brand-surface:   #141414      (카드/섹션 배경)
--brand-border:    rgba(255,255,255,0.08)  (미세 보더)
--brand-primary:   #E84B8A      (핑크 — CTA, 강조, 링크)
--brand-secondary: #2D2B55      (딥 네이비 — 그라디언트, 보조)
--brand-gradient:  linear-gradient(135deg, #2D2B55, #E84B8A)  (액센트 그라디언트)
--brand-text:      #FFFFFF      (본문)
--brand-muted:     #888888      (보조 텍스트)
--brand-subtle:    rgba(255,255,255,0.4)  (3차 텍스트)
```

### 2. 타이포그래피

| 역할 | 폰트 | 사이즈 | 웨이트 | letter-spacing |
|------|------|--------|--------|----------------|
| Display (숫자/임팩트) | Plus Jakarta Sans | 64-80px | 800 | -3px |
| H1 (섹션 메인 헤딩) | Plus Jakarta Sans | 40-56px | 800 | -2px |
| H2 (섹션 서브 헤딩) | Plus Jakarta Sans | 28-36px | 700 | -1px |
| H3 (카드 타이틀) | Plus Jakarta Sans | 20-24px | 700 | -0.5px |
| Body (본문) | Pretendard | 15-16px | 400 | 0 |
| Body Bold | Pretendard | 15-16px | 600 | 0 |
| Caption (작은 텍스트) | Pretendard | 12-13px | 500 | 0 |
| Label (태그/뱃지) | Plus Jakarta Sans | 11-12px | 600 | 1px (uppercase) |

**원칙:**
- 영문/숫자 헤딩: Plus Jakarta Sans (임팩트)
- 한국어 본문: Pretendard (가독성)
- 헤딩과 본문 사이 사이즈 갭을 크게 잡아 위계 강조
- letter-spacing 음수값으로 헤딩에 타이트한 느낌

### 3. 컴포넌트 스타일

#### 카드
```
배경: rgba(255,255,255,0.03)
보더: 1px solid rgba(255,255,255,0.06)
radius: 16px (rounded-2xl)
hover: border-color → rgba(255,255,255,0.12), 미세 scale(1.01)
패딩: 24px
```
- 그림자 없음 (Linear 스타일)
- hover 시 보더만 밝아지는 미세 인터랙션
- 내부 여백 넉넉하게

#### 버튼
```
Primary:
  배경: linear-gradient(135deg, #2D2B55, #E84B8A)
  텍스트: #fff, 14px, font-weight 700
  radius: 10px
  패딩: 12px 28px
  hover: opacity 0.9 + 미세 glow (box-shadow: 0 0 20px rgba(232,75,138,0.3))

Secondary:
  배경: transparent
  보더: 1px solid rgba(255,255,255,0.15)
  텍스트: #fff, 14px, font-weight 500
  radius: 10px
  hover: border-color → rgba(255,255,255,0.3)
```

#### 섹션 구분
- 배경색 변화 대신 **border-t** (line divider) 방식으로 섹션 구분 (Linear 패턴)
- 일부 핵심 섹션(히어로, SocialProof)에만 그라디언트 배경 허용
- 섹션 간 수직 패딩: py-24 (96px) — 현재 py-20보다 넓게

#### 뱃지/태그
```
배경: rgba(232,75,138,0.1)
텍스트: #E84B8A
radius: 6px
패딩: 4px 10px
폰트: Plus Jakarta Sans 11px, weight 600, uppercase, letter-spacing 1px
```

#### 네비게이션
```
배경: rgba(10,10,10,0.8) + backdrop-blur-xl
보더: border-b 1px solid rgba(255,255,255,0.06)
로고: Plus Jakarta Sans, 700, tracking-tight
CTA 버튼: gradient primary (소형)
```

### 4. 레이아웃 패턴

섹션 간 단조로움을 깨기 위해 3가지 레이아웃을 교차 사용:

| 패턴 | 적용 섹션 | 설명 |
|------|-----------|------|
| **풀폭 임팩트** | Hero, FinalCTA | 전체 폭, 큰 타이포, 그라디언트 배경 |
| **카드 그리드** | PainPoints, Services, Pricing | 2-3 컬럼 카드 배치 |
| **텍스트+비주얼 스플릿** | Comparison, About, ReportSample | 좌우 분할 (텍스트 | 이미지/차트) |
| **스탯 리본** | StatsRibbon, SocialProof | 수평 나열, 큰 숫자 강조 |
| **타임라인** | Process | 수직/수평 스텝 시각화 |

**교차 배치 순서:**
1. Hero (풀폭 임팩트)
2. PainPoints (카드 그리드 3col)
3. Comparison (텍스트+비주얼 스플릿)
4. StatsRibbon (스탯 리본)
5. Services (카드 그리드 탭)
6. Portfolio (카드 그리드 2col — 큰 카드)
7. SocialProof (스탯 리본 + 카드)
8. About (텍스트+비주얼 스플릿)
9. ReportSample (텍스트+비주얼 스플릿)
10. Process (타임라인)
11. Pricing (카드 그리드 3col)
12. FAQ (단일 컬럼 아코디언)
13. AuditPreview (풀폭 임팩트)
14. FinalCTA (풀폭 임팩트)

### 5. 애니메이션 가이드

- **스크롤 트리거**: 기존 AnimateOnScroll 유지, duration 0.6s
- **스태거 딜레이**: 카드 그리드에서 i * 0.08s (현재 0.1s보다 빠르게)
- **hover 인터랙션**: 모든 카드/버튼에 미세 transition (border, scale, glow)
- **숫자 카운트업**: Display 숫자(+539%, 20+ 등)에 카운트업 애니메이션 추가
- **그라디언트 시프트**: 히어로 배경 그라디언트에 미세 움직임 (CSS animation)

### 6. 반응형 브레이크포인트

| 브레이크포인트 | 변화 |
|---------------|------|
| ≥1280px (lg) | 풀 레이아웃, 3col 그리드 |
| ≥768px (md) | 2col 그리드, 축소된 여백 |
| <768px (sm) | 1col 스택, 모바일 네비게이션 |

Display 폰트 사이즈: 80px → 48px → 36px (반응형)

## 적용 범위

### 변경하는 것
- globals.css: 컬러 토큰 전면 교체
- 폰트: Plus Jakarta Sans 추가 (Google Fonts CDN)
- 모든 컴포넌트: 새 디자인 토큰 적용
- 레이아웃 패턴: 섹션별 교차 배치

### 변경하지 않는 것
- 14개 섹션 구성 및 순서
- 콘텐츠/카피
- 데이터 레이어 (JSON 파일)
- /diagnostic 진단 폼 로직
- /blog 블로그 구조
- SEO 설정 (메타태그, JSON-LD, sitemap)

## 구현 순서

1. **디자인 토큰 정의** — globals.css 컬러/타이포 변수 교체, Plus Jakarta Sans 로드
2. **공통 컴포넌트 리디자인** — CTAButton, Card, SectionWrapper, Badge, Navbar, Footer
3. **섹션별 적용** — Hero → PainPoints → Comparison → ... → FinalCTA 순서
4. **인터랙션 추가** — hover, 카운트업, 그라디언트 애니메이션
5. **반응형 검증** — 모바일/태블릿/데스크톱 확인
6. **최종 QA** — 전체 흐름 점검, 성능 확인

## 성공 기준

- 모든 섹션에 새 컬러 토큰 일관 적용
- 폰트 위계가 명확히 구분됨 (Display > H1 > H2 > H3 > Body)
- 카드/버튼 hover 인터랙션 동작
- 모바일에서 깨지지 않음
- Lighthouse Performance 90+ 유지
