# GBP 자동 리포트 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 작업자가 수동으로 만들던 주간/월간 GBP 퍼포먼스 리포트를 자동화. DataForSEO 스캔 → 히트맵 이미지 → PPT 생성 → 아카이빙 → 텔레그램 알림.

**Architecture:** gbp-local(TypeScript)의 기존 DataForSEO + PPT 엔진을 활용. Notion에서 클라이언트별 키워드 설정을 읽고, 오케스트레이터(Python)가 스케줄에 따라 subprocess로 gbp-local CLI를 호출.

**Tech Stack:** TypeScript(tsx), PptxGenJS, Playwright(히트맵 캡처), DataForSEO API, Notion API, Python(오케스트레이터)

**설계 문서:** `docs/superpowers/specs/2026-03-31-gbp-auto-report-design.md`

---

## Phase 1: 파일 구조 리팩토링

### Task 1: src/ 하위 디렉토리 생성 및 파일 이동

기존 플랫 구조를 도메인별 폴더로 정리. 기존 import 경로 전부 업데이트.

**Files:**
- Move: `src/dataforseo.ts` → `src/scan/dataforseo.ts`
- Move: `src/scan-batch.ts` → `src/scan/batch.ts`
- Move: `src/scan-celine.ts` → 삭제 (하드코딩 테스트 파일, batch.ts로 대체)
- Move: `src/test-dfs.ts` → 삭제 (일회성 테스트)
- Move: `src/gen-heatmap.ts` → `src/scan/gen-heatmap.ts`
- Move: `src/heatmap-html.ts` → `src/scan/heatmap-html.ts`
- Move: `src/reports/` → `src/report/` (단수형 통일)
- Move: `src/gbp-client.ts` → `src/gbp/client.ts`
- Move: `src/gbp-write.ts` → `src/gbp/write.ts`
- Move: `src/sync-reviews.ts` → `src/gbp/reviews.ts`
- Move: `src/store.ts` → `src/shared/store.ts`
- Move: `src/env.ts` → `src/shared/env.ts`
- Move: `src/telegram.ts` → `src/shared/telegram.ts`
- Move: `src/token.ts` → `src/shared/token.ts`
- Move: `src/language.ts` → `src/shared/language.ts`
- Move: `src/sentiment.ts` → `src/shared/sentiment.ts`
- Move: `src/formatter.ts` → `src/shared/formatter.ts`
- Move: `src/competitors.ts` → `src/gbp/competitors.ts`
- Move: `src/local-falcon.ts` → `src/scan/local-falcon.ts`
- Move: `src/server.ts` → `src/server.ts` (그대로)
- Move: `src/cron.ts` → `src/cron.ts` (그대로)

최종 구조:
```
src/
├── cli.ts
├── cron.ts
├── server.ts
├── config/          ← Phase 2에서 생성
├── scan/
│   ├── dataforseo.ts
│   ├── batch.ts
│   ├── heatmap-html.ts
│   ├── gen-heatmap.ts
│   └── local-falcon.ts
├── report/
│   ├── template-engine.ts
│   ├── pptx-renderer.ts
│   ├── local-aggregator.ts
│   ├── types.ts
│   ├── slides/          (14개 빌더 그대로)
│   └── templates/       (audit.json, weekly.json, monthly.json)
├── gbp/
│   ├── client.ts
│   ├── write.ts
│   ├── reviews.ts
│   └── competitors.ts
└── shared/
    ├── store.ts
    ├── env.ts
    ├── telegram.ts
    ├── token.ts
    ├── language.ts
    ├── sentiment.ts
    └── formatter.ts
```

- [ ] **Step 1:** 디렉토리 생성
```bash
cd gbp-local
mkdir -p src/scan src/gbp src/shared src/config
```

- [ ] **Step 2:** 파일 이동 (git mv 사용)
```bash
# scan/
git mv src/dataforseo.ts src/scan/dataforseo.ts
git mv src/scan-batch.ts src/scan/batch.ts
git mv src/heatmap-html.ts src/scan/heatmap-html.ts
git mv src/gen-heatmap.ts src/scan/gen-heatmap.ts
git mv src/local-falcon.ts src/scan/local-falcon.ts

# gbp/
git mv src/gbp-client.ts src/gbp/client.ts
git mv src/gbp-write.ts src/gbp/write.ts
git mv src/sync-reviews.ts src/gbp/reviews.ts
git mv src/competitors.ts src/gbp/competitors.ts

# shared/
git mv src/store.ts src/shared/store.ts
git mv src/env.ts src/shared/env.ts
git mv src/telegram.ts src/shared/telegram.ts
git mv src/token.ts src/shared/token.ts
git mv src/language.ts src/shared/language.ts
git mv src/sentiment.ts src/shared/sentiment.ts
git mv src/formatter.ts src/shared/formatter.ts

# reports → report (단수형)
git mv src/reports src/report
```

- [ ] **Step 3:** 삭제
```bash
git rm src/scan-celine.ts src/test-dfs.ts
```

- [ ] **Step 4:** 모든 import 경로 업데이트
모든 `.ts` 파일의 상대 import를 새 경로에 맞게 수정.
예: `cli.ts`에서 `"./dataforseo.js"` → `"./scan/dataforseo.js"`

