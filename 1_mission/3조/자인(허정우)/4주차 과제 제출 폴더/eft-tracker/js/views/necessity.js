import { el } from '../util.js';
import { LEARN_SECTIONS, MOTIVATION_PROMPT, SHARE_MESSAGE } from '../data.js';

export function renderNecessity(root, ctx) {
  const risk = LEARN_SECTIONS.find((s) => s.id === 'risk');
  const section = el('section', { class: 'view necessity' },
    el('h1', { text: 'EFT의 필요성' }),
    el('div', { class: 'card soft' },
      el('p', { class: 'quote big', text: MOTIVATION_PROMPT }),
      el('p', { text: '한국 사람은 흔히 내 필요보다 관계에서 오는 필요에 더 민감하게 반응합니다. 나를 돌보는 일이 곧 나를 사랑하는 사람들을 돌보는 일입니다.' }),
    ),
  );

  if (risk) {
    const card = el('div', { class: 'card' }, el('h2', { text: risk.title }));
    for (const line of risk.body) card.appendChild(el('p', { text: line }));
    section.appendChild(card);
  }

  section.appendChild(el('div', { class: 'card' },
    el('h2', { text: '그리고, 나눔' }),
    el('p', { class: 'hint', text: SHARE_MESSAGE }),
  ));

  section.appendChild(el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }));
  root.appendChild(section);
}
