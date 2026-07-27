import { el } from '../util.js';
import {
  SHAPE_FIELDS,
  TAP_LEVELS,
  EVAL_LEVELS,
  BRAIN_TUNING_INTRO,
  BRAIN_TUNING_STEPS,
  HUGYE_TAP_GUIDE,
  REAPPRAISAL_GUIDE,
  REAPPRAISAL_NOTE,
  TROUBLESHOOTING_STEPS,
  SETUP_AFFIRMATION_TEMPLATE,
  SETUP_AFFIRMATION_EXAMPLES,
  MUSIC_YOUTUBE_ID,
  POSITIVE_EMOTION_CATEGORIES,
} from '../data.js';
import { nrsDelta, improvementRate } from '../scoring.js';
import { createEmotionPicker } from '../emotionPicker.js';
import { mediaSlot, youtubeEmbed } from '../media.js';
import { hugyeImage, TAP_IMAGE_BY_LEVEL } from '../tapImages.js';

const tapLevel = (id) => TAP_LEVELS.find((l) => l.id === id);
const evalLevel = (id) => EVAL_LEVELS.find((l) => l.id === id);

export function renderSession(root, ctx) {
  let cycleLevel = 'lv1'; // lv1 → lv2 → lv3
  runCycle();

  function runCycle() {
    root.innerHTML = '';
    const state = ctx.store.load();
    const lastCheck = state.dailyChecks[state.dailyChecks.length - 1];

    const draft = {
      situation: lastCheck?.situation || '',
      emotions: lastCheck?.emotions ? [...lastCheck.emotions] : [],
      chosenEmotion: lastCheck?.chosenEmotion || '',
      emotionNoun: lastCheck?.chosenEmotion || '',
      before: lastCheck?.before ?? 5,
      bodyLocation: lastCheck?.bodyLocation || '',
      shape: { size: '', weight: '', temperature: '', color: '', form: '', texture: '' },
      positiveEmotion: '',
      positiveImagery: '',
      affirmationPhrase: '',
      after: 5,
      shapeChange: '',
      emotionChange: '',
      record: '',
    };

    // shape_* 를 draft.shape 로 미러링 (textField 가 draft[key] 를 읽고 쓰므로)
    for (const f of SHAPE_FIELDS) {
      Object.defineProperty(draft, `shape_${f.key}`, {
        get() { return draft.shape[f.key]; },
        set(v) { draft.shape[f.key] = v; },
        enumerable: false,
        configurable: true,
      });
    }

    const steps = buildSteps(cycleLevel, draft, lastCheck);
    let idx = 0;

    const container = el('section', { class: 'view session' });
    root.appendChild(container);
    render();

    function render() {
      container.innerHTML = '';
      const lv = evalLevel(cycleLevel);
      container.appendChild(el('div', { class: 'stepbar', text: `${lv.name} 사이클 · ${idx + 1} / ${steps.length}` }));
      container.appendChild(steps[idx].render());
      container.appendChild(controls());
      window.scrollTo(0, 0);
    }

    function controls() {
      const row = el('div', { class: 'row' });
      if (idx > 0) row.appendChild(el('button', { class: 'ghost', onClick: () => { idx -= 1; render(); }, text: '이전' }));
      if (idx < steps.length - 1) {
        row.appendChild(el('button', {
          class: 'primary',
          onClick: () => { if (steps[idx].validate ? steps[idx].validate() : true) { idx += 1; render(); } },
          text: '다음',
        }));
      }
      return row;
    }

    // ── 공통 헬퍼 ──────────────────────────────────────
    function slider(key, onInput) {
      const out = el('output', { text: String(draft[key]) });
      const input = el('input', { type: 'range', min: '0', max: '10', step: '1', value: String(draft[key]) });
      input.addEventListener('input', () => { draft[key] = Number(input.value); out.textContent = input.value; if (onInput) onInput(); });
      return el('div', { class: 'nrs' }, el('span', { text: '0' }), input, el('span', { text: '10' }), out);
    }

    function textField(label, key, placeholder = '') {
      const input = el('input', { type: 'text', value: draft[key], placeholder });
      input.addEventListener('input', () => { draft[key] = input.value; });
      return el('label', { class: 'field' }, el('span', { text: label }), input);
    }

    function textArea(label, key, placeholder = '') {
      const ta = el('textarea', { rows: '3', placeholder });
      ta.value = draft[key];
      ta.addEventListener('input', () => { draft[key] = ta.value; });
      return el('label', { class: 'field' }, el('span', { text: label }), ta);
    }

    function defaultAffirmationPhrase() {
      const e = draft.chosenEmotion.trim();
      return e ? `${e} 마음이 들지만` : '';
    }
    function fullAffirmation(phrase) {
      const body = (phrase || '').trim() || '○○하지만';
      const withComma = body.endsWith(',') ? body : `${body},`;
      return `나는 지금 비록 ${withComma} 이런 내 자신을 온전히 받아들이고 사랑합니다.`;
    }

    function tapCard(levelId, extra = []) {
      const lv = tapLevel(levelId);
      const noun = (draft.emotionNoun || draft.chosenEmotion || '이 감정').trim();
      return el('div', { class: 'card' },
        el('h2', { text: `태핑 ${lv.name} — ${lv.title}` }),
        el('p', { class: 'hint', text: `"이 ${noun}" 이라고 입으로 되뇌이면서, 각 혈자리를 검지·중지로 가볍게 두드립니다.` }),
        TAP_IMAGE_BY_LEVEL[levelId](),
        el('ol', { class: 'tap-list' }, ...lv.points.map((p) => el('li', {},
          el('strong', { text: p.name }), el('span', { class: 'hint', text: ' — ' + p.hint })))),
        ...extra,
      );
    }

    // ── 스텝 정의 ──────────────────────────────────────
    function buildSteps(level) {
      const evalHead = evalHeadSteps(level);
      const tail = [
        { // 호흡
          render: () => el('div', { class: 'card' },
            el('h2', { text: '호흡하기' }),
            el('p', { text: '그 감정이 있는 곳을 마음속으로 바라보며, 깊은 호흡을 천천히 3회 반복하세요.' }),
            el('p', { class: 'emphasis', text: '의식을 집중할수록 효과가 배가됩니다.' })),
        },
        { // 수용확언
          render: () => {
            if (!draft.affirmationPhrase) draft.affirmationPhrase = defaultAffirmationPhrase();
            const phrase = el('input', { type: 'text', value: draft.affirmationPhrase, placeholder: '예: 억울하지만' });
            const preview = el('p', { class: 'affirm mine', text: fullAffirmation(draft.affirmationPhrase) });
            phrase.addEventListener('input', () => { draft.affirmationPhrase = phrase.value; preview.textContent = fullAffirmation(phrase.value); });
            return el('div', { class: 'card' },
              el('h2', { text: '수용확언 만들기' }),
              el('p', { class: 'affirm', text: SETUP_AFFIRMATION_TEMPLATE }),
              el('p', { text: '이 문장을 되뇌이면서 한 손의 후계혈(손날 타점)을 반대측 손 검지·중지로 가볍게 두드립니다. 방향은 상관없고, 편한 한쪽만 하셔도 됩니다.' }),
              hugyeImage(),
              el('label', { class: 'field' }, el('span', { text: '○○ 에 들어갈 말 (자연스럽게 다듬어 보세요)' }), phrase),
              preview,
              el('ul', { class: 'guide-steps' }, ...SETUP_AFFIRMATION_EXAMPLES.map((e) => el('li', { text: e }))),
              el('p', { class: 'note', text: '※ 신체적 증상에도 두루 효과가 있지만, 처음엔 감정·의식적 영역으로 시작하시길 권장드립니다.' }));
          },
        },
        { // 후계혈 소리내어 태핑
          render: () => el('div', { class: 'card' },
            el('h2', { text: '후계혈 소리내어 태핑' }),
            hugyeImage(),
            el('ul', { class: 'guide-steps' }, ...HUGYE_TAP_GUIDE.map((g) => el('li', { text: g }))),
            el('p', { class: 'affirm mine', text: fullAffirmation(draft.affirmationPhrase) }),
            youtubeEmbed(MUSIC_YOUTUBE_ID),
            mediaSlot('후계혈 두드리기 시연 영상')),
        },
        { render: () => tapCard('lv1', [mediaSlot('태핑 시연 영상 (손가락 2·3지로 가볍게)')]) },
        { render: () => tapCard('lv2') },
        { render: () => tapCard('lv3') },
        { // 뇌조율
          render: () => el('div', { class: 'card' },
            el('h2', { text: '뇌조율 과정' }),
            el('p', { text: BRAIN_TUNING_INTRO.meaning }),
            el('p', { class: 'hint', text: BRAIN_TUNING_INTRO.principle }),
            el('p', { text: BRAIN_TUNING_INTRO.howto }),
            el('ol', { class: 'tap-list' }, ...BRAIN_TUNING_STEPS.map((s) => el('li', { text: s }))),
            mediaSlot('뇌조율 동작 이미지·영상')),
        },
        { // 심호흡
          render: () => el('div', { class: 'card' },
            el('h2', { text: '심호흡 2번' }),
            el('p', { text: '천천히, 깊게 두 번 호흡합니다.' })),
        },
        { // 재평가
          render: () => {
            const result = el('p', { class: 'hint', text: '' });
            const upd = () => { result.textContent = `개선율 약 ${improvementRate(draft.before, draft.after)}%`; };
            const s = slider('after', upd); upd();
            return el('div', { class: 'card' },
              el('h2', { text: '재평가' }),
              el('p', { text: '다시 느껴보고 감정과 에너지의 강도를 확인해보세요.' }),
              el('p', { class: 'hint', text: `처음엔 ${draft.before}점이었어요. 지금은?` }),
              s, result,
              textArea('에너지 형상은 어떻게 변했나요?', 'shapeChange', '예: 뾰족하던 게 둥글고 작아졌다'),
              textArea('감정은 어떻게 변했나요?', 'emotionChange', '예: 분노 대신 약간의 연민이 느껴진다'),
              ...REAPPRAISAL_GUIDE.map((g) => el('p', { class: 'guide-line', text: g })),
              el('p', { class: 'note', text: REAPPRAISAL_NOTE }));
          },
        },
        { // 기록
          render: () => el('div', { class: 'card' },
            el('h2', { text: '변화 기록하기' }),
            el('p', { class: 'hint', text: 'EFT 실천 전과 후의 변화를 자신만의 언어로 상세히 기록해보세요.' }),
            el('p', { class: 'hint', text: '예: 감정 레벨이 9→4로 줄었다 · 장면이 멀리 작아졌다 · 원망스럽던 상대가 조금 이해되기 시작했다 · 분노 대신 약간의 연민이 느껴졌다' }),
            textArea('나의 변화 기록', 'record', '느낀 그대로 자유롭게 적어보세요'),
            el('button', { class: 'primary big', onClick: saveSession, text: '기록 저장' })),
        },
      ];
      return [...evalHead, ...tail];
    }

    function evalHeadSteps(level) {
      if (level === 'lv1') {
        return [{
          validate: () => {
            if (!draft.chosenEmotion) { alert('먼저 자가평가에서 감정을 기록해주세요.'); return false; }
            return true;
          },
          render: () => {
            if (!draft.chosenEmotion) {
              return el('div', { class: 'card' },
                el('h2', { text: '평가 Lv.1 — 기본 평가' }),
                el('p', { class: 'empty', text: '아직 자가평가 기록이 없어요. 먼저 상황과 감정을 평가해주세요.' }),
                el('button', { class: 'primary big', onClick: () => ctx.navigate('daily'), text: '자가평가 하러 가기' }));
            }
            return el('div', { class: 'card' },
              el('h2', { text: '평가 Lv.1 — 기본 평가' }),
              el('p', { text: `상황: ${draft.situation || '(적지 않음)'}` }),
              el('p', { text: `주된 감정: ${draft.chosenEmotion}` }),
              el('p', { text: `몸의 위치: ${draft.bodyLocation || '(적지 않음)'}` }),
              el('p', { class: 'hint', text: '지금 이 감정의 강도를 다시 확인해주세요.' }),
              slider('before'),
              textField('감정을 한 단어(명사)로', 'emotionNoun', '예: 억울함, 짜증'));
          },
        }];
      }
      if (level === 'lv2') {
        return [{
          render: () => el('div', { class: 'card' },
            el('h2', { text: '평가 Lv.2 — 에너지 형상화' }),
            el('p', { class: 'hint', text: evalLevel('lv2').description }),
            el('p', { class: 'hint', text: '다 채우지 않고, 잘 느껴지는 항목만 적으시면 됩니다.' }),
            ...SHAPE_FIELDS.map((f) => textField(f.label, `shape_${f.key}`, f.placeholder)
              // shape.* 를 draft.shape 에 반영
              ),
            slider('before')),
        }];
      }
      // lv3
      return [{
        render: () => {
          const picker = createEmotionPicker({
            multi: false,
            categories: POSITIVE_EMOTION_CATEGORIES,
            initial: draft.positiveEmotion ? [draft.positiveEmotion] : [],
            onChange: (sel) => { draft.positiveEmotion = sel[0] || ''; },
          });
          return el('div', { class: 'card' },
            el('h2', { text: '평가 Lv.3 — 긍정 감정·에너지 강화' }),
            el('ul', { class: 'guide-steps' }, ...evalLevel('lv3').guide.map((g) => el('li', { text: g }))),
            el('p', { class: 'hint', text: '문제가 해결됐을 때 느끼고 싶은 긍정 감정을 하나 고르세요.' }),
            picker.element,
            textArea('그때의 에너지 형상을 그려보세요', 'positiveImagery', '예: 가슴이 따뜻하고 환한 빛으로 가득 찬다'),
            el('p', { class: 'hint', text: '지금 그 긍정 상태가 얼마나 생생한지(0~10) 표시해주세요. 태핑 후 더 강해지는 걸 목표로 합니다.' }),
            slider('before'));
        },
      }];
    }

    function saveSession() {
      ctx.store.addSession({
        datetime: new Date().toISOString(),
        cycleLevel,
        situation: draft.situation,
        emotions: draft.emotions,
        chosenEmotion: draft.chosenEmotion,
        before: draft.before,
        after: draft.after,
        bodyLocation: draft.bodyLocation,
        shape: { ...draft.shape },
        positiveEmotion: draft.positiveEmotion,
        positiveImagery: draft.positiveImagery,
        affirmation: fullAffirmation(draft.affirmationPhrase),
        shapeChange: draft.shapeChange,
        emotionChange: draft.emotionChange,
        record: draft.record,
      });

      const delta = nrsDelta(draft.before, draft.after);
      const rate = improvementRate(draft.before, draft.after);
      const deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
      const verdict = rate >= 50 ? '충분히 효과를 잘 보셨습니다.'
        : rate >= 30 ? '변화가 있었습니다. 한 번 더 해보시면 더 좋아질 수 있어요.'
          : '아직 변화가 크지 않네요. 다음 단계를 참고해보세요.';

      const nextBtn = cycleLevel === 'lv1'
        ? el('button', { class: 'primary', onClick: () => { cycleLevel = 'lv2'; runCycle(); }, text: '평가 Lv.2 사이클 (형상화 강화)' })
        : cycleLevel === 'lv2'
          ? el('button', { class: 'primary', onClick: () => { cycleLevel = 'lv3'; runCycle(); }, text: '평가 Lv.3 사이클 (긍정 강화)' })
          : null;

      container.innerHTML = '';
      container.appendChild(el('div', { class: 'card result' },
        el('h2', { text: '기록됐어요' }),
        el('p', { class: 'delta', text: `${draft.chosenEmotion || '감정'}: ${draft.before} → ${draft.after} (${deltaText})` }),
        el('p', { class: 'hint', text: `개선율 약 ${rate}% · ${verdict}` }),
        el('div', { class: 'card soft' },
          el('p', { class: 'hint', text: '효과가 미비하거나 더 강화하고 싶다면:' }),
          el('ol', { class: 'guide-steps' }, ...TROUBLESHOOTING_STEPS.map((t) => el('li', { text: t }))),
        ),
        el('div', { class: 'row' },
          nextBtn,
          el('button', { class: nextBtn ? 'ghost' : 'primary', onClick: () => ctx.navigate('dashboard'), text: '홈으로' }),
        )));
    }
  }
}
