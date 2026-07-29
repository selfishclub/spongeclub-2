import { el } from '../util.js';
import {
  TAP_LEVELS,
  BRAIN_TUNING_INTRO,
  BRAIN_TUNING_STEPS,
  HUGYE_TAP_GUIDE,
  REAPPRAISAL_GUIDE,
  REAPPRAISAL_NOTE,
  TROUBLESHOOTING_STEPS,
  SETUP_AFFIRMATION_TEMPLATE,
  SETUP_AFFIRMATION_EXAMPLES,
} from '../data.js';
import { nrsDelta, improvementRate } from '../scoring.js';
import { mediaSlot } from '../media.js';
import { hugyeImage, TAP_IMAGE_BY_LEVEL } from '../tapImages.js';
import { pointLocation } from '../pointImages.js';

const tapLevelById = (n) => TAP_LEVELS.find((l) => l.id === `lv${n}`);

// 관형형 감정을 되뇌이기 좋은 명사형으로 다듬는다. (예: 긴장한→긴장, 두려운→두려움)
function toNoun(word) {
  const s = (word || '').trim();
  if (s.endsWith('한')) return s.slice(0, -1);       // 긴장한→긴장, 불안한→불안
  if (s.endsWith('운')) return s.slice(0, -1) + '움'; // 두려운→두려움, 외로운→외로움
  return s;
}

