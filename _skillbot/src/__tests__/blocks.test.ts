import { describe, it, expect } from 'vitest';
import { buildSubmitModal, buildDetailText } from '@/lib/blocks';
import { IDS } from '@/lib/ids';

describe('blocks', () => {
  it('모달: callback_id·private_metadata·필수 블록', () => {
    const view = buildSubmitModal('C123');
    expect(view.callback_id).toBe(IDS.submitCallback);
    expect(view.private_metadata).toBe('C123');
    const blockIds = view.blocks.filter((b: any) => b.block_id).map((b: any) => b.block_id);
    for (const id of [IDS.category, IDS.name, IDS.desc, IDS.score, IDS.whatIsIt, IDS.whatDoes, IDS.extra, IDS.link]) {
      expect(blockIds).toContain(id);
    }
    const scoreBlock = view.blocks.find((b: any) => b.block_id === IDS.score);
    expect(scoreBlock.optional).toBe(true);
    const extraBlock = view.blocks.find((b: any) => b.block_id === IDS.extra);
    expect(extraBlock.optional).toBe(true);
  });

  it('댓글 텍스트: 섹션·멘션·하단 안내, extra 없으면 생략', () => {
    const text = buildDetailText(
      { category: '개발', name: 'X', desc: 'd', score: 4, whatIsIt: '설명문', whatDoes: '• a\n• b', link: 'https://e.com' },
      'U999'
    );
    expect(text).toContain('💬 AI는 최대한 빼고');
    expect(text).toContain('🧩 *어떤 스킬인가요?*');
    expect(text).toContain('설명문');
    expect(text).toContain('✨ *어떤 걸 해주나요?*');
    expect(text).toContain('🔗 링크  https://e.com');
    expect(text).toContain('올린 사람 <@U999>');
    expect(text).toContain('📎 영상·이미지');
    expect(text).not.toContain('📝 *더 하고 싶은 말*');
    // 올린 사람은 맨 위 (스킬 섹션보다 먼저)
    expect(text.indexOf('올린 사람')).toBeLessThan(text.indexOf('🧩'));
  });

  it('모달 맨 하단에 결과물 첨부 안내 context', () => {
    const view = buildSubmitModal('C1');
    const last = view.blocks[view.blocks.length - 1];
    expect(last.type).toBe('context');
    expect(last.elements[0].text).toContain('결과물');
  });

  it('댓글 텍스트: extra 있으면 포함', () => {
    const text = buildDetailText(
      { category: '개발', name: 'X', desc: 'd', whatIsIt: 's', whatDoes: 'w', extra: '자유메모', link: 'https://e.com' },
      'U1'
    );
    expect(text).toContain('📝 *더 하고 싶은 말*');
    expect(text).toContain('자유메모');
  });
});
