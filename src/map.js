// Campaign map: real geography (Natural Earth coastlines, rivers, lakes; Mercator) with Roman-era places at true lat/lon.
import { SCENARIOS, DIFFICULTY, PROLOGUE } from './data.js';
import { describe, picksNames } from './origins.js';
import { totalMen } from './camp.js';
import { MAP } from './mapdata.js';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rad = (d) => d * Math.PI / 180;
export const project = (lat, lon) => [MAP.s * rad(lon) + MAP.tx, MAP.ty - MAP.s * Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2))];

// [name, lat, lon, size] size: 2 = major city, 1 = town/site. Latin names with modern equivalents where helpful.
const PLACES = [
  ['Roma', 41.90, 12.50, 2], ['Massilia', 43.30, 5.37, 1], ['Narbo', 43.18, 3.00, 1], ['Tolosa', 43.60, 1.44, 1], ['Burdigala', 44.84, -0.58, 1],
  ['Lugdunum', 45.76, 4.84, 2], ['Genava', 46.20, 6.15, 1], ['Vesontio', 47.24, 6.02, 1], ['Bibracte', 46.93, 4.03, 1], ['Alesia', 47.54, 4.50, 1],
  ['Gergovia', 45.71, 3.12, 1], ['Avaricum', 47.08, 2.40, 1], ['Cenabum', 47.90, 1.90, 1], ['Lutetia', 48.85, 2.35, 1], ['Durocortorum', 49.25, 4.03, 1],
  ['Augusta Treverorum', 49.76, 6.64, 1], ['Colonia Agrippina', 50.94, 6.96, 1], ['Mediolanum', 45.46, 9.19, 1], ['Ravenna', 44.42, 12.20, 1],
  ['Londinium', 51.51, -0.09, 1], ['Camulodunum', 51.89, 0.90, 1], ['Carthago', 36.85, 10.32, 2], ['Alexandria', 31.20, 29.92, 2], ['Antiochia', 36.20, 36.16, 2],
  ['Athenae', 37.98, 23.73, 1], ['Corduba', 37.89, -4.78, 1], ['Tarraco', 41.12, 1.26, 1]
];
const TRIBES = [
  ['Helvetii', 46.95, 7.7], ['Aedui', 46.55, 4.05], ['Sequani', 46.95, 5.55], ['Arverni', 45.35, 3.0], ['Allobroges', 45.35, 5.85], ['Lingones', 47.85, 5.1],
  ['Belgae', 49.6, 3.3], ['Treveri', 49.95, 6.2], ['Carnutes', 48.2, 1.2], ['Veneti', 47.7, -2.6], ['Aquitani', 43.9, -0.6], ['Nervii', 50.45, 3.9], ['Boii', 48.7, 13.2]
];
const REGIONS = [
  ['GALLIA', 46.6, 1.8], ['GERMANIA', 51.6, 9.8], ['BRITANNIA', 53.0, -1.8], ['HISPANIA', 40.0, -4.0], ['ITALIA', 43.7, 11.0], ['AFRICA', 33.5, 8.5], ['AEGYPTUS', 29.8, 27], ['ASIA', 38.8, 33], ['MACEDONIA', 40.9, 22.5],
  ['MARE NOSTRUM', 38.2, 16.5], ['OCEANUS', 44.5, -8.8], ['ALPES', 46.2, 8.6]
];
const RIVERS = [['Rhodanus', 44.55, 4.95], ['Arar', 46.05, 5.15], ['Sequana', 48.35, 3.4], ['Liger', 47.35, 0.5], ['Rhenus', 50.4, 7.5], ['Danuvius', 48.4, 12.5], ['Tiberis', 42.6, 12.6], ['Garumna', 44.4, 0.3]];

