import { IDS } from './ids';
import type { SubmissionValues } from './blocks';

export function extractSubmission(view: any): SubmissionValues {
  const s = view?.state?.values ?? {};
  const txt = (id: string) => String(s[id]?.[id]?.value ?? '').trim();
  const sel = (id: string) => s[id]?.[id]?.selected_option?.value ?? undefined;

  const scoreRaw = sel(IDS.score);
  const extra = txt(IDS.extra);

  return {
    category: sel(IDS.category) ?? '',
    name: txt(IDS.name),
    desc: txt(IDS.desc),
    score: scoreRaw ? Number(scoreRaw) : undefined,
    whatIsIt: txt(IDS.whatIsIt),
    whatDoes: txt(IDS.whatDoes),
    extra: extra ? extra : undefined,
    link: txt(IDS.link),
  };
}
