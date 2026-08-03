import { makeClient, fetchChannelMessages } from './slack';
import { messagesToHits, groupHits, slackArchiveLink, type SkillGroup } from './search';
import { CATEGORIES } from './categories';

export interface CatalogItem {
  name: string;
  desc: string;
  category: string;
  usedCount: number;
  wishCount: number;
  avgScore?: number;
  slackLink: string;
  ts: string;
}

export interface CatalogSection {
  category: string;
  items: CatalogItem[];
}

export interface Catalog {
  sections: CatalogSection[];
  total: number;
  error?: string;
}

const KNOWN = CATEGORIES as readonly string[];

/** SkillGroup[] → 카테고리 섹션. 6종 고정 순서 먼저, 그 밖 카테고리는 뒤에. 섹션 내부 최근순. */
export function groupsToCatalog(groups: SkillGroup[], channelId: string): CatalogSection[] {
  const items: CatalogItem[] = groups.map((g) => ({
    name: g.name,
    desc: g.desc,
    category: g.category,
    usedCount: g.usedCount,
    wishCount: g.wishCount,
    avgScore: g.avgScore,
    slackLink: slackArchiveLink(channelId, g.ts),
    ts: g.ts,
  }));

  const byRecent = (a: CatalogItem, b: CatalogItem) => Number(b.ts) - Number(a.ts);
  const sections: CatalogSection[] = [];

  for (const cat of KNOWN) {
    const inCat = items.filter((it) => it.category === cat).sort(byRecent);
    if (inCat.length) sections.push({ category: cat, items: inCat });
  }

  const others = items.filter((it) => !KNOWN.includes(it.category));
  const otherCats = [...new Set(others.map((o) => o.category))];
  for (const cat of otherCats) {
    const inCat = others.filter((o) => o.category === cat).sort(byRecent);
    sections.push({ category: cat, items: inCat });
  }

  return sections;
}

/** env 읽어 슬랙 채널 → 카탈로그. 실패 시 빈 섹션 + error. */
export async function loadCatalog(): Promise<Catalog> {
  const token = process.env.SLACK_BOT_TOKEN ?? '';
  const channelId = process.env.SKILL_CHANNEL_ID ?? '';
  if (!token || !channelId) {
    return { sections: [], total: 0, error: 'SLACK_BOT_TOKEN 또는 SKILL_CHANNEL_ID 미설정' };
  }
  try {
    const client = makeClient(token);
    const messages = await fetchChannelMessages(client, channelId, 200);
    const groups = groupHits(messagesToHits(messages));
    return { sections: groupsToCatalog(groups, channelId), total: groups.length };
  } catch (e) {
    return { sections: [], total: 0, error: e instanceof Error ? e.message : String(e) };
  }
}
