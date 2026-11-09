// Campaign map: real geography (Natural Earth coastlines, rivers, lakes; Mercator) with Roman-era places at true lat/lon.
import { SCENARIOS, DIFFICULTY, PROLOGUE } from './data.js';
import { describe, picksNames } from './origins.js';
import { totalMen } from './camp.js';
import { MAP } from './mapdata.js';
import { icon, iconPaths } from './icons.js';

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
  const w = 15 * MAP.s * rad(1), h = w * 0.8;
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

  // ---- labels: placed greedily by priority so that no two overlap and nothing sits on a marker ----
  const occ = [], R = (x0, y0, x1, y1) => ({ x0, y0, x1, y1 });
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const inside = (r) => r.x0 >= vb.x + 12 * k && r.x1 <= vb.x + vb.w - 12 * k && r.y0 >= vb.y + 12 * k && r.y1 <= vb.y + vb.h - 12 * k;
  const free = (r) => inside(r) && !occ.some(o => hit(o, r));
  const WF = { head: 0.74, body: 0.5, node: 0.72 };   // average glyph width per em for each face
  let labelSvg = '';
  // try each side in turn; returns true when placed. `force` places at the first side even if it collides (battle names must show).
  const label = (txt, size, face, cls, x, y, rad, sides, force = false) => {
    const fs = size * k, w = txt.length * fs * WF[face] + 5 * k, h = fs * 1.15, gap = 4 * k;
    const rectFor = (side) => { const x0 = side === 'right' ? x + rad + gap : side === 'left' ? x - rad - gap - w : x - w / 2, y0 = side === 'above' ? y - rad - gap - h : side === 'below' ? y + rad + gap : y - h / 2; return R(x0, y0, x0 + w, y0 + h); };
    const order = force ? [...sides.filter(sd => { const r0 = rectFor(sd); return free(r0); }), ...sides] : sides;
    for (const side of order) {
      const x0 = side === 'right' ? x + rad + gap : side === 'left' ? x - rad - gap - w : x - w / 2;
      const y0 = side === 'above' ? y - rad - gap - h : side === 'below' ? y + rad + gap : y - h / 2;
      const r = R(x0, y0, x0 + w, y0 + h);
      if (!force && !free(r)) continue;
      occ.push(r);
      const ax = side === 'right' ? x0 + 2 * k : side === 'left' ? x0 + w - 2 * k : x0 + w / 2, an = side === 'right' ? 'start' : side === 'left' ? 'end' : 'middle';
      labelSvg += `<text x="${ax}" y="${y0 + fs * 0.88}" class="${cls}" style="font-size:${fs}px" text-anchor="${an}">${esc(txt)}</text>`;
      return true;
    }
    return false;
  };
  const dot = (x, y, r) => occ.push(R(x - r, y - r, x + r, y + r));
  const OTHERS = ['right', 'left', 'below', 'above'];

  // fixed furniture the labels must avoid
  const midLat0 = big ? 45 : 47, ppk = MAP.s * rad(1) / (111.32 * Math.cos(rad(midLat0))), sbw0 = (big ? 500 : 100) * ppk;
  occ.push(R(vb.x + vb.w / 2 - 120 * k, vb.y + 10 * k, vb.x + vb.w / 2 + 120 * k, vb.y + 58 * k));                       // title plate
  occ.push(R(vb.x + vb.w - 92 * k, vb.y + vb.h - 98 * k, vb.x + vb.w, vb.y + vb.h));                                      // compass rose
  occ.push(R(vb.x + vb.w - 46 * k, vb.y + 8 * k, vb.x + vb.w, vb.y + 64 * k));                                            // north arrow
  occ.push(R(vb.x, vb.y + vb.h - 62 * k, vb.x + sbw0 + 40 * k, vb.y + vb.h));                                             // scale bar

  const NUDGE = { silva: [-34, -16], bibracte: [-22, 24] };      // Morvan and Bibracte are the same spot on the map: pull the two badges apart
  const pts = SCENARIOS.map(s => { const [x, y] = project(s.geo.lat, s.geo.lon), n = NUDGE[s.id] || [0, 0]; return [x + n[0] * k * (big ? 0.5 : 1), y + n[1] * k * (big ? 0.5 : 1)]; });
  const rN = (s, i) => (s.kind === 'named' ? 18 : 14) * k * (big ? 0.7 : 1);
  pts.forEach(([x, y], i) => { if (inView(x, y, 40 * k)) { dot(x, y, rN(SCENARIOS[i], i) + 9 * k); if (i === idx) dot(x + rN(SCENARIOS[i], i) + 8 * k, y - 4 * k, 22 * k); } });
  const futs = FUTURE.map(f => { const [x, y] = project(f.lat, f.lon); return { f, x, y, r: (f.rome ? 12 : 8) * k * (big ? 0.8 : 1) }; }).filter(o => inView(o.x, o.y, 30 * k));
  futs.forEach(o => dot(o.x, o.y, o.r + 3 * k));
  const placeList = PLACES.map(([n, lat, lon, sz]) => { const [x, y] = project(lat, lon); return { n, x, y, sz }; }).filter(p => inView(p.x, p.y) && !(big && p.sz < 2) && !['Bibracte', 'Vesontio', 'Genava'].includes(p.n));
  placeList.forEach(p => dot(p.x, p.y, (p.sz === 2 ? 10 : 7) * k));

  // 1. the battles (always shown), 2. the future acts, 3. cities, 4. towns, 5. tribes, 6. rivers, 7. regions
  if (!big) SCENARIOS.forEach((s, i) => { const [x, y] = pts[i]; if (inView(x, y, 40 * k)) { const first = LABEL_SIDE[i], order = [first, ...OTHERS.concat(['above']).filter(z => z !== first)]; label(SHORT[i], 14, 'node', 'nl', x, y, rN(s, i) + 7 * k, order, true); } });
  futs.forEach(o => label(`Act ${o.f.act}: ${o.f.name}`, 12, 'body', 'fl', o.x, o.y, o.r + 2 * k, ['above', 'below', 'right', 'left']));
  for (const sz of [2, 1]) placeList.filter(p => p.sz === sz).forEach(p => label(p.n, sz === 2 ? 14.5 : 13, 'body', 'pl', p.x, p.y, (sz === 2 ? 10 : 7) * k, OTHERS));
  if (!big) TRIBES.forEach(([n, lat, lon]) => { const [x, y] = project(lat, lon); if (inView(x, y)) label(n, 12, 'body', 'tribe', x, y, 0, ['center']); });
  if (!big) RIVERS.forEach(([n, lat, lon]) => { const [x, y] = project(lat, lon); if (inView(x, y)) label(n, 11.5, 'body', 'rivlab', x, y, 0, ['center']); });
  REGIONS.filter(r => big || !['AEGYPTUS', 'ASIA', 'MACEDONIA'].includes(r[0])).forEach(([n, lat, lon]) => { const [x, y] = project(lat, lon); if (inView(x, y)) label(n, big ? 30 : 17, 'head', 'region', x, y, 0, ['center']); });
  // towns and cities as little walled settlements (Roma with a temple front)
  const settle = (p) => {
    const q = p.sz === 2 ? 2.3 : 1.6, ink = '#2a1f0e', wall = '#ecdcb8';
    const body = p.n === 'Roma'
      ? `<polygon points="-7,-1 0,-7.5 7,-1" fill="${wall}" stroke="${ink}" stroke-width="1"/>${[-5, -1.7, 1.7, 5].map(x => `<rect x="${x - 0.8}" y="-1" width="1.6" height="6" fill="${wall}" stroke="${ink}" stroke-width=".6"/>`).join('')}<rect x="-8" y="5" width="16" height="1.8" fill="${wall}" stroke="${ink}" stroke-width=".8"/>`
      : `<rect x="-4.2" y="-2.6" width="8.4" height="6" fill="${wall}" stroke="${ink}" stroke-width="1"/><rect x="-5.4" y="-5.2" width="2.8" height="3.4" fill="${wall}" stroke="${ink}" stroke-width=".9"/><rect x="2.6" y="-5.2" width="2.8" height="3.4" fill="${wall}" stroke="${ink}" stroke-width=".9"/><rect x="-1" y="0" width="2" height="3.6" fill="${ink}"/>`;
    return `<g transform="translate(${p.x},${p.y}) scale(${q * k * 1.05})" class="city-g"><ellipse cx="1" cy="6" rx="8" ry="2" fill="rgba(0,0,0,.25)"/>${body}</g>`;
  };
  const placeDots = placeList.map(settle).join('');

  // the route is a Roman road: a paved ribbon between dark kerbs once travelled, a faint dashed track ahead
  const edges = SCENARIOS.slice(1).map((s, i) => { const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], done = i + 1 <= idx;
    return done ? `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2a1f0e" stroke-width="${6.2 * k}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e3d29c" stroke-width="${3.8 * k}" stroke-linecap="round"/><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#a89258" stroke-width="${0.9 * k}" stroke-dasharray="${4 * k} ${5 * k}"/>`
      : `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e8c36a" stroke-opacity=".55" stroke-width="${2.4 * k}" stroke-dasharray="${7 * k} ${7 * k}" stroke-linecap="round"/>`; }).join('');
  const icoG = (name, r, col, sw = 2) => `<g transform="scale(${r / 12}) translate(-12,-12)" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name]}</g>`;
  const nodes = SCENARIOS.map((s, i) => {
    const [x, y] = pts[i]; if (!inView(x, y, 40 * k)) return '';
    const state = i < idx ? 'done' : i === idx ? 'current' : 'locked', out = best[s.id];
    const col = state === 'done' ? OUT[out] || '#6fcf6f' : state === 'current' ? '#e8c36a' : '#8a7a58';
    const r = rN(s, i), named = s.kind === 'named';
    return `<g class="node ${state}" transform="translate(${x},${y})"><title>${esc(s.name)} - ${esc(s.geo.place)}. ${esc(s.geo.note)}</title>
      ${state === 'current' ? `<circle r="${r + 7 * k}" class="pulse" style="stroke-width:${2 * k}px"/>` : ''}
      ${state === 'done' ? `<g transform="scale(${(r * 2.7) / 24}) translate(-12,-12)" fill="none" stroke="${col}" stroke-width="${1.6 * 24 / (r * 2.7) * k * 0.9}" stroke-linecap="round">${iconPaths.laurel}</g>` : ''}
      <circle r="${r}" fill="${state === 'locked' ? '#3a2f1c' : '#241a0c'}" stroke="${col}" stroke-width="${2.4 * k}"/>
      <circle r="${r * 0.82}" fill="${state === 'locked' ? '#5a4a2a' : col}" fill-opacity="${state === 'locked' ? 1 : 0.22}"/>
      ${icoG(named ? 'general' : 'swords', r * 0.74, state === 'locked' ? '#cdbb8a' : '#fff2cf', 2.1)}
      <g transform="translate(${r * 0.78},${-r * 0.78})"><circle r="${6.2 * k}" fill="#14100a" stroke="${col}" stroke-width="${1 * k}"/><text y="${4.6 * k}" text-anchor="middle" class="nn" style="font-size:${12 * k}px;fill:#f0e4c8">${i + 1}</text></g></g>`;
  }).join('');
  // the army: a legion's standard planted at the current battle (a silvered disc stack, a crossbar and a red pennant)
  const armyMark = (() => { if (idx >= SCENARIOS.length) return ''; const [x, y] = pts[idx]; if (!inView(x, y, 40 * k)) return ''; const r = rN(SCENARIOS[idx], idx);
    return `<g transform="translate(${x + r + 8 * k},${y + r * 0.9}) scale(${k * 1.35})" class="armymark"><line x1="0" y1="0" x2="0" y2="-26" stroke="#3a2a14" stroke-width="2.4"/><circle cx="0" cy="-8" r="2.6" fill="#d6dae0" stroke="#14100a" stroke-width=".7"/><circle cx="0" cy="-14" r="2.6" fill="#d6dae0" stroke="#14100a" stroke-width=".7"/><rect x="-5" y="-21" width="10" height="2" fill="#e0bb55"/><path class="flag" d="M0 -26 l12 3 l-12 5z" fill="#b3261e" stroke="#14100a" stroke-width=".7"/><circle cx="0" cy="-28" r="2" fill="#e0bb55" stroke="#14100a" stroke-width=".6"/></g>`; })();
  // triremes on the sea
  const ships = [[43.0, 7.8, 0.3], [38.2, 14.5, -0.5], [44.4, -5.6, 0.9], [36.0, 26.0, 0.2], [35.6, 4.0, 2.7]].map(([lat, lon, an]) => { const [x, y] = project(lat, lon); if (!inView(x, y)) return '';
    return `<g transform="translate(${x},${y}) rotate(${an * 57.3}) scale(${k * (big ? 1.2 : 1.7)})" opacity=".92"><path d="M-12 2 q12 7 24 0 l-3 -4 h-18z" fill="#6a4a2a" stroke="#14100a" stroke-width=".9"/><line x1="0" y1="-2" x2="0" y2="-14" stroke="#14100a" stroke-width="1"/><path d="M0 -14 q8 4 0 10z" fill="#e8dcc0" stroke="#14100a" stroke-width=".7"/>${[-8, -3, 2, 7].map(o => `<line x1="${o}" y1="1" x2="${o - 2}" y2="6" stroke="#cfc9a8" stroke-width=".7"/>`).join('')}<path d="M-14 6 q14 6 28 0" stroke="rgba(255,255,255,.35)" fill="none" stroke-width=".8"/></g>`; }).join('');
  const [gx, gy] = project(46.6, 5.0);
  const actLabel = big ? `<text x="${gx - 40 * k}" y="${gy - 26 * k}" text-anchor="end" class="nl" style="font-size:${13 * k}px">Act I: Gaul</text>` : '';
  const future = futs.map(o => `<g class="fut" transform="translate(${o.x},${o.y})"><title>${esc(o.f.hint)}</title><circle r="${o.r}" fill="${o.f.rome ? '#7a2a22' : '#3b3120'}" stroke="#14100a" stroke-width="${2 * k}"/></g>`).join('');

  // scale bar (Mercator: km per px depends on latitude)
  const midLat = (view === 'all') ? 45 : 47, pxPerKm = MAP.s * rad(1) / (111.32 * Math.cos(rad(midLat))), km = big ? 500 : 100, sbw = km * pxPerKm;
  const sbx = vb.x + 18 * k, sby = vb.y + vb.h - 34 * k;
  const scale = `<g><rect x="${sbx - 6 * k}" y="${sby - 16 * k}" width="${sbw + 12 * k}" height="${30 * k}" fill="rgba(10,8,4,0.6)"/><line x1="${sbx}" y1="${sby}" x2="${sbx + sbw}" y2="${sby}" stroke="#e8c36a" stroke-width="${2.5 * k}"/><line x1="${sbx}" y1="${sby - 5 * k}" x2="${sbx}" y2="${sby + 5 * k}" stroke="#e8c36a" stroke-width="${2 * k}"/><line x1="${sbx + sbw}" y1="${sby - 5 * k}" x2="${sbx + sbw}" y2="${sby + 5 * k}" stroke="#e8c36a" stroke-width="${2 * k}"/><text x="${sbx}" y="${sby - 7 * k}" class="gl" style="font-size:${10 * k}px;fill:#e8c36a">${km} km</text></g>`;
  const north = `<g transform="translate(${vb.x + vb.w - 28 * k},${vb.y + 34 * k})"><path d="M0 ${-16 * k} L${6 * k} ${8 * k} L0 ${3 * k} L${-6 * k} ${8 * k} Z" fill="#e8c36a"/><text y="${22 * k}" text-anchor="middle" class="gl" style="font-size:${11 * k}px;fill:#e8c36a">N</text></g>`;

  // hand-drawn relief: mountain ranges and great forests, then a ruled frame, a cartouche and a compass rose
  const mt = (lat, lon, sz = 1) => { const [x, y] = project(lat, lon); if (!inView(x, y)) return ''; const a = 9.5 * k * sz * (big ? 0.8 : 1); return `<g transform="translate(${x},${y})"><path d="M${-a} ${a * 0.6} L0 ${-a} L${a} ${a * 0.6} Z" fill="#8c7c58" stroke="#2a2112" stroke-width="${0.9 * k}" stroke-linejoin="round"/><path d="M0 ${-a} L${a} ${a * 0.6} L${a * 0.2} ${a * 0.6} Z" fill="#5b4d30" opacity=".6"/><path d="M${-a * 0.32} ${-a * 0.4} L0 ${-a} L${a * 0.32} ${-a * 0.4} L${a * 0.1} ${-a * 0.55} L${-a * 0.1} ${-a * 0.35} Z" fill="#f4ecd6" opacity=".9"/></g>`; };
  const tr = (lat, lon) => { const [x, y] = project(lat, lon); if (!inView(x, y)) return ''; const a = 5.6 * k * (big ? 0.8 : 1); return `<g transform="translate(${x},${y})"><circle cx="${a * 0.3}" cy="${a * 0.4}" r="${a}" fill="#1c2a14" opacity=".35"/><circle r="${a}" fill="#4a6a34" stroke="#1c2a14" stroke-width="${0.7 * k}"/><circle cx="${-a * 0.3}" cy="${-a * 0.3}" r="${a * 0.5}" fill="#6d8f4a" opacity=".8"/></g>`; };
  const glyphs = [[46.3, 7.2], [46.1, 8.2, 1.2], [46.4, 9.3], [45.9, 6.6], [46.6, 10.4], [45.7, 7.5, 0.9], [46.9, 8.8, 1.1], [45.4, 7.0], [46.0, 9.8], [42.7, 0.5], [42.7, -0.7], [42.6, 1.6], [42.8, 2.4, 0.8], [45.2, 2.7, 0.8], [44.9, 3.3, 0.8], [48.2, 7.0, 0.8], [46.8, 6.1, 0.8], [47.0, 6.8, 0.8], [44.3, 6.7, 0.9], [44.0, 11.3, 0.9], [43.2, 12.8, 0.9], [41.9, 13.9, 0.9]].map(m => mt(...m)).join('')
    + [[50.0, 5.3], [49.8, 5.8], [50.2, 5.0], [49.6, 5.5], [48.0, 8.2], [48.4, 8.3], [47.7, 8.1], [50.0, 10.5], [50.6, 11.2], [51.1, 10.2], [50.3, 9.6], [52.4, 8.9], [52.7, 8.4], [52.2, 9.4], [49.0, 12.0]].map(f => tr(...f)).join('');
  const f6 = 6 * k, fx0 = vb.x + f6, fy0 = vb.y + f6, fw = vb.w - 2 * f6, fh = vb.h - 2 * f6;
  const cx0 = vb.x + vb.w / 2, cw = 230 * k, cy0 = vb.y + 14 * k;
  const rose = `<g transform="translate(${vb.x + vb.w - 52 * k},${vb.y + vb.h - 58 * k})"><circle r="${30 * k}" fill="rgba(10,8,4,0.45)" stroke="#e8c36a" stroke-opacity=".6" stroke-width="${1 * k}"/>${[0, 90, 180, 270].map(a => `<polygon points="0,${-28 * k} ${4.5 * k},${-4.5 * k} 0,0 ${-4.5 * k},${-4.5 * k}" transform="rotate(${a})" fill="#e8c36a"/>`).join('')}${[45, 135, 225, 315].map(a => `<polygon points="0,${-18 * k} ${3 * k},${-3 * k} 0,0 ${-3 * k},${-3 * k}" transform="rotate(${a})" fill="#a88a45"/>`).join('')}<text y="${-33 * k}" text-anchor="middle" class="gl" style="font-size:${11 * k}px">N</text></g>`;
  const decor = `<rect x="${fx0}" y="${fy0}" width="${fw}" height="${fh}" class="frame" style="stroke-width:${2 * k}px"/><rect x="${fx0 + 4 * k}" y="${fy0 + 4 * k}" width="${fw - 8 * k}" height="${fh - 8 * k}" class="frame" style="stroke-width:${0.8 * k}px"/>`
    + [[fx0, fy0], [fx0 + fw, fy0], [fx0, fy0 + fh], [fx0 + fw, fy0 + fh]].map(([x, y]) => `<rect x="${x - 4 * k}" y="${y - 4 * k}" width="${8 * k}" height="${8 * k}" transform="rotate(45 ${x} ${y})" fill="#e8c36a"/>`).join('')
    + `<g><rect x="${cx0 - cw / 2}" y="${cy0}" width="${cw}" height="${38 * k}" rx="${4 * k}" class="cart" style="stroke-width:${1.4 * k}px"/><text x="${cx0}" y="${cy0 + 19 * k}" class="cartt" style="font-size:${16 * k}px">${big ? 'ORBIS ROMANUS' : 'GALLIA TRANSALPINA'}</text><text x="${cx0}" y="${cy0 + 32 * k}" class="carts" style="font-size:${10.5 * k}px">${big ? 'The Roman world' : 'The Gallic campaigns, 58 BC'}</text></g>` + rose;
  const done = idx >= SCENARIOS.length;
  const army = c.cohorts.map(h => `<li>${esc(h.name)} <span class="muted">- ${h.men}/${h.maxMen}</span></li>`).join('');
  const hrows = (c.history || []).slice(-6).reverse().map(h => { const s = [PROLOGUE, ...SCENARIOS].find(x => x.id === h.id); return `<div><span style="color:${OUT[h.outcome]}">${h.outcome.toUpperCase()}</span> - ${esc(s ? s.name : h.id)}</div>`; }).join('');

  root.innerHTML = `<div class="camp mapscreen">
    <header><h2>The Road to Rome</h2><div class="res"><span>${icon('coin')} Denarii <b>${c.gold}</b></span><span>${icon('grain')} Supplies <b>${c.supplies}</b></span><span>${icon('helmet')} Army <b>${totalMen(c)}</b></span><span>${icon('day')} Day <b>${c.day}</b></span><span class="pill">${esc(diff.name)}</span></div></header>
    <div class="card mapcard">
      <div class="row maptools"><button id="v-act" class="${view === 'act' ? 'on' : ''}">Act I: Gaul</button><button id="v-all" class="${view === 'all' ? 'on' : ''}">Whole Roman world</button><span class="muted small">Coastlines, rivers and lakes: Natural Earth (public domain). Mercator; Roman place names, positions approximate.</span></div>
      <svg viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}" id="mapsvg" role="img" aria-label="Campaign map of the Roman world">
        <defs><radialGradient id="seag" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#27495c"/><stop offset="1" stop-color="#14262f"/></radialGradient>
          <filter id="mgrain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${(0.55 / k).toFixed(3)}" numOctaves="3" seed="9" result="t"/><feColorMatrix in="t" values="0 0 0 0 .16  0 0 0 0 .12  0 0 0 0 .04  0 0 0 .75 -.18" result="g"/><feComposite in="g" in2="SourceGraphic" operator="in"/></filter></defs>
        <rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" class="sea"/><pattern id="wv" width="${34 * k}" height="${20 * k}" patternUnits="userSpaceOnUse"><path d="M0 ${8 * k} q${4 * k} ${-4 * k} ${8 * k} 0 t${8 * k} 0" stroke="#9ccbe0" stroke-opacity=".16" fill="none" stroke-width="${0.9 * k}"/></pattern><rect x="${vb.x}" y="${vb.y}" width="${vb.w}" height="${vb.h}" fill="url(#wv)"/>
        <g class="geo">${graticule(vb, k)}<path d="${MAP.land}" class="shore" style="stroke-width:${16 * k}px"/><path d="${MAP.land}" class="shore s2" style="stroke-width:${8 * k}px"/><path d="${MAP.land}" class="land" style="stroke-width:${1.6 * k}px"/><path d="${MAP.land}" fill="#000" filter="url(#mgrain)"/><path d="${MAP.lakes}" class="lake" style="stroke-width:${1 * k}px"/><path d="${MAP.rivers}" class="river" style="stroke-width:${1.5 * k}px"/></g>
        ${glyphs}${ships}${labelSvg}
        ${edges}${placeDots}${future}${nodes}${armyMark}${actLabel}${scale}${north}${decor}</svg></div>
    <div class="col">
      <div class="card"><h3>${done ? 'Act I complete' : `Act ${scn.act} - battle ${idx + 1} of ${SCENARIOS.length}`}</h3>
        ${done ? `<p>The Helvetii are broken and Gaul lies open before you. Acts II onward (Germania, Britannia, the civil war and Rome itself) are the next milestones.</p>`
          : `<p><b>${esc(scn.name)}</b>${scn.kind === 'named' ? ' <span class="pill">Named battle</span>' : ''}${scn.rewardMult > 1.4 ? ' <span class="pill">Dangerous - rich spoils</span>' : ''}<br><span class="small muted">${esc(scn.geo.place)} (${scn.geo.lat.toFixed(2)}&deg;N, ${scn.geo.lon.toFixed(2)}&deg;E)</span><br><span class="muted">${esc(scn.briefing)}</span></p>
          <p class="small muted">${esc(scn.objective)}</p>
          <div class="row"><button class="primary" id="m-camp">Make camp</button><button id="m-march">March at once</button></div>
          <div class="small muted" style="margin-top:6px">You have <b>${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}</b> before the enemy moves. Every camp activity (a drill, foraging, a purchase) takes one day, so you can do about ${c.daysLeft} thing${c.daysLeft === 1 ? '' : 's'}. Marching at once saves them but you fight as you are.</div>`}
        <div class="row" style="margin-top:8px"><button id="m-menu">Main menu</button></div></div>
      <div class="card"><h3>${esc((c.player && c.player.name) || 'Your command')}</h3><div class="small muted">${esc(picksNames(c).join(' - ') || 'Veteran commander')}</div>${describe(c).lines.map(([a, b]) => `<div class="kvl"><span>${esc(a)}</span><span>${esc(b)}</span></div>`).join('')}</div>
      <div class="card"><h3>Your army</h3><ul class="armylist">${army}</ul></div>
      <div class="card"><h3>Dispatches</h3><div class="log">${hrows || '<div>No battles fought yet.</div>'}</div></div>
    </div></div>`;
  const q = (s) => root.querySelector(s);
  if (q('#m-camp')) q('#m-camp').onclick = () => api.camp();
  if (q('#m-march')) q('#m-march').onclick = () => api.march();
  q('#m-menu').onclick = () => api.menu();
  q('#v-act').onclick = () => { view = 'act'; renderMap(root, c, api); };
  q('#v-all').onclick = () => { view = 'all'; renderMap(root, c, api); };
}
