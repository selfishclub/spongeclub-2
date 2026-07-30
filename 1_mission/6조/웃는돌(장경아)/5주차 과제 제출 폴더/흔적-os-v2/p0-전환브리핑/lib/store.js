// 흔적 OS v2 · P0 — 저장소 어댑터 (Supabase REST / PostgREST)
// ─────────────────────────────────────────────────────────────
// v1 앱(imprint-os-app)이 쓰던 Supabase를 그대로 바라본다.
// 🔧 v1의 테이블/컬럼 이름이 아래와 다르면 **이 파일의 TRACES / C 만 고치면 된다.**
//    (나머지 파일은 저장소 구조를 전혀 모른다)
//
// 필요한 환경변수:
//   SUPABASE_URL                : https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY   : service_role 키 (서버에서만! 절대 클라이언트에 노출 금지)
//   TRACES_TABLE                : (선택) 기본 "traces"
//   TRACES_KIND_TODO            : (선택) '할일'을 뜻하는 값. 기본 "할일"

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TRACES = process.env.TRACES_TABLE || "traces";
const FOCUS = "daily_focus";
const KIND_TODO = process.env.TRACES_KIND_TODO || "할일";

// v1 흔적 테이블의 컬럼 이름 (다르면 여기만 수정)
const C = {
  id: "id",
  role: "role",
  kind: "kind",
  text: "text",
  done: "done",
  createdAt: "created_at",
};

async function sb(path, { method = "GET", body, prefer } = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없습니다");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    throw new Error(`supabase ${method} ${path} → ${res.status}: ${await res.text()}`);
  }
  const raw = await res.text();
  return raw ? JSON.parse(raw) : null;
}

// ── 후보 뽑기: 그 역할의 열린 할일을 '오래된 순'으로.
//    ⚠️ 의도적으로 규칙 기반이다. AI가 우선순위를 정하지 않는다 (PRD P10).
export async function openLoops(role, limit = 3) {
  const q = new URLSearchParams();
  q.set("select", [C.id, C.text, C.createdAt].join(","));
  q.set(C.role, `eq.${role}`);
  q.set(C.kind, `eq.${KIND_TODO}`);
  q.set(C.done, "not.is.true"); // false 와 null 을 모두 '열림'으로 본다
  q.set("order", `${C.createdAt}.asc`);
  q.set("limit", String(limit));

  const rows = (await sb(`${TRACES}?${q}`)) || [];
  return rows.map((r) => ({
    id: r[C.id],
    text: r[C.text],
    createdAt: r[C.createdAt],
  }));
}

/** 그 날짜의 '하나' 가져오기 (없으면 null) */
export async function getFocus(forDate) {
  const q = new URLSearchParams({ select: "*", for_date: `eq.${forDate}`, limit: "1" });
  const rows = (await sb(`${FOCUS}?${q}`)) || [];
  return rows[0] || null;
}

/** 그 날짜의 '하나'를 만들거나 덮어쓴다 (for_date 유니크 기준 upsert) */
export async function setFocus({ forDate, role, traceId, text, daysOpen, source, candidates }) {
  const row = {
    for_date: forDate,
    role,
    trace_id: traceId ?? null,
    text,
    days_open: daysOpen ?? null,
    source, // 'auto' | 'approved'
    candidates: candidates ?? null,
    done: false,
    delivered_at: null,
  };
  const out = await sb(`${FOCUS}?on_conflict=for_date`, {
    method: "POST",
    body: [row],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return (out && out[0]) || null;
}

/** 그 날짜의 '하나'를 부분 수정 */
export async function updateFocus(forDate, patch) {
  const q = new URLSearchParams({ for_date: `eq.${forDate}` });
  const out = await sb(`${FOCUS}?${q}`, {
    method: "PATCH",
    body: patch,
    prefer: "return=representation",
  });
  return (out && out[0]) || null;
}

/** 원본 흔적을 완료 처리 */
export async function markTraceDone(traceId) {
  const q = new URLSearchParams({ [C.id]: `eq.${traceId}` });
  await sb(`${TRACES}?${q}`, { method: "PATCH", body: { [C.done]: true } });
}

/** 새 흔적 저장 (자유 문장 캡처용) */
export async function insertTrace({ role, kind, text }) {
  const out = await sb(TRACES, {
    method: "POST",
    body: [{ [C.role]: role, [C.kind]: kind, [C.text]: text }],
    prefer: "return=representation",
  });
  return (out && out[0]) || null;
}
