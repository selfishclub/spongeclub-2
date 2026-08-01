import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nrsDelta, improvementRate } from '../js/scoring.js';

test('nrsDelta returns improvement (before - after)', () => {
  assert.equal(nrsDelta(8, 3), 5);
});

test('nrsDelta is negative when worse', () => {
  assert.equal(nrsDelta(2, 6), -4);
});

test('improvementRate computes percent reduction', () => {
  assert.equal(improvementRate(8, 4), 50);
});

test('improvementRate rounds to nearest percent', () => {
  assert.equal(improvementRate(3, 2), 33);
});

test('improvementRate is 0 when before is 0 (no divide by zero)', () => {
  assert.equal(improvementRate(0, 0), 0);
});

test('improvementRate is negative when it got worse', () => {
  assert.equal(improvementRate(4, 6), -50);
});
