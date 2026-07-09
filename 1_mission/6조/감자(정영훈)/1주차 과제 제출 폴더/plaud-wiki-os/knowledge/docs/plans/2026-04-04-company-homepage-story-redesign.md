# 우리 회사 홈페이지 스토리텔링 재설계 — 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기능 나열형 다크 홈페이지를 스토리텔링 기반 라이트 홈페이지로 전면 재설계. 메인 홈 + 서비스 6페이지 + 성공사례 페이지 신규 구축.

**Architecture:** 기존 Next.js 16 App Router + Tailwind v4 유지. globals.css 디자인 토큰을 다크→라이트로 교체. 서비스 페이지 6개가 공통 스토리 아크 구조를 공유하므로, 재사용 컴포넌트(StorySection, BeforeAfterPanel, ProofCard 등)를 먼저 만들고 각 페이지에서 데이터만 교체. 기존 14개 섹션 컴포넌트는 삭제하지 않고 사용하지 않는 것으로 두되, 새 컴포넌트와 혼동하지 않도록 정리.

**Tech Stack:** Next.js 16.2.2 (App Router), React 19, Tailwind CSS v4 (@theme), Framer Motion 12, TypeScript 5

**스펙 문서:** `docs/superpowers/specs/2026-04-04-homepage-story-redesign.md`

**와이어프레임:** `.superpowers/brainstorm/70571-1775234833/` 디렉토리 내 HTML 파일들

**작업 디렉토리:** 모든 bash 명령은 저장소 루트(`/Users/user/Desktop/claude code/`)에서 실행. 파일 경로는 `web-app/` 접두어 포함.

---

## 파일 구조 계획

### 새로 생성

```
web-app/
├── app/
│   ├── page.tsx                          ← 홈 완전 재작성
│   ├── case-studies/
│   │   └── page.tsx                      ← 성공사례
│   ├── google-maps/
│   │   └── page.tsx                      ← 서비스: 구글 지도
│   ├── youtube/
│   │   └── page.tsx                      ← 서비스: 유튜브
│   ├── instagram/
│   │   └── page.tsx                      ← 서비스: 인스타·숏폼
│   ├── search-ads/
│   │   └── page.tsx                      ← 서비스: 검색광고
│   ├── naver/
│   │   └── page.tsx                      ← 서비스: 네이버
│   ├── website/
│   │   └── page.tsx                      ← 서비스: 홈페이지 제작
│   ├── pricing/
│   │   └── page.tsx                      ← 가격 (기존 섹션 → 별도 페이지)
│   └── faq/
│       └── page.tsx                      ← FAQ (기존 섹션 → 별도 페이지)
├── components/
│   └── story/                            ← 새 스토리텔링 컴포넌트
│       ├── StoryHero.tsx                 ← 진단 입력 히어로
│       ├── StorySection.tsx              ← 스토리 아크 섹션 래퍼
│       ├── EmpathySection.tsx            ← 공감 섹션
│       ├── ReframeSection.tsx            ← 문제 재정의 (다크)
│       ├── JourneySection.tsx            ← 환자 여정
│       ├── OurWaySection.tsx             ← 우리의 방식
│       ├── ProofSection.tsx              ← 증거/성과 숫자
│       ├── CEOSection.tsx                ← 대표 메시지
│       ├── FinalCTAStory.tsx             ← 스토리 CTA
│       ├── NavbarStory.tsx               ← 새 네비게이션
│       ├── FooterStory.tsx               ← 새 푸터
│       ├── BeforeAfterPanel.tsx          ← Before→After 비교 패널
│       ├── ProofCard.tsx                 ← 성과 숫자 카드
│       ├── ServiceStoryLayout.tsx        ← 서비스 페이지 공통 레이아웃
│       └── CaseCard.tsx                  ← 성공사례 카드
└── data/
    └── service-stories.json              ← 서비스별 스토리 카피 데이터
```

### 수정

```
app/globals.css                           ← 디자인 토큰 다크→라이트 전환
app/layout.tsx                            ← Navbar 교체, JSON-LD 업데이트
app/sitemap.ts                            ← 새 라우트 추가
```

### 기존 유지 (수정 없음)

```
app/blog/                                 ← 블로그 기존 유지
app/diagnostic/                           ← 진단 기존 유지
app/privacy/                              ← 프라이버시 기존 유지
components/diagnostic/                    ← 진단 컴포넌트 기존 유지
data/case-studies.json                    ← 기존 데이터 유지 (사용자가 숫자 수정)
data/articles.json                        ← 기존 유지
data/clients.json                         ← 기존 유지
```

---

## Task 1: 디자인 토큰 교체 (다크→라이트)

**Files:**
- Modify: `web-app/app/globals.css`

- [ ] **Step 1: globals.css 디자인 토큰 교체**

기존 다크 토큰을 라이트로 전환:

