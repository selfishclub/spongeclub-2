// 흔적 OS v2 · P0 — 배포 전 모킹 테스트
// ─────────────────────────────────────────────────────────────
// 2주차에 썼던 방식 그대로: 진짜 텔레그램·Supabase 없이 파이프 전 구간을 가짜로 돌린다.
// 실행:  node test/dry-run.js
//
// 확인하는 것
//   1) 저녁: 후보 3개를 오래된 순으로 뽑아 묻고, 1번을 기본값으로 저장한다
//   2) 답장 "2": 내일의 하나가 2번으로 확정된다 (source=approved)
//   3) 아침: 확정된 하나를 배달하고, "어젯밤 직접 고르신 거예요"라고 말한다
//   4) 아침 재실행: 두 번 보내지 않는다
//   5) "완료": 오늘의 하나와 원본 흔적이 닫힌다
//   6) 무응답 시나리오: "제가 골랐어요 (N일째)"라고 정직하게 밝힌다
//   7) 후보 없음: 아무것도 보내지 않는다 (조용함이 기능)

// ── 환경변수는 import 보다 먼저 (모듈이 로드 시점에 읽는다)
process.env.SUPABASE_URL = "https://fake.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key";
process.env.TELEGRAM_TOKEN = "000000:FAKE-TOKEN";
process.env.ALLOWED_CHAT_ID = "12345";
process.env.FOCUS_ROLE = "본업";
process.env.CRON_SECRET = "test-secret";

const DAY = 86_400_000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

// ── 가짜 저장소 ───────────────────────────────────────────────
let db;
let sent; // 텔레그램으로 나간 메시지들

function resetDb() {
  db = {
    traces: [
      { id: 1, role: "본업", kind: "할일", text: "임원 보고 초안 마무리", done: false, created_at: iso(12.2) },
      { id: 2, role: "본업", kind: "할일", text: "상품기획 파트 미팅 자료 정리", done: false, created_at: iso(5.4) },
      { id: 3, role: "본업", kind: "할일", text: "경쟁사 벤치마크 훑기", done: false, created_at: iso(2.1) },
      { id: 4, role: "본업", kind: "할일", text: "이건 4번째라 후보에 안 떠야 함", done: false, created_at: iso(1.0) },
      { id: 5, role: "본업", kind: "할일", text: "이미 끝낸 일", done: true, created_at: iso(30) },
      { id: 6, role: "엄마", kind: "할일", text: "다른 역할이라 안 떠야 함", done: false, created_at: iso(20) },
      { id: 7, role: "본업", kind: "글감", text: "할일이 아니라 안 떠야 함", done: false, created_at: iso(20) },
    ],
    daily_focus: [],
  };
  sent = [];
}

// ── PostgREST 최소 구현 ──────────────────────────────────────
function jsonRes(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (data === null || data === undefined ? "" : JSON.stringify(data)),
    json: async () => data,
  };
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict"]);

