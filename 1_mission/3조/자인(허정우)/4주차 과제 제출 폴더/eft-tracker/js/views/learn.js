import { el } from '../util.js';
import { LEARN_SECTIONS } from '../data.js';

const CLOSING_LINES = [
  '내가 사랑하는 부모님, 자녀, 친구들의 건강이 안 좋아지면 어떤 느낌이 드실까요?',
  '많이 슬프고 속상하실 거에요.',
  '마찬가지로 내가 건강을 잃으면 그 분들도 슬프고 속상하시겠죠?',
  '그래서 나의 몸과 마음을 돌보는 일이, 내가 사랑하는 사람들을 위하는 일이기도 합니다.',
  '그러니 EFT를 통해 여러분께서 먼저 건강해지시고, 그 다음 사랑하는 사람들의 건강을 돌보는 시간이 되시길 바랍니다.',
];

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

  section.appendChild(el('div', { class: 'card soft closing' },
    ...CLOSING_LINES.map((line) => el('p', { text: line })),
  ));

  section.appendChild(el('button', {
    class: 'primary big',
    onClick: () => ctx.navigate('home'),
    text: '홈으로',
  }));

  root.appendChild(section);
}
