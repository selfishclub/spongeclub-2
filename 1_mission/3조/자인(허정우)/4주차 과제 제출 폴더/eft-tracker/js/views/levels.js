import { el } from '../util.js';
import { TAP_LEVELS } from '../data.js';

function mediaSlot(label) {
  return el('div', { class: 'media-slot' }, el('span', { text: `🎬 ${label} — 자료 준비 중` }));
}

export function renderLevels(root, ctx) {
  const section = el('section', { class: 'view levels' },
    el('h1', { text: '타점 레벨' }),
    el('p', { class: 'lead', text: 'Lv.1로 충분하지 않을 때 단계를 넓혀갑니다. Lv.1이 잘 되신 분도 추가로 하시면 더욱 좋습니다.' }),
  );

  const body = el('div', { class: 'level-body' });
  const tabs = el('div', { class: 'tabs' });

  function show(levelId) {
    const level = TAP_LEVELS.find((l) => l.id === levelId);
    for (const btn of tabs.children) {
      btn.classList.toggle('active', btn.dataset.level === levelId);
    }
    body.innerHTML = '';
    body.appendChild(el('div', { class: 'card' },
      el('h2', { text: `${level.name} — ${level.title}` }),
      el('p', { text: level.description }),
      ...(level.points.length
        ? [
            el('ol', { class: 'tap-list' }, ...level.points.map((p) => el('li', {},
              el('strong', { text: p.name }),
              el('span', { class: 'hint', text: ' — ' + p.hint }),
            ))),
            mediaSlot(`${level.name} 타점 위치 이미지`),
            mediaSlot(`${level.name} 시연 영상`),
          ]
        : []),
      ...(level.guide
        ? [el('ol', { class: 'guide-steps' }, ...level.guide.map((g) => el('li', { text: g })))]
        : []),
    ));
  }

  for (const level of TAP_LEVELS) {
    const btn = el('button', { class: 'tab', type: 'button', text: level.name });
    btn.dataset.level = level.id;
    btn.addEventListener('click', () => show(level.id));
    tabs.appendChild(btn);
  }

  section.appendChild(tabs);
  section.appendChild(body);
  section.appendChild(el('button', {
    class: 'primary big',
    onClick: () => ctx.navigate('dashboard'),
    text: '홈으로',
  }));

  root.appendChild(section);
  show('lv2');
}