```css
@import "tailwindcss";

@theme {
  --color-brand-bg: #FAFAF8;
  --color-brand-surface: #ffffff;
  --color-brand-border: rgba(0, 0, 0, 0.06);
  --color-brand-primary: #111111;
  --color-brand-accent: #D4380D;
  --color-brand-text: #1a1a1a;
  --color-brand-muted: #888888;
  --color-brand-subtle: rgba(0, 0, 0, 0.4);
  --color-brand-dark: #111111;
  --color-brand-dark-text: #ffffff;
  --font-family-sans: "Pretendard", sans-serif;
  --font-family-display: "Plus Jakarta Sans", sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: #ffffff;
  color: #1a1a1a;
}
```

- [ ] **Step 1.5: tailwind.config.ts 정리**

`web-app/tailwind.config.ts`에 다크 테마 색상이 `theme.extend.colors.brand.*`로 하드코딩되어 있으면 제거 또는 라이트 값으로 교체. `globals.css`의 `@theme`이 Tailwind v4에서 진실의 원천(source of truth)이므로, `tailwind.config.ts`의 color 오버라이드가 충돌하지 않도록 확인.

- [ ] **Step 2: 브라우저에서 기존 페이지가 깨지는지 확인**

Run: `open http://localhost:3000`

기존 다크 컴포넌트들은 토큰 변경으로 깨지지만 이는 예상된 동작. 새 컴포넌트로 대체할 예정.

- [ ] **Step 3: 커밋**

```bash
git add web-app/app/globals.css
git commit -m "chore: 디자인 토큰 다크→라이트 전환"
```

---

## Task 2: 서비스 스토리 데이터 생성

**Files:**
- Create: `web-app/data/service-stories.json`

- [ ] **Step 1: 서비스별 스토리 카피 데이터 파일 생성**

