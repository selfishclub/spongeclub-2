import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultState } from '../js/storage.js';

function memoryBackend() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
  };
}

test('load returns default state when empty', () => {
  const store = createStore(memoryBackend());
  assert.deepEqual(store.load(), defaultState());
});

test('addDailyCheck persists', () => {
  const store = createStore(memoryBackend());
  store.addDailyCheck({ date: '2026-07-21', symptomScores: new Array(15).fill(1), total: 15 });
  const s = store.load();
  assert.equal(s.dailyChecks.length, 1);
  assert.equal(s.dailyChecks[0].total, 15);
});

test('addSession assigns an id and persists', () => {
  const store = createStore(memoryBackend());
  const saved = store.addSession({
    datetime: '2026-07-21T10:00:00Z', situation: 'x', emotions: 'y',
    chosenEmotion: '억울함', before: 8, shape: {}, bodyLocation: '가슴', after: 3,
  });
  assert.ok(saved.id);
  assert.equal(store.load().eftSessions.length, 1);
});

test('setOnboardingDone and setEftGuideSeen flip flags', () => {
  const store = createStore(memoryBackend());
  store.setOnboardingDone();
  store.setEftGuideSeen();
  const s = store.load();
  assert.equal(s.onboardingDone, true);
  assert.equal(s.eftGuideSeen, true);
});

test('load merges missing keys onto malformed/partial data', () => {
  const backend = memoryBackend();
  backend.setItem('eft_tracker_v1', JSON.stringify({ onboardingDone: true }));
  const store = createStore(backend);
  const s = store.load();
  assert.equal(s.onboardingDone, true);
  assert.deepEqual(s.dailyChecks, []);
  assert.deepEqual(s.eftSessions, []);
});
