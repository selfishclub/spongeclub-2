# 우리 회사 홈페이지 리브랜딩 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ourcompany.kr 홈페이지를 아임웹에서 Next.js로 전면 개편. 다크 프리미엄 톤, 7개 서비스 섹션, social proof, 기존 company-pipeline 진단 폼 통합.

**Architecture:** Next.js 14 App Router (SSG) + Tailwind CSS. 기존 company-pipeline의 웹훅 서버(Python)는 Vercel Serverless Functions(Node.js)로 마이그레이션. 데이터(서비스, 케이스스터디, FAQ, 가격)는 JSON 파일로 관리하여 오케스트레이터가 자동 업데이트 가능하게 구성.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Framer Motion (애니메이션), Vercel, Google Places API

**Spec:** `docs/superpowers/specs/2026-04-02-company-homepage-rebrand-design.md`

---

## Phase 0: 프로젝트 초기화

### Task 1: Next.js 프로젝트 생성

**Files:**
- Create: `company-web/package.json`
- Create: `company-web/tsconfig.json`
- Create: `company-web/tailwind.config.ts`
- Create: `company-web/app/layout.tsx`
- Create: `company-web/app/page.tsx`
- Create: `company-web/app/globals.css`
- Create: `company-web/.env.example`

- [ ] **Step 1: Create Next.js project**

```bash
cd "/Users/user/Desktop/project"
npx create-next-app@latest company-web --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Install dependencies**

```bash
cd company-web
npm install framer-motion
npm install -D @types/node
```

- [ ] **Step 3: Configure Tailwind with dark theme**

`tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0a0a0a",
          surface: "#111111",
          border: "#222222",
          blue: "#4F7CFF",
          orange: "#ff6b35",
          text: "#ffffff",
          muted: "#888888",
          subtle: "#666666",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Set up globals.css with font import**

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");
@tailwind base;
@tailwind components;
@tailwind utilities;

