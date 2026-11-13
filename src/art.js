// Art layer. Every picture in the UI comes through artSrc(kind, key, w, h).
// If real art exists (assets/art/manifest.json, or an inlined manifest in single-file builds) it is used;
// otherwise a procedural placeholder is drawn. Drop finished images into assets/art/ and list them in the manifest.
import { UNIT_TYPES, WORLD, setWorld } from './data.js';
import { soldierSprite } from './sprites.js';
import { paintTerrain } from './render.js';

let manifest = {};
const cache = new Map();
// Placeholders are drawn once and cached; redraw them once the web fonts have loaded.
if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) document.fonts.ready.then(() => cache.clear());

export async function initArt() {
  if (typeof window !== 'undefined' && window.__LEGIO_ART__) { manifest = window.__LEGIO_ART__; return; }
  try {
    const r = await fetch('assets/art/manifest.json');
    if (r.ok) manifest = await r.json();
    // the camp painting is optional: if the manifest names a file that has not been added yet, fall back to the drawn camp
    const cf = manifest.camp && manifest.camp.main;
    if (cf && !cf.startsWith('data:')) { const h = await fetch(`assets/art/${cf}`, { method: 'HEAD' }).catch(() => null); if (!h || !h.ok) delete manifest.camp; }
  } catch { /* offline or blocked: placeholders only */ }
}

export function hasRealArt(kind, key) { return !!(manifest[kind] && manifest[kind][key]); }

export function artSrc(kind, key, w = 160, h = 160, extra = {}) {
  if (hasRealArt(kind, key)) { const f = manifest[kind][key]; return f.startsWith('data:') ? f : `assets/art/${f}`; }
  const id = `${kind}|${key}|${w}x${h}|${extra.title || ''}`;
  if (cache.has(id)) return cache.get(id);
  const url = placeholder(kind, key, w, h, extra);
  cache.set(id, url);
  return url;
}

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tag = (g, w, h, label = 'PLACEHOLDER') => {
  g.font = `bold ${Math.max(8, Math.round(h * 0.06))}px system-ui, sans-serif`; g.textAlign = 'right'; g.textBaseline = 'bottom';
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillText(label, w - 6, h - 4);
};

function placeholder(kind, key, w, h, extra) {
  try {
    if (kind === 'unit') return unitIcon(key, w, h);
    if (kind === 'officer') return officerPortrait(key, w, h, extra);
    if (kind === 'scenario') return scenarioBanner(key, w, h, extra);
    if (kind === 'outcome') return outcomeBanner(key, w, h);
  } catch { /* fall through */ }
  const [c, g] = mk(w, h); g.fillStyle = '#2f261a'; g.fillRect(0, 0, w, h); return c.toDataURL();
}

