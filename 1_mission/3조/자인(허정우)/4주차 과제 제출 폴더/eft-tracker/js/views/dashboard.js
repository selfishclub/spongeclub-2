import { el, todayStr } from '../util.js';
import { computeStreak } from '../streak.js';

function barChart(data, maxValue) {
  const W = 320, H = 120, pad = 20;
  const n = data.length;
  const bw = n > 0 ? (W - pad * 2) / n : 0;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('class', 'chart');
  data.forEach((d, i) => {
    const h = maxValue > 0 ? (d.value / maxValue) * (H - pad * 2) : 0;
    const x = pad + i * bw + bw * 0.15;
    const y = H - pad - h;
    const rect = document.createElementNS(NS, 'rect');
    rect.setAttribute('x', String(x));
    rect.setAttribute('y', String(y));
    rect.setAttribute('width', String(bw * 0.7));
    rect.setAttribute('height', String(h));
    rect.setAttribute('rx', '2');
    rect.setAttribute('class', 'bar');
    svg.appendChild(rect);
    const label = document.createElementNS(NS, 'text');
    label.setAttribute('x', String(x + bw * 0.35));
    label.setAttribute('y', String(H - pad + 12));
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'bar-label');
    label.textContent = d.label;
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

  section.appendChild(el('h2', { text: '화병 증상 총점 추이' }));
  if (state.dailyChecks.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 자가진단 기록이 없어요.' }));
  } else {
    const data = state.dailyChecks.map((c) => ({ label: c.date.slice(5), value: c.total }));
    section.appendChild(barChart(data, 60));
  }

  section.appendChild(el('h2', { text: 'EFT 전후 변화' }));
  if (state.eftSessions.length === 0) {
    section.appendChild(el('p', { class: 'empty', text: '아직 EFT 기록이 없어요.' }));
  } else {
    const list = el('div', { class: 'session-list' });
    state.eftSessions.slice().reverse().forEach((s) => {
      const delta = s.before - s.after;
      const cls = delta > 0 ? 'good' : delta < 0 ? 'bad' : '';
      const deltaText = delta > 0 ? `-${delta}` : delta < 0 ? `+${-delta}` : '0';
      list.appendChild(el('div', { class: 'session-item' },
        el('span', { class: 'emotion', text: s.chosenEmotion || '(감정)' }),
        el('span', { class: 'ba', text: `${s.before} → ${s.after}` }),
        el('span', { class: 'delta ' + cls, text: deltaText }),
      ));
    });
    section.appendChild(list);
  }

  root.appendChild(section);
}