html { scroll-behavior: smooth; }
body { background: #0a0a0a; color: #ffffff; }
```

- [ ] **Step 5: Create root layout**

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "우리 회사 — 구글 지도에서 외국인 환자가 먼저 찾는 병원으로",
  description: "병의원 구글 지도 SEO 전문 에이전시. 다국어 GBP 최적화, 실시간 순위 추적, 데이터 기반 마케팅.",
  openGraph: {
    title: "우리 회사 — 병의원 구글 지도 SEO 전문",
    description: "외국인 환자가 원장님 병원을 먼저 찾게 만듭니다.",
    url: "https://ourcompany.kr",
    siteName: "우리 회사",
    locale: "ko_KR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Create placeholder page and verify build**

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="min-h-screen bg-brand-bg text-brand-text">우리 회사</main>;
}
```

```bash
npm run build && npm run dev
```
Expected: 빌드 성공, localhost:3000에서 "우리 회사" 텍스트 노출

- [ ] **Step 7: Commit**

```bash
git add company-web/
git commit -m "feat(company-web): Next.js 프로젝트 초기화 — Tailwind 다크 테마"
```

---

### Task 2: 데이터 레이어 구축

오케스트레이터가 JSON 파일만 수정하면 사이트가 자동 업데이트되는 구조.

**Files:**
- Create: `company-web/data/services.json`
- Create: `company-web/data/case-studies.json`
- Create: `company-web/data/pricing.json`
- Create: `company-web/data/faq.json`
- Create: `company-web/data/clients.json`
- Create: `company-web/lib/data.ts`

- [ ] **Step 1: Create services.json**

```json
[
  {
    "id": "google-maps",
    "navLabel": "구글 지도",
    "title": "구글 지도 최적화",
    "icon": "🗺️",
    "badge": "핵심 서비스",
    "badgeColor": "blue",
    "headline": "다국어 GBP 최적화로 외국인 환자가 먼저 찾는 병원",
    "features": [
      "다국어 GBP 최적화 (한/영/중/일)",
      "GridRank 실시간 순위 추적",
      "주간 성과 리포트",
      "리뷰 모니터링 & 관리"
    ],
    "caseHighlight": "협조병원1: 조회수 +539% (1개월)"
  },
  {
    "id": "aeo",
    "navLabel": "AEO",
    "title": "AEO (AI 검색 최적화)",
    "icon": "🤖",
    "badge": "NEW",
    "badgeColor": "orange",
    "headline": "ChatGPT, Perplexity가 원장님 병원을 추천하게",
    "features": [
      "ChatGPT / Perplexity / Google AI Overview 최적화",
      "AI 검색엔진 답변에 병원 포함되도록 구조화",
      "구글 지도 SEO와 연계한 AI 시대 검색 전략"
    ],
    "caseHighlight": null
  },
  {
    "id": "youtube",
    "navLabel": "유튜브",
    "title": "유튜브 제작",
    "icon": "🎬",
    "badge": null,
    "badgeColor": null,
    "headline": "검색 → 지도 → 영상, 3채널 시너지",
    "features": [
      "롱폼 4편 + 숏폼 8편/월",
      "병원 전문 촬영팀 (협력업체1)",
      "SNS + Google 프로필 동시 배포"
    ],
    "caseHighlight": null
  },
  {
    "id": "naver-maps",
    "navLabel": "네이버 지도",
    "title": "네이버 지도 상위노출",
    "icon": "📍",
    "badge": null,
    "badgeColor": null,
    "headline": "구글+네이버 동시 공략, 국내외 환자 모두 커버",
    "features": [
      "보장형 상위노출 모델",
      "키워드별 맞춤 견적",
      "국내 환자 검색 채널 완전 커버리지"
    ],
    "caseHighlight": null
  },
  {
    "id": "performance-ads",
    "navLabel": "퍼포먼스 광고",
    "title": "퍼포먼스 광고",
    "icon": "📊",
    "badge": null,
    "badgeColor": null,
    "headline": "SEO × 광고 듀얼 채널로 즉시 + 장기 성과",
    "features": [
      "Google Ads + Meta Ads 통합 운영",
      "SEO와 광고 데이터 연계 최적화",
      "월간 성과 리포트 + 전략 조정"
    ],
    "caseHighlight": "협조병원1: CPA n원, PMax CTR 11.11%"
  },
  {
    "id": "influencer",
    "navLabel": "인플루언서",
    "title": "인플루언서 체험단",
    "icon": "🤳",
    "badge": null,
    "badgeColor": null,
    "headline": "인플루언서를 통한 자연스러운 브랜드 노출",
    "features": [
      "인플루언서 매칭 & 섭외",
      "체험 캠페인 기획/운영",
      "숏폼 콘텐츠 연계 제작"
    ],
    "caseHighlight": null
  },
  {
    "id": "website",
    "navLabel": "홈페이지",
    "title": "홈페이지 제작",
    "icon": "🌐",
    "badge": "NEW",
    "badgeColor": "orange",
    "headline": "유입은 우리가 만들고, 전환도 우리가 만든다",
    "features": [
      "병의원 전용 랜딩페이지",
      "다국어 대응 구조",
      "예약 폼 내장",
      "SEO + AEO 최적화 빌트인"
    ],
    "caseHighlight": null
  }
]
```

- [ ] **Step 2: Create case-studies.json**

```json
[
  {
    "id": "cellin-hongdae",
    "hospital": "협조병원1",
    "specialty": "피부과",
    "period": "1개월",
    "metrics": [
      { "label": "프로필 조회수", "before": "3,440", "after": "21,972", "change": "+539%" },
      { "label": "구글맵 랭킹", "keyword": "english speaking dermatologist", "rank": "1위" }
    ],
    "highlight": "조회수 1개월 만에 6.4배 증가"
  },
  {
    "id": "cellin-myeongdong",
    "hospital": "협조병원1",
    "specialty": "피부과",
    "period": "12개월 (YoY)",
    "metrics": [
      { "label": "웹사이트 클릭", "change": "+895.7% (YoY)" },
      { "label": "상호작용", "change": "+720% (YoY)" }
    ],
    "highlight": "전년 대비 웹사이트 클릭 약 10배 성장"
  },
  {
    "id": "standard-dental",
    "hospital": "협조병원2",
    "specialty": "치과",
    "period": "5개월",
    "metrics": [
      { "label": "구글맵 랭킹", "keyword": "porcelain veneers", "rank": "1위", "solv": "100" },
      { "label": "구글맵 랭킹", "keyword": "dental implants", "rank": "1위", "solv": "96" }
    ],
    "highlight": "핵심 키워드 2개 모두 1위, SoLV 96~100"
  },
  {
    "id": "the-heal",
    "hospital": "C의원",
    "specialty": "피부과",
    "period": "5개월 (YoY)",
    "metrics": [
      { "label": "프로필 조회수", "change": "+177% (YoY)" },
      { "label": "상호작용", "change": "+105% (YoY)" }
    ],
    "highlight": "전년 대비 조회수 2.8배, 중문 키워드 로컬팩 안착"
  }
]
```

- [ ] **Step 3: Create pricing.json**

```json
{
  "plans": [
    {
      "name": "BASIC",
      "price": "n만원",
      "priceNote": "/월",
      "description": "구글 지도 SEO 시작",
      "features": [
        "GBP 최적화 2개 언어 (한/영)",
        "월간 성과 리포트",
        "리뷰 모니터링"
      ],
      "cta": "무료 진단받기",
      "highlighted": false
    },
    {
      "name": "STANDARD",
      "price": "n만원",
      "priceNote": "/월",
      "description": "SEO + 광고 + 영상",
      "features": [
        "GBP 최적화 4개 언어 (한/영/중/일)",
        "Google Ads 운영",
        "숏폼 영상 2편/월",
        "주간 성과 리포트"
      ],
      "cta": "무료 진단받기",
      "highlighted": true
    },
    {
      "name": "PREMIUM",
      "price": "n만원",
      "priceNote": "/월",
      "description": "풀 패키지",
      "features": [
        "STANDARD 전체 포함",
        "유튜브 롱폼 4편/월",
        "숏폼 하이라이트 8편/월",
        "전담 매니저 배정"
      ],
      "cta": "무료 진단받기",
      "highlighted": false
    }
  ],
  "addons": [
    { "name": "AEO (AI 검색 최적화)", "price": "별도 견적" },
    { "name": "홈페이지 제작", "price": "별도 견적" },
    { "name": "네이버 지도 상위노출", "price": "키워드별 견적" },
    { "name": "인플루언서 체험단", "price": "캠페인별 견적" },
    { "name": "추가 언어", "price": "n만원/언어" }
  ]
}
```

- [ ] **Step 4: Create faq.json**

```json
[
  {
    "q": "결과까지 얼마나 걸려요?",
    "a": "대부분의 클라이언트가 3개월 내에 주요 키워드에서 가시적인 순위 상승을 경험합니다. 주간 리포트로 매주 진행 상황을 확인하실 수 있습니다."
  },
  {
    "q": "다국어 최적화가 왜 중요한가요?",
    "a": "외국인 환자의 90% 이상이 영어, 중국어, 일본어로 검색합니다. 한국어만 최적화하면 이 환자들에게 병원이 노출되지 않습니다."
  },
  {
    "q": "AEO가 뭔가요?",
    "a": "Answer Engine Optimization의 약자로, ChatGPT나 Perplexity 같은 AI 검색엔진에서 병원이 추천되도록 최적화하는 서비스입니다. 기존 SEO에 더해 AI 시대의 검색 채널까지 커버합니다."
  },
  {
    "q": "기존 구글 비즈니스 프로필이 있어도 되나요?",
    "a": "네, 기존 프로필이 있으면 그대로 최적화합니다. 없으면 새로 생성해드립니다. 무료 진단 리포트에서 현재 프로필 상태를 확인하실 수 있습니다."
  },
  {
    "q": "계약 기간은 어떻게 되나요?",
    "a": "최소 3개월 계약 후, 이후는 월 단위로 자유롭게 연장하실 수 있습니다. SEO 특성상 3개월은 성과를 확인하기 위한 최소 기간입니다."
  },
  {
    "q": "무료 진단 리포트에는 뭐가 포함되나요?",
    "a": "병원의 현재 구글 지도 프로필 점수, 개선 항목 체크리스트, 리뷰 분석, 주변 경쟁 병원 비교 분석이 포함됩니다. 진단 후 부담 없이 검토하시면 됩니다."
  }
]
```

- [ ] **Step 5: Create clients.json**

```json
{
  "logos": [
    { "name": "협조병원1", "slug": "clinic-1" },
    { "name": "협조병원2", "slug": "clinic-2" },
    { "name": "C의원", "slug": "clinic-3" },
    { "name": "협조병원4", "slug": "clinic-4" },
    { "name": "협조병원5", "slug": "clinic-5" },
    { "name": "협조병원6", "slug": "clinic-6" },
    { "name": "협조병원7", "slug": "clinic-7" },
    { "name": "협조병원8", "slug": "clinic-8" },
    { "name": "협조병원9", "slug": "clinic-9" },
    { "name": "협조병원10", "slug": "clinic-10" }
  ],
  "totalCount": 20,
  "testimonials": [
    {
      "quote": "TBD — 원장님 추천사 수집 후 업데이트",
      "author": "TBD",
      "hospital": "TBD",
      "specialty": "TBD"
    }
  ]
}
```

- [ ] **Step 6: Create data loader utility**

`lib/data.ts`:
```typescript
import services from "@/data/services.json";
import caseStudies from "@/data/case-studies.json";
import pricing from "@/data/pricing.json";
import faq from "@/data/faq.json";
import clients from "@/data/clients.json";

export type Service = (typeof services)[number];
export type CaseStudy = (typeof caseStudies)[number];
export type PricingData = typeof pricing;
export type FAQ = (typeof faq)[number];
export type ClientsData = typeof clients;

export { services, caseStudies, pricing, faq, clients };
```

- [ ] **Step 7: Verify build with data imports**

```bash
cd company-web && npm run build
```
Expected: 빌드 성공

- [ ] **Step 8: Commit**

```bash
git add company-web/data/ company-web/lib/
git commit -m "feat(company-web): 데이터 레이어 — services, cases, pricing, FAQ, clients JSON"
```

---

## Phase 1: 공통 컴포넌트

### Task 3: 네비게이션 바

**Files:**
- Create: `company-web/components/Navbar.tsx`
- Modify: `company-web/app/layout.tsx`

- [ ] **Step 1: Create Navbar component**

```tsx
"use client";

import { useState } from "react";
import { services } from "@/lib/data";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    ...services.map((s) => ({ label: s.navLabel, href: `#${s.id}` })),
    { label: "가격", href: "#pricing" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-bg/90 backdrop-blur-md border-b border-brand-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <a href="#" className="text-lg font-extrabold tracking-wider">
          우리 회사
        </a>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-6">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm text-brand-muted hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        <a
          href="#diagnostic"
          className="hidden lg:block bg-brand-blue text-white px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-brand-blue/90 transition-colors"
        >
          무료 진단
        </a>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden text-white"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="메뉴 열기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <path d="M3 12h18M3 6h18M3 18h18" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="lg:hidden bg-brand-bg border-t border-brand-border px-4 py-4 space-y-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block text-sm text-brand-muted hover:text-white"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <a
            href="#diagnostic"
            className="block bg-brand-blue text-white px-4 py-2.5 rounded-md text-sm font-semibold text-center"
            onClick={() => setIsOpen(false)}
          >
            무료 진단
          </a>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Add Navbar to layout**

`app/layout.tsx` body 내부에 추가:
```tsx
<body className="font-sans antialiased">
  <Navbar />
  <div className="pt-16">{children}</div>
</body>
```

- [ ] **Step 3: Verify — 데스크톱에서 네비게이션 링크 8개 + 무료 진단 버튼 노출, 모바일에서 햄버거 메뉴**

```bash
npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add company-web/components/Navbar.tsx company-web/app/layout.tsx
git commit -m "feat(company-web): 고정 네비게이션 바 — 서비스 앵커 + 모바일 햄버거"
```

---

### Task 4: 공통 UI 컴포넌트

**Files:**
- Create: `company-web/components/SectionWrapper.tsx`
- Create: `company-web/components/Badge.tsx`
- Create: `company-web/components/CTAButton.tsx`
- Create: `company-web/components/AnimateOnScroll.tsx`

- [ ] **Step 1: Create SectionWrapper — 모든 섹션의 래퍼**

```tsx
interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

export default function SectionWrapper({ id, children, className = "", dark = false }: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`py-20 px-4 ${dark ? "bg-brand-bg" : "bg-brand-surface"} ${className}`}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}
```

- [ ] **Step 2: Create Badge, CTAButton, AnimateOnScroll**

`Badge.tsx`:
```tsx
interface BadgeProps {
  text: string;
  color: "blue" | "orange";
}

export default function Badge({ text, color }: BadgeProps) {
  const styles = {
    blue: "bg-brand-blue/10 text-brand-blue",
    orange: "bg-brand-orange/10 text-brand-orange",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${styles[color]}`}>
      {text}
    </span>
  );
}
```

`CTAButton.tsx`:
```tsx
interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function CTAButton({ href, children, variant = "primary", className = "" }: CTAButtonProps) {
  const styles = {
    primary: "bg-brand-blue text-white hover:bg-brand-blue/90",
    secondary: "border border-brand-blue text-brand-blue hover:bg-brand-blue/10",
  };
  return (
    <a
      href={href}
      className={`inline-block px-7 py-3.5 rounded-md font-semibold text-sm transition-colors ${styles[variant]} ${className}`}
    >
      {children}
    </a>
  );
}
```

`AnimateOnScroll.tsx`:
```tsx
"use client";