- [ ] **Step 5:** 빌드 검증
```bash
npx tsx src/cli.ts client list
```
Expected: 클라이언트 목록 정상 출력

- [ ] **Step 6:** 커밋
```bash
git add -A && git commit -m "refactor: gbp-local 파일 구조 도메인별 정리"
```

---

## Phase 2: clients.json 확장 + Notion 동기화

### Task 2: clients.json 스키마 확장

**Files:**
- Modify: `gbp-local/src/shared/store.ts` (ClientConfig 타입이 여기 또는 cli.ts에 있음)
- Modify: `gbp-local/src/cli.ts` (ClientConfig 인터페이스)
- Modify: `gbp-local/data/clients.json`

- [ ] **Step 1:** ClientConfig 인터페이스 확장

`cli.ts` 상단의 ClientConfig를 별도 파일로 분리:

```typescript
// src/shared/types.ts (신규)
export interface ClientConfig {
  id: string;
  name: string;
  gbpAccountId: string;
  gbpLocationId: string;
  // 신규 필드
  bizName?: string;           // DataForSEO 비즈니스명 매칭
  lat?: number;
  lng?: number;
  keywords?: string[];
  gridSize?: number;          // default 5
  gridSpacing?: number;       // default 1.5 km
  schedule?: "weekly" | "monthly" | "both";
  notionPageId?: string;
  active?: boolean;           // default true
  address?: string;
  targetCountries?: string[];
}
```

- [ ] **Step 2:** `cli.ts`에서 ClientConfig import 변경
- [ ] **Step 3:** 빌드 검증
```bash
npx tsx src/cli.ts client list
```
- [ ] **Step 4:** 커밋
```bash
git commit -m "feat: ClientConfig에 키워드/좌표/스케줄 필드 추가"
```

### Task 3: Notion → clients.json 동기화

**Files:**
- Create: `gbp-local/src/config/notion-sync.ts`
- Modify: `gbp-local/src/cli.ts` (sync-config 명령 추가)
- Modify: `gbp-local/src/shared/env.ts` (NOTION_API_KEY, NOTION_PROJECT_DB_ID 추가)

- [ ] **Step 1:** env.ts에 Notion 환경변수 추가

```typescript
get NOTION_API_KEY() { return optional("NOTION_API_KEY"); },
get NOTION_PROJECT_DB_ID() { return optional("NOTION_PROJECT_DB_ID"); },
```

- [ ] **Step 2:** notion-sync.ts 구현

```typescript
// src/config/notion-sync.ts
import { env } from "../shared/env.js";
import { loadOrDefault, save } from "../shared/store.js";
import type { ClientConfig } from "../shared/types.js";

const NOTION_BASE = "https://api.notion.com/v1";

interface NotionPage {
  id: string;
  properties: Record<string, any>;
}

export async function syncConfigFromNotion(): Promise<{
  updated: number;
  added: number;
  total: number;
}> {
  const apiKey = env.NOTION_API_KEY;
  const dbId = env.NOTION_PROJECT_DB_ID;
  if (!apiKey || !dbId) {
    throw new Error("NOTION_API_KEY, NOTION_PROJECT_DB_ID 환경변수 필요");
  }

  // Notion에서 GBP Client ID가 있는 프로젝트만 가져오기
  const pages = await queryNotionDb(apiKey, dbId);
  const clients = loadOrDefault<ClientConfig[]>("clients", []);

  let updated = 0;
  let added = 0;

  for (const page of pages) {
    const gbpClientId = getTextProp(page, "GBP Client ID");
    if (!gbpClientId) continue;

    const keywords = getTextProp(page, "타겟 키워드");
    const latLng = getTextProp(page, "위도/경도");
    const schedule = getSelectProp(page, "스캔 주기");

    const [lat, lng] = latLng
      ? latLng.split(",").map((s: string) => parseFloat(s.trim()))
      : [undefined, undefined];

    const existing = clients.find((c) => c.id === gbpClientId);
    if (existing) {
      existing.keywords = keywords ? keywords.split(",").map((s: string) => s.trim()) : existing.keywords;
      existing.lat = lat ?? existing.lat;
      existing.lng = lng ?? existing.lng;
      existing.schedule = (schedule as ClientConfig["schedule"]) ?? existing.schedule;
      existing.notionPageId = page.id;
      existing.active = true;
      updated++;
    } else {
      // Notion에는 있지만 clients.json에 없는 경우 → 새로 추가
      const name = getTitleProp(page);
      clients.push({
        id: gbpClientId,
        name: name || gbpClientId,
        gbpAccountId: "",
        gbpLocationId: "",
        keywords: keywords ? keywords.split(",").map((s: string) => s.trim()) : [],
        lat,
        lng,
        schedule: (schedule as ClientConfig["schedule"]) ?? "weekly",
        notionPageId: page.id,
        active: true,
      });
      added++;
    }
  }

  save("clients", clients);
  return { updated, added, total: clients.length };
}

// --- Notion API 헬퍼 ---

async function queryNotionDb(apiKey: string, dbId: string): Promise<NotionPage[]> {
  const resp = await fetch(`${NOTION_BASE}/databases/${dbId}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ page_size: 100 }),
  });
  const data = await resp.json();
  return data.results ?? [];
}

