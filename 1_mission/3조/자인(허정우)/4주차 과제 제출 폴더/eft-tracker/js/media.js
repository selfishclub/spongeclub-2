import { el } from './util.js';

// 이미지·영상 자산이 아직 없는 자리. 자료를 받으면 이 자리를 실제 미디어로 교체한다.
export function mediaSlot(label) {
  return el('div', { class: 'media-slot' }, el('span', { text: `🎬 ${label} — 자료 준비 중` }));
}

// 유튜브 임베드. 외부 로드이므로 사용자가 버튼을 눌렀을 때만 iframe을 삽입한다.
// (인터넷 연결이 있을 때만 재생됨)
export function youtubeEmbed(id, label = '배경 음악 (유튜브)') {
  const holder = el('div', { class: 'yt' });
  const btn = el('button', { class: 'ghost small', type: 'button', text: `▶ ${label}` });
  btn.addEventListener('click', () => {
    holder.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1`;
    iframe.width = '100%';
    iframe.height = '80';
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allow', 'autoplay; encrypted-media');
    iframe.setAttribute('title', label);
    holder.appendChild(iframe);
  });
  holder.appendChild(btn);
  return holder;
}
