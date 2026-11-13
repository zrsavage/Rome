// The camp as a painting. The scene is drawn once onto a canvas in an oblique, bird's-eye view, then given a painterly finish (brush dabs sampled from
// the picture itself, a warm light, soft vignette) and handed to the camp screen as an image; the clickable buildings are an SVG layer on top (see
// campscene.js). Layout follows a Roman marching camp: a rectangle with rounded corners, a ditch and a palisade on an earth rampart, corner towers,
// the via principalis and via praetoria crossing at the headquarters, goatskin tents in rows, and a gate.
//
// To use a generated painting instead: put its data URL in CAMP_PAINTING below. The building hotspots (BUILDINGS in campscene.js) are in a
// 1000 x 620 space that maps onto the picture, so only those coordinates need adjusting to the new image.
import { soldierSprite } from './sprites.js';
import { hasRealArt, artSrc } from './art.js';

export const CAMP_PAINTING = null;
const W = 1000, H = 620, R = 2.2;
const cache = new Map();

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const rgb = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;

// ---- small painters ----
function softShadow(g, x, y, rx, ry, a = 0.3) { g.fillStyle = `rgba(30,20,8,${a})`; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
function lin(g, x0, y0, x1, y1, stops) { const gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function poly(g, pts, fill, stroke, lw = 1) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.lineJoin = 'round'; g.stroke(); } }
function glow(g, x, y, r, col = '255,200,110', a = 0.55) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

// A tent seen from the south-east: lit gable front, darker side roof, door flap, ridge knob, guy ropes and pegs.
function tent(g, x, y, w, h, d, col, shadeCol, opts = {}) {
  const cx = x + w / 2, dx = d * 0.55, dy = -d * 0.32;
  softShadow(g, x + w / 2 + dx * 0.9 + 6, y + 3, w * 0.62 + dx * 0.5, 5 + d * 0.12, 0.28);
  g.strokeStyle = 'rgba(70,56,34,0.8)'; g.lineWidth = 0.8;
  for (const [ex, ey] of [[x - 7, y + 3], [x + w + 7, y + 3], [x - 5 + dx, y + dy - 2], [x + w + 5 + dx, y + dy - 2]]) { g.beginPath(); g.moveTo(cx + dx / 2, y - h + dy / 2); g.lineTo(ex, ey); g.stroke(); g.fillStyle = '#4a3a1e'; g.fillRect(ex - 0.8, ey - 0.5, 1.6, 3); }
  poly(g, [[cx, y - h], [cx + dx, y - h + dy], [x + w + dx, y + dy], [x + w, y]], shadeCol, 'rgba(40,30,16,0.8)', 1);
  poly(g, [[x, y], [cx, y - h], [x + w, y]], lin(g, x, y - h, x + w, y, [[0, col], [1, shadeCol]]), 'rgba(40,30,16,0.85)', 1.1);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 0.7;                                                    // the stitched seams of goatskin panels
  for (const f of [0.25, 0.5, 0.75]) { g.beginPath(); g.moveTo(x + w * f, y); g.lineTo(cx + (f - 0.5) * 2 * 0, y - h * (1 - Math.abs(f - 0.5) * 0)); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(x + 2, y - 1); g.lineTo(cx, y - h + 1); g.stroke();
  poly(g, [[cx - w * 0.11, y], [cx, y - h * 0.5], [cx + w * 0.11, y]], '#2a1c10', null);
  g.fillStyle = '#e2c15a'; g.beginPath(); g.arc(cx, y - h - 1, 1.6, 0, 7); g.fill();
  if (opts.flag) { g.strokeStyle = '#3a2a14'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, y - h); g.lineTo(cx, y - h - 20); g.stroke(); poly(g, [[cx, y - h - 20], [cx + 14, y - h - 16], [cx, y - h - 11]], opts.flag, '#2a1c10', 0.8); }
}
function post(g, x, y, h, w = 3, col = '#7a5a30') { softShadow(g, x + 2, y + 1, w * 1.4, 1.6, 0.3); g.fillStyle = lin(g, x - w / 2, 0, x + w / 2, 0, [[0, shadeHex(col, 1.25)], [1, shadeHex(col, 0.7)]]); g.fillRect(x - w / 2, y - h, w, h); poly(g, [[x - w / 2, y - h], [x, y - h - w * 0.9], [x + w / 2, y - h]], shadeHex(col, 1.1), null); }
function shadeHex(hex, f) { const n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255; return `rgb(${Math.max(0, Math.min(255, r * f)) | 0},${Math.max(0, Math.min(255, gg * f)) | 0},${Math.max(0, Math.min(255, b * f)) | 0})`; }
function barrel(g, x, y, s = 1) { softShadow(g, x + 3 * s, y + 1, 7 * s, 2.5 * s, 0.3); g.fillStyle = lin(g, x - 5 * s, 0, x + 5 * s, 0, [[0, '#a8743a'], [1, '#6a4420']]); g.beginPath(); g.ellipse(x, y - 6 * s, 5 * s, 7 * s, 0, 0, 7); g.fill(); g.strokeStyle = '#3a2410'; g.lineWidth = 0.8; g.stroke(); g.strokeStyle = '#2a1a0a'; for (const dy of [-9, -3]) { g.beginPath(); g.moveTo(x - 5 * s, y + dy * s); g.lineTo(x + 5 * s, y + dy * s); g.stroke(); } g.fillStyle = '#c99a5a'; g.beginPath(); g.ellipse(x, y - 12 * s, 4.2 * s, 1.6 * s, 0, 0, 7); g.fill(); }
function sack(g, x, y, s = 1) { softShadow(g, x + 2, y + 1, 6 * s, 2 * s, 0.28); g.fillStyle = lin(g, x - 5, y - 8, x + 5, y, [[0, '#d8c490'], [1, '#a89260']]); g.beginPath(); g.moveTo(x - 5 * s, y); g.quadraticCurveTo(x - 7 * s, y - 7 * s, x - 2 * s, y - 9 * s); g.lineTo(x + 2 * s, y - 9 * s); g.quadraticCurveTo(x + 7 * s, y - 7 * s, x + 5 * s, y); g.closePath(); g.fill(); g.strokeStyle = '#5a4a2a'; g.lineWidth = 0.7; g.stroke(); }
function fire(g, x, y) { softShadow(g, x, y + 2, 10, 4, 0.4); g.fillStyle = '#3a2a1a'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(x + Math.cos(i * 1.05) * 7, y + Math.sin(i * 1.05) * 3.2, 2.2, 0, 7); g.fill(); } glow(g, x, y - 3, 34, '255,170,70', 0.7);
  for (const [s, c] of [[9, '#e8641a'], [6, '#ff9a2e'], [3, '#ffe08a']]) { g.fillStyle = c; g.beginPath(); g.moveTo(x - s * 0.7, y); g.quadraticCurveTo(x - s * 0.3, y - s * 1.1, x, y - s * 1.7); g.quadraticCurveTo(x + s * 0.3, y - s * 1.1, x + s * 0.7, y); g.closePath(); g.fill(); } }
