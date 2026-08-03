import { describe, it, expect } from 'vitest';
import { CATEGORIES, SCORE_OPTIONS } from '@/lib/categories';

describe('categories', () => {
  it('카테고리 6종', () => {
    expect(CATEGORIES).toEqual(['기획', '콘텐츠', '개발', '마케팅', '자동화', '디자인']);
  });
  it('점수 옵션 1~5', () => {
    expect(SCORE_OPTIONS.map((o) => o.value)).toEqual(['1', '2', '3', '4', '5']);
    expect(SCORE_OPTIONS[3].text).toBe('4/5');
  });
});