function applyFilters(rows, params) {
  let out = rows;
  for (const [k, v] of params.entries()) {
    if (RESERVED.has(k)) continue;
    if (v.startsWith("eq.")) {
      const val = v.slice(3);
      out = out.filter((r) => String(r[k]) === val);
    } else if (v === "not.is.true") {
      out = out.filter((r) => r[k] !== true);
    } else if (v === "is.null") {
      out = out.filter((r) => r[k] == null);
    } else {
      throw new Error(`테스트가 모르는 필터: ${k}=${v}`);
    }
  }
  return out;
}

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(url);

  // ── 텔레그램
  if (u.hostname === "api.telegram.org") {
    const body = JSON.parse(opts.body);
    sent.push(body.text);
    return jsonRes({ ok: true, result: { message_id: sent.length } });
  }

  // ── Supabase
  const table = u.pathname.replace("/rest/v1/", "");
  const params = u.searchParams;
  const method = opts.method || "GET";
  const body = opts.body ? JSON.parse(opts.body) : undefined;
  const rows = db[table];
  if (!rows) throw new Error(`테스트가 모르는 테이블: ${table}`);

  if (method === "GET") {
    let out = applyFilters(rows, params);
    const order = params.get("order");
    if (order) {
      const [col, dir] = order.split(".");
      out = [...out].sort((a, b) =>
        String(a[col]) < String(b[col]) ? (dir === "desc" ? 1 : -1) : String(a[col]) > String(b[col]) ? (dir === "desc" ? -1 : 1) : 0
      );
    }
    const limit = params.get("limit");
    if (limit) out = out.slice(0, Number(limit));
    return jsonRes(out);
  }

  if (method === "POST") {
    const incoming = Array.isArray(body) ? body : [body];
    const conflictCol = params.get("on_conflict");
    const saved = incoming.map((row) => {
      if (conflictCol) {
        const idx = rows.findIndex((r) => r[conflictCol] === row[conflictCol]);
        if (idx >= 0) {
          rows[idx] = { ...rows[idx], ...row };
          return rows[idx];
        }
      }
      const created = { id: rows.length + 1, created_at: new Date().toISOString(), ...row };
      rows.push(created);
      return created;
    });
    return jsonRes(saved);
  }

  if (method === "PATCH") {
    const target = applyFilters(rows, params);
    target.forEach((r) => Object.assign(r, body));
    return jsonRes(target);
  }

  throw new Error(`테스트가 모르는 메서드: ${method}`);
};

// ── 가짜 req/res ─────────────────────────────────────────────
const cronReq = () => ({ method: "GET", headers: { authorization: "Bearer test-secret" } });
const hookReq = (text) => ({
  method: "POST",
  headers: {},
  body: { message: { text, chat: { id: 12345 } } },
});
function mkRes() {
  const r = { statusCode: null, payload: null };
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (d) => ((r.payload = d), r);
  r.send = (d) => ((r.payload = d), r);
  return r;
}

// ── 초라한 assert ────────────────────────────────────────────
let pass = 0;
let fail = 0;
function check(label, cond, detail = "") {
  if (cond) {
    pass++;
    console.log(`  ✅ ${label}`);
  } else {
    fail++;
    console.log(`  ❌ ${label}${detail ? `\n     ↳ ${detail}` : ""}`);
  }
}
const last = () => sent[sent.length - 1] || "";

// ── 실행 ─────────────────────────────────────────────────────
const { default: evening } = await import("../api/cron-evening.js");
const { default: morning } = await import("../api/cron-morning.js");
const { default: webhook } = await import("../api/telegram.js");
const { kstToday, kstTomorrow } = await import("../lib/brief.js");

console.log("\n흔적 OS v2 · P0 — 모킹 테스트\n" + "─".repeat(50));

// ─────────────────────────────────────────────────────────────
console.log("\n[1] 🌙 저녁 승인 요청");
resetDb();
await evening(cronReq(), mkRes());
console.log("\n" + last().split("\n").map((l) => "     │ " + l).join("\n") + "\n");

check("메시지가 한 통 나갔다", sent.length === 1);
check("후보는 3개만", (last().match(/^  \d\./gm) || []).length === 3);
check("가장 오래 열린 것이 1번", last().includes("1. 임원 보고 초안 마무리"));
check("열린 일수가 붙는다", last().includes("(12일째 열림)"));
check("다른 역할(엄마)은 안 뜬다", !last().includes("다른 역할"));
check("완료된 일은 안 뜬다", !last().includes("이미 끝낸 일"));
check("할일이 아닌 것(글감)은 안 뜬다", !last().includes("할일이 아니라"));
check("4번째 후보는 잘린다", !last().includes("4번째라"));
check("무응답 안내가 있다", last().includes("그냥 두셔도 괜찮아요"));

let focus = db.daily_focus.find((f) => f.for_date === kstTomorrow());
check("내일 날짜로 기본값이 저장됐다", !!focus, JSON.stringify(db.daily_focus));
check("기본값은 source=auto", focus?.source === "auto");
check("기본값은 1번", focus?.trace_id === 1);

