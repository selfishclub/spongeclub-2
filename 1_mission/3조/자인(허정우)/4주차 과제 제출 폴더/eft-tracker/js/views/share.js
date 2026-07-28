import { el } from '../util.js';
import { SHARE_MESSAGE } from '../data.js';

// 나누기 — 다른 사람의 사례 · 내 사례 올리기 · 챌린지 · 공유하기 (후속 기능 자리)
export function renderShare(root, ctx) {
  root.appendChild(el('section', { class: 'view share' },
    el('h1', { text: '나누기' }),

    el('div', { class: 'card' },
      el('h2', { text: '다른 사람의 사례' }),
      el('p', { class: 'empty', text: '사례 게시판이 곧 연결됩니다.' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '내 사례 올리기' }),
      el('p', { class: 'hint', text: '실천 전후의 변화를 사례로 남기면 리워드가 주어질 예정입니다.' }),
      el('button', { class: 'primary', disabled: 'true', text: '사례 올리기 (준비 중)' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '챌린지' }),
      el('p', { class: 'hint', text: '함께 실천하고 순위를 확인하는 챌린지가 준비 중입니다. (리워드 예정)' }),
      el('button', { class: 'primary', disabled: 'true', text: '챌린지 (준비 중)' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '공유하기' }),
      el('p', { class: 'hint', text: SHARE_MESSAGE }),
      el('button', { class: 'primary', disabled: 'true', text: '공유하기 (준비 중)' }),
    ),

    el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }),
  ));
}
