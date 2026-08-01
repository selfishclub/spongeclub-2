import { el } from '../util.js';
import { TAP_LEVELS, SETUP_AFFIRMATION_TEMPLATE } from '../data.js';
import { TAP_IMAGE_BY_LEVEL } from '../tapImages.js';
import { pointLocation } from '../pointImages.js';

const GUIDE_STEPS = [
  'EFT는 침 없이 손끝으로 특정 지점(타점)을 가볍게 두드리며 감정과 에너지를 다스리는 자가치유법입니다.',
  '먼저 힘들었던 상황과 그때의 감정을 떠올리고, 그 강도를 0~10으로 체크합니다.',
  '그 느낌이 몸의 어디에 있는지 찾고, 크기·무게·온도·색깔·모양·촉감으로 생생하게 그려봅니다.',
  '수용확언을 되뇌이며 손날(후계혈)을 두드린 뒤, 타점을 순서대로 두드립니다.',
  '뇌조율과 심호흡을 거친 뒤, 감정의 강도를 다시 확인합니다.',
];

export function renderGuide(root, ctx) {
  const lv1 = TAP_LEVELS.find((l) => l.id === 'lv1');

  root.appendChild(el('section', { class: 'view guide' },
    el('h1', { text: 'EFT 처음이신가요?' }),

    el('div', { class: 'card' },
      el('ul', { class: 'guide-steps' }, ...GUIDE_STEPS.map((s) => el('li', { text: s }))),
    ),

    el('div', { class: 'card' },
      el('h2', { text: '핵심은 수용확언입니다' }),
      el('p', { class: 'affirm', text: SETUP_AFFIRMATION_TEMPLATE }),
      el('p', { class: 'hint', text: '이 문장을 되뇌이면서 손날 타점을 가볍게 두드리는 것으로 시작합니다.' }),
    ),

    el('div', { class: 'card' },
      el('h2', { text: `기본 타점 (1단계 · ${lv1.title})` }),
      el('p', { class: 'hint', text: lv1.description }),
      el('ol', { class: 'tap-list' }, ...lv1.points.map((p) => el('li', {},
        el('div', { class: 'pt-row' },
          el('strong', { text: p.name }),
          el('span', { class: 'hint', text: ' — ' + p.hint })),
        pointLocation(p.name, () => TAP_IMAGE_BY_LEVEL.lv1()),
      ))),
      el('p', { class: 'hint', text: '2단계 이상의 태핑은 "EFT태핑" 메뉴에서 볼 수 있습니다.' }),
    ),

    el('div', { class: 'row' },
      el('button', { class: 'ghost', onClick: () => ctx.navigate('home'), text: '홈으로' }),
      el('button', {
        class: 'primary',
        onClick: () => { ctx.store.setEftGuideSeen(); ctx.navigate('eval1'); },
        text: '감정평가 시작',
      }),
    ),
  ));
}
