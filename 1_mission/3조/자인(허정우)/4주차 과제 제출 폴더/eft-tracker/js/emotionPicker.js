import { el } from './util.js';
import { EMOTION_CATEGORIES } from './data.js';

/**
 * 카테고리별 감정 칩 선택기. 목록에 없는 감정은 직접 입력할 수 있다.
 *
 * @param {object} options
 * @param {boolean} options.multi          여러 개 고를 수 있는지 (기본 true)
 * @param {string[]} options.categories    사용할 카테고리 목록 (기본 부정 감정)
 * @param {string[]} options.initial       처음 선택되어 있을 감정들
 * @param {(selected: string[]) => void} options.onChange
 * @returns {{ element: HTMLElement, getSelected: () => string[] }}
 */
export function createEmotionPicker({
  multi = true,
  categories = EMOTION_CATEGORIES,
  initial = [],
  onChange = () => {},
} = {}) {
  const selected = new Set(initial);
  const chipsByEmotion = new Map();

  const wrap = el('div', { class: 'emotion-picker' });

  function syncChips() {
    for (const [emotion, chip] of chipsByEmotion) {
      chip.classList.toggle('on', selected.has(emotion));
    }
  }

  function toggle(emotion) {
    if (selected.has(emotion)) {
      selected.delete(emotion);
    } else {
      if (!multi) selected.clear();
      selected.add(emotion);
    }
    syncChips();
    renderCustomTags();
    onChange(getSelected());
  }

  for (const cat of categories) {
    const chips = el('div', { class: 'chips' });
    for (const emotion of cat.emotions) {
      const chip = el('button', { class: 'chip', type: 'button', text: emotion });
      chip.addEventListener('click', () => toggle(emotion));
      chipsByEmotion.set(emotion, chip);
      chips.appendChild(chip);
    }
    wrap.appendChild(el('div', { class: 'emotion-group' },
      el('div', { class: 'group-name', text: cat.name }),
      chips,
    ));
  }

  // 목록에 없는 감정 직접 입력
  const customInput = el('input', { type: 'text', placeholder: '목록에 없다면 직접 적어주세요' });
  const addBtn = el('button', { class: 'ghost small', type: 'button', text: '추가' });
  const customTags = el('div', { class: 'chips custom-tags' });

  function renderCustomTags() {
    customTags.innerHTML = '';
    for (const emotion of selected) {
      if (chipsByEmotion.has(emotion)) continue;
      const tag = el('button', { class: 'chip on', type: 'button', text: `${emotion} ✕` });
      tag.addEventListener('click', () => toggle(emotion));
      customTags.appendChild(tag);
    }
  }

  function addCustom() {
    const value = customInput.value.trim();
    if (!value) return;
    if (!multi) selected.clear();
    selected.add(value);
    customInput.value = '';
    syncChips();
    renderCustomTags();
    onChange(getSelected());
  }

  addBtn.addEventListener('click', addCustom);
  customInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustom();
    }
  });

  wrap.appendChild(el('div', { class: 'emotion-custom' },
    el('div', { class: 'row tight' }, customInput, addBtn),
    customTags,
  ));

  function getSelected() {
    return [...selected];
  }

  syncChips();
  renderCustomTags();

  return { element: wrap, getSelected };
}