function figure(g, type, x, y, ang, size = 11, v = 0) { g.save(); g.translate(x, y); g.rotate(ang); softShadow(g, 1.5, 2, size * 0.5, size * 0.35, 0.3); g.drawImage(soldierSprite(type, v, true), -size / 2, -size / 2, size, size); g.restore(); }
function standard(g, x, y, h = 34, col = '#b3261e') { post(g, x, y, h, 2.2, '#4a3418'); g.fillStyle = '#cfd4da'; for (const dy of [-h + 8, -h + 14, -h + 20]) { g.beginPath(); g.arc(x, y + dy, 2.4, 0, 7); g.fill(); g.strokeStyle = '#2a1c10'; g.lineWidth = 0.6; g.stroke(); } g.fillStyle = '#e0bb55'; g.fillRect(x - 6, y - h + 3, 12, 1.8); poly(g, [[x, y - h - 4], [x + 3, y - h], [x - 3, y - h]], '#e0bb55', '#2a1c10', 0.6); poly(g, [[x + 1, y - h + 6], [x + 15, y - h + 9], [x + 1, y - h + 14]], col, '#2a1c10', 0.7); }

function timberBox(g, x, y, w, h, d, wall, roofCol) {                      // a gabled timber building: front wall, side wall, shingled roof (oblique)
  const dx = d * 0.55, dy = -d * 0.32;
  softShadow(g, x + w / 2 + dx, y + 3, w * 0.6 + dx, 6, 0.3);
  poly(g, [[x + w, y], [x + w + dx, y + dy], [x + w + dx, y + dy - h], [x + w, y - h]], lin(g, x + w, 0, x + w + dx, 0, [[0, shadeHex(wall, 0.78)], [1, shadeHex(wall, 0.6)]]), '#2a1c10', 1);
  poly(g, [[x, y], [x + w, y], [x + w, y - h], [x, y - h]], lin(g, 0, y - h, 0, y, [[0, shadeHex(wall, 1.12)], [1, shadeHex(wall, 0.9)]]), '#2a1c10', 1.1);
  g.strokeStyle = 'rgba(40,24,8,0.4)'; g.lineWidth = 0.7; for (let px = x + 5; px < x + w; px += 5) { g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - h); g.stroke(); }
  const cx = x + w / 2;
  poly(g, [[x - 4, y - h], [cx, y - h - w * 0.28], [x + w + 4, y - h]], lin(g, x, y - h - w * 0.28, x + w, y - h, [[0, shadeHex(roofCol, 1.2)], [1, roofCol]]), '#2a1008', 1.2);
  poly(g, [[cx, y - h - w * 0.28], [cx + dx, y - h - w * 0.28 + dy], [x + w + 4 + dx, y - h + dy], [x + w + 4, y - h]], shadeHex(roofCol, 0.7), '#2a1008', 1);
}