function getTextProp(page: NotionPage, name: string): string | undefined {
  const prop = page.properties[name];
  if (!prop) return undefined;
  if (prop.type === "rich_text") {
    return prop.rich_text?.map((t: any) => t.plain_text).join("") || undefined;
  }
  return undefined;
}

function getSelectProp(page: NotionPage, name: string): string | undefined {
  const prop = page.properties[name];
  return prop?.select?.name;
}

function getTitleProp(page: NotionPage): string {
  const prop = page.properties["이름"];
  return prop?.title?.map((t: any) => t.plain_text).join("") || "";
}
```

- [ ] **Step 3:** cli.ts에 `sync-config` 명령 추가

```typescript
case "sync-config": {
  const { syncConfigFromNotion } = await import("./config/notion-sync.js");
  const result = await syncConfigFromNotion();
  console.log(`동기화 완료: 갱신 ${result.updated}건, 추가 ${result.added}건, 전체 ${result.total}건`);
  break;
}
```

- [ ] **Step 4:** .env에 Notion 키 추가

```bash
# gbp-local/.env에 추가
NOTION_API_KEY=[REDACTED_API_KEY]
NOTION_PROJECT_DB_ID=[REDACTED_ID]
```

- [ ] **Step 5:** 검증
```bash
npx tsx src/cli.ts sync-config
```
Expected: "동기화 완료: 갱신 N건, 추가 N건, 전체 N건"

- [ ] **Step 6:** 커밋
```bash
git commit -m "feat: Notion → clients.json 동기화 (sync-config 명령)"
```

---

## Phase 3: 일괄 스캔 리팩토링

### Task 4: scan-all 명령 — clients.json 기반 일괄 스캔

**Files:**
- Rewrite: `gbp-local/src/scan/batch.ts` (하드코딩 제거, clients.json 기반)
- Modify: `gbp-local/src/cli.ts` (scan-all 명령 추가)

- [ ] **Step 1:** batch.ts 리팩토링

```typescript
// src/scan/batch.ts
import { scanGrid, checkBalance } from "./dataforseo.js";
import { loadOrDefault, save } from "../shared/store.js";
import type { ClientConfig } from "../shared/types.js";

