import { el } from '../util.js';
export function renderOnboarding(root, ctx) {
  root.appendChild(el('section', { class: 'view' }, el('h1', { text: 'onboarding (stub)' })));
}
