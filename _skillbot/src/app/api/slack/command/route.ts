import { verifySlackSignature } from '@/lib/verify';
import { buildSubmitModal } from '@/lib/blocks';
import { makeClient, openModal, fetchChannelMessages } from '@/lib/slack';
import { messagesToHits, filterHits, groupHits, buildSearchText } from '@/lib/search';

// /스킬등록 → 올리기 모달 / /스킬검색 <키워드> → 검색 결과(에페메럴)
export async function POST(req: Request): Promise<Response> {
  const raw = await req.text();
  const ok = verifySlackSignature({
    signingSecret: process.env.SLACK_SIGNING_SECRET ?? '',
    signature: req.headers.get('x-slack-signature') ?? '',
    timestamp: req.headers.get('x-slack-request-timestamp') ?? '',
    rawBody: raw,
  });
  if (!ok) return new Response('bad signature', { status: 401 });

  const params = new URLSearchParams(raw);
  const command = params.get('command') ?? '';
  const text = (params.get('text') ?? '').trim();
  const channelId = params.get('channel_id') ?? '';
  const triggerId = params.get('trigger_id') ?? '';
  const client = makeClient(process.env.SLACK_BOT_TOKEN ?? '');

  // 검색
  if (command.includes('검색') || command.includes('search')) {
    if (!text) {
      return Response.json({
        response_type: 'ephemeral',
        text: '검색어를 같이 입력해줘 — 예: `/스킬검색 블로그`',
      });
    }
    const messages = await fetchChannelMessages(client, channelId);
    const groups = groupHits(filterHits(messagesToHits(messages), text));
    return Response.json({ response_type: 'ephemeral', text: buildSearchText(text, groups, channelId) });
  }

  // 등록 (기본)
  await openModal(client, triggerId, buildSubmitModal(channelId));
  return new Response('', { status: 200 });
}
