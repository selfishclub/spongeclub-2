import { test } from 'node:test';
import assert from 'node:assert/strict';
import { todayStr } from '../js/util.js';

test('todayStr formats a fixed date as YYYY-MM-DD', () => {
  const d = new Date(2026, 6, 5); // 2026-07-05 (월은 0-based)
  assert.equal(todayStr(d), '2026-07-05');
});

test('todayStr zero-pads month and day', () => {
  const d = new Date(2026, 0, 9); // 2026-01-09
  assert.equal(todayStr(d), '2026-01-09');
});
