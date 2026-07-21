export function computeDailyTotal(scores) {
  if (!Array.isArray(scores) || scores.length !== 15) {
    throw new Error('scores must be an array of 15 numbers');
  }
  for (const s of scores) {
    if (typeof s !== 'number' || Number.isNaN(s) || s < 0 || s > 4) {
      throw new Error('each score must be a number between 0 and 4');
    }
  }
  return scores.reduce((a, b) => a + b, 0);
}

export function nrsDelta(before, after) {
  return before - after;
}
