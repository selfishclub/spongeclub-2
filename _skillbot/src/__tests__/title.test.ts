import { describe, it, expect } from 'vitest';
import { buildTitleLine, buildTitleCodeBlock, parseTitleLine } from '@/lib/title';

describe('title', () => {
  const used = { category: '개발', name: '비디오메이커', desc: '코드로 영상 만들어주는 스킬', score: 4 };
  const wish = { category: '기획', name: '내 OS 인터뷰', desc: 'OS재료 정리해주는 인터뷰 스킬' };

  it('점수 있으면 · N/5 붙음', () => {
    expect(buildTitleLine(used)).toBe('[개발] 비디오메이커 - 코드로 영상 만들어주는 스킬 · 4/5');
  });
  it('점수 없으면 생략', () => {
    expect(buildTitleLine(wish)).toBe('[기획] 내 OS 인터뷰 - OS재료 정리해주는 인터뷰 스킬');
  });
  it('코드박스로 감쌈', () => {
    expect(buildTitleCodeBlock(used)).toBe('```\n[개발] 비디오메이커 - 코드로 영상 만들어주는 스킬 · 4/5\n```');
  });
  it('roundtrip(점수 있음)', () => {
    expect(parseTitleLine(buildTitleCodeBlock(used))).toEqual(used);
  });
  it('roundtrip(점수 없음)', () => {
    expect(parseTitleLine(buildTitleLine(wish))).toEqual({ ...wish, score: undefined });
  });
  it('포맷 안 맞으면 null', () => {
    expect(parseTitleLine('아무 말')).toBeNull();
  });
  it('en-dash(–) 구분기호도 파싱 — 손으로 친 글', () => {
    expect(parseTitleLine('[기획] 내 OS 인터뷰 스킬 – OS재료를 정리해주는 인터뷰 스킬')).toEqual({
      category: '기획',
      name: '내 OS 인터뷰 스킬',
      desc: 'OS재료를 정리해주는 인터뷰 스킬',
      score: undefined,
    });
  });
  it('em-dash(—) + 점수도 파싱', () => {
    expect(parseTitleLine('[자동화] 수퍼파워(superpowers) — 클로드코드 필수 스킬 · 5/5')).toEqual({
      category: '자동화',
      name: '수퍼파워(superpowers)',
      desc: '클로드코드 필수 스킬',
      score: 5,
    });
  });
  it('single backtick(인라인코드) 감싼 제목도 파싱', () => {
    expect(parseTitleLine('`[기획] 내 OS 인터뷰 스킬 – OS재료를 정리해주는 인터뷰 스킬`')).toEqual({
      category: '기획',
      name: '내 OS 인터뷰 스킬',
      desc: 'OS재료를 정리해주는 인터뷰 스킬',
      score: undefined,
    });
  });
  it('점수 구분점 공백 없어도(·N/5) 파싱', () => {
    expect(parseTitleLine('[콘텐츠] 리모션 - 코드로 영상 만들어주는 스킬·3/5')).toEqual({
      category: '콘텐츠',
      name: '리모션',
      desc: '코드로 영상 만들어주는 스킬',
      score: 3,
    });
  });
});
