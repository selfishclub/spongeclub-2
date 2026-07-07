/**
 * ─────────────────────────────────────────────────────────────
 * 장기렌트 DB 납품 자동화 OS — 파일1: 1단계(취합/정규화/검증/블랙리스트/중복제거) + 공용 헬퍼
 * ─────────────────────────────────────────────────────────────
 * ※ 2_분배.gs 와 같은 Apps Script 프로젝트에 둘 것 (CONFIG·헬퍼 공유)
 */

// ===== 설정 (유지보수는 여기만) =======================================
const CONFIG = {
  중복검사탭: '중복검사',
  헤더행: 1, // 1행=헤더, 데이터 2행부터

  // 수집 탭 → '납품여부(체크박스)' 열 (A=1 …)  바이럴/성국광 G(7) · 최광철 H(8) · 틱톡 F(6)
  수집탭: { '바이럴 디비': 7, '성국광': 7, '최광철': 8, '틱톡': 6 },

  열: { 유입일시: 1, 이름: 2, 전화번호: 3, 희망차종: 4 },

  블랙리스트: { 탭: '블랙리스트', 번호열: 2 }, // B열

  무효표시: '제외됨(무효번호)',
  블랙표시: '제외됨(블랙리스트)',
  중복표시: '중복',
};
// =====================================================================

/** 메뉴 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🛠 납품자동화')
    .addItem('1단계: 취합 + 중복제거 (검증용)', '취합_및_중복제거')
    .addSeparator()
    .addItem('새벽 납품', '납품_새벽')
    .addItem('실시간 1차', '납품_실시간1차')
    .addItem('실시간 2차', '납품_실시간2차')
    .addItem('실시간 3차', '납품_실시간3차')
    .addSeparator()
    .addItem('⏰ 자동 트리거 설치', '트리거_설치')
    .addItem('⏰ 자동 트리거 제거', '트리거_제거')
    .addToUi();
}

/** 1단계 단독 실행 (취합 결과만 중복검사 탭에 기록) */
function 취합_및_중복제거() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const g = _취합DB(ss);
  _write중복검사(ss, g.결과);
  _mark제외(ss, g.제외목록);
  const msg = '취합 ' + g.결과.length + '건 (무효 ' + g.무효건수 + ', 블랙 ' + g.블랙건수 + ', 중복 ' + g.중복건수 + ' 제외)';
  Logger.log(msg);
  if (g.무효샘플.length) Logger.log('무효 샘플:\n' + g.무효샘플.join('\n'));
  ss.toast(msg, '1단계 완료', 6);
}

/**
 * [공용] 수집 탭 취합 → 정규화/검증/블랙리스트 → FIFO 정렬 + 차시내 중복제거
 * 반환: { 결과:[{유입일시,이름,전화번호,희망차종,_ts,_출처탭,_출처행}], 제외목록, 무효건수, 블랙건수, 무효샘플 }
 */