const FUTURE = [
  { act: 'II', name: 'Teutoburg Forest', lat: 52.40, lon: 8.13, hint: 'Germania: forests and ambush' },
  { act: 'III', name: 'Britannia', lat: 51.89, lon: 0.90, hint: 'A grinding slog (Camulodunum)' },
  { act: 'IV', name: 'Ilerda', lat: 41.62, lon: 0.62, hint: 'Hispania' },
  { act: 'IV', name: 'Thapsus', lat: 35.62, lon: 11.05, hint: 'Africa' },
  { act: 'IV', name: 'Carrhae', lat: 36.87, lon: 39.03, hint: 'The East: Parthian horse archers' },
  { act: 'V', name: 'Pharsalus', lat: 39.29, lon: 22.38, hint: 'Civil war: Roman against Roman' },
  { act: 'VI', name: 'Rome', lat: 41.90, lon: 12.50, hint: 'The final battle', rome: true }
];
const SHORT = ['Rhone Fords', 'Arar Crossing', "Foragers' Road", 'Vesontio', 'Morvan Ambush', 'Bibracte'];
const LABEL_SIDE = ['below', 'below', 'right', 'above', 'left', 'below'];
const OUT = { victory: '#6fcf6f', draw: '#e8c36a', defeat: '#d65a4a' };

let view = 'act'; // 'act' | 'all'

