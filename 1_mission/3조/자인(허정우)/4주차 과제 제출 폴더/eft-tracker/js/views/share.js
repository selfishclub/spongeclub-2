import { el } from '../util.js';
import { SHARE_MESSAGE } from '../data.js';

// 나누기 — 챌린지 · 공유하기 (리워드) · 후속 기능 자리
export function renderShare(root, ctx) {
  root.appendChild(el('section', { class: 'view share' },
    el('h1', { text: '나누기' }),
    el('div', { class: 'card soft' },
      el('p', { class: 'quote', text: SHARE_MESSAGE }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '챌린지' }),
      el('p', { class: 'hint', text: '함께 실천하고 순위를 확인하는 챌린지가 준비 중입니다. (리워드 예정)' }),
      el('button', { class: 'primary', disabled: 'true', text: '챌린지 (준비 중)' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '공유하기' }),
      el('p', { class: 'hint', text: '오늘 경험이 좋았다면, 사랑하는 사람에게 이 앱을 알려주세요.' }),
      el('button', { class: 'primary', disabled: 'true', text: '공유하기 (준비 중)' }),
    ),
    el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }),
  ));
}
