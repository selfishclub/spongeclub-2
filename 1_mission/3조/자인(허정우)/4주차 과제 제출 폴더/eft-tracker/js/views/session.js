import { el } from '../util.js';
import {
  SHAPE_FIELDS,
  SITUATION_EXAMPLES,
  BODY_LOCATION_EXAMPLES,
  TAP_LEVELS,
  BRAIN_TUNING_INTRO,
  BRAIN_TUNING_STEPS,
  REAPPRAISAL_GUIDE,
  TROUBLESHOOTING_STEPS,
  SETUP_AFFIRMATION_TEMPLATE,
  SETUP_AFFIRMATION_EXAMPLES,
} from '../data.js';
import { nrsDelta, improvementRate } from '../scoring.js';
import { createEmotionPicker } from '../emotionPicker.js';

const TOTAL = 12;

// 이미지·영상·음악이 들어갈 자리. 자산을 받으면 이 자리를 실제 미디어로 교체한다.
function mediaSlot(label) {
  return el('div', { class: 'media-slot' }, el('span', { text: `🎬 ${label} — 자료 준비 중` }));
}

function levelById(id) {
  return TAP_LEVELS.find((l) => l.id === id);
}

export function renderSession(root, ctx) {
  const state = ctx.store.load();
  const lastCheck = state.dailyChecks[state.dailyChecks.length - 1];

  const draft = {
    situation: '',
    emotions: [],
    chosenEmotion: '',
    before: 5,
    after: 5,
    bodyLocation: '',
    shape: { size: '', weight: '', temperature: '', color: '', form: '', texture: '' },
    affirmationPhrase: '',
    level: 'lv1',
  };

  let step = 1;
  const container = el('section', { class: 'view session' });
  root.appendChild(container);
  render();

  function render() {
    container.innerHTML = '';
    container.appendChild(el('div', { class: 'stepbar', text: `EFT 실천 · ${step} / ${TOTAL} 단계` }));
    container.appendChild(stepBody());
    container.appendChild(controls());
    container.scrollIntoView({ block: 'start' });
  }

  function controls() {
    const row = el('div', { class: 'row' });
    if (step > 1) {
      row.appendChild(el('button', { class: 'ghost', onClick: () => { step -= 1; render(); }, text: '이전' }));
    }
    if (step < TOTAL) {
      row.appendChild(el('button', {
        class: 'primary',
        onClick: () => { if (validate()) { step += 1; render(); } },
        text: '다음',
      }));
    }
    return row;
  }

  // 감정 목록은 관형형("억울한", "화가 나는")이라 "하지만"을 그대로 붙이면
  // "억울한하지만"이 된다. 어떤 형태든 자연스러운 "~ 마음이 들지만"으로 만들어 두고,
  // 사용자가 "억울하지만"처럼 직접 다듬을 수 있게 한다.
  function defaultAffirmationPhrase() {
    const emotion = draft.chosenEmotion.trim();
    if (!emotion) return '';
    return `${emotion} 마음이 들지만`;
  }

  function fullAffirmation(phrase) {
    const body = phrase.trim() || '○○하지만';
    const withComma = body.endsWith(',') ? body : `${body},`;
    return `나는 지금 비록 ${withComma} 이런 내 자신을 온전히 받아들이고 사랑합니다.`;
  }

  function validate() {
    if (step === 2 && !draft.chosenEmotion.trim()) {
      alert('가장 큰 감정 하나를 골라주세요.');
      return false;
    }
    return true;
  }

  function slider(key, onInput) {
    const out = el('output', { text: String(draft[key]) });
    const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft[key]) });
    input.addEventListener('input', () => {
      draft[key] = Number(input.value);
      out.textContent = input.value;
      if (onInput) onInput();
    });
    return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
  }

  function textField(label, get, set, placeholder = '') {
    const input = el('input', { type: 'text', value: get(), placeholder });
    input.addEventListener('input', () => set(input.value));
    return el('label', { class: 'field' }, el('span', { text: label }), input);
  }

  function chipRow(values, onPick) {
    return el('div', { class: 'chips' }, ...values.map((v) => {
      const b = el('button', { class: 'chip ghost-chip', type: 'button', text: v });
      b.addEventListener('click', () => onPick(v));
      return b;
    }));
  }

  function tapPointList(level) {
    return el('ol', { class: 'tap-list' }, ...level.points.map((p) => el('li', {},
      el('strong', { text: p.name }),
      el('span', { class: 'hint', text: ' — ' + p.hint }),
    )));
  }

  function stepBody() {
    switch (step) {
      // 1. 상황
      case 1: {
        const ta = el('textarea', { rows: '3', placeholder: `예: ${SITUATION_EXAMPLES[0]}` });
        ta.value = draft.situation;
        ta.addEventListener('input', () => { draft.situation = ta.value; });

        const card = el('div', { class: 'card' },
          el('h2', { text: '1. 어떤 상황인가요?' }),
          el('p', { class: 'hint', text: '최근 감정이 불편하거나 힘들었던 상황 혹은 그렇게 만든 사람을 구체적으로 떠올려 보세요.' }),
          el('label', { class: 'field' }, ta),
          el('div', { class: 'examples' },
            el('span', { class: 'hint', text: '예시를 눌러 채울 수 있어요' }),
            chipRow(SITUATION_EXAMPLES, (v) => { ta.value = v; draft.situation = v; }),
          ),
        );

        if (lastCheck) {
          const btn = el('button', { class: 'ghost wide', type: 'button', text: '오늘 자가진단 기록 불러오기' });
          btn.addEventListener('click', () => {
            draft.situation = lastCheck.situation || '';
            draft.emotions = [...(lastCheck.emotions || [])];
            ta.value = draft.situation;
          });
          card.appendChild(btn);
        }
        return card;
      }

      // 2. 대표 감정
      case 2: {
        const picker = createEmotionPicker({
          multi: false,
          initial: draft.chosenEmotion ? [draft.chosenEmotion] : [],
          onChange: (sel) => { draft.chosenEmotion = sel[0] || ''; },
        });
        const card = el('div', { class: 'card' },
          el('h2', { text: '2. 가장 큰 감정 하나를 고르세요' }),
          el('p', { class: 'hint', text: '여러 감정 중 지금 가장 크게 느껴지는 것 하나만 고릅니다.' }),
        );
        if (draft.emotions.length) {
          card.appendChild(el('div', { class: 'recall' },
            el('span', { class: 'hint', text: '자가진단에서 고른 감정: ' }),
            chipRow(draft.emotions, (v) => {
              draft.chosenEmotion = v;
              render();
            }),
          ));
        }
        card.appendChild(picker.element);
        return card;
      }

      // 3. 강도 (before)
      case 3:
        return el('div', { class: 'card' },
          el('h2', { text: '3. 지금 그 감정은 얼마나 강한가요?' }),
          el('p', { class: 'hint', text: '0(전혀) ~ 10(매우 강함)' }),
          slider('before'),
        );

      // 4. 몸의 위치 (형상화보다 앞)
      case 4: {
        const input = el('input', { type: 'text', value: draft.bodyLocation, placeholder: '예: 가슴 중앙, 명치, 복부' });
        input.addEventListener('input', () => { draft.bodyLocation = input.value; });
        return el('div', { class: 'card' },
          el('h2', { text: '4. 그 느낌은 몸의 어디에 있나요?' }),
          el('label', { class: 'field' }, el('span', { text: '몸의 위치' }), input),
          chipRow(BODY_LOCATION_EXAMPLES, (v) => { draft.bodyLocation = v; input.value = v; }),
        );
      }

      // 5. 형상화
      case 5:
        return el('div', { class: 'card' },
          el('h2', { text: '5. 그 감정을 몸의 느낌으로 그려보세요' }),
          el('p', { class: 'hint', text: '구체적이고 생생하게 상상할수록 효과가 커집니다.' }),
          el('p', { class: 'hint', text: '다 채우지 않고, 잘 느껴지는 항목만 적으시면 됩니다.' }),
          ...SHAPE_FIELDS.map((f) => textField(
            f.label,
            () => draft.shape[f.key],
            (v) => { draft.shape[f.key] = v; },
            f.placeholder,
          )),
        );

      // 6. 호흡
      case 6:
        return el('div', { class: 'card' },
          el('h2', { text: '6. 호흡하기' }),
          el('p', { text: '그 감정이 있는 곳을 마음속으로 바라보며, 깊은 호흡을 천천히 3회 반복하세요.' }),
          el('p', { class: 'emphasis', text: '의식을 집중할수록 효과가 배가됩니다.' }),
        );

      // 7. 수용확언
      case 7: {
        if (!draft.affirmationPhrase) draft.affirmationPhrase = defaultAffirmationPhrase();
        const phrase = el('input', { type: 'text', value: draft.affirmationPhrase, placeholder: '예: 억울하지만' });
        const preview = el('p', { class: 'affirm mine', text: fullAffirmation(draft.affirmationPhrase) });
        phrase.addEventListener('input', () => {
          draft.affirmationPhrase = phrase.value;
          preview.textContent = fullAffirmation(phrase.value);
        });

        return el('div', { class: 'card' },
          el('h2', { text: '7. 수용확언 만들기' }),
          el('p', { class: 'affirm', text: SETUP_AFFIRMATION_TEMPLATE }),
          el('p', { text: '이 문장을 되뇌이면서 한 손의 후계혈(손날 타점)을 반대측 손 검지·중지로 가볍게 두드립니다. 방향은 상관없고, 자신이 편한 한쪽만 하셔도 됩니다.' }),
          mediaSlot('후계혈 두드리는 이미지·영상'),
          el('p', { class: 'hint', text: '○○ 부분에는 앞에서 찾은 힘든 감정이나 불편한 상태를 넣으시면 됩니다. (신체적·정신적 영역 모두 가능)' }),
          el('label', { class: 'field' }, el('span', { text: '○○ 에 들어갈 말 (자연스럽게 다듬어 보세요)' }), phrase),
          preview,
          el('p', { class: 'hint', text: '이렇게 적으시면 됩니다:' }),
          el('ul', { class: 'guide-steps' }, ...SETUP_AFFIRMATION_EXAMPLES.map((e) => el('li', { text: e }))),
          el('p', { class: 'note', text: '※ 신체적 증상에도 두루 효과가 있지만, 처음엔 감정·의식적 영역으로 시작하시길 권장드립니다.' }),
        );
      }

      // 8. 타점 두드리기 Lv.1
      case 8: {
        const lv1 = levelById('lv1');
        return el('div', { class: 'card' },
          el('h2', { text: `8. EFT 타점 두드리기 ${lv1.name} (${lv1.title})` }),
          mediaSlot('배경 음악'),
          el('p', { class: 'hint', text: '각 타점을 검지·중지로 30회씩 두드리며, 그 감정과 에너지에 집중하세요.' }),
          tapPointList(lv1),
          el('p', { class: 'hint', text: '양 체간 좌우 대칭으로 진행합니다.' }),
          mediaSlot('타점 위치 안내 이미지'),
          mediaSlot('두드리기·문지르기 시연 영상 (속도·횟수 참고용)'),
        );
      }

      // 9. 뇌조율
      case 9:
        return el('div', { class: 'card' },
          el('h2', { text: '9. 뇌조율 과정' }),
          el('p', { text: BRAIN_TUNING_INTRO.meaning }),
          el('p', { class: 'hint', text: BRAIN_TUNING_INTRO.principle }),
          el('p', { text: BRAIN_TUNING_INTRO.howto }),
          el('ol', { class: 'tap-list' }, ...BRAIN_TUNING_STEPS.map((s) => el('li', { text: s }))),
          mediaSlot('뇌조율 동작 이미지·영상'),
        );

      // 10. 심호흡
      case 10:
        return el('div', { class: 'card' },
          el('h2', { text: '10. 심호흡 2번' }),
          el('p', { text: '천천히, 깊게 두 번 호흡합니다.' }),
        );

      // 11. 재평가
      case 11: {
        const result = el('p', { class: 'hint', text: '' });
        function updateResult() {
          const rate = improvementRate(draft.before, draft.after);
          result.textContent = `개선율 약 ${rate}%`;
        }
        const s = slider('after', updateResult);
        updateResult();
        return el('div', { class: 'card' },
          el('h2', { text: '11. 재평가' }),
          el('p', { text: '다시 느껴보고 감정과 에너지의 강도를 확인해보세요.' }),
          el('p', { class: 'hint', text: `처음엔 ${draft.before}점이었어요. 지금은?` }),
          s,
          result,
          ...REAPPRAISAL_GUIDE.map((g) => el('p', { class: 'guide-line', text: g })),
          el('button', { class: 'primary big', onClick: saveSession, text: '기록 저장' }),
        );
      }

      // 12. 효과가 미비할 경우
      case 12:
        return el('div', { class: 'card' },
          el('h2', { text: '12. 효과가 미비할 경우' }),
          el('ol', { class: 'guide-steps' }, ...TROUBLESHOOTING_STEPS.map((t) => el('li', { text: t }))),
          el('button', { class: 'ghost wide', onClick: () => ctx.navigate('levels'), text: 'Lv.2 · Lv.3 · Lv.4 보기' }),
          el('button', { class: 'primary big', onClick: () => ctx.navigate('dashboard'), text: '홈으로' }),
        );

      default:
        return el('div', {});
    }
  }

  function saveSession() {
    ctx.store.addSession({
      datetime: new Date().toISOString(),
      situation: draft.situation,
      emotions: draft.emotions,
      chosenEmotion: draft.chosenEmotion,
      before: draft.before,
      after: draft.after,
      bodyLocation: draft.bodyLocation,
      shape: { ...draft.shape },
      affirmation: fullAffirmation(draft.affirmationPhrase),
      level: draft.level,
    });

    const delta = nrsDelta(draft.before, draft.after);
    const rate = improvementRate(draft.before, draft.after);
    const deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
    const verdict = rate >= 50
      ? '충분히 효과를 잘 보셨습니다.'
      : rate >= 30
        ? '변화가 있었습니다. 한 번 더 해보시면 더 좋아질 수 있어요.'
        : '아직 변화가 크지 않네요. 다음 단계의 해결법을 확인해보세요.';

    container.innerHTML = '';
    container.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '기록됐어요' }),
      el('p', { class: 'delta', text: `${draft.chosenEmotion}: ${draft.before} → ${draft.after} (${deltaText})` }),
      el('p', { class: 'hint', text: `개선율 약 ${rate}% · ${verdict}` }),
      el('div', { class: 'row' },
        el('button', { class: 'ghost', onClick: () => { step = 12; render(); }, text: '효과가 미비하다면' }),
        el('button', { class: 'primary', onClick: () => ctx.navigate('dashboard'), text: '홈으로' }),
      ),
    ));
  }
}