// ---- unit icons: a heraldic glyph per unit type ----
function unitIcon(key, w, h) {
  const t = UNIT_TYPES[key] || { color: '#777', trim: '#ddd', cat: 'inf', side: 'rome' };
  const [c, g] = mk(w, h);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3a2e1b'); grd.addColorStop(1, '#17130d');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.strokeStyle = t.trim; g.globalAlpha = 0.55; g.lineWidth = Math.max(2, w * 0.025); g.strokeRect(w * 0.03, h * 0.03, w * 0.94, h * 0.94); g.globalAlpha = 1;
  // the unit's own top-down soldier, turned to face up the card
  g.save(); g.translate(w / 2, h * 0.43); g.rotate(-Math.PI / 2); const sz = Math.min(w, h) * 0.8; g.drawImage(soldierSprite(key, 0), -sz / 2, -sz / 2, sz, sz); g.restore();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.8, w, h * 0.2);
  g.fillStyle = '#f0e4c8'; g.font = `bold ${Math.round(h * 0.085)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText((UNIT_TYPES[key] ? UNIT_TYPES[key].name : key).replace('Cohort', '').replace('(Cavalry Turma)', '').trim().slice(0, 22), w / 2, h * 0.9);
  tag(g, w, h * 0.8);
  return c.toDataURL();
}

// ---- officer portraits: a helmeted bust, crest and colour by rank ----
function officerPortrait(key, w, h, extra) {
  const name = extra.title || String(key), rank = extra.rank || '';
  const [c, g] = mk(w, h);
  let hs = 0; for (const ch of String(key) + name) hs = (hs * 31 + ch.charCodeAt(0)) >>> 0;
  const skin = ['#d9b08a', '#c99c78', '#e2bb94'][hs % 3], beard = hs % 4 === 0, grey = hs % 5 === 0;
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#4f3d24'); grd.addColorStop(1, '#17120b');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const cx = w / 2, u = w / 100, ctr = /Centurion/.test(rank), trb = /Tribune/.test(rank), cav = /Prefect/.test(rank);
  // red cloak and shoulders in mail with the doubled cape
  g.fillStyle = '#8f2018'; g.beginPath(); g.ellipse(cx, h * 1.0, 47 * u, 31 * u, 0, Math.PI, 0); g.fill();
  const mg = g.createLinearGradient(cx - 36 * u, 0, cx + 36 * u, 0); mg.addColorStop(0, '#9aa2ab'); mg.addColorStop(0.5, '#757d86'); mg.addColorStop(1, '#565d66');
  g.fillStyle = trb ? '#c9a24a' : mg; g.beginPath(); g.ellipse(cx, h * 1.0, 39 * u, 25 * u, 0, Math.PI, 0); g.fill();                     // mail (a bronze muscled cuirass for the tribune)
  g.save(); g.beginPath(); g.ellipse(cx, h * 1.0, 39 * u, 25 * u, 0, Math.PI, 0); g.clip(); g.strokeStyle = 'rgba(25,30,38,0.3)'; g.lineWidth = Math.max(0.6, u * 0.5);
  for (let y = h * 0.75; y < h; y += 3 * u) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 2 * u); g.stroke(); } g.restore();
  g.fillStyle = skin; g.beginPath(); g.rect(cx - 7 * u, h * 0.62, 14 * u, 10 * u); g.fill();                                              // neck
  // face, with a little modelling
  const fg = g.createRadialGradient(cx - 6 * u, h * 0.44, 2 * u, cx, h * 0.5, 24 * u); fg.addColorStop(0, '#fff3dc'); fg.addColorStop(0.35, skin); fg.addColorStop(1, '#8a6240');
  g.fillStyle = fg; g.beginPath(); g.ellipse(cx, h * 0.5, 17 * u, 22 * u, 0, 0, 7); g.fill();
  if (beard) { g.fillStyle = grey ? '#9a9a96' : '#4a3220'; g.beginPath(); g.ellipse(cx, h * 0.6, 14 * u, 11 * u, 0, 0, Math.PI); g.fill(); }
  g.strokeStyle = '#3a2616'; g.lineWidth = Math.max(1, u * 1.4); g.beginPath(); g.moveTo(cx - 12 * u, h * 0.455); g.lineTo(cx - 5 * u, h * 0.465); g.moveTo(cx + 5 * u, h * 0.465); g.lineTo(cx + 12 * u, h * 0.455); g.stroke();   // brows
  g.fillStyle = '#20150c'; g.beginPath(); g.ellipse(cx - 8.5 * u, h * 0.495, 2.4 * u, 1.4 * u, 0, 0, 7); g.ellipse(cx + 8.5 * u, h * 0.495, 2.4 * u, 1.4 * u, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(80,50,30,0.55)'; g.lineWidth = Math.max(1, u * 1.2); g.beginPath(); g.moveTo(cx, h * 0.5); g.lineTo(cx - 2.2 * u, h * 0.57); g.lineTo(cx + 1.5 * u, h * 0.575); g.stroke();   // nose
  g.strokeStyle = beard ? 'rgba(30,20,12,0.7)' : 'rgba(110,60,50,0.8)'; g.lineWidth = Math.max(1, u * 1.3); g.beginPath(); g.moveTo(cx - 5 * u, h * 0.62); g.lineTo(cx + 5 * u, h * 0.62); g.stroke();
  // bronze Montefortino-type helmet with cheek-pieces; crest by rank
  const hg = g.createLinearGradient(cx - 20 * u, 0, cx + 20 * u, 0); hg.addColorStop(0, '#e0b85a'); hg.addColorStop(0.45, '#b88a3a'); hg.addColorStop(1, '#7a5a22');
  g.fillStyle = hg; g.beginPath(); g.ellipse(cx, h * 0.44, 20.5 * u, 18 * u, 0, Math.PI, 0); g.fill(); g.fillRect(cx - 20.5 * u, h * 0.435, 41 * u, 4 * u);
  g.beginPath(); g.moveTo(cx - 20 * u, h * 0.45); g.lineTo(cx - 17 * u, h * 0.6); g.lineTo(cx - 11 * u, h * 0.6); g.lineTo(cx - 12 * u, h * 0.45); g.fill();
  g.beginPath(); g.moveTo(cx + 20 * u, h * 0.45); g.lineTo(cx + 17 * u, h * 0.6); g.lineTo(cx + 11 * u, h * 0.6); g.lineTo(cx + 12 * u, h * 0.45); g.fill();      // cheek-pieces
  g.fillStyle = '#e8cf86'; g.beginPath(); g.arc(cx, h * 0.27, 2.4 * u, 0, 7); g.fill();
  if (ctr) { g.fillStyle = '#d8d2b0'; g.beginPath(); g.moveTo(cx - 26 * u, h * 0.28); g.quadraticCurveTo(cx, h * 0.12, cx + 26 * u, h * 0.28); g.lineTo(cx + 24 * u, h * 0.2); g.quadraticCurveTo(cx, h * 0.04, cx - 24 * u, h * 0.2); g.fill(); g.strokeStyle = '#8a8466'; g.lineWidth = 1; g.stroke(); }   // transverse crest
  else { g.fillStyle = trb || cav ? '#b3261e' : '#2a2a2a'; g.beginPath(); g.moveTo(cx - 5 * u, h * 0.28); g.quadraticCurveTo(cx - 6 * u, h * 0.1, cx, h * 0.07); g.quadraticCurveTo(cx + 6 * u, h * 0.1, cx + 5 * u, h * 0.28); g.fill(); }
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.82, w, h * 0.18);
  g.fillStyle = '#f0e4c8'; g.font = `bold ${Math.round(h * 0.07)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name.split(' ').slice(-1)[0], w / 2, h * 0.9);
  g.strokeStyle = 'rgba(232,195,106,0.5)'; g.lineWidth = 2; g.strokeRect(2, 2, w - 4, h - 4);
  tag(g, w, h * 0.82);
  return c.toDataURL();
}

