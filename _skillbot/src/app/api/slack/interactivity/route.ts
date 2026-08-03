import { verifySlackSignature } from '@/lib/verify';
import { buildDetailText } from '@/lib/blocks';
import { extractSubmission } from '@/lib/fields';
import { buildTitleCodeBlock } from '@/lib/title';
import { makeClient, postSkill } from '@/lib/slack';
import { IDS } from '@/lib/ids';

// 모달 제출(view_submission) → 채널 게시(부모 제목 + 봇 댓글)
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
  const payload = JSON.parse(params.get('payload') ?? '{}');

  if (payload.type === 'view_submission') {
    const values = extractSubmission(payload.view);
    if (!/^https?:\/\/.+/i.test(values.link)) {
      return Response.json({
        response_action: 'errors',
        errors: { [IDS.link]: 'http(s):// 로 시작하는 링크를 넣어줘' },
      });
    }

    const channel = payload.view.private_metadata || process.env.SKILL_CHANNEL_ID || '';
    const client = makeClient(process.env.SLACK_BOT_TOKEN ?? '');
    const titleText = buildTitleCodeBlock({
      category: values.category,
      name: values.name,
      desc: values.desc,
      score: values.score,
    });
    const detailText = buildDetailText(values, payload.user.id);
    await postSkill(client, channel, titleText, detailText);
    return new Response('', { status: 200 });
  }

  return new Response('', { status: 200 });
}
