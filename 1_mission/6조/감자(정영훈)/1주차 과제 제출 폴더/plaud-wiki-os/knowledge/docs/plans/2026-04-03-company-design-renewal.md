# 우리 회사 디자인 리뉴얼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ourcompany.kr 홈페이지의 디자인 시스템(컬러/타이포/컴포넌트)을 재정의하고 14개 섹션에 일괄 적용하여 디자인 퀄리티를 대폭 업그레이드한다.

**Architecture:** 디자인 토큰(globals.css) → 공통 컴포넌트 리디자인 → 섹션별 적용 → 인터랙션/애니메이션 추가 순서로 진행. 기존 14개 섹션 구조, 콘텐츠, 데이터 레이어는 변경하지 않는다.

**Tech Stack:** Next.js 16 (App Router, SSG), Tailwind CSS v4 (@theme), Framer Motion, Plus Jakarta Sans (Google Fonts), Pretendard

**Spec:** `docs/superpowers/specs/2026-04-03-company-design-renewal.md`

---

## File Map

### 변경 파일

| 파일 | 역할 | 변경 내용 |
|------|------|-----------|
| `app/globals.css` | 디자인 토큰 정의 | 컬러 토큰 교체, 폰트 추가, 유틸리티 클래스 |
| `tailwind.config.ts` | Tailwind 설정 | 컬러 토큰 동기화 |
| `app/layout.tsx` | 루트 레이아웃 | Plus Jakarta Sans 폰트 로드 |
| `components/CTAButton.tsx` | CTA 버튼 | 그라디언트 + glow hover |
| `components/Badge.tsx` | 뱃지/태그 | 핑크 기반 컬러 + 새 스타일 |
| `components/SectionWrapper.tsx` | 섹션 래퍼 | border-t 구분선, 패딩 조정 |
| `components/Navbar.tsx` | 네비게이션 | 새 컬러/폰트/CTA 버튼 |
| `components/Footer.tsx` | 푸터 | 새 컬러/폰트 |
| `components/AnimateOnScroll.tsx` | 스크롤 애니메이션 | 스태거 딜레이 조정 |
| `components/CaseStudyCard.tsx` | 케이스 스터디 카드 | 새 카드 스타일 |
| `components/sections/Hero.tsx` | 히어로 | 그라디언트 배경, 새 타이포 |
| `components/sections/PainPoints.tsx` | 문제제기 | 새 카드 스타일 |
| `components/sections/Comparison.tsx` | 비교 | 스플릿 레이아웃 |
| `components/visuals/StatsRibbon.tsx` | 통계 리본 | 큰 숫자 + 카운트업 |
| `components/sections/Services.tsx` | 서비스 | 탭 + 카드 리디자인 |
| `components/sections/Portfolio.tsx` | 포트폴리오 | 2col 큰 카드 |
| `components/sections/SocialProof.tsx` | 소셜 프루프 | 스탯 + 카드 리디자인 |
| `components/sections/About.tsx` | 회사 소개 | 스플릿 레이아웃 |
| `components/visuals/ReportSample.tsx` | 리포트 샘플 | 스플릿 레이아웃 |
| `components/sections/Process.tsx` | 프로세스 | 타임라인 리디자인 |
| `components/sections/Pricing.tsx` | 가격 | 카드 리디자인 |
| `components/sections/FAQ.tsx` | FAQ | 아코디언 리디자인 |
| `components/visuals/AuditPreview.tsx` | 진단 미리보기 | 풀폭 임팩트 |
| `components/sections/FinalCTA.tsx` | 최종 CTA | 그라디언트 + 임팩트 |
| `app/opengraph-image.tsx` | OG 이미지 | 새 컬러 적용 |

### 생성 파일

없음 — 기존 파일만 수정.

---

## Task 1: 디자인 토큰 교체

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `app/layout.tsx`

- [ ] **Step 1: globals.css 컬러 토큰 + 폰트 교체**

`app/globals.css`를 아래로 교체:

