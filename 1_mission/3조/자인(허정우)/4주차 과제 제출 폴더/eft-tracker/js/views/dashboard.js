import { el, todayStr } from '../util.js';
import { computeStreak } from '../streak.js';

const NS = 'http://www.w3.org/2000/svg';

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

// 하루에 여러 번 해도 그날의 before/after 한 칸으로 → 진행한 날짜 수만큼만 표시
function byDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const day = (s.datetime || '').slice(0, 10);
    if (!day) continue;
    if (!map.has(day)) map.set(day, { datetime: day, before: s.before, after: s.after });
    else map.get(day).after = s.after;
  }
  return [...map.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
}

function stat(label, value) {
  return el('div', { class: 'stat' },
    el('div', { class: 'stat-value', text: value }),
    el('div', { class: 'stat-label', text: label }),
  );
}

// N일 전 날짜(YYYY-MM-DD). null 이면 전체.
function cutoff(days) {
  if (!days) return null;
  const d = new Date();
  d.setDate(d.getDate() - (days - 1));
  return todayStr(d);
}

const PERIODS = [
  { id: 'week', label: '주간', days: 7 },
  { id: 'month', label: '월간', days: 30 },
  { id: 'all', label: '전체', days: 0 },
];

export function renderDashboard(root, ctx) {
  const state = ctx.store.load();
  const section = el('section', { class: 'view dashboard' });
  let period = 'all';

  section.appendChild(el('h1', { text: '진도표' }));

  const streak = computeStreak(state.dailyChecks, todayStr());
  section.appendChild(el('div', { class: 'stats' },
    stat('연속 실천', `${streak}일`),
    stat('감정평가', `${state.dailyChecks.length}회`),
    stat('EFT 세션', `${state.eftSessions.length}회`),
  ));

  // 기간 선택 (주간 / 월간 / 전체)
  const tabs = el('div', { class: 'tabs period-tabs' });
  const dyn = el('div', { class: 'dashboard-dyn' });

  function inPeriod(datetime) {
    const co = cutoff(PERIODS.find((p) => p.id === period).days);
    if (!co) return true;
    return (datetime || '').slice(0, 10) >= co;
  }

  function renderDynamic() {
    for (const b of tabs.children) b.classList.toggle('active', b.dataset.p === period);
    dyn.innerHTML = '';

    const sessions = state.eftSessions.filter((s) => inPeriod(s.datetime));
    const checks = state.dailyChecks.filter((c) => inPeriod(c.datetime || c.date));

    // EFT 전후 변화 추이
    dyn.appendChild(el('h2', { text: 'EFT 전후 변화 추이' }));
    if (sessions.length === 0) {
      dyn.appendChild(el('p', { class: 'empty', text: '이 기간에는 EFT 기록이 없어요.' }));
    } else {
      dyn.appendChild(beforeAfterChart(byDay(sessions).slice(-31)));
      dyn.appendChild(el('div', { class: 'legend' },
        el('span', { class: 'key before' }), el('span', { class: 'hint', text: '실천 전' }),
        el('span', { class: 'key after' }), el('span', { class: 'hint', text: '실천 후' })));
    }

    // 나의 기록 (자유 기록 follow-up 포함)
    dyn.appendChild(el('h2', { text: '나의 기록' }));
    if (sessions.length === 0) {
      dyn.appendChild(el('p', { class: 'empty', text: '이 기간에는 기록이 없어요.' }));
    } else {
      const list = el('div', { class: 'session-list' });
      sessions.slice().reverse().forEach((s) => {
        const delta = s.before - s.after;
        const isPos = s.evalStage === 3;
        const cls = isPos ? (delta < 0 ? 'good' : '') : (delta > 0 ? 'good' : delta < 0 ? 'bad' : '');
        const deltaText = isPos
          ? `+${Math.max(0, s.after - s.before)}`
          : (delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0');
        list.appendChild(el('div', { class: 'session-item column' },
          el('div', { class: 'row-between' },
            el('span', { class: 'emotion', text: s.chosenEmotion || '(감정)' }),
            el('span', { class: 'ba', text: (s.datetime || '').slice(0, 10) })),
          el('div', { class: 'row-between' },
            el('span', { class: 'hint', text: `${s.before} → ${s.after}${s.tapStage ? ` · 태핑 ${s.tapStage}단계` : ''}` }),
            el('span', { class: `delta ${cls}`.trim(), text: deltaText })),
          s.record ? el('p', { class: 'record-note', text: `“${s.record}”` }) : null,
        ));
      });
      dyn.appendChild(list);
    }

    // 감정평가 기록
    dyn.appendChild(el('h2', { text: '감정평가 기록' }));
    if (checks.length === 0) {
      dyn.appendChild(el('p', { class: 'empty', text: '이 기간에는 감정평가 기록이 없어요.' }));
    } else {
      const list = el('div', { class: 'session-list' });
      checks.slice().reverse().forEach((c) => {
        list.appendChild(el('div', { class: 'session-item column' },
          el('div', { class: 'row-between' },
            el('span', { class: 'emotion', text: (c.emotions || []).slice(0, 3).join(', ') || c.chosenEmotion || '(감정)' }),
            el('span', { class: 'ba', text: c.date })),
          c.situation ? el('span', { class: 'hint', text: c.situation }) : null,
        ));
      });
      dyn.appendChild(list);
    }
  }

  for (const p of PERIODS) {
    const b = el('button', { class: 'tab', type: 'button', text: p.label });
    b.dataset.p = p.id;
    b.addEventListener('click', () => { period = p.id; renderDynamic(); });
    tabs.appendChild(b);
  }

  section.appendChild(tabs);
  section.appendChild(dyn);
  section.appendChild(el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }));
  root.appendChild(section);
  renderDynamic();
}