// ---- the scene ----
function ground(g, rnd) {
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#5f7c3a'], [1, '#78903f']]); g.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { g.fillStyle = rgb(70 + rnd() * 50, 100 + rnd() * 50, 50 + rnd() * 30, 0.18); g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 8 + rnd() * 30, 4 + rnd() * 14, rnd() * 3, 0, 7); g.fill(); }
  // a rounded-corner rectangle of rampart earth, then trodden dirt inside
  const rr = (m, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(m, m, W - 2 * m, H - 2 * m, 34); g.fill(); };
  rr(14, '#4a3a22');                                                       // the ditch (fossa)
  g.fillStyle = lin(g, 0, 14, 0, 30, [[0, '#2e2414'], [1, '#5a4a2c']]); g.beginPath(); g.roundRect(14, 14, W - 28, H - 28, 34); g.fill();
  rr(24, '#6a5a38');                                                       // the earth rampart (agger)
  g.fillStyle = lin(g, 0, 0, 0, H, [[0, '#a89462'], [1, '#8a7646']]); g.beginPath(); g.roundRect(40, 40, W - 80, H - 80, 24); g.fill();
  for (let i = 0; i < 1500; i++) { const x = 44 + rnd() * (W - 88), y = 44 + rnd() * (H - 88); g.fillStyle = rgb(60 + rnd() * 60, 48 + rnd() * 40, 28 + rnd() * 24, 0.12 + rnd() * 0.12); g.beginPath(); g.ellipse(x, y, 2 + rnd() * 7, 1 + rnd() * 3, rnd() * 3, 0, 7); g.fill(); }
  // streets with wheel ruts
  const road = (x, y, w, h) => { g.fillStyle = lin(g, x, y, x + w, y + h, [[0, '#d0bd88'], [1, '#b5a26c']]); g.fillRect(x, y, w, h); };
  road(40, 278, W - 80, 44); road(478, 40, 44, H - 80);
  g.strokeStyle = 'rgba(80,62,30,0.4)'; g.lineWidth = 1; g.setLineDash([10, 7]);
  for (const y of [286, 314]) { g.beginPath(); g.moveTo(44, y); g.lineTo(W - 44, y); g.stroke(); }
  for (const x of [486, 514]) { g.beginPath(); g.moveTo(x, 44); g.lineTo(x, H - 44); g.stroke(); }
  g.setLineDash([]);
  // outside: grass and a tree line to the north and sides
  for (let i = 0; i < 40; i++) { const x = rnd() * W; tree(g, x, 6 + rnd() * 6, 9 + rnd() * 7, rnd); }
  for (let i = 0; i < 16; i++) { tree(g, 4 + rnd() * 6, 40 + rnd() * (H - 80), 8 + rnd() * 6, rnd); tree(g, W - 4 - rnd() * 6, 40 + rnd() * (H - 80), 8 + rnd() * 6, rnd); }
}
function tree(g, x, y, r, rnd) { softShadow(g, x + r * 0.5, y + r * 0.7, r * 1.1, r * 0.5, 0.3); const k = rnd(); g.fillStyle = rgb(30 + k * 20, 70 + k * 30, 34 + k * 14); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = rgb(80 + k * 30, 130 + k * 30, 70, 0.6); g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.6, 0, 7); g.fill(); }

