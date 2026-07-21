import { el } from '../util.js';
import { EFT_TAP_POINTS, EFT_GUIDE_STEPS } from '../data.js';

export function renderGuide(root, ctx) {
  root.appendChild(el('section', { class: 'view guide' },
    el('h1', { text: 'EFT 처음이신가요?' }),
    el('div', { class: 'card' },
      el('ul', { class: 'guide-steps' },
        ...EFT_GUIDE_STEPS.map((s) => el('li', { text: s })),
      ),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '타점 순서' }),
      el('ol', { class: 'tap-list' },
        ...EFT_TAP_POINTS.map((p) => el('li', {},
          el('strong', { text: p.name }),
          el('span', { class: 'hint', text: ' — ' + p.hint }),
        )),
      ),
    ),
    el('div', { class: 'row' },
      el('button', { class: 'ghost', onClick: () => ctx.navigate('dashboard'), text: '나중에' }),
      el('button', {
        class: 'primary',
        onClick: () => { ctx.store.setEftGuideSeen(); ctx.navigate('session'); },
        text: '이해했어요, EFT 시작',
      }),
    ),
  ));
}
