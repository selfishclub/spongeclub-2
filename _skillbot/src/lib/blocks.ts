import { IDS } from './ids';
import { CATEGORIES, SCORE_OPTIONS } from './categories';

export interface SubmissionValues {
  category: string;
  name: string;
  desc: string;
  score?: number;
  whatIsIt: string;
  whatDoes: string;
  extra?: string;
  link: string;
}

function textInput(blockId: string, label: string, opts: { multiline?: boolean; optional?: boolean; placeholder?: string } = {}): any {
  return {
    type: 'input',
    block_id: blockId,
    optional: !!opts.optional,
    label: { type: 'plain_text', text: label, emoji: true },
    element: {
      type: 'plain_text_input',
      action_id: blockId,
      multiline: !!opts.multiline,
      ...(opts.placeholder ? { placeholder: { type: 'plain_text', text: opts.placeholder } } : {}),
    },
  };
}

function categorySelect(): any {
  return {
    type: 'input',
    block_id: IDS.category,
    label: { type: 'plain_text', text: '카테고리' },
    element: {
      type: 'static_select',
      action_id: IDS.category,
      placeholder: { type: 'plain_text', text: '고르기' },
      options: CATEGORIES.map((c) => ({ text: { type: 'plain_text', text: c }, value: c })),
    },
  };
}

function scoreSelect(): any {
  return {
    type: 'input',
    block_id: IDS.score,
    optional: true,
    label: { type: 'plain_text', text: '점수 (안 써봤으면 비워둬 = 찜)' },
    element: {
      type: 'static_select',
      action_id: IDS.score,
      placeholder: { type: 'plain_text', text: '안 써봄' },
      options: SCORE_OPTIONS.map((o) => ({ text: { type: 'plain_text', text: o.text }, value: o.value })),
    },
  };
}

export function buildSubmitModal(channelId: string): any {
  return {
    type: 'modal',
    callback_id: IDS.submitCallback,
    private_metadata: channelId,
    title: { type: 'plain_text', text: '스킬 올리기' },
    submit: { type: 'plain_text', text: '올리기' },
    close: { type: 'plain_text', text: '취소' },
    blocks: [
      { type: 'context', elements: [{ type: 'mrkdwn', text: '💬 AI는 최대한 빼고, 본인 말로 편하게 써주세요!' }] },
      categorySelect(),
      textInput(IDS.name, '스킬명', { placeholder: '예: copywriting' }),
      textInput(IDS.desc, '한 줄 설명', { placeholder: '예: 안 팔리는 카피를 팔리는 카피로 고쳐주는 스킬' }),
      scoreSelect(),
      textInput(IDS.whatIsIt, '🧩 어떤 스킬인가요?', {
        multiline: true,
        placeholder: '예: 카피가 밋밋할 때 쓰는 스킬이에요. "이거 왜 안 와닿지" 싶은 문장을 헤드라인부터 CTA까지 손봐줘요.',
      }),
      textInput(IDS.whatDoes, '✨ 어떤 걸 해주나요?', {
        multiline: true,
        placeholder: '예: 카피 붙여넣고 "더 팔리게 고쳐줘" 하면 버전 몇 개 뽑아줘요. 톤(친근/전문)도 골라 맞춰주고요.',
      }),
      textInput(IDS.extra, '📝 더 하고 싶은 말', {
        multiline: true,
        optional: true,
        placeholder: '어떤 상황에서 써봤는지, 어떤 사람에게 추천하는지, 어떤 점에서 막히는지 등 — 자세할수록 좋아요!',
      }),
      textInput(IDS.link, '🔗 링크', { placeholder: 'https://...' }),
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '📎 영상·이미지 등 결과물은 올린 뒤 이 스레드에 댓글로 같이 올려주세요!' },
        ],
      },
    ],
  };
}

export function buildDetailText(v: SubmissionValues, userId: string): string {
  const lines: string[] = [];
  lines.push(`🙋 올린 사람 <@${userId}>`);
  lines.push('');
  lines.push('💬 AI는 최대한 빼고, 본인 말로 편하게 써주세요!');
  lines.push('');
  lines.push('🧩 *어떤 스킬인가요?*');
  lines.push(v.whatIsIt.trim());
  lines.push('');
  lines.push('✨ *어떤 걸 해주나요?*');
  lines.push(v.whatDoes.trim());
  if (v.extra && v.extra.trim()) {
    lines.push('');
    lines.push('📝 *더 하고 싶은 말*');
    lines.push(v.extra.trim());
  }
  lines.push('');
  lines.push(`🔗 링크  ${v.link.trim()}`);
  lines.push('');
  lines.push('📎 영상·이미지 등 결과물은 이 스레드에 댓글로 같이 올려주세요!');
  return lines.join('\n');
}