function viewBox() {
  if (view === 'all') return { x: 0, y: 0, w: MAP.W, h: MAP.H };
  const [cx, cy] = project(46.5, 5.0);
  const w = 15 * MAP.s * rad(1), h = w * 0.66;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function graticule(vb, k) {
  let out = '';
  for (let lon = -10; lon <= 45; lon += 5) { const [x] = project(30, lon); if (x < vb.x || x > vb.x + vb.w) continue; out += `<line x1="${x}" y1="${vb.y}" x2="${x}" y2="${vb.y + vb.h}" class="grat"/><text x="${x + 3 * k}" y="${vb.y + vb.h - 4 * k}" class="gl" style="font-size:${9 * k}px">${lon}°E</text>`; }
  for (let lat = 30; lat <= 60; lat += 5) { const [, y] = project(lat, 0); if (y < vb.y || y > vb.y + vb.h) continue; out += `<line x1="${vb.x}" y1="${y}" x2="${vb.x + vb.w}" y2="${y}" class="grat"/><text x="${vb.x + 4 * k}" y="${y - 3 * k}" class="gl" style="font-size:${9 * k}px">${lat}°N</text>`; }
  return out;
}

export function renderMap(root, c, api) {
  const diff = DIFFICULTY[c.difficulty];
  const idx = c.scenario, scn = SCENARIOS[idx];
  const best = {}; (c.history || []).forEach(h => { if (h.outcome !== 'defeat' || !best[h.id]) best[h.id] = h.outcome; });
  const vb = viewBox(), k = vb.w / 700, inView = (x, y, pad = 0) => x > vb.x - pad && x < vb.x + vb.w + pad && y > vb.y - pad && y < vb.y + vb.h + pad;
  const big = view === 'all';

  const text = (cls, arr, size, anchor = 'middle') => arr.map(([n, lat, lon]) => { const [x, y] = project(lat, lon); return inView(x, y) ? `<text x="${x}" y="${y}" class="${cls}" style="font-size:${size * k}px" text-anchor="${anchor}">${esc(n)}</text>` : ''; }).join('');
  const places = PLACES.map(([n, lat, lon, sz]) => { const [x, y] = project(lat, lon); if (!inView(x, y)) return ''; if (big && sz < 2) return ''; if (n === 'Bibracte' || n === 'Vesontio' || n === 'Genava') return ''; // drawn as battle nodes
    return `<g><circle cx="${x}" cy="${y}" r="${(sz === 2 ? 4.5 : 3) * k}" class="city"/><text x="${x + 6 * k}" y="${y + 3.5 * k}" class="pl" style="font-size:${(sz === 2 ? 12 : 10.5) * k}px">${esc(n)}</text></g>`; }).join('');

  const pts = SCENARIOS.map(s => project(s.geo.lat, s.geo.lon));
  const edges = SCENARIOS.slice(1).map((s, i) => `<line x1="${pts[i][0]}" y1="${pts[i][1]}" x2="${pts[i + 1][0]}" y2="${pts[i + 1][1]}" class="route ${i + 1 <= idx ? 'done' : ''}" style="stroke-width:${3 * k}px"/>`).join('');
  const nodes = SCENARIOS.map((s, i) => {
    const [x, y] = pts[i]; if (!inView(x, y, 40 * k)) return '';
    const state = i < idx ? 'done' : i === idx ? 'current' : 'locked';
    const col = state === 'done' ? OUT[best[s.id]] || '#6fcf6f' : state === 'current' ? '#e8c36a' : '#8a7a58';
    const r = (s.kind === 'named' ? 12 : 8.5) * k * (big ? 0.7 : 1), side = LABEL_SIDE[i];
    const lx = side === 'right' ? r + 6 * k : side === 'left' ? -r - 6 * k : 0, ly = side === 'above' ? -r - 7 * k : side === 'below' ? r + 15 * k : 4 * k, an = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
    return `<g class="node ${state}" transform="translate(${x},${y})"><title>${esc(s.name)} - ${esc(s.geo.place)}. ${esc(s.geo.note)}</title>
      ${state === 'current' ? `<circle r="${r + 7 * k}" class="pulse" style="stroke-width:${2 * k}px"/>` : ''}
      <circle r="${r}" fill="${col}" stroke="#14100a" stroke-width="${2.2 * k}"/>
      ${s.kind === 'named' ? `<path d="M${-5.5 * k} ${3 * k} L0 ${-6.5 * k} L${5.5 * k} ${3 * k} Z" fill="#14100a"/>` : `<text y="${3.8 * k}" text-anchor="middle" class="nn" style="font-size:${11 * k}px">${i + 1}</text>`}
      ${big ? '' : `<text x="${lx}" y="${ly}" text-anchor="${an}" class="nl" style="font-size:${12.5 * k}px">${esc(SHORT[i])}</text>`}</g>`;
  }).join('');
  const [gx, gy] = project(46.6, 5.0);
  const actLabel = big ? `<text x="${gx - 40 * k}" y="${gy - 26 * k}" text-anchor="end" class="nl" style="font-size:${13 * k}px">Act I: Gaul</text>` : '';
  const future = FUTURE.map(f => { const [x, y] = project(f.lat, f.lon); if (!inView(x, y, 30 * k)) return ''; const r = (f.rome ? 12 : 8) * k * (big ? 0.8 : 1);
    return `<g class="fut" transform="translate(${x},${y})"><title>${esc(f.hint)}</title><circle r="${r}" fill="${f.rome ? '#7a2a22' : '#3b3120'}" stroke="#14100a" stroke-width="${2 * k}"/>
      <text y="${-r - 6 * k}" text-anchor="middle" class="fl" style="font-size:${11.5 * k}px">Act ${f.act}: ${esc(f.name)}</text></g>`; }).join('');

  // scale bar (Mercator: km per px depends on latitude)
  const midLat = (view === 'all') ? 45 : 47, pxPerKm = MAP.s * rad(1) / (111.32 * Math.cos(rad(midLat))), km = big ? 500 : 100, sbw = km * pxPerKm;
  const sbx = vb.x + 18 * k, sby = vb.y + vb.h - 34 * k;
  const scale = `<g><rect x="${sbx - 6 * k}" y="${sby - 16 * k}" width="${sbw + 12 * k}" height="${30 * k}" fill="rgba(10,8,4,0.6)"/><line x1="${sbx}" y1="${sby}" x2="${sbx + sbw}" y2="${sby}" stroke="#e8c36a" stroke-width="${2.5 * k}"/><line x1="${sbx}" y1="${sby - 5 * k}" x2="${sbx}" y2="${sby + 5 * k}" stroke="#e8c36a" stroke-width="${2 * k}"/><line x1="${sbx + sbw}" y1="${sby - 5 * k}" x2="${sbx + sbw}" y2="${sby + 5 * k}" stroke="#e8c36a" stroke-width="${2 * k}"/><text x="${sbx}" y="${sby - 7 * k}" class="gl" style="font-size:${10 * k}px;fill:#e8c36a">${km} km</text></g>`;
  const north = `<g transform="translate(${vb.x + vb.w - 28 * k},${vb.y + 34 * k})"><path d="M0 ${-16 * k} L${6 * k} ${8 * k} L0 ${3 * k} L${-6 * k} ${8 * k} Z" fill="#e8c36a"/><text y="${22 * k}" text-anchor="middle" class="gl" style="font-size:${11 * k}px;fill:#e8c36a">N</text></g>`;

  const done = idx >= SCENARIOS.length;
  const army = c.cohorts.map(h => `<li>${esc(h.name)} <span class="muted">- ${h.men}/${h.maxMen}</span></li>`).join('');
  const hrows = (c.history || []).slice(-6).reverse().map(h => { const s = [PROLOGUE, ...SCENARIOS].find(x => x.id === h.id); return `<div><span style="color:${OUT[h.outcome]}">${h.outcome.toUpperCase()}</span> - ${esc(s ? s.name : h.id)}</div>`; }).join('');

  root.innerHTML = `<div class="camp mapscreen">
    <header><h2>The Road to Rome</h2><div class="res"><span>Denarii <b>${c.gold}</b></span><span>Supplies <b>${c.supplies}</b></span><span>Army <b>${totalMen(c)}</b></span><span>Day <b>${c.day}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
    <div class="card mapcard">
      <div class="row maptools"><button id="v-act" class="${view === 'act' ? 'on' : ''}">Act I: Gaul</button><button id="v-all" class="${view === 'all' ? 'on' : ''}">Whole Roman world</button><span class="muted small">Coastlines, rivers and lakes: Natural Earth (public domain). Mercator; Roman place names, positions approximate.</span></div>
      <svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" id="mapsvg" role="img" aria-label="Campaign map of the Roman world"><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" class="sea"/>
        <g class="geo">${graticule(vb, k)}<path d="${MAP.land}" class="land" style="stroke-width:${1.6 * k}px"/><path d="${MAP.lakes}" class="lake" style="stroke-width:${1 * k}px"/><path d="${MAP.rivers}" class="river" style="stroke-width:${1.5 * k}px"/></g>
        ${text('region', REGIONS.filter(r => big || !['AEGYPTUS', 'ASIA', 'MACEDONIA'].includes(r[0])), big ? 30 : 17)}${big ? '' : text('tribe', TRIBES, 11)}${text('rivlab', big ? [] : RIVERS, 10.5)}
        ${places}${edges}${future}${nodes}${actLabel}${scale}${north}</svg></div>
    <div class="col">
      <div class="card"><h3>${done ? 'Act I complete' : `Act ${scn.act} - battle ${idx + 1} of ${SCENARIOS.length}`}</h3>
        ${done ? `<p>The Helvetii are broken and Gaul lies open before you. Acts II onward (Germania, Britannia, the civil war and Rome itself) are the next milestones.</p>`
          : `<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}${scn.rewardMult > 1.4 ? ' <span class="pill">Dangerous - rich spoils</span>' : ''}<br><span class="small muted">${esc(scn.geo.place)} (${scn.geo.lat.toFixed(2)}&deg;N, ${scn.geo.lon.toFixed(2)}&deg;E)</span><br><span class="muted">${esc(scn.briefing)}</span></p>
          <p class="small muted">${esc(scn.objective)}</p>
          <div class="row"><button class="primary" id="m-camp">Make camp (${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'})</button><button id="m-march">March at once</button></div>`}
        <div class="row" style="margin-top:8px"><button id="m-menu">Main menu</button>${(c.history || []).length ? '<button id="m-restore" title="Restore the snapshot saved before the last battle">Undo last battle</button>' : ''}</div></div>
      <div class="card"><h3>${esc((c.player && c.player.name) || 'Your command')}</h3><div class="small muted">${esc(picksNames(c).join(' - ') || 'Veteran commander')}</div>${describe(c).lines.map(([a, b]) => `<div class="kvl"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}</div>
      <div class="card"><h3>Your army</h3><ul class="armylist">${army}</ul></div>
      <div class="card"><h3>Dispatches</h3><div class="log">${hrows || '<div>No battles fought yet.</div>'}</div></div>
    </div></div>`;
  const q = (s) => root.querySelector(s);
  if (q('#m-camp')) q('#m-camp').onclick = () => api.camp();
  if (q('#m-march')) q('#m-march').onclick = () => api.march();
  q('#m-menu').onclick = () => api.menu();
  if (q('#m-restore')) q('#m-restore').onclick = () => api.undo();
  q('#v-act').onclick = () => { view = 'act'; renderMap(root, c, api); };
  q('#v-all').onclick = () => { view = 'all'; renderMap(root, c, api); };
}
