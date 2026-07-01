/**
 * ─────────────────────────────────────────────────────────────
 * 장기렌트 DB 납품 자동화 OS — 파일2: 3a 우선순위 분배 (외부연동·xlsx 前 단계)
 * ─────────────────────────────────────────────────────────────
 * ※ 1_취합_중복제거.gs 와 같은 프로젝트에 둘 것 (CONFIG·_취합DB 등 공유)
 *
 * 각 차수 실행 시:
 *   취합 → 중복검사 기록 → COUNTIFS 읽기 → 우선순위 분배(1DB1광고주·FIFO)
 *   → 광고주_차지원 기록 + 시간보정 → 소스 납품여부 체크 → 차수 실적 기록
 *
 * (아직 안 함: 타입분리·외부정산 연동·xlsx 생성·광고주 이력 append → 3b/3c/3d)
 */

const DIST = {
  우선순위탭: '분배 우선순위',
  납품수량탭: '렌트 납품수량',
  차지원접미사: '_차지원',
  납품불가표시: '납품 불가', // 전 광고주에 이미 납품돼 갈 곳 없는 DB 표시

  // 3c: 납품 파일을 저장할 구글 드라이브 '루트 폴더' ID (여기 비면 파일 생성 안 함)
  //   드라이브에서 폴더 열고 URL의 folders/ 뒤 문자열을 붙여넣기
  드라이브_루트폴더ID: '1TbafGpbepEoI-P9p_xRT5fLVXlLxCGWi',

  // 3b: 외부 정산(수량 관리) 시트 ID + 구조. 비우면 타입분리 안 하고 광고주별 1파일.
  외부시트ID: '1vEQ6ZiNvN6OVZ2sfzxz5cpBpSbvuRjdPTfnxDvvuuvI',
  외부_헤더행: 1,    // '광고주 - MM/DD 할당' (블록별, 병합)
  외부_라벨행: 2,    // 구분 / 정규수량·정규AS수량·(특별AS)·추가AS수량
  외부_잔여행: 4,    // 잔여 (읽기)
  외부_로그시작행: 6, // 날짜별 납품 로그 (쓰기)

  중복검사_헤더행: 1,      // 광고주 이름이 있는 행
  중복검사_데이터시작: 2,
  우선순위_이름행: 2,      // 분배 우선순위: 1행=순번, 2행=광고주명

  // 렌트 납품수량 열 (A=1 …)
  새벽열: 4, 실시간1열: 7, 실시간2열: 8, 실시간3열: 9, 잔여열: 10,
  납품_데이터시작: 2,

  시간대_검색범위: 'A18:C30', // 유입시간대 표 (라벨로 찾음)
  새벽전량_기준: 3,           // 일일납품(B) ≤ 3 → 새벽 전량

  // 클램프분: 실시간에서 '어제자 이전' DB를 [시작, 시작+클램프분]으로 제한 (새벽은 null)
  차수: {
    '새벽':     { 시간대라벨: '새벽',     실적열: 4, 날짜오프셋: -1, 클램프분: null, 외부로그접미: '',      이력라벨: '새벽납품' },  // D-1
    '실시간1차': { 시간대라벨: '실시간1차', 실적열: 7, 날짜오프셋: 0,  클램프분: 60,   외부로그접미: '실시간1', 이력라벨: '실시간1차' }, // D-Day
    '실시간2차': { 시간대라벨: '실시간2차', 실적열: 8, 날짜오프셋: 0,  클램프분: 60,   외부로그접미: '실시간2', 이력라벨: '실시간2차' },
    '실시간3차': { 시간대라벨: '실시간3차', 실적열: 9, 날짜오프셋: 0,  클램프분: 60,   외부로그접미: '실시간3', 이력라벨: '실시간3차' },
  },
};

function 납품_새벽()     { _차수실행('새벽'); }
function 납품_실시간1차() { _차수실행('실시간1차'); }
function 납품_실시간2차() { _차수실행('실시간2차'); }
function 납품_실시간3차() { _차수실행('실시간3차'); }

