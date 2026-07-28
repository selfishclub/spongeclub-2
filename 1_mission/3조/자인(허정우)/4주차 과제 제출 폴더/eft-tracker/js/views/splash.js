import { el } from '../util.js';

const TITLE = 'EFT - 나를 스스로 정화하는 감정 치유';

// 제목을 한 글자씩 그라데이션 색으로 렌더한다.
function gradientTitle(text) {
  const chars = [...text];
  const colored = chars.filter((c) => c.trim().length);
  let n = 0;
  const total = colored.length;
  const h = el('h1', { class: 'splash-title' });
  for (const ch of chars) {
    if (ch.trim().length === 0) {
      h.appendChild(document.createTextNode(ch));
      continue;
    }
    const hue = Math.round((n / Math.max(1, total - 1)) * 285); // 빨강→보라
    n += 1;
    h.appendChild(el('span', { style: `color: hsl(${hue}, 72%, 52%)`, text: ch }));
  }
  return h;
}

export function renderSplash(root, ctx) {
  const state = ctx.store.load();
  const enter = () => {
    ctx.store.setSplashSeen(); // 한 번 보면 다음부턴 이 화면을 건너뜀
    ctx.navigate(state.onboardingDone ? 'home' : 'onboarding');
  };
  root.appendChild(el('section', { class: 'view splash' },
    gradientTitle(TITLE),
    el('p', { class: 'splash-sub', text: '손끝으로 감정을 다스리는 자가치유' }),
    el('button', { class: 'primary big', onClick: enter, text: '들어가기' }),
    el('button', { class: 'ghost skip', onClick: enter, text: '건너뛰기 (다음부터 바로 시작)' }),
  ));
}