function _취합DB(ss) {
  const 블랙 = buildBlacklistSet_(ss);
  const 모음 = [];
  const 제외목록 = [];
  let 무효건수 = 0, 블랙건수 = 0;
  const 무효샘플 = [];

  for (const 탭명 in CONFIG.수집탭) {
    const 납품여부열 = CONFIG.수집탭[탭명];
    const sh = ss.getSheetByName(탭명);
    if (!sh) { Logger.log('⚠ 수집 탭 없음: ' + 탭명); continue; }
    const 마지막행 = sh.getLastRow();
    if (마지막행 <= CONFIG.헤더행) continue;

    const vals = sh.getRange(CONFIG.헤더행 + 1, 1, 마지막행 - CONFIG.헤더행, sh.getLastColumn()).getValues();
    vals.forEach(function (r, i) {
      if (r[납품여부열 - 1] === true) return; // 이미 납품
      const 원본 = r[CONFIG.열.전화번호 - 1];
      const 번호 = cleanPhone_(원본);
      const 행 = CONFIG.헤더행 + 1 + i;

      if (!isValidMobile_(번호)) {
        무효건수++;
        제외목록.push({ 탭: 탭명, 행: 행, 열: 납품여부열, 표시: CONFIG.무효표시 });
        if (무효샘플.length < 10) 무효샘플.push(탭명 + '行' + 행 + ': "' + 원본 + '"');
        return;
      }
      if (블랙.has(번호)) {
        블랙건수++;
        제외목록.push({ 탭: 탭명, 행: 행, 열: 납품여부열, 표시: CONFIG.블랙표시 });
        return;
      }
      모음.push({
        유입일시: r[CONFIG.열.유입일시 - 1],
        이름: r[CONFIG.열.이름 - 1],
        전화번호: 번호,
        희망차종: r[CONFIG.열.희망차종 - 1],
        _ts: toTime_(r[CONFIG.열.유입일시 - 1]),
        _출처탭: 탭명,
        _출처행: 행,
      });
    });
  }

  모음.sort(function (a, b) { return a._ts - b._ts; }); // FIFO
  const 최신 = {};
  let 중복건수 = 0;
  모음.forEach(function (d) {
    const prev = 최신[d.전화번호];
    if (!prev) { 최신[d.전화번호] = d; return; }
    // 같은 번호 → 최신만 남기고, 버려진 쪽은 '중복'으로 체크 처리
    const loser = (d._ts >= prev._ts) ? prev : d;
    if (d._ts >= prev._ts) 최신[d.전화번호] = d;
    중복건수++;
    제외목록.push({ 탭: loser._출처탭, 행: loser._출처행, 열: CONFIG.수집탭[loser._출처탭], 표시: CONFIG.중복표시 });
  });
  const 결과 = Object.keys(최신).map(function (k) { return 최신[k]; })
    .sort(function (a, b) { return a._ts - b._ts; });

  return { 결과: 결과, 제외목록: 제외목록, 무효건수: 무효건수, 블랙건수: 블랙건수, 중복건수: 중복건수, 무효샘플: 무효샘플 };
}

/** [공용] 중복검사 탭 A:D 갱신 */
function _write중복검사(ss, 결과) {
  const 검사 = ss.getSheetByName(CONFIG.중복검사탭);
  if (!검사) throw new Error('중복검사 탭 없음');
  const 기존 = 검사.getLastRow();
  if (기존 > CONFIG.헤더행) 검사.getRange(CONFIG.헤더행 + 1, 1, 기존 - CONFIG.헤더행, 4).clearContent();
  if (결과.length) {
    검사.getRange(CONFIG.헤더행 + 1, CONFIG.열.전화번호, 결과.length, 1).setNumberFormat('@');
    const out = 결과.map(function (d) { return [d.유입일시, d.이름, d.전화번호, d.희망차종]; });
    검사.getRange(CONFIG.헤더행 + 1, 1, out.length, 4).setValues(out);
  }
}

/** [공용] 제외 행(무효/블랙) 체크 + 표시 */
function _mark제외(ss, 제외목록) {
  제외목록.forEach(function (x) {
    const sh = ss.getSheetByName(x.탭);
    if (!sh) return;
    sh.getRange(x.행, x.열).setValue(true);
    sh.getRange(x.행, x.열 + 1).setValue(x.표시);
  });
}

/* ── 유틸 ───────────────────────────────────────────── */

function toTime_(v) {
  if (v instanceof Date) return v.getTime();
  if (v === null || v === '') return 0;
  const d = new Date(v);
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** 전화번호 정규화 → '010XXXXXXXX' */
function cleanPhone_(v) {
  if (v === null || v === undefined) return '';
  let s = String(v).replace(/[^0-9]/g, '');
  if (!s) return '';
  if (s.indexOf('0082') === 0) s = s.slice(4);
  else if (s.indexOf('82') === 0 && s.length >= 11) s = s.slice(2);
  if (/^1[016789]/.test(s) && s.length <= 10) s = '0' + s;
  return s;
}

/** 휴대폰 형식 검증 (010/011/016~019 + 7~8자리) */
function isValidMobile_(s) {
  return /^01[016789][0-9]{7,8}$/.test(s);
}

/** 블랙리스트 번호 Set (정규화) */
function buildBlacklistSet_(ss) {
  const set = new Set();
  const sh = ss.getSheetByName(CONFIG.블랙리스트.탭);
  if (!sh) { Logger.log('⚠ 블랙리스트 탭 없음'); return set; }
  const last = sh.getLastRow();
  if (last <= CONFIG.헤더행) return set;
  sh.getRange(CONFIG.헤더행 + 1, CONFIG.블랙리스트.번호열, last - CONFIG.헤더행, 1).getValues()
    .forEach(function (r) { const k = cleanPhone_(r[0]); if (k) set.add(k); });
  return set;
}
