import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifySlackSignature } from '@/lib/verify';

const SECRET = 'shhh';
function sign(rawBody: string, timestamp: string) {
  const h = crypto.createHmac('sha256', SECRET).update(`v0:${timestamp}:${rawBody}`).digest('hex');
  return `v0=${h}`;
}

describe('verifySlackSignature', () => {
  const ts = '1700000000';
  const body = 'token=abc&command=%2F스킬';
  const now = 1700000000;

  it('올바른 서명 → true', () => {
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sign(body, ts), timestamp: ts, rawBody: body, nowSec: now })).toBe(true);
  });
  it('변조된 서명 → false', () => {
    expect(verifySlackSignature({ signingSecret: SECRET, signature: 'v0=deadbeef', timestamp: ts, rawBody: body, nowSec: now })).toBe(false);
  });
  it('5분 초과 타임스탬프 → false', () => {
    expect(verifySlackSignature({ signingSecret: SECRET, signature: sign(body, ts), timestamp: ts, rawBody: body, nowSec: now + 60 * 6 })).toBe(false);
  });
  it('빈 서명 → false', () => {
    expect(verifySlackSignature({ signingSecret: SECRET, signature: '', timestamp: ts, rawBody: body, nowSec: now })).toBe(false);
  });
});
