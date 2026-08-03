import { describe, it, expect } from 'vitest';
import { messagesToHits, filterHits, groupHits, buildSearchText, slackArchiveLink } from '@/lib/search';

const T = (line: string) => '```\n' + line + '\n```';

describe('search', () => {
  it('messagesToHits: 제목만 파싱, 나머지 무시', () => {
    const hits = messagesToHits([
      { text: T('[개발] 비디오메이커 - 코드로 영상 · 4/5'), ts: '1.1' },
      { text: '그냥 댓글', ts: '1.2' },
      { text: T('[기획] OS인터뷰 - 재료 정리'), ts: '1.3' },
    ]);
    expect(hits).toHaveLength(2);
    expect(hits[0]).toMatchObject({ name: '비디오메이커', score: 4 });
    expect(hits[1]).toMatchObject({ name: 'OS인터뷰', score: undefined });
  });

  it('filterHits: 이름·설명·카테고리 부분일치(대소문자무시)', () => {
    const hits = messagesToHits([
      { text: T('[개발] VideoMaker - 코드로 영상'), ts: '1.1' },
      { text: T('[기획] OS인터뷰 - 재료 정리'), ts: '1.2' },
    ]);
    expect(filterHits(hits, 'video').map((h) => h.name)).toEqual(['VideoMaker']);
    expect(filterHits(hits, '정리').map((h) => h.name)).toEqual(['OS인터뷰']);
    expect(filterHits(hits, '개발').map((h) => h.name)).toEqual(['VideoMaker']);
    expect(filterHits(hits, '없는키워드')).toHaveLength(0);
  });

  it('groupHits: 같은 이름 합산 + 평균점수 + 최신 정렬', () => {
    const hits = messagesToHits([
      { text: T('[개발] A - 설명 · 4/5'), ts: '3.0' },
      { text: T('[개발] A - 설명 · 2/5'), ts: '5.0' },
      { text: T('[개발] A - 설명'), ts: '1.0' },
      { text: T('[기획] B - 설명 · 5/5'), ts: '2.0' },
    ]);
    const groups = groupHits(hits);
    expect(groups[0].name).toBe('A'); // 글 3개라 먼저
    expect(groups[0].count).toBe(3);
    expect(groups[0].usedCount).toBe(2);
    expect(groups[0].wishCount).toBe(1);
    expect(groups[0].avgScore).toBe(3); // (4+2)/2
    expect(groups[0].ts).toBe('5.0'); // 최신 글
    expect(groups[1].name).toBe('B');
  });

  it('buildSearchText: 결과 있음', () => {
    const groups = groupHits(messagesToHits([{ text: T('[개발] A - 설명 · 4/5'), ts: '5.0' }]));
    const text = buildSearchText('A', groups, 'C1');
    expect(text).toContain('🔍 "A" 스킬 1개 찾았어요');
    expect(text).toContain('평균 4/5');
    expect(text).toContain(slackArchiveLink('C1', '5.0'));
  });

  it('buildSearchText: 결과 없음 → finder 안내', () => {
    const text = buildSearchText('없음', [], 'C1');
    expect(text).toContain('skillers-finder');
  });

  it('slackArchiveLink: ts 점 제거 + p접두', () => {
    expect(slackArchiveLink('C1', '111.222')).toBe('https://slack.com/archives/C1/p111222');
  });
});
