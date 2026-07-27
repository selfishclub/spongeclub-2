import { el } from '../util.js';
import { TAP_LEVELS } from '../data.js';
import { mediaSlot } from '../media.js';
import { TAP_IMAGE_BY_LEVEL } from '../tapImages.js';

export function renderLevels(root, ctx) {
  const section = el('section', { class: 'view levels' },
    el('h1', { text: '태핑 레벨' }),
    el('p', { class: 'lead', text: 'Lv.1로 충분하지 않을 때 단계를 넓혀갑니다. Lv.1이 잘 되신 분도 추가로 하시면 더욱 좋습니다.' }),
  );

  const body = el('div', { class: 'level-body' });
  const tabs = el('div', { class: 'tabs' });

  function show(levelId) {
    const level = TAP_LEVELS.find((l) => l.id === levelId);
    for (const btn of tabs.children) btn.classList.toggle('active', btn.dataset.level === levelId);
    body.innerHTML = '';
    body.appendChild(el('div', { class: 'card' },
      el('h2', { text: `태핑 ${level.name} — ${level.title}` }),
      el('p', { text: level.description }),
      TAP_IMAGE_BY_LEVEL[levelId] ? TAP_IMAGE_BY_LEVEL[levelId]() : null,
      el('ol', { class: 'tap-list' }, ...level.points.map((p) => el('li', {},
        el('strong', { text: p.name }),
        el('span', { class: 'hint', text: ' — ' + p.hint })))),
      mediaSlot(`태핑 ${level.name} 시연 영상`),
    ));
  }

  for (const level of TAP_LEVELS) {
    const btn = el('button', { class: 'tab', type: 'button', text: `태핑 ${level.name}` });
    btn.dataset.level = level.id;
    btn.addEventListener('click', () => show(level.id));
    tabs.appendChild(btn);
  }

  section.appendChild(tabs);
  section.appendChild(body);
  section.appendChild(el('button', { class: 'primary big', onClick: () => ctx.navigate('dashboard'), text: '홈으로' }));
  root.appendChild(section);
  show('lv1');
}
