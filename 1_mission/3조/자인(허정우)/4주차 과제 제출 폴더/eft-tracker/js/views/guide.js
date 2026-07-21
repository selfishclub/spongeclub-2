import { el } from '../util.js';
export function renderGuide(root, ctx) {
  root.appendChild(el('section', { class: 'view' }, el('h1', { text: 'guide (stub)' })));
}
