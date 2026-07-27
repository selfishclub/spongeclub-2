import { el, todayStr } from '../util.js';
import { SITUATION_EXAMPLES, BODY_LOCATION_EXAMPLES, SHAPE_FIELDS } from '../data.js';
import { createEmotionPicker } from '../emotionPicker.js';

// 감정평가 1단계 — 줄이고 싶은 부정적 감정
// 상황 → 감정 모두 → 주된 감정 → 강도 → 몸의 위치 → 에너지 형상화
export function renderEval1(root, ctx) {
  const draft = {
    situation: '', emotions: [], chosenEmotion: '', before: 5, bodyLocation: '',
    shape: { size: '', weight: '', temperature: '', color: '', form: '', texture: '' },
  };
  let step = 1;
  const TOTAL = 6;

  const container = el('section', { class: 'view daily' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `감정평가 1단계 · ${step} / ${TOTAL}` }));
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
    if (step === 2 && draft.emotions.length === 0) { alert('감정을 하나 이상 골라주세요.'); return false; }
    if (step === 3 && !draft.chosenEmotion) { alert('가장 주된 감정 하나를 골라주세요.'); return false; }
    return true;
  }

  function chipRow(values, onPick) {
    return el('div', { class: 'chips' }, ...values.map((v) => {
      const b = el('button', { class: 'chip ghost-chip', type: 'button', text: v });
      b.addEventListener('click', () => onPick(v));
      return b;
    }));
  }

  function slider() {
    const out = el('output', { text: String(draft.before) });
    const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft.before) });
    input.addEventListener('input', () => { draft.before = Number(input.value); out.textContent = input.value; });
    return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
  }

  function shapeField(f) {
    const input = el('input', { type: 'text', value: draft.shape[f.key], placeholder: f.placeholder });
    input.addEventListener('input', () => { draft.shape[f.key] = input.value; });
    return el('label', { class: 'field' }, el('span', { text: f.label }), input);
  }

  function body() {
    switch (step) {
      case 1: {
        const ta = el('textarea', { rows: '3', placeholder: `예: ${SITUATION_EXAMPLES[0]}` });
        ta.value = draft.situation;
        ta.addEventListener('input', () => { draft.situation = ta.value; });
        return el('div', { class: 'card' },
          el('h2', { text: '1. 어떤 상황이었나요?' }),
          el('p', { class: 'hint', text: '최근 감정이 불편하거나 힘들었던 상황 혹은 그렇게 만든 사람을 구체적으로 떠올려 보세요.' }),
          el('label', { class: 'field' }, ta),
          el('div', { class: 'examples' }, el('span', { class: 'hint', text: '예시를 눌러 채울 수 있어요' }),
            chipRow(SITUATION_EXAMPLES, (v) => { ta.value = v; draft.situation = v; })));
      }
      case 2: {
        const picker = createEmotionPicker({ multi: true, initial: draft.emotions, onChange: (sel) => { draft.emotions = sel; } });
        return el('div', { class: 'card' },
          el('h2', { text: '2. 그때 어떤 감정들이 들었나요?' }),
          el('p', { class: 'hint', text: '해당하는 것을 모두 골라주세요. 목록에 없으면 직접 적으셔도 됩니다.' }),
          picker.element);
      }
      case 3: {
        const card = el('div', { class: 'card' }, el('h2', { text: '3. 그중 가장 주된 감정 하나를 고르세요' }));
        if (draft.emotions.length === 0) { card.appendChild(el('p', { class: 'empty', text: '2단계에서 감정을 먼저 골라주세요.' })); return card; }
        card.appendChild(el('div', { class: 'chips' }, ...draft.emotions.map((e) => {
          const b = el('button', { class: 'chip' + (draft.chosenEmotion === e ? ' on' : ''), type: 'button', text: e });
          b.addEventListener('click', () => { draft.chosenEmotion = e; render(); });
          return b;
        })));
        return card;
      }
      case 4:
        return el('div', { class: 'card' },
          el('h2', { text: '4. 지금 그 감정은 얼마나 강한가요?' }),
          el('p', { class: 'hint', text: '0(전혀) ~ 10(매우 강함)' }), slider());
      case 5: {
        const input = el('input', { type: 'text', value: draft.bodyLocation, placeholder: '예: 가슴 중앙, 명치, 복부' });
        input.addEventListener('input', () => { draft.bodyLocation = input.value; });
        return el('div', { class: 'card' },
          el('h2', { text: '5. 그 느낌은 몸의 어디에 있나요?' }),
          el('label', { class: 'field' }, el('span', { text: '몸의 위치' }), input),
          chipRow(BODY_LOCATION_EXAMPLES, (v) => { draft.bodyLocation = v; input.value = v; }));
      }
      case 6:
        return el('div', { class: 'card' },
          el('h2', { text: '6. 그 감정을 몸의 느낌으로 그려보세요' }),
          el('p', { class: 'hint', text: '구체적이고 생생하게 상상할수록 효과가 커집니다.' }),
          el('p', { class: 'hint', text: '다 채우지 않고, 잘 느껴지는 항목만 적으시면 됩니다.' }),
          ...SHAPE_FIELDS.map(shapeField));
      default:
        return el('div', {});
    }
  }

  function save() {
    ctx.store.addDailyCheck({
      date: todayStr(),
      datetime: new Date().toISOString(),
      stage: 1,
      situation: draft.situation.trim(),
      emotions: draft.emotions,
      chosenEmotion: draft.chosenEmotion,
      before: draft.before,
      bodyLocation: draft.bodyLocation,
      shape: { ...draft.shape },
    });
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '평가가 저장됐어요' }),
      el('p', { text: `주된 감정: ${draft.chosenEmotion} (강도 ${draft.before})` }),
      el('p', { class: 'hint', text: '이제 태핑 단계를 선택해 실천하세요.' }),
      el('div', { class: 'row' },
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap1'), text: '태핑 1단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap2'), text: '태핑 2단계' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('tap3'), text: '태핑 3단계' })),
      el('button', { class: 'ghost wide', onClick: () => ctx.navigate('home'), text: '홈으로' })));
  }
}
