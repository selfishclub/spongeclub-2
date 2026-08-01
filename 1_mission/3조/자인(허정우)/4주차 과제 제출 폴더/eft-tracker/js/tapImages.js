import { el } from './util.js';

// 저작권 안전한 자체 제작 SVG 도식. 사진이 아니라 위치를 가늠하기 위한 개략도다.
// 실제 촬영 이미지·영상이 준비되면 이 도식을 교체하거나 함께 쓸 수 있다.

function svgBox(inner, viewBox = '0 0 140 160') {
  const wrap = el('div', { class: 'tap-img' });
  wrap.innerHTML =
    `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
  return wrap;
}

function dot(x, y, label) {
  return `<circle cx="${x}" cy="${y}" r="3.4" class="pt"/>` +
    (label ? `<text x="${x + 5}" y="${y + 3}" class="pt-label">${label}</text>` : '');
}

// 후계혈 — 손날(새끼손가락 쪽 옆면)
export function hugyeImage() {
  return svgBox(`
    <path class="body" d="M45 20 q-8 0 -8 12 l0 60 q0 30 25 34 q30 4 30 -26 l0 -30
      q10 2 10 -8 q0 -8 -8 -8 q-2 -14 -10 -14 q-2 -12 -9 -12 q-2 -12 -9 -12 q-8 0 -8 10 l0 6z"/>
    ${dot(38, 70, '후계혈 (손날 가운데)')}
  `, '0 0 150 130');
}

// 태핑 Lv.1 — 체간 6혈
export function torsoLv1Image() {
  return svgBox(`
    <path class="body" d="M35 18 q35 -12 70 0 l-6 18 q-2 6 -8 6 l0 96 q0 6 -6 6 l-30 0
      q-6 0 -6 -6 l0 -96 q-6 0 -8 -6z"/>
    <line x1="70" y1="42" x2="70" y2="132" class="mid"/>
    ${dot(48, 52, '중부')}
    ${dot(60, 60, '수부')}
    ${dot(70, 70, '전중')}
    ${dot(70, 90, '거궐')}
    ${dot(52, 104, '일월')}
    ${dot(40, 118, '대포')}
  `, '0 0 150 160');
}

// 태핑 Lv.2 — 머리·얼굴
export function faceLv2Image() {
  return svgBox(`
    <ellipse class="body" cx="70" cy="78" rx="42" ry="52"/>
    ${dot(70, 30, '정수리(백회)')}
    ${dot(52, 62, '눈썹(찬죽)')}
    ${dot(36, 70, '눈 옆(동자료)')}
    ${dot(52, 80, '눈 밑(승읍)')}
    ${dot(66, 100, '코 밑(인중)')}
    ${dot(66, 116, '턱(승장)')}
  `, '0 0 150 150');
}

// 태핑 Lv.3 — 손 (손끝·손등·손목)
export function handLv3Image() {
  return svgBox(`
    <path class="body" d="M50 150 l0 -60 q-8 -2 -8 -12 l0 -30 q0 -6 5 -6 q5 0 5 6 l0 22
      l4 0 l0 -40 q0 -6 5 -6 q5 0 5 6 l0 40 l4 0 l0 -46 q0 -6 5 -6 q5 0 5 6 l0 46
      l4 0 l0 -38 q0 -6 5 -6 q5 0 5 6 l0 44 l4 2 l0 -20 q0 -6 5 -6 q5 0 5 8 l0 40
      q0 30 -25 40 z"/>
    ${dot(55, 34, '엄지(소상)')}
    ${dot(66, 22, '검지(상양)')}
    ${dot(78, 18, '중지(중충)')}
    ${dot(90, 24, '약지(관충)')}
    ${dot(100, 40, '소지(소충·소택)')}
    ${dot(78, 96, '손등(중저)')}
    ${dot(66, 138, '손목(내관)')}
  `, '0 0 170 160');
}

export const TAP_IMAGE_BY_LEVEL = {
  lv1: torsoLv1Image,
  lv2: faceLv2Image,
  lv3: handLv3Image,
};