// ── 자동 트리거 (마무리) ──────────────────────────────────────
// ※ 시각은 Apps Script 프로젝트 표준시(Asia/Seoul) 기준. 구글 특성상 지정시각 ±15분 창에서 실행됨.
const 트리거표 = [
  ['납품_새벽', 0, 0],       // 00:00
  ['납품_실시간1차', 10, 40], // 10:40 (오차 대비 10분 앞당김)
  ['납품_실시간2차', 14, 40], // 14:40
  ['납품_실시간3차', 16, 0],  // 16:00
];

function 트리거_설치() {
  트리거_제거(); // 중복 방지
  트리거표.forEach(function (t) {
    ScriptApp.newTrigger(t[0]).timeBased().everyDays(1).atHour(t[1]).nearMinute(t[2]).create();
  });
  SpreadsheetApp.getActive().toast('자동 트리거 4개 설치 (새벽 00:00 / 실시간 10:50·14:50·16:10 부근)', '트리거', 6);
}

function 트리거_제거() {
  const fns = 트리거표.map(function (t) { return t[0]; });
  ScriptApp.getProjectTriggers().forEach(function (tr) {
    if (fns.indexOf(tr.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(tr);
  });
}

function _차수실행(차수키) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const 차수 = DIST.차수[차수키];
  if (!차수) throw new Error('알 수 없는 차수: ' + 차수키);
  const today = new Date();

  // 1) 취합 → 중복검사 기록 → 제외 처리 → 수식 재계산
  const g = _취합DB(ss);
  _write중복검사(ss, g.결과);
  _mark제외(ss, g.제외목록);
  SpreadsheetApp.flush();

  const DB목록 = g.결과;
  const n = DB목록.length;

  // 2) 납품수량 읽기 + 차지원 비우기(매 차수) + '하루 첫 실행'이면 실적열(D·G·H·I) 리셋
  //    → 새벽을 건너뛰고 실시간1차부터 돌려도 그날 첫 실행이면 리셋되어 일일 전체가 실시간 목표가 됨
  let 수량 = _읽기납품수량(ss);
  _리셋차지원(ss, 수량);
  if (차수키 === '새벽' || _새하루인가(today)) _리셋새벽수량(ss, 수량);
  SpreadsheetApp.flush();
  수량 = _읽기납품수량(ss);

  // 3) 중복검사 COUNTIFS + 광고주→열 매핑(헤더 이름 기준, 동적)
  const 검사 = ss.getSheetByName(CONFIG.중복검사탭);
  const lastCol = 검사.getLastColumn();
  const 광고주열 = {};
  검사.getRange(DIST.중복검사_헤더행, 1, 1, lastCol).getValues()[0].forEach(function (h, idx) {
    const name = String(h).trim();
    if (name) 광고주열[name] = idx; // 0-based
  });
  const block = n > 0 ? 검사.getRange(DIST.중복검사_데이터시작, 1, n, lastCol).getValues() : [];

  // 4) 우선순위 + 시간대
  const 우선 = _읽기우선순위(ss);
  const 시간대 = _읽기시간대(ss, 차수.시간대라벨);

  // 5) 분배 — 선입선출(DB 오래된 순) + 균등. 구멍 없이 오래된 DB부터 소진.
  //    각 DB를 '받을 수 있는(적격·목표미달) 광고주' 중 가장 적게 받은 쪽에 배정(동률은 우선순위).
  const 활성 = [], 타겟 = {}, 콜 = {}, 배정 = {};
  for (let p = 0; p < 우선.length; p++) {
    const adv = 우선[p];
    const q = 수량[adv];
    if (!q) continue; // 납품수량 명단에 없음 → skip
    const col = 광고주열[adv];
    if (col === undefined) { Logger.log('⚠ 중복검사에 광고주 열 없음: ' + adv); continue; }
    활성.push(adv);
    타겟[adv] = _목표계산(차수키, q);
    콜[adv] = col;
    배정[adv] = [];
  }

  const 배정됨 = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {                 // FIFO: 오래된 DB부터
    let best = null, bestN = Infinity;
    for (let k = 0; k < 활성.length; k++) {     // 우선순위 순회 → 동률이면 앞(높은 우선순위)이 이김
      const adv = 활성[k];
      if (배정[adv].length >= 타겟[adv]) continue; // 목표 참
      if (block[i][콜[adv]] !== 0) continue;       // 적격(미납품)만
      if (배정[adv].length < bestN) { bestN = 배정[adv].length; best = adv; }
    }
    if (best) { 배정[best].push(DB목록[i]); 배정됨[i] = true; } // 갈 곳 없으면 스킵
  }

  // 납품 불가: 전 광고주에 이미 납품돼(COUNTIFS 전부 ≠0) 받을 곳 없는 미배정 DB → 체크 + '납품 불가'
  const 불가목록 = [];
  const 진단 = [];
  for (let i = 0; i < n; i++) {
    if (배정됨[i]) continue;
    let 받을곳 = false;
    const vals = [];
    for (let k = 0; k < 활성.length; k++) {
      const v = block[i][콜[활성[k]]];
      vals.push(활성[k] + '=' + v);
      if (v === 0) 받을곳 = true;
    }
    const d = DB목록[i];
    if (!받을곳) {
      불가목록.push({ 탭: d._출처탭, 행: d._출처행, 열: CONFIG.수집탭[d._출처탭], 표시: DIST.납품불가표시 });
      진단.push('불가 ' + d.전화번호 + ' [' + vals.join(', ') + ']');
    } else {
      진단.push('남은물량 ' + d.전화번호 + ' [' + vals.join(', ') + ']');
    }
  }
  if (불가목록.length) _mark제외(ss, 불가목록);
  if (진단.length) Logger.log('■ 미배정 DB 분류 (' + 진단.length + '건)\n' + 진단.join('\n'));

  // 기록 (+ 3c xlsx 드라이브 + 3b 타입분리·외부회신)
  let 총배정 = 0, 파일수 = 0;
  const 요약 = [];
  let 차수폴더 = null;
  if (DIST.드라이브_루트폴더ID) {
    const root = DriveApp.getFolderById(DIST.드라이브_루트폴더ID);
    차수폴더 = _폴더얻기(_폴더얻기(root, _yyyymmdd(today)), 차수키); // …/YYYYMMDD/차수/
  }
  let 외부 = null;
  if (DIST.외부시트ID) { try { 외부 = SpreadsheetApp.openById(DIST.외부시트ID); } catch (e) { Logger.log('⚠ 외부 시트 열기 실패: ' + e); } }

  const 타입목록 = [['정규', ''], ['정규AS', '(정규AS)'], ['특별AS', '(특별AS)'], ['추가AS', '(추가AS)']];

  for (let k = 0; k < 활성.length; k++) {
    const adv = 활성[k];
    const dbs = 배정[adv];
    if (dbs.length) {
      const rows = _배치시간보정(dbs, today, 차수, 시간대);
      _append차지원(ss, adv, rows);
      dbs.forEach(function (d) {
        const sh = ss.getSheetByName(d._출처탭);
        if (sh) sh.getRange(d._출처행, CONFIG.수집탭[d._출처탭]).setValue(true); // 소스 납품 체크
      });
      if (차수폴더) {
        SpreadsheetApp.flush();
        const czTab = ss.getSheetByName(adv + DIST.차지원접미사);
        const base = _mmdd(today) + '_' + adv;
        const suf = (차수키 === '새벽' ? '' : '_' + 차수키);
        const blk = 외부 ? _외부블록읽기(외부, adv) : null;
        if (blk) { // 타입별 분할 → 파일 분리 + 외부 로그 회신
          const 분할 = _타입분할(dbs.length, blk.잔여);
          if (분할.초과 > 0) Logger.log('⚠ ' + adv + ' 잔여 부족: ' + 분할.초과 + '건 초과(정규로 처리)');
          let off = 0;
          타입목록.forEach(function (t) {
            const cnt = 분할[t[0]];
            if (cnt > 0) { _xlsx저장(차수폴더, base + t[1] + '_차지원_' + cnt + '건' + suf, czTab, off, cnt); off += cnt; 파일수++; }
          });
          _외부회신(blk, today, 차수, 분할);
        } else { // 외부 없음 → 광고주별 1파일 (타입분리 X)
          _xlsx저장(차수폴더, base + '_차지원_' + dbs.length + '건' + suf, czTab);
          파일수++;
        }
      }
      _이력append(ss, adv, rows, today, 차수); // 3d: 광고주 이력 탭에 납품분 기록 (COUNTIFS용)
    }
    _실적기록(ss, 수량[adv].행, 차수.실적열, dbs.length);
    총배정 += dbs.length;
    요약.push(adv + ' ' + dbs.length + '/' + 타겟[adv]);
  }

  SpreadsheetApp.flush();
  const msg = '[' + 차수키 + '] 취합 ' + n + ' → 배정 ' + 총배정 + ' / 납품불가 ' + 불가목록.length + ' / 파일 ' + 파일수 + '  (' + 요약.join(', ') + ')';
  Logger.log(msg);
  ss.toast(msg, '분배 완료', 8);
}

/** 차수 목표 수량 */
function _목표계산(차수키, q) {
  if (차수키 === '새벽') return (q.B <= DIST.새벽전량_기준) ? q.B : Math.floor(q.B / 2);
  return Math.max(0, Math.floor(q.J)); // 실시간 = 현재 잔여(J)
}

/** 분배 우선순위(이름행) → 순서 배열 */
function _읽기우선순위(ss) {
  const sh = ss.getSheetByName(DIST.우선순위탭);
  if (!sh) throw new Error('분배 우선순위 탭 없음');
  return sh.getRange(DIST.우선순위_이름행, 1, 1, sh.getLastColumn()).getValues()[0]
    .map(function (v) { return String(v).trim(); }).filter(function (v) { return v; });
}

/** 렌트 납품수량 → {광고주:{행,B,C,D,E,J}} (첫 빈 행에서 멈춤 → 합계/시간대 제외) */
function _읽기납품수량(ss) {
  const sh = ss.getSheetByName(DIST.납품수량탭);
  if (!sh) throw new Error('렌트 납품수량 탭 없음');
  const last = sh.getLastRow();
  const out = {};
  if (last < DIST.납품_데이터시작) return out;
  const vals = sh.getRange(DIST.납품_데이터시작, 1, last - DIST.납품_데이터시작 + 1, 10).getValues();
  for (let i = 0; i < vals.length; i++) {
    const adv = String(vals[i][0]).trim();
    if (!adv) break;
    out[adv] = {
      행: DIST.납품_데이터시작 + i,
      B: Number(vals[i][1]) || 0, C: Number(vals[i][2]) || 0,
      D: Number(vals[i][3]) || 0, E: Number(vals[i][4]) || 0, J: Number(vals[i][9]) || 0,
    };
  }
  return out;
}

/** 차지원 탭 비우기 (매 차수: 이번 배치만 담기 위함) */
function _리셋차지원(ss, 수량) {
  for (const adv in 수량) {
    const cz = ss.getSheetByName(adv + DIST.차지원접미사);
    if (cz && cz.getLastRow() > 1) cz.getRange(2, 1, cz.getLastRow() - 1, 5).clearContent();
  }
}

/** 그날 첫 실행 여부 (DocumentProperties에 운영일 저장/비교). 첫 실행이면 true */
function _새하루인가(today) {
  const props = PropertiesService.getDocumentProperties();
  const todayStr = _yyyymmdd(today);
  const last = props.getProperty('운영일');
  props.setProperty('운영일', todayStr);
  return last !== todayStr;
}

/** 실적열 리셋: 렌트 납품수량 D·G·H·I (그날 첫 실행 또는 새벽) */
function _리셋새벽수량(ss, 수량) {
  const sh = ss.getSheetByName(DIST.납품수량탭);
  for (const adv in 수량) {
    const r = 수량[adv].행;
    sh.getRange(r, DIST.새벽열).clearContent();
    sh.getRange(r, DIST.실시간1열, 1, 3).clearContent();
  }
}

/** 유입시간대 읽기 (라벨 매칭) → {시작:{h,min}, 끝:{h,min}} */
function _읽기시간대(ss, 라벨) {
  const sh = ss.getSheetByName(DIST.납품수량탭);
  const disp = sh.getRange(DIST.시간대_검색범위).getDisplayValues();
  for (let i = 0; i < disp.length; i++) {
    if (String(disp[i][0]).indexOf(라벨) >= 0) return { 시작: _parseHM(disp[i][1]), 끝: _parseHM(disp[i][2]) };
  }
  throw new Error('유입시간대 못 찾음: ' + 라벨);
}
function _parseHM(s) {
  const m = String(s).match(/(\d{1,2}):(\d{2})/);
  return m ? { h: +m[1], min: +m[2] } : { h: 0, min: 0 };
}

/**
 * 배치 시간보정 (가중):
 *  - 날짜 = 차수 오프셋(새벽=D-1 / 실시간=D-Day), 초 = 원본 유지
 *  - 실시간: '어제자 이전' DB는 [시작, 시작+클램프분] 안에서만 (예: 1차 06:00~07:00)
 *            당일 DB는 전체 시간대
 *  - 각 그룹은 유입일시 오름차순 → 균등 슬롯에 배치(오래된 DB=이른 시간), 슬롯 안에서만 랜덤
 *  - 최종 행은 시간 오름차순 정렬
 */
function _배치시간보정(dbs, today, 차수, 시간대) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 차수.날짜오프셋);
  const s = 시간대.시작.h * 60 + 시간대.시작.min;
  const e = 시간대.끝.h * 60 + 시간대.끝.min;
  const todayKey = _dateKey(today);

  const old = [], cur = [];
  dbs.forEach(function (d) {
    const v = d.유입일시;
    const isOld = 차수.클램프분 && (v instanceof Date) && _dateKey(v) < todayKey;
    (isOld ? old : cur).push(d);
  });

  const rows = [];
  if (old.length) _슬롯배치(old, s, Math.min(e, s + 차수.클램프분), base, rows); // 어제자 → 이른 구간
  if (cur.length) _슬롯배치(cur, s, e, base, rows);                              // 당일 → 전체 구간
  rows.sort(function (a, b) { return a[0] - b[0]; });
  return rows;
}

