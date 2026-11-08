// Campaign map screen: Act I route through Gaul, later acts shown as locked destinations.
import { SCENARIOS, DIFFICULTY } from './data.js';
import { totalMen } from './camp.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Stylised landmasses (viewBox 1000 x 700). Hand-drawn approximations, not cartography.
const LAND = [
  // Britannia
  '330,70 372,48 410,82 402,138 430,182 398,226 352,220 326,170 340,120',
  // Continental Europe, Gaul, Germania, Hispania and Italia
  '300,272 332,238 424,232 472,204 560,192 700,172 880,162 945,260 935,420 872,468 824,520 862,606 836,636 792,590 724,528 690,566 640,486 576,486 520,536 420,566 344,540 254,520 226,424 270,364',
  // Africa
  '170,648 300,610 520,620 760,618 840,650 800,696 200,696'
];
const FUTURE = [
  { act: 'II', name: 'Germania', x: 720, y: 215, hint: 'Forests and ambush' },
  { act: 'III', name: 'Britannia', x: 365, y: 130, hint: 'A grinding slog' },
  { act: 'IV', name: 'Hispania & Africa', x: 330, y: 500, hint: 'Elephants and Carthaginian remnants' },
  { act: 'IV', name: 'The East', x: 900, y: 400, hint: 'Parthian horse archers' },
  { act: 'V', name: 'Civil War', x: 770, y: 495, hint: 'Roman against Roman' },
  { act: 'VI', name: 'Rome', x: 800, y: 566, hint: 'The final battle', rome: true }
];
const SHORT = ['Ford of the Axona', "Foragers' Road", 'Hill Fort', 'Arar Crossing', 'Silva Ambush', 'Bibracte'];
const ABOVE = [false, false, true, false, true, false];
const OUT = { victory: '#6fcf6f', draw: '#e8c36a', defeat: '#d65a4a' };

export function renderMap(root, c, api) {
  const diff = DIFFICULTY[c.difficulty];
  const idx = c.scenario, scn = SCENARIOS[idx];
  const hist = {}; (c.history || []).forEach(h => { hist[h.id] = h.outcome; });
  const best = {}; (c.history || []).forEach(h => { if (h.outcome !== 'defeat' || !best[h.id]) best[h.id] = h.outcome; });

  const edges = SCENARIOS.slice(1).map((s, i) => { const a = SCENARIOS[i].map, b = s.map; return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="route ${i + 1 <= idx ? 'done' : ''}"/>`; }).join('');
  const nodes = SCENARIOS.map((s, i) => {
    const state = i < idx ? 'done' : i === idx ? 'current' : 'locked';
    const col = state === 'done' ? OUT[best[s.id]] || '#6fcf6f' : state === 'current' ? '#e8c36a' : '#6a5a40';
    const r = s.kind === 'named' ? 13 : 9;
    return `<g class="node ${state}" data-i="${i}" transform="translate(${s.map.x},${s.map.y})">
      ${state === 'current' ? `<circle r="${r + 8}" class="pulse"/>` : ''}
      <circle r="${r}" fill="${col}" stroke="#14100a" stroke-width="2.5"/>
      ${s.kind === 'named' ? '<path d="M-6 3 L0 -7 L6 3 Z" fill="#14100a"/>' : `<text y="4" text-anchor="middle" class="nn">${i + 1}</text>`}
      <text y="${ABOVE[i] ? -r - 8 : r + 16}" text-anchor="middle" class="nl">${esc(SHORT[i] || s.name)}</text></g>`;
  }).join('');
  const future = FUTURE.map(f => `<g class="fut" transform="translate(${f.x},${f.y})"><title>${esc(f.hint)}</title>
      <circle r="${f.rome ? 11 : 7}" fill="${f.rome ? '#7a2a22' : '#3b3120'}" stroke="#14100a" stroke-width="2"/>
      <text y="${-12}" text-anchor="middle" class="fl">Act ${f.act}: ${esc(f.name)}</text></g>`).join('');

  const done = idx >= SCENARIOS.length;
  const army = c.cohorts.map(h => `<li>${esc(h.name)} <span class="muted">- ${h.men}/${h.maxMen}</span></li>`).join('');
  const hrows = (c.history || []).slice(-6).reverse().map(h => { const s = SCENARIOS.find(x => x.id === h.id); return `<div><span style="color:${OUT[h.outcome]}">${h.outcome.toUpperCase()}</span> - ${esc(s.name)}</div>`; }).join('');

  root.innerHTML = `<div class="camp mapscreen">
    <header><h2>The Road to Rome</h2><div class="res"><span>Denarii <b>${c.gold}</b></span><span>Supplies <b>${c.supplies}</b></span><span>Army <b>${totalMen(c)}</b></span><span>Day <b>${c.day}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
    <div class="card mapcard"><svg viewBox="0 0 1000 700" id="mapsvg" role="img" aria-label="Campaign map">
      <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3a4a"/><stop offset="1" stop-color="#17303d"/></linearGradient></defs>
      <rect width="1000" height="700" fill="url(#sea)"/>
      ${LAND.map(p => `<polygon points="${p}" class="land"/>`).join('')}
      <text x="560" y="262" class="region">GALLIA</text><text x="760" y="250" class="region">GERMANIA</text><text x="370" y="38" class="region">BRITANNIA</text><text x="300" y="560" class="region">HISPANIA</text><text x="620" y="660" class="region">AFRICA</text><text x="830" y="600" class="region">ITALIA</text>
      ${edges}${future}${nodes}</svg></div>
    <div class="col">
      <div class="card"><h3>${done ? 'Act I complete' : `Act ${scn.act} - battle ${idx + 1} of ${SCENARIOS.length}`}</h3>
        ${done ? `<p>The Helvetii are broken and Gaul lies open before you. Acts II onward (Germania, Britannia, the civil war and Rome itself) are the next milestones.</p>`
          : `<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}${scn.rewardMult > 1.4 ? ' <span class="pill">Dangerous - rich spoils</span>' : ''}<br><span class="muted">${esc(scn.briefing)}</span></p>
          <p class="small muted">${esc(scn.objective)}</p>
          <div class="row"><button class="primary" id="m-camp">Make camp (${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'})</button><button id="m-march">March at once</button></div>`}
        <div class="row" style="margin-top:8px"><button id="m-menu">Main menu</button>${(c.history || []).length ? '<button id="m-restore" title="Restore the snapshot saved before the last battle">Undo last battle</button>' : ''}</div></div>
      <div class="card"><h3>Your army</h3><ul class="armylist">${army}</ul></div>
      <div class="card"><h3>Dispatches</h3><div class="log">${hrows || '<div>No battles fought yet.</div>'}</div></div>
    </div></div>`;
  const q = (s) => root.querySelector(s);
  if (q('#m-camp')) q('#m-camp').onclick = () => api.camp();
  if (q('#m-march')) q('#m-march').onclick = () => api.march();
  q('#m-menu').onclick = () => api.menu();
  if (q('#m-restore')) q('#m-restore').onclick = () => api.undo();
}
