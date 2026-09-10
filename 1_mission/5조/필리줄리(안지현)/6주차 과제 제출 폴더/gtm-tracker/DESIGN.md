# GTM Tracker — UTM 링크 빌더 + 클릭·리드 대시보드 (설계 문서)

- 작성일: 2026-09-07
- 대상 과제: 스폰지클럽 2기 6주차 (GTM 주간)
- 참고: 클럽마스터가 공유한 VETD 스크린샷 (UTM 빌더 → 단축 링크 → 클릭/신청 로그 → 대시보드)

## 배경 / 목표

Julie OS 웨이트리스트 홍보를 여러 채널(인스타 프로필/릴스/스토리, 카카오 DM 등)에 뿌릴 때,
- 어떤 채널·소재가 클릭을 만드는지
- 그 클릭이 실제 웨이트리스트 신청으로 이어지는지

를 한 곳에서 만들고(UTM 링크), 확인할 수 있는(대시보드) 로컬 도구를 만든다.

**비목표(이번 범위 아님):** 실배포(Vercel/Supabase), 로그인/권한, 다중 사용자, GA4 연동, 이메일 발송.

## 아키텍처

- **Next.js (App Router)** 단일 앱. `npm install && npm run dev`로 로컬 실행.
- **DB: SQLite (better-sqlite3)** — 리포지토리 내 파일(`data.db`)에 저장. 서버 프로세스나 클라우드 계정 불필요.
- **스타일: 일반 CSS (`globals.css`).** Julie OS 브랜드 팔레트(노랑 `#F5C518` 계열 + 다크 블랙 `#111`)를 CSS 변수로 정의. 페이지 수가 적어 Tailwind 같은 빌드 단계가 추가로 필요한 도구는 붙이지 않음(설정 파일·의존성을 줄여서 Node.js를 막 설치한 환경에서도 설치가 매끄럽게 되도록).
- **QR 코드:** `qrcode` npm 패키지로 서버에서 SVG 생성 (외부 CDN 호출 없음).
- 인증 없음 — `localhost`에서만 접근하는 내부 도구로 취급.

## 데이터 모델

```sql
channels (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,          -- "인스타 프로필"
  source TEXT NOT NULL,        -- "instagram"
  medium TEXT NOT NULL,        -- "bio"
  note TEXT,                   -- "프로필 상단 링크. 하나만 둔다"
  archived INTEGER DEFAULT 0
)

utm_links (
  id INTEGER PRIMARY KEY,
  channel_id INTEGER REFERENCES channels(id),
  content_code TEXT,           -- 소재 코드 (예: reel04), 자동 증가 제안
  memo TEXT,
  short_code TEXT UNIQUE,      -- 단축 슬러그 (예: ig-reel04)
  target_url TEXT NOT NULL,    -- /waitlist?utm_source=...&utm_medium=...&utm_campaign=...&utm_content=...
  created_by TEXT,
  created_at TEXT,
  archived INTEGER DEFAULT 0
)

link_clicks (
  id INTEGER PRIMARY KEY,
  link_id INTEGER REFERENCES utm_links(id),
  clicked_at TEXT,
  device_type TEXT,            -- "mobile" | "desktop"
  referrer TEXT
)

waitlist_signups (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TEXT
)
```

`channels`는 시드 데이터로 초기 세팅: 인스타 프로필(bio), 인스타 릴스(reel), 인스타 스토리(story), 카카오 DM·채널(dm), 이메일(email). 화면에서 추가/보관 가능.

## 라우트 / 페이지

1. **`/admin`** — 링크 만들기 + 장부
   - 좌측: 채널 선택 (체크박스, 다중 선택 시 같은 소재로 채널별 링크 일괄 생성)
   - 중앙: 소재 코드(자동 번호 제안) + 메모 입력
   - 우측: "만들기" → 단축 링크 생성, 클립보드 자동 복사, QR 버튼
   - 하단 "장부" 테이블: 전체 링크 목록 (채널/소재/메모/짧은링크/클릭/신청/전환율/만든날짜), 채널 필터·검색·보관 토글

2. **`/l/[code]`** — 단축 링크 리다이렉트
   - `short_code`로 링크 조회 → `link_clicks`에 클릭 기록 (User-Agent로 카카오톡/슬랙/디스코드 등 미리보기 봇은 제외) → `target_url`(UTM 쿼리 포함)로 302 리다이렉트

3. **`/waitlist`** — Julie OS 신청 폼
   - 이름(선택)/이메일(필수) 입력
   - 페이지 진입 시 쿼리스트링의 `utm_source/medium/campaign/content`를 폼 hidden 필드에 채워 넣고, 제출 시 그대로 `waitlist_signups`에 저장 (UTM 없이 직접 방문 시 `source=direct`)

4. **`/dashboard`** — 채널별 성과
   - 기간 필터: 오늘/7일/30일/전체/직접 지정
   - 요약 타일: 클릭 수, 신청 수, 전환율(클릭 대비 신청), 활성 링크 수
   - 일별 추이 바 차트 (클릭 vs 신청)
   - 채널별 테이블: 링크 수/클릭/신청/전환율, 클릭 비중 바
   - 소재 상위 10 (전환율 기준) 테이블
   - **이번 빌드 범위 밖(계획만, 미구현):** 기간 필터의 "직접 지정(custom range)" 옵션과 채널별 테이블의 "클릭 비중 바"는 이번 빌드에서는 넣지 않음. 실제 출시된 기간 필터는 오늘/7일/30일/전체 프리셋만 제공한다.

## 트래킹 메커니즘

- 클릭 카운트는 **`/l/[code]`를 실제로 거친 방문만** 집계 (장부 화면 안내 문구와 동일하게).
- 봇 제외: User-Agent에 `bot|crawler|preview|facebookexternalhit|kakaotalk|slackbot` 등이 포함되면 `link_clicks`에 기록하지 않고 리다이렉트만 수행.
- 신청 귀속은 **UTM 파라미터 매칭 방식**(쿠키/세션 없음): 단축 링크가 신청 폼으로 UTM을 쿼리스트링으로 그대로 넘기고, 폼 제출 시 그 값을 신청 레코드에 저장. 클릭 이벤트와 신청 이벤트는 직접 조인하지 않고, 대시보드에서 `utm_source+utm_medium+utm_content` 기준으로 같은 그룹으로 묶어 집계.

## 디자인 톤

Julie OS 브랜드(노랑 `#F5C518` 포인트 + 다크 블랙 `#111111` 배경/텍스트, 화이트 여백)를 기본으로. 스크린샷 속 VETD의 레이아웃 구조(좌측 내비게이션 없는 상단바, 섹션 구분선 헤더, 표 중심 정보 밀도)는 그대로 참고.

## 실행 방법

```
cd gtm-tracker
npm install
npm run dev   # http://localhost:3000/admin
```

시드 스크립트가 최초 실행 시 `channels` 기본값과 `data.db`를 자동 생성.