export async function scanAll(filter?: "weekly" | "monthly"): Promise<{
  scanned: number;
  failed: string[];
}> {
  const clients = loadOrDefault<ClientConfig[]>("clients", []);
  const active = clients.filter((c) => {
    if (!c.active || !c.keywords?.length || !c.lat || !c.lng) return false;
    if (!filter) return true;
    return c.schedule === filter || c.schedule === "both";
  });

  await checkBalance();
  console.log(`\n${active.length}개 클라이언트 스캔 시작\n`);

  const failed: string[] = [];
  for (const client of active) {
    console.log(`\n=== ${client.name} ===`);
    const existing = loadOrDefault<any[]>(`rankings-${client.id}`, []);

    for (const kw of client.keywords!) {
      try {
        const result = await scanGrid(
          kw,
          client.bizName || client.name,
          client.lat!,
          client.lng!,
          client.gridSize ?? 5,
          client.gridSpacing ?? 1.5
        );
        existing.push({ clientId: client.id, ...result });
        console.log(`  ✅ ${kw}: ARP ${result.arp} | SoLV ${result.solv}%`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ ${kw}: ${msg}`);
        failed.push(`${client.name}/${kw}`);
      }
    }
    save(`rankings-${client.id}`, existing);
  }

  await checkBalance();
  return { scanned: active.length, failed };
}

export async function scanClient(clientId: string): Promise<void> {
  const clients = loadOrDefault<ClientConfig[]>("clients", []);
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error(`클라이언트 ${clientId} 없음`);
  if (!client.keywords?.length || !client.lat || !client.lng) {
    throw new Error(`${client.name}: 키워드 또는 좌표 미설정`);
  }

  const existing = loadOrDefault<any[]>(`rankings-${client.id}`, []);
  for (const kw of client.keywords) {
    const result = await scanGrid(
      kw,
      client.bizName || client.name,
      client.lat,
      client.lng,
      client.gridSize ?? 5,
      client.gridSpacing ?? 1.5
    );
    existing.push({ clientId: client.id, ...result });
    console.log(`✅ ${kw}: ARP ${result.arp} | SoLV ${result.solv}%`);
  }
  save(`rankings-${client.id}`, existing);
}
```

- [ ] **Step 2:** cli.ts에 명령 추가

```typescript
case "scan": {
  const clientId = args[1];
  if (!clientId) { console.error("사용법: gbp scan <clientId>"); break; }
  const { scanClient } = await import("./scan/batch.js");
  await scanClient(clientId);
  break;
}
case "scan-all": {
  const filter = args.includes("--weekly") ? "weekly"
    : args.includes("--monthly") ? "monthly"
    : undefined;
  const { scanAll } = await import("./scan/batch.js");
  const result = await scanAll(filter);
  console.log(`\n완료: ${result.scanned}개 스캔, 실패 ${result.failed.length}건`);
  if (result.failed.length) console.log("실패:", result.failed.join(", "));
  break;
}
```

- [ ] **Step 3:** 검증 (1개 클라이언트로 테스트)
```bash
npx tsx src/cli.ts scan clinic-f
```
Expected: 키워드별 ARP/SoLV 출력

- [ ] **Step 4:** 커밋
```bash
git commit -m "feat: scan-all 명령 — clients.json 기반 일괄 스캔"
```

---

## Phase 4: 히트맵 이미지 자동 생성

### Task 5: Playwright로 히트맵 HTML → PNG 캡처

**Files:**
- Create: `gbp-local/src/report/heatmap-image.ts`
- Modify: `gbp-local/package.json` (playwright 의존성 추가)

- [ ] **Step 1:** Playwright 설치
```bash
cd gbp-local
npm install playwright
npx playwright install chromium
```

- [ ] **Step 2:** heatmap-image.ts 구현

```typescript
// src/report/heatmap-image.ts
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { generateHeatmapHtml } from "../scan/heatmap-html.js";

const TEMP_DIR = join(process.cwd(), "output", ".tmp");

export interface HeatmapCapture {
  keyword: string;
  imagePath: string;
  width: number;
  height: number;
}

/**
 * ScanResult 하나를 PNG 이미지로 캡처.
 * 반환: 저장된 이미지 경로.
 */
export async function captureHeatmapImage(
  scan: { keyword: string; gridData: number[][]; gridPoints: any[]; centerLat: number; centerLng: number; radiusKm: number; arp: number; atrp: number; solv: number; businessName: string },
  outputDir: string,
  filenamePrefix: string
): Promise<HeatmapCapture> {
  mkdirSync(TEMP_DIR, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  // HTML 생성
  const html = generateHeatmapHtml(scan as any, scan.businessName);
  const htmlPath = join(TEMP_DIR, `${filenamePrefix}.html`);
  writeFileSync(htmlPath, html, "utf-8");

  // Playwright 캡처
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(2000); // Leaflet 타일 로딩 대기

  const imagePath = join(outputDir, `${filenamePrefix}.png`);
  await page.screenshot({ path: imagePath, fullPage: false });
  await browser.close();

  return { keyword: scan.keyword, imagePath, width: 800, height: 600 };
}

/**
 * 클라이언트의 전주/이번주 히트맵 이미지를 전부 캡처.
 */
export async function captureAllHeatmaps(
  currentScans: any[],
  previousScans: any[],
  clientId: string
): Promise<{ current: HeatmapCapture[]; previous: HeatmapCapture[] }> {
  const dir = join(process.cwd(), "output", ".tmp", clientId);
  const current: HeatmapCapture[] = [];
  const previous: HeatmapCapture[] = [];

  const browser = await chromium.launch({ headless: true });

  for (const scan of currentScans) {
    const cap = await captureWithBrowser(browser, scan, dir, `current-${sanitize(scan.keyword)}`);
    current.push(cap);
  }
  for (const scan of previousScans) {
    const cap = await captureWithBrowser(browser, scan, dir, `previous-${sanitize(scan.keyword)}`);
    previous.push(cap);
  }

  await browser.close();
  return { current, previous };
}

// 브라우저 재사용 버전 (성능 최적화)
async function captureWithBrowser(
  browser: any,
  scan: any,
  outputDir: string,
  filenamePrefix: string
): Promise<HeatmapCapture> {
  mkdirSync(outputDir, { recursive: true });
  const html = generateHeatmapHtml(scan, scan.businessName);
  const htmlPath = join(TEMP_DIR, `${filenamePrefix}.html`);
  writeFileSync(htmlPath, html, "utf-8");

  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.goto(`file://${htmlPath}`);
  await page.waitForTimeout(2000);

  const imagePath = join(outputDir, `${filenamePrefix}.png`);
  await page.screenshot({ path: imagePath, fullPage: false });
  await page.close();

  return { keyword: scan.keyword, imagePath, width: 800, height: 600 };
}

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9가-힣-]/g, "_").toLowerCase();
}
```

- [ ] **Step 3:** 검증 (기존 rankings 데이터로 테스트)
```bash
npx tsx -e "
import { captureHeatmapImage } from './src/report/heatmap-image.js';
import { loadOrDefault } from './src/shared/store.js';
const rankings = loadOrDefault('rankings-clinic-f', []);
if (rankings.length) {
  captureHeatmapImage(rankings[0], './output/.tmp', 'test').then(r => console.log('캡처:', r.imagePath));
}
"
```
Expected: `output/.tmp/test.png` 파일 생성

- [ ] **Step 4:** 커밋
```bash
git commit -m "feat: Playwright 히트맵 이미지 캡처 (heatmap-image.ts)"
```

---

## Phase 5: 주간/월간 퍼포먼스 리포트 PPT

### Task 6: performance.json 템플릿 + 슬라이드 빌더

작업자가 만든 리포트와 동일한 구조: 표지 → 키워드별 (히트맵 비교 + 순위 수치) → 종료.

**Files:**
- Create: `gbp-local/src/report/templates/performance.json`
- Create: `gbp-local/src/report/slides/heatmap-compare.ts`
- Create: `gbp-local/src/report/slides/rank-detail.ts`
- Modify: `gbp-local/src/report/template-engine.ts` (새 빌더 등록)
- Create: `gbp-local/src/report/weekly.ts` (주간 리포트 생성 진입점)

- [ ] **Step 1:** performance.json 템플릿

```json
{
  "name": "Performance Report",
  "type": "performance",
  "slides": [
    { "type": "cover", "enabled": true },
    { "type": "heatmap-compare", "enabled": true },
    { "type": "rank-detail", "enabled": true },
    { "type": "cover-end", "enabled": true }
  ],
  "theme": {
    "primaryColor": "1B2A4A",
    "secondaryColor": "E8792F",
    "fontFamily": "Malgun Gothic",
    "fontSize": { "title": 28, "body": 14, "small": 10 }
  }
}
```

Note: `heatmap-compare`와 `rank-detail`은 키워드 수만큼 자동 반복됨.

- [ ] **Step 2:** heatmap-compare.ts 슬라이드 빌더

키워드 하나당 전주/이번주 히트맵 이미지 나란히 배치.

```typescript
// src/report/slides/heatmap-compare.ts
import PptxGenJS from "pptxgenjs";

export function buildHeatmapCompareSlide(
  pptx: PptxGenJS,
  keyword: string,
  prevImagePath: string | null,
  currImagePath: string,
  prevDate: string,
  currDate: string,
  theme: any
): void {
  const slide = pptx.addSlide();

  // 배경
  slide.background = { color: "FFFFFF" };

  // 키워드 타이틀
  slide.addText(`Location   ${keyword}`, {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: theme.fontSize.title,
    fontFace: theme.fontFamily,
    color: theme.primaryColor,
    bold: true,
  });

  // 전주 히트맵 (왼쪽)
  if (prevImagePath) {
    slide.addText(`(${prevDate})`, {
      x: 0.5, y: 1.0, w: 4, h: 0.4,
      fontSize: 12, fontFace: theme.fontFamily,
      color: "666666",
      shape: pptx.ShapeType.roundRect,
      fill: { color: "F0F0F0" },
      align: "center",
    });
    slide.addImage({ path: prevImagePath, x: 0.5, y: 1.5, w: 4.2, h: 3.5 });
  }

  // 이번주 히트맵 (오른쪽)
  slide.addText(`(${currDate})`, {
    x: 5.3, y: 1.0, w: 4, h: 0.4,
    fontSize: 12, fontFace: theme.fontFamily,
    color: "666666",
    shape: pptx.ShapeType.roundRect,
    fill: { color: "F0F0F0" },
    align: "center",
  });
  slide.addImage({ path: currImagePath, x: 5.3, y: 1.5, w: 4.2, h: 3.5 });
}
```

- [ ] **Step 3:** rank-detail.ts 슬라이드 빌더

순위 수치 + 확대 히트맵.

```typescript
// src/report/slides/rank-detail.ts
import PptxGenJS from "pptxgenjs";

export function buildRankDetailSlide(
  pptx: PptxGenJS,
  keyword: string,
  currImagePath: string,
  currDate: string,
  currRank: number,
  prevRank: number | null,
  prevDate: string | null,
  theme: any
): void {
  const slide = pptx.addSlide();
  slide.background = { color: "FFFFFF" };

  // 키워드 + 현재 순위
  const rankText = `${keyword}  ${currDate} : ${currRank}위 (0.1mi)`;
  slide.addText(rankText, {
    x: 0.5, y: 0.3, w: 9, h: 0.5,
    fontSize: theme.fontSize.title - 4,
    fontFace: theme.fontFamily,
    color: theme.primaryColor,
    bold: true,
  });

  // 전주 순위 뱃지
  if (prevRank !== null && prevDate) {
    const diff = prevRank - currRank;
    const arrow = diff > 0 ? "▲" : diff < 0 ? "▼" : "─";
    const diffColor = diff > 0 ? "2E7D32" : diff < 0 ? "C62828" : "666666";

    slide.addText(`(${prevDate}) : ${prevRank}위`, {
      x: 0.5, y: 1.0, w: 3.5, h: 0.4,
      fontSize: 14, fontFace: theme.fontFamily,
      color: "666666",
      shape: pptx.ShapeType.roundRect,
      fill: { color: "F0F0F0" },
      align: "center",
    });
    slide.addText(`(${currDate}) : ${currRank}위  ${arrow}${Math.abs(diff)}`, {
      x: 0.5, y: 1.5, w: 3.5, h: 0.4,
      fontSize: 14, fontFace: theme.fontFamily,
      color: diffColor,
      shape: pptx.ShapeType.roundRect,
      fill: { color: "F0F0F0" },
      align: "center",
      bold: true,
    });
  }

  // 확대 히트맵
  slide.addImage({ path: currImagePath, x: 4.5, y: 0.9, w: 5, h: 4.2 });
}
```

- [ ] **Step 4:** template-engine.ts에 새 빌더 등록

SLIDE_BUILDER_MAP에 추가:
```typescript
"heatmap-compare": null,  // weekly.ts에서 직접 호출 (반복 슬라이드)
"rank-detail": null,      // weekly.ts에서 직접 호출 (반복 슬라이드)
```

Note: heatmap-compare와 rank-detail은 키워드 수만큼 반복해야 하므로, template-engine의 1:1 매핑 대신 weekly.ts에서 직접 PptxGenJS를 조립.

- [ ] **Step 5:** weekly.ts 구현 — 주간 리포트 생성 진입점

```typescript
// src/report/weekly.ts
import PptxGenJS from "pptxgenjs";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { loadOrDefault, save } from "../shared/store.js";
import { captureAllHeatmaps } from "./heatmap-image.js";
import { buildHeatmapCompareSlide } from "./slides/heatmap-compare.js";
import { buildRankDetailSlide } from "./slides/rank-detail.js";
import type { ClientConfig } from "../shared/types.js";

const THEME = {
  primaryColor: "1B2A4A",
  secondaryColor: "E8792F",
  fontFamily: "Malgun Gothic",
  fontSize: { title: 28, body: 14, small: 10 },
};

export interface WeeklyReportResult {
  clientId: string;
  clientName: string;
  outputPath: string;
  keywords: Array<{
    keyword: string;
    currentRank: number;
    previousRank: number | null;
    diff: number | null;
  }>;
}

export async function generateWeeklyReport(
  clientId: string
): Promise<WeeklyReportResult> {
  const clients = loadOrDefault<ClientConfig[]>("clients", []);
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error(`클라이언트 ${clientId} 없음`);

  const allRankings = loadOrDefault<any[]>(`rankings-${clientId}`, []);
  if (!allRankings.length) throw new Error(`${client.name}: 스캔 데이터 없음`);

  // 키워드별로 최근 2회 스캔 추출
  const keywordScans = groupByKeyword(allRankings, client.keywords || []);

  // 히트맵 이미지 캡처
  const currentScans = keywordScans.map((ks) => ks.current).filter(Boolean);
  const previousScans = keywordScans.map((ks) => ks.previous).filter(Boolean);
  const images = await captureAllHeatmaps(currentScans, previousScans, clientId);

  // PPT 생성
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33" x 7.5"

  // 1. 표지
  const coverSlide = pptx.addSlide();
  coverSlide.background = { color: THEME.primaryColor };
  coverSlide.addText("GOOGLE MAPS\n퍼포먼스 보고서", {
    x: 0.8, y: 1.5, w: 8, h: 2,
    fontSize: 36, fontFace: THEME.fontFamily,
    color: "FFFFFF", bold: true,
  });

  const today = new Date().toISOString().slice(0, 10);
  const prevDate = keywordScans[0]?.previous?.scanDate || "";
  coverSlide.addText(`${client.name} 주간 보고서`, {
    x: 0.8, y: 3.5, w: 8, h: 0.8,
    fontSize: 20, fontFace: THEME.fontFamily, color: "CCCCCC",
  });
  coverSlide.addText(today, {
    x: 0.8, y: 4.3, w: 8, h: 0.5,
    fontSize: 16, fontFace: THEME.fontFamily, color: "999999",
  });

  // 2. 키워드별 슬라이드 (2장씩)
  const keywordResults: WeeklyReportResult["keywords"] = [];

  for (let i = 0; i < keywordScans.length; i++) {
    const ks = keywordScans[i];
    const currImg = images.current.find((img) => img.keyword === ks.keyword);
    const prevImg = images.previous.find((img) => img.keyword === ks.keyword);

    if (!currImg) continue;

    const currRank = ks.current?.arp ?? 0;
    const prevRank = ks.previous?.arp ?? null;

    // A슬라이드: 히트맵 비교
    buildHeatmapCompareSlide(
      pptx,
      ks.keyword,
      prevImg?.imagePath ?? null,
      currImg.imagePath,
      prevDate,
      today,
      THEME
    );

    // B슬라이드: 순위 상세
    buildRankDetailSlide(
      pptx,
      ks.keyword,
      currImg.imagePath,
      today,
      currRank,
      prevRank,
      prevDate || null,
      THEME
    );

    keywordResults.push({
      keyword: ks.keyword,
      currentRank: currRank,
      previousRank: prevRank,
      diff: prevRank !== null ? prevRank - currRank : null,
    });
  }

  // 3. 종료 슬라이드
  const endSlide = pptx.addSlide();
  endSlide.background = { color: THEME.primaryColor };
  endSlide.addText("END OF THE DOCUMENT.", {
    x: 0.8, y: 3, w: 8, h: 1,
    fontSize: 28, fontFace: THEME.fontFamily,
    color: "FFFFFF", bold: true,
  });

  // 4. 저장 (아카이빙 경로)
  const outputDir = join(process.cwd(), "output", clientId, "weekly");
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, `${today}.pptx`);
  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
  writeFileSync(outputPath, buffer);

  // index.json 업데이트
  updateArchiveIndex(clientId, "weekly", today, outputPath);

  return { clientId, clientName: client.name, outputPath, keywords: keywordResults };
}

