// Top-down soldier sprites, painted once per unit type and variant onto small canvases and then stamped for every man on the field.
// Every figure faces +x (right) and is seen from directly above. The kit follows what we know of Caesar's armies in Gaul, 58 BC:
//
//  Roman legionary - bronze Montefortino helmet (round crown, central knob, broad neck guard; no crest for the ordinary soldier), mail shirt
//    (lorica hamata) with the doubled shoulder cape, red wool tunic sleeves, the curved oblong scutum with its spindle boss and iron rim,
//    the pilum in the hand until it is thrown and then the short gladius. NOT the segmented armour (lorica segmentata) of a century later.
//  Gaul - bareheaded with long, lime-stiffened hair for the common warrior; woollen tunic in checks and stripes; the long oval La Tene shield
//    with a spindle rib and boss (the round shield is British); the long iron sword or a spear. Nobles: mail, bronze helmet, gold torc.
//    No blue body-paint: woad is a British story, and the blue on the field is only the team colour of the dyed cloth.
//  Allied Gallic foot and horse in Roman pay - Gallic dress and shield, with a mail shirt and iron cap.
//  Balearic slinger - short tunic, headband, a sling whirling at the hand, stones in a pouch.  Cretan archer - bronze cap, composite bow, quiver.
//  Cavalry - small, sturdy horses; the rider in mail with a spear and an oval or round shield.
//
// `variant` (0-2) changes hair, skin and cloth so a formation is not a clone army. `armed` is false for a legionary who has thrown his pila.
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
const BRONZE = '#b88a3a', IRON = '#9aa2ab', MAIL = '#858d96', WOOD = '#8a6a3a', OUT = '#1d1710';

