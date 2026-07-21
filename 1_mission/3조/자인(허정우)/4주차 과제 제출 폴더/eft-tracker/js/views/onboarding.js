import { el } from '../util.js';

export function renderOnboarding(root, ctx) {
  root.appendChild(el('section', { class: 'view onboarding' },
    el('h1', { text: 'EFT 정서케어 트래커' }),
    el('p', { class: 'lead', text: '침 없이, 손끝으로 타점을 두드려 감정을 다스리는 오픈소스 자가치료법(EFT)입니다.' }),
    el('div', { class: 'card' },
      el('h2', { text: '누가 만들었나요?' }),
      el('p', { text: '17년차 한의사 · 암 한방병원장이 임상 경험을 바탕으로 설계했습니다. 매일의 감정을 스스로 체크하고, 그 자리에서 다스린 뒤 변화를 눈으로 확인하는 습관을 돕습니다.' }),
    ),
    el('div', { class: 'card' },
      el('h2', { text: '어떻게 쓰나요?' }),
      el('ol', { class: 'howto' },
        el('li', { text: '오늘의 감정 상태를 자가진단(15문항)합니다.' }),
        el('li', { text: 'EFT 8단계를 따라 감정을 다스립니다.' }),
        el('li', { text: '전후 변화가 숫자로 기록되고, 추이가 그래프로 쌓입니다.' }),
      ),
    ),
    el('button', {
      class: 'primary big',
      onClick: () => { ctx.store.setOnboardingDone(); ctx.navigate('dashboard'); },
      text: '시작하기',
    }),
  ));
}