// --- 유틸 ---

function groupByKeyword(rankings: any[], keywords: string[]) {
  return keywords.map((kw) => {
    const kwScans = rankings
      .filter((r) => r.keyword === kw)
      .sort((a, b) => b.scanDate.localeCompare(a.scanDate));
    return {
      keyword: kw,
      current: kwScans[0] || null,
      previous: kwScans[1] || null,
    };
  });
}

function updateArchiveIndex(
  clientId: string,
  type: string,
  date: string,
  path: string
) {
  const index = loadOrDefault<any[]>("report-index", []);
  index.push({ clientId, type, date, path, createdAt: new Date().toISOString() });
  save("report-index", index);
}
```

- [ ] **Step 6:** cli.ts에 report 명령 추가/수정

```typescript
case "report": {
  const subCmd = args[1]; // weekly | monthly | audit
  const clientId = args[2];
  if (subCmd === "weekly" && clientId) {
    const { generateWeeklyReport } = await import("./report/weekly.js");
    const result = await generateWeeklyReport(clientId);
    console.log(`주간 리포트 생성: ${result.outputPath}`);
    console.log("키워드별 순위:");
    for (const kw of result.keywords) {
      const diff = kw.diff !== null ? (kw.diff > 0 ? `+${kw.diff}` : `${kw.diff}`) : "N/A";
      console.log(`  ${kw.keyword}: ${kw.currentRank}위 (${diff})`);
    }
    break;
  }
  // 기존 audit/weekly/monthly 처리 유지 ...
  break;
}
```

- [ ] **Step 7:** 검증 (스캔 데이터가 있는 클라이언트로 테스트)
```bash
npx tsx src/cli.ts report weekly clinic-f
```
Expected: `output/clinic-f/weekly/2026-03-31.pptx` 생성

- [ ] **Step 8:** 커밋
```bash
git commit -m "feat: 주간 퍼포먼스 PPT 자동 생성 (히트맵 캡처 포함)"
```

---

## Phase 6: 일괄 리포트 + 텔레그램 알림

### Task 7: report-all 명령

**Files:**
- Create: `gbp-local/src/report/batch-report.ts`
- Modify: `gbp-local/src/cli.ts`

- [ ] **Step 1:** batch-report.ts 구현

```typescript
// src/report/batch-report.ts
import { loadOrDefault } from "../shared/store.js";
import { sendMessage, sendDocument } from "../shared/telegram.js";
import { generateWeeklyReport, type WeeklyReportResult } from "./weekly.js";
import { readFileSync } from "fs";
import type { ClientConfig } from "../shared/types.js";

