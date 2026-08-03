import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'node:crypto';

const openModal = vi.fn().mockResolvedValue(undefined);
const postSkill = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/slack', () => ({
  makeClient: () => ({}),
  openModal: (...a: any[]) => openModal(...a),
  postSkill: (...a: any[]) => postSkill(...a),
}));

import { POST } from '@/app/api/slack/interactivity/route';
import { IDS } from '@/lib/ids';

const SECRET = 'shhh';
beforeEach(() => {
  process.env.SLACK_SIGNING_SECRET = SECRET;
  process.env.SLACK_BOT_TOKEN = 'xoxb-test';
  openModal.mockClear();
  postSkill.mockClear();
});

function signed(payloadObj: any) {
  const body = 'payload=' + encodeURIComponent(JSON.stringify(payloadObj));
  const ts = String(Math.floor(Date.now() / 1000));
  const h = crypto.createHmac('sha256', SECRET).update(`v0:${ts}:${body}`).digest('hex');
  return new Request('http://x/api/slack/interactivity', {
    method: 'POST',
    headers: { 'x-slack-signature': `v0=${h}`, 'x-slack-request-timestamp': ts },
    body,
  });
}

function fullView(overrides: any = {}) {
  const v = (val: any) => ({ ...val });
  return {
    private_metadata: 'C-CHAN',
    state: {
      values: {
        [IDS.category]: { [IDS.category]: { selected_option: { value: '개발' } } },
        [IDS.name]: { [IDS.name]: { value: '비디오메이커' } },
        [IDS.desc]: { [IDS.desc]: { value: '코드로 영상' } },
        [IDS.score]: { [IDS.score]: { selected_option: { value: '4' } } },
        [IDS.whatIsIt]: { [IDS.whatIsIt]: { value: '설명' } },
        [IDS.whatDoes]: { [IDS.whatDoes]: { value: '• 기능' } },
        [IDS.extra]: { [IDS.extra]: { value: '' } },
        [IDS.link]: { [IDS.link]: { value: overrides.link ?? 'https://e.com' } },
      },
    },
  };
}

describe('interactivity route', () => {
  it('view_submission 정상 → postSkill 호출', async () => {
    const res = await POST(signed({
      type: 'view_submission',
      user: { id: 'U9' },
      view: fullView(),
    }));
    expect(res.status).toBe(200);
    expect(postSkill).toHaveBeenCalledTimes(1);
    const [, channel, titleText] = postSkill.mock.calls[0];
    expect(channel).toBe('C-CHAN');
    expect(titleText).toContain('[개발] 비디오메이커 - 코드로 영상 · 4/5');
  });

  it('view_submission 링크 불량 → errors, 게시 안 함', async () => {
    const res = await POST(signed({
      type: 'view_submission',
      user: { id: 'U9' },
      view: fullView({ link: 'ftp://nope' }),
    }));
    const json = await res.json();
    expect(json.response_action).toBe('errors');
    expect(json.errors[IDS.link]).toBeTruthy();
    expect(postSkill).not.toHaveBeenCalled();
  });
});
