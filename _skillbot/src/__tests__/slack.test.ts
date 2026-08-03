import { describe, it, expect, vi } from 'vitest';
import { openModal, postSkill, fetchChannelMessages } from '@/lib/slack';

function fakeClient() {
  return {
    views: { open: vi.fn().mockResolvedValue({ ok: true }) },
    chat: { postMessage: vi.fn().mockResolvedValue({ ok: true, ts: '111.222' }) },
  } as any;
}

describe('slack', () => {
  it('openModal: trigger_id·view 전달', async () => {
    const c = fakeClient();
    await openModal(c, 'TRIG', { type: 'modal' });
    expect(c.views.open).toHaveBeenCalledWith({ trigger_id: 'TRIG', view: { type: 'modal' } });
  });

  it('postSkill: 부모 ts로 스레드 댓글', async () => {
    const c = fakeClient();
    await postSkill(c, 'C1', '제목', 'detail');
    expect(c.chat.postMessage).toHaveBeenNthCalledWith(1, expect.objectContaining({ channel: 'C1', text: '제목', mrkdwn: true, username: '스킬봇' }));
    expect(c.chat.postMessage).toHaveBeenNthCalledWith(2, expect.objectContaining({ channel: 'C1', thread_ts: '111.222', text: 'detail', mrkdwn: true, username: '스킬봇' }));
  });

  it('postSkill: 부모 ts 없으면 throw', async () => {
    const c = fakeClient();
    c.chat.postMessage = vi.fn().mockResolvedValueOnce({ ok: true, ts: undefined });
    await expect(postSkill(c, 'C1', 't', 'd')).rejects.toThrow();
  });

  it('fetchChannelMessages: history 결과 매핑', async () => {
    const c = {
      conversations: {
        history: vi.fn().mockResolvedValue({ ok: true, messages: [{ text: 'a', ts: '1.1' }, { ts: '2.2' }] }),
      },
    } as any;
    const out = await fetchChannelMessages(c, 'C1', 50);
    expect(c.conversations.history).toHaveBeenCalledWith({ channel: 'C1', limit: 50 });
    expect(out).toEqual([{ text: 'a', ts: '1.1' }, { text: '', ts: '2.2' }]);
  });
});