function _dateKey(d) { return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate(); }

/** dbs를 유입일시 오름차순 정렬 후 [lo,hi]분 구간 균등 슬롯에 배치 → rows에 push */
function _슬롯배치(dbs, lo, hi, base, rows) {
  const 정렬 = dbs.slice().sort(function (a, b) { return (a._ts || 0) - (b._ts || 0); });
  const span = Math.max(0, hi - lo);
  const M = 정렬.length;
  정렬.forEach(function (d, i) {
    const a = lo + Math.floor(span * i / M);
    const b = lo + Math.floor(span * (i + 1) / M);
    const pick = (b > a) ? (a + Math.floor(Math.random() * (b - a))) : a;
    const sec = (d.유입일시 instanceof Date) ? d.유입일시.getSeconds() : 0;
    rows.push([new Date(base.getFullYear(), base.getMonth(), base.getDate(), Math.floor(pick / 60), pick % 60, sec),
               d.이름, d.전화번호, d.희망차종, '네']);
  });
}

/** 광고주_차지원 탭에 append (E='네') */
function _append차지원(ss, adv, rows) {
  if (!rows.length) return;
  const sh = ss.getSheetByName(adv + DIST.차지원접미사);
  if (!sh) { Logger.log('⚠ 차지원 탭 없음: ' + adv + DIST.차지원접미사); return; }
  const start = Math.max(sh.getLastRow() + 1, 2);
  sh.getRange(start, 3, rows.length, 1).setNumberFormat('@'); // 전화번호 텍스트
  sh.getRange(start, 1, rows.length, 5).setValues(rows);
}