import { motion } from "framer-motion";

interface AnimateOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimateOnScroll({ children, className = "", delay = 0 }: AnimateOnScrollProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add company-web/components/
git commit -m "feat(company-web): 공통 UI — SectionWrapper, Badge, CTAButton, AnimateOnScroll"
```

---

## Phase 2: 페이지 섹션 구현

### Task 5: 히어로 섹션

**Files:**
- Create: `company-web/components/sections/Hero.tsx`
- Modify: `company-web/app/page.tsx`

- [ ] **Step 1: Create Hero component**

다크 배경, 포지셔닝 카피, 핵심 숫자 3개, 듀얼 CTA.
```tsx
import CTAButton from "@/components/CTAButton";
import AnimateOnScroll from "@/components/AnimateOnScroll";

const stats = [
  { value: "+539%", label: "조회수 증가" },
  { value: "1위", label: "구글맵 랭킹" },
  { value: "20+", label: "병의원 파트너" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center bg-brand-bg px-4">
      <div className="max-w-4xl mx-auto text-center">
        <AnimateOnScroll>
          <p className="text-xs tracking-[3px] text-brand-muted mb-6 uppercase">
            Google Maps SEO Agency
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-4">
            구글 지도에서
            <br />
            외국인 환자가
            <br />
            <span className="text-brand-blue">먼저 찾는 병원</span>으로
          </h1>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.2}>
          <p className="text-brand-muted text-base md:text-lg mb-10">
            다국어 SEO · 데이터 기반 · 실시간 순위 추적
          </p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.3}>
          <div className="flex flex-wrap items-center justify-center gap-8 mb-12">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-brand-blue">{s.value}</div>
                <div className="text-xs text-brand-muted mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.4}>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CTAButton href="#diagnostic">무료 GBP 진단받기</CTAButton>
            <CTAButton href="#pricing" variant="secondary">서비스 소개서</CTAButton>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Wire into page.tsx**

```tsx
import Hero from "@/components/sections/Hero";

export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  );
}
```

- [ ] **Step 3: Verify — 히어로 렌더링 확인**

- [ ] **Step 4: Commit**

```bash
git add company-web/components/sections/Hero.tsx company-web/app/page.tsx
git commit -m "feat(company-web): 히어로 섹션 — 포지셔닝 카피 + 핵심 숫자 + 듀얼 CTA"
```

---

### Task 6: 문제 제기 섹션

**Files:**
- Create: `company-web/components/sections/PainPoints.tsx`

- [ ] **Step 1: Create PainPoints component**

3가지 pain point를 카드로 보여주는 섹션.

```tsx
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";

const pains = [
  {
    icon: "🔍",
    title: "검색해도 안 보이는 병원",
    desc: '"dermatologist near me" 검색 결과에 원장님 병원이 없다면, 그 환자는 경쟁 병원으로 갑니다.',
  },
  {
    icon: "🌐",
    title: "외국어 프로필 미비",
    desc: "영어·중국어·일본어 프로필이 없으면, 외국인 환자 90%에게 보이지 않습니다.",
  },
  {
    icon: "📉",
    title: "순위를 모르면 밀립니다",
    desc: "경쟁 병원은 매주 순위를 추적합니다. 모니터링 없이는 노출이 계속 하락합니다.",
  },
];

export default function PainPoints() {
  return (
    <SectionWrapper id="pain-points">
      <AnimateOnScroll>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          외국인 환자가 검색하는데,
          <br />
          <span className="text-brand-blue">원장님 병원이 안 보입니다</span>
        </h2>
      </AnimateOnScroll>
      <div className="grid md:grid-cols-3 gap-6 mt-12">
        {pains.map((p, i) => (
          <AnimateOnScroll key={p.title} delay={i * 0.1}>
            <div className="bg-brand-bg border border-brand-border rounded-xl p-6 h-full">
              <div className="text-3xl mb-4">{p.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{p.title}</h3>
              <p className="text-sm text-brand-muted leading-relaxed">{p.desc}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Add to page.tsx**
- [ ] **Step 3: Verify**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(company-web): 문제 제기 섹션 — 3가지 pain point 카드"
```

---

### Task 7: 서비스 섹션 7개 (반복 컴포넌트)

**Files:**
- Create: `company-web/components/sections/ServiceSection.tsx`
- Create: `company-web/components/sections/Services.tsx`

- [ ] **Step 1: Create reusable ServiceSection component**

각 서비스를 동일한 레이아웃으로 렌더링. services.json 데이터 기반.

```tsx
import type { Service } from "@/lib/data";
import Badge from "@/components/Badge";
import AnimateOnScroll from "@/components/AnimateOnScroll";

export default function ServiceSection({ service, index }: { service: Service; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <div
      id={service.id}
      className={`py-16 px-4 ${isEven ? "bg-brand-bg" : "bg-brand-surface"}`}
    >
      <div className="max-w-6xl mx-auto">
        <AnimateOnScroll>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{service.icon}</span>
            <h2 className="text-2xl md:text-3xl font-bold">{service.title}</h2>
            {service.badge && service.badgeColor && (
              <Badge text={service.badge} color={service.badgeColor as "blue" | "orange"} />
            )}
          </div>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.1}>
          <p className="text-lg text-brand-muted mb-8">{service.headline}</p>
        </AnimateOnScroll>

        <AnimateOnScroll delay={0.2}>
          <ul className="grid md:grid-cols-2 gap-3 mb-6">
            {service.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-brand-muted">
                <span className="text-brand-blue mt-0.5">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </AnimateOnScroll>

        {service.caseHighlight && (
          <AnimateOnScroll delay={0.3}>
            <div className="inline-block bg-brand-blue/10 text-brand-blue text-sm px-4 py-2 rounded-lg">
              📈 {service.caseHighlight}
            </div>
          </AnimateOnScroll>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Services wrapper that maps all 7 services**

```tsx
import { services } from "@/lib/data";
import ServiceSection from "./ServiceSection";

export default function Services() {
  return (
    <>
      {services.map((s, i) => (
        <ServiceSection key={s.id} service={s} index={i} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: Add to page.tsx**
- [ ] **Step 4: Verify — 7개 서비스 섹션 순서대로 렌더링, 네비게이션 앵커 작동**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(company-web): 서비스 섹션 7개 — JSON 데이터 기반 반복 렌더링"
```

---

### Task 8: Social Proof 섹션

**Files:**
- Create: `company-web/components/sections/SocialProof.tsx`
- Create: `company-web/components/CaseStudyCard.tsx`
- Create: `company-web/components/ClientLogos.tsx`

- [ ] **Step 1: Create CaseStudyCard — 전/후 숫자 카드**

```tsx
import type { CaseStudy } from "@/lib/data";

export default function CaseStudyCard({ study }: { study: CaseStudy }) {
  return (
    <div className="bg-brand-bg border border-brand-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-brand-blue font-medium">{study.specialty}</span>
        <span className="text-xs text-brand-subtle">· {study.period}</span>
      </div>
      <h3 className="text-lg font-semibold mb-4">{study.hospital}</h3>
      <div className="space-y-2 mb-4">
        {study.metrics.map((m, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-brand-muted">{m.label}</span>
            <span className="text-brand-blue font-bold">
              {"change" in m ? m.change : `${m.rank}`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-brand-subtle border-t border-brand-border pt-3">
        {study.highlight}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create ClientLogos — 로고 슬라이드**

```tsx
import { clients } from "@/lib/data";

export default function ClientLogos() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-8 py-8">
      {clients.logos.map((c) => (
        <div
          key={c.slug}
          className="text-sm text-brand-subtle font-medium px-4 py-2 border border-brand-border rounded-lg"
        >
          {c.name}
        </div>
      ))}
    </div>
  );
}
```
Note: 실제 로고 이미지가 준비되면 `public/logos/{slug}.svg`로 교체.

- [ ] **Step 3: Create SocialProof section assembling cards + logos**

```tsx
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import CaseStudyCard from "@/components/CaseStudyCard";
import ClientLogos from "@/components/ClientLogos";
import { caseStudies } from "@/lib/data";

export default function SocialProof() {
  return (
    <SectionWrapper id="social-proof" dark>
      <AnimateOnScroll>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          실제 성과로 증명합니다
        </h2>
        <p className="text-brand-muted text-center mb-12">
          우리 회사와 함께한 병원들의 데이터입니다
        </p>
      </AnimateOnScroll>

      <div className="grid md:grid-cols-2 gap-6 mb-16">
        {caseStudies.map((s, i) => (
          <AnimateOnScroll key={s.id} delay={i * 0.1}>
            <CaseStudyCard study={s} />
          </AnimateOnScroll>
        ))}
      </div>

      {/* 원장님 추천사 */}
      <AnimateOnScroll>
        <div className="max-w-2xl mx-auto mb-16">
          {clients.testimonials.filter((t) => t.quote !== "TBD").map((t, i) => (
            <blockquote key={i} className="border-l-2 border-brand-blue pl-6 py-2">
              <p className="text-brand-muted text-sm italic leading-relaxed mb-2">"{t.quote}"</p>
              <cite className="text-xs text-brand-subtle not-italic">
                — {t.author}, {t.hospital} ({t.specialty})
              </cite>
            </blockquote>
          ))}
        </div>
      </AnimateOnScroll>

      <AnimateOnScroll>
        <div className="text-center mb-4">
          <p className="text-sm text-brand-muted">함께하고 있는 병원들</p>
        </div>
        <ClientLogos />
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
```

- [ ] **Step 4: Add to page.tsx, verify, commit**

```bash
git commit -m "feat(company-web): Social Proof — 케이스스터디 카드 + 클라이언트 로고"
```

---

### Task 9: 프로세스 섹션

**Files:**
- Create: `company-web/components/sections/Process.tsx`

- [ ] **Step 1: Create Process — 5단계 타임라인**

```tsx
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";

const steps = [
  { num: "01", title: "무료 진단", desc: "현재 GBP 상태를 분석하고 개선 포인트를 도출합니다" },
  { num: "02", title: "전략 수립", desc: "병원 특성에 맞는 다국어 SEO 전략을 설계합니다" },
  { num: "03", title: "다국어 최적화", desc: "한/영/중/일 프로필과 콘텐츠를 최적화합니다" },
  { num: "04", title: "주간 리포트", desc: "GridRank 순위 변동과 성과를 매주 공유합니다" },
  { num: "05", title: "성과 측정", desc: "월간 종합 보고서로 ROI를 확인합니다" },
];

export default function Process() {
  return (
    <SectionWrapper id="process">
      <AnimateOnScroll>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          진행 프로세스
        </h2>
      </AnimateOnScroll>
      <div className="max-w-3xl mx-auto space-y-0">
        {steps.map((s, i) => (
          <AnimateOnScroll key={s.num} delay={i * 0.08}>
            <div className="flex gap-6 items-start pb-10 relative">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center font-bold text-sm">
                {s.num}
              </div>
              {i < steps.length - 1 && (
                <div className="absolute left-6 top-12 w-px h-10 bg-brand-border" />
              )}
              <div>
                <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                <p className="text-sm text-brand-muted">{s.desc}</p>
              </div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Add to page.tsx, verify, commit**

```bash
git commit -m "feat(company-web): 프로세스 섹션 — 5단계 타임라인"
```

---

### Task 10: 가격표 섹션

**Files:**
- Create: `company-web/components/sections/Pricing.tsx`

- [ ] **Step 1: Create Pricing — 3-tier 카드 + 애드온**

```tsx
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import CTAButton from "@/components/CTAButton";
import { pricing } from "@/lib/data";

export default function Pricing() {
  return (
    <SectionWrapper id="pricing" dark>
      <AnimateOnScroll>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">가격</h2>
      </AnimateOnScroll>

      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {pricing.plans.map((plan, i) => (
          <AnimateOnScroll key={plan.name} delay={i * 0.1}>
            <div
              className={`rounded-xl p-6 h-full flex flex-col ${
                plan.highlighted
                  ? "bg-brand-blue/5 border-2 border-brand-blue"
                  : "bg-brand-surface border border-brand-border"
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs text-brand-blue font-medium mb-2">추천</span>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <p className="text-sm text-brand-muted mb-4">{plan.description}</p>
              <div className="mb-6">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-sm text-brand-muted">{plan.priceNote}</span>
              </div>
              <ul className="space-y-2 mb-8 flex-grow">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-brand-muted">
                    <span className="text-brand-blue">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <CTAButton href="#diagnostic" className="w-full text-center">
                {plan.cta}
              </CTAButton>
            </div>
          </AnimateOnScroll>
        ))}
      </div>

      <AnimateOnScroll>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">개별 서비스</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {pricing.addons.map((a) => (
              <div
                key={a.name}
                className="text-sm text-brand-muted border border-brand-border rounded-lg px-4 py-2"
              >
                {a.name} · <span className="text-white">{a.price}</span>
              </div>
            ))}
          </div>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Add to page.tsx, verify, commit**

```bash
git commit -m "feat(company-web): 가격표 — 3-tier 카드 + 애드온 목록"
```

---

### Task 11: FAQ 섹션

**Files:**
- Create: `company-web/components/sections/FAQ.tsx`

- [ ] **Step 1: Create FAQ — 아코디언**

```tsx
"use client";

import { useState } from "react";
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import { faq } from "@/lib/data";

function FAQItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-brand-border">
      <button
        className="w-full flex items-center justify-between py-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <span className="font-medium text-sm md:text-base pr-4">{item.q}</span>
        <span className="text-brand-muted flex-shrink-0">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="text-sm text-brand-muted pb-5 leading-relaxed">{item.a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  return (
    <SectionWrapper id="faq">
      <AnimateOnScroll>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          자주 묻는 질문
        </h2>
      </AnimateOnScroll>
      <div className="max-w-3xl mx-auto">
        {faq.map((item, i) => (
          <AnimateOnScroll key={i} delay={i * 0.05}>
            <FAQItem item={item} />
          </AnimateOnScroll>
        ))}
      </div>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Add to page.tsx, verify, commit**

```bash
git commit -m "feat(company-web): FAQ 아코디언 섹션"
```

---

### Task 12: 최종 CTA + Footer

**Files:**
- Create: `company-web/components/sections/FinalCTA.tsx`
- Create: `company-web/components/Footer.tsx`

- [ ] **Step 1: Create FinalCTA — 진단 신청 + 카카오/전화**

```tsx
import SectionWrapper from "@/components/SectionWrapper";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import CTAButton from "@/components/CTAButton";

export default function FinalCTA() {
  return (
    <SectionWrapper id="diagnostic" dark>
      <AnimateOnScroll>
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            지금 무료 진단 받으세요
          </h2>
          <p className="text-brand-muted mb-8">
            원장님 병원의 구글 지도 현황을 무료로 분석해드립니다.
            <br />
            진단 후 부담 없이 검토하시면 됩니다.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <CTAButton href="/diagnostic">무료 GBP 진단받기</CTAButton>
            <a
              href={process.env.NEXT_PUBLIC_KAKAO_CHANNEL_URL ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-muted hover:text-white transition-colors"
            >
              💬 카카오톡 상담
            </a>
            <a
              href={`tel:${process.env.NEXT_PUBLIC_PHONE ?? ""}`}
              className="text-sm text-brand-muted hover:text-white transition-colors"
            >
              📞 전화 상담
            </a>
          </div>
        </div>
      </AnimateOnScroll>
    </SectionWrapper>
  );
}
```

- [ ] **Step 2: Create Footer**

```tsx
export default function Footer() {
  return (
    <footer className="bg-brand-bg border-t border-brand-border py-10 px-4">
      <div className="max-w-6xl mx-auto text-center text-xs text-brand-subtle space-y-2">
        <p className="font-medium text-brand-muted">우리 회사 (우리 회사)</p>
        <p>대표: TBD | 사업자등록번호: TBD | 통신판매업 신고번호: TBD</p>
        <p>주소: TBD</p>
        <div className="flex items-center justify-center gap-4 pt-2">
          <a href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</a>
          <span>·</span>
          <a href="mailto:contact@ourcompany.kr" className="hover:text-white transition-colors">contact@ourcompany.kr</a>
        </div>
        <p className="pt-4">© 2026 우리 회사. All rights reserved.</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Add both to page.tsx and layout.tsx (Footer)**
- [ ] **Step 4: Verify — 전체 페이지 14섹션 순서대로 렌더링**
- [ ] **Step 5: Commit**

```bash
git commit -m "feat(company-web): 최종 CTA + Footer — 진단/카카오/전화 + 법적 고지"
```

---

## Phase 3: 진단 폼 통합

### Task 13: 진단 페이지 마이그레이션

기존 company-pipeline의 `diagnostic-form.html`을 Next.js 페이지로 마이그레이션.

**Files:**
- Create: `company-web/app/diagnostic/page.tsx`
- Create: `company-web/components/diagnostic/DiagnosticForm.tsx`
- Create: `company-web/components/diagnostic/HospitalSearch.tsx`
- Create: `company-web/components/diagnostic/AnalysisResult.tsx`
- Create: `company-web/components/diagnostic/ContactForm.tsx`

- [ ] **Step 1: Read existing diagnostic-form.html to extract form logic**

```bash
cat company-pipeline/diagnostic-form.html
```
핵심 로직: 3-step wizard (검색 → 분석 → 연락처). fetch API로 웹훅 호출.

- [ ] **Step 2: Create DiagnosticForm — 3-step wizard 컨테이너**

```tsx
"use client";

import { useState } from "react";
import HospitalSearch from "./HospitalSearch";
import AnalysisResult from "./AnalysisResult";
import ContactForm from "./ContactForm";

type Step = "search" | "analysis" | "contact";

export default function DiagnosticForm() {
  const [step, setStep] = useState<Step>("search");
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleHospitalSelect = async (data: any) => {
    setHospitalData(data);
    setStep("analysis");
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhook/diagnostic-analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId: data.placeId, hospital: data.name, lat: data.lat, lng: data.lng }),
      });
      const result = await res.json();
      setAnalysisData(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {["병원 검색", "분석 결과", "연락처 입력"].map((label, i) => {
          const steps: Step[] = ["search", "analysis", "contact"];
          const isActive = steps.indexOf(step) >= i;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-brand-blue text-white" : "bg-brand-border text-brand-subtle"}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${isActive ? "text-white" : "text-brand-subtle"}`}>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-brand-border" />}
            </div>
          );
        })}
      </div>

      {step === "search" && (
        <HospitalSearch onSelect={handleHospitalSelect} />
      )}
      {step === "analysis" && (
        isAnalyzing
          ? <div className="text-center text-brand-muted py-12">분석 중...</div>
          : analysisData && <AnalysisResult data={analysisData} onNext={() => setStep("contact")} />
      )}
      {step === "contact" && (
        <ContactForm hospitalData={hospitalData} analysisData={analysisData} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create HospitalSearch — 병원 검색 스텝**

기존 소스: `company-pipeline/diagnostic-form.html` 내 Step 1 섹션.
이식할 로직:
- 병원명 입력 → `POST ${NEXT_PUBLIC_API_URL}/webhook/diagnostic-preview` 호출 (`{hospital}`)
- 응답: Google Places 후보 리스트 (사진, 평점, 주소)
- 후보 카드 클릭 → `onSelect({placeId, name, lat, lng})` 콜백

```tsx
"use client";
import { useState } from "react";

interface HospitalSearchProps {
  onSelect: (data: { placeId: string; name: string; lat: number; lng: number }) => void;
}

export default function HospitalSearch({ onSelect }: HospitalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhook/diagnostic-preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hospital: query }),
    });
    const data = await res.json();
    setResults(data.candidates ?? []);
    setLoading(false);
  };

  return (
    <div>
      <div className="flex gap-2 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="병원 이름을 입력하세요"
          className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-4 py-3 text-white placeholder:text-brand-subtle"
        />
        <button onClick={handleSearch} disabled={loading}
          className="bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50">
          {loading ? "검색 중..." : "검색"}
        </button>
      </div>
      <div className="space-y-3">
        {results.map((r: any) => (
          <button key={r.placeId} onClick={() => onSelect(r)}
            className="w-full text-left bg-brand-surface border border-brand-border rounded-lg p-4 hover:border-brand-blue transition-colors">
            <div className="font-semibold">{r.name}</div>
            <div className="text-sm text-brand-muted">{r.address}</div>
            {r.rating && <div className="text-xs text-brand-subtle mt-1">⭐ {r.rating} ({r.reviewCount}개 리뷰)</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create AnalysisResult — 분석 결과 표시**

기존 소스: `company-pipeline/diagnostic-form.html` 내 Step 1b 분석 결과 UI.
이식할 로직: `/webhook/diagnostic-analyze` 응답의 GBP 점수, 체크리스트, 개선사항, 경쟁사 비교를 카드로 표시.

```tsx
interface AnalysisResultProps {
  data: { score: number; checklist: any[]; improvements: any[]; competitors: any[] };
  onNext: () => void;
}

export default function AnalysisResult({ data, onNext }: AnalysisResultProps) {
  return (
    <div>
      {/* GBP 점수 */}
      <div className="text-center mb-8">
        <div className="text-6xl font-extrabold text-brand-blue">{data.score}</div>
        <div className="text-sm text-brand-muted">/ 100점</div>
      </div>
      {/* 체크리스트 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 mb-6">
        <h3 className="font-semibold mb-4">프로필 체크리스트</h3>
        {data.checklist?.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 text-sm py-1">
            <span>{item.passed ? "✅" : "❌"}</span>
            <span className={item.passed ? "text-brand-muted" : "text-white"}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* 개선사항 */}
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 mb-8">
        <h3 className="font-semibold mb-4">개선 포인트</h3>
        {data.improvements?.map((item: any, i: number) => (
          <div key={i} className="text-sm text-brand-muted py-1">• {item.text}</div>
        ))}
      </div>
      <button onClick={onNext}
        className="w-full bg-brand-blue text-white py-3 rounded-lg font-semibold">
        전체 리포트 받기 →
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Create ContactForm — 연락처 입력 + 제출**

기존 소스: `company-pipeline/diagnostic-form.html` 내 Step 2 연락처 폼.
이식할 로직: `POST /webhook/diagnostic-complete` → pluuug CRM 등록 + 리포트 생성 + 알림 발송.

```tsx
"use client";
import { useState } from "react";

export default function ContactForm({ hospitalData, analysisData }: { hospitalData: any; analysisData: any }) {
  const [form, setForm] = useState({ name: "", phone: "", specialty: "" });
  const [submitted, setSubmitted] = useState(false);
  const [reportUrl, setReportUrl] = useState("");

  const handleSubmit = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/webhook/diagnostic-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ...hospitalData, analysis: analysisData }),
    });
    const data = await res.json();
    setReportUrl(data.reportUrl ?? "");
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold mb-2">진단 완료!</h3>
        <p className="text-brand-muted mb-6">전체 리포트가 준비되었습니다.</p>
        {reportUrl && (
          <a href={reportUrl} target="_blank" rel="noopener noreferrer"
            className="bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold inline-block">
            리포트 보기
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="담당자명" className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-3 text-white placeholder:text-brand-subtle" />
      <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
        placeholder="연락처 (010-0000-0000)" className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-3 text-white placeholder:text-brand-subtle" />
      <input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}
        placeholder="진료과목 (예: 피부과, 치과)" className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-3 text-white placeholder:text-brand-subtle" />
      <button onClick={handleSubmit}
        className="w-full bg-brand-blue text-white py-3 rounded-lg font-semibold">
        무료 진단 리포트 받기
      </button>
      <p className="text-xs text-brand-subtle text-center">
        제출 시 <a href="/privacy" className="underline">개인정보처리방침</a>에 동의합니다.
      </p>
    </div>
  );
}
```

- [ ] **Step 6: Create diagnostic page**

```tsx
import DiagnosticForm from "@/components/diagnostic/DiagnosticForm";

export default function DiagnosticPage() {
  return (
    <main className="min-h-screen bg-brand-bg pt-24 pb-16 px-4">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">무료 GBP 진단</h1>
        <p className="text-brand-muted">원장님 병원의 구글 지도 현황을 분석합니다</p>
      </div>
      <DiagnosticForm />
    </main>
  );
}
```

- [ ] **Step 7: Set up .env.local with API URL**

```bash
cat > company-web/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8089
NEXT_PUBLIC_KAKAO_CHANNEL_URL=https://pf.kakao.com/_TBD
NEXT_PUBLIC_PHONE=010-0000-0000
EOF

cat > company-web/.env.example << 'EOF'
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_KAKAO_CHANNEL_URL=
NEXT_PUBLIC_PHONE=
EOF
```
Note: 카카오 채널 URL과 전화번호는 온톨로지 또는 사용자에게 확인 후 실제 값으로 교체.

- [ ] **Step 8: Verify — 진단 폼 3-step 흐름 + 기존 웹훅 서버 연동**
- [ ] **Step 9: Commit**

```bash
git commit -m "feat(company-web): 진단 폼 마이그레이션 — 3-step wizard + 파이프라인 연동"
```

---

## Phase 4: 개인정보처리방침 + SEO

### Task 14: 개인정보처리방침 페이지

**Files:**
- Create: `company-web/app/privacy/page.tsx`

- [ ] **Step 1: Create privacy policy page**

온톨로지에서 회사 정보 참고. 수집 항목: 이름, 전화번호, 병원명.
PIPA(개인정보보호법) 필수 항목 포함.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(company-web): 개인정보처리방침 페이지"
```

---

### Task 15: SEO 메타데이터 + sitemap + robots.txt

**Files:**
- Create: `company-web/app/sitemap.ts`
- Create: `company-web/app/robots.ts`
- Modify: `company-web/app/layout.tsx` (structured data)

- [ ] **Step 1: Create sitemap.ts**

```typescript
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: "https://ourcompany.kr", lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: "https://ourcompany.kr/diagnostic", lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: "https://ourcompany.kr/privacy", lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];
}
```

- [ ] **Step 2: Create robots.ts**

```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://ourcompany.kr/sitemap.xml",
  };
}
```

- [ ] **Step 3: Add JSON-LD structured data to layout**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(company-web): SEO — sitemap, robots.txt, JSON-LD structured data"
```

---

## Phase 5: 배포 + 연동

### Task 16: Vercel 배포

**Files:**
- Create: `company-web/vercel.json` (필요시)

- [ ] **Step 1: Create vercel.json for subdirectory deploy**

현재 레포가 모노레포이므로 Root Directory 설정 필수:
```bash
cat > company-web/vercel.json << 'EOF'
{
  "framework": "nextjs"
}
EOF
```
Vercel 대시보드에서 프로젝트 생성 시 **Root Directory를 `company-web`으로 설정**.

- [ ] **Step 2: Connect to Vercel**

```bash
cd company-web
npx vercel --prod
```
프롬프트에서 Root Directory 물으면 `company-web` 지정.

- [ ] **Step 3: Set custom domain ourcompany.kr in Vercel dashboard**

아임웹에서 도메인 DNS를 Vercel로 변경 필요 (CNAME → cname.vercel-dns.com).

- [ ] **Step 4: Set environment variables in Vercel**

Vercel 대시보드 → Settings → Environment Variables:
- `NEXT_PUBLIC_API_URL` — 프로덕션 웹훅 서버 URL
- `NEXT_PUBLIC_KAKAO_CHANNEL_URL` — 카카오 채널
- `NEXT_PUBLIC_PHONE` — 전화번호
- [ ] **Step 5: Verify production build**
- [ ] **Step 6: Commit any config changes**

```bash
git commit -m "chore(company-web): Vercel 배포 설정"
```

---

### Task 17: 오케스트레이터 자동 업데이트 연동

**Files:**
- Modify: `company-orchestrator/` (해당 파이프라인에 홈페이지 업데이트 트리거 추가)

- [ ] **Step 1: 데이터 변경 감지 → JSON 파일 수정 → git push 파이프라인 설계**

오케스트레이터가 감지할 이벤트:
- 클라이언트 추가/제거 → `data/clients.json` 수정
- 케이스스터디 데이터 변경 → `data/case-studies.json` 수정
- 가격 변경 → `data/pricing.json` 수정

- [ ] **Step 2: 구현 — git push hook으로 Vercel 자동 배포**
- [ ] **Step 3: 테스트 — 더미 데이터 변경 → 자동 배포 확인**
- [ ] **Step 4: Commit**

```bash
git commit -m "feat(orchestrator): 홈페이지 자동 업데이트 파이프라인 연동"
```

---

## Phase 6: 멀티 에이전트 워게임

### Task 18: 워게임 이터레이션

구현 완료 후 멀티 에이전트 워게임으로 품질 향상. 사용자가 만족할 때까지 반복.

**에이전트 역할:**

| 역할 | 관점 | 체크 항목 |
|------|------|----------|
| UI/UX 설계자 | 정보 구조, 사용자 흐름 | 네비게이션 직관성, CTA 위치, 스크롤 깊이 |
| 디자이너 | 비주얼 품질 | 색상 대비, 타이포 위계, 여백, 일관성 |
| QA 검수자 | 기술 품질 | 빌드, 링크, 반응형, 접근성(WCAG AA), Core Web Vitals |
| 베타 테스터 | 고객(원장님) 관점 | 메시지 명확성, 신뢰감, CTA 설득력, 전환 흐름 |

- [ ] **Step 1: 전체 빌드 + Lighthouse 성능 체크**
- [ ] **Step 2: 디자이너 에이전트 — 비주얼 리뷰 + 피드백**
- [ ] **Step 3: QA 에이전트 — 빌드/링크/반응형/접근성 검수**
- [ ] **Step 4: 베타 테스터 에이전트 — 원장님 관점 전환 흐름 평가**
- [ ] **Step 5: 피드백 반영 + 이터레이션**
- [ ] **Step 6: 사용자 리뷰 → 승인될 때까지 반복**
