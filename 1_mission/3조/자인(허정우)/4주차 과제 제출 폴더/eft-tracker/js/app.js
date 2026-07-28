import { createStore } from './storage.js';
import { el } from './util.js';
import { APP_TITLE } from './data.js';
import { renderSplash } from './views/splash.js';
import { renderHome } from './views/home.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderGuide } from './views/guide.js';
import { renderLearn } from './views/learn.js';
import { renderDashboard } from './views/dashboard.js';
import { renderEvalMenu } from './views/evalMenu.js';
import { renderTapMenu } from './views/tapMenu.js';
import { renderEval1 } from './views/eval1.js';
import { renderEval2 } from './views/eval2.js';
import { renderTapCycle } from './views/tapCycle.js';
import { renderShare } from './views/share.js';

const store = createStore(window.localStorage);
const root = document.getElementById('app');
const topnav = document.getElementById('topnav');
const brand = document.querySelector('.brand');

if (brand) brand.textContent = APP_TITLE;
document.title = APP_TITLE;

const views = {
  splash: renderSplash,
  home: renderHome,
  onboarding: renderOnboarding,
  guide: renderGuide,
  learn: renderLearn,
  progress: renderDashboard,
  evalmenu: renderEvalMenu,
  tapmenu: renderTapMenu,
  eval1: renderEval1,
  eval2: renderEval2,
  tap1: (r, c) => renderTapCycle(r, c, 1),
  tap2: (r, c) => renderTapCycle(r, c, 2),
  tap3: (r, c) => renderTapCycle(r, c, 3),
  share: renderShare,
};

// 상단 탭이 가리키는 라우트 → 활성 표시를 위한 그룹 매핑
const NAV = [
  ['home', '홈'],
  ['learn', 'EFT란?'],
  ['progress', '진도표'],
  ['evalmenu', '감정평가'],
  ['tapmenu', 'EFT태핑'],
  ['share', '나누기'],
];
const NAV_GROUP = {
  eval1: 'evalmenu', eval2: 'evalmenu',
  tap1: 'tapmenu', tap2: 'tapmenu', tap3: 'tapmenu',
  guide: 'learn',
};

function renderNav(current) {
  topnav.innerHTML = '';
  const active = NAV_GROUP[current] || current;
  for (const [name, label] of NAV) {
    topnav.appendChild(el('button', {
      class: 'navbtn' + (name === active ? ' active' : ''),
      onClick: () => navigate(name),
      text: label,
    }));
  }
}

function navigate(name) {
  root.innerHTML = '';
  const bare = name === 'splash' || name === 'onboarding';
  topnav.style.display = bare ? 'none' : '';
  if (!bare) renderNav(name);
  const ctx = { store, navigate };
  (views[name] || views.home)(root, ctx);
  window.scrollTo(0, 0);
}

const initial = store.load();
if (initial.splashSeen) navigate(initial.onboardingDone ? 'home' : 'onboarding');
else navigate('splash');
