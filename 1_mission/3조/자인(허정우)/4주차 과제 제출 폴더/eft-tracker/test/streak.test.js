import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStreak } from '../js/streak.js';

test('empty checks => 0', () => {
  assert.equal(computeStreak([], '2026-07-21'), 0);
});

test('today only => 1', () => {
  assert.equal(computeStreak([{ date: '2026-07-21' }], '2026-07-21'), 1);
});

test('today + yesterday => 2', () => {
  assert.equal(computeStreak([{ date: '2026-07-20' }, { date: '2026-07-21' }], '2026-07-21'), 2);
});

test('gap breaks streak', () => {
  const checks = [{ date: '2026-07-18' }, { date: '2026-07-20' }, { date: '2026-07-21' }];
  assert.equal(computeStreak(checks, '2026-07-21'), 2);
});

test('no check today => 0', () => {
  assert.equal(computeStreak([{ date: '2026-07-20' }], '2026-07-21'), 0);
});

test('duplicate dates count once', () => {
  assert.equal(computeStreak([{ date: '2026-07-21' }, { date: '2026-07-21' }], '2026-07-21'), 1);
});

test('crosses month boundary', () => {
  const checks = [{ date: '2026-06-30' }, { date: '2026-07-01' }];
  assert.equal(computeStreak(checks, '2026-07-01'), 2);
});
