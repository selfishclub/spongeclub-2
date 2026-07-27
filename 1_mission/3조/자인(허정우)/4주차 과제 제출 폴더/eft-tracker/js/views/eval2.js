import { el, todayStr } from '../util.js';
import { POSITIVE_EMOTION_CATEGORIES, EVAL_LEVELS } from '../data.js';
import { createEmotionPicker } from '../emotionPicker.js';

// 감정평가 2단계 — 강화하고 싶은 긍정적 감정
export function renderEval2(root, ctx) {
  const draft = { positiveEmotion: '', positiveImagery: '', before: 5 };
  let step = 1;
  const TOTAL = 3;
  const guide = EVAL_LEVELS.find((l) => l.id === 'lv3').guide;

  const container = el('section', { class: 'view daily' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `감정평가 2단계 · ${step} / ${TOTAL}` }));
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
    switch (step) {
      case 1: {
        const picker = createEmotionPicker({
          multi: false, categories: POSITIVE_EMOTION_CATEGORIES,
          initial: draft.positiveEmotion ? [draft.positiveEmotion] : [],
          onChange: (sel) => { draft.positiveEmotion = sel[0] || ''; },
        });
        return el('div', { class: 'card' },
          el('h2', { text: '1. 강화하고 싶은 긍정 감정을 고르세요' }),
          el('ul', { class: 'guide-steps' }, ...guide.slice(0, 2).map((g) => el('li', { text: g }))),
          picker.element);
      }
      case 2: {
        const ta = el('textarea', { rows: '3', placeholder: '예: 가슴이 따뜻하고 환한 빛으로 가득 찬다' });
        ta.value = draft.positiveImagery;
        ta.addEventListener('input', () => { draft.positiveImagery = ta.value; });
        return el('div', { class: 'card' },
          el('h2', { text: '2. 그때의 에너지 형상을 그려보세요' }),
          el('p', { class: 'hint', text: '문제가 해결됐을 때의 좋은 느낌을 눈을 감고 생생하게 떠올려 보세요.' }),
          el('label', { class: 'field' }, ta));
      }
      case 3:
        return el('div', { class: 'card' },
          el('h2', { text: '3. 지금 그 긍정 상태가 얼마나 생생한가요?' }),
          el('p', { class: 'hint', text: '0(전혀) ~ 10(아주 생생함). 태핑 후 더 강해지는 것을 목표로 합니다.' }),
          slider());
      default:
        return el('div', {});
    }
  }

  function save() {
    ctx.store.addDailyCheck({
      date: todayStr(),
      datetime: new Date().toISOString(),
      stage: 2,
      chosenEmotion: draft.positiveEmotion,
      positiveEmotion: draft.positiveEmotion,
      positiveImagery: draft.positiveImagery,
      before: draft.before,
      emotions: [draft.positiveEmotion],
    });
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '평가가 저장됐어요' }),
      el('p', { text: `강화할 감정: ${draft.positiveEmotion} (생생함 ${draft.before})` }),
      el('div', { class: 'row' },
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap1'), text: '태핑 1단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap2'), text: '태핑 2단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap3'), text: '태핑 3단계' })),
      el('button', { class: 'ghost wide', onClick: () => ctx.navigate('home'), text: '홈으로' })));
  }
}
