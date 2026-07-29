import { el, todayStr } from '../util.js';
import { computeStreak } from '../streak.js';

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

// EFT 세션을 날짜(하루)별로 묶는다. 하루에 여러 번 해도 그날의 시작 전(before)과
// 마지막 후(after)로 한 칸만 표시 → 진행한 날짜 수만큼만 막대가 생긴다.
function byDay(sessions) {
  const map = new Map();
  for (const s of sessions) {
    const day = (s.datetime || '').slice(0, 10);
    if (!day) continue;
    if (!map.has(day)) map.set(day, { datetime: day, before: s.before, after: s.after });
    else map.get(day).after = s.after; // 그날 마지막 세션의 after 로 갱신
  }
  return [...map.values()].sort((a, b) => a.datetime.localeCompare(b.datetime));
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

  section.appendChild(el('h1', { text: '진도표' }));

  const streak = computeStreak(state.dailyChecks, todayStr());
  section.appendChild(el('div', { class: 'stats' },
    stat('연속 실천', `${streak}일`),
    stat('감정평가', `${state.dailyChecks.length}회`),
    stat('EFT 세션', `${state.eftSessions.length}회`),
  ));

  // EFT 전후 변화 추이 — 실제 실천한 날짜 수만큼만 표시 (하루 하면 하루, 이틀 하면 이틀)
  section.appendChild(el('h2', { text: 'EFT 전후 변화 추이' }));
  if (state.eftSessions.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 EFT 기록이 없어요.' }));
  } else {
    section.appendChild(beforeAfterChart(byDay(state.eftSessions).slice(-14)));
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

  // 최근 감정평가 기록
  section.appendChild(el('h2', { text: '최근 감정평가' }));
  if (state.dailyChecks.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 감정평가 기록이 없어요.' }));
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

  section.appendChild(el('button', { class: 'primary big', onClick: () => ctx.navigate('home'), text: '홈으로' }));
  root.appendChild(section);
}
