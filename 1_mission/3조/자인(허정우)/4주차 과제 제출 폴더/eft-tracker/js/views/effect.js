import { el } from '../util.js';

// EFT효과 — 실천 사례 공유 (리워드) · 후속 기능 자리
export function renderEffect(root, ctx) {
  root.appendChild(el('section', { class: 'view effect' },
    el('h1', { text: 'EFT효과' }),
    el('p', { class: 'lead', text: '나의 EFT 실천 사례와 변화를 올리고, 다른 사람의 사례에서 힌트를 얻어보세요.' }),
    el('div', { class: 'card' },
      el('h2', { text: '내 사례 올리기' }),
      el('p', { class: 'hint', text: '실천 전후의 변화를 사례로 남기면 리워드가 주어질 예정입니다.' }),
      el('button', { class: 'primary', disabled: 'true', text: '사례 올리기 (준비 중)' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '다른 사람의 사례' }),
      el('p', { class: 'empty', text: '사례 게시판이 곧 연결됩니다.' }),
    ),
    el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }),
  ));
}