// tapStage: 1 | 2 | 3
export function renderTapCycle(root, ctx, tapStage) {
  const state = ctx.store.load();
  const evalRec = state.dailyChecks[state.dailyChecks.length - 1];

  if (!evalRec) {
    root.appendChild(el('section', { class: 'view session' },
      el('div', { class: 'card' },
        el('h2', { text: '먼저 감정평가를 해주세요' }),
        el('p', { class: 'empty', text: '태핑 전에 먼저 감정평가를 해주세요. (1단계 부정 감정 / 2단계 형상화 / 3단계 긍정 강화)' }),
        el('div', { class: 'row' },
          el('button', { class: 'primary', onClick: () => ctx.navigate('eval1'), text: '감정평가 1단계' }),
          el('button', { class: 'primary', onClick: () => ctx.navigate('eval3'), text: '감정평가 3단계' })))));
    return;
  }

  const evalStage = evalRec.stage || 1;
  const isPositive = evalStage === 3; // 3단계는 긍정 강화 → 확언·재평가 방식이 다름
  const focusEmotion = (isPositive ? (evalRec.positiveEmotion || evalRec.chosenEmotion) : evalRec.chosenEmotion) || '이 감정';

  const draft = {
    affirmationPhrase: '',
    affirmationText: evalRec.affirmation || '', // 긍정 확언 전체(3단계)
    emotionNoun: toNoun(focusEmotion),
    before: evalRec.before ?? 5,
    after: evalRec.before ?? 5,
    shapeChange: '',
    emotionChange: '',
    record: '',
  };

  const lv = tapLevelById(tapStage);
  const cycleTitle = `${evalStage}단계 평가 × 태핑 ${tapStage}단계`;

  function defaultAffirmationPhrase() {
    return focusEmotion ? `${focusEmotion} 마음이 들지만` : '';
  }
  function fullAffirmation(phrase) {
    const b = (phrase || '').trim() || '○○하지만';
    return `나는 지금 비록 ${b.endsWith(',') ? b : b + ','} 이런 내 자신을 온전히 받아들이고 사랑합니다.`;
  }
  function positiveAffirmation() {
    return draft.affirmationText || `나는 지금 ${focusEmotion} 감정이 충만해서 너무나 행복하고 감사합니다.`;
  }
  // 현재 사이클에서 쓰는 확언 (부정: 수용확언 / 긍정: 충만확언)
  function currentAffirmation() {
    return isPositive ? positiveAffirmation() : fullAffirmation(draft.affirmationPhrase);
  }
  function slider(key, onInput) {
    const out = el('output', { text: String(draft[key]) });
    const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft[key]) });
    input.addEventListener('input', () => { draft[key] = Number(input.value); out.textContent = input.value; if (onInput) onInput(); });
    return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
  }
  function textArea(label, key, placeholder) {
    const ta = el('textarea', { rows: '3', placeholder });
    ta.value = draft[key];
    ta.addEventListener('input', () => { draft[key] = ta.value; });
    return el('label', { class: 'field' }, el('span', { text: label }), ta);
  }

  const steps = [
    { render: () => el('div', { class: 'card' },
      el('h2', { text: '호흡하기' }),
      el('p', { text: '그 감정이 있는 곳을 마음속으로 바라보며, 깊은 호흡을 천천히 3회 반복하세요.' }),
      el('p', { class: 'emphasis', text: '의식을 집중할수록 효과가 배가됩니다.' })) },

    { render: () => {
      if (isPositive) {
        const input = el('input', { type: 'text', value: positiveAffirmation() });
        const preview = el('p', { class: 'affirm mine', text: positiveAffirmation() });
        input.addEventListener('input', () => { draft.affirmationText = input.value; preview.textContent = input.value; });
        return el('div', { class: 'card' },
          el('h2', { text: '긍정 확언' }),
          el('p', { text: '이 문장을 되뇌이면서 한 손의 후계혈(손날 타점)을 가볍게 두드립니다.' }),
          hugyeImage(),
          el('label', { class: 'field' }, el('span', { text: '확언 문장 (자연스럽게 다듬어 보세요)' }), input),
          preview);
      }
      if (!draft.affirmationPhrase) draft.affirmationPhrase = defaultAffirmationPhrase();
      const phrase = el('input', { type: 'text', value: draft.affirmationPhrase, placeholder: '예: 억울하지만' });
      const preview = el('p', { class: 'affirm mine', text: fullAffirmation(draft.affirmationPhrase) });
      phrase.addEventListener('input', () => { draft.affirmationPhrase = phrase.value; preview.textContent = fullAffirmation(phrase.value); });
      return el('div', { class: 'card' },
        el('h2', { text: '수용확언 만들기' }),
        el('p', { class: 'affirm', text: SETUP_AFFIRMATION_TEMPLATE }),
        hugyeImage(),
        el('label', { class: 'field' }, el('span', { text: '○○ 에 들어갈 말 (자연스럽게 다듬어 보세요)' }), phrase),
        preview,
        el('ul', { class: 'guide-steps' }, ...SETUP_AFFIRMATION_EXAMPLES.map((e) => el('li', { text: e }))),
        el('p', { class: 'note', text: '※ 처음엔 감정·의식적 영역으로 시작하시길 권장드립니다.' })); } },

    { render: () => el('div', { class: 'card' },
      el('h2', { text: '후계혈 소리내어 태핑' }),
      hugyeImage(),
      el('ul', { class: 'guide-steps' }, ...HUGYE_TAP_GUIDE.map((g) => el('li', { text: g }))),
      el('p', { class: 'affirm mine', text: currentAffirmation() }),
      mediaSlot('후계혈 두드리기 시연 영상')) },

    { render: () => {
      const noun = (draft.emotionNoun || focusEmotion).trim();
      return el('div', { class: 'card' },
        el('h2', { text: `태핑 ${tapStage}단계 — ${lv.title}` }),
        el('p', { class: 'hint', text: `"이 ${noun}" 이라고 입으로 되뇌이면서, 각 혈자리를 검지·중지로 가볍게 두드립니다.` }),
        TAP_IMAGE_BY_LEVEL[`lv${tapStage}`](),
        el('ol', { class: 'tap-list' }, ...lv.points.map((p) => el('li', {},
          el('div', { class: 'pt-row' },
            el('strong', { text: p.name }), el('span', { class: 'hint', text: ' — ' + p.hint })),
          pointLocation(p.name, () => TAP_IMAGE_BY_LEVEL[`lv${tapStage}`]())))),
        mediaSlot('태핑 시연 영상 (손가락 2·3지로 가볍게)')); } },

    { render: () => el('div', { class: 'card' },
      el('h2', { text: '뇌조율 과정' }),
      el('p', { text: BRAIN_TUNING_INTRO.meaning }),
      el('p', { class: 'hint', text: BRAIN_TUNING_INTRO.principle }),
      el('p', { text: BRAIN_TUNING_INTRO.howto }),
      el('ol', { class: 'tap-list' }, ...BRAIN_TUNING_STEPS.map((s) => el('li', { text: s }))),
      mediaSlot('뇌조율 동작 이미지·영상')) },

    { render: () => el('div', { class: 'card' },
      el('h2', { text: '심호흡 2번' }),
      el('p', { text: '천천히, 깊게 두 번 호흡합니다.' })) },

    { render: () => {
      const result = el('p', { class: 'hint', text: '' });
      const upd = () => {
        result.textContent = isPositive
          ? `강해진 정도 ${Math.max(0, draft.after - draft.before)}점`
          : `개선율 약 ${improvementRate(draft.before, draft.after)}%`;
      };
      const s = slider('after', upd); upd();
      const card = el('div', { class: 'card' },
        el('h2', { text: '재평가' }),
        el('p', { text: isPositive ? '다시 느껴보고, 그 긍정 감정이 얼마나 충만해졌는지 확인해보세요.' : '다시 느껴보고 감정과 에너지의 강도를 확인해보세요.' }),
        el('p', { class: 'hint', text: `처음엔 ${draft.before}점이었어요. 지금은?` }),
        s, result,
        textArea('에너지 형상은 어떻게 변했나요?', 'shapeChange', '예: 둥글고 환한 빛으로 커졌다'),
        textArea('감정은 어떻게 변했나요?', 'emotionChange', isPositive ? '예: 더 따뜻하고 충만해졌다' : '예: 분노 대신 약간의 연민이 느껴진다'));
      if (isPositive) {
        card.appendChild(el('p', { class: 'note', text: '긍정 감정이 더 충만하고 생생해졌다면 잘 하신 거예요.' }));
      } else {
        REAPPRAISAL_GUIDE.forEach((g) => card.appendChild(el('p', { class: 'guide-line', text: g })));
        card.appendChild(el('p', { class: 'note', text: REAPPRAISAL_NOTE }));
      }
      return card; } },

    { render: () => el('div', { class: 'card' },
      el('h2', { text: '변화 기록하기' }),
      el('p', { class: 'hint', text: 'EFT 실천 전과 후의 변화를 자신만의 언어로 상세히 기록해보세요.' }),
      el('p', { class: 'hint', text: '예: 감정 레벨이 9→4로 줄었다 · 장면이 멀리 작아졌다 · 원망스럽던 상대가 조금 이해되기 시작했다' }),
      textArea('나의 변화 기록', 'record', '느낀 그대로 자유롭게 적어보세요'),
      el('button', { class: 'primary big', onClick: saveSession, text: '기록 저장' })) },
  ];

  let idx = 0;
  const section = el('section', { class: 'view session' });
  const inner = el('div', { class: 'session-inner' });
  section.append(inner);
  root.appendChild(section);
  render();

  function render() {
    inner.innerHTML = '';
    inner.appendChild(el('div', { class: 'stepbar', text: `${cycleTitle} · ${idx + 1} / ${steps.length}` }));
    inner.appendChild(steps[idx].render());
    inner.appendChild(controls());
    window.scrollTo(0, 0);
  }

  function controls() {
    const row = el('div', { class: 'row' });
    if (idx > 0) row.appendChild(el('button', { class: 'ghost', onClick: () => { idx -= 1; render(); }, text: '이전' }));
    if (idx < steps.length - 1) row.appendChild(el('button', { class: 'primary', onClick: () => { idx += 1; render(); }, text: '다음' }));
    return row;
  }

  function saveSession() {
    ctx.store.addSession({
      datetime: new Date().toISOString(),
      evalStage,
      tapStage,
      chosenEmotion: focusEmotion,
      before: draft.before,
      after: draft.after,
      affirmation: currentAffirmation(),
      shapeChange: draft.shapeChange,
      emotionChange: draft.emotionChange,
      record: draft.record,
    });
    let deltaText;
    let verdict;
    if (isPositive) {
      const gain = draft.after - draft.before;
      deltaText = gain > 0 ? `+${gain}` : String(gain);
      verdict = gain >= 3 ? '긍정 에너지가 크게 충만해졌어요.'
        : gain > 0 ? '조금 더 충만해졌어요.'
          : '다른 태핑 단계로 더 강화해보세요.';
    } else {
      const delta = nrsDelta(draft.before, draft.after);
      const rate = improvementRate(draft.before, draft.after);
      deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
      verdict = rate >= 50 ? '충분히 효과를 잘 보셨습니다.'
        : rate >= 30 ? '변화가 있었습니다. 다른 태핑 단계도 해보시면 더 좋아질 수 있어요.'
          : '아직 변화가 크지 않네요. 다음 안내를 참고해보세요.';
    }
    const summaryLine = isPositive
      ? `강해진 정도 ${Math.max(0, draft.after - draft.before)}점`
      : `개선율 약 ${improvementRate(draft.before, draft.after)}%`;

    const others = [1, 2, 3].filter((n) => n !== tapStage)
      .map((n) => el('button', { class: 'primary', onClick: () => ctx.navigate(`tap${n}`), text: `태핑 ${n}단계` }));

    inner.innerHTML = '';
    inner.appendChild(el('div', { class: 'card result' },
      el('h2', { text: '기록됐어요' }),
      el('p', { class: 'delta', text: `${focusEmotion}: ${draft.before} → ${draft.after} (${deltaText})` }),
      el('p', { class: 'hint', text: `${summaryLine} · ${verdict}` }),
      el('div', { class: 'card soft' },
        el('p', { class: 'hint', text: '효과가 미비하거나 더 강화하고 싶다면:' }),
        el('ol', { class: 'guide-steps' }, ...TROUBLESHOOTING_STEPS.map((t) => el('li', { text: t })))),
      el('p', { class: 'hint', text: '다른 태핑 단계로 이어가기:' }),
      el('div', { class: 'row' }, ...others),
      el('button', { class: 'ghost wide', onClick: () => { idx = steps.length - 1; render(); }, text: '이전 단계로' }),
      el('button', { class: 'ghost wide', onClick: () => ctx.navigate('home'), text: '홈으로' })));
  }
}