```css
@import url("https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css");
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
@import "tailwindcss";

@theme {
  --color-brand-bg: #0a0a0a;
  --color-brand-surface: #141414;
  --color-brand-border: rgba(255,255,255,0.08);
  --color-brand-primary: #E84B8A;
  --color-brand-secondary: #2D2B55;
  --color-brand-text: #ffffff;
  --color-brand-muted: #888888;
  --color-brand-subtle: rgba(255,255,255,0.4);

  --font-family-sans: "Pretendard", sans-serif;
  --font-family-display: "Plus Jakarta Sans", sans-serif;
}

html {
  scroll-behavior: smooth;
}

body {
  background: #0a0a0a;
  color: #ffffff;
}
```

- [ ] **Step 2: tailwind.config.ts 컬러 동기화**

`tailwind.config.ts`의 colors.brand 객체를 새 토큰으로 교체:

```typescript
brand: {
  bg: "#0a0a0a",
  surface: "#141414",
  border: "rgba(255,255,255,0.08)",
  primary: "#E84B8A",
  secondary: "#2D2B55",
  text: "#ffffff",
  muted: "#888888",
  subtle: "rgba(255,255,255,0.4)",
},
```

fontFamily에 display 추가:

```typescript
fontFamily: {
  sans: ["Pretendard", "sans-serif"],
  display: ["Plus Jakarta Sans", "sans-serif"],
},
```

- [ ] **Step 3: 빌드 확인**

Run: `cd company-web && npm run build`
Expected: 빌드 성공. 컬러 변수명 변경(`brand-blue` → `brand-primary` 등)으로 일부 컴포넌트에서 스타일 깨짐 예상 — Task 2-3에서 수정.

- [ ] **Step 4: 커밋**

```bash
git add app/globals.css tailwind.config.ts
git commit -m "chore: 디자인 토큰 교체 — 로고 기반 팔레트 + Plus Jakarta Sans"
```

---

## Task 2: 공통 컴포넌트 리디자인

**Files:**
- Modify: `components/CTAButton.tsx`
- Modify: `components/Badge.tsx`
- Modify: `components/SectionWrapper.tsx`
- Modify: `components/AnimateOnScroll.tsx`
- Modify: `components/CaseStudyCard.tsx`

- [ ] **Step 1: CTAButton — 그라디언트 + glow**

`components/CTAButton.tsx` 전체 교체:

```tsx
interface CTAButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export default function CTAButton({
  href,
  children,
  variant = "primary",
  className = "",
}: CTAButtonProps) {
  const base =
    "inline-flex items-center justify-center px-7 py-3 rounded-[10px] font-display font-bold text-sm transition-all duration-300";
  const variants = {
    primary:
      "bg-gradient-to-r from-brand-secondary to-brand-primary text-white hover:shadow-[0_0_20px_rgba(232,75,138,0.3)] hover:opacity-90",
    secondary:
      "border border-white/15 text-white hover:border-white/30 bg-transparent",
  };

  return (
    <a href={href} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </a>
  );
}
```

- [ ] **Step 2: Badge — 핑크 기반**

`components/Badge.tsx` 전체 교체:

```tsx
interface BadgeProps {
  text: string;
  color?: "primary" | "secondary";
}

export default function Badge({ text, color = "primary" }: BadgeProps) {
  const colorClass =
    color === "primary"
      ? "bg-brand-primary/10 text-brand-primary"
      : "bg-brand-secondary/20 text-white/70";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md font-display text-[11px] font-semibold uppercase tracking-wider ${colorClass}`}
    >
      {text}
    </span>
  );
}
```

- [ ] **Step 3: SectionWrapper — border-t 구분선 + 패딩 증가**

`components/SectionWrapper.tsx` 전체 교체:

```tsx
interface SectionWrapperProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  noDivider?: boolean;
}

