// Top-down soldier sprites, painted once per unit type and variant onto small canvases and then stamped for every man on the field.
// Every figure faces +x (right) and is seen from directly above: helmet or hair, shoulders, arms, shield and weapon. Horsemen show the
// horse's back, neck and head with the rider on top. `variant` (0-2) changes hair, skin and cloth shades so a formation is not a clone army.
import { UNIT_TYPES } from './data.js';

const S = 64, C = S / 2;
const cache = new Map();

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return f >= 1 ? `rgb(${clamp8(r + (255 - r) * (f - 1))},${clamp8(g + (255 - g) * (f - 1))},${clamp8(b + (255 - b) * (f - 1))})` : `rgb(${clamp8(r * f)},${clamp8(g * f)},${clamp8(b * f)})`;
}
const SKIN = ['#e0b48c', '#d49f78', '#eac39d'];
const HAIR = ['#c9a45a', '#7a4a26', '#b4572b'];            // blond, brown, red

function ell(g, x, y, rx, ry, fill, stroke, lw = 1.4, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function rect(g, x, y, w, h, fill, stroke, lw = 1.4, r = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function line(g, x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
const OUT = '#1d1710';

// ---- the pieces ----
function shadow(g, big) { ell(g, C + 3, C + 4, big ? 26 : 19, big ? 15 : 14, 'rgba(0,0,0,0.26)'); }
function arm(g, x, y, ang, len, col) { g.save(); g.translate(x, y); g.rotate(ang); ell(g, len / 2, 0, len / 2 + 1, 3.4, col, OUT, 1.1); g.restore(); }

function roman(g, t, v) {
  const red = shade(t.color, 0.92 + v * 0.07), steel = shade('#9aa4ae', 0.95 + v * 0.05);
  shadow(g);
  ell(g, 31, C, 10.5, 20, red, OUT);                                        // tunic over the shoulders
  ell(g, 31, C, 8.5, 17.5, steel, OUT, 1.2);                                // segmented cuirass
  for (const x of [26.5, 30.5, 34.5]) { g.save(); g.beginPath(); g.ellipse(31, C, 8.5, 17.5, 0, 0, 7); g.clip(); line(g, x, 15, x, 49, shade('#5f6872', 1), 1); g.restore(); }
  ell(g, 29.5, 14.5, 6.5, 4.6, shade('#aab3bd', 1), OUT, 1.1); ell(g, 29.5, 49.5, 6.5, 4.6, shade('#aab3bd', 1), OUT, 1.1);   // shoulder guards
  const skin = SKIN[v];
  arm(g, 36, 46, 0.3, 14, skin); line(g, 50, 50, 62, 52, '#e4e8ec', 3.2); line(g, 50, 50, 62, 52, OUT, 0.8);    // sword arm and gladius
  rect(g, 41, 11, 11, 36, shade(t.color, 0.95), OUT, 1.6, 4);                                                      // scutum held across the front
  rect(g, 43.2, 13.2, 6.6, 31.6, null, shade(t.trim, 0.9), 1.1, 3);
  ell(g, 46.5, 29, 3.9, 3.9, '#d8dbe0', OUT, 1.1);                                                                  // boss
  line(g, 46.5, 15, 46.5, 24, shade(t.trim, 0.9), 1.6); line(g, 46.5, 34, 46.5, 43, shade(t.trim, 0.9), 1.6);
  arm(g, 36, 15, -0.5, 11, skin);
  ell(g, 31, C, 8.2, 8.2, steel, OUT, 1.3);                                                                         // helmet
  ell(g, 24.5, C, 5.2, 7, shade('#7d8791', 1), OUT, 1.0);                                                           // neck guard
  rect(g, 22.5, C - 2.1, 17, 4.2, '#b3261e', OUT, 1.0, 1.5);                                                        // crest ridge, front to back
}

function aux(g, t, v) {
  const tun = shade(t.color, 0.95 + v * 0.06);
  shadow(g);
  ell(g, 31, C, 10, 19.5, tun, OUT);
  ell(g, 31, C, 8, 16, '#8b949e', OUT, 1.1);                                // mail
  for (const y of [22, 27, 32, 37, 42]) line(g, 25, y, 37, y, 'rgba(60,66,74,0.5)', 0.8);
  const skin = SKIN[v];
  arm(g, 37, 47, 0.1, 14, skin); line(g, 50, 32, 63, 40, '#caa66a', 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(63, 40); g.lineTo(58, 36); g.lineTo(60, 43); g.fill();   // spear
  ell(g, 45, 24, 7.5, 16, shade(t.color, 0.9), OUT, 1.6);                                                          // long oval shield
  ell(g, 45, 24, 3.2, 3.2, '#d8dbe0', OUT, 1);
  arm(g, 36, 15, -0.4, 10, skin);
  ell(g, 31, C, 7.6, 7.6, '#8b949e', OUT, 1.2); ell(g, 31, C, 3.4, 3.4, '#b6bdc5');
}

function slinger(g, t, v) {
  shadow(g);
  ell(g, 31, C, 9, 17, shade(t.color, 0.95 + v * 0.05), OUT);
  ell(g, 31, 47.5, 4, 3, '#6b4a2a', OUT, 1);                                // stone pouch
  const skin = SKIN[v];
  arm(g, 33, 45, -0.15, 16, skin); line(g, 49, 44, 58, 54, '#c9b27a', 1.4); line(g, 49, 44, 58, 36, '#c9b27a', 1.4); ell(g, 58, 45, 6, 9, null, 'rgba(120,100,60,0.5)', 0.9);   // whirling sling
  ell(g, 59, 45, 2.2, 2.2, '#8a8a8a', OUT, 0.8);
  arm(g, 34, 17, 0.4, 10, skin);
  ell(g, 31, C, 7.4, 7.4, shade('#8a5a2e', 1), OUT, 1.2);                   // leather cap
  ell(g, 29.5, C, 4, 4, shade('#a8742f', 1));
}

function archer(g, t, v) {
  shadow(g);
  ell(g, 31, C, 9.5, 17.5, shade(t.color, 0.92 + v * 0.06), OUT);
  rect(g, 18, 34, 9, 6, '#6b4a2a', OUT, 1, 1.5); line(g, 18, 37, 26, 37, '#d8c89a', 1);                                   // quiver on the back
  const skin = SKIN[v];
  arm(g, 36, 17, -0.1, 18, skin); arm(g, 34, 46, 0.15, 12, skin);
  g.strokeStyle = '#5a3a1a'; g.lineWidth = 2.4; g.beginPath(); g.arc(44, C, 20, -1.15, 1.15); g.stroke();                 // bow
  line(g, 44 + 20 * Math.cos(-1.15), C + 20 * Math.sin(-1.15), 44 + 20 * Math.cos(1.15), C + 20 * Math.sin(1.15), '#e8e0c8', 0.8);
  line(g, 36, C, 58, C, '#d8c89a', 1.4);
  ell(g, 31, C, 7.6, 7.6, shade('#b98a3e', 1), OUT, 1.2); ell(g, 31, C, 3, 3, shade('#d8a84e', 1));                        // conical bronze helmet from above
}

function gaul(g, t, v, kind) {
  const tun = kind === 'elite' ? '#1f3f7c' : kind === 'skirm' ? '#2f8a76' : '#2f6fa8', hair = HAIR[v], skin = SKIN[v];
  shadow(g);
  if (kind === 'elite') { ell(g, 31, C, 10.5, 20, '#27478a', OUT); ell(g, 31, C, 8.5, 17.5, '#8b949e', OUT, 1.1); for (const y of [19, 24, 29, 34, 39, 44]) line(g, 24, y, 38, y, 'rgba(60,66,74,0.5)', 0.8); }
  else { ell(g, 31, C, 10, 19, shade(tun, 0.92 + v * 0.08), OUT); for (const x of [26, 31, 36]) { g.save(); g.beginPath(); g.ellipse(31, C, 10, 19, 0, 0, 7); g.clip(); line(g, x, 13, x, 51, 'rgba(255,255,255,0.18)', 1.6); g.restore(); } }
  if (kind === 'skirm') {
    ell(g, 21, 38, 8, 8, '#b9a06a', OUT, 1.2); ell(g, 21, 38, 3, 3, '#6b5a34');                                         // wicker shield on the back
    arm(g, 36, 17, -0.5, 14, skin); line(g, 36, 18, 63, 24, '#caa66a', 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(63, 24); g.lineTo(57, 21); g.lineTo(58, 27); g.fill();
    arm(g, 36, 46, 0.2, 12, skin); line(g, 40, 50, 55, 53, '#caa66a', 1.6); line(g, 40, 47, 55, 49, '#caa66a', 1.6);   // spare javelins
  } else {
    arm(g, 36, 47, 0.2, 14, skin); line(g, 49, 50, 63, 52, '#cfd4da', 3.4); line(g, 49, 50, 63, 52, OUT, 0.8);           // long sword
    ell(g, 44.5, 22, 12, 12, shade(t.color, 0.95), OUT, 1.8);                                                            // round shield
    ell(g, 44.5, 22, 7.5, 7.5, null, shade(t.trim, 0.9), 1.3); ell(g, 44.5, 22, 3.6, 3.6, '#d8c46a', OUT, 1);
    for (let a = 0; a < 6; a++) line(g, 44.5 + Math.cos(a * 1.047) * 4, 22 + Math.sin(a * 1.047) * 4, 44.5 + Math.cos(a * 1.047) * 10, 22 + Math.sin(a * 1.047) * 10, shade(t.trim, 0.85), 1);
    arm(g, 36, 17, -0.45, 10, skin);
  }
  ell(g, 31, C, 8, 8.2, kind === 'elite' ? '#c79a3e' : hair, OUT, 1.3);                                                // head: hair, or a bronze helmet
  if (kind === 'elite') { line(g, 27, C - 7, 21, C - 15, '#e8d48a', 2); line(g, 27, C + 7, 21, C + 15, '#e8d48a', 2); ell(g, 31, C, 3, 3, '#e8d48a'); }
  else { for (const a of [-0.9, 0, 0.9]) line(g, 27, C + a * 6, 21, C + a * 8, hair, 2.2); }                            // wild hair streaming behind
  g.strokeStyle = '#d8c46a'; g.lineWidth = 1.8; g.beginPath(); g.arc(31, C, 10.2, 1.9, 4.3); g.stroke();              // the torc at the neck
}

function horseman(g, t, v, gaulish) {
  const coat = ['#6b4a2e', '#8a5a34', '#4f3a28'][v], cloak = shade(t.color, 0.92);
  shadow(g, true);
  ell(g, 29, C, 24, 11, coat, OUT, 1.5);                                                                                // horse's body
  ell(g, 54, C, 9, 5.2, shade(coat, 1.08), OUT, 1.3); ell(g, 61, C, 3.2, 3.4, shade(coat, 0.9), OUT, 1);              // neck and head
  g.strokeStyle = shade(coat, 0.55); g.lineWidth = 2.2; g.lineCap = 'round'; g.beginPath(); g.moveTo(47, C); g.lineTo(32, C); g.stroke();   // mane
  for (const a of [-0.35, 0, 0.35]) line(g, 6, C, 0, C + a * 14, shade(coat, 0.5), 2);                                  // tail
  ell(g, 29, C, 7.5, 12.5, cloak, OUT, 1.2);                                                                            // rider's cloak and shoulders
  ell(g, 33, 24, 7, 7, shade(t.color, 1), OUT, 1.5); ell(g, 33, 24, 2.6, 2.6, '#d8dbe0', OUT, 0.8);                    // shield on the arm
  line(g, 26, 42, 62, 38, '#caa66a', 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(63, 38); g.lineTo(58, 35); g.lineTo(58, 41); g.fill();   // lance
  ell(g, 30, C, 6.6, 6.6, gaulish ? HAIR[v] : '#aab3bd', OUT, 1.2);
  if (!gaulish) rect(g, 24.5, C - 1.6, 12, 3.2, '#b3261e', OUT, 0.9, 1.2);
}

const PAINT = {
  legionary: (g, t, v) => roman(g, t, v), aux_inf: (g, t, v) => aux(g, t, v), slinger: (g, t, v) => slinger(g, t, v), archer: (g, t, v) => archer(g, t, v),
  warband: (g, t, v) => gaul(g, t, v, 'warband'), gaul_elite: (g, t, v) => gaul(g, t, v, 'elite'), gaul_skirm: (g, t, v) => gaul(g, t, v, 'skirm'),
  equites: (g, t, v) => horseman(g, t, v, false), aux_cav: (g, t, v) => horseman(g, t, v, true), gaul_cav: (g, t, v) => horseman(g, t, v, true)
};

// A 64x64 canvas of one soldier (or horseman) of this type, facing right. Cached.
export function soldierSprite(typeKey, variant = 0) {
  const key = typeKey + variant; if (cache.has(key)) return cache.get(key);
  const t = UNIT_TYPES[typeKey], c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  (PAINT[typeKey] || PAINT.legionary)(g, t, variant % 3);
  cache.set(key, c); return c;
}
export const SPRITE_SIZE = S;