function palisade(g) {
  const stakes = (x0, y0, x1, y1, n) => { for (let i = 0; i <= n; i++) { const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t; post(g, x, y, 15, 4.2, i % 2 ? '#7a5a30' : '#6a4c28'); } };
  // north wall (seen from inside) and the two sides; the south wall in front of the camp comes last so it overlaps the ground
  stakes(48, 36, W - 48, 36, 118); stakes(30, 60, 30, H - 60, 56); stakes(W - 30, 60, W - 30, H - 60, 56);
  g.fillStyle = 'rgba(90,70,40,0.5)'; g.fillRect(40, 36, W - 80, 5);
}
function southWall(g) { const y = H - 34; for (let i = 0; i <= 118; i++) { const x = 48 + (W - 96) * (i / 118); if (x > 438 && x < 562) continue; post(g, x, y, 16, 4.2, i % 2 ? '#7a5a30' : '#6a4c28'); } }
function tower(g, x, y) { softShadow(g, x + 14, y + 4, 24, 8, 0.35); poly(g, [[x + 10, y], [x + 22, y - 6], [x + 22, y - 40], [x + 10, y - 34]], '#5a4020', '#2a1c10', 1); poly(g, [[x - 10, y], [x + 10, y], [x + 10, y - 34], [x - 10, y - 34]], lin(g, 0, y - 34, 0, y, [[0, '#9a7a48'], [1, '#7a5a30']]), '#2a1c10', 1.1);
  g.strokeStyle = 'rgba(40,24,8,0.4)'; g.lineWidth = 0.7; for (let px = x - 7; px < x + 10; px += 4) { g.beginPath(); g.moveTo(px, y); g.lineTo(px, y - 34); g.stroke(); }
  poly(g, [[x - 14, y - 34], [x, y - 52], [x + 14, y - 34]], lin(g, x - 14, y - 52, x + 14, y - 34, [[0, '#c0584a'], [1, '#8a3428']]), '#2a1008', 1.1); poly(g, [[x, y - 52], [x + 12, y - 58], [x + 26, y - 40], [x + 14, y - 34]], '#6a2820', '#2a1008', 1);
  g.strokeStyle = '#3a2a14'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, y - 52); g.lineTo(x, y - 72); g.stroke(); poly(g, [[x, y - 72], [x + 17, y - 67], [x, y - 61]], '#b3261e', '#2a1008', 0.8); figure(g, 'legionary', x - 1, y - 38, -1.57, 9, 1);
}
function gate(g) { const y = H - 34; tower(g, 436, y + 6); tower(g, 564, y + 6); g.fillStyle = 'rgba(80,60,30,0.35)'; g.fillRect(450, y - 6, 100, 12); standard(g, 500, y - 4, 30); }

