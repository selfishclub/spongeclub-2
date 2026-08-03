import crypto from 'node:crypto';

export function verifySlackSignature(p: {
  signingSecret: string;
  signature: string;
  timestamp: string;
  rawBody: string;
  nowSec?: number;
}): boolean {
  const now = p.nowSec ?? Math.floor(Date.now() / 1000);
  const ts = Number(p.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 60 * 5) return false;

  const base = `v0:${p.timestamp}:${p.rawBody}`;
  const hmac = crypto.createHmac('sha256', p.signingSecret).update(base).digest('hex');
  const expected = `v0=${hmac}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(p.signature || '');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
