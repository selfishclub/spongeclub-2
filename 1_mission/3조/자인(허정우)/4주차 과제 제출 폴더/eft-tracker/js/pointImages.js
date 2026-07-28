import { el } from './util.js';

// 혈자리명에서 파일 슬러그를 뽑는다. 괄호 안 한자·한글명을 우선 사용.
// 예: "손날점(후계)" → "후계", "소지(소충·소택)" → "소충소택", "중부" → "중부"
export function slugFor(name) {
  const m = /\(([^)]+)\)/.exec(name);
  const base = m ? m[1] : name;
  return base.replace(/[·\s]/g, '');
}

// 각 혈자리 옆의 "혈자리 위치" 토글 버튼.
// 클릭 시 assets/acupoints/<slug>.jpg 를 보여주고, 파일이 없으면 fallback 도식을 보여준다.
export function pointLocation(name, fallbackFactory) {
  const slug = slugFor(name);
  const box = el('div', { class: 'point-img' });
  let open = false;

  const btn = el('button', { class: 'ghost small loc-btn', type: 'button', text: '혈자리 위치' });
  btn.addEventListener('click', () => {
    open = !open;
    btn.classList.toggle('on', open);
    box.innerHTML = '';
    if (!open) return;

    const img = document.createElement('img');
    img.className = 'acupoint-photo';
    img.alt = `${name} 위치`;
    img.src = `assets/acupoints/${slug}.jpg`;
    img.addEventListener('error', () => {
      box.innerHTML = '';
      if (fallbackFactory) box.appendChild(fallbackFactory());
      box.appendChild(el('p', { class: 'hint', text: `${name} — 정식 이미지 준비 중. 위 도식에서 위치를 참고하세요.` }));
    });
    box.appendChild(img);
  });

  return el('div', { class: 'loc-wrap' }, btn, box);
}
