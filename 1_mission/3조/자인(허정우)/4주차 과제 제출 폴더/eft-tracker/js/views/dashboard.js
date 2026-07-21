import { el, todayStr } from '../util.js';
import { computeStreak } from '../streak.js';
import { MOTIVATION_PROMPT, SHARE_MESSAGE } from '../data.js';

const NS = 'http://www.w3.org/2000/svg';

// EFT 세션의 before → after 를 세션별로 나란히 그린다. (NRS 0~10)
function beforeAfterChart(sessions) {
  const W = 320, H = 130, pad = 20, MAX = 10;
  const n = sessions.length;
  const slot = n > 0 ? (W - pad * 2) / n : 0;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart');

  sessions.forEach((s, i) => {
    const barW = Math.max(3, slot * 0.3);
    const x0 = pad + i * slot + slot * 0.1;
    const draw = (value, offset, cls) => {
      const h = (value / MAX) * (H - pad * 2);
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', String(x0 + offset));
      rect.setAttribute('y', String(H - pad - h));
      rect.setAttribute('width', String(barW));
      rect.setAttribute('height', String(h));
      rect.setAttribute('rx', '2');
      rect.setAttribute('class', cls);
      svg.appendChild(rect);
    };
    draw(s.before, 0, 'bar before');
    draw(s.after, barW + 2, 'bar after');

    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', String(x0 + barW));
    label.setAttribute('y', String(H - pad + 12));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'bar-label');
    label.textContent = (s.datetime || '').slice(5, 10);
    svg.appendChild(label);
  });

  return svg;
}

function stat(label, value) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat-value', text: value }),
    el('div', { class: 'stat-label', text: label }),
  );
}

export function renderDashboard(root, ctx) {
  const state = ctx.store.load();
  const section = el('section', { class: 'view dashboard' });

  const greeting = state.nickname ? `${state.nickname}님, 오늘 마음은 어떠세요?` : '오늘 마음은 어떠세요?';
  section.appendChild(el('h1', { class: 'greeting', text: greeting }));

  if (!state.eftGuideSeen) {
    section.appendChild(el('div', { class: 'card banner' },
      el('span', { text: 'EFT가 처음이신가요? 먼저 방법을 볼 수 있어요.' }),
      el('button', { class: 'ghost', onClick: () => ctx.navigate('guide'), text: '방법 보기' }),
    ));
  }

  const streak = computeStreak(state.dailyChecks, todayStr());
  section.appendChild(el('div', { class: 'stats' },
    stat('연속 실천', `${streak}일`),
    stat('자가진단', `${state.dailyChecks.length}회`),
    stat('EFT 세션', `${state.eftSessions.length}회`),
  ));

  section.appendChild(el('div', { class: 'row cta' },
    el('button', { class: 'primary', onClick: () => ctx.navigate('daily'), text: '오늘 자가진단' }),
    el('button', { class: 'primary', onClick: () => ctx.navigate('session'), text: 'EFT 실천하기' }),
  ));

  section.appendChild(el('div', { class: 'row cta' },
    el('button', { class: 'ghost', onClick: () => ctx.navigate('learn'), text: 'EFT 알아보기' }),
    el('button', { class: 'ghost', onClick: () => ctx.navigate('levels'), text: '타점 레벨' }),
  ));

  // EFT 전후 변화 추이
  section.appendChild(el('h2', { text: 'EFT 전후 변화 추이' }));
  if (state.eftSessions.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 EFT 기록이 없어요.' }));
  } else {
    section.appendChild(beforeAfterChart(state.eftSessions.slice(-12)));
    section.appendChild(el('div', { class: 'legend' },
      el('span', { class: 'key before' }), el('span', { class: 'hint', text: '실천 전' }),
      el('span', { class: 'key after' }), el('span', { class: 'hint', text: '실천 후' }),
    ));

    const list = el('div', { class: 'session-list' });
    state.eftSessions.slice().reverse().forEach((s) => {
      const delta = s.before - s.after;
      const cls = delta > 0 ? 'good' : delta < 0 ? 'bad' : '';
      const deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
      list.appendChild(el('div', { class: 'session-item' },
        el('span', { class: 'emotion', text: s.chosenEmotion || '(감정)' }),
        el('span', { class: 'ba', text: `${s.before} → ${s.after}` }),
        el('span', { class: `delta ${cls}`.trim(), text: deltaText }),
      ));
    });
    section.appendChild(list);
  }

  // 최근 자가진단 기록
  section.appendChild(el('h2', { text: '최근 자가진단' }));
  if (state.dailyChecks.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 자가진단 기록이 없어요.' }));
  } else {
    const list = el('div', { class: 'session-list' });
    state.dailyChecks.slice(-7).reverse().forEach((c) => {
      list.appendChild(el('div', { class: 'session-item column' },
        el('div', { class: 'row-between' },
          el('span', { class: 'emotion', text: (c.emotions || []).slice(0, 3).join(', ') || '(감정)' }),
          el('span', { class: 'ba', text: c.date }),
        ),
        c.situation ? el('span', { class: 'hint', text: c.situation }) : null,
      ));
    });
    section.appendChild(list);
  }

  // 동기부여 · 공유 (후속 기능 자리)
  section.appendChild(el('div', { class: 'card soft' },
    el('p', { class: 'quote', text: MOTIVATION_PROMPT }),
    el('p', { class: 'hint', text: SHARE_MESSAGE }),
    el('div', { class: 'row' },
      el('button', { class: 'ghost small', disabled: 'true', text: '사례 올리기 (준비 중)' }),
      el('button', { class: 'ghost small', disabled: 'true', text: '챌린지 (준비 중)' }),
      el('button', { class: 'ghost small', disabled: 'true', text: '공유하기 (준비 중)' }),
    ),
  ));

  root.appendChild(section);
}