function ell(g, x, y, rx, ry, fill, stroke, lw = 1.4, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function rect(g, x, y, w, h, fill, stroke, lw = 1.4, r = 2) { g.beginPath(); g.roundRect(x, y, w, h, r); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function line(g, x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function shadow(g, big) { ell(g, C + 3, C + 4, big ? 26 : 19, big ? 15 : 14, 'rgba(0,0,0,0.26)'); }
function arm(g, x, y, ang, len, col) { g.save(); g.translate(x, y); g.rotate(ang); ell(g, len / 2, 0, len / 2 + 1, 3.3, col, OUT, 1.1); g.restore(); }
// riveted mail: a body ellipse with a fine ring texture clipped inside it
function mailBody(g, cx, cy, rx, ry, base = MAIL) {
  ell(g, cx, cy, rx, ry, base, OUT, 1.3);
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx - 0.6, ry - 0.6, 0, 0, 7); g.clip(); g.strokeStyle = 'rgba(40,46,54,0.28)'; g.lineWidth = 0.7;
  for (let i = -ry; i < ry; i += 3) { g.beginPath(); g.moveTo(cx - rx, cy + i); g.lineTo(cx + rx, cy + i + 2); g.stroke(); }
  for (let i = -rx; i < rx; i += 3) { g.beginPath(); g.moveTo(cx + i, cy - ry); g.lineTo(cx + i + 2, cy + ry); g.stroke(); }
  g.restore();
}
// a long oval Celtic shield seen from above: board, spindle rib, boss, painted border
function longShield(g, cx, cy, w, h, col, trim) {
  rect(g, cx - w / 2, cy - h / 2, w, h, col, OUT, 1.7, w / 2);
  g.save(); g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, w / 2); g.clip();
  line(g, cx, cy - h / 2, cx, cy + h / 2, shade(trim, 0.8), 2.4);                                    // the spindle rib
  line(g, cx - w / 2 + 2, cy - h / 2 + 3, cx - w / 2 + 2, cy + h / 2 - 3, shade(trim, 0.7), 1); line(g, cx + w / 2 - 2, cy - h / 2 + 3, cx + w / 2 - 2, cy + h / 2 - 3, shade(trim, 0.7), 1);
  g.restore();
  ell(g, cx, cy, 3.4, 3.4, '#cfc9a8', OUT, 1);                                                      // iron boss
}

function roman(g, t, v, armed) {
  const red = shade('#a8281f', 0.92 + v * 0.08), skin = SKIN[v];
  shadow(g);
  arm(g, 36, 15, -0.5, 10, red);                                                                    // shield arm (red tunic sleeve)
  mailBody(g, 31, C, 10.5, 19.5);                                                                   // lorica hamata
  mailBody(g, 29.5, 14.5, 6.6, 4.6, shade(MAIL, 1.12)); mailBody(g, 29.5, 49.5, 6.6, 4.6, shade(MAIL, 1.12));   // the doubled shoulder cape
  // the right arm: sleeve, forearm and the weapon
  arm(g, 35, 48, 0.28, 8, red); arm(g, 41, 50.5, 0.22, 9, skin);
  if (armed) {                                                                                      // pilum: long wooden shaft, iron shank and a small pyramidal head
    line(g, 30, 53, 52, 49, '#7a5a2e', 2.6); line(g, 52, 49, 63, 47, '#aab2ba', 1.5); g.fillStyle = '#c8ced4'; g.beginPath(); g.moveTo(64, 46.6); g.lineTo(60.5, 44.8); g.lineTo(60.8, 49.2); g.fill();
  } else { line(g, 46, 53, 59, 54, '#e4e8ec', 3); line(g, 46, 53, 59, 54, OUT, 0.8); line(g, 45, 52, 46, 56, '#6a4a1e', 2.2); }   // gladius
  // scutum: curved oblong, painted, iron-rimmed, with a spindle boss
  rect(g, 41, 11.5, 12, 36, shade(t.color, 0.95), '#6b727a', 2.2, 5.5);
  rect(g, 43.2, 13.7, 7.6, 31.6, null, shade(t.trim, 0.85), 1, 3.5);
  rect(g, 46, 17, 2.8, 23.5, '#aab2ba', OUT, 0.9, 1.4); ell(g, 47.4, 29, 3.8, 3.8, '#d4d8dd', OUT, 1);
  // helmet: bronze Montefortino, round crown with a central knob, wide neck guard, cheek-piece edges
  ell(g, 24.2, C, 5.8, 8.4, shade(BRONZE, 0.82), OUT, 1.1);
  ell(g, 31, C, 8.3, 8.3, BRONZE, OUT, 1.3); ell(g, 31, 24.6, 4.2, 2.4, shade(BRONZE, 0.85), null); ell(g, 31, 39.4, 4.2, 2.4, shade(BRONZE, 0.85), null);
  ell(g, 31, C, 5.2, 5.2, shade(BRONZE, 1.12)); ell(g, 31, C, 2.2, 2.2, shade(BRONZE, 0.7), OUT, 0.7);
}

function aux(g, t, v) {
  const tun = shade(t.color, 0.95 + v * 0.06), skin = SKIN[v];
  shadow(g);
  arm(g, 36, 15, -0.4, 10, tun);
  mailBody(g, 31, C, 10, 19);
  g.save(); g.beginPath(); g.ellipse(31, C, 10, 19, 0, 0, 7); g.clip(); line(g, 30, 13, 30, 51, shade(t.color, 0.7), 1); g.restore();       // tunic showing at the seams
  arm(g, 36, 47, 0.1, 9, tun); arm(g, 42, 48, 0.05, 8, skin);
  line(g, 36, 49, 62, 43, WOOD, 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(64, 42.6); g.lineTo(58.5, 39.8); g.lineTo(59.5, 45.6); g.fill();   // spear
  longShield(g, 45.5, 25, 11, 34, shade(t.color, 0.9), t.trim);
  ell(g, 31, C, 7.9, 7.9, shade(IRON, 1.0), OUT, 1.3); ell(g, 31, C, 3.2, 3.2, shade(IRON, 1.25)); ell(g, 24.6, C, 4.2, 6.6, shade(IRON, 0.8), OUT, 1);   // iron cap with neck guard
}

function slinger(g, t, v) {
  const skin = SKIN[v], tun = shade(t.color, 0.95 + v * 0.05);
  shadow(g);
  ell(g, 31, C, 9, 17, tun, OUT);
  rect(g, 27, 45, 8, 5, '#6b4a2a', OUT, 1, 2); ell(g, 31, 47.5, 1.4, 1.4, '#9a9a9a');                                 // pouch of stones
  line(g, 25, 30, 25, 34, '#e6dcc0', 0.1);
  arm(g, 33, 45, -0.15, 16, skin); line(g, 49, 44, 58, 54, '#c9b27a', 1.4); line(g, 49, 44, 58, 36, '#c9b27a', 1.4); ell(g, 58, 45, 6, 9, null, 'rgba(120,100,60,0.5)', 0.9);   // the sling, whirling
  ell(g, 59, 45, 2.2, 2.2, '#8a8a8a', OUT, 0.8);
  arm(g, 34, 17, 0.4, 10, skin);
  ell(g, 31, C, 7.4, 7.4, HAIR[v], OUT, 1.2);                                                                         // bareheaded, with a headband
  g.strokeStyle = '#e8e0c8'; g.lineWidth = 2; g.beginPath(); g.arc(31, C, 6.2, 0.5, 5.8); g.stroke();
}

function archer(g, t, v) {
  const skin = SKIN[v];
  shadow(g);
  ell(g, 31, C, 9.5, 17.5, shade(t.color, 0.92 + v * 0.06), OUT);
  rect(g, 18, 36, 9, 6, '#6b4a2a', OUT, 1, 1.5); line(g, 18, 39, 26, 39, '#d8c89a', 1);                               // quiver at the hip
  arm(g, 36, 17, -0.1, 18, skin); arm(g, 34, 46, 0.15, 12, skin);
  g.strokeStyle = '#4a2f14'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(44, 12); g.quadraticCurveTo(54, 24, 48, C); g.quadraticCurveTo(54, 40, 44, 52); g.stroke();   // composite bow, recurved tips
  line(g, 44, 12, 44, 52, '#e8e0c8', 0.8); line(g, 38, C, 58, C, '#d8c89a', 1.4);
  ell(g, 31, C, 7.4, 7.4, shade(BRONZE, 0.95), OUT, 1.2); ell(g, 31, C, 3, 3, shade(BRONZE, 1.2));                      // bronze cap
}

function gaul(g, t, v, kind) {
  const hair = HAIR[v], skin = SKIN[v];
  const tun = kind === 'elite' ? '#223f78' : kind === 'skirm' ? '#2f8a76' : ['#2f6fa8', '#3b5f94', '#2a7a98'][v];
  shadow(g);
  if (kind === 'elite') {
    ell(g, 24, C, 9, 18.5, '#1d3566', OUT, 1.2);                                                                         // sagum cloak over the shoulders
    mailBody(g, 31, C, 10.5, 19.5); mailBody(g, 29.5, 14.5, 6.4, 4.4, shade(MAIL, 1.12)); mailBody(g, 29.5, 49.5, 6.4, 4.4, shade(MAIL, 1.12));
  } else {
    ell(g, 31, C, 10, 19, shade(tun, 0.92 + v * 0.06), OUT);                                                              // woollen tunic, checked
    g.save(); g.beginPath(); g.ellipse(31, C, 10, 19, 0, 0, 7); g.clip();
    for (const x of [26, 31, 36]) line(g, x, 13, x, 51, 'rgba(255,255,255,0.2)', 1.5);
    for (const y of [20, 27, 34, 41]) line(g, 21, y, 41, y, 'rgba(255,255,255,0.14)', 1.3);
    g.restore();
  }
  if (kind === 'skirm') {
    ell(g, 21, 40, 5.5, 8, '#b59a62', OUT, 1.2);                                                                         // a small wicker-and-hide shield slung on the back
    arm(g, 36, 17, -0.5, 14, skin); line(g, 36, 18, 63, 24, WOOD, 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(64, 24.4); g.lineTo(57.5, 21); g.lineTo(58.6, 27.6); g.fill();
    arm(g, 36, 46, 0.2, 12, skin); line(g, 40, 50, 56, 53, WOOD, 1.6); line(g, 40, 47, 56, 49, WOOD, 1.6);               // spare javelins
  } else {
    arm(g, 36, 47, 0.2, 9, kind === 'elite' ? '#1d3566' : tun); arm(g, 42, 49, 0.15, 8, skin);
    if (kind === 'warband' && v === 2) { line(g, 38, 52, 63, 47, WOOD, 2.2); g.fillStyle = '#cfd4da'; g.beginPath(); g.moveTo(64, 46.6); g.lineTo(58, 43.5); g.lineTo(58.6, 50); g.fill(); }   // some carry a spear
    else { line(g, 47, 51, 64, 53, '#cfd4da', 3); line(g, 47, 51, 64, 53, OUT, 0.8); line(g, 46, 49.5, 47, 54, '#b98a3a', 2.2); }                         // long iron sword
    longShield(g, 45, 24, 11.5, 36, shade(t.color, 0.95), kind === 'elite' ? '#d8c46a' : t.trim);
    arm(g, 36, 15, -0.45, 9, kind === 'elite' ? '#1d3566' : tun);
  }
  if (kind === 'elite') {
    ell(g, 24.6, C, 5.2, 8, shade(BRONZE, 0.8), OUT, 1);
    ell(g, 31, C, 8.2, 8.2, BRONZE, OUT, 1.3); ell(g, 31, C, 4.6, 4.6, shade(BRONZE, 1.15)); line(g, 31, C - 8, 31, C + 8, shade(BRONZE, 0.7), 1);   // bronze helmet with a ridge
    line(g, 27, C - 7.5, 22, C - 14, '#e6dcc0', 2); line(g, 27, C + 7.5, 22, C + 14, '#e6dcc0', 2);                                               // feathered wings
    g.strokeStyle = '#d8c46a'; g.lineWidth = 2.2; g.beginPath(); g.arc(31, C, 10.4, 1.9, 4.3); g.stroke();                                         // gold torc
  } else {
    ell(g, 31, C, 7.8, 8, hair, OUT, 1.3);                                                                                  // bareheaded: long, lime-stiffened hair swept back
    for (const a of [-1, -0.5, 0, 0.5, 1]) line(g, 26, C + a * 5.5, 19, C + a * 8.5, shade(hair, 1.15), 2);
    ell(g, 33, C, 3.8, 4.6, shade(hair, 0.85));
  }
}

function horseman(g, t, v, gaulish, noble) {
  const coat = ['#6b4a2e', '#8a5a34', '#4f3a28'][v], cloak = shade(t.color, 0.92);
  shadow(g, true);
  ell(g, 29, C, 22, 10, coat, OUT, 1.5);                                                                                // a small, sturdy horse seen from above
  ell(g, 52, C, 8.5, 4.8, shade(coat, 1.08), OUT, 1.3); ell(g, 59, C, 3.2, 3.2, shade(coat, 0.9), OUT, 1);
  line(g, 46, C, 33, C, shade(coat, 0.55), 2.2);
  for (const a of [-0.35, 0, 0.35]) line(g, 7, C, 1, C + a * 14, shade(coat, 0.5), 2);
  ell(g, 28, C, 7, 11.5, gaulish ? cloak : '#a8281f', OUT, 1.2);                                                        // rider's cloak over a mail shirt
  mailBody(g, 29.5, C, 5.4, 9.8);
  if (gaulish) longShield(g, 33, 20.5, 6.5, 15, shade(t.color, 0.95), t.trim); else { ell(g, 33, 22, 7, 7, shade(t.color, 0.95), OUT, 1.6); ell(g, 33, 22, 2.4, 2.4, '#d8dbe0', OUT, 0.8); }
  line(g, 26, 42, 62, 38, WOOD, 2.2); g.fillStyle = '#d7dbe0'; g.beginPath(); g.moveTo(64, 37.6); g.lineTo(58.5, 34.8); g.lineTo(58.5, 40.6); g.fill();
  ell(g, 30, C, 6.4, 6.4, gaulish && !noble ? HAIR[v] : shade(gaulish ? IRON : BRONZE, 1.0), OUT, 1.2);                   // helmet (or bare head)
  if (gaulish && noble) { g.strokeStyle = '#d8c46a'; g.lineWidth = 1.8; g.beginPath(); g.arc(30, C, 8.2, 1.9, 4.3); g.stroke(); }
}

const PAINT = {
  legionary: (g, t, v, a) => roman(g, t, v, a), aux_inf: (g, t, v) => aux(g, t, v), slinger: (g, t, v) => slinger(g, t, v), archer: (g, t, v) => archer(g, t, v),
  warband: (g, t, v) => gaul(g, t, v, 'warband'), gaul_elite: (g, t, v) => gaul(g, t, v, 'elite'), gaul_skirm: (g, t, v) => gaul(g, t, v, 'skirm'),
  equites: (g, t, v) => horseman(g, t, v, false, true), aux_cav: (g, t, v) => horseman(g, t, v, true, false), gaul_cav: (g, t, v) => horseman(g, t, v, true, true)
};

// A 64x64 canvas of one soldier (or horseman) of this type, facing right. Cached.
export function soldierSprite(typeKey, variant = 0, armed = true) {
  const key = typeKey + variant + (armed ? 'a' : 'u'); if (cache.has(key)) return cache.get(key);
  const t = UNIT_TYPES[typeKey], c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d'); g.lineJoin = 'round'; g.lineCap = 'round';
  (PAINT[typeKey] || PAINT.legionary)(g, t, variant % 3, armed);
  cache.set(key, c); return c;
}
export const SPRITE_SIZE = S;
