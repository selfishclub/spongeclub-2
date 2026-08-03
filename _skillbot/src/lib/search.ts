import { parseTitleLine } from './title';

export interface SkillHit {
  category: string;
  name: string;
  desc: string;
  score?: number;
  ts: string;
}

export interface SkillGroup {
  name: string;
  desc: string;
  category: string;
  count: number; // 같은 스킬 글 총 개수
  usedCount: number; // 점수 있는 글(써봤어요)
  wishCount: number; // 점수 없는 글(찜)
  avgScore?: number; // 써봤어요들의 평균 (소수 1자리)
  ts: string; // 대표(최신) 글 타임스탬프 — 링크용
}

/** 채널 메시지들 중 코드박스 제목으로 파싱되는 것만 골라 hit으로 */
export function messagesToHits(messages: { text?: string; ts?: string }[]): SkillHit[] {
  const hits: SkillHit[] = [];
  for (const m of messages) {
    const parsed = parseTitleLine(m.text ?? '');
    if (parsed && m.ts) {
      hits.push({ ...parsed, ts: m.ts });
    }
  }
  return hits;
}

/** 키워드를 스킬명·설명·카테고리에서 부분일치(대소문자 무시)로 필터 */
export function filterHits(hits: SkillHit[], keyword: string): SkillHit[] {
  const k = keyword.trim().toLowerCase();
  if (!k) return hits;
  return hits.filter(
    (h) =>
      h.name.toLowerCase().includes(k) ||
      h.desc.toLowerCase().includes(k) ||
      h.category.toLowerCase().includes(k)
  );
}

/** 같은 스킬명끼리 합산. 글 많은 순 → 써봤 많은 순 정렬 */
export function groupHits(hits: SkillHit[]): SkillGroup[] {
  type Acc = SkillGroup & { _scoreSum: number; _scoreN: number; _tsNum: number };
  const map = new Map<string, Acc>();
  for (const h of hits) {
    const key = h.name.trim();
    let g = map.get(key);
    if (!g) {
      g = {
        name: h.name,
        desc: h.desc,
        category: h.category,
        count: 0,
        usedCount: 0,
        wishCount: 0,
        avgScore: undefined,
        ts: h.ts,
        _scoreSum: 0,
        _scoreN: 0,
        _tsNum: Number(h.ts),
      };
      map.set(key, g);
    }
    g.count += 1;
    if (h.score) {
      g.usedCount += 1;
      g._scoreSum += h.score;
      g._scoreN += 1;
    } else {
      g.wishCount += 1;
    }
    const tsNum = Number(h.ts);
    if (tsNum >= g._tsNum) {
      g._tsNum = tsNum;
      g.ts = h.ts;
      g.desc = h.desc;
      g.category = h.category;
    }
  }
  const groups: SkillGroup[] = [...map.values()].map((g) => ({
    name: g.name,
    desc: g.desc,
    category: g.category,
    count: g.count,
    usedCount: g.usedCount,
    wishCount: g.wishCount,
    avgScore: g._scoreN ? Math.round((g._scoreSum / g._scoreN) * 10) / 10 : undefined,
    ts: g.ts,
  }));
  groups.sort((a, b) => b.count - a.count || b.usedCount - a.usedCount);
  return groups;
}

/** 슬랙 메시지 영구 링크 (API 호출 없이 구성) */
export function slackArchiveLink(channelId: string, ts: string): string {
  return `https://slack.com/archives/${channelId}/p${ts.replace('.', '')}`;
}

/** 검색 결과 → 에페메럴 mrkdwn 텍스트 */
export function buildSearchText(
  keyword: string,
  groups: SkillGroup[],
  channelId: string,
  max = 5
): string {
  if (groups.length === 0) {
    return `🤔 "${keyword}" — 채널엔 아직 없네요.\n클로드코드에서 에밀리가 만든 *skillers-finder* 를 돌려보세요!`;
  }
  const lines: string[] = [`🔍 "${keyword}" 스킬 ${groups.length}개 찾았어요`];
  groups.slice(0, max).forEach((g, i) => {
    const link = slackArchiveLink(channelId, g.ts);
    const meta: string[] = [];
    if (g.avgScore !== undefined) meta.push(`평균 ${g.avgScore}/5`);
    if (g.usedCount) meta.push(`써봤 ${g.usedCount}`);
    if (g.wishCount) meta.push(`찜 ${g.wishCount}`);
    const metaStr = meta.length ? ` · ${meta.join(' · ')}` : '';
    lines.push(`${i + 1}. <${link}|${g.name}> - ${g.desc}${metaStr}`);
  });
  if (groups.length > max) lines.push(`…외 ${groups.length - max}개 더`);
  return lines.join('\n');
}
