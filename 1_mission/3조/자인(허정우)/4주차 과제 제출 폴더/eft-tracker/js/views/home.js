import { el } from '../util.js';

export function renderHome(root, ctx) {
  const state = ctx.store.load();
  const greeting = state.nickname ? `${state.nickname}님, 오늘 마음은 어떠세요?` : '오늘 마음은 어떠세요?';

  const item = (label, sub, route) => {
    const btn = el('button', { class: 'menu-item', onClick: () => ctx.navigate(route) },
      el('span', { class: 'menu-title', text: label }));
    if (sub) btn.appendChild(el('span', { class: 'menu-sub', text: sub }));
    return btn;
  };

  root.appendChild(el('section', { class: 'view home' },
    el('h1', { class: 'greeting', text: greeting }),
    el('div', { class: 'menu-list' },
      item('EFT란?', null, 'learn'),
      item('EFT의 필요성', null, 'necessity'),
      item('진도표', null, 'progress'),
      item('감정평가 1단계', '줄이고 싶은 부정적 감정', 'eval1'),
      item('감정평가 2단계', '강화하고 싶은 긍정적 감정', 'eval2'),
      item('태핑 1단계', null, 'tap1'),
      item('태핑 2단계', null, 'tap2'),
      item('태핑 3단계', null, 'tap3'),
      item('EFT효과', null, 'effect'),
      item('나누기', null, 'share'),
    ),
  ));
}
