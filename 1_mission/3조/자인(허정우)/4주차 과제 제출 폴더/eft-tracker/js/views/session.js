import { el } from '../util.js';
import { SHAPE_FIELDS, EFT_TAP_POINTS } from '../data.js';
import { nrsDelta } from '../scoring.js';

export function renderSession(root, ctx) {
  const draft = {
    situation: '', emotions: '', chosenEmotion: '',
    before: 5, after: 5,
    shape: { temperature: '', texture: '', color: '', form: '', size: '', weight: '' },
    bodyLocation: '',
  };
  let step = 1;
  const TOTAL = 8;

  const container = el('section', { class: 'view session' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `EFT 실천 · ${step} / ${TOTAL} 단계` }));
    container.appendChild(stepBody());
    container.appendChild(controls());
  }

  function controls() {
    const row = el('div', { class: 'row' });
    if (step > 1 && step <= TOTAL) {
      row.appendChild(el('button', { class: 'ghost', onClick: () => { step -= 1; render(); }, text: '이전' }));
    }
    if (step < TOTAL) {
      row.appendChild(el('button', { class: 'primary', onClick: () => { if (validate()) { step += 1; render(); } }, text: '다음' }));
    }
    return row;
  }

  function validate() {
    if (step === 2 && !draft.chosenEmotion.trim()) {
      alert('대표 감정을 하나 적어주세요.');
      return false;
    }
    return true;
  }

  function slider(key) {
    const out = el('output', { text: String(draft[key]) });
    const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft[key]) });
    input.addEventListener('input', () => { draft[key] = Number(input.value); out.textContent = input.value; });
    return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
  }

  function textField(label, get, set, placeholder = '') {
    const input = el('input', { type: 'text', value: get(), placeholder });
    input.addEventListener('input', () => set(input.value));
    return el('label', { class: 'field' }, el('span', { text: label }), input);
  }

  function textArea(label, get, set, placeholder = '') {
    const ta = el('textarea', { rows: '3', placeholder });
    ta.value = get();
    ta.addEventListener('input', () => set(ta.value));
    return el('label', { class: 'field' }, el('span', { text: label }), ta);
  }

  function stepBody() {
    switch (step) {
      case 1:
        return el('div', { class: 'card' },
          el('h2', { text: '1. 어떤 상황인가요?' }),
          textArea('불쾌한 감정이 떠오르는 상황', () => draft.situation, (v) => { draft.situation = v; }, '예: 오늘 회의에서 지적받았을 때'),
          textArea('그때 어떤 감정들이 드나요?', () => draft.emotions, (v) => { draft.emotions = v; }, '예: 억울함, 답답함, 화'),
        );
      case 2:
        return el('div', { class: 'card' },
          el('h2', { text: '2. 가장 큰 감정 하나를 고르세요' }),
          textField('대표 감정', () => draft.chosenEmotion, (v) => { draft.chosenEmotion = v; }, '예: 억울함'),
        );
      case 3:
        return el('div', { class: 'card' },
          el('h2', { text: '3. 지금 그 감정은 얼마나 강한가요?' }),
          el('p', { class: 'hint', text: '0(전혀) ~ 10(매우 강함)' }),
          slider('before'),
        );
      case 4:
        return el('div', { class: 'card' },
          el('h2', { text: '4. 그 감정을 몸의 느낌으로 그려보세요' }),
          el('p', { class: 'hint', text: '구체적으로 상상할수록 효과가 커집니다. 떠오르는 대로 적어보세요.' }),
          ...SHAPE_FIELDS.map((f) => textField(f.label, () => draft.shape[f.key], (v) => { draft.shape[f.key] = v; }, f.placeholder)),
        );
      case 5:
        return el('div', { class: 'card' },
          el('h2', { text: '5. 그 느낌은 몸의 어디에 있나요?' }),
          textField('몸의 위치', () => draft.bodyLocation, (v) => { draft.bodyLocation = v; }, '예: 가슴 한복판, 명지, 목'),
        );
      case 6:
        return el('div', { class: 'card' },
          el('h2', { text: '6. 호흡하기' }),
          el('p', { text: '그 감정이 있는 곳을 마음속으로 바라보며, 깊은 호흡을 천천히 3회 반복하세요.' }),
        );
      case 7:
        return el('div', { class: 'card' },
          el('h2', { text: '7. EFT 타점 두드리기' }),
          el('p', { class: 'hint', text: '각 타점을 검지·중지로 5~7회 두드리며, 그 감정에 집중하세요.' }),
          el('ol', { class: 'tap-list' }, ...EFT_TAP_POINTS.map((p) => el('li', {},
            el('strong', { text: p.name }), el('span', { class: 'hint', text: ' — ' + p.hint }),
          ))),
        );
      case 8:
        return el('div', { class: 'card' },
          el('h2', { text: '8. 다시 느껴보고 강도를 확인하세요' }),
          el('p', { class: 'hint', text: `처음엔 ${draft.before}점이었어요. 지금은?` }),
          slider('after'),
          el('button', { class: 'primary big', onClick: saveSession, text: '기록 저장' }),
        );
      default:
        return el('div', {});
    }
  }

  function saveSession() {
    const session = {
      datetime: new Date().toISOString(),
      situation: draft.situation,
      emotions: draft.emotions,
      chosenEmotion: draft.chosenEmotion,
      before: draft.before,
      shape: { ...draft.shape },
      bodyLocation: draft.bodyLocation,
      after: draft.after,
    };
    ctx.store.addSession(session);
    const delta = nrsDelta(draft.before, draft.after);
    const deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '기록됐어요' }),
      el('p', { class: 'delta', text: `${draft.chosenEmotion}: ${draft.before} → ${draft.after} (${deltaText})` }),
      el('button', { class: 'primary', onClick: () => ctx.navigate('dashboard'), text: '홈으로' }),
    ));
  }
}
