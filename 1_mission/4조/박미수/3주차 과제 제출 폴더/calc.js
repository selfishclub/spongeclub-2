/* ============================================================
   calc.js — Golf Rank 공용 집계/랭킹 로직 (여러 페이지 공유)
============================================================ */
const SHRINK_C = 2;   // 신뢰 보정 강도(팬텀 라운드 수)

/* 주어진 라운드 배열로 랭킹 보드 계산
   - 게스트 제외 (멤버만)
   - 라운드마다 그로스 등수 → 정규화 포인트(1등100~꼴등10)
   - 대표 지표 adjPts = (누적포인트 + C×M) / (라운드수 + C)  (평균 + 신뢰 보정) */
function computeBoard(rounds) {
  const agg = {};
  let gSum = 0, gCnt = 0;
  (rounds || []).forEach((r) => {
    const parts = r.scores.filter((s) => s.role !== 'guest' && typeof s.total === 'number');
    const N = parts.length; if (!N) return;
    const minTotal = Math.min(...parts.map((s) => s.total));
    parts.forEach((s) => {
      const lower = parts.filter((x) => x.total < s.total).length;
      const tie   = parts.filter((x) => x.total === s.total).length;
      const rank  = 1 + lower + (tie - 1) / 2;
      const pts   = N > 1 ? 10 + (N - rank) / (N - 1) * 90 : 100;
      const wins  = parts.filter((x) => x.total > s.total).length + (tie - 1) * 0.5;
      gSum += pts; gCnt += 1;
      const a = agg[s.name] || (agg[s.name] = { name: s.name, role: s.role || 'member', points: 0, firsts: 0, wins: 0, matches: 0, sum: 0, rounds: 0 });
      a.points += pts; a.wins += wins; a.matches += (N - 1); a.sum += s.total; a.rounds += 1;
      if (s.total === minTotal) a.firsts += 1;
      if (s.role === 'owner') a.role = 'owner'; else if (s.role === 'member' && a.role !== 'owner') a.role = 'member';
    });
  });
  const M = gCnt ? gSum / gCnt : 55;
  return Object.values(agg)
    .map((a) => ({
      ...a,
      avg: a.rounds ? a.sum / a.rounds : 0,
      winrate: a.matches ? a.wins / a.matches : 0,
      rawAvgPts: a.rounds ? a.points / a.rounds : 0,
      adjPts: (a.points + SHRINK_C * M) / (a.rounds + SHRINK_C),
    }))
    .sort((x, y) => (y.adjPts - x.adjPts) || (y.firsts - x.firsts) || (y.winrate - x.winrate) || (x.avg - y.avg));
}

/* 평균 스코어 보드 (보정 없음) — 월간 MVP / 개인 통계용
   멤버만, 평균 타수 낮은 순 (동점은 1등 횟수 많은 순) */
function avgScoreBoard(rounds) {
  const agg = {};
  (rounds || []).forEach((r) => {
    r.scores.filter((s) => s.role !== 'guest' && typeof s.total === 'number').forEach((s) => {
      const a = agg[s.name] || (agg[s.name] = { name: s.name, role: s.role || 'member', sum: 0, rounds: 0, best: Infinity, firsts: 0 });
      a.sum += s.total; a.rounds += 1; a.best = Math.min(a.best, s.total);
    });
  });
  (rounds || []).forEach((r) => {
    const parts = r.scores.filter((s) => s.role !== 'guest' && typeof s.total === 'number');
    if (!parts.length) return;
    const m = Math.min(...parts.map((s) => s.total));
    parts.forEach((s) => { if (s.total === m && agg[s.name]) agg[s.name].firsts += 1; });
  });
  return Object.values(agg).map((a) => ({ ...a, avg: a.rounds ? a.sum / a.rounds : 0 }))
    .sort((x, y) => (x.avg - y.avg) || (y.firsts - x.firsts));
}

/* 기간 필터 헬퍼 */
function roundsInYear(club, year) {
  return (club.rounds || []).filter((r) => new Date(r.date).getFullYear() === year);
}
function roundsInMonth(club, year, month0) {
  return (club.rounds || []).filter((r) => { const d = new Date(r.date); return d.getFullYear() === year && d.getMonth() === month0; });
}