export async function reportAll(
  filter: "weekly" | "monthly",
  notify = true
): Promise<WeeklyReportResult[]> {
  const clients = loadOrDefault<ClientConfig[]>("clients", []);
  const active = clients.filter((c) => {
    if (!c.active || !c.keywords?.length) return false;
    return c.schedule === filter || c.schedule === "both";
  });

  const results: WeeklyReportResult[] = [];
  const errors: string[] = [];

  for (const client of active) {
    try {
      console.log(`\n📊 ${client.name} 리포트 생성 중...`);
      const result = await generateWeeklyReport(client.id);
      results.push(result);
      console.log(`  ✅ ${result.outputPath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ❌ ${client.name}: ${msg}`);
      errors.push(`${client.name}: ${msg}`);
    }
  }

  // 텔레그램 요약 알림
  if (notify && results.length > 0) {
    const lines = results.map((r) => {
      const kwSummary = r.keywords
        .map((kw) => {
          const diff = kw.diff !== null ? (kw.diff > 0 ? `+${kw.diff}` : `${kw.diff}`) : "-";
          return `${kw.keyword}: ${kw.currentRank}위(${diff})`;
        })
        .join(", ");
      return `<b>${r.clientName}</b>: ${kwSummary}`;
    });

    const msg = [
      `<b>[${filter === "weekly" ? "주간" : "월간"} 리포트 완료]</b>`,
      ...lines,
      errors.length ? `\n❌ 실패: ${errors.join(", ")}` : "",
      `\n📎 ${results.length}개 PPT 생성됨`,
    ].join("\n");

    await sendMessage(msg);
  }

  return results;
}
```

- [ ] **Step 2:** cli.ts에 report-all 명령 추가

```typescript
case "report-all": {
  const filter = args.includes("--monthly") ? "monthly" as const : "weekly" as const;
  const noNotify = args.includes("--no-notify");
  const { reportAll } = await import("./report/batch-report.js");
  const results = await reportAll(filter, !noNotify);
  console.log(`\n전체 완료: ${results.length}개 리포트 생성`);
  break;
}
```

- [ ] **Step 3:** 검증
```bash
npx tsx src/cli.ts report-all --weekly --no-notify
```
Expected: active 클라이언트별 PPT 생성

- [ ] **Step 4:** 커밋
```bash
git commit -m "feat: report-all 일괄 리포트 + 텔레그램 알림"
```

---

## Phase 7: 오케스트레이터 연동

### Task 8: 주간/월간 스케줄 job 추가

**Files:**
- Modify: `internal-orchestrator/src/jobs.py`
- Modify: `internal-orchestrator/orchestrator.py`

- [ ] **Step 1:** jobs.py에 리포트 job 추가

```python
# src/jobs.py 하단에 추가