// ---- scenario banners: the battle map itself, framed ----
function scenarioBanner(key, w, h, extra) {
  const scn = extra.scn;
  const [c, g] = mk(w, h);
  g.fillStyle = '#17130d'; g.fillRect(0, 0, w, h);
  if (scn) {
    setWorld(scn); const s = w / WORLD.w; g.save(); g.translate(0, (h - WORLD.h * s) / 2 + 40 * s); g.scale(s, s); paintTerrain(g, scn); g.restore();
  }
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0.05)'); grd.addColorStop(1, 'rgba(10,8,4,0.88)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8c36a'; g.font = `${Math.round(h * 0.16)}px Cinzel, Georgia, serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(scn ? scn.name : key, w * 0.03, h * 0.82);
  g.fillStyle = '#d9cba8'; g.font = `${Math.round(h * 0.075)}px Cinzel, Georgia, serif`;
  g.fillText(scn ? `${scn.theater}, ${scn.year}` : '', w * 0.03, h * 0.93);
  g.strokeStyle = 'rgba(232,195,106,0.6)'; g.lineWidth = 3; g.strokeRect(2, 2, w - 4, h - 4);
  tag(g, w, h);
  return c.toDataURL();
}

// ---- outcome banners ----
function outcomeBanner(key, w, h) {
  const [c, g] = mk(w, h);
  const pal = { victory: ['#2a4a2a', '#9be09b'], draw: ['#4a3d1a', '#e8c36a'], defeat: ['#4a1e1a', '#ee9a8e'] }[key] || ['#333', '#ccc'];
  const grd = g.createLinearGradient(0, 0, w, h); grd.addColorStop(0, pal[0]); grd.addColorStop(1, '#14100a'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.strokeStyle = pal[1]; g.lineWidth = 3; g.globalAlpha = 0.75;
  const cx = w / 2, cy = h * 0.5, r = h * 0.34;
  if (key === 'victory') { // laurel wreath
    for (const sgn of [-1, 1]) for (let i = 0; i < 9; i++) { const a = Math.PI * (0.6 + i * 0.1); const x = cx + sgn * Math.cos(a) * r * 1.1, y = cy + Math.sin(a) * r; g.beginPath(); g.ellipse(x, y, 10, 4, sgn * (a - Math.PI * 1.3), 0, 7); g.stroke(); }
  } else if (key === 'draw') { g.beginPath(); g.arc(cx, cy, r, 0, 7); g.moveTo(cx - r, cy); g.lineTo(cx + r, cy); g.stroke(); }
  else { g.beginPath(); g.moveTo(cx - 8, cy - r); g.lineTo(cx - 2, cy); g.lineTo(cx - 14, cy + r); g.stroke(); g.beginPath(); g.moveTo(cx + 10, cy - r * 0.8); g.lineTo(cx + 40, cy - r * 0.2); g.lineTo(cx + 12, cy - r * 0.1); g.stroke(); }
  g.globalAlpha = 1; g.strokeStyle = 'rgba(232,195,106,0.4)'; g.strokeRect(2, 2, w - 4, h - 4);
  tag(g, w, h);
  return c.toDataURL();
}
