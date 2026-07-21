import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDailyTotal, nrsDelta } from '../js/scoring.js';

test('computeDailyTotal sums 15 scores', () => {
  assert.equal(computeDailyTotal(new Array(15).fill(4)), 60);
});

test('computeDailyTotal of all zeros is 0', () => {
  assert.equal(computeDailyTotal(new Array(15).fill(0)), 0);
});

test('computeDailyTotal throws on wrong length', () => {
  assert.throws(() => computeDailyTotal([1, 2, 3]));
});

test('computeDailyTotal throws on out-of-range value', () => {
  const bad = new Array(15).fill(0);
  bad[0] = 5;
  assert.throws(() => computeDailyTotal(bad));
});

test('nrsDelta returns improvement (before - after)', () => {
  assert.equal(nrsDelta(8, 3), 5);
});

test('nrsDelta is negative when worse', () => {
  assert.equal(nrsDelta(2, 6), -4);
});
