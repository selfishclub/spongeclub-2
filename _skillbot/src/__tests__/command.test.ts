import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

const openModal = vi.fn().mockResolvedValue(undefined);
const fetchChannelMessages = vi.fn().mockResolvedValue([]);
vi.mock('@/lib/slack', () => ({
  makeClient: () => ({}),
  openModal: (...a: any[]) => openModal(...a),
  fetchChannelMessages: (...a: any[]) => fetchChannelMessages(...a),
}));

import { POST } from '@/app/api/slack/command/route';

const SECRET = 'shhh';
beforeEach(() => {
  process.env.SLACK_SIGNING_SECRET = SECRET;
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  openModal.mockClear();
  fetchChannelMessages.mockClear();
  fetchChannelMessages.mockResolvedValue([]);
});

function makeReq(fields: Record<string, string>) {
  const body = Object.entries(fields)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  const ts = String(Math.floor(Date.now() / 1000));
  const h = crypto.createHmac('sha256', SECRET).update(`v0:${ts}:${body}`).digest('hex');
  return new Request('http://x/api/slack/command', {
    method: 'POST',
    headers: {
      'x-slack-signature': `v0=${h}`,
      'x-slack-request-timestamp': ts,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  });
}

describe('command route', () => {
  it('/스킬등록 → 모달 오픈', async () => {
    const res = await POST(makeReq({ command: '/스킬등록', channel_id: 'C1', trigger_id: 'TRIG', text: '' }));
    expect(res.status).toBe(200);
    expect(openModal).toHaveBeenCalledTimes(1);
    expect(openModal.mock.calls[0][1]).toBe('TRIG');
  });

  it('/스킬검색 키워드 → 결과 에페메럴', async () => {
    fetchChannelMessages.mockResolvedValue([
      { text: '```\n[개발] 비디오메이커 - 코드로 영상 만들어주는 스킬 · 4/5\n```', ts: '111.1' },
      { text: '아무 댓글', ts: '111.2' },
    ]);
    const res = await POST(makeReq({ command: '/스킬검색', channel_id: 'C1', text: '영상' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.response_type).toBe('ephemeral');
    expect(json.text).toContain('비디오메이커');
    expect(json.text).toContain('찾았어요');
    expect(openModal).not.toHaveBeenCalled();
  });

  it('/스킬검색 빈 키워드 → 안내, 채널 안 읽음', async () => {
    const res = await POST(makeReq({ command: '/스킬검색', channel_id: 'C1', text: '' }));
    const json = await res.json();
    expect(json.text).toContain('검색어');
    expect(fetchChannelMessages).not.toHaveBeenCalled();
  });

  it('잘못된 서명 → 401', async () => {
    const req = new Request('http://x/api/slack/command', {
      method: 'POST',
      headers: { 'x-slack-signature': 'v0=bad', 'x-slack-request-timestamp': String(Math.floor(Date.now() / 1000)) },
      body: 'command=%2F%EC%8A%A4%ED%82%AC%EB%93%B1%EB%A1%9D',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
