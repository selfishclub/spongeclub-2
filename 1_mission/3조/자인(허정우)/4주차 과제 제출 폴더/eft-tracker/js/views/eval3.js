import { el, todayStr } from '../util.js';
import { POSITIVE_EMOTION_CATEGORIES } from '../data.js';
import { createEmotionPicker } from '../emotionPicker.js';

// 감정평가 3단계 — 강화하고 싶은 긍정적 감정
// Q1: 다 해결되면 어떤 느낌? → 긍정 확언 생성  /  Q2: 그때 에너지 형상은?
function positiveAffirmation(emotion) {
  const e = (emotion || '○○').trim();
  return `나는 지금 ${e} 감정이 충만해서 너무나 행복하고 감사합니다.`;
}

export function renderEval3(root, ctx) {
  const draft = { positiveEmotion: '', affirmation: '', imagery: '', before: 5 };
  let step = 1;
  const TOTAL = 2;

  const container = el('section', { class: 'view daily' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `감정평가 3단계 · ${step} / ${TOTAL}` }));
    container.appendChild(body());
    container.appendChild(controls());
    window.scrollTo(0, 0);
  }

  function controls() {
    const row = el('div', { class: 'row' });
    if (step > 1) row.appendChild(el('button', { class: 'ghost', onClick: () => { step -= 1; render(); }, text: '이전' }));
    if (step < TOTAL) row.appendChild(el('button', { class: 'primary', onClick: () => { if (validate()) { step += 1; render(); } }, text: '다음' }));
    else row.appendChild(el('button', { class: 'primary', onClick: save, text: '평가 저장' }));
    return row;
  }

  function validate() {
    if (step === 1 && !draft.positiveEmotion) { alert('강화하고 싶은 긍정 감정을 하나 골라주세요.'); return false; }
    return true;
  }

  function slider() {
    const out = el('output', { text: String(draft.before) });
    const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft.before) });
    input.addEventListener('input', () => { draft.before = Number(input.value); out.textContent = input.value; });
    return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
  }

  function body() {
    if (step === 1) {
      const affirmInput = el('input', { type: 'text', value: draft.affirmation });
      const sync = () => {
        if (!draft.affirmation || draft.affirmation === positiveAffirmation('') || draft.affirmationAuto) {
          draft.affirmation = positiveAffirmation(draft.positiveEmotion);
          draft.affirmationAuto = true;
          affirmInput.value = draft.affirmation;
        }
      };
      affirmInput.addEventListener('input', () => { draft.affirmation = affirmInput.value; draft.affirmationAuto = false; });

      const picker = createEmotionPicker({
        multi: false, categories: POSITIVE_EMOTION_CATEGORIES,
        initial: draft.positiveEmotion ? [draft.positiveEmotion] : [],
        onChange: (sel) => { draft.positiveEmotion = sel[0] || ''; sync(); },
      });
      if (!draft.affirmation) { draft.affirmation = positiveAffirmation(''); draft.affirmationAuto = true; affirmInput.value = draft.affirmation; }

      return el('div', { class: 'card' },
        el('h2', { text: '1. 지금 겪고 있는 감정 문제 혹은 상황이 다 해결된다면, 어떤 느낌이 들 것 같으세요?' }),
        el('p', { class: 'hint', text: '그때 느끼고 싶은 긍정 감정을 하나 고르세요.' }),
        picker.element,
        el('label', { class: 'field' }, el('span', { text: '긍정 확언 (자연스럽게 다듬어 보세요)' }), affirmInput),
        el('p', { class: 'hint', text: '지금 그 느낌이 얼마나 생생한가요? (태핑 후 더 충만해지는 것을 목표로 합니다)' }),
        slider());
    }
    const ta = el('textarea', { rows: '3', placeholder: '예: 뾰족하던 것이 둥글고 환한 빛으로 바뀐다' });
    ta.value = draft.imagery;
    ta.addEventListener('input', () => { draft.imagery = ta.value; });
    return el('div', { class: 'card' },
      el('h2', { text: '2. 모든 문제가 다 해결되고 났을 때, 감정·에너지 형상은 어떻게 변해 있을까요?' }),
      el('p', { class: 'hint', text: '눈을 감고 그 변화된 형상을 구체적이고 생생하게 떠올려 보세요.' }),
      el('label', { class: 'field' }, ta));
  }

  function save() {
    ctx.store.addDailyCheck({
      date: todayStr(),
      datetime: new Date().toISOString(),
      stage: 3,
      chosenEmotion: draft.positiveEmotion,
      positiveEmotion: draft.positiveEmotion,
      emotions: [draft.positiveEmotion],
      affirmation: draft.affirmation,
      positiveImagery: draft.imagery,
      before: draft.before,
    });
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '평가가 저장됐어요' }),
      el('p', { class: 'affirm mine', text: draft.affirmation }),
      el('div', { class: 'row' },
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap1'), text: '태핑 1단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap2'), text: '태핑 2단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap3'), text: '태핑 3단계' })),
      el('button', { class: 'ghost wide', onClick: () => ctx.navigate('home'), text: '홈으로' })));
  }
}