GBP_LOCAL_DIR = Path(__file__).parent.parent.parent / "gbp-local"

def weekly_scan_and_report(bot: "TelegramBot", log_dir: Path) -> None:
    """매주 월요일: 전체 클라이언트 스캔 → 주간 리포트 생성."""
    import subprocess

    log_file = log_dir / f"weekly-report-{datetime.now():%Y%m%d}.log"

    try:
        # 1. 스캔
        result = subprocess.run(
            ["npx", "tsx", "src/cli.ts", "scan-all", "--weekly"],
            cwd=str(GBP_LOCAL_DIR),
            capture_output=True, text=True, timeout=600,
        )
        log_file.write_text(f"=== SCAN ===\n{result.stdout}\n{result.stderr}\n")

        if result.returncode != 0:
            bot.send(f"[주간 스캔 실패]\n{result.stderr[:500]}")
            return

        # 2. 리포트
        result = subprocess.run(
            ["npx", "tsx", "src/cli.ts", "report-all", "--weekly"],
            cwd=str(GBP_LOCAL_DIR),
            capture_output=True, text=True, timeout=600,
        )
        log_file.write_text(
            log_file.read_text() + f"\n=== REPORT ===\n{result.stdout}\n{result.stderr}\n"
        )

        if result.returncode != 0:
            bot.send(f"[주간 리포트 실패]\n{result.stderr[:500]}")

    except subprocess.TimeoutExpired:
        bot.send("[주간 리포트] 타임아웃 (10분 초과)")
    except Exception as e:
        bot.send(f"[주간 리포트 오류] {e}")