// ─────────────────────────────────────────────────────────────
console.log('\n[2] 💬 답장 "2" → 승인');
await webhook(hookReq("2"), mkRes());
focus = db.daily_focus.find((f) => f.for_date === kstTomorrow());
check("source가 approved로 바뀐다", focus?.source === "approved");
check("2번으로 확정된다", focus?.trace_id === 2, `trace_id=${focus?.trace_id}`);
check("확인 답장이 온다", last().includes("이걸로 할게요"));

// ─────────────────────────────────────────────────────────────
console.log("\n[3] 🟢 다음 날 아침 배달");
// (테스트 픽스처) 하루가 지난 상황을 만든다 — 내일 것을 오늘 것으로
focus.for_date = kstToday();
await morning(cronReq(), mkRes());
console.log("\n" + last().split("\n").map((l) => "     │ " + l).join("\n") + "\n");

check("본업 모드라고 알린다", last().includes("본업 모드예요"));
check("'지금 이거 하나'가 있다", last().includes("▸ 지금 이거 하나"));
check("승인한 그 하나가 온다", last().includes("상품기획 파트 미팅 자료 정리"));
check("직접 고른 것임을 밝힌다", last().includes("어젯밤 직접 고르신 거예요"));
check("버튼(inline keyboard)이 없다", !last().includes("["), "P9: 읽는 것만으로 완결");
check("배달 시각이 기록된다", !!db.daily_focus.find((f) => f.for_date === kstToday())?.delivered_at);

// ─────────────────────────────────────────────────────────────
console.log("\n[4] 🔁 아침 재실행 (중복 방지)");
const before = sent.length;
await morning(cronReq(), mkRes());
check("두 번 보내지 않는다", sent.length === before);

// ─────────────────────────────────────────────────────────────
console.log('\n[5] ✅ "완료"');
await webhook(hookReq("완료"), mkRes());
check("오늘의 하나가 닫힌다", db.daily_focus.find((f) => f.for_date === kstToday())?.done === true);
check("원본 흔적도 닫힌다", db.traces.find((t) => t.id === 2)?.done === true);
check("격려 답장이 온다", last().includes("잘하셨어요"));

// ─────────────────────────────────────────────────────────────
console.log("\n[6] 🤫 저녁에 답을 안 한 경우");
resetDb();
await evening(cronReq(), mkRes());
const f2 = db.daily_focus.find((x) => x.for_date === kstTomorrow());
f2.for_date = kstToday();
await morning(cronReq(), mkRes());
console.log("\n" + last().split("\n").map((l) => "     │ " + l).join("\n") + "\n");
check("자동 선택임을 정직하게 밝힌다", last().includes("제가 골랐어요"));
check("그 근거(일수)를 함께 준다", last().includes("12일째"));
check("1번이 배달된다", last().includes("임원 보고 초안 마무리"));

// ─────────────────────────────────────────────────────────────
console.log("\n[7] 🔇 후보가 하나도 없을 때");
resetDb();
db.traces = db.traces.filter((t) => t.role !== "본업");
sent = [];
const r7 = mkRes();
await evening(cronReq(), r7);
check("아무것도 보내지 않는다", sent.length === 0, "P7: 조용함이 기능");
check("skip으로 응답한다", r7.payload?.skipped === "no-candidates");

// ─────────────────────────────────────────────────────────────
console.log("\n[8] 🔐 cron 인증");
const r8 = mkRes();
await evening({ method: "GET", headers: { authorization: "Bearer wrong" } }, r8);
check("잘못된 secret은 401", r8.statusCode === 401);

// ─────────────────────────────────────────────────────────────
console.log("\n[9] 📥 그 밖의 말은 그냥 담긴다");
resetDb();
await webhook(hookReq("막내 물리 과외 금요일 픽업"), mkRes());
check("흔적으로 저장된다", db.traces.some((t) => t.text === "막내 물리 과외 금요일 픽업"));
check("담았다고 답장한다", last().includes("담아뒀어요"));

// ─────────────────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`${fail === 0 ? "🟢 PASS" : "🔴 FAIL"}  —  통과 ${pass} / 실패 ${fail}\n`);
process.exit(fail === 0 ? 0 : 1);