/** 차수 실적 기록 (렌트 납품수량) */
function _실적기록(ss, 행, 열, n) {
  ss.getSheetByName(DIST.납품수량탭).getRange(행, 열).setValue(n);
}

/**
 * 3d: 광고주 이력 탭(중복검사 COUNTIFS 참조처)에 납품분 append.
 * 이력 탭 구조: A 납품시간대 / B 유입시간 / C 이름 / D 전화번호 / E 희망차량
 * rows = 차지원 행 [보정유입일시, 이름, 전화번호, 차종, '네']
 */
function _이력append(ss, adv, rows, today, 차수) {
  if (!rows.length) return;
  const sh = ss.getSheetByName(adv);
  if (!sh) { Logger.log('⚠ 광고주 이력 탭 없음: ' + adv); return; }
  const label = _ymd_dash(today) + ' ' + (차수.이력라벨 || '');
  const out = rows.map(function (r) { return [label, r[0], r[1], r[2], r[3]]; }); // A차수 B유입일시 C이름 D전화 E차종
  const start = Math.max(sh.getLastRow() + 1, 2);
  sh.getRange(start, 4, out.length, 1).setNumberFormat('@'); // D 전화번호 텍스트(앞0 보존 → COUNTIFS 매칭)
  sh.getRange(start, 1, out.length, 5).setValues(out);
}

