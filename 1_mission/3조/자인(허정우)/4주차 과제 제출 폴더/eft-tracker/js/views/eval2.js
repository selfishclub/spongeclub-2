import { el, todayStr } from '../util.js';
import { BODY_LOCATION_EXAMPLES, SHAPE_FIELDS } from '../data.js';

// 감정평가 2단계 — 감정 에너지 형상화 (몸의 위치 → 형상화)
// 1단계에서 고른 감정을 이어받아 진행한다.
export function renderEval2(root, ctx) {
  const state = ctx.store.load();
  const prev = [...state.dailyChecks].reverse().find((c) => c.chosenEmotion && (c.stage === 1 || c.stage === 2));

  if (!prev) {
    root.appendChild(el('section', { class: 'view daily' },
      el('div', { class: 'card' },
        el('h2', { text: '감정평가 2단계 — 감정 에너지 형상화' }),
        el('p', { class: 'empty', text: '먼저 감정평가 1단계에서 감정을 골라주세요.' }),
        el('button', { class: 'primary big', onClick: () => ctx.navigate('eval1'), text: '감정평가 1단계 하러 가기' }))));
    return;
  }

  const draft = {
    bodyLocation: prev.bodyLocation || '',
    shape: { size: '', weight: '', temperature: '', color: '', form: '', texture: '', ...(prev.shape || {}) },
  };
  let step = 1;
  const TOTAL = 2;

  const container = el('section', { class: 'view daily' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `감정평가 2단계 · ${step} / ${TOTAL}` }));
    container.appendChild(el('p', { class: 'hint', text: `대상 감정: ${prev.chosenEmotion} (강도 ${prev.before ?? '-'})` }));
    container.appendChild(body());
    container.appendChild(controls());
    window.scrollTo(0, 0);
  }

  function controls() {
    const row = el('div', { class: 'row' });
    if (step > 1) row.appendChild(el('button', { class: 'ghost', onClick: () => { step -= 1; render(); }, text: '이전' }));
    if (step < TOTAL) row.appendChild(el('button', { class: 'primary', onClick: () => { step += 1; render(); }, text: '다음' }));
    else row.appendChild(el('button', { class: 'primary', onClick: save, text: '평가 저장' }));
    return row;
  }

  function chipRow(values, onPick) {
    return el('div', { class: 'chips' }, ...values.map((v) => {
      const b = el('button', { class: 'chip ghost-chip', type: 'button', text: v });
      b.addEventListener('click', () => onPick(v));
      return b;
    }));
  }

  function shapeField(f) {
    const input = el('input', { type: 'text', value: draft.shape[f.key], placeholder: f.placeholder });
    input.addEventListener('input', () => { draft.shape[f.key] = input.value; });
    return el('label', { class: 'field' }, el('span', { text: f.label }), input);
  }

  function body() {
    if (step === 1) {
      const input = el('input', { type: 'text', value: draft.bodyLocation, placeholder: '예: 가슴 중앙, 명치, 복부' });
      input.addEventListener('input', () => { draft.bodyLocation = input.value; });
      return el('div', { class: 'card' },
        el('h2', { text: '1. 그 느낌은 몸의 어디에 있나요?' }),
        el('label', { class: 'field' }, el('span', { text: '몸의 위치' }), input),
        chipRow(BODY_LOCATION_EXAMPLES, (v) => { draft.bodyLocation = v; input.value = v; }));
    }
    return el('div', { class: 'card' },
      el('h2', { text: '2. 그 감정을 몸의 느낌으로 그려보세요' }),
      el('p', { class: 'hint', text: '구체적이고 생생하게 상상할수록 효과가 커집니다.' }),
      el('p', { class: 'hint', text: '다 채우지 않고, 잘 느껴지는 항목만 적으시면 됩니다.' }),
      ...SHAPE_FIELDS.map(shapeField));
  }

  function save() {
    ctx.store.addDailyCheck({
      date: todayStr(),
      datetime: new Date().toISOString(),
      stage: 2,
      situation: prev.situation || '',
      emotions: prev.emotions || [],
      chosenEmotion: prev.chosenEmotion,
      before: prev.before ?? 5,
      bodyLocation: draft.bodyLocation,
      shape: { ...draft.shape },
    });
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '평가가 저장됐어요' }),
      el('p', { text: `${prev.chosenEmotion}의 에너지를 형상화했어요.` }),
      el('div', { class: 'row' },
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap1'), text: '태핑 1단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap2'), text: '태핑 2단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap3'), text: '태핑 3단계' })),
      el('button', { class: 'ghost wide', onClick: () => ctx.navigate('home'), text: '홈으로' })));
  }
}
