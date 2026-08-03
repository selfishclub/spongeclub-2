import { WebClient } from '@slack/web-api';

export function makeClient(token: string): WebClient {
  return new WebClient(token);
}

// 채널에 실제 글을 쓸 때 봇 유저 영문 display_name(skillbot) 대신 통일된 한글 이름·아이콘으로 표기.
// (chat:write.customize 스코프 필요)
const BOT_USERNAME = '스킬봇';
const BOT_ICON_URL = 'https://sponge-skillers.vercel.app/icon.png';

export async function openModal(client: WebClient, triggerId: string, view: any): Promise<void> {
  await client.views.open({ trigger_id: triggerId, view });
}

export async function postSkill(
  client: WebClient,
  channel: string,
  titleText: string,
  detailText: string
): Promise<void> {
  const parent = await client.chat.postMessage({
    channel,
    text: titleText,
    mrkdwn: true,
    username: BOT_USERNAME,
    icon_url: BOT_ICON_URL,
  });
  if (!parent.ts) throw new Error('parent post returned no ts');
  await client.chat.postMessage({
    channel,
    thread_ts: parent.ts,
    text: detailText,
    mrkdwn: true,
    username: BOT_USERNAME,
    icon_url: BOT_ICON_URL,
  });
}

/** 검색용 — 채널 최근 메시지 읽기 (channels:history / groups:history 필요) */
export async function fetchChannelMessages(
  client: WebClient,
  channel: string,
  limit = 200
): Promise<{ text: string; ts: string }[]> {
  const res = await client.conversations.history({ channel, limit });
  return (res.messages ?? []).map((m: any) => ({ text: m.text ?? '', ts: m.ts ?? '' }));
}

/** 스레드 댓글(부모 제외) 텍스트 — 등록 상세 설명 펼침용 */
export async function fetchThreadReplies(
  client: WebClient,
  channel: string,
  ts: string
): Promise<string[]> {
  const res = await client.conversations.replies({ channel, ts, limit: 20 });
  const msgs = res.messages ?? [];
  return msgs
    .slice(1) // 첫 메시지 = 부모(제목), 나머지가 댓글
    .map((m: any) => String(m.text ?? '').trim())
    .filter((t) => t.length > 0);
}
