# GTM Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-only Next.js app that lets Julie 안지현 create UTM-tagged short links per channel, redirect through them while logging clicks, capture Julie OS waitlist signups with their originating UTM values, and view a channel/date dashboard — mirroring the VETD screenshots shared by the club master.

**Architecture:** Single Next.js (App Router, JavaScript) app. `lib/db.js` wraps a `better-sqlite3` file database (`data.db`) and owns all schema/queries. App Router pages call small `/api/*` route handlers that are thin wrappers over `lib/db.js`. No auth, no external services — `npm install && npm run dev` is the entire setup.

**Tech Stack:** Next.js 14 (App Router, JS), better-sqlite3, qrcode, vitest for unit tests of `lib/*`. Plain CSS (no Tailwind) — see `DESIGN.md` for why.

Reference spec: `DESIGN.md` in this same folder (already committed).

## Global Constraints

- Runs entirely on `localhost` — no accounts, no deployment, no auth (per DESIGN.md "비목표").
- DB is a single SQLite file `data.db` at the project root, created and seeded automatically on first run.
- All UTM campaign values are fixed to `julie-os-waitlist` — there is no campaign selector in the UI (single-campaign tool, per DESIGN.md scope).
- Click counting only happens through `/l/[code]` redirects; known bot/preview User-Agents are excluded (see `lib/bots.js`).
- Signup attribution is UTM-parameter matching (no cookies/sessions) — a signup's `utm_source/medium/content` is compared against a link's `channel.source/medium` + `content_code` to compute per-link stats.
- Node.js v24 (LTS) and npm are already installed on this machine — confirmed via `node --version` (v24.19.0) / `npm --version` (11.17.0) immediately before this plan was written.
- **Windows/better-sqlite3 risk:** `better-sqlite3` ships prebuilt binaries for common Node versions; if `npm install` fails trying to compile it from source (no Visual Studio Build Tools on this machine), stop and swap `lib/db.js`'s `better-sqlite3` import for Node's built-in `node:sqlite` module (available in Node 24) — the rest of `lib/db.js`'s public functions can keep the same signatures, only the low-level `new Database(...)`/`.prepare()`/`.run()`/`.get()`/`.all()` calls change shape slightly. Flag this to the user before making that swap.

---

## File Structure

```
gtm-tracker/
  package.json
  next.config.mjs
  jsconfig.json
  vitest.config.js
  .gitignore
  README.md
  DESIGN.md            (already committed)
  PLAN.md              (this file)
  lib/
    db.js               - SQLite connection, schema, seed, all data access functions
    utm.js               - pure helpers: sourceAbbr, suggestContentCode, generateShortCode
    bots.js               - isBotUserAgent(userAgent)
    redirect.js            - classifyRequest(userAgent) -> {isBot, deviceType}
  app/
    globals.css
    layout.js
    page.js                       - redirects to /admin
    admin/
      page.js                      - link builder + ledger (client component)
    l/[code]/
      route.js                      - short-link redirect + click logging
    waitlist/
      page.js                        - reads UTM from searchParams (server component)
      WaitlistForm.js                  - signup form (client component)
    dashboard/
      page.js                          - stats + range filter (client component)
      BarChart.js                       - inline SVG bar chart (client component)
    api/
      channels/route.js                 - GET list, POST create
      links/route.js                     - GET list (filters), POST create (bulk by channel)
      links/[id]/archive/route.js         - POST toggle archive
      waitlist/route.js                    - POST create signup
      dashboard/route.js                    - GET aggregated stats
      qr/route.js                            - GET SVG QR code for a short link
  tests/
    lib/
      bots.test.js
      redirect.test.js
      utm.test.js
      db-channels.test.js
      db-links.test.js
      db-dashboard.test.js
```

---

### Task 1: Project scaffold + brand shell

**Files:**
- Create: `package.json`
- Create: `next.config.mjs`
- Create: `jsconfig.json`
- Create: `.gitignore`
- Create: `app/globals.css`
- Create: `app/layout.js`
- Create: `app/page.js`

