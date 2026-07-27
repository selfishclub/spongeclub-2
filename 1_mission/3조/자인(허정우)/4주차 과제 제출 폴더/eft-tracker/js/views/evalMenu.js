import { el } from '../util.js';

export function renderEvalMenu(root, ctx) {
  const item = (label, sub, route) => {
    const btn = el('button', { class: 'menu-item', onClick: () => ctx.navigate(route) },
      el('span', { class: 'menu-title', text: label }),
      el('span', { class: 'menu-sub', text: sub }));
    return btn;
  };
  root.appendChild(el('section', { class: 'view home' },
    el('h1', { text: '감정평가' }),
    el('div', { class: 'menu-list' },
      item('감정평가 1단계', '줄이고 싶은 부정적 감정', 'eval1'),
      item('감정평가 2단계', '강화하고 싶은 긍정적 감정', 'eval2'),
    ),
  ));
}
