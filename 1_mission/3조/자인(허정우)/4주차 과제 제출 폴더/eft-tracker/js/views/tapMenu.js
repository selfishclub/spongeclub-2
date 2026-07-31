import { el } from '../util.js';

export function renderTapMenu(root, ctx) {
  const item = (label, route) =>
    el('button', { class: 'menu-item', onClick: () => ctx.navigate(route) },
      el('span', { class: 'menu-title', text: label }));
  root.appendChild(el('section', { class: 'view home' },
    el('h1', { text: 'EFT 태핑' }),
    el('p', { class: 'lead', text: '감정평가를 먼저 하신 뒤, 한 단계씩 태핑하고 재평가합니다.' }),
    el('div', { class: 'menu-list' },
      item('태핑 1단계', 'tap1'),
      item('태핑 2단계', 'tap2'),
      item('태핑 3단계', 'tap3'),
    ),
  ));
}
