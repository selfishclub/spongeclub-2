import { el, todayStr } from '../util.js';
import { SYMPTOM_QUESTIONS, SYMPTOM_SCALE_LABELS } from '../data.js';
import { computeDailyTotal } from '../scoring.js';

export function renderDailyCheck(root, ctx) {
  const scores = new Array(SYMPTOM_QUESTIONS.length).fill(null);

  const section = el('section', { class: 'view daily' },
    el('h1', { text: '오늘의 자가진단' }),
    el('p', { class: 'lead', text: '지금 내 상태에 얼마나 해당하나요? (0 전혀 그렇지 않다 ~ 4 완전히 그렇다)' }),
  );

  const status = el('p', { class: 'status', text: '' });
  const saveBtn = el('button', { class: 'primary big', disabled: 'true', text: '저장하기' });

  function updateStatus() {
    const done = scores.filter((s) => s !== null).length;
    status.textContent = `${done} / ${scores.length} 문항 응답`;
    if (done === scores.length) saveBtn.removeAttribute('disabled');
    else saveBtn.setAttribute('disabled', 'true');
  }

  const list = el('div', { class: 'q-list' });
  SYMPTOM_QUESTIONS.forEach((q, qi) => {
    const options = el('div', { class: 'q-options' });
    SYMPTOM_SCALE_LABELS.forEach((label, val) => {
      const id = `q${qi}_v${val}`;
      const input = el('input', { type: 'radio', name: `q${qi}`, id, value: String(val) });
      input.addEventListener('change', () => { scores[qi] = val; updateStatus(); });
      options.appendChild(el('label', { class: 'opt', for: id, title: label }, input, el('span', { text: String(val) })));
    });
    list.appendChild(el('div', { class: 'q-item' },
      el('div', { class: 'q-text', text: `${qi + 1}. ${q}` }),
      options,
    ));
  });
  section.appendChild(list);

  saveBtn.addEventListener('click', () => {
    const total = computeDailyTotal(scores);
    ctx.store.addDailyCheck({ date: todayStr(), symptomScores: scores.slice(), total });
    ctx.navigate('dashboard');
  });

  section.appendChild(status);
  section.appendChild(saveBtn);
  section.appendChild(el('p', { class: 'source', text: '문항 출처: 권정혜·김종우, 화병척도' }));
  updateStatus();
  root.appendChild(section);
}