// ---- buildings, drawn about the centre (x, y) of their 170 x 110 slot ----
function trainingGround(g, x, y, rnd) {
  g.fillStyle = lin(g, x - 80, y - 40, x + 80, y + 50, [[0, '#d2bd86'], [1, '#b49e66']]); g.beginPath(); g.ellipse(x, y + 4, 80, 46, 0, 0, 7); g.fill(); g.strokeStyle = 'rgba(90,70,34,0.5)'; g.lineWidth = 1.2; g.stroke();
  for (let i = 0; i < 90; i++) { g.fillStyle = rgb(120, 96, 52, 0.2); g.beginPath(); g.arc(x + (rnd() - 0.5) * 140, y + (rnd() - 0.5) * 80, 1 + rnd() * 2, 0, 7); g.fill(); }
  for (const [px, py] of [[x - 50, y - 18], [x - 14, y - 22], [x + 24, y - 18], [x + 58, y - 22]]) { post(g, px, py + 24, 26, 5, '#7a5a30'); g.strokeStyle = '#4a2f12'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(px - 7, py + 10); g.lineTo(px + 7, py + 10); g.stroke(); }
  for (const [fx, fy, a, v] of [[x - 36, y + 18, -0.3, 0], [x - 22, y + 20, 3, 1], [x + 8, y + 24, -0.1, 2], [x + 22, y + 22, 3.1, 0], [x + 46, y + 14, -0.4, 1], [x - 4, y - 2, 0.2, 2]]) figure(g, 'legionary', fx, fy, a, 12, v);
  g.fillStyle = '#b59a62'; g.beginPath(); g.arc(x + 62, y + 30, 8, 0, 7); g.fill(); g.strokeStyle = '#4a3a1a'; g.lineWidth = 1; g.stroke();
  for (const o of [-4, 0, 4]) { g.beginPath(); g.moveTo(x + 62 + o, y + 23); g.lineTo(x + 62 + o, y + 37); g.moveTo(x + 55, y + 30 + o); g.lineTo(x + 69, y + 30 + o); g.stroke(); }
}
function barracks(g, x, y) {
  const spec = [[x - 82, y - 6, 48, '#d4bd88', '#a78f5a'], [x - 28, y - 14, 48, '#dac38e', '#ad9560'], [x + 26, y - 6, 48, '#d0b982', '#a48d58'], [x - 70, y + 44, 44, '#d2bb86', '#a58e5a'], [x - 20, y + 40, 44, '#d6bf8a', '#a9925c'], [x + 30, y + 44, 44, '#d0b982', '#a48d58']];
  for (const [tx, ty, w, c, d] of spec) tent(g, tx, ty, w, 38, 40, c, d);
  fire(g, x + 76, y + 40); figure(g, 'legionary', x + 66, y + 46, 2.6, 10, 2); figure(g, 'legionary', x + 84, y + 48, 3.6, 10, 0);
}
function depot(g, x, y, rnd) {
  for (const px of [x - 64, x - 44, x - 18, x + 2]) post(g, px, y + 18, 20, 5, '#5a3f1e');
  timberBox(g, x - 70, y + 4, 76, 26, 34, '#b89a6a', '#8a4a2a');
  g.fillStyle = '#3a2410'; g.fillRect(x - 40, y - 18, 16, 20); for (let i = 0; i < 3; i++) { g.fillStyle = '#7a5a2a'; g.fillRect(x - 44 + i * 2, y + 6 + i * 3, 24 - i * 4, 2.6); }
  for (const [bx, by, s] of [[x + 50, y + 30, 1], [x + 64, y + 36, 1], [x + 56, y + 18, 0.95], [x + 72, y + 22, 1]]) barrel(g, bx, by, s);
  for (const [sx, sy] of [[x - 6, y + 40], [x + 6, y + 44], [x + 16, y + 38]]) sack(g, sx, sy);
  // a mule-cart
  const cx = x - 52, cy = y + 52; softShadow(g, cx + 16, cy + 4, 22, 5, 0.3); g.fillStyle = lin(g, cx, cy - 12, cx + 32, cy, [[0, '#9a7a48'], [1, '#6a4c26']]); g.fillRect(cx, cy - 12, 32, 10); g.strokeStyle = '#2a1a0a'; g.lineWidth = 1; g.strokeRect(cx, cy - 12, 32, 10);
  for (const wx of [cx + 6, cx + 26]) { g.fillStyle = '#6a4c26'; g.beginPath(); g.arc(wx, cy - 2, 6, 0, 7); g.fill(); g.stroke(); g.strokeStyle = '#3a2410'; g.beginPath(); g.moveTo(wx - 6, cy - 2); g.lineTo(wx + 6, cy - 2); g.moveTo(wx, cy - 8); g.lineTo(wx, cy + 4); g.stroke(); }
  for (const [sx, sy] of [[cx + 8, cy - 15], [cx + 18, cy - 17], [cx + 26, cy - 14]]) sack(g, sx, sy, 0.8);
}
function officersTent(g, x, y) {
  tent(g, x - 62, y + 34, 100, 66, 56, '#b53a30', '#7e2219', { flag: '#e8c36a' });
  g.fillStyle = '#8a6a3a'; g.fillRect(x + 50, y + 8, 30, 14); g.strokeStyle = '#2a1a0a'; g.lineWidth = 1; g.strokeRect(x + 50, y + 8, 30, 14); g.fillStyle = '#e8dcc0'; g.fillRect(x + 52, y + 10, 26, 8); g.strokeStyle = '#7a5a30'; g.beginPath(); g.moveTo(x + 55, y + 15); g.quadraticCurveTo(x + 62, y + 10, x + 68, y + 15); g.stroke();
  post(g, x + 54, y + 36, 14, 3, '#6a4a1e'); post(g, x + 76, y + 36, 14, 3, '#6a4a1e'); figure(g, 'legionary', x - 70, y + 44, 0, 11, 1); figure(g, 'legionary', x + 42, y + 44, 3.1, 11, 2);
}
function forge(g, x, y, rnd) {
  timberBox(g, x - 66, y + 22, 90, 38, 36, '#8a8a90', '#6a5238');
  g.fillStyle = '#55555c'; g.fillRect(x + 4, y - 50, 14, 30); g.strokeStyle = '#26262c'; g.lineWidth = 1; g.strokeRect(x + 4, y - 50, 14, 30);
  for (let i = 0; i < 6; i++) { glow(g, x + 11 + i * 3, y - 56 - i * 11, 11 + i * 2.2, '200,200,205', 0.28 - i * 0.03); }
  glow(g, x - 30, y + 2, 34, '255,140,40', 0.55); g.fillStyle = '#1a1612'; g.beginPath(); g.ellipse(x - 30, y + 4, 17, 11, 0, 0, 7); g.fill(); g.fillStyle = '#e8741a'; g.beginPath(); g.ellipse(x - 30, y + 5, 12, 7, 0, 0, 7); g.fill(); g.fillStyle = '#ffd27a'; g.beginPath(); g.ellipse(x - 30, y + 6, 6, 3.4, 0, 0, 7); g.fill();
  softShadow(g, x + 44, y + 40, 14, 5, 0.35); g.fillStyle = '#2c2c32'; g.fillRect(x + 34, y + 28, 22, 8); g.fillRect(x + 40, y + 36, 10, 10); g.strokeStyle = '#000'; g.lineWidth = 0.8; g.strokeRect(x + 34, y + 28, 22, 8);
  g.strokeStyle = '#6a4a1e'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + 28, y + 22); g.lineTo(x + 38, y + 28); g.stroke(); g.fillStyle = '#8a8a90'; g.fillRect(x + 22, y + 18, 8, 5);
  for (const [sx, sy, c] of [[x + 66, y + 38, '#a8281f'], [x + 78, y + 44, '#a8281f'], [x + 72, y + 52, '#8a8a90']]) { g.fillStyle = c; g.beginPath(); g.ellipse(sx, sy, 7, 11, 0.2, 0, 7); g.fill(); g.strokeStyle = '#2a0a08'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#cfc9a8'; g.beginPath(); g.arc(sx, sy, 2.2, 0, 7); g.fill(); }
  figure(g, 'aux_inf', x + 24, y + 48, 2.4, 11, 1);
}
function hospital(g, x, y) {
  tent(g, x - 68, y + 38, 120, 72, 56, '#f2ead6', '#cfc3a4');
  post(g, x + 66, y + 40, 62, 3, '#6a4a1e'); g.strokeStyle = '#4a7a3a'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(x + 66, y - 8); g.bezierCurveTo(x + 76, y - 14, x + 56, y - 20, x + 66, y - 26); g.bezierCurveTo(x + 76, y - 32, x + 56, y - 38, x + 66, y - 44); g.stroke(); g.fillStyle = '#e0c060'; g.beginPath(); g.arc(x + 66, y - 48, 3.2, 0, 7); g.fill();
  for (const [hx, hy, c] of [[x - 70, y + 48, '#b59a62'], [x - 56, y + 52, '#7a9a5a']]) { g.fillStyle = c; g.beginPath(); g.moveTo(hx, hy); g.quadraticCurveTo(hx - 4, hy - 9, hx + 4, hy - 12); g.quadraticCurveTo(hx + 12, hy - 8, hx + 8, hy); g.closePath(); g.fill(); g.strokeStyle = '#3a2a14'; g.lineWidth = 0.8; g.stroke(); }
  g.fillStyle = '#e8e0cc'; g.fillRect(x + 20, y + 40, 22, 9); g.strokeStyle = '#7a6a48'; g.strokeRect(x + 20, y + 40, 22, 9);
}
function hall(g, x, y) {
  softShadow(g, x + 6, y + 46, 70, 12, 0.35);
  g.fillStyle = lin(g, x - 60, 0, x + 60, 0, [[0, '#b8946a'], [0.5, '#9a7a4a'], [1, '#6a4e2c']]); g.beginPath(); g.moveTo(x - 58, y + 44); g.lineTo(x - 58, y + 6); g.quadraticCurveTo(x, y - 8, x + 58, y + 6); g.lineTo(x + 58, y + 44); g.quadraticCurveTo(x, y + 58, x - 58, y + 44); g.fill(); g.strokeStyle = '#3a2a14'; g.lineWidth = 1.2; g.stroke();
  g.strokeStyle = 'rgba(50,30,10,0.4)'; g.lineWidth = 0.8; for (let px = x - 52; px < x + 58; px += 8) { g.beginPath(); g.moveTo(px, y + 8); g.lineTo(px, y + 50); g.stroke(); }
  poly(g, [[x - 66, y + 8], [x, y - 52], [x + 66, y + 8], [x, y + 16]], lin(g, x - 66, y - 52, x + 66, y + 16, [[0, '#d8c068'], [1, '#a2863a']]), '#4a3a14', 1.3);
  poly(g, [[x, y - 52], [x + 66, y + 8], [x, y + 16]], 'rgba(60,40,8,0.32)', null);
  g.strokeStyle = 'rgba(80,60,10,0.45)'; g.lineWidth = 0.9; for (let i = 1; i < 7; i++) { g.beginPath(); g.moveTo(x - 66 + i * 4, y + 8 - i * 8.6); g.quadraticCurveTo(x, y + 16 - i * 8.2, x + 66 - i * 4, y + 8 - i * 8.6); g.stroke(); }
  g.fillStyle = '#3a2410'; g.beginPath(); g.ellipse(x, y + 34, 13, 17, 0, Math.PI, 0); g.rect(x - 13, y + 34, 26, 11); g.fill();
  for (const [sx, c] of [[x - 38, '#9a2a22'], [x + 38, '#2f6fa8']]) { g.fillStyle = c; g.beginPath(); g.ellipse(sx, y + 28, 6, 12, 0, 0, 7); g.fill(); g.strokeStyle = '#1a0e04'; g.lineWidth = 1; g.stroke(); g.fillStyle = '#d8c46a'; g.beginPath(); g.arc(sx, y + 28, 2, 0, 7); g.fill(); }
  post(g, x + 78, y + 46, 66, 2.6, '#6a4a1e'); poly(g, [[x + 78, y - 22], [x + 92, y - 28], [x + 96, y - 20], [x + 88, y - 16]], '#d8c46a', '#4a3a14', 0.9);   // the carnyx
  for (let i = 0; i < 9; i++) post(g, x - 70 + i * 8, y + 52, 9, 2, '#8a6a3a');                                                                                     // wicker fence
  figure(g, 'warband', x - 52, y + 56, -0.3, 11, 1); figure(g, 'warband', x + 58, y + 54, 3.4, 11, 0);
}
function plot(g, x, y) {      // a surveyed, unbuilt plot: four stakes joined by a cord
  g.strokeStyle = 'rgba(232,195,106,0.55)'; g.lineWidth = 1.3; g.setLineDash([5, 5]); g.strokeRect(x - 78, y - 46, 156, 100); g.setLineDash([]);
  for (const [px, py] of [[x - 78, y - 46], [x + 78, y - 46], [x - 78, y + 54], [x + 78, y + 54]]) post(g, px, py, 14, 3, '#8a6a3a');
}
function praetorium(g) {
  tent(g, 400, 186, 200, 100, 70, '#b53a30', '#7a2018', { flag: null });
  g.fillStyle = '#e0bb55'; g.fillRect(397, 184, 206, 3);
  poly(g, [[480, 176], [500, 140], [520, 176]], '#2a1c10', null);
  standard(g, 428, 196, 40); standard(g, 572, 196, 40); g.save(); g.translate(500, 80); g.restore();
  post(g, 500, 96, 40, 2.6, '#4a3418'); poly(g, [[491, 54], [509, 54], [506, 62], [494, 62]], '#e0bb55', '#2a1c10', 0.8);     // the aquila above the tent
  figure(g, 'legionary', 476, 206, 1.57, 12, 0); figure(g, 'legionary', 524, 206, 1.57, 12, 2);
}
function tentRows(g) {                                      // more of the army under canvas: contubernia in rows, on the quiet edges of the camp
  const col = ['#d4bd88', '#dac38e', '#d0b982'], dk = ['#a78f5a', '#ad9560', '#a48d58'];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) tent(g, 58 + c * 44, 100 + r * 42, 34, 28, 26, col[(r + c) % 3], dk[(r + c) % 3]);
  for (let r = 0; r < 4; r++) tent(g, 914, 84 + r * 44, 32, 28, 26, col[r % 3], dk[r % 3]);
  for (let r = 0; r < 5; r++) tent(g, 914, 346 + r * 44, 32, 28, 26, col[(r + 1) % 3], dk[(r + 1) % 3]);
  for (let r = 0; r < 3; r++) tent(g, 58, 350 + r * 46, 30, 26, 24, col[r % 3], dk[r % 3]);
  fire(g, 124, 330); fire(g, 930, 320);
  for (let i = 0; i < 6; i++) figure(g, 'legionary', 560 + i * 16, 296 + (i % 2) * 8, 0, 11, i % 3);       // a century marching up the via principalis behind its standard
  standard(g, 548, 302, 30);
  for (const [x, y] of [[960, 560], [945, 575]]) sack(g, x, y);
}
function plaza(g) { standard(g, 500, 304, 36); for (const [x, y] of [[446, 338], [554, 262], [250, 262], [750, 338]]) fire(g, x, y); softShadow(g, 500, 310, 10, 3.5, 0.3);
  for (const [x, y, a, t, v] of [[470, 296, 0.6, 'legionary', 1], [532, 304, 3.3, 'legionary', 0], [380, 300, 0, 'legionary', 2], [640, 296, 3, 'aux_inf', 1], [210, 300, 0.2, 'legionary', 0], [800, 304, 3.1, 'equites', 0]]) figure(g, t, x, y, a, t === 'equites' ? 20 : 11, v); }

