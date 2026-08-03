import { describe, it, expect } from 'vitest';
import { extractSubmission } from '@/lib/fields';
import { IDS } from '@/lib/ids';

function view(values: Record<string, any>) {
  return { state: { values } };
}

describe('extractSubmission', () => {
  it('점수 있는 제출 추출', () => {
    const v = view({
      [IDS.category]: { [IDS.category]: { selected_option: { value: '개발' } } },
      [IDS.name]: { [IDS.name]: { value: '비디오메이커' } },
      [IDS.desc]: { [IDS.desc]: { value: '코드로 영상 만들어주는 스킬' } },
      [IDS.score]: { [IDS.score]: { selected_option: { value: '4' } } },
      [IDS.whatIsIt]: { [IDS.whatIsIt]: { value: '설명' } },
      [IDS.whatDoes]: { [IDS.whatDoes]: { value: '• 기능' } },
      [IDS.extra]: { [IDS.extra]: { value: '메모' } },
      [IDS.link]: { [IDS.link]: { value: 'https://e.com' } },
    });
    expect(extractSubmission(v)).toEqual({
      category: '개발', name: '비디오메이커', desc: '코드로 영상 만들어주는 스킬',
      score: 4, whatIsIt: '설명', whatDoes: '• 기능', extra: '메모', link: 'https://e.com',
    });
  });

  it('점수·메모 없으면 undefined', () => {
    const v = view({
      [IDS.category]: { [IDS.category]: { selected_option: { value: '기획' } } },
      [IDS.name]: { [IDS.name]: { value: 'X' } },
      [IDS.desc]: { [IDS.desc]: { value: 'd' } },
      [IDS.score]: { [IDS.score]: { selected_option: null } },
      [IDS.whatIsIt]: { [IDS.whatIsIt]: { value: 's' } },
      [IDS.whatDoes]: { [IDS.whatDoes]: { value: 'w' } },
      [IDS.extra]: { [IDS.extra]: { value: '' } },
      [IDS.link]: { [IDS.link]: { value: 'https://e.com' } },
    });
    const r = extractSubmission(v);
    expect(r.score).toBeUndefined();
    expect(r.extra).toBeUndefined();
  });
});
