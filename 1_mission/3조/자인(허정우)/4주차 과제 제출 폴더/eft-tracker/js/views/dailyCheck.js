import { el, todayStr } from '../util.js';
import { SITUATION_EXAMPLES } from '../data.js';
import { createEmotionPicker } from '../emotionPicker.js';

export function renderDailyCheck(root, ctx) {
  const situation = el('textarea', {
    rows: '3',
    placeholder: `예: ${SITUATION_EXAMPLES[0]}`,
  });

  const status = el('p', { class: 'status', text: '감정을 하나 이상 골라주세요.' });
  const saveBtn = el('button', { class: 'primary big', disabled: 'true', text: '기록하기' });

  const picker = createEmotionPicker({
    multi: true,
    onChange: (selected) => {
      status.textContent = selected.length
        ? `${selected.length}개 선택됨`
        : '감정을 하나 이상 골라주세요.';
      if (selected.length) saveBtn.removeAttribute('disabled');
      else saveBtn.setAttribute('disabled', 'true');
    },
  });

  saveBtn.addEventListener('click', () => {
    const emotions = picker.getSelected();
    if (!emotions.length) return;
    ctx.store.addDailyCheck({
      date: todayStr(),
      datetime: new Date().toISOString(),
      situation: situation.value.trim(),
      emotions,
    });
    ctx.navigate('dashboard');
  });

  const exampleChips = SITUATION_EXAMPLES.map((ex) => {
    const b = el('button', { class: 'chip ghost-chip', type: 'button', text: ex });
    b.addEventListener('click', () => { situation.value = ex; });
    return b;
  });

  root.appendChild(el('section', { class: 'view daily' },
    el('h1', { text: '오늘의 자가진단' }),
    el('p', { class: 'lead', text: '최근 감정이 불편하거나 힘들었던 상황, 혹은 그렇게 만든 사람을 구체적으로 떠올려 보세요.' }),

    el('div', { class: 'card' },
      el('h2', { text: '어떤 상황이었나요?' }),
      el('label', { class: 'field' }, situation),
      el('div', { class: 'examples' },
        el('span', { class: 'hint', text: '예시를 눌러 채울 수 있어요' }),
        el('div', { class: 'chips' }, ...exampleChips),
      ),
    ),

    el('div', { class: 'card' },
      el('h2', { text: '그때 어떤 감정들이 들었나요?' }),
      el('p', { class: 'hint', text: '해당하는 것을 모두 골라주세요. 여러 개도 괜찮습니다.' }),
      picker.element,
    ),

    status,
    saveBtn,
    el('button', {
      class: 'ghost wide',
      onClick: () => ctx.navigate('session'),
      text: '바로 EFT 실천하러 가기',
    }),
  ));
}
