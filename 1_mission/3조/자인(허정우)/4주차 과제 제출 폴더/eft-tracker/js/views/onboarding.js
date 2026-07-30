import { el } from '../util.js';
import { APP_TITLE } from '../data.js';

export function renderOnboarding(root, ctx) {
  const nicknameInput = el('input', {
    type: 'text',
    placeholder: '예: 홍길동',
    maxlength: '20',
  });

  function start() {
    const nickname = nicknameInput.value.trim();
    if (nickname) ctx.store.setNickname(nickname);
    ctx.store.setOnboardingDone();
    ctx.navigate('home');
  }

  nicknameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') start();
  });

  root.appendChild(el('section', { class: 'view onboarding' },
    el('h1', { text: APP_TITLE }),
    el('p', { class: 'lead', text: '침 없이, 손끝으로 타점을 두드려 감정과 에너지를 다스리는 자가치유법입니다.' }),

    el('div', { class: 'card' },
      el('h2', { text: '어떻게 부를까요?' }),
      el('label', { class: 'field' },
        el('span', { text: '닉네임 (선택)' }),
        nicknameInput,
      ),
      el('p', { class: 'hint', text: '이 기기에만 저장됩니다. 가입도, 비밀번호도 없습니다.' }),
    ),

    el('div', { class: 'card' },
      el('h2', { text: '누가 만들었나요?' }),
      el('p', { text: '17년차 한의사 · 암 한방병원장이 임상 경험을 바탕으로 설계했습니다. 매일의 감정을 스스로 체크하고, 그 자리에서 다스린 뒤 변화를 눈으로 확인하는 습관을 돕습니다.' }),
    ),

    el('div', { class: 'card' },
      el('h2', { text: '어떻게 쓰나요?' }),
      el('ol', { class: 'howto' },
        el('li', { text: '오늘 힘들었던 상황과 감정을 자가평가에 기록합니다.' }),
        el('li', { text: 'EFT 단계를 따라가며 그 감정을 다스립니다.' }),
        el('li', { text: '전후 변화가 숫자로 기록되고, 추이가 그래프로 쌓입니다.' }),
      ),
    ),

    el('button', { class: 'primary big', onClick: start, text: '시작하기' }),
    el('button', {
      class: 'ghost wide',
      onClick: () => { if (nicknameInput.value.trim()) ctx.store.setNickname(nicknameInput.value.trim()); ctx.store.setOnboardingDone(); ctx.navigate('learn'); },
      text: 'EFT가 뭔지 먼저 알아보기',
    }),
  ));
}
