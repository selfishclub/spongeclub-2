function previousDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function computeStreak(dailyChecks, today) {
  const dates = new Set(dailyChecks.map((c) => c.date));
  let streak = 0;
  let cursor = today;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = previousDay(cursor);
  }
  return streak;
}
