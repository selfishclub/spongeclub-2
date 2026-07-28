import { el } from '../util.js';
import { LEARN_SECTIONS, MOTIVATION_PROMPT, SHARE_MESSAGE } from '../data.js';

// 링크·영상이 들어갈 자리. 자료를 받으면 이 자리를 실제 콘텐츠로 교체한다.
function mediaSlot(label) {
  return el('div', { class: 'media-slot' }, el('span', { text: `🔗 ${label} — 자료 준비 중` }));
}

export function renderLearn(root, ctx) {
  const section = el('section', { class: 'view learn' },
    el('h1', { text: 'EFT란?' }),
    el('p', { class: 'lead', text: '읽고 싶은 것만 골라 보셔도 됩니다.' }),
  );

  for (const s of LEARN_SECTIONS) {
    const body = el('div', { class: 'acc-body' });
    for (const line of s.body) body.appendChild(el('p', { text: line }));
    if (s.id === 'reviews' || s.id === 'evidence' || s.id === 'founder') {
      body.appendChild(mediaSlot(s.id === 'reviews' ? '후기 인터뷰 영상' : '참고 자료 링크'));
    }
    if (s.id === 'why-app') {
      body.appendChild(mediaSlot('커뮤니티 게시판 링크'));
    }

    const toggle = el('button', { class: 'acc-toggle', text: s.title });
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('open');
      toggle.classList.toggle('open', open);
    });
    section.appendChild(el('div', { class: 'card acc' }, toggle, body));
  }

  section.appendChild(el('div', { class: 'card soft' },
    el('h2', { text: '왜 꾸준히 해야 할까요?' }),
    el('p', { class: 'quote big', text: MOTIVATION_PROMPT }),
    el('p', { text: '한국 사람은 흔히 내 필요보다 관계에서 오는 필요에 더 민감하게 반응합니다. 나를 돌보는 일이 곧 나를 사랑하는 사람들을 돌보는 일입니다.' }),
    el('p', { class: 'hint', text: SHARE_MESSAGE }),
    mediaSlot('앱 소개 링크 공유'),
  ));

  section.appendChild(el('button', {
    class: 'primary big',
    onClick: () => ctx.navigate('home'),
    text: '홈으로',
  }));

  root.appendChild(section);
}