/* ── 3c: 드라이브 xlsx ─────────────────────────────────────── */

/** 부모 폴더 아래 이름으로 폴더 얻기(없으면 생성) */
function _폴더얻기(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/**
 * 차지원 시트를 '서식 그대로' xlsx로 폴더에 저장. (시트 통째 복사 경유)
 * offset/count 주면 데이터행 중 [offset 건너뛰고 count건]만 (타입별 분할용). 미지정 시 전체.
 */
function _xlsx저장(폴더, 파일명, 차지원sheet, offset, count) {
  const last = 차지원sheet.getLastRow();
  if (last < 2) return; // 데이터 없음
  if (offset === undefined) { offset = 0; count = last - 1; } // 헤더 1행 제외한 전체
  if (count <= 0) return;
  const temp = SpreadsheetApp.create(파일명);
  const tid = temp.getId();
  try {
    const def = temp.getSheets()[0];
    const copied = 차지원sheet.copyTo(temp);   // 서식·헤더색·열너비 포함 복사
    copied.setName(차지원sheet.getName());
    temp.deleteSheet(def);                     // 기본 빈 시트 제거
    // 슬라이스: 헤더(1행) + 데이터행 [2+offset .. 1+offset+count]
    const sliceEnd = 1 + offset + count;
    const maxR = copied.getMaxRows();
    if (maxR > sliceEnd) copied.deleteRows(sliceEnd + 1, maxR - sliceEnd); // 슬라이스 뒤 삭제
    if (offset > 0) copied.deleteRows(2, offset);                          // 슬라이스 앞(헤더 제외) 삭제
    const maxC = copied.getMaxColumns();
    if (maxC > 5) copied.deleteColumns(6, maxC - 5);
    SpreadsheetApp.flush();
    const blob = UrlFetchApp.fetch(
      'https://docs.google.com/spreadsheets/d/' + tid + '/export?format=xlsx',
      { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } }
    ).getBlob().setName(파일명 + '.xlsx');
    const old = 폴더.getFilesByName(파일명 + '.xlsx'); // 같은 이름 기존 파일 제거(덮어쓰기)
    while (old.hasNext()) old.next().setTrashed(true);
    폴더.createFile(blob);
  } finally {
    DriveApp.getFileById(tid).setTrashed(true); // 임시 파일 삭제
  }
}