**Interfaces:**
- Produces: a running Next.js dev server at `http://localhost:3000`, root `/` redirects to `/admin` (which will 404 until Task 10 — that's expected at this point).

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "gtm-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "better-sqlite3": "^11.3.0",
    "next": "^14.2.0",
    "qrcode": "^1.5.3",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
```

- [ ] **Step 3: Create `jsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.next/
data.db
data.db-journal
data.db-wal
data.db-shm
```

- [ ] **Step 5: Create `app/globals.css`**

```css
:root {
  --brand-yellow: #f5c518;
  --brand-black: #111111;
  --bg: #ffffff;
  --fg: #111111;
  --muted: #6b6b6b;
  --border: #e5e5e5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Pretendard, sans-serif;
  background: var(--bg);
  color: var(--fg);
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 2px solid var(--brand-black);
}

.brand {
  font-weight: 800;
  letter-spacing: 0.02em;
}

.topbar nav a {
  margin-left: 12px;
  padding: 8px 14px;
  border: 1px solid var(--brand-black);
  border-radius: 6px;
  text-decoration: none;
  color: var(--fg);
  font-size: 14px;
}

.topbar nav a:hover {
  background: var(--brand-yellow);
}

main {
  max-width: 1080px;
  margin: 0 auto;
  padding: 32px 24px 80px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 32px 0 12px;
}

.section-title::before {
  content: "";
  width: 4px;
  height: 14px;
  background: var(--brand-yellow);
  display: inline-block;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

th,
td {
  text-align: left;
  padding: 10px 8px;
  border-bottom: 1px solid var(--border);
}

button,
.btn {
  cursor: pointer;
  border: 1px solid var(--brand-black);
  background: var(--brand-black);
  color: white;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 14px;
}

button.secondary {
  background: white;
  color: var(--brand-black);
}

input,
select,
textarea {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 14px;
  width: 100%;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.tile {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}

.tile .value {
  font-size: 28px;
  font-weight: 800;
}
```

- [ ] **Step 6: Create `app/layout.js`**

```jsx
import "./globals.css";

export const metadata = {
  title: "GTM Tracker · Julie OS",
  description: "Julie OS 웨이트리스트 UTM 링크 빌더와 대시보드",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <header className="topbar">
          <span className="brand">JULIE OS · GTM</span>
          <nav>
            <a href="/admin">링크 만들기</a>
            <a href="/dashboard">대시보드</a>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Create `app/page.js`**

```jsx
import { redirect } from "next/navigation";

export default function HomePage() {
  redirect("/admin");
}
```

- [ ] **Step 8: Install dependencies and smoke-test the dev server**

Run: `npm install`
Expected: installs without native-compile errors. If `better-sqlite3` fails to build, apply the Global Constraints fallback (`node:sqlite`) before continuing.

Run: `npm run dev` (in background/separate terminal), then in another shell: `curl -sI http://localhost:3000/`
Expected: a redirect response (`307`/`308`) with `location: /admin`. Stop the dev server after confirming.

- [ ] **Step 9: Commit**

```bash
git add package.json next.config.mjs jsconfig.json .gitignore app/globals.css app/layout.js app/page.js
git commit -m "gtm-tracker: scaffold Next.js app shell"
```

---

### Task 2: DB layer — schema, seed, channels

**Files:**
- Create: `lib/db.js`
- Create: `vitest.config.js`
- Test: `tests/lib/db-channels.test.js`

**Interfaces:**
- Produces: `getDb()`, `resetDbForTests()`, `listChannels({ includeArchived })`, `createChannel({ name, source, medium, note })` — all imported by later tasks from `@/lib/db`.

- [ ] **Step 1: Create `vitest.config.js`**

```js
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      GTM_DB_PATH: ":memory:",
    },
  },
});
```

- [ ] **Step 2: Write the failing test — `tests/lib/db-channels.test.js`**

```js
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbForTests, listChannels, createChannel } from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

describe("getDb", () => {
  it("seeds five default channels on first access", () => {
    getDb();
    const channels = listChannels();
    expect(channels).toHaveLength(5);
    expect(channels.map((c) => c.source)).toContain("instagram");
  });
});

describe("listChannels", () => {
  it("excludes archived channels by default", () => {
    const db = getDb();
    const [first] = listChannels();
    db.prepare("UPDATE channels SET archived = 1 WHERE id = ?").run(first.id);

    expect(listChannels()).toHaveLength(4);
    expect(listChannels({ includeArchived: true })).toHaveLength(5);
  });
});

describe("createChannel", () => {
  it("inserts and returns the new channel with an id", () => {
    const channel = createChannel({
      name: "네이버 검색 광고",
      source: "naver",
      medium: "cpc",
      note: "키워드는 utm_term에",
    });

    expect(channel.id).toBeTypeOf("number");
    expect(channel.name).toBe("네이버 검색 광고");
    expect(listChannels()).toHaveLength(6);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/db-channels.test.js`
Expected: FAIL — `Cannot find module '../../lib/db.js'`

- [ ] **Step 4: Create `lib/db.js`**

```js
import Database from "better-sqlite3";
import path from "node:path";

let dbInstance;

const SEED_CHANNELS = [
  { name: "인스타 프로필", source: "instagram", medium: "bio", note: "프로필 상단 링크. 하나만 둔다" },
  { name: "인스타 릴스", source: "instagram", medium: "reel", note: "릴스 댓글·스티커. 릴스마다 새 번호" },
  { name: "인스타 스토리", source: "instagram", medium: "story", note: "스토리 링크 스티커. 올린 날짜로 코드" },
  { name: "카카오 DM·채널", source: "kakao", medium: "dm", note: "카카오톡 채널 메시지·1:1 공유" },
  { name: "이메일", source: "email", medium: "newsletter", note: "뉴스레터·개별 메일 발송" },
];

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.GTM_DB_PATH || path.join(process.cwd(), "data.db");
  dbInstance = new Database(dbPath);
  dbInstance.pragma("journal_mode = WAL");
  initSchema(dbInstance);
  seedChannels(dbInstance);
  return dbInstance;
}

export function resetDbForTests() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = undefined;
  }
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      medium TEXT NOT NULL,
      note TEXT,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS utm_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id INTEGER NOT NULL REFERENCES channels(id),
      content_code TEXT,
      memo TEXT,
      short_code TEXT NOT NULL UNIQUE,
      target_url TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL,
      archived INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS link_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL REFERENCES utm_links(id),
      clicked_at TEXT NOT NULL,
      device_type TEXT,
      referrer TEXT
    );

    CREATE TABLE IF NOT EXISTS waitlist_signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT NOT NULL,
      utm_source TEXT,
      utm_medium TEXT,
      utm_campaign TEXT,
      utm_content TEXT,
      created_at TEXT NOT NULL
    );
  `);
}

function seedChannels(db) {
  const { c: count } = db.prepare("SELECT COUNT(*) as c FROM channels").get();
  if (count > 0) return;

  const insert = db.prepare(
    "INSERT INTO channels (name, source, medium, note, archived) VALUES (@name, @source, @medium, @note, 0)"
  );
  const insertAll = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertAll(SEED_CHANNELS);
}

export function listChannels({ includeArchived = false } = {}) {
  const db = getDb();
  if (includeArchived) {
    return db.prepare("SELECT * FROM channels ORDER BY id").all();
  }
  return db.prepare("SELECT * FROM channels WHERE archived = 0 ORDER BY id").all();
}

export function createChannel({ name, source, medium, note = "" }) {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO channels (name, source, medium, note, archived) VALUES (?, ?, ?, ?, 0)"
    )
    .run(name, source, medium, note);
  return db.prepare("SELECT * FROM channels WHERE id = ?").get(result.lastInsertRowid);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/db-channels.test.js`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/db.js vitest.config.js tests/lib/db-channels.test.js
git commit -m "gtm-tracker: SQLite schema, seed channels, channel CRUD"
```

---

### Task 3: UTM helpers — `lib/utm.js`

**Files:**
- Create: `lib/utm.js`
- Test: `tests/lib/utm.test.js`

**Interfaces:**
- Consumes: nothing (pure functions).
- Produces: `sourceAbbr(source)`, `suggestContentCode(medium, existingCount)`, `generateShortCode(channel, contentCode, existingCodes)` — all consumed by `lib/db.js` in Task 5 (`channel` is `{ source, medium }`; `existingCodes` is a `Set<string>`).

- [ ] **Step 1: Write the failing test — `tests/lib/utm.test.js`**

```js
import { describe, expect, it } from "vitest";
import { sourceAbbr, suggestContentCode, generateShortCode } from "../../lib/utm.js";

describe("sourceAbbr", () => {
  it("maps known sources to short codes", () => {
    expect(sourceAbbr("instagram")).toBe("ig");
    expect(sourceAbbr("kakao")).toBe("kakao");
    expect(sourceAbbr("email")).toBe("mail");
  });

  it("falls back to the first 4 characters for unknown sources", () => {
    expect(sourceAbbr("pinterest")).toBe("pint");
  });
});

describe("suggestContentCode", () => {
  it("returns an empty string for the bio medium (single canonical link)", () => {
    expect(suggestContentCode("bio", 0)).toBe("");
    expect(suggestContentCode("bio", 3)).toBe("");
  });

  it("numbers other media starting at 01, padded to 2 digits", () => {
    expect(suggestContentCode("reel", 0)).toBe("reel01");
    expect(suggestContentCode("reel", 3)).toBe("reel04");
    expect(suggestContentCode("story", 9)).toBe("story10");
  });
});

describe("generateShortCode", () => {
  const channel = { source: "instagram", medium: "reel" };

  it("combines the source abbreviation with the content code", () => {
    expect(generateShortCode(channel, "reel04", new Set())).toBe("ig-reel04");
  });

  it("falls back to the medium when content code is empty", () => {
    expect(generateShortCode({ source: "instagram", medium: "bio" }, "", new Set())).toBe("ig-bio");
  });

  it("appends a numeric suffix on collision", () => {
    const existing = new Set(["ig-reel04"]);
    expect(generateShortCode(channel, "reel04", existing)).toBe("ig-reel04-2");
  });

  it("keeps incrementing the suffix until it finds a free slug", () => {
    const existing = new Set(["ig-reel04", "ig-reel04-2"]);
    expect(generateShortCode(channel, "reel04", existing)).toBe("ig-reel04-3");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/utm.test.js`
Expected: FAIL — `Cannot find module '../../lib/utm.js'`

- [ ] **Step 3: Create `lib/utm.js`**

```js
const SOURCE_ABBR = {
  instagram: "ig",
  kakao: "kakao",
  email: "mail",
  naver: "naver",
  youtube: "yt",
  meta: "meta",
};

export function sourceAbbr(source) {
  return SOURCE_ABBR[source] || source.slice(0, 4);
}

export function suggestContentCode(medium, existingCount) {
  if (medium === "bio") return "";
  return `${medium}${String(existingCount + 1).padStart(2, "0")}`;
}

export function generateShortCode(channel, contentCode, existingCodes) {
  const base = `${sourceAbbr(channel.source)}-${contentCode || channel.medium}`;
  let candidate = base;
  let suffix = 2;
  while (existingCodes.has(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/utm.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/utm.js tests/lib/utm.test.js
git commit -m "gtm-tracker: UTM short-code and content-code helpers"
```

---

### Task 4: Bot filtering + device classification

**Files:**
- Create: `lib/bots.js`
- Create: `lib/redirect.js`
- Test: `tests/lib/bots.test.js`
- Test: `tests/lib/redirect.test.js`

**Interfaces:**
- Produces: `isBotUserAgent(userAgent)` from `lib/bots.js`; `classifyRequest(userAgent) -> { isBot: boolean, deviceType: 'mobile'|'desktop'|null }` from `lib/redirect.js`. Consumed by the `/l/[code]` route in Task 8.

- [ ] **Step 1: Write the failing test — `tests/lib/bots.test.js`**

```js
import { describe, expect, it } from "vitest";
import { isBotUserAgent } from "../../lib/bots.js";

describe("isBotUserAgent", () => {
  it("treats a missing user agent as a bot", () => {
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
  });

  it("recognizes common link-preview and crawler user agents", () => {
    expect(isBotUserAgent("KAKAOTALK")).toBe(true);
    expect(isBotUserAgent("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe(true);
  });

  it("does not flag normal browser user agents", () => {
    expect(
      isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
    ).toBe(false);
    expect(
      isBotUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0")
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/bots.test.js`
Expected: FAIL — `Cannot find module '../../lib/bots.js'`

- [ ] **Step 3: Create `lib/bots.js`**

```js
const BOT_UA_PATTERN =
  /bot|crawler|spider|preview|facebookexternalhit|kakaotalk|slackbot|telegrambot|discordbot|whatsapp|twitterbot|linkedinbot/i;

export function isBotUserAgent(userAgent) {
  if (!userAgent) return true;
  return BOT_UA_PATTERN.test(userAgent);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/bots.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test — `tests/lib/redirect.test.js`**

```js
import { describe, expect, it } from "vitest";
import { classifyRequest } from "../../lib/redirect.js";

describe("classifyRequest", () => {
  it("marks bot user agents and skips device classification", () => {
    expect(classifyRequest("KAKAOTALK")).toEqual({ isBot: true, deviceType: null });
  });

  it("classifies an iPhone user agent as mobile", () => {
    expect(
      classifyRequest("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
    ).toEqual({ isBot: false, deviceType: "mobile" });
  });

  it("classifies a desktop Chrome user agent as desktop", () => {
    expect(
      classifyRequest("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0")
    ).toEqual({ isBot: false, deviceType: "desktop" });
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npx vitest run tests/lib/redirect.test.js`
Expected: FAIL — `Cannot find module '../../lib/redirect.js'`

- [ ] **Step 7: Create `lib/redirect.js`**

```js
import { isBotUserAgent } from "./bots.js";

const MOBILE_UA_PATTERN = /Mobile|Android|iPhone|iPad/i;

export function classifyRequest(userAgent) {
  if (isBotUserAgent(userAgent)) {
    return { isBot: true, deviceType: null };
  }
  return {
    isBot: false,
    deviceType: MOBILE_UA_PATTERN.test(userAgent) ? "mobile" : "desktop",
  };
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npx vitest run tests/lib/redirect.test.js`
Expected: PASS (3 tests)

- [ ] **Step 9: Commit**

```bash
git add lib/bots.js lib/redirect.js tests/lib/bots.test.js tests/lib/redirect.test.js
git commit -m "gtm-tracker: bot filtering and device classification for redirects"
```

---

### Task 5: DB layer — links, clicks, ledger

**Files:**
- Modify: `lib/db.js` (append)
- Test: `tests/lib/db-links.test.js`

**Interfaces:**
- Consumes: `sourceAbbr`, `suggestContentCode`, `generateShortCode` from `@/lib/utm.js` (Task 3).
- Produces: `createLink({ channelId, contentCode, memo, createdBy })`, `getLinkByShortCode(shortCode)`, `listLinks({ channelId, search, includeArchived })`, `recordClick(linkId, { deviceType, referrer })`, `setLinkArchived(id, archived)`. Consumed by API routes in Tasks 7–8 and the admin page in Task 10.

- [ ] **Step 1: Write the failing test — `tests/lib/db-links.test.js`**

```js
import { beforeEach, describe, expect, it } from "vitest";
import {
  resetDbForTests,
  listChannels,
  createLink,
  getLinkByShortCode,
  listLinks,
  recordClick,
  setLinkArchived,
} from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

function reelChannel() {
  return listChannels().find((c) => c.medium === "reel");
}

describe("createLink", () => {
  it("auto-suggests a content code and short code when none is given", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "", memo: "", createdBy: "" });
    expect(link.content_code).toBe("reel01");
    expect(link.short_code).toBe("ig-reel01");
    expect(link.target_url).toContain("utm_source=instagram");
    expect(link.target_url).toContain("utm_campaign=julie-os-waitlist");
  });

  it("uses a provided content code as-is", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel04", memo: "런칭 릴스", createdBy: "julie" });
    expect(link.content_code).toBe("reel04");
    expect(link.short_code).toBe("ig-reel04");
    expect(link.memo).toBe("런칭 릴스");
  });

  it("throws for an unknown channel id", () => {
    expect(() => createLink({ channelId: 9999, contentCode: "", memo: "", createdBy: "" })).toThrow();
  });
});

describe("getLinkByShortCode", () => {
  it("finds a link by its short code", () => {
    const created = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    const found = getLinkByShortCode("ig-reel01");
    expect(found.id).toBe(created.id);
  });

  it("returns undefined for an unknown code", () => {
    expect(getLinkByShortCode("nope")).toBeUndefined();
  });
});

describe("recordClick + listLinks", () => {
  it("counts clicks per link and reports zero signups when none exist", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    recordClick(link.id, { deviceType: "mobile", referrer: null });
    recordClick(link.id, { deviceType: "desktop", referrer: null });

    const [row] = listLinks();
    expect(row.clicks).toBe(2);
    expect(row.signups).toBe(0);
    expect(row.shortUrl).toBe("/l/ig-reel01");
  });

  it("excludes archived links by default and includes them when asked", () => {
    const link = createLink({ channelId: reelChannel().id, contentCode: "reel01", memo: "", createdBy: "" });
    setLinkArchived(link.id, true);

    expect(listLinks()).toHaveLength(0);
    expect(listLinks({ includeArchived: true })).toHaveLength(1);
  });

  it("filters by channelId and search text", () => {
    const channel = reelChannel();
    createLink({ channelId: channel.id, contentCode: "reel01", memo: "런칭", createdBy: "" });
    createLink({ channelId: channel.id, contentCode: "reel02", memo: "이벤트", createdBy: "" });

    expect(listLinks({ channelId: channel.id })).toHaveLength(2);
    expect(listLinks({ search: "이벤트" })).toHaveLength(1);
    expect(listLinks({ search: "이벤트" })[0].content_code).toBe("reel02");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/db-links.test.js`
Expected: FAIL — `createLink is not a function` (or similar, since these exports don't exist yet)

- [ ] **Step 3: Append to `lib/db.js`**

Add this import at the top of `lib/db.js`, alongside the existing `better-sqlite3`/`path` imports:

```js
import { suggestContentCode, generateShortCode } from "./utm.js";
```

Append these functions at the end of `lib/db.js`:

```js
export function createLink({ channelId, contentCode, memo, createdBy = "" }) {
  const db = getDb();
  const channel = db.prepare("SELECT * FROM channels WHERE id = ?").get(channelId);
  if (!channel) throw new Error(`channel not found: ${channelId}`);

  const { n: existingCount } = db
    .prepare("SELECT COUNT(*) as n FROM utm_links WHERE channel_id = ?")
    .get(channelId);
  const finalContentCode =
    contentCode && contentCode.trim() ? contentCode.trim() : suggestContentCode(channel.medium, existingCount);

  const existingCodes = new Set(db.prepare("SELECT short_code FROM utm_links").all().map((r) => r.short_code));
  const shortCode = generateShortCode(channel, finalContentCode, existingCodes);
  const targetUrl = buildTargetUrl(channel, finalContentCode);
  const createdAt = new Date().toISOString();

  const result = db
    .prepare(
      `INSERT INTO utm_links (channel_id, content_code, memo, short_code, target_url, created_by, created_at, archived)
       VALUES (@channelId, @contentCode, @memo, @shortCode, @targetUrl, @createdBy, @createdAt, 0)`
    )
    .run({
      channelId,
      contentCode: finalContentCode,
      memo: memo || "",
      shortCode,
      targetUrl,
      createdBy,
      createdAt,
    });

  return db.prepare("SELECT * FROM utm_links WHERE id = ?").get(result.lastInsertRowid);
}

function buildTargetUrl(channel, contentCode) {
  const params = new URLSearchParams({
    utm_source: channel.source,
    utm_medium: channel.medium,
    utm_campaign: "julie-os-waitlist",
    utm_content: contentCode || "",
  });
  return `/waitlist?${params.toString()}`;
}

export function getLinkByShortCode(shortCode) {
  const db = getDb();
  return db.prepare("SELECT * FROM utm_links WHERE short_code = ?").get(shortCode);
}

export function setLinkArchived(id, archived) {
  const db = getDb();
  db.prepare("UPDATE utm_links SET archived = ? WHERE id = ?").run(archived ? 1 : 0, id);
}

export function recordClick(linkId, { deviceType = null, referrer = null } = {}) {
  const db = getDb();
  db.prepare(
    "INSERT INTO link_clicks (link_id, clicked_at, device_type, referrer) VALUES (?, ?, ?, ?)"
  ).run(linkId, new Date().toISOString(), deviceType, referrer);
}

export function listLinks({ channelId = null, search = "", includeArchived = false } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT
         l.id, l.channel_id, l.content_code, l.memo, l.short_code, l.target_url,
         l.created_by, l.created_at, l.archived,
         c.name as channel_name, c.source as channel_source, c.medium as channel_medium
       FROM utm_links l
       JOIN channels c ON c.id = l.channel_id
       WHERE (@includeArchived = 1 OR l.archived = 0)
         AND (@channelId IS NULL OR l.channel_id = @channelId)
         AND (@search = '' OR l.memo LIKE @searchLike OR l.content_code LIKE @searchLike)
       ORDER BY l.created_at DESC`
    )
    .all({
      includeArchived: includeArchived ? 1 : 0,
      channelId,
      search,
      searchLike: `%${search}%`,
    });

  return rows.map((row) => {
    const { n: clicks } = db.prepare("SELECT COUNT(*) as n FROM link_clicks WHERE link_id = ?").get(row.id);
    const { n: signups } = db
      .prepare(
        "SELECT COUNT(*) as n FROM waitlist_signups WHERE utm_source = ? AND utm_medium = ? AND utm_content = ?"
      )
      .get(row.channel_source, row.channel_medium, row.content_code || "");
    return {
      ...row,
      clicks,
      signups,
      conversionRate: clicks > 0 ? signups / clicks : 0,
      shortUrl: `/l/${row.short_code}`,
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/db-links.test.js`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/db.js tests/lib/db-links.test.js
git commit -m "gtm-tracker: link creation, click logging, ledger queries"
```

---

### Task 6: DB layer — waitlist signups + dashboard aggregation

**Files:**
- Modify: `lib/db.js` (append)
- Test: `tests/lib/db-dashboard.test.js`

**Interfaces:**
- Produces: `createSignup({ name, email, utm_source, utm_medium, utm_campaign, utm_content })`, `getDashboardStats({ from, to })`. Consumed by API routes in Task 7.
- `getDashboardStats` return shape:
  ```
  {
    totalClicks: number,
    totalSignups: number,
    conversionRate: number,
    activeLinks: number,
    dailySeries: [{ day: 'YYYY-MM-DD', clicks: number, signups: number }],
    channelBreakdown: [{ channelId, name, linkCount, clicks, signups, conversionRate }],
    topContent: [{ linkId, channelName, contentCode, shortCode, clicks, signups, conversionRate }],
  }
  ```

- [ ] **Step 1: Write the failing test — `tests/lib/db-dashboard.test.js`**

```js
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDbForTests, listChannels, createLink, recordClick, createSignup, getDashboardStats } from "../../lib/db.js";

beforeEach(() => {
  resetDbForTests();
});

describe("createSignup", () => {
  it("requires a valid email", () => {
    expect(() => createSignup({ email: "" })).toThrow();
    expect(() => createSignup({ email: "not-an-email" })).toThrow();
  });

  it("stores the signup with its UTM attribution", () => {
    const signup = createSignup({
      name: "테스터",
      email: "tester@example.com",
      utm_source: "instagram",
      utm_medium: "reel",
      utm_campaign: "julie-os-waitlist",
      utm_content: "reel01",
    });
    expect(signup.id).toBeTypeOf("number");
    expect(signup.utm_content).toBe("reel01");
  });

  it("defaults missing UTM fields to direct/none", () => {
    const signup = createSignup({ email: "direct@example.com" });
    expect(signup.utm_source).toBe("direct");
    expect(signup.utm_medium).toBe("none");
  });
});

describe("getDashboardStats", () => {
  it("aggregates totals, conversion rate, and active links with no data", () => {
    const stats = getDashboardStats({});
    expect(stats).toMatchObject({ totalClicks: 0, totalSignups: 0, conversionRate: 0, activeLinks: 0 });
    expect(stats.dailySeries).toEqual([]);
  });

  it("computes clicks, signups, and per-channel/per-content breakdowns", () => {
    const reel = listChannels().find((c) => c.medium === "reel");
    const bio = listChannels().find((c) => c.medium === "bio");

    const reelLink = createLink({ channelId: reel.id, contentCode: "reel01", memo: "", createdBy: "" });
    const bioLink = createLink({ channelId: bio.id, contentCode: "", memo: "", createdBy: "" });

    recordClick(reelLink.id, { deviceType: "mobile", referrer: null });
    recordClick(reelLink.id, { deviceType: "mobile", referrer: null });
    recordClick(bioLink.id, { deviceType: "desktop", referrer: null });

    createSignup({ email: "a@example.com", utm_source: "instagram", utm_medium: "reel", utm_content: "reel01" });

    const stats = getDashboardStats({});
    expect(stats.totalClicks).toBe(3);
    expect(stats.totalSignups).toBe(1);
    expect(stats.conversionRate).toBeCloseTo(1 / 3);
    expect(stats.activeLinks).toBe(2);

    const reelBreakdown = stats.channelBreakdown.find((c) => c.channelId === reel.id);
    expect(reelBreakdown).toMatchObject({ linkCount: 1, clicks: 2, signups: 1 });

    const topReel = stats.topContent.find((t) => t.shortCode === "ig-reel01");
    expect(topReel).toMatchObject({ clicks: 2, signups: 1 });
  });

  it("only counts clicks/signups inside the requested date range", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const reel = listChannels().find((c) => c.medium === "reel");
    const link = createLink({ channelId: reel.id, contentCode: "reel01", memo: "", createdBy: "" });
    recordClick(link.id, { deviceType: "mobile", referrer: null });

    vi.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
    recordClick(link.id, { deviceType: "mobile", referrer: null });

    vi.useRealTimers();

    const janOnly = getDashboardStats({ from: "2026-01-01", to: "2026-01-31" });
    expect(janOnly.totalClicks).toBe(1);

    const all = getDashboardStats({});
    expect(all.totalClicks).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/db-dashboard.test.js`
Expected: FAIL — `createSignup is not a function`

- [ ] **Step 3: Append to `lib/db.js`**

```js
export function createSignup({
  name = "",
  email,
  utm_source = "direct",
  utm_medium = "none",
  utm_campaign = "",
  utm_content = "",
}) {
  if (!email || !email.includes("@")) {
    throw new Error("valid email is required");
  }
  const db = getDb();
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO waitlist_signups (name, email, utm_source, utm_medium, utm_campaign, utm_content, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(name, email, utm_source, utm_medium, utm_campaign, utm_content, createdAt);
  return db.prepare("SELECT * FROM waitlist_signups WHERE id = ?").get(result.lastInsertRowid);
}

export function getDashboardStats({ from = null, to = null } = {}) {
  const db = getDb();
  const range = { from: from || "", to: to || "" };

  const { n: totalClicks } = db
    .prepare(
      `SELECT COUNT(*) as n FROM link_clicks
       WHERE (@from = '' OR date(clicked_at) >= @from) AND (@to = '' OR date(clicked_at) <= @to)`
    )
    .get(range);

  const { n: totalSignups } = db
    .prepare(
      `SELECT COUNT(*) as n FROM waitlist_signups
       WHERE (@from = '' OR date(created_at) >= @from) AND (@to = '' OR date(created_at) <= @to)`
    )
    .get(range);

  const { n: activeLinks } = db.prepare("SELECT COUNT(*) as n FROM utm_links WHERE archived = 0").get();
  const conversionRate = totalClicks > 0 ? totalSignups / totalClicks : 0;

  const dailyClicks = db
    .prepare(
      `SELECT date(clicked_at) as day, COUNT(*) as n FROM link_clicks
       WHERE (@from = '' OR date(clicked_at) >= @from) AND (@to = '' OR date(clicked_at) <= @to)
       GROUP BY day`
    )
    .all(range);
  const dailySignups = db
    .prepare(
      `SELECT date(created_at) as day, COUNT(*) as n FROM waitlist_signups
       WHERE (@from = '' OR date(created_at) >= @from) AND (@to = '' OR date(created_at) <= @to)
       GROUP BY day`
    )
    .all(range);
  const dailySeries = mergeDailySeries(dailyClicks, dailySignups);

  const channelBreakdown = listChannels({ includeArchived: true })
    .map((c) => {
      const { n: linkCount } = db.prepare("SELECT COUNT(*) as n FROM utm_links WHERE channel_id = @id").get({ id: c.id });
      const { n: clicks } = db
        .prepare(
          `SELECT COUNT(*) as n FROM link_clicks lc
           JOIN utm_links l ON l.id = lc.link_id
           WHERE l.channel_id = @id
             AND (@from = '' OR date(lc.clicked_at) >= @from) AND (@to = '' OR date(lc.clicked_at) <= @to)`
        )
        .get({ id: c.id, ...range });
      const { n: signups } = db
        .prepare(
          `SELECT COUNT(*) as n FROM waitlist_signups
           WHERE utm_source = @source AND utm_medium = @medium
             AND (@from = '' OR date(created_at) >= @from) AND (@to = '' OR date(created_at) <= @to)`
        )
        .get({ source: c.source, medium: c.medium, ...range });
      return {
        channelId: c.id,
        name: c.name,
        linkCount,
        clicks,
        signups,
        conversionRate: clicks > 0 ? signups / clicks : 0,
      };
    })
    .sort((a, b) => b.clicks - a.clicks);

  const topContent = listLinks({ includeArchived: true })
    .map((l) => ({
      linkId: l.id,
      channelName: l.channel_name,
      contentCode: l.content_code,
      shortCode: l.short_code,
      clicks: l.clicks,
      signups: l.signups,
      conversionRate: l.conversionRate,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate || b.clicks - a.clicks)
    .slice(0, 10);

  return { totalClicks, totalSignups, conversionRate, activeLinks, dailySeries, channelBreakdown, topContent };
}

function mergeDailySeries(dailyClicks, dailySignups) {
  const days = new Set([...dailyClicks.map((d) => d.day), ...dailySignups.map((d) => d.day)]);
  const clickMap = Object.fromEntries(dailyClicks.map((d) => [d.day, d.n]));
  const signupMap = Object.fromEntries(dailySignups.map((d) => [d.day, d.n]));
  return [...days].sort().map((day) => ({
    day,
    clicks: clickMap[day] || 0,
    signups: signupMap[day] || 0,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/db-dashboard.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Run the full unit test suite**

Run: `npm test`
Expected: all test files pass (bots, redirect, utm, db-channels, db-links, db-dashboard).

- [ ] **Step 6: Commit**

```bash
git add lib/db.js tests/lib/db-dashboard.test.js
git commit -m "gtm-tracker: waitlist signups and dashboard aggregation"
```

---

### Task 7: API routes — channels, links, archive, waitlist, dashboard

**Files:**
- Create: `app/api/channels/route.js`
- Create: `app/api/links/route.js`
- Create: `app/api/links/[id]/archive/route.js`
- Create: `app/api/waitlist/route.js`
- Create: `app/api/dashboard/route.js`

**Interfaces:**
- Consumes: `listChannels`, `createChannel`, `listLinks`, `createLink`, `setLinkArchived`, `createSignup`, `getDashboardStats` from `@/lib/db.js` (Tasks 2, 5, 6).
- Produces: the HTTP surface consumed by the UI pages in Tasks 10–12.

This task is a thin HTTP adapter over already-tested `lib/db.js` functions — logic correctness is covered by Tasks 2/5/6's unit tests, so verification here is manual (`curl`) rather than another unit-test layer.

- [ ] **Step 1: Create `app/api/channels/route.js`**

```js
import { NextResponse } from "next/server";
import { listChannels, createChannel } from "@/lib/db";

export async function GET() {
  return NextResponse.json({ channels: listChannels() });
}

export async function POST(request) {
  const body = await request.json();
  if (!body.name || !body.source || !body.medium) {
    return NextResponse.json({ error: "name, source, medium은 필수예요" }, { status: 400 });
  }
  const channel = createChannel({
    name: body.name,
    source: body.source,
    medium: body.medium,
    note: body.note || "",
  });
  return NextResponse.json({ channel }, { status: 201 });
}
```

- [ ] **Step 2: Create `app/api/links/route.js`**

```js
import { NextResponse } from "next/server";
import { listLinks, createLink } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  const search = searchParams.get("search") || "";
  const includeArchived = searchParams.get("includeArchived") === "true";

  const links = listLinks({
    channelId: channelId ? Number(channelId) : null,
    search,
    includeArchived,
  });
  return NextResponse.json({ links });
}

export async function POST(request) {
  const body = await request.json();
  const channelIds = Array.isArray(body.channelIds) ? body.channelIds : [body.channelId];
  if (!channelIds.length || channelIds.some((id) => !id)) {
    return NextResponse.json({ error: "채널을 선택해주세요" }, { status: 400 });
  }

  try {
    const links = channelIds.map((channelId) =>
      createLink({
        channelId: Number(channelId),
        contentCode: body.contentCode || "",
        memo: body.memo || "",
        createdBy: body.createdBy || "",
      })
    );
    return NextResponse.json({ links: links.map(withShortUrl) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

function withShortUrl(link) {
  return { ...link, shortUrl: `/l/${link.short_code}` };
}
```

- [ ] **Step 3: Create `app/api/links/[id]/archive/route.js`**

```js
import { NextResponse } from "next/server";
import { setLinkArchived, getDb } from "@/lib/db";

export async function POST(request, { params }) {
  const db = getDb();
  const link = db.prepare("SELECT * FROM utm_links WHERE id = ?").get(params.id);
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const nextArchived = !link.archived;
  setLinkArchived(params.id, nextArchived);
  return NextResponse.json({ archived: nextArchived });
}
```

This route needs `getDb` exported from `lib/db.js` — it already is (Task 2, Step 4 defines it with `export function getDb()`).

- [ ] **Step 4: Create `app/api/waitlist/route.js`**

```js
import { NextResponse } from "next/server";
import { createSignup } from "@/lib/db";

export async function POST(request) {
  const body = await request.json();
  try {
    const signup = createSignup({
      name: body.name || "",
      email: body.email,
      utm_source: body.utm_source || "direct",
      utm_medium: body.utm_medium || "none",
      utm_campaign: body.utm_campaign || "",
      utm_content: body.utm_content || "",
    });
    return NextResponse.json({ signup }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
```

- [ ] **Step 5: Create `app/api/dashboard/route.js`**

```js
import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  return NextResponse.json(getDashboardStats({ from, to }));
}
```

- [ ] **Step 6: Manual verification**

Run: `npm run dev` (background), then:

```bash
curl -s http://localhost:3000/api/channels | head -c 300
curl -s -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"channelIds":[1],"contentCode":"reel01","memo":"test"}'
curl -s "http://localhost:3000/api/links"
curl -s -X POST http://localhost:3000/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","utm_source":"instagram","utm_medium":"reel","utm_content":"reel01"}'
curl -s "http://localhost:3000/api/dashboard"
```

Expected: each call returns `200`/`201` JSON (no `500`s); the dashboard response shows `totalClicks: 0` (no `/l/...` visits yet — that's Task 8) and `totalSignups: 1`. Stop the dev server after confirming. Delete `data.db*` before continuing so later manual checks start from a clean seed.

- [ ] **Step 7: Commit**

```bash
git add app/api
git commit -m "gtm-tracker: API routes for channels, links, waitlist, dashboard"
```

---

### Task 8: Short-link redirect route

**Files:**
- Create: `app/l/[code]/route.js`

**Interfaces:**
- Consumes: `getLinkByShortCode`, `recordClick` from `@/lib/db.js` (Task 5); `classifyRequest` from `@/lib/redirect.js` (Task 4).

- [ ] **Step 1: Create `app/l/[code]/route.js`**

```js
import { NextResponse } from "next/server";
import { getLinkByShortCode, recordClick } from "@/lib/db";
import { classifyRequest } from "@/lib/redirect";

export async function GET(request, { params }) {
  const link = getLinkByShortCode(params.code);
  if (!link) {
    return NextResponse.json({ error: "링크를 찾을 수 없어요" }, { status: 404 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const { isBot, deviceType } = classifyRequest(userAgent);
  if (!isBot) {
    recordClick(link.id, {
      deviceType,
      referrer: request.headers.get("referer") || null,
    });
  }

  return NextResponse.redirect(new URL(link.target_url, request.url), 302);
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev` (background), then create a link and follow it:

```bash
curl -s -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" -d '{"channelIds":[1],"contentCode":"reel01"}' | head -c 300

curl -sI "http://localhost:3000/l/ig-reel01" -A "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
# expect: HTTP/1.1 302, location: /waitlist?utm_source=instagram&utm_medium=reel&utm_campaign=julie-os-waitlist&utm_content=reel01

curl -sI "http://localhost:3000/l/ig-reel01" -A "KAKAOTALK"
# expect: same 302, but this hit must NOT be counted (verify next)

curl -s "http://localhost:3000/api/links" | grep -o '"clicks":[0-9]*'
# expect clicks:1 (only the iPhone UA counted, the KAKAOTALK bot UA did not)

curl -sI "http://localhost:3000/l/does-not-exist"
# expect: HTTP/1.1 404
```

Stop the dev server and delete `data.db*` after confirming.

- [ ] **Step 3: Commit**

```bash
git add app/l
git commit -m "gtm-tracker: short-link redirect with bot-filtered click logging"
```

---

### Task 9: QR code route

**Files:**
- Create: `app/api/qr/route.js`

**Interfaces:**
- Consumes: `qrcode` npm package.

- [ ] **Step 1: Create `app/api/qr/route.js`**

```js
import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get("text");
  if (!text) {
    return NextResponse.json({ error: "text 파라미터가 필요해요" }, { status: 400 });
  }
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 240 });
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml" } });
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev` (background), then:

```bash
curl -s "http://localhost:3000/api/qr?text=http://localhost:3000/l/ig-reel01" | head -c 100
```

Expected: output starts with `<svg`. Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add app/api/qr
git commit -m "gtm-tracker: QR code generation route"
```

---

### Task 10: Admin page — link builder + ledger

**Files:**
- Create: `app/admin/page.js`

**Interfaces:**
- Consumes: `GET/POST /api/channels`, `GET/POST /api/links`, `POST /api/links/[id]/archive`, `GET /api/qr`.

- [ ] **Step 1: Create `app/admin/page.js`**

```jsx
"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [channels, setChannels] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState([]);
  const [contentCode, setContentCode] = useState("");
  const [memo, setMemo] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [justCreated, setJustCreated] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({ channelId: "", search: "", includeArchived: false });
  const [status, setStatus] = useState("");

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels));
  }, []);

  useEffect(() => {
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerFilter]);

  function loadLinks() {
    const params = new URLSearchParams();
    if (ledgerFilter.channelId) params.set("channelId", ledgerFilter.channelId);
    if (ledgerFilter.search) params.set("search", ledgerFilter.search);
    if (ledgerFilter.includeArchived) params.set("includeArchived", "true");
    fetch(`/api/links?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setLinks(d.links));
  }

  function toggleChannel(id) {
    setSelectedChannelIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!selectedChannelIds.length) {
      setStatus("채널을 하나 이상 선택해주세요");
      return;
    }
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelIds: selectedChannelIds, contentCode, memo, createdBy }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error || "만들기에 실패했어요");
      return;
    }
    setJustCreated(data.links);
    const firstShortUrl = `${window.location.origin}${data.links[0].shortUrl}`;
    try {
      await navigator.clipboard.writeText(firstShortUrl);
      setStatus("짧은 링크를 복사했어요.");
    } catch {
      setStatus("링크를 만들었어요. (이 환경에서는 자동 복사가 지원되지 않아요)");
    }
    setContentCode("");
    setMemo("");
    loadLinks();
  }

  async function toggleArchive(id) {
    await fetch(`/api/links/${id}/archive`, { method: "POST" });
    loadLinks();
  }

  return (
    <div>
      <p className="section-title">FIRST 100 · ATTRIBUTION</p>
      <h1>UTM 링크 만들기</h1>
      <p>채널을 고르고 만들기를 누르면 끝입니다. 소재 코드는 비워두면 자동으로 제안됩니다.</p>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
        <div>
          <p className="section-title">1 · 어디에 걸 링크인가요</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {channels.map((c) => {
              const selected = selectedChannelIds.includes(c.id);
              return (
                <label
                  key={c.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    display: "block",
                    background: selected ? "var(--brand-black)" : "white",
                    color: selected ? "white" : "inherit",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleChannel(c.id)}
                    style={{ width: "auto", marginRight: 8 }}
                  />
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    {c.source} / {c.medium}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{c.note}</div>
                </label>
              );
            })}
          </div>

          <p className="section-title">2 · 소재</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label>소재 코드</label>
              <input value={contentCode} onChange={(e) => setContentCode(e.target.value)} placeholder="비우면 자동 번호" />
            </div>
            <div>
              <label>메모</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="비우면 자동" />
            </div>
          </div>
          <div style={{ marginTop: 12 }}>
            <label>만든 사람</label>
            <input value={createdBy} onChange={(e) => setCreatedBy(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="section-title">3 · 만들기</p>
          <div className="tile">
            <button onClick={handleCreate}>만들기</button>
            <p style={{ marginTop: 12, fontSize: 13, color: "var(--muted)" }}>{status}</p>
          </div>

          {justCreated.length > 0 && (
            <div className="tile" style={{ marginTop: 16 }}>
              <p className="section-title">방금 만든 링크</p>
              {justCreated.map((link) => (
                <div key={link.id} style={{ marginBottom: 12 }}>
                  <strong>{link.content_code || link.short_code}</strong>
                  <div>
                    {window.location.origin}
                    {link.shortUrl}
                  </div>
                  <a
                    href={`/api/qr?text=${encodeURIComponent(window.location.origin + link.shortUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    QR 보기
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="section-title">장부</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <select
          value={ledgerFilter.channelId}
          onChange={(e) => setLedgerFilter((f) => ({ ...f, channelId: e.target.value }))}
          style={{ width: 180 }}
        >
          <option value="">모든 채널</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          placeholder="메모·코드 검색"
          value={ledgerFilter.search}
          onChange={(e) => setLedgerFilter((f) => ({ ...f, search: e.target.value }))}
        />
        <label style={{ whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            style={{ width: "auto" }}
            checked={ledgerFilter.includeArchived}
            onChange={(e) => setLedgerFilter((f) => ({ ...f, includeArchived: e.target.checked }))}
          />
          보관한 링크도 보기
        </label>
      </div>

      <table>
        <thead>
          <tr>
            <th>채널</th>
            <th>소재</th>
            <th>메모</th>
            <th>짧은 링크</th>
            <th>클릭</th>
            <th>신청</th>
            <th>전환</th>
            <th>만든 날</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id} style={{ opacity: link.archived ? 0.5 : 1 }}>
              <td>{link.channel_name}</td>
              <td>{link.content_code || "-"}</td>
              <td>{link.memo}</td>
              <td>{link.shortUrl}</td>
              <td>{link.clicks}</td>
              <td>{link.signups}</td>
              <td>{link.clicks > 0 ? `${Math.round(link.conversionRate * 100)}%` : "-"}</td>
              <td>{link.created_at.slice(5, 10)}</td>
              <td>
                <button className="secondary" onClick={() => toggleArchive(link.id)}>
                  {link.archived ? "복원" : "보관"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/admin` in a browser:
1. Confirm the 5 seed channels render as checkboxes.
2. Select "인스타 릴스", leave content code empty, click 만들기 → confirm a link appears under "방금 만든 링크" with short code `ig-reel01`, and the ledger table below shows the same row.
3. Click "보관" on that row → confirm it disappears from the default ledger view; check "보관한 링크도 보기" → confirm it reappears greyed out.

Stop the dev server and delete `data.db*` after confirming.

- [ ] **Step 3: Commit**

```bash
git add app/admin
git commit -m "gtm-tracker: admin link builder and ledger UI"
```

---

### Task 11: Waitlist signup page

**Files:**
- Create: `app/waitlist/page.js`
- Create: `app/waitlist/WaitlistForm.js`

**Interfaces:**
- Consumes: `POST /api/waitlist`.

- [ ] **Step 1: Create `app/waitlist/WaitlistForm.js`**

```jsx
"use client";

import { useState } from "react";

export default function WaitlistForm({ utm }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        utm_source: utm.source,
        utm_medium: utm.medium,
        utm_campaign: utm.campaign,
        utm_content: utm.content,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "신청에 실패했어요");
      setStatus("idle");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return <p className="tile">신청 완료! 곧 소식을 전해드릴게요.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="tile" style={{ maxWidth: 420 }}>
      <div style={{ marginBottom: 12 }}>
        <label>이름</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>이메일 *</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p style={{ color: "crimson", fontSize: 13 }}>{error}</p>}
      <button type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "신청 중..." : "신청하기"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Create `app/waitlist/page.js`**

```jsx
import WaitlistForm from "./WaitlistForm";

export default function WaitlistPage({ searchParams }) {
  const utm = {
    source: searchParams.utm_source || "direct",
    medium: searchParams.utm_medium || "none",
    campaign: searchParams.utm_campaign || "",
    content: searchParams.utm_content || "",
  };

  return (
    <div>
      <p className="section-title">JULIE OS · WAITLIST</p>
      <h1>Julie OS 웨이트리스트</h1>
      <p>관계를 준비하는 운영체제, Julie OS의 다음 소식을 가장 먼저 받아보세요.</p>
      <WaitlistForm utm={utm} />
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, then in a browser visit:
`http://localhost:3000/waitlist?utm_source=instagram&utm_medium=reel&utm_campaign=julie-os-waitlist&utm_content=reel01`

1. Fill in email, submit → confirm "신청 완료!" replaces the form.
2. Run `curl -s http://localhost:3000/api/dashboard | grep -o '"totalSignups":[0-9]*'` → expect `"totalSignups":1`.

Stop the dev server and delete `data.db*` after confirming.

- [ ] **Step 4: Commit**

```bash
git add app/waitlist
git commit -m "gtm-tracker: waitlist signup page with UTM capture"
```

---

### Task 12: Dashboard page

**Files:**
- Create: `app/dashboard/BarChart.js`
- Create: `app/dashboard/page.js`

**Interfaces:**
- Consumes: `GET /api/dashboard?from=&to=`.

- [ ] **Step 1: Create `app/dashboard/BarChart.js`**

```jsx
"use client";

export default function BarChart({ series }) {
  if (!series || series.length === 0) {
    return <p style={{ color: "var(--muted)" }}>표시할 데이터가 없어요.</p>;
  }

  const max = Math.max(1, ...series.map((d) => Math.max(d.clicks, d.signups)));
  const barWidth = 18;
  const gap = 24;
  const height = 160;
  const width = series.length * gap + 40;

  return (
    <svg width={width} height={height + 24} role="img" aria-label="일별 클릭/신청 추이">
      {series.map((d, i) => {
        const x = 20 + i * gap;
        const clickH = (d.clicks / max) * height;
        const signupH = (d.signups / max) * height;
        return (
          <g key={d.day}>
            <rect x={x} y={height - clickH} width={barWidth / 2} height={clickH} fill="#111111" />
            <rect x={x + barWidth / 2} y={height - signupH} width={barWidth / 2} height={signupH} fill="#f5c518" />
            <text x={x} y={height + 16} fontSize="9" fill="#6b6b6b">
              {d.day.slice(5)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Create `app/dashboard/page.js`**

```jsx
"use client";

import { useEffect, useState } from "react";
import BarChart from "./BarChart";

const RANGES = [
  { key: "today", label: "오늘" },
  { key: "7d", label: "7일" },
  { key: "30d", label: "30일" },
  { key: "all", label: "전체" },
];

function rangeToDates(key) {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  if (key === "all") return { from: "", to: "" };
  const days = key === "today" ? 0 : key === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { from: from.toISOString().slice(0, 10), to: toStr };
}

export default function DashboardPage() {
  const [rangeKey, setRangeKey] = useState("30d");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const { from, to } = rangeToDates(rangeKey);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/dashboard?${params.toString()}`)
      .then((r) => r.json())
      .then(setStats);
  }, [rangeKey]);

  return (
    <div>
      <p className="section-title">FIRST 100 · PERFORMANCE</p>
      <h1>채널별 성과</h1>
      <p>짧은 링크를 거친 클릭과, 같은 UTM으로 들어온 신청을 채널·소재·날짜별로 봅니다.</p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        {RANGES.map((r) => (
          <button key={r.key} className={rangeKey === r.key ? "" : "secondary"} onClick={() => setRangeKey(r.key)}>
            {r.label}
          </button>
        ))}
      </div>

      {!stats ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <div className="tiles">
            <div className="tile">
              <div>클릭</div>
              <div className="value">{stats.totalClicks}</div>
            </div>
            <div className="tile">
              <div>신청</div>
              <div className="value">{stats.totalSignups}</div>
            </div>
            <div className="tile">
              <div>전환율</div>
              <div className="value">{Math.round(stats.conversionRate * 100)}%</div>
            </div>
            <div className="tile">
              <div>활성 링크</div>
              <div className="value">{stats.activeLinks}</div>
            </div>
          </div>

          <p className="section-title">일별 추이</p>
          <BarChart series={stats.dailySeries} />

          <p className="section-title">채널별</p>
          <table>
            <thead>
              <tr>
                <th>채널</th>
                <th>링크</th>
                <th>클릭</th>
                <th>신청</th>
                <th>전환율</th>
              </tr>
            </thead>
            <tbody>
              {stats.channelBreakdown.map((c) => (
                <tr key={c.channelId}>
                  <td>{c.name}</td>
                  <td>{c.linkCount}</td>
                  <td>{c.clicks}</td>
                  <td>{c.signups}</td>
                  <td>{c.clicks > 0 ? `${Math.round(c.conversionRate * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="section-title">소재 상위 10 · 전환율 기준</p>
          <table>
            <thead>
              <tr>
                <th>채널</th>
                <th>소재</th>
                <th>짧은 링크</th>
                <th>클릭</th>
                <th>신청</th>
                <th>전환율</th>
              </tr>
            </thead>
            <tbody>
              {stats.topContent.map((t) => (
                <tr key={t.linkId}>
                  <td>{t.channelName}</td>
                  <td>{t.contentCode || "-"}</td>
                  <td>/l/{t.shortCode}</td>
                  <td>{t.clicks}</td>
                  <td>{t.signups}</td>
                  <td>{t.clicks > 0 ? `${Math.round(t.conversionRate * 100)}%` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npm run dev`, open `http://localhost:3000/dashboard`:
1. Confirm the 4 summary tiles render (all zero on a fresh `data.db`).
2. In `/admin`, create a link, then `curl` its `/l/...` short URL with a non-bot UA, then submit `/waitlist` with matching UTM params.
3. Reload `/dashboard`, click each range button (오늘/7일/30일/전체) → confirm tiles, bar chart, and both tables update without console errors.

Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/dashboard
git commit -m "gtm-tracker: dashboard with range filter, trend chart, breakdowns"
```

---

### Task 13: README + end-to-end verification + submission commit

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```md
# GTM Tracker

Julie OS 웨이트리스트 홍보용 UTM 링크 빌더 + 단축 링크 + 클릭/신청 대시보드.
로컬 전용 — 계정도, 배포도 필요 없습니다.

## 실행

\`\`\`
npm install
npm run dev
\`\`\`

- 링크 만들기: http://localhost:3000/admin
- 대시보드: http://localhost:3000/dashboard
- 신청 폼(단축 링크가 데려가는 곳): http://localhost:3000/waitlist

## 어떻게 동작하나요

1. `/admin`에서 채널을 고르고 "만들기"를 누르면 `/l/{code}` 단축 링크가 생겨요.
2. 그 링크를 클릭하면(미리보기 봇 제외) 클릭이 기록되고, UTM 파라미터가 붙은 채로 `/waitlist`로 넘어가요.
3. `/waitlist`에서 신청하면 그 UTM 값 그대로 신청 기록에 저장돼요.
4. `/dashboard`에서 기간별 클릭·신청·전환율을 채널·소재별로 봅니다.

설계 배경은 `DESIGN.md`, 구현 계획은 `PLAN.md`를 참고하세요.

## 테스트

\`\`\`
npm test
\`\`\`

`lib/` 아래 순수 로직(단축코드 생성, 봇 필터링, 대시보드 집계)에 대한 단위 테스트입니다.
```

- [ ] **Step 2: Full end-to-end manual verification**

Delete any leftover `data.db*`, then:

```bash
npm test
npm run dev
```

In a browser:
1. `/admin` → create 2–3 links across different channels (some with auto content codes, one with a custom one).
2. Open one short link (`/l/...`) directly in the browser (real browser UA, not curl) → confirm it lands on `/waitlist` with the UTM query string visible.
3. Submit the waitlist form.
4. Go back to `/admin` → confirm the ledger row for that link shows `clicks: 1`, `signups: 1`, `전환: 100%`.
5. Go to `/dashboard` → confirm the same numbers show up in the summary tiles, channel table, and top-content table for the "30일"/"전체" ranges.
6. Archive one link from `/admin`, confirm it drops out of the default ledger and `활성 링크` count on `/dashboard` decreases by 1.

Stop the dev server when done. Leave `data.db` in place or delete it — either is fine, it's gitignored.

- [ ] **Step 3: Final commit and push (per project convention)**

```bash
git add "1_mission/5조/필리줄리(안지현)/6주차 과제 제출 폴더/gtm-tracker"
git status --short
git commit -m "필리줄리(안지현) 6주차: GTM UTM 트래커 구현 (링크 빌더/단축링크/신청폼/대시보드)"
git fetch origin main
git push origin main
```

If `git fetch` shows new commits on `origin/main` ahead of local `main`, run `git pull origin main` first (this repo's history is shared across many contributors — see project memory on spongeclub-2/OneDrive git issues) and resolve any conflicts only within `1_mission/5조/필리줄리(안지현)/` before pushing.

- [ ] **Step 4: Fill in `submission.md`**

Update `1_mission/5조/필리줄리(안지현)/6주차 과제 제출 폴더/submission.md`'s frontmatter (`title`, `summary`, `date`) and its 결과물/삽질 과정/인사이트 sections to describe the GTM tracker, then commit and push that file the same way as Step 3.

---

## Self-Review Notes

- **Spec coverage:** DESIGN.md's four pages (`/admin`, `/l/[code]`, `/waitlist`, `/dashboard`), four tables, bot-filtered click logging, and UTM-matching attribution are each covered by Tasks 2–12. The Tailwind→plain-CSS deviation was corrected in DESIGN.md itself (Task 1 uses plain CSS, matching the updated spec).
- **Placeholder scan:** no TBD/TODO; every step has runnable code or an exact command with expected output.
- **Type consistency:** `listLinks()` row shape (`clicks`, `signups`, `conversionRate`, `shortUrl`, `channel_name`, `channel_source`, `channel_medium`) is used identically in Task 5's tests, Task 6's `topContent` mapping, Task 7's API route, and Task 10's admin table. `getDashboardStats()`'s return shape is defined once in Task 6 and consumed as-is in Task 12.
- **Scope check:** single subsystem (one Next.js app), no further decomposition needed.
