// Art layer. Every picture in the UI comes through artSrc(kind, key, w, h).
// If real art exists (assets/art/manifest.json, or an inlined manifest in single-file builds) it is used;
// otherwise a procedural placeholder is drawn. Drop finished images into assets/art/ and list them in the manifest.
import { UNIT_TYPES, WORLD } from './data.js';
import { paintTerrain } from './render.js';

let manifest = {};
const cache = new Map();

export async function initArt() {
  if (typeof window !== 'undefined' && window.__LEGIO_ART__) { manifest = window.__LEGIO_ART__; return; }
  try {
    const r = await fetch('assets/art/manifest.json');
    if (r.ok) manifest = await r.json();
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
  g.save(); g.translate(w / 2, h * 0.47); const u = Math.min(w, h) / 100; g.scale(u, u);
  g.fillStyle = t.color; g.strokeStyle = t.trim; g.lineWidth = 3; g.lineJoin = 'round'; g.lineCap = 'round';
  const shield = () => { g.beginPath(); g.roundRect(-22, -34, 44, 68, 8); g.fill(); g.stroke(); g.beginPath(); g.arc(0, 0, 7, 0, 7); g.fillStyle = t.trim; g.fill(); };
  if (key === 'legionary') {
    shield(); g.strokeStyle = t.trim; g.lineWidth = 3.5; g.beginPath(); g.moveTo(-4, -26); g.lineTo(4, -12); g.lineTo(-3, -9); g.lineTo(5, 6); g.moveTo(-5, 12); g.lineTo(5, 12); g.stroke();
  } else if (key === 'slinger') {
    g.beginPath(); g.arc(0, 4, 26, Math.PI * 0.15, Math.PI * 1.05); g.stroke(); g.fillStyle = t.trim; g.beginPath(); g.arc(-24, -16, 7, 0, 7); g.fill();
    g.beginPath(); g.moveTo(24, 4); g.lineTo(34, -22); g.stroke();
  } else if (key === 'archer') {
    g.beginPath(); g.arc(-8, 0, 32, -Math.PI * 0.42, Math.PI * 0.42); g.stroke(); g.beginPath(); g.moveTo(11, -29); g.lineTo(11, 29); g.stroke();
    g.beginPath(); g.moveTo(-34, 0); g.lineTo(32, 0); g.moveTo(24, -6); g.lineTo(32, 0); g.lineTo(24, 6); g.stroke();
  } else if (t.cat === 'cav') {
    g.beginPath(); g.moveTo(-26, 30); g.lineTo(-20, -4); g.lineTo(-30, -22); g.lineTo(-14, -34); g.lineTo(8, -26); g.lineTo(26, -4); g.lineTo(30, 14); g.lineTo(18, 16); g.lineTo(10, 2); g.lineTo(0, 12); g.lineTo(-4, 30); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = t.trim; g.beginPath(); g.arc(-8, -22, 3, 0, 7); g.fill();
  } else if (key === 'warband') {
    g.beginPath(); g.arc(0, 4, 26, 0, 7); g.fill(); g.stroke(); g.fillStyle = t.trim; g.beginPath(); g.arc(0, 4, 7, 0, 7); g.fill();
    g.strokeStyle = t.trim; g.beginPath(); g.moveTo(-30, -30); g.lineTo(30, 34); g.moveTo(30, -30); g.lineTo(-30, 34); g.stroke();
  } else if (key === 'gaul_elite') {
    g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 24, 0.3, Math.PI * 2 - 0.3); g.stroke(); g.fillStyle = t.trim; g.beginPath(); g.arc(21, -10, 5, 0, 7); g.arc(21, 10, 5, 0, 7); g.fill();
    g.lineWidth = 3; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 34); g.stroke();
  } else { // skirmishers
    g.lineWidth = 3; for (const o of [-14, 0, 14]) { g.beginPath(); g.moveTo(o - 16, 30); g.lineTo(o + 16, -26); g.stroke(); g.fillStyle = t.trim; g.beginPath(); g.moveTo(o + 16, -26); g.lineTo(o + 8, -22); g.lineTo(o + 20, -16); g.fill(); }
  }
  g.restore();
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.8, w, h * 0.2);
  g.fillStyle = '#f0e4c8'; g.font = `bold ${Math.round(h * 0.085)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText((UNIT_TYPES[key] ? UNIT_TYPES[key].name : key).replace('Cohort', '').replace('(Cavalry Turma)', '').trim().slice(0, 22), w / 2, h * 0.9);
  tag(g, w, h * 0.8);
  return c.toDataURL();
}

// ---- officer portraits: a helmeted bust, crest and colour by rank ----
function officerPortrait(key, w, h, extra) {
  const name = extra.title || String(key), rank = extra.rank || '';
  const [c, g] = mk(w, h);
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#4a3a22'); grd.addColorStop(1, '#1a140d');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const cx = w / 2, u = w / 100;
  g.fillStyle = '#6b5638'; g.beginPath(); g.ellipse(cx, h * 0.98, 42 * u, 30 * u, 0, Math.PI, 0); g.fill();           // shoulders
  const mail = /Centurion|Prefect/.test(rank) ? '#8a8f96' : '#b3261e';
  g.fillStyle = mail; g.beginPath(); g.ellipse(cx, h * 0.98, 38 * u, 24 * u, 0, Math.PI, 0); g.fill();
  g.fillStyle = '#c9a07a'; g.beginPath(); g.ellipse(cx, h * 0.5, 17 * u, 22 * u, 0, 0, 7); g.fill();                  // face
  g.fillStyle = '#b08a3a'; g.beginPath(); g.ellipse(cx, h * 0.44, 20 * u, 17 * u, 0, Math.PI, 0); g.fill();           // helmet
  g.fillRect(cx - 20 * u, h * 0.44, 40 * u, 4 * u);
  g.fillStyle = /Tribune/.test(rank) ? '#b3261e' : /Centurion/.test(rank) ? '#d8d2b0' : '#2a2a2a';                       // crest
  if (/Centurion/.test(rank)) g.fillRect(cx - 24 * u, h * 0.2, 48 * u, 9 * u); else { g.beginPath(); g.moveTo(cx - 5 * u, h * 0.29); g.lineTo(cx, h * 0.12); g.lineTo(cx + 5 * u, h * 0.29); g.fill(); }
  g.fillStyle = '#2a1e12'; g.fillRect(cx - 9 * u, h * 0.5, 4 * u, 2 * u); g.fillRect(cx + 5 * u, h * 0.5, 4 * u, 2 * u);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, h * 0.82, w, h * 0.18);
  g.fillStyle = '#f0e4c8'; g.font = `bold ${Math.round(h * 0.07)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
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
    const s = w / WORLD.w; g.save(); g.translate(0, (h - WORLD.h * s) / 2 + 40 * s); g.scale(s, s); paintTerrain(g, scn); g.restore();
  }
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0.05)'); grd.addColorStop(1, 'rgba(10,8,4,0.88)');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = '#e8c36a'; g.font = `${Math.round(h * 0.16)}px Georgia, serif`; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(scn ? scn.name : key, w * 0.03, h * 0.82);
  g.fillStyle = '#d9cba8'; g.font = `${Math.round(h * 0.075)}px Georgia, serif`;
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