function _yyyymmdd(d) { return '' + d.getFullYear() + _2(d.getMonth() + 1) + _2(d.getDate()); }
function _mmdd(d) { return _2(d.getMonth() + 1) + _2(d.getDate()); }
function _ymd_dash(d) { return d.getFullYear() + '-' + _2(d.getMonth() + 1) + '-' + _2(d.getDate()); }
function _2(n) { return (n < 10 ? '0' : '') + n; }

/* ── 3b: 외부 정산 시트 연동 ─────────────────────────────────── */

/**
 * 외부 시트에서 광고주 탭의 '맨 오른쪽(활성) 할당 블록' 잔여를 타입별로 읽음.
 * 반환: { sh, bc(블록 시작열=날짜열), 타입열:{정규,정규AS,특별AS,추가AS}, 잔여:{...} } / 없으면 null
 */
function _외부블록읽기(외부, adv) {
  const sh = 외부.getSheetByName(adv);
  if (!sh) { Logger.log('⚠ 외부 시트에 광고주 탭 없음: ' + adv); return null; }
  const lastCol = sh.getLastColumn();

  // 행1에서 '할당' 헤더 중 가장 오른쪽 = 활성 블록 시작열 (병합셀은 좌상단에만 값)
  const 헤더 = sh.getRange(DIST.외부_헤더행, 1, 1, lastCol).getValues()[0];
  // 이 광고주 이름 + '할당'이 든 헤더 중 가장 오른쪽 = 활성 블록 (같은 탭에 숨은 타 광고주 블록 무시)
  let bc = -1;
  for (let c = 0; c < 헤더.length; c++) {
    const h = String(헤더[c]);
    if (h.indexOf('할당') >= 0 && h.indexOf(adv) >= 0) bc = c + 1;
  }
  if (bc < 0) { Logger.log('⚠ 외부 ' + adv + ': 할당 블록 못 찾음'); return null; }

  // 블록 끝 = 다음 '할당' 헤더 직전 열 (없으면 마지막 열) → 옆 블록 열 침범 방지
  let 블록끝 = lastCol;
  for (let col = bc + 1; col <= lastCol; col++) {
    if (String(헤더[col - 1]).indexOf('할당') >= 0) { 블록끝 = col - 1; break; }
  }

  // 행2 라벨로 타입 열 매핑 (블록 시작~끝 안에서만)
  const 라벨 = sh.getRange(DIST.외부_라벨행, bc, 1, 블록끝 - bc + 1).getValues()[0];
  const 타입열 = {};
  for (let i = 0; i < 라벨.length; i++) {
    const L = String(라벨[i]), col = bc + i;
    if (L.indexOf('추가') >= 0 && L.indexOf('AS') >= 0) 타입열['추가AS'] = col;
    else if (L.indexOf('특별') >= 0 && L.indexOf('AS') >= 0) 타입열['특별AS'] = col;
    else if (L.indexOf('정규') >= 0 && L.indexOf('AS') >= 0) 타입열['정규AS'] = col;
    else if (L.indexOf('정규') >= 0) 타입열['정규'] = col;
  }
  // 행4 잔여
  const 잔여 = { 정규: 0, 정규AS: 0, 특별AS: 0, 추가AS: 0 };
  ['정규', '정규AS', '특별AS', '추가AS'].forEach(function (t) {
    if (타입열[t]) 잔여[t] = Number(sh.getRange(DIST.외부_잔여행, 타입열[t]).getValue()) || 0;
  });
  Logger.log('외부 ' + adv + ': bc=' + bc + ' 잔여=' + JSON.stringify(잔여));
  return { sh: sh, bc: bc, 타입열: 타입열, 잔여: 잔여 };
}