```json
{
  "google-maps": {
    "title": "Google Maps 최적화",
    "slug": "google-maps",
    "icon": "📍",
    "iconBg": "#E8F0FE",
    "empathy": {
      "headline": "구글 지도에서 우리 병원,\n환자 눈에 보이고 있나요?",
      "body": "내수 환자 — 단가 낮고 경쟁 치열합니다.\n같은 비용, 같은 노력이면 외국인 환자가 답입니다."
    },
    "reframe": {
      "headline": "구글 지도 정보 반출,\n알고 계셨나요?",
      "body": "네이버 플레이스의 지도 데이터가 구글 대비 신뢰도가 떨어지고 있습니다.",
      "detail": "구글 지도 정보 반출 이슈 → 네이버 플레이스 데이터 정확도 하락 → 구글 지도 점유율 상승 → 외국인은 물론, 내국인도 구글 지도로 이동 중",
      "killer": "구글 지도 점유율 상승"
    },
    "insight": {
      "headline": "외국인 환자는\n구글에서 시작하고 구글에서 끝납니다.",
      "body": "검색 → 지도 → 리뷰 확인 → 길찾기 → 방문.\n이 전체 여정이 Google 안에서 일어납니다.",
      "detail": "외국인 환자 객단가 = 내수 대비 3~10배 이상\n경쟁은 아직 블루오션 — 대부분 병원이 구글을 방치 중"
    },
    "method": {
      "headline": "GBP 프로필 최적화부터\n다국어 리뷰 관리까지.",
      "body": "구글 비즈니스 프로필 세팅, 키워드 최적화, 리뷰 관리,\n다국어 대응, 월간 성과 리포트."
    },
    "proof": {
      "headline": "협력병원1 — 1개월 만에 노출 +539%",
      "caseIds": ["case-1", "case-2"]
    },
    "cta": {
      "text": "우리 병원이 구글에서 어떻게 보이는지, 무료로 확인하세요",
      "type": "diagnostic"
    }
  },
  "youtube": {
    "title": "YouTube",
    "slug": "youtube",
    "icon": "🎬",
    "iconBg": "#FEE2E2",
    "empathy": {
      "headline": "원장님 영상 하나 없이,\n환자 신뢰를 어떻게 얻으시겠어요?",
      "body": "환자는 돈 쓰기 전에 확인합니다. 시술 설명, 원장님 말투, 병원 분위기 — 다 영상으로."
    },
    "reframe": {
      "headline": "유튜브는 가장 강력한\n설득 도구입니다.",
      "body": "숏폼은 관심을 끕니다.",
      "detail": "하지만 롱폼을 끝까지 본 환자는, 무조건 옵니다. 그리고 결제합니다.\n10분짜리 영상을 다 본 사람은 이미 마음을 정한 사람입니다.",
      "killer": "롱폼을 끝까지 본 환자는, 무조건 옵니다. 그리고 결제합니다."
    },
    "insight": {
      "headline": "영상 하나가\n영업사원 100명을 대체합니다.",
      "body": "24시간 돌아가는 설득 콘텐츠. 한 번 만들면 계속 일합니다.\n광고비 0원으로 매달 환자를 데려옵니다."
    },
    "method": {
      "headline": "기획 → 촬영 → 편집 → 배포\n원장님은 촬영만.",
      "body": "어떤 주제로, 어떻게 말해야 하는지까지.\n원장님은 카메라 앞에 서시기만 하면 됩니다."
    },
    "proof": {
      "headline": "실제 제작 영상 + \"이 영상 보고 왔어요\" 후기",
      "caseIds": []
    },
    "cta": {
      "text": "우리 병원 영상, 어떻게 만들면 좋을지 상담받기",
      "type": "contact"
    }
  },
  "instagram": {
    "title": "Instagram · 숏폼",
    "slug": "instagram",
    "icon": "📸",
    "iconBg": "#F3E8FF",
    "empathy": {
      "headline": "인스타 해야 하는 건 아는데,\n뭘 올려야 할지 모르겠어요.",
      "body": "매일 콘텐츠 만드는 건 진료하면서 불가능합니다."
    },
    "reframe": {
      "headline": "숏폼은 유도탄입니다.",
      "body": "유튜브 롱폼은 환자가 찾아오는 구조.",
      "detail": "인스타·틱톡 숏폼은 알고리즘이 환자를 찾아가는 구조.\n활발한 알고리즘이 콘텐츠를 타겟에게 직접 배달합니다.",
      "killer": "알고리즘이 환자를 찾아가는 구조"
    },
    "insight": {
      "headline": "롱폼 = 설득,\n숏폼 = 발견.",
      "body": "둘 다 있어야 완성입니다.\n숏폼으로 발견 → 프로필 방문 → 롱폼으로 설득 → 예약."
    },
    "method": {
      "headline": "월 콘텐츠 캘린더 +\n촬영·편집·업로드 대행",
      "body": "트렌드 반영, 해시태그 전략, 릴스/숏츠 동시 배포."
    },
    "proof": {
      "headline": "콘텐츠 성과 데이터",
      "caseIds": []
    },
    "cta": {
      "text": "우리 병원 SNS, 어떻게 살릴 수 있을지 상담받기",
      "type": "contact"
    }
  },
  "search-ads": {
    "title": "검색광고",
    "slug": "search-ads",
    "icon": "🎯",
    "iconBg": "#FEF3C7",
    "empathy": {
      "headline": "광고비만 나가고,\n진짜 환자가 오는 건지 모르겠어요.",
      "body": "대행사 보고서에는 클릭 수만 있고, 예약은 추적이 안 됩니다."
    },
    "reframe": {
      "headline": "건당 n만 원짜리 디비 광고,\n합리적이라고 생각하세요?",
      "body": "DB 광고 = 건당 n만 원대, 질은 보장 안 됨",
      "detail": "검색광고 = 이미 \"치과 추천\"을 검색한 환자. 의도가 있는 환자만 데려옵니다.\n전환 추적까지 하면, 어떤 키워드가 실제 예약으로 이어지는지 숫자로 보입니다.",
      "killer": "의도가 있는 환자만 데려옵니다"
    },
    "insight": {
      "headline": "외국인 타겟이면,\n구글 지도와 시너지가 폭발합니다.",
      "body": "구글 검색광고 + 구글 지도 최적화 = 검색 결과 상단 + 지도 노출 동시.\n외국인 환자가 \"dermatologist seoul\" 검색하면 광고와 지도 둘 다에 보입니다."
    },
    "method": {
      "headline": "키워드 설계 → 전환 추적 → 매주 최적화",
      "body": "클릭이 아니라 예약을 추적합니다.\n어떤 키워드에서, 몇 명이 실제로 예약했는지 매주 보고."
    },
    "proof": {
      "headline": "우리 회사 진단 랜딩 검색광고 실제 데이터",
      "caseIds": []
    },
    "cta": {
      "text": "현재 광고비 대비 효율, 무료로 분석해 드립니다",
      "type": "contact"
    }
  },
  "naver": {
    "title": "Naver 플레이스",
    "slug": "naver",
    "icon": "🇳",
    "iconBg": "#D1FAE5",
    "empathy": {
      "headline": "네이버 플레이스에서\n우리 병원이 밀리고 있어요.",
      "body": "블로그는 꾸준히 쓰는데, 정작 플레이스 순위는 안 올라갑니다."
    },
    "reframe": {
      "headline": "상위 노출 안 되면,\n돈 안 받습니다.",
      "body": "",
      "detail": "네이버 플레이스 상위 노출 보장.\n올라가지 않으면 비용을 청구하지 않습니다.\n\"해봐야 아는 거\"가 아니라, 결과가 먼저입니다.",
      "killer": "상위 노출 안 되면, 돈 안 받습니다"
    },
    "insight": null,
    "method": {
      "headline": "플레이스 최적화 +\n블로그·지도 연동",
      "body": "플레이스 단독이 아니라, 블로그·지도·리뷰를 하나로 엮어\n네이버 검색 생태계 전체에서 노출합니다."
    },
    "proof": {
      "headline": "네이버 플레이스 순위 변화 데이터",
      "caseIds": []
    },
    "cta": {
      "text": "우리 병원 네이버 순위, 지금 확인하기",
      "type": "contact",
      "guarantee": "상위 노출 안 되면 비용 0원"
    }
  },
  "website": {
    "title": "홈페이지 제작",
    "slug": "website",
    "icon": "🌐",
    "iconBg": "#E0E7FF",
    "empathy": {
      "headline": "홈페이지 있긴 한데,\n거기서 예약이 들어온 적이 있나요?",
      "body": "전환 추적이 안 되는 홈페이지. 환자가 왔다 갔는지조차 모릅니다."
    },
    "reframe": {
      "headline": "이런 홈페이지는\n없는 게 낫습니다.",
      "body": "",
      "detail": "❌ 시술 내용만 줄줄줄줄 써놔서 글로 벽을 만든 홈페이지\n❌ 전환 추적 코드 하나 없는 홈페이지\n❌ 페이지 수만 많아서 견적만 뻥튀기된 홈페이지\n\n예쁘기만 한 홈페이지는 카탈로그입니다. 마케팅 도구가 아닙니다.",
      "killer": "글로 벽을 만든"
    },
    "insight": {
      "headline": "홈페이지는 영업사원입니다.\n24시간 일하는.",
      "body": "환자가 들어와서 예약 버튼을 누르기까지 —\n그 동선을 설계하는 게 홈페이지입니다."
    },
    "method": {
      "headline": "마케터가 함께 만드는\n전환형 홈페이지.",
      "body": "디자이너 + 마케터가 함께 설계\n→ 환자가 예약할 수밖에 없는 동선 구조\n→ 전환 추적으로 어떤 페이지에서 이탈하는지 실시간 파악\n→ Microsoft Clarity 연동으로 히트맵·세션 리플레이\n→ 데이터 보고 매달 개선"
    },
    "proof": {
      "headline": "전환형 홈페이지 제작 사례",
      "caseIds": []
    },
    "cta": {
      "text": "현재 홈페이지 전환율, 무료로 진단해 드립니다",
      "type": "contact"
    }
  }
}
```

