export function nrsDelta(before, after) {
  return before - after;
}

// 개선율(%). before가 0이면 줄어들 여지가 없으므로 0을 돌려준다.
export function improvementRate(before, after) {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}
