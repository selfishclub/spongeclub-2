export const CATEGORIES = ['기획', '콘텐츠', '개발', '마케팅', '자동화', '디자인'] as const;
export type Category = (typeof CATEGORIES)[number];

export const SCORE_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  text: `${n}/5`,
  value: String(n),
}));
