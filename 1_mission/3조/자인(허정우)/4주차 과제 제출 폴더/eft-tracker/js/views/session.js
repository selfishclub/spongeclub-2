import { el } from '../util.js';
export function renderSession(root, ctx) {
  root.appendChild(el('section', { class: 'view' }, el('h1', { text: 'session (stub)' })));
}
