import { el } from '../util.js';
export function renderDashboard(root, ctx) {
  root.appendChild(el('section', { class: 'view' }, el('h1', { text: 'dashboard (stub)' })));
}
