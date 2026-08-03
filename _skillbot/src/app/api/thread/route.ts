import { makeClient, fetchThreadReplies } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const ts = new URL(req.url).searchParams.get('ts') ?? '';
  const token = process.env.SLACK_BOT_TOKEN ?? '';
  const channel = process.env.SKILL_CHANNEL_ID ?? '';
  if (!ts || !token || !channel) return Response.json({ replies: [] });
  try {
    const client = makeClient(token);
    const replies = await fetchThreadReplies(client, channel, ts);
    return Response.json({ replies });
  } catch (e) {
    return Response.json({ replies: [], error: e instanceof Error ? e.message : String(e) });
  }
}
