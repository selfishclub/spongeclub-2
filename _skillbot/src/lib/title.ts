export interface SkillTitle {
  category: string;
  name: string;
  desc: string;
  score?: number;
}

export function buildTitleLine(t: SkillTitle): string {
  const base = `[${t.category}] ${t.name} - ${t.desc}`;
  return t.score ? `${base} · ${t.score}/5` : base;
}

export function buildTitleCodeBlock(t: SkillTitle): string {
  return '```\n' + buildTitleLine(t) + '\n```';
}

export function parseTitleLine(raw: string): SkillTitle | null {
  // 백틱은 전부 제거(triple=코드블록, single=인라인코드 둘 다 대응 — 손으로 친 글이 인라인코드일 수 있음).
  const line = raw.replace(/`/g, '').trim();
  // 구분기호는 하이픈(-)뿐 아니라 en/em/figure dash(– — ‒ ―)도 허용(손으로 친 글 대응).
  // 점수 구분점도 ·(middle dot)·•(bullet) 둘 다, 공백 유무 관계없이.
  const m = line.match(/^\[(.+?)\]\s+(.+?)\s+[-–—‒―]\s+(.+?)(?:\s*[·•]\s*([1-5])\s*\/\s*5)?$/);
  if (!m) return null;
  return {
    category: m[1],
    name: m[2],
    desc: m[3],
    score: m[4] ? Number(m[4]) : undefined,
  };
}