- [ ] **Step 2: lib/data.ts에 타입 추가**

`web-app/lib/data.ts`에 추가:

```typescript
import serviceStories from "@/data/service-stories.json";
export type ServiceStory = (typeof serviceStories)[keyof typeof serviceStories];
export { serviceStories };

// 참고: ServiceStory.insight는 null일 수 있음 (naver). 
// ServiceStoryLayout에서 null 체크 필요.
```

- [ ] **Step 3: 커밋**

```bash
git add web-app/data/service-stories.json web-app/lib/data.ts
git commit -m "feat: 서비스별 스토리 카피 데이터 추가"
```

---

## Task 3: 공통 스토리 컴포넌트 생성

**Files:**
- Create: `web-app/components/story/StorySection.tsx`
- Create: `web-app/components/story/BeforeAfterPanel.tsx`
- Create: `web-app/components/story/ProofCard.tsx`
- Create: `web-app/components/story/CaseCard.tsx`

- [ ] **Step 1: StorySection 래퍼 컴포넌트**

`web-app/components/story/StorySection.tsx` — 스토리 아크 섹션 공통 래퍼. 라벨 + 제목 + 본문 + 선택적 디테일 박스.

props:
```typescript
interface StorySectionProps {
  label?: string;           // "솔직한 이야기" 등
  labelColor?: string;      // text color for label
  headline: string;         // \n을 <br>로 변환
  body?: string;
  detail?: string;          // 배경 박스 안에 들어가는 상세 설명
  killer?: string;          // detail 내에서 강조할 문자열
  dark?: boolean;           // true면 bg-[#111] text-white
  centered?: boolean;       // true면 text-center
  children?: React.ReactNode;
}
```

- 기본: `max-w-[720px] mx-auto py-[120px] px-6`
- dark 모드: `bg-[#111] text-white` (문제 재정의 섹션용)
- dark일 때 풀와이드 배경 필요하므로 외부 div에 bg, 내부에 max-w 적용
- headline에서 `\n`을 `<br />`로 치환해서 렌더링
- detail이 있으면 `bg-[#FAFAF8] rounded-lg p-4` 박스 (dark면 `bg-white/5`)
- killer 문자열이 있으면 detail 안에서 해당 부분을 `<strong class="text-[#D4380D]">`로 감싸기 (dark면 `text-white font-bold`)

- [ ] **Step 2: BeforeAfterPanel 컴포넌트**

`web-app/components/story/BeforeAfterPanel.tsx` — 케이스스터디의 Before→After 비교.