const SPOTS = { training: trainingGround, barracks, depot, officers: officersTent, forge, hospital, hall };

// ---- the painterly finish ----
function paintFinish(c, rnd) {
  const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0);       // back to pixel space (the scene was drawn scaled)
  const w = c.width, h = c.height, src = g.getImageData(0, 0, w, h).data;
  g.save(); g.globalAlpha = 0.2; g.lineCap = 'round';
  for (let y = 4; y < h; y += 5) for (let x = 4; x < w; x += 5) {
    const i = (Math.floor(y + (rnd() - 0.5) * 3) * w + Math.floor(x + (rnd() - 0.5) * 3)) * 4;
    g.strokeStyle = `rgb(${src[i]},${src[i + 1]},${src[i + 2]})`; g.lineWidth = 2 + rnd() * 2;
    const a = -0.55 + (rnd() - 0.5) * 0.7, l = 4 + rnd() * 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  g.restore();
  // paper-and-canvas grain, warm sun from the upper left, and a soft vignette
  g.globalCompositeOperation = 'overlay'; for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 2); }
  g.globalCompositeOperation = 'soft-light'; g.fillStyle = lin(g, 0, 0, w, h, [[0, 'rgba(255,226,150,0.8)'], [0.5, 'rgba(255,255,255,0.1)'], [1, 'rgba(40,30,90,0.3)']]); g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'source-over'; const vg = g.createRadialGradient(w / 2, h / 2, h * 0.5, w / 2, h / 2, w * 0.72); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,0,0.5)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
}

