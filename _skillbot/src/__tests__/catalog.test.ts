import { describe, it, expect } from 'vitest';
import { groupsToCatalog } from '../lib/catalog';
import type { SkillGroup } from '../lib/search';

function g(over: Partial<SkillGroup>): SkillGroup {
  return {
    name: 'n', desc: 'd', category: '기획',
    count: 1, usedCount: 0, wishCount: 1, avgScore: undefined,
    ts: '100.000000', ...over,
  };
}

describe('groupsToCatalog', () => {
  it('카테고리 6종 고정 순서로 섹션을 만든다', () => {
    const groups = [
      g({ name: 'a', category: '디자인' }),
      g({ name: 'b', category: '기획' }),
      g({ name: 'c', category: '개발' }),
    ];
    const sections = groupsToCatalog(groups, 'C123');
    expect(sections.map((s) => s.category)).toEqual(['기획', '개발', '디자인']);
  });

  it('스킬 없는 카테고리 섹션은 생략한다', () => {
    const sections = groupsToCatalog([g({ category: '마케팅' })], 'C123');
    expect(sections).toHaveLength(1);
    expect(sections[0].category).toBe('마케팅');
  });

  it('섹션 내부는 최근순(ts desc)으로 정렬한다', () => {
    const groups = [
      g({ name: 'old', category: '기획', ts: '100.000000' }),
      g({ name: 'new', category: '기획', ts: '300.000000' }),
      g({ name: 'mid', category: '기획', ts: '200.000000' }),
    ];
    const items = groupsToCatalog(groups, 'C123')[0].items;
    expect(items.map((i) => i.name)).toEqual(['new', 'mid', 'old']);
  });

  it('6종 밖 카테고리는 뒤에 붙인다', () => {
    const sections = groupsToCatalog(
      [g({ category: '기획' }), g({ category: '기타' })],
      'C123'
    );
    expect(sections.map((s) => s.category)).toEqual(['기획', '기타']);
  });

  it('slackLink를 채널ID+ts로 만든다', () => {
    const item = groupsToCatalog([g({ ts: '1712345678.000100' })], 'C123')[0].items[0];
    expect(item.slackLink).toBe('https://slack.com/archives/C123/p1712345678000100');
  });
});