/** 배정 N건을 차감순서(정규→정규AS→특별AS→추가AS)로 분할. 잔여 초과분은 정규로 몰되 초과 기록 */
function _타입분할(N, 잔여) {
  const out = { 정규: 0, 정규AS: 0, 특별AS: 0, 추가AS: 0, 초과: 0 };
  let 남 = N;
  ['정규', '정규AS', '특별AS', '추가AS'].forEach(function (t) {
    const take = Math.min(남, Math.max(0, 잔여[t] || 0)); // 음수 잔여 방어
    out[t] = take; 남 -= take;
  });
  out.초과 = 남;
  if (out.초과 > 0) out.정규 += out.초과; // 잔여 부족: 초과분은 정규 파일로 (경고 로그)
  return out;
}

/**
 * 외부 시트 활성 블록 날짜 로그에 이번 납품 회신.
 * 멱등: 같은 날짜 라벨 행이 이미 있으면 덮어쓰기, 없으면 첫 빈 행에 추가 (재실행해도 안 쌓임).
 */
function _외부회신(blk, today, 차수, 분할) {
  const sh = blk.sh, start = DIST.외부_로그시작행;
  const label = _ymd_dash(today) + (차수.외부로그접미 || '');
  const colVals = sh.getRange(start, blk.bc, Math.max(1, sh.getMaxRows() - start + 1), 1).getValues();
  let r = -1, firstEmpty = -1;
  for (let i = 0; i < colVals.length; i++) {
    const v = String(colVals[i][0]).trim();
    if (v === label) { r = start + i; break; }              // 같은 라벨 → 덮어쓰기
    if (firstEmpty < 0 && v === '') firstEmpty = start + i;
  }
  if (r < 0) r = (firstEmpty >= 0) ? firstEmpty : start + colVals.length;
  sh.getRange(r, blk.bc).setValue(label);
  ['정규', '정규AS', '특별AS', '추가AS'].forEach(function (t) {
    if (blk.타입열[t]) sh.getRange(r, blk.타입열[t]).setValue(분할[t] > 0 ? 분할[t] : ''); // 0은 비움
  });
}
