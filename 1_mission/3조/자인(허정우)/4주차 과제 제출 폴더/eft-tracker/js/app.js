import { createStore } from './storage.js';
import { el } from './util.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderGuide } from './views/guide.js';
import { renderDailyCheck } from './views/dailyCheck.js';
import { renderSession } from './views/session.js';
import { renderDashboard } from './views/dashboard.js';

const store = createStore(window.localStorage);
const root = document.getElementById('app');
const topnav = document.getElementById('topnav');

const views = {
  onboarding: renderOnboarding,
  guide: renderGuide,
  daily: renderDailyCheck,
  session: renderSession,
  dashboard: renderDashboard,
};

function renderNav(current) {
  topnav.innerHTML = '';
  const items = [['dashboard', '홈'], ['daily', '자가진단'], ['session', 'EFT 실천']];
  for (const [name, label] of items) {
    topnav.appendChild(el('button', {
      class: 'navbtn' + (name === current ? ' active' : ''),
      onClick: () => navigate(name),
      text: label,
    }));
  }
}

function navigate(name) {
  root.innerHTML = '';
  const showNav = name !== 'onboarding';
  topnav.style.display = showNav ? '' : 'none';
  if (showNav) renderNav(name);
  const ctx = { store, navigate };
  (views[name] || views.dashboard)(root, ctx);
}

const state = store.load();
navigate(state.onboardingDone ? 'dashboard' : 'onboarding');