props:
```typescript
interface Metric {
  label: string;
  value: string;
}
interface BeforeAfterPanelProps {
  beforeLabel?: string;     // default "BEFORE"
  afterLabel?: string;      // default "AFTER"
  beforeMetrics: Metric[];
  afterMetrics: Metric[];
}
```

- 3-column grid: before(bg-[#F5F5F3]) | arrow(그래디언트) | after(bg-[#111] text-white)
- 와이어프레임 참조: `case-studies-design.html`의 `.before-after` 구조 그대로

- [ ] **Step 3: ProofCard 컴포넌트**

`web-app/components/story/ProofCard.tsx` — 성과 숫자 한 줄 카드.

props:
```typescript
interface ProofCardProps {
  hospital: string;
  metric: string;
  value: string;            // "+539%" | "#1"
  valueColor?: string;      // default "#059669" (green)
}
```

- flex justify-between, border-bottom 구분선
- value는 text-4xl font-black

- [ ] **Step 4: CaseCard 컴포넌트**

`web-app/components/story/CaseCard.tsx` — 성공사례 페이지용 풀 케이스 카드.

props:
```typescript
interface CaseCardProps {
  badge: string;            // "피부과 · Google Maps"
  hospital: string;
  headline: string;
  subtitle: string;
  beforeAfter: BeforeAfterPanelProps;
  changes: { delta: string; description: string; }[];
  stories: { type: "situation" | "action" | "result"; text: string; }[];
  testimonial?: { quote: string; author: string; };
}
```

- 와이어프레임 `case-studies-design.html`의 `.case-card` 구조 그대로
- stories의 type별 색상 dot: situation=red, action=blue, result=green

- [ ] **Step 5: 커밋**

```bash
git add web-app/components/story/
git commit -m "feat: 스토리텔링 공통 컴포넌트 — StorySection, BeforeAfterPanel, ProofCard, CaseCard"
```

---

## Task 4: 네비게이션 + 푸터

**Files:**
- Create: `web-app/components/story/NavbarStory.tsx`
- Create: `web-app/components/story/FooterStory.tsx`
- Modify: `web-app/app/layout.tsx`

- [ ] **Step 1: NavbarStory 컴포넌트**

`web-app/components/story/NavbarStory.tsx` — "use client"

- 라이트 배경: `bg-white/90 backdrop-blur-xl border-b border-black/5`
- 로고: `우리 회사` (font-bold tracking-[2px] text-[15px])
- 네비 링크: 서비스(드롭다운), 성공사례(/case-studies), 가격(/pricing), 블로그(/blog)
- 서비스 드롭다운: Google Maps, YouTube, Instagram, 검색광고, Naver, 홈페이지 제작
- CTA: "무료 진단 받기" → `/diagnostic` (bg-[#111] text-white rounded-md)
- 모바일 햄버거 메뉴 (기존 Navbar.tsx 패턴 참고)

- [ ] **Step 2: FooterStory 컴포넌트**

`web-app/components/story/FooterStory.tsx`

- 라이트 배경: `bg-[#FAFAF8] border-t border-black/5`
- 3-column: 브랜드 | 서비스 링크 | SNS+연락처
- `process.env.NEXT_PUBLIC_PHONE` (기존 패턴 유지)
- 하단: copyright + /privacy 링크

- [ ] **Step 3: layout.tsx 수정**

기존 `<Navbar />` → `<NavbarStory />`로 교체. JSON-LD 유지. body 클래스에서 다크 관련 제거.

- [ ] **Step 4: 커밋**

```bash
git add web-app/components/story/NavbarStory.tsx web-app/components/story/FooterStory.tsx web-app/app/layout.tsx
git commit -m "feat: 스토리 네비게이션 + 푸터 — 라이트 테마"
```

---

## Task 5: 메인 홈페이지 재작성

**Files:**
- Create: `web-app/components/story/StoryHero.tsx`
- Create: `web-app/components/story/EmpathySection.tsx`
- Create: `web-app/components/story/ReframeSection.tsx`
- Create: `web-app/components/story/JourneySection.tsx`
- Create: `web-app/components/story/OurWaySection.tsx`
- Create: `web-app/components/story/ProofSection.tsx`
- Create: `web-app/components/story/CEOSection.tsx`
- Create: `web-app/components/story/FinalCTAStory.tsx`
- Modify: `web-app/app/page.tsx`

- [ ] **Step 1: StoryHero — 진단 입력 히어로**

"use client" (입력 상태 관리)

```
배지: "병원 마케팅 전문 파트너"
h1: "구글에서 우리 병원,\n환자 눈에 보이고 있을까?"
sub: "병원 이름만 입력하면, 구글 검색 노출 상태를 바로 확인합니다."
검색창: input + "무료 진단" 버튼
예시: 협력병원1, 협력병원2, C의원
```

- 입력 후 엔터 또는 버튼 클릭 → `router.push(\`/diagnostic?q=\${encodeURIComponent(value)}\`)`
- **중요:** `app/diagnostic/page.tsx`에서 `searchParams.q`를 읽어서 `DiagnosticForm`에 `initialQuery` prop으로 전달하는 로직 추가 필요. 기존 DiagnosticForm은 query param을 읽지 않으므로, `HospitalSearch`에 초기값 주입 로직을 추가해야 함.
- 와이어프레임 `hero-diagnostic.html` 참조
- min-h-screen, centered flex, bg-gradient-to-b from-[#FAFAF8] to-white
- 검색창: border-2 border-[#111] rounded-2xl shadow-lg

- [ ] **Step 2: EmpathySection**

Server component. 하드코딩 카피:
```
label: "솔직한 이야기" (color: #E84B8A)
headline: "블로그도 쓰고,\n광고도 돌리고,\n인스타도 하는데—\n\n왜 환자는 안 늘까요?"
body: "진료 끝나고 밤늦게 블로그 쓰시죠.\n광고비는 나가는데 뭐가 효과인지 모르겠고.\n대행사는 보고서만 보내고 끝."
```

StorySection 래퍼 사용. "왜 환자는 안 늘까요?"는 accent 컬러(#D4380D).

- [ ] **Step 3: ReframeSection — 다크 반전**

```
체크리스트: ✓ 네이버 블로그 상위 노출 / ✓ 인스타 릴스 10만 뷰 / ✓ 구글 광고 클릭률 상승
question: "이게 진짜 성공일까요?"
answer: "채널 하나가 잘 되는 건, 마케팅의 일부일 뿐입니다."
```

StorySection dark=true centered=true 사용. 체크리스트는 children으로 전달.

- [ ] **Step 4: JourneySection — 환자 여정**

```
label: "환자의 여정" (color: #2563EB)
headline: "환자는 한 채널에서\n결정하지 않습니다."
4 steps: 구글 검색 → 유튜브 확인 → 인스타 비교 → 예약
```

각 step: 숫자(1~4) + 플랫폼 아이콘 컬러 + 제목 + 설명. border-bottom 구분.
마지막 문장: "이 전체 여정이 끊기면, 환자는 다른 병원으로 갑니다."

- [ ] **Step 5: OurWaySection**

```
label: "우리 회사의 방식" (color: #059669)
headline: "전체 채널을\n하나의 시스템으로."
body + 채널 필: Google Maps, YouTube, Instagram, Search Ads, Naver, Website
```

centered=true. 채널 필은 3-col grid, bg-[#F5F5F3] rounded-xl.

- [ ] **Step 6: ProofSection — 성과 숫자**

case-studies.json에서 상위 3개 읽어서 ProofCard 3장 렌더링.
하단: "현재 20개+ 병원과 함께하고 있습니다" + "자세히 보기 →" /case-studies 링크.

- [ ] **Step 7: CEOSection — 대표 메시지**

```
label: "우리가 이 일을 하는 이유"
인용문 + 대표 이름/직함
사진 자리: 160x200 placeholder (bg-[#E8E8E4] rounded-xl)
```

2-col flex: 사진 | 텍스트 (모바일에서 1-col).

- [ ] **Step 8: FinalCTAStory**

```
dark 배경 (#111)
headline: "우리 병원 마케팅,\n한번 확인해 보세요."
sub: "5분이면 현재 상태를 진단해 드립니다."
버튼: "무료 진단 시작하기" → /diagnostic
note: "상담 비용 없음 · 5분 소요 · 리포트 즉시 제공"
```

- [ ] **Step 9: app/page.tsx 재작성**

기존 import 전부 제거하고 새 컴포넌트로 교체:

```typescript
import StoryHero from "@/components/story/StoryHero";
import EmpathySection from "@/components/story/EmpathySection";
import ReframeSection from "@/components/story/ReframeSection";
import JourneySection from "@/components/story/JourneySection";
import OurWaySection from "@/components/story/OurWaySection";
import ProofSection from "@/components/story/ProofSection";
import CEOSection from "@/components/story/CEOSection";
import FinalCTAStory from "@/components/story/FinalCTAStory";
import FooterStory from "@/components/story/FooterStory";

export default function Home() {
  return (
    <main>
      <StoryHero />
      <EmpathySection />
      <ReframeSection />
      <JourneySection />
      <OurWaySection />
      <ProofSection />
      <CEOSection />
      <FinalCTAStory />
      <FooterStory />
    </main>
  );
}
```

- [ ] **Step 10: 브라우저에서 전체 흐름 확인**

Run: `open http://localhost:3000`

9섹션이 순서대로 렌더링되는지, 스크롤 흐름이 자연스러운지 확인.

- [ ] **Step 11: 커밋**

```bash
git add web-app/components/story/ web-app/app/page.tsx
git commit -m "feat: 메인 홈페이지 스토리텔링 재설계 — 9섹션 내러티브"
```

---

## Task 6: 서비스 페이지 공통 레이아웃 + 6개 라우트

**Files:**
- Create: `web-app/components/story/ServiceStoryLayout.tsx`
- Create: `web-app/app/google-maps/page.tsx`
- Create: `web-app/app/youtube/page.tsx`
- Create: `web-app/app/instagram/page.tsx`
- Create: `web-app/app/search-ads/page.tsx`
- Create: `web-app/app/naver/page.tsx`
- Create: `web-app/app/website/page.tsx`

- [ ] **Step 1: ServiceStoryLayout 공통 레이아웃**

`web-app/components/story/ServiceStoryLayout.tsx`

props:
```typescript
interface ServiceStoryLayoutProps {
  story: ServiceStory;     // service-stories.json의 한 항목
  children?: React.ReactNode;  // 서비스별 커스텀 콘텐츠 (증거 섹션 등)
}
```

렌더링 순서:
1. 서비스 히어로 (아이콘 + 타이틀)
2. StorySection — 공감 (empathy)
3. StorySection — 재정의 (reframe) dark=true
4. StorySection — 인사이트 (insight) (null이면 스킵 — naver)
5. StorySection — 우리 방식 (method)
6. children (증거 커스텀 영역)
7. CTA 섹션 — story.cta.type에 따라 진단 입력창 또는 상담 버튼
8. FooterStory

- [ ] **Step 2: /google-maps 페이지**

`web-app/app/google-maps/page.tsx`:

```typescript
import { serviceStories } from "@/lib/data";
import ServiceStoryLayout from "@/components/story/ServiceStoryLayout";
// case-studies에서 관련 케이스 가져와서 ProofCard/CaseCard로 렌더링

export const metadata = {
  title: "Google Maps 최적화 | 우리 회사",
  description: "외국인 환자가 구글에서 찾아오게. GBP 프로필 최적화, 다국어 리뷰 관리.",
};

export default function GoogleMapsPage() {
  const story = serviceStories["google-maps"];
  return (
    <ServiceStoryLayout story={story}>
      {/* 관련 케이스스터디 ProofCard */}
    </ServiceStoryLayout>
  );
}
```

- [ ] **Step 3: 나머지 5개 서비스 페이지**

같은 패턴으로 `/youtube`, `/instagram`, `/search-ads`, `/naver`, `/website` 생성.
각 파일은 `serviceStories[slug]`에서 데이터를 읽고, `ServiceStoryLayout`에 전달.
metadata (title, description)만 서비스별로 다름.

- [ ] **Step 4: 브라우저에서 6개 서비스 페이지 확인**

각 `/google-maps`, `/youtube` 등 접속해서 스토리 아크가 렌더링되는지 확인.

- [ ] **Step 5: 커밋**

```bash
git add web-app/components/story/ServiceStoryLayout.tsx web-app/app/google-maps/ web-app/app/youtube/ web-app/app/instagram/ web-app/app/search-ads/ web-app/app/naver/ web-app/app/website/
git commit -m "feat: 서비스 스토리 페이지 6개 — 공통 레이아웃 + 개별 라우트"
```

---

## Task 7: 성공사례 페이지

**Files:**
- Create: `web-app/app/case-studies/page.tsx`

- [ ] **Step 0: case-studies.json 스키마 확장**

현재 JSON에는 `CaseCard` props에 필요한 `beforeAfter`, `stories`, `testimonial`, `changes` 필드가 없음. 기존 `metrics` 배열을 활용하되, 각 케이스에 추가 필드 보강:

```typescript
// 추가 필드 (기존 metrics 외)
{
  "badge": "피부과 · Google Maps",
  "headlineShort": "1개월 만에 구글 프로필 조회수 6.4배 폭증.",
  "subtitle": "외국인 환자가 실제로 찾아오기 시작한 순간.",
  "stories": [
    { "type": "situation", "text": "..." },
    { "type": "action", "text": "..." },
    { "type": "result", "text": "..." }
  ],
  "testimonial": { "quote": "...", "author": "..." }
}
```

`CaseCard` 컴포넌트는 이 확장 스키마를 읽되, `beforeAfter`는 기존 `metrics`의 `before`/`after` 필드에서 자동 구성. 숫자는 사용자가 직접 수정.

- [ ] **Step 1: /case-studies 페이지**

와이어프레임 `case-studies-design.html` 구조 그대로:

1. 히어로: "숫자가 증명합니다."
2. 요약 숫자 리본 (20+, 539%, 896%, 7채널)
3. 케이스 카드 반복 — `case-studies.json`에서 읽어서 `CaseCard` 컴포넌트로 렌더링
4. 하단 CTA: "다음 성공사례의 주인공이 되세요"

metadata:
```typescript
export const metadata = {
  title: "성공사례 | 우리 회사",
  description: "실제 병원 마케팅 성과. 숫자가 증명합니다.",
};
```

- [ ] **Step 2: 브라우저 확인**

Run: `open http://localhost:3000/case-studies`

Before→After 패널, 숫자 뱃지, 스토리 3단이 잘 보이는지 확인.

- [ ] **Step 3: 커밋**

```bash
git add web-app/app/case-studies/
git commit -m "feat: 성공사례 페이지 — Before/After + 숫자 중심"
```

---

## Task 8: 가격 + FAQ 별도 페이지

**Files:**
- Create: `web-app/app/pricing/page.tsx`
- Create: `web-app/app/faq/page.tsx`

- [ ] **Step 1: /pricing 페이지**

기존 `components/sections/Pricing.tsx`의 로직을 가져오되 라이트 테마로 재스타일링.
`data/pricing.json` 그대로 사용. 3-tier 카드 + 애드온 섹션.

라이트 스타일:
- 카드: bg-white border border-black/6 rounded-2xl
- highlighted: border-[#111] border-2
- CTA 버튼: bg-[#111] text-white

- [ ] **Step 2: /faq 페이지**

기존 `components/sections/FAQ.tsx`의 아코디언 로직 가져오되 라이트 테마.
`data/faq.json` 그대로 사용.

- [ ] **Step 3: 커밋**

```bash
git add web-app/app/pricing/ web-app/app/faq/
git commit -m "feat: 가격/FAQ 별도 페이지 — 라이트 테마"
```

---

## Task 9: 사이트맵 + SEO 업데이트

**Files:**
- Modify: `web-app/app/sitemap.ts`
- Modify: `web-app/app/layout.tsx` (JSON-LD)

- [ ] **Step 1: sitemap.ts에 새 라우트 추가**

```typescript
const routes = [
  "", "google-maps", "youtube", "instagram", "search-ads",
  "naver", "website", "case-studies", "pricing", "faq",
  "diagnostic", "blog", "privacy",
];
```

- [ ] **Step 2: layout.tsx JSON-LD 업데이트**

`serviceType` 배열에 새 서비스 추가. `hasOfferCatalog` 추가 검토.

- [ ] **Step 3: 커밋**

```bash
git add web-app/app/sitemap.ts web-app/app/layout.tsx
git commit -m "chore: 사이트맵 + JSON-LD 업데이트 — 새 라우트 반영"
```

---

## Task 10: 기존 컴포넌트 정리

**Files:**
- 기존 `components/sections/` — 삭제하지 않음 (blog 등에서 참조 가능성)
- 기존 `components/visuals/` — 삭제하지 않음

- [ ] **Step 1: 사용되지 않는 import 확인**

`app/page.tsx`에서 기존 섹션 import가 모두 제거되었는지 확인.
blog, diagnostic 페이지가 정상 동작하는지 확인.

- [ ] **Step 2: 전체 빌드 확인**

Run: `cd web-app && npm run build`

빌드 에러 없는지 확인. 타입 에러 수정.

- [ ] **Step 3: 전체 라우트 수동 테스트**

```
/ → 9섹션 스토리
/google-maps → 구글 지도 스토리
/youtube → 유튜브 스토리
/instagram → 인스타 스토리
/search-ads → 검색광고 스토리
/naver → 네이버 스토리
/website → 홈페이지 스토리
/case-studies → 성공사례
/pricing → 가격
/faq → FAQ
/diagnostic → 진단 (기존 유지)
/blog → 블로그 (기존 유지)
/privacy → 프라이버시 (기존 유지)
```

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "chore: 빌드 정리 + 전체 라우트 확인"
```

---

## 실행 순서 요약

| Task | 내용 | 의존성 |
|------|------|--------|
| 1 | 디자인 토큰 교체 | 없음 |
| 2 | 서비스 스토리 데이터 | 없음 |
| 3 | 공통 스토리 컴포넌트 | Task 1 |
| 4 | 네비게이션 + 푸터 | Task 1 |
| 5 | 메인 홈페이지 | Task 3, 4 |
| 6 | 서비스 페이지 6개 | Task 2, 3, 4 |
| 7 | 성공사례 페이지 | Task 3 |
| 8 | 가격 + FAQ 페이지 | Task 1 |
| 9 | 사이트맵 + SEO | Task 5, 6, 7, 8 |
| 10 | 정리 + 빌드 확인 | 전부 |

**병렬 가능:**
- **Phase 1:** Task 1 + Task 2 동시
- **Phase 2:** Task 3 + Task 4 동시 (둘 다 Task 1 완료 필요)
- **Phase 3:** Task 5 (Task 3,4 필요) + Task 7 (Task 3만) + Task 8 (Task 1만) 동시
- **Phase 4:** Task 6 (Task 2,3,4 모두 필요 — Phase 2 완료 후)
- **Phase 5:** Task 9 → Task 10 순차