def monthly_scan_and_report(bot: "TelegramBot", log_dir: Path) -> None:
    """매월 1일: 전체 클라이언트 월간 리포트."""
    import subprocess

    log_file = log_dir / f"monthly-report-{datetime.now():%Y%m%d}.log"

    try:
        result = subprocess.run(
            ["npx", "tsx", "src/cli.ts", "scan-all", "--monthly"],
            cwd=str(GBP_LOCAL_DIR),
            capture_output=True, text=True, timeout=600,
        )
        log_file.write_text(f"=== SCAN ===\n{result.stdout}\n{result.stderr}\n")

        result = subprocess.run(
            ["npx", "tsx", "src/cli.ts", "report-all", "--monthly"],
            cwd=str(GBP_LOCAL_DIR),
            capture_output=True, text=True, timeout=600,
        )
        log_file.write_text(
            log_file.read_text() + f"\n=== REPORT ===\n{result.stdout}\n{result.stderr}\n"
        )

    except Exception as e:
        bot.send(f"[월간 리포트 오류] {e}")
```

- [ ] **Step 2:** orchestrator.py에 스케줄 등록

```python
# 매주 월요일 07:00 — 주간 스캔 + 리포트
scheduler.add_job(
    weekly_scan_and_report,
    CronTrigger(day_of_week="mon", hour=7, minute=0),
    args=[bot, cfg.log_dir],
    id="weekly_report",
)

# 매월 1일 07:30 — 월간 스캔 + 리포트
scheduler.add_job(
    monthly_scan_and_report,
    CronTrigger(day=1, hour=7, minute=30),
    args=[bot, cfg.log_dir],
    id="monthly_report",
)
```

시작 알림 메시지에도 추가:
```python
f"스케줄: ... | 월 07:00 주간리포트 | 매월1일 월간리포트\n"
```

- [ ] **Step 3:** orchestrator.py import 추가

```python
from src.jobs import (
    ...,
    weekly_scan_and_report,
    monthly_scan_and_report,
)
```

- [ ] **Step 4:** 검증 (수동 트리거)
```bash
cd internal-orchestrator
.venv/bin/python3 -c "
from src.jobs import weekly_scan_and_report
from src.telegram_bot import TelegramBot
from src.config import load_config
from pathlib import Path
cfg = load_config()
bot = TelegramBot(cfg.tg_token, cfg.tg_chat_id)
weekly_scan_and_report(bot, cfg.log_dir)
"
```

- [ ] **Step 5:** 커밋
```bash
git commit -m "feat: 오케스트레이터 주간/월간 리포트 스케줄 추가"
```

---

## Phase 8: 검증 및 마무리

### Task 9: E2E 테스트 — 1개 클라이언트 전체 플로우

- [ ] **Step 1:** clients.json에 테스트 클라이언트 키워드 설정 확인
```bash
cd gbp-local
cat data/clients.json | python3 -c "
import json, sys
clients = json.load(sys.stdin)
for c in clients:
    if c.get('keywords'):
        print(f'{c[\"id\"]}: {c[\"keywords\"]}')"
```

- [ ] **Step 2:** 스캔 → 리포트 → 아카이빙 전체 플로우
```bash
npx tsx src/cli.ts scan clinic-f
npx tsx src/cli.ts report weekly clinic-f
ls -la output/clinic-f/weekly/
cat data/report-index.json
```

- [ ] **Step 3:** 생성된 PPT 확인
텍스트 추출로 내용 확인:
```bash
python3 -m markitdown output/clinic-f/weekly/2026-03-31.pptx
```

- [ ] **Step 4:** 사용자에게 PPT 확인 요청
→ 양식 피드백 받고 수정 (Phase 9로)

- [ ] **Step 5:** 전체 커밋
```bash
git commit -m "feat: GBP 자동 리포트 v1 — 스캔+히트맵+PPT+아카이빙+스케줄"
```

---

## 실행 순서 요약

| Phase | 작업 | 예상 |
|-------|------|------|
| 1 | 파일 구조 리팩토링 | import 경로만 수정 |
| 2 | clients.json 확장 + Notion 동기화 | 신규 파일 1개 |
| 3 | scan-all 일괄 스캔 | batch.ts 리팩토링 |
| 4 | 히트맵 이미지 캡처 | Playwright 설치 + 신규 파일 1개 |
| 5 | 주간 PPT 자동 생성 | 핵심. 슬라이드 빌더 2개 + weekly.ts |
| 6 | report-all + 텔레그램 알림 | 신규 파일 1개 |
| 7 | 오케스트레이터 스케줄 | jobs.py + orchestrator.py 수정 |
| 8 | E2E 검증 | 1개 클라이언트 전체 플로우 |