// The painting as a data URL, for the buildings that are built so far. Cached.
// The painted camp (assets/art/camp.jpg, listed in the manifest as camp.main) if there is one, else null.
export const campPainting = () => CAMP_PAINTING || (hasRealArt('camp', 'main') ? artSrc('camp', 'main') : null);
export function campArt(unlockedIds, allIds) {
  if (campPainting()) return campPainting();
  const key = [...unlockedIds].sort().join(',');
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = W * R; c.height = H * R;
  const g = c.getContext('2d'); g.scale(R, R); g.lineJoin = 'round';
  const rnd = rng(58);
  ground(g, rnd); palisade(g);
  // build back to front so that nearer things overlap farther ones
  const spots = [{ id: 'praetorium', y: 190 }, ...allIds.map(b => ({ id: b.id, y: b.y, x: b.x }))].sort((a, b) => a.y - b.y);
  for (const s of spots) { if (s.id === 'praetorium') praetorium(g); else if (unlockedIds.includes(s.id)) { g.save(); g.translate(s.x, s.y); g.scale(1.22, 1.22); g.translate(-s.x, -s.y); SPOTS[s.id](g, s.x, s.y, rnd); g.restore(); } else plot(g, s.x, s.y); }
  tentRows(g); plaza(g); southWall(g); gate(g);
  tower(g, 30, 42); tower(g, 970, 42); tower(g, 30, H - 26); tower(g, 970, H - 26);
  paintFinish(c, rnd);
  const url = c.toDataURL('image/jpeg', 0.95); cache.set(key, url); return url;
}