export default function SectionWrapper({
  id,
  children,
  className = "",
  noDivider = false,
}: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={`py-24 ${!noDivider ? "border-t border-white/[0.06]" : ""} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: AnimateOnScroll — 스태거 딜레이 조정**

`components/AnimateOnScroll.tsx`에서 기본 duration을 0.6으로 변경 (기존 0.5). 다른 로직은 유지.

- [ ] **Step 5: 커밋**

```bash
git add components/CTAButton.tsx components/Badge.tsx components/SectionWrapper.tsx components/AnimateOnScroll.tsx
git commit -m "feat: 공통 컴포넌트 리디자인 — 그라디언트 CTA, 새 Badge, border-t 섹션"
```

---

## Task 3: Navbar + Footer 리디자인

**Files:**
- Modify: `components/Navbar.tsx`
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Navbar — 새 컬러/폰트/CTA**

`components/Navbar.tsx` 변경:
- 로고 텍스트: `font-display font-bold` 추가, `text-xl` → `text-lg`, `tracking-tight` → `tracking-[-0.5px]`
- 배경: `bg-brand-bg/80` 유지, border를 `border-brand-border` → `border-white/[0.06]`
- CTA 버튼: `bg-brand-blue` → `bg-gradient-to-r from-brand-secondary to-brand-primary`
- nav 링크 hover: `hover:text-brand-text` 유지

- [ ] **Step 2: Footer — 새 컬러**

`components/Footer.tsx` 변경:
- `text-brand-text` 유지
- 기존 `brand-blue` 참조를 `brand-primary`로 교체
- 보더: `border-brand-border` → `border-white/[0.06]`

- [ ] **Step 3: 로컬에서 네비게이션 확인**

Run: `cd company-web && npm run dev`
브라우저에서 http://localhost:3000 열어 Navbar/Footer가 정상 렌더링되는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add components/Navbar.tsx components/Footer.tsx
git commit -m "feat: Navbar/Footer 리디자인 — 그라디언트 CTA, 새 컬러 토큰"
```

---

## Task 4: Hero 섹션 리디자인

**Files:**
- Modify: `components/sections/Hero.tsx`

- [ ] **Step 1: Hero 그라디언트 배경 + 새 타이포**

Hero 변경사항:
- 배경: `linear-gradient(180deg, rgba(45,43,85,0.3) 0%, #0A0A0A 100%)`을 섹션 배경으로
- 메인 헤딩: `font-display` 추가, `text-4xl md:text-5xl lg:text-6xl` → `text-4xl md:text-6xl lg:text-7xl`, `font-extrabold`, `tracking-[-2px]`
- 서브 텍스트: `text-brand-muted` 유지
- CTA 버튼: CTAButton 컴포넌트 사용 (이미 Task 2에서 리디자인됨)
- `brand-blue` 참조 → `brand-primary`로 교체
- SectionWrapper 사용 시 `noDivider={true}` (첫 섹션이므로)

- [ ] **Step 2: 로컬 확인**

Run: `npm run dev`
히어로 섹션의 그라디언트 배경, 큰 헤딩, 그라디언트 CTA 버튼 확인.

- [ ] **Step 3: 커밋**

```bash
git add components/sections/Hero.tsx
git commit -m "feat: Hero 리디자인 — 그라디언트 배경, 볼드 타이포, 새 컬러"
```

---

## Task 5: PainPoints + Comparison 리디자인

**Files:**
- Modify: `components/sections/PainPoints.tsx`
- Modify: `components/sections/Comparison.tsx`

- [ ] **Step 1: PainPoints — 새 카드 스타일**

PainPoints 변경:
- 카드: `bg-brand-surface` → `bg-white/[0.03]`, `border border-white/[0.06] rounded-2xl`
- hover: `hover:border-white/[0.12] transition-all duration-300`
- 카드 패딩: `p-6` → `p-7`
- 제목: `font-display font-bold`
- 기존 `brand-blue` → `brand-primary`

- [ ] **Step 2: Comparison — 스플릿 레이아웃 강화**

Comparison 변경:
- `brand-blue` → `brand-primary`
- 카드 스타일을 PainPoints와 동일한 패턴 적용
- "With 우리 회사" 쪽에 그라디언트 보더 또는 `border-brand-primary/30` 강조

- [ ] **Step 3: 커밋**

```bash
git add components/sections/PainPoints.tsx components/sections/Comparison.tsx
git commit -m "feat: PainPoints/Comparison 리디자인 — 글라스 카드, 새 컬러"
```

---

## Task 6: StatsRibbon + SocialProof 리디자인

**Files:**
- Modify: `components/visuals/StatsRibbon.tsx`
- Modify: `components/sections/SocialProof.tsx`
- Modify: `components/CaseStudyCard.tsx`

- [ ] **Step 1: StatsRibbon — 큰 숫자 + Display 폰트**

StatsRibbon 변경:
- 숫자: `font-display text-5xl md:text-6xl font-extrabold tracking-[-3px]`
- 숫자 컬러: `text-brand-primary`
- 레이블: `text-brand-muted text-sm`
- `brand-blue` → `brand-primary`

- [ ] **Step 2: CaseStudyCard — 새 카드 스타일**

CaseStudyCard 변경:
- 카드: `bg-white/[0.03] border border-white/[0.06] rounded-2xl hover:border-white/[0.12]`
- 메트릭 숫자: `font-display font-bold text-brand-primary`
- `brand-blue` → `brand-primary`

- [ ] **Step 3: SocialProof — 통합**

SocialProof 변경:
- `brand-blue` → `brand-primary`
- 섹션 헤딩: `font-display`
- CaseStudyCard가 이미 리디자인되었으므로 자동 적용

- [ ] **Step 4: 커밋**

```bash
git add components/visuals/StatsRibbon.tsx components/sections/SocialProof.tsx components/CaseStudyCard.tsx
git commit -m "feat: StatsRibbon/SocialProof 리디자인 — Display 숫자, 새 카드"
```

---

## Task 7: Services + Portfolio 리디자인

**Files:**
- Modify: `components/sections/Services.tsx`
- Modify: `components/sections/ServiceSection.tsx`
- Modify: `components/sections/Portfolio.tsx`

- [ ] **Step 1: Services — 탭 + 카드 리디자인**

Services/ServiceSection 변경:
- 탭 버튼: 활성 탭에 `brand-primary` 밑줄 또는 배경
- 서비스 카드: 새 카드 패턴 (`bg-white/[0.03] border border-white/[0.06] rounded-2xl`)
- 헤딩: `font-display`
- `brand-blue` → `brand-primary`, `brand-orange` → 유지하되 필요시 `brand-primary`

- [ ] **Step 2: Portfolio — 2col 큰 카드**

Portfolio 변경:
- 그리드: `grid-cols-3` → `grid-cols-1 md:grid-cols-2` (더 큰 카드)
- 카드: 새 카드 패턴, `rounded-2xl`
- hover: `hover:border-white/[0.12]`, 이미지 scale 유지
- 태그/뱃지: Badge 컴포넌트 사용 (이미 리디자인됨)

- [ ] **Step 3: 커밋**

```bash
git add components/sections/Services.tsx components/sections/ServiceSection.tsx components/sections/Portfolio.tsx
git commit -m "feat: Services/Portfolio 리디자인 — 탭 UI, 2col 큰 카드"
```

---

## Task 8: About + ReportSample + Process 리디자인

**Files:**
- Modify: `components/sections/About.tsx`
- Modify: `components/visuals/ReportSample.tsx`
- Modify: `components/sections/Process.tsx`

- [ ] **Step 1: About — 스플릿 레이아웃**

About 변경:
- 레이아웃: 텍스트 | 비주얼 스플릿 (2col)
- 헤딩: `font-display font-extrabold tracking-tight`
- `brand-blue` → `brand-primary`

- [ ] **Step 2: ReportSample — 스플릿 레이아웃**

ReportSample 변경:
- 텍스트 | 리포트 이미지 스플릿
- 이미지 컨테이너: `rounded-2xl border border-white/[0.06]` 감싸기
- `brand-blue` → `brand-primary`

- [ ] **Step 3: Process — 타임라인 리디자인**

Process 변경:
- 스텝 번호: `font-display text-2xl font-bold text-brand-primary`
- 타임라인 라인: `bg-gradient-to-b from-brand-secondary to-brand-primary`
- 카드: 새 카드 패턴
- `brand-blue` → `brand-primary`

- [ ] **Step 4: 커밋**

```bash
git add components/sections/About.tsx components/visuals/ReportSample.tsx components/sections/Process.tsx
git commit -m "feat: About/ReportSample/Process 리디자인 — 스플릿 레이아웃, 타임라인"
```

---

## Task 9: Pricing + FAQ 리디자인

**Files:**
- Modify: `components/sections/Pricing.tsx`
- Modify: `components/sections/FAQ.tsx`

- [ ] **Step 1: Pricing — 카드 리디자인**

Pricing 변경:
- 카드: `bg-white/[0.03] border border-white/[0.06] rounded-2xl`
- 추천 플랜: `border-brand-primary/30` 또는 그라디언트 보더
- 가격 숫자: `font-display text-4xl font-extrabold tracking-[-1px]`
- CTA 버튼: CTAButton 컴포넌트 사용
- `brand-blue` → `brand-primary`

- [ ] **Step 2: FAQ — 아코디언 리디자인**

FAQ 변경:
- 아코디언 아이템: `border-b border-white/[0.06]` (배경 제거)
- 질문: `font-display font-bold`
- 열림 아이콘: `text-brand-primary`
- `brand-blue` → `brand-primary`

- [ ] **Step 3: 커밋**

```bash
git add components/sections/Pricing.tsx components/sections/FAQ.tsx
git commit -m "feat: Pricing/FAQ 리디자인 — 프리미엄 카드, 미니멀 아코디언"
```

---

## Task 10: AuditPreview + FinalCTA 리디자인

**Files:**
- Modify: `components/visuals/AuditPreview.tsx`
- Modify: `components/sections/FinalCTA.tsx`

- [ ] **Step 1: AuditPreview — 풀폭 임팩트**

AuditPreview 변경:
- 배경: 그라디언트 `bg-gradient-to-b from-brand-secondary/20 to-transparent`
- 숫자/점수: `font-display font-extrabold text-brand-primary`
- `brand-blue` → `brand-primary`

- [ ] **Step 2: FinalCTA — 그라디언트 임팩트**

FinalCTA 변경:
- 배경: `bg-gradient-to-b from-brand-secondary/30 to-brand-bg`
- 헤딩: `font-display text-4xl md:text-5xl font-extrabold tracking-[-2px]`
- CTA 버튼: CTAButton primary (이미 그라디언트)
- `brand-blue` → `brand-primary`

- [ ] **Step 3: 커밋**

```bash
git add components/visuals/AuditPreview.tsx components/sections/FinalCTA.tsx
git commit -m "feat: AuditPreview/FinalCTA 리디자인 — 그라디언트 임팩트"
```

---

## Task 11: OG 이미지 + 잔여 컬러 참조 정리

**Files:**
- Modify: `app/opengraph-image.tsx`
- Modify: 기타 `brand-blue` / `brand-orange` 참조가 남은 파일

- [ ] **Step 1: OG 이미지 컬러 교체**

`app/opengraph-image.tsx`:
- `#4F7CFF` → `#E84B8A`
- 배경 유지 (`#0a0a0a`)

- [ ] **Step 2: 전체 프로젝트에서 brand-blue / brand-orange 잔여 참조 검색**

Run: `grep -r "brand-blue\|brand-orange\|#4F7CFF\|#ff6b35" --include="*.tsx" --include="*.ts" --include="*.css" company-web/`

남은 참조를 모두 `brand-primary` 또는 적절한 새 토큰으로 교체.

- [ ] **Step 3: 빌드 확인**

Run: `cd company-web && npm run build`
Expected: 빌드 성공, 에러 없음.

- [ ] **Step 4: 커밋**

```bash
git add -A company-web/
git commit -m "chore: brand-blue/orange 잔여 참조 정리 → brand-primary/secondary"
```

---

## Task 12: 최종 QA + 반응형 검증

**Files:** 없음 (검증만)

- [ ] **Step 1: 데스크톱 전체 스크롤 확인**

Run: `cd company-web && npm run dev`
브라우저에서 http://localhost:3000 열어 14개 섹션 전체를 스크롤하며 확인:
- 컬러 일관성 (핑크/네이비 그라디언트)
- 폰트 위계 (Display > H1 > H2 > Body)
- 카드 hover 인터랙션
- 섹션 간 border-t 구분선

- [ ] **Step 2: 모바일 (375px) 확인**

Chrome DevTools에서 iPhone SE (375px)로 확인:
- 헤딩 사이즈 축소
- 1col 스택 레이아웃
- 모바일 네비게이션 작동
- 가로 스크롤 없음

- [ ] **Step 3: Lighthouse 성능 확인**

Run: `npx lighthouse http://localhost:3000 --only-categories=performance --output=json --quiet | jq '.categories.performance.score'`
Expected: 0.9 이상 (90+)

- [ ] **Step 4: 최종 커밋**

```bash
git add -A company-web/
git commit -m "feat(company-web): 디자인 리뉴얼 완료 — 로고 기반 팔레트, Plus Jakarta Sans, 컴포넌트 업그레이드"
```
