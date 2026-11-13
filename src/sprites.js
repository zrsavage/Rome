// Top-down soldier sprites, painted once per unit type and variant onto small canvases and then stamped for every man on the field.
// Every figure faces +x (right) and is seen from directly above, lit from the north-west. The kit follows what we know of Caesar's armies
// in Gaul, 58 BC:
//
//  Roman legionary - a bronze helmet of the Montefortino type (round crown, central knob, broad neck guard, cheek-pieces) or the smooth
//    Coolus; a feather plume only for a few; the mail shirt (lorica hamata) with its doubled, scalloped shoulder cape; red wool tunic
//    sleeves; the curved oblong scutum of planks covered in felt, bound at the rim, with a wooden spindle ridge and a bronze boss, painted with
//    a winged blazon; the pilum in the hand until it is thrown, then the short gladius; the sword hangs on the RIGHT hip.
//    NOT the segmented armour (lorica segmentata) of a century later.
//  Centurion - transverse crest across the helmet, the vine-stick (vitis).  Signifer - the wolf-skin over helmet and shoulders and the standard.
//  Gaul - bareheaded with long, lime-stiffened hair for the common warrior; woollen tunic in checks and stripes, a brooch at the shoulder; the
//    long oval La Tene shield of planks with a spindle rib, iron binding and painted curvilinear blazon (the round shield is British); the long
//    iron sword in a scabbard on the right hip, or a spear. Nobles: mail, bronze helmet with cheek-guards, gold torc.
//    No blue body-paint: woad is a British story; the blue on the field is only the team colour of dyed cloth.
//  Allied Gallic foot and horse in Roman pay - Gallic dress and shield, with a mail shirt and iron cap.
//  Balearic slinger - short tunic, headband (a sling wound round it), a second sling at the waist, the whirling sling and a pouch of stones.
//  Cretan archer - bronze cap, composite "Cupid's bow", quiver with fletched arrows.
//  Cavalry - small, sturdy horses; the four-horned saddle with no stirrups; bronze harness pendants; the rider in mail with a spear.
//  General - on a grey horse in the red paludamentum and a muscled bronze cuirass, under a transverse crest.
//
// `variant` (0-2) changes helmet, hair, skin and cloth so a formation is not a clone army. `armed` is false for a legionary who has thrown his pila.
import { UNIT_TYPES } from './data.js';

const S = 64, SCALE = 1.5, PX = S * SCALE, C = S / 2;     // drawn in a 64 grid, rendered at 96 px
const cache = new Map();

const clamp8 = (v) => Math.max(0, Math.min(255, Math.round(v)));
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return f >= 1 ? `rgb(${clamp8(r + (255 - r) * (f - 1))},${clamp8(g + (255 - g) * (f - 1))},${clamp8(b + (255 - b) * (f - 1))})` : `rgb(${clamp8(r * f)},${clamp8(g * f)},${clamp8(b * f)})`;
}
const SKIN = ['#e0b48c', '#d49f78', '#eac39d'];
const HAIR = ['#c9a45a', '#7a4a26', '#b4572b'];            // blond, brown, red
const BRONZE = '#b88a3a', IRON = '#9aa2ab', MAIL = '#858d96', WOOD = '#8a6a3a', OUT = 'rgba(24,18,10,0.92)';

// A little volume: a soft highlight at the north-west and a shadow at the south-east, clipped to the shape just filled.
function shine(g, pathFn, cx, cy, r, amt = 1) {
  g.save(); g.beginPath(); pathFn(); g.clip();
  const gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.05, cx, cy, r * 1.25);
  gr.addColorStop(0, `rgba(255,255,255,${0.30 * amt})`); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(0,0,0,${0.26 * amt})`);
  g.fillStyle = gr; g.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4); g.restore();
}
function ell(g, x, y, rx, ry, fill, stroke, lw = 1.4, rot = 0, sh = true) {
  const path = () => g.ellipse(x, y, rx, ry, rot, 0, 7);
  g.beginPath(); path(); if (fill) { g.fillStyle = fill; g.fill(); if (sh && Math.max(rx, ry) > 2.6) shine(g, path, x, y, Math.max(rx, ry)); }
  if (stroke) { g.beginPath(); path(); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function rect(g, x, y, w, h, fill, stroke, lw = 1.4, r = 2, sh = true) {
  const path = () => g.roundRect(x, y, w, h, r);
  g.beginPath(); path(); if (fill) { g.fillStyle = fill; g.fill(); if (sh) shine(g, path, x + w / 2, y + h / 2, Math.max(w, h) / 2); }
  if (stroke) { g.beginPath(); path(); g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); }
}
function line(g, x1, y1, x2, y2, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function poly(g, pts, fill, stroke, lw = 1) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } }
function shadow(g, big) { ell(g, C + 3, C + 4, big ? 26 : 19, big ? 15 : 14, 'rgba(0,0,0,0.26)', null, 0, 0, false); }
function arm(g, x, y, ang, len, col) { g.save(); g.translate(x, y); g.rotate(ang); ell(g, len / 2, 0, len / 2 + 1, 3.3, col, OUT, 1.1); g.restore(); }
// riveted mail: a body ellipse with a fine ring texture clipped inside it
function mailBody(g, cx, cy, rx, ry, base = MAIL) {
  ell(g, cx, cy, rx, ry, base, OUT, 1.3);
  g.save(); g.beginPath(); g.ellipse(cx, cy, rx - 0.6, ry - 0.6, 0, 0, 7); g.clip(); g.strokeStyle = 'rgba(30,36,44,0.30)'; g.lineWidth = 0.6;
  for (let i = -ry; i < ry; i += 2.4) { g.beginPath(); g.moveTo(cx - rx, cy + i); g.lineTo(cx + rx, cy + i + 1.6); g.stroke(); }
  for (let i = -rx; i < rx; i += 2.4) { g.beginPath(); g.moveTo(cx + i, cy - ry); g.lineTo(cx + i + 1.6, cy + ry); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 0.5; for (let i = -ry; i < ry; i += 2.4) { g.beginPath(); g.moveTo(cx - rx, cy + i + 1); g.lineTo(cx + rx, cy + i + 2.6); g.stroke(); }
  g.restore();
}
// the doubled shoulder cape of a mail shirt: a lighter layer with a scalloped lower edge
function shoulderCape(g, x, y, rx, ry) {
  mailBody(g, x, y, rx, ry, shade(MAIL, 1.14));
  g.strokeStyle = 'rgba(30,36,44,0.55)'; g.lineWidth = 0.8; g.beginPath(); for (let a = -0.7; a <= 0.71; a += 0.7) g.arc(x + rx * 0.85, y + a * ry * 0.9, 1.7, -1.5, 1.5); g.stroke();
}
// the scutum: planks under felt, iron/bronze-bound rim, wooden spindle ridge with a bronze boss, a painted winged blazon
function scutum(g, cx, cy, w, h, col) {
  rect(g, cx - w / 2, cy - h / 2, w, h, col, '#7c6a3c', 2.4, w / 2);
  g.save(); g.beginPath(); g.roundRect(cx - w / 2, cy - h / 2, w, h, w / 2); g.clip();
  g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(cx, cy - h / 2, w / 2, h);                                              // the curve of the board
  const wing = '#e8d9a0';
  for (const dy of [-1, 1]) { g.strokeStyle = wing; g.lineWidth = 0.9; g.beginPath(); g.moveTo(cx, cy + dy * 9); g.quadraticCurveTo(cx - w * 0.55, cy + dy * 11, cx - w * 0.45, cy + dy * 15.5); g.moveTo(cx, cy + dy * 9); g.quadraticCurveTo(cx + w * 0.55, cy + dy * 11, cx + w * 0.45, cy + dy * 15.5); g.stroke(); }
  g.restore();
  rect(g, cx - 1.3, cy - h / 2 + 3, 2.6, h - 6, '#6f4e2c', OUT, 0.7, 1.2);                                              // the wooden spine
  ell(g, cx, cy, 3.5, 3.5, '#c79a3c', OUT, 1); ell(g, cx, cy, 1.4, 1.4, '#f0d98a', null, 0, 0, false);                   // bronze boss
}
// the long oval Celtic shield: planks, iron binding, a long spindle rib and boss, a painted curvilinear blazon
function longShield(g, cx, cy, w, h, col, trim, horizontal = false) {
  g.save(); g.translate(cx, cy); if (horizontal) g.rotate(Math.PI / 2);
  const W = horizontal ? h : w, H = horizontal ? w : h;
  rect(g, -W / 2, -H / 2, W, H, col, '#5a5f66', 2, W / 2);
  g.save(); g.beginPath(); g.roundRect(-W / 2, -H / 2, W, H, W / 2); g.clip();
  g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 0.6; for (const x of [-W * 0.3, W * 0.3]) { g.beginPath(); g.moveTo(x, -H / 2); g.lineTo(x, H / 2); g.stroke(); }          // plank joins
  g.strokeStyle = shade(trim, 0.9); g.lineWidth = 1.1;                                                                                                                       // a swirling La Tene blazon
  for (const dy of [-1, 1]) { g.beginPath(); g.moveTo(-W * 0.38, dy * H * 0.14); g.bezierCurveTo(-W * 0.1, dy * H * 0.34, W * 0.28, dy * H * 0.12, W * 0.36, dy * H * 0.32); g.stroke(); ell(g, W * 0.3, dy * H * 0.3, 1.2, 1.2, shade(trim, 0.95), null, 0, 0, false); }
  g.restore();
  rect(g, -1.4, -H / 2 + 1.5, 2.8, H - 3, '#8b9096', OUT, 0.8, 1.4);                                                    // iron-sheathed spindle rib
  ell(g, 0, 0, 3.5, 3.5, '#cfc9a8', OUT, 1); ell(g, 0, 0, 1.3, 1.3, '#f4efd0', null, 0, 0, false);
  g.restore();
}
function gladiusScabbard(g, x, y) { rect(g, x, y, 11, 2.6, '#6a4a1e', OUT, 0.8, 1.2, false); rect(g, x + 8.5, y, 2.5, 2.6, '#c79a3c', OUT, 0.6, 1, false); }

function roman(g, t, v, armed) {
  const red = shade('#a8281f', 0.92 + v * 0.07), skin = SKIN[v], cloth = shade(t.color, 0.95);
  shadow(g);
  arm(g, 36, 15, -0.5, 10, red);                                                                    // shield arm: red wool sleeve
  mailBody(g, 31, C, 10.5, 19.5);                                                                   // lorica hamata
  g.save(); g.beginPath(); g.ellipse(31, C, 10.5, 19.5, 0, 0, 7); g.clip(); line(g, 31, 13, 31, 51, 'rgba(0,0,0,0.12)', 0.8); g.restore();
  shoulderCape(g, 29.5, 14.5, 6.8, 4.8); shoulderCape(g, 29.5, 49.5, 6.8, 4.8);                      // the doubled shoulder cape
  gladiusScabbard(g, 24, 52.5);                                                                     // the sword is worn on the right hip
  arm(g, 35, 48, 0.28, 8, red); arm(g, 41, 50.5, 0.22, 9, skin);
  if (armed) {                                                                                      // pilum: long wooden shaft, iron shank, a small pyramidal head
    line(g, 30, 53, 52, 49, '#7a5a2e', 2.6); line(g, 52, 49, 63, 47, '#aab2ba', 1.5); poly(g, [[64.4, 46.6], [60.4, 44.6], [60.8, 49.4]], '#d4d9de', OUT, 0.5);
    line(g, 50.5, 49.2, 53.4, 48.7, '#3a3a3a', 3.2);                                                // the lead weight at the join of shaft and shank
  } else { line(g, 47, 53, 60, 54.2, '#e4e8ec', 3); line(g, 47, 53, 60, 54.2, OUT, 0.8); line(g, 46, 52, 46.6, 56, '#6a4a1e', 2.2); }   // gladius hispaniensis
  scutum(g, 47, 29, 12.5, 37, shade(t.color, 0.95));
  // helmet: bronze Montefortino (variants 0 and 2) or smooth Coolus (variant 1); a feather plume on variant 2
  ell(g, 24.2, C, 5.8, 8.6, shade(BRONZE, 0.82), OUT, 1.1);                                         // neck guard
  ell(g, 31, C, 8.4, 8.4, BRONZE, OUT, 1.3); ell(g, 31, 24.6, 4.4, 2.5, shade(BRONZE, 0.82), null, 0, 0, false); ell(g, 31, 39.4, 4.4, 2.5, shade(BRONZE, 0.82), null, 0, 0, false);
  if (v === 1) { ell(g, 31, C, 5.2, 5.2, shade(BRONZE, 1.1)); line(g, 36.5, C - 5.5, 36.5, C + 5.5, shade(BRONZE, 0.7), 1); }
  else { ell(g, 31, C, 5.2, 5.2, shade(BRONZE, 1.12)); ell(g, 31, C, 2.3, 2.3, shade(BRONZE, 0.68), OUT, 0.7); }
  if (v === 2) { line(g, 30, C - 1.2, 22, C - 1.2, '#f0ecdc', 1.8); line(g, 30, C + 1.2, 22, C + 1.2, '#c0392b', 1.8); }
  for (const y of [C - 5.5, C + 5.5]) ell(g, 36, y, 0.7, 0.7, '#f2dfa0', null, 0, 0, false);       // rivets
}

function aux(g, t, v) {
  const tun = shade(t.color, 0.95 + v * 0.06), skin = SKIN[v];
  shadow(g);
  arm(g, 36, 15, -0.4, 10, tun);
  mailBody(g, 31, C, 10, 19);
  g.save(); g.beginPath(); g.ellipse(31, C, 10, 19, 0, 0, 7); g.clip(); line(g, 30, 13, 30, 51, shade(t.color, 0.7), 1); g.restore();
  shoulderCape(g, 29.5, 15, 6.2, 4.4); shoulderCape(g, 29.5, 49, 6.2, 4.4);
  arm(g, 36, 47, 0.1, 9, tun); arm(g, 42, 48, 0.05, 8, skin);
  line(g, 36, 49, 62, 43, WOOD, 2.2); poly(g, [[64.4, 42.6], [58.4, 39.6], [59.6, 45.8]], '#d7dbe0', OUT, 0.5);
  longShield(g, 45.5, 25, 11, 34, shade(t.color, 0.9), t.trim);
  ell(g, 24.6, C, 4.2, 6.6, shade(IRON, 0.8), OUT, 1);
  ell(g, 31, C, 7.9, 7.9, IRON, OUT, 1.3); ell(g, 31, C, 3.4, 3.4, shade(IRON, 1.25)); ell(g, 31, 24.8, 3.6, 2.2, shade(IRON, 0.8), null, 0, 0, false); ell(g, 31, 39.2, 3.6, 2.2, shade(IRON, 0.8), null, 0, 0, false);   // iron cap with cheek-pieces
}

function slinger(g, t, v) {
  const skin = SKIN[v], tun = shade(t.color, 0.95 + v * 0.05);
  shadow(g);
  ell(g, 31, C, 9, 17, tun, OUT);
  line(g, 24, 41, 38, 43.5, '#6b4a2a', 1.6);                                                                           // belt with a second sling coiled at the waist
  ell(g, 36, 44, 3, 3, null, '#c9b27a', 1, 0, false); ell(g, 36, 44, 1.6, 1.6, null, '#c9b27a', 0.8, 0, false);
  rect(g, 27, 45.5, 8, 5, '#6b4a2a', OUT, 1, 2); ell(g, 31, 47.8, 1.4, 1.4, '#9a9a9a', null, 0, 0, false);              // pouch of stones
  arm(g, 33, 45, -0.15, 16, skin); line(g, 49, 44, 58, 54, '#c9b27a', 1.4); line(g, 49, 44, 58, 36, '#c9b27a', 1.4); ell(g, 58, 45, 6, 9, null, 'rgba(120,100,60,0.5)', 0.9, 0, false);   // the sling, whirling
  ell(g, 59, 45, 2.2, 2.2, '#8a8a8a', OUT, 0.8, 0, false);
  arm(g, 34, 17, 0.4, 10, skin);
  ell(g, 31, C, 7.4, 7.4, HAIR[v], OUT, 1.2);                                                                         // bareheaded; the third sling wound round the head as a band
  g.strokeStyle = '#d8cfa8'; g.lineWidth = 2; g.beginPath(); g.arc(31, C, 6.2, 0.5, 5.8); g.stroke();
  g.strokeStyle = '#b3a678'; g.lineWidth = 0.7; g.beginPath(); g.arc(31, C, 6.2, 0.5, 5.8); g.stroke();
}

function archer(g, t, v) {
  const skin = SKIN[v];
  shadow(g);
  ell(g, 31, C, 9.5, 17.5, shade(t.color, 0.92 + v * 0.06), OUT);
  rect(g, 17, 35, 10, 7, '#6b4a2a', OUT, 1, 1.5);                                                                      // quiver at the hip, arrows fletched
  for (const dy of [-1.6, 0, 1.6]) { line(g, 16, 38.5 + dy, 13, 38.5 + dy * 1.4, '#e8e0c8', 1.2); }
  arm(g, 36, 17, -0.1, 18, skin); arm(g, 34, 46, 0.15, 12, skin);
  g.strokeStyle = '#4a2f14'; g.lineWidth = 2.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(42, 11); g.quadraticCurveTo(50, 18, 49, 24); g.quadraticCurveTo(47, 28, 49, C); g.quadraticCurveTo(47, 36, 49, 40); g.quadraticCurveTo(50, 46, 42, 53); g.stroke();   // composite "Cupid's bow"
  g.strokeStyle = '#7a5a30'; g.lineWidth = 0.9; g.stroke();
  line(g, 42, 11, 42, 53, '#e8e0c8', 0.8); line(g, 38, C, 58, C, '#d8c89a', 1.4); poly(g, [[60.5, C], [56.5, C - 1.7], [56.5, C + 1.7]], '#cfd4da', null);
  ell(g, 31, C, 7.4, 7.4, shade(BRONZE, 0.95), OUT, 1.2); ell(g, 31, C, 3, 3, shade(BRONZE, 1.2));                      // bronze cap
}

function gaul(g, t, v, kind) {
  const hair = HAIR[v], skin = SKIN[v];
  const tun = kind === 'elite' ? '#223f78' : kind === 'skirm' ? '#2f8a76' : ['#2f6fa8', '#3b5f94', '#2a7a98'][v];
  shadow(g);
  if (kind === 'elite') {
    ell(g, 24, C, 9, 18.5, '#1d3566', OUT, 1.2);                                                                         // sagum cloak over the shoulders
    mailBody(g, 31, C, 10.5, 19.5); shoulderCape(g, 29.5, 14.5, 6.4, 4.4); shoulderCape(g, 29.5, 49.5, 6.4, 4.4);
  } else {
    ell(g, 31, C, 10, 19, shade(tun, 0.92 + v * 0.06), OUT);                                                              // woollen tunic, checked
    g.save(); g.beginPath(); g.ellipse(31, C, 10, 19, 0, 0, 7); g.clip();
    for (const x of [26, 31, 36]) line(g, x, 13, x, 51, 'rgba(255,255,255,0.2)', 1.5);
    for (const y of [20, 27, 34, 41]) line(g, 21, y, 41, y, 'rgba(255,255,255,0.14)', 1.3);
    g.restore();
    ell(g, 30, 17.5, 1.3, 1.3, '#d8c46a', OUT, 0.6, 0, false);                                                           // the brooch at the shoulder
  }
  if (kind === 'skirm') {
    ell(g, 21, 40, 5.5, 8, '#b59a62', OUT, 1.2); line(g, 21, 33, 21, 47, '#6b5a34', 0.8);                                // a small wicker-and-hide shield slung on the back
    arm(g, 36, 17, -0.5, 14, skin); line(g, 36, 18, 63, 24, WOOD, 2.2); poly(g, [[64.4, 24.4], [57.4, 20.8], [58.6, 27.8]], '#d7dbe0', OUT, 0.5);
    arm(g, 36, 46, 0.2, 12, skin); line(g, 40, 50, 56, 53, WOOD, 1.6); line(g, 40, 47, 56, 49, WOOD, 1.6);               // spare javelins
  } else {
    arm(g, 36, 47, 0.2, 9, kind === 'elite' ? '#1d3566' : tun); arm(g, 42, 49, 0.15, 8, skin);
    if (kind === 'warband' && v === 2) { line(g, 38, 52, 63, 47, WOOD, 2.2); poly(g, [[64.4, 46.6], [57.6, 43.2], [58.4, 50.4]], '#cfd4da', OUT, 0.5); }   // some carry a spear
    else { line(g, 47, 51, 64, 53, '#cfd4da', 3); line(g, 47, 51, 64, 53, OUT, 0.8); line(g, 46, 49.5, 47, 54, '#b98a3a', 2.2); }                            // long iron sword
    rect(g, 24, 53, 12, 2.6, '#7a7e84', OUT, 0.7, 1.2, false); line(g, 24, 55.6, 36, 55.6, '#b98a3a', 0.6);                                                  // the scabbard on the right hip
    longShield(g, 45, 24, 11.5, 36, shade(t.color, 0.95), kind === 'elite' ? '#d8c46a' : t.trim);
    arm(g, 36, 15, -0.45, 9, kind === 'elite' ? '#1d3566' : tun);
  }
  if (kind === 'elite') {
    ell(g, 24.6, C, 5.2, 8, shade(BRONZE, 0.8), OUT, 1);
    ell(g, 31, C, 8.2, 8.2, BRONZE, OUT, 1.3); ell(g, 31, C, 4.6, 4.6, shade(BRONZE, 1.15)); line(g, 31, C - 8, 31, C + 8, shade(BRONZE, 0.7), 1);   // bronze helmet with a ridge
    ell(g, 31, 24.6, 3.8, 2.4, shade(BRONZE, 0.8), null, 0, 0, false); ell(g, 31, 39.4, 3.8, 2.4, shade(BRONZE, 0.8), null, 0, 0, false);                 // cheek-guards
    line(g, 27, C - 7.5, 22, C - 14, '#e6dcc0', 2); line(g, 27, C + 7.5, 22, C + 14, '#e6dcc0', 2);                                                 // feathered wings
    g.strokeStyle = '#d8c46a'; g.lineWidth = 2.2; g.beginPath(); g.arc(31, C, 10.4, 1.9, 4.3); g.stroke();                                         // gold torc
    ell(g, 31, C - 10.2, 1.5, 1.5, '#f0d98a', OUT, 0.6, 0, false); ell(g, 31, C + 10.2, 1.5, 1.5, '#f0d98a', OUT, 0.6, 0, false);
  } else {
    ell(g, 31, C, 7.8, 8, hair, OUT, 1.3);                                                                                  // bareheaded: long, lime-stiffened hair swept back
    for (const a of [-1, -0.6, -0.2, 0.2, 0.6, 1]) line(g, 26, C + a * 5.5, 18.5, C + a * 9, shade(hair, 1.15), 1.8);
    ell(g, 33, C, 3.8, 4.6, shade(hair, 0.85), null, 0, 0, false);
  }
}

// A horse seen from above, with real proportions: a long, narrow barrel (about three times as long as it is wide), a slightly broader croup,
// a long tapering neck ending in a small head with ears, a mane along the crest, and a tail. Gallic ponies were small and sturdy.
const COATS = [{ body: '#7a4a2a', dark: '#1f1610' }, { body: '#9a5a2a', dark: '#6b3a1a' }, { body: '#a69d88', dark: '#4a4036' }, { body: '#cfcfca', dark: '#8a8a86' }];   // bay, chestnut, dun, grey
function horse(g, v, harness = true, bridle = true) {
  const { body, dark } = COATS[v];
  for (const a of [-0.3, 0, 0.3]) { g.strokeStyle = dark; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(9, C); g.quadraticCurveTo(4, C + a * 8, 0.5, C + a * 17); g.stroke(); }
  const parts = [[14.5, C, 8, 7.4], [25, C, 9.5, 6.6], [35, C, 7.2, 6.3], [53.5, C, 6.6, 3.1], [60, C, 3, 2.5]];
  g.strokeStyle = OUT; g.lineWidth = 2.8; g.lineJoin = 'round';
  for (const [x, y, rx, ry] of parts) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.stroke(); }
  g.beginPath(); g.moveTo(37, C - 5); g.lineTo(52, C - 3); g.lineTo(52, C + 3); g.lineTo(37, C + 5); g.closePath(); g.stroke();
  g.fillStyle = body; for (const [x, y, rx, ry] of parts) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(37, C - 5); g.lineTo(52, C - 3); g.lineTo(52, C + 3); g.lineTo(37, C + 5); g.closePath(); g.fill();
  shine(g, () => { g.ellipse(25, C, 22, 8, 0, 0, 7); }, 25, C, 22, 0.9);
  ell(g, 60.5, C, 2.6, 2.1, shade(body, 0.7), null, 0, 0, false);                                                       // muzzle
  ell(g, 49.5, C - 3.4, 1.4, 2.2, shade(body, 0.8), OUT, 0.8, 0.4, false); ell(g, 49.5, C + 3.4, 1.4, 2.2, shade(body, 0.8), OUT, 0.8, -0.4, false);   // ears
  line(g, 38, C, 51, C, dark, 2.6);                                                                                     // mane along the crest
  line(g, 10, C, 34, C, shade(body, 0.8), 0.9);                                                                         // the spine
  if (bridle) { line(g, 51, C - 1.6, 57, C - 1.2, '#3a2a18', 0.9); line(g, 51, C + 1.6, 57, C + 1.2, '#3a2a18', 0.9); }   // bridle cheek-straps (Numidians rode without)
  if (harness) { line(g, 36.5, C - 6, 36.5, C + 6, '#5a3a1a', 1.3); for (const y of [C - 4, C - 1.5, C + 1.5, C + 4]) ell(g, 36.5, y, 0.9, 0.9, '#d8b24a', null, 0, 0, false); }   // breast-strap with bronze phalerae
}
function horseman(g, t, v, gaulish, noble) {
  const skin = SKIN[v], cloak = gaulish ? shade(t.color, 0.9) : '#a8281f', trousers = gaulish ? shade(t.color, 0.7) : '#c9b48a';
  shadow(g, true);
  horse(g, v);
  // the four-horned saddle (no stirrups): a fringed saddle-cloth in the unit's colour, and the rider's legs hanging down both flanks
  rect(g, 20, C - 7.6, 13, 15.2, shade(t.color, 0.85), OUT, 1.2, 3); rect(g, 22, C - 5.6, 9, 11.2, null, shade(t.trim, 0.8), 0.8, 2, false);
  for (const sy of [-1, 1]) for (let x = 21; x <= 32; x += 2.2) line(g, x, C + sy * 7.6, x, C + sy * 9.4, shade(t.trim, 0.8), 0.7);
  ell(g, 25.5, C - 8.2, 5.2, 2.4, trousers, OUT, 1, 0.1); ell(g, 25.5, C + 8.2, 5.2, 2.4, trousers, OUT, 1, -0.1);
  ell(g, 21, C, 6.4, 9.2, cloak, OUT, 1.2);                                                                              // cloak streaming behind the rider
  mailBody(g, 27, C, 5.2, 8.6); shoulderCape(g, 27.5, C - 6.5, 3.8, 2.6); shoulderCape(g, 27.5, C + 6.5, 3.8, 2.6);
  line(g, 31, C - 2, 56, C - 1.4, '#6b4a2a', 0.9); line(g, 31, C + 2, 56, C + 1.4, '#6b4a2a', 0.9);                      // reins
  arm(g, 29, C - 5, 0.1, 7, skin); arm(g, 29, C + 5.5, 0.1, 8, skin);
  line(g, 24, C + 10, 63, C + 5.5, WOOD, 2.2); poly(g, [[64.8, C + 5], [58.4, C + 2.4], [58.8, C + 8.8]], '#d7dbe0', OUT, 0.5);   // spear
  if (gaulish) longShield(g, 27.5, C - 14.3, 6.4, 15, shade(t.color, 0.95), t.trim, true);                               // along the horse's flank
  else { ell(g, 27, C - 14, 6.8, 6.8, shade(t.color, 0.95), OUT, 1.6); ell(g, 27, C - 14, 2.4, 2.4, '#d8dbe0', OUT, 0.8, 0, false); ell(g, 27, C - 14, 5, 5, null, shade(t.trim, 0.8), 0.7, 0, false); }   // the round parma equestris
  if (!gaulish || noble) { ell(g, 22.6, C, 4.2, 6, shade(gaulish ? IRON : BRONZE, 0.8), OUT, 1); ell(g, 28, C, 5.8, 5.8, gaulish ? IRON : BRONZE, OUT, 1.2); ell(g, 28, C, 2.4, 2.4, shade(gaulish ? IRON : BRONZE, 1.2)); }
  else { ell(g, 28, C, 5.6, 5.8, HAIR[v], OUT, 1.2); for (const a of [-0.8, 0, 0.8]) line(g, 24, C + a * 4, 18, C + a * 6, shade(HAIR[v], 1.15), 1.6); }
  if (gaulish && noble) { g.strokeStyle = '#d8c46a'; g.lineWidth = 1.7; g.beginPath(); g.arc(28, C, 7.4, 1.9, 4.3); g.stroke(); }
}

// ---- Act II: the Suebi and their wagons ----
// A Suebian warrior: no armour, a wool cloak pinned at the shoulder, hair gathered in a knot at the side of the head, a painted board shield and the framea,
// a short-bladed spear for thrusting.
const TAWNY = ['#a8793a', '#8a5a2a', '#c49a50'];
function german(g, t, v) {
  const hair = TAWNY[v], skin = SKIN[v], cloak = ['#6a5a3a', '#5a6a44', '#7a4a30'][v], tunic = ['#b89a6a', '#a8946a', '#c2a878'][v];
  shadow(g);
  ell(g, 28, C, 11.2, 20.5, cloak, OUT, 1.2);
  ell(g, 31, C, 9.6, 17.2, tunic, OUT);
  ell(g, 30, 17.6, 1.3, 1.3, '#c9a24a', OUT, 0.6, 0, false);
  arm(g, 36, 47, 0.2, 9, tunic); arm(g, 42, 49, 0.15, 8, skin);
  line(g, 36, 53, 66, 44, WOOD, 2.4); poly(g, [[67.6, 43.6], [60.4, 40.4], [61.2, 47.8]], '#cfd4da', OUT, 0.5);
  ell(g, 45, 24, 7, 13.8, shade(['#8a3a2a', '#3a5a7a', '#7a6a2a'][v], 1), OUT, 1.5); ell(g, 45, 24, 2.5, 2.5, '#d8dbe0', OUT, 0.8, 0, false); line(g, 45, 11.5, 45, 36.5, 'rgba(232,220,192,0.55)', 0.9);
  arm(g, 36, 15, -0.45, 9, tunic);
  ell(g, 31, C, 7.6, 7.8, hair, OUT, 1.3); ell(g, 33.5, C, 3.6, 4.4, shade(hair, 0.85), null, 0, 0, false);
  ell(g, 28.5, C + 8.6, 3.2, 3.2, hair, OUT, 1.1); line(g, 27.6, C + 8.6, 29.6, C + 8.6, shade(hair, 0.7), 0.7);          // the Suebian knot
}
// A German rider with his runner: the horseman wears no armour and carries a spear and a small shield; beside the horse a light-armed foot runner
// keeps pace with one hand in its mane, as Caesar describes (Gallic War I.48).
function germanHorse(g, t, v) {
  const skin = SKIN[v], hair = TAWNY[v];
  shadow(g, true);
  horse(g, v, false);
  rect(g, 20, C - 6.6, 12, 13.2, '#cdbf9a', OUT, 1.1, 3);                                                                // a sheepskin pad: no saddle
  ell(g, 25.5, C - 7.8, 5, 2.3, '#8a7a5a', OUT, 1, 0.1); ell(g, 25.5, C + 7.8, 5, 2.3, '#8a7a5a', OUT, 1, -0.1);
  ell(g, 21.5, C, 6, 9.4, '#5a6a44', OUT, 1.2); ell(g, 27, C, 5, 8.2, '#b89a6a', OUT);
  line(g, 31, C - 2, 56, C - 1.4, '#6b4a2a', 0.9); line(g, 31, C + 2, 56, C + 1.4, '#6b4a2a', 0.9);
  arm(g, 29, C - 5, 0.1, 7, skin); arm(g, 29, C + 5.5, 0.1, 8, skin);
  line(g, 24, C + 10, 63, C + 5.5, WOOD, 2.2); poly(g, [[64.8, C + 5], [58.4, C + 2.4], [58.8, C + 8.8]], '#d7dbe0', OUT, 0.5);
  ell(g, 27, C - 14, 6.2, 6.2, shade('#7a3a2a', 1), OUT, 1.5); ell(g, 27, C - 14, 2.2, 2.2, '#d8dbe0', OUT, 0.8, 0, false);
  ell(g, 28, C, 5.6, 5.8, hair, OUT, 1.2); ell(g, 27, C + 5.8, 2.6, 2.6, hair, OUT, 1);
  ell(g, 34, C + 14.5, 3.2, 5.4, '#b89a6a', OUT, 1, 0.15); ell(g, 34.6, C + 14.6, 2.6, 2.6, hair, OUT, 1);               // the runner
  line(g, 35, C + 10.6, 39, C + 5.8, skin, 1.5); line(g, 31, C + 18, 52, C + 14.6, WOOD, 1.2); ell(g, 31.5, C + 19, 3, 3, '#7a6a2a', OUT, 1);
}
// A wagon seen from above: four wheels, a plank bed, a hide cover over the families' goods and the draught pole forward.
function wagon(g, t, v) {
  shadow(g);
  for (const x of [14, 44]) for (const y of [C - 15.5, C + 15.5]) rect(g, x - 5.5, y - 1.9, 11, 3.8, '#4a3220', OUT, 1, 1.4);
  rect(g, 5, C - 12.5, 53, 25, '#9a7a4a', OUT, 1.5, 2);
  for (let x = 9; x < 57; x += 5.5) line(g, x, C - 11.5, x, C + 11.5, 'rgba(60,40,20,0.4)', 0.9);
  rect(g, 8, C - 10.5, 35, 21, ['#d8cba8', '#cdbf98', '#c8b890'][v], OUT, 1.3, 6);
  for (const x of [16, 24, 32]) line(g, x, C - 10, x, C + 10, 'rgba(90,70,40,0.4)', 1.2);
  line(g, 58, C, 63.5, C, WOOD, 3.2); line(g, 61.5, C - 4, 61.5, C + 4, WOOD, 2.2);
}

// ---- individuals who stand out in a unit ----
function centurion(g, t, v) {
  roman(g, t, v, false);
  line(g, 50, 52, 63, 49, '#c8a050', 2.6); ell(g, 63, 49, 1.8, 1.8, '#e8d49a', OUT, 0.6, 0, false);                      // the vitis, the centurion's vine-stick
  rect(g, 29.4, C - 10.5, 3.6, 21, '#b3261e', OUT, 1, 1.4);                                                             // the transverse crest across the helmet
  for (let y = C - 8; y <= C + 8; y += 3) line(g, 29.6, y, 32.8, y, 'rgba(255,255,255,0.35)', 0.6);
  ell(g, 30, 17, 1.6, 1.6, '#e0c060', OUT, 0.6, 0, false); ell(g, 30, 47, 1.6, 1.6, '#e0c060', OUT, 0.6, 0, false);       // the phalerae and silvered greaves catch the light
}
function signifer(g, t, v) {
  roman(g, t, v, false);
  ell(g, 30, C, 11, 21, '#7a6a58', OUT, 1.2);                                                                          // the wolf-skin over the shoulders
  for (let a = -9; a <= 9; a += 3) line(g, 21, C + a * 2, 18, C + a * 2.4, '#5a4c3c', 1.4);
  mailBody(g, 31, C, 7.6, 14); ell(g, 31, C, 8.2, 8.2, BRONZE, OUT, 1.3); ell(g, 31, C, 4.6, 4.6, '#6e6050');             // pelt over the helmet
  ell(g, 36, C - 5, 1.8, 2.6, '#6e6050', OUT, 0.6, 0, false); ell(g, 36, C + 5, 1.8, 2.6, '#6e6050', OUT, 0.6, 0, false);   // ears
  ell(g, 50, 40, 5.4, 5.4, '#e0e4e8', OUT, 1.2); ell(g, 50, 40, 3.4, 3.4, '#b0b6bc', OUT, 0.8); ell(g, 50, 40, 1.4, 1.4, '#e0bb55', null, 0, 0, false);   // the signum seen end-on: stacked silver discs
}
function general(g, t) {
  horse(g, 3, true);
  const gold = '#c9a24a';
  ell(g, 20, C, 8, 11, '#b3261e', OUT, 1.3);                                                                             // the red paludamentum, spread behind
  g.save(); g.beginPath(); g.ellipse(20, C, 8, 11, 0, 0, 7); g.clip(); for (let y = C - 10; y < C + 10; y += 3) line(g, 12, y, 28, y + 1, 'rgba(0,0,0,0.10)', 0.8); g.restore();
  rect(g, 20, C - 7.8, 13, 15.6, '#7a1a16', OUT, 1.2, 3); rect(g, 22, C - 5.8, 9, 11.6, null, gold, 0.9, 2, false);   // purple-red saddle cloth with a gold edge
  ell(g, 27, C, 5.8, 9.4, gold, OUT, 1.3);                                                                                // lorica musculata, the muscled cuirass
  line(g, 27, C - 7, 27, C + 7, shade(gold, 0.7), 0.8); for (const dy of [-3.2, 3.2]) ell(g, 28.5, C + dy, 2.2, 1.8, shade(gold, 1.15), shade(gold, 0.7), 0.6, 0, false);
  ell(g, 25, C - 6.5, 3.6, 2.4, '#e8e0c8', OUT, 0.8); ell(g, 25, C + 6.5, 3.6, 2.4, '#e8e0c8', OUT, 0.8);                // the pteruges' leather straps over the shoulders
  arm(g, 30, C - 5.5, 0.1, 6, SKIN[0]); arm(g, 30, C + 5.5, 0.1, 6, SKIN[0]); line(g, 31, C - 2, 56, C - 1.4, '#6b4a2a', 0.9); line(g, 31, C + 2, 56, C + 1.4, '#6b4a2a', 0.9);
  ell(g, 28.5, C, 6, 6, BRONZE, OUT, 1.3); ell(g, 28.5, C, 2.6, 2.6, shade(BRONZE, 1.2)); ell(g, 23, C, 3.6, 6, shade(BRONZE, 0.8), OUT, 1);
  rect(g, 27, C - 9.2, 3.8, 18.4, '#b3261e', OUT, 1, 1.4);                                                                // the general's transverse crest
  line(g, 22, C + 13, 40, C + 11, '#8a6a3a', 1.6); poly(g, [[40, C + 7.4], [52, C + 8.6], [52, C + 13.6], [40, C + 14.4]], '#b3261e', OUT, 0.7);   // his vexillum, streaming
}

// ---- Act III: Africa ----
// A Numidian rider: no saddle and no bridle, only a rope round the horse's neck and a switch; a short tunic, a small round leather shield and
// a bundle of light javelins. Dark curled hair, sun-darkened skin.
const AFR_SKIN = ['#a8744c', '#8e5f3c', '#b88458'], AFR_HAIR = ['#2a1e14', '#1e160e', '#3a2a1a'];
function numidHorse(g, t, v) {
  const skin = AFR_SKIN[v], tunic = ['#e4d8b8', '#d8c8a0', '#cdbf9a'][v];
  shadow(g, true);
  horse(g, v, false, false);
  line(g, 40, C - 5.4, 40, C + 5.4, '#8a6a3a', 1.4);                                                                     // the neck rope
  ell(g, 25.5, C - 7.6, 5, 2.2, skin, OUT, 1, 0.1); ell(g, 25.5, C + 7.6, 5, 2.2, skin, OUT, 1, -0.1);                   // bare legs, no saddle
  ell(g, 26.5, C, 5, 8, tunic, OUT, 1.1);
  arm(g, 29, C - 5, 0.15, 7, skin); arm(g, 29, C + 5.5, 0.05, 8, skin);
  for (const dy of [0, 1.6, 3.2]) line(g, 22, C + 9 + dy * 0.4, 52, C + 6 + dy, WOOD, 1.1);                             // a bundle of javelins
  poly(g, [[54, C + 5.6], [50, C + 4], [50.4, C + 7.6]], '#d7dbe0', OUT, 0.4);
  ell(g, 27, C - 13.5, 5.2, 5.2, shade(t.color, 0.95), OUT, 1.4); ell(g, 27, C - 13.5, 2.6, 2.6, null, shade(t.trim, 0.85), 0.8, 0, false);   // small round leather shield
  ell(g, 28, C, 5.2, 5.4, AFR_HAIR[v], OUT, 1.2); for (const a of [-0.6, 0, 0.6]) ell(g, 27 + a, C + a * 5, 1.4, 1.4, shade(AFR_HAIR[v], 1.3), null, 0, 0, false);   // tight curls
}
function numidFoot(g, t, v) {
  const skin = AFR_SKIN[v], tunic = ['#e4d8b8', '#d8c8a0', '#cdbf9a'][v];
  shadow(g);
  ell(g, 31, C, 9.4, 17, tunic, OUT, 1.2);
  ell(g, 29, C, 6, 15, shade(t.color, 0.85), null, 0, 0, false);                                                        // a coloured cloak over one shoulder
  arm(g, 36, 47, 0.2, 9, skin);
  for (const dy of [0, 2]) line(g, 30, 52 + dy, 62, 45 + dy, WOOD, 1.4);                                                 // javelins
  poly(g, [[64, 44.6], [58.6, 42.4], [59.2, 47.2]], '#cfd4da', OUT, 0.5);
  ell(g, 44, 22, 7.6, 7.6, shade(t.color, 1), OUT, 1.5); ell(g, 44, 22, 3.6, 3.6, null, shade(t.trim, 0.85), 0.9, 0, false);   // small round shield: right for Numidians
  arm(g, 36, 15, -0.45, 9, skin);
  ell(g, 31, C, 7, 7.2, AFR_HAIR[v], OUT, 1.3); for (const a of [-1, 0, 1]) ell(g, 30 + a, C + a * 4, 1.5, 1.5, shade(AFR_HAIR[v], 1.35), null, 0, 0, false);
}
// A North African forest elephant from above: smaller than the Indian kind and without a tower; the driver sits on its neck with a goad.
function elephant(g, t, v) {
  const hide = ['#8a8478', '#7c776c', '#948d80'][v], dark = shade(hide, 0.75);
  ell(g, C + 3, C + 5, 30, 21, 'rgba(0,0,0,0.28)', null, 0, 0, false);
  line(g, 4, C, 1, C + 4, dark, 2);                                                                                       // tail
  ell(g, 24, C, 20, 16, hide, OUT, 1.8);                                                                                  // the body
  g.save(); g.beginPath(); g.ellipse(24, C, 20, 16, 0, 0, 7); g.clip(); g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 0.8; for (let x = 8; x < 44; x += 4) { g.beginPath(); g.moveTo(x, C - 16); g.quadraticCurveTo(x + 2, C, x, C + 16); g.stroke(); } g.restore();
  ell(g, 43, C - 11, 7, 10, shade(hide, 0.92), OUT, 1.4, -0.3); ell(g, 43, C + 11, 7, 10, shade(hide, 0.92), OUT, 1.4, 0.3);   // the great ears
  ell(g, 45, C, 9, 8, hide, OUT, 1.6);                                                                                    // the head
  line(g, 52, C - 3, 61, C - 6.5, '#f0ead8', 2.2); line(g, 52, C + 3, 61, C + 6.5, '#f0ead8', 2.2);                       // tusks
  g.strokeStyle = OUT; g.lineWidth = 4.6; g.beginPath(); g.moveTo(52, C); g.quadraticCurveTo(58, C + 1, 62, C + 4); g.stroke();
  g.strokeStyle = hide; g.lineWidth = 3; g.beginPath(); g.moveTo(52, C); g.quadraticCurveTo(58, C + 1, 62, C + 4); g.stroke();   // trunk
  rect(g, 30, C - 6, 9, 12, shade(t.color, 0.9), OUT, 1, 2);                                                              // a saddle-cloth
  ell(g, 38, C, 3.6, 5, '#e4d8b8', OUT, 1); ell(g, 38.5, C, 2.8, 2.8, AFR_HAIR[v], OUT, 0.9);                              // the driver
  line(g, 39, C + 3, 46, C + 6, WOOD, 0.9);
}

// ---- Act IV: Pontus and the steppe ----
// Sarmatian horse archer: a light rider in a felt cap and belted coat, the short composite bow, a gorytos (bow-case and quiver) at the hip.
function steppeArcher(g, t, v) {
  const skin = SKIN[v], coat = ['#8a6a3a', '#7a5a34', '#9a7a48'][v];
  shadow(g, true);
  horse(g, v, false);
  rect(g, 20, C - 6.6, 12, 13.2, '#b8a070', OUT, 1.1, 3);                                                                 // felt saddle pad
  ell(g, 25.5, C - 7.8, 5, 2.3, '#5a4a32', OUT, 1, 0.1); ell(g, 25.5, C + 7.8, 5, 2.3, '#5a4a32', OUT, 1, -0.1);             // trousers
  ell(g, 26.5, C, 5.4, 8.4, coat, OUT, 1.1); line(g, 22, C - 6, 31, C + 6, shade(t.trim, 0.8), 0.8);                     // a belted coat
  rect(g, 18, C + 6, 8, 4, '#6a4a22', OUT, 0.8, 1.5);                                                                      // the gorytos
  for (const d of [0, 1.2, 2.4]) line(g, 18.5 + d, C + 6.5, 15 + d, C + 4, '#e4dcc8', 0.6);                                 // fletchings
  arm(g, 29, C - 5, -0.35, 9, skin); arm(g, 29, C + 5, 0.25, 7, skin);
  g.strokeStyle = '#4a2e14'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(36, C - 14); g.quadraticCurveTo(33, C - 7, 39, C - 4); g.quadraticCurveTo(44, C - 1, 41, C + 6); g.stroke();   // recurved bow
  line(g, 36.4, C - 13.6, 41, C + 5.6, 'rgba(240,232,210,0.8)', 0.5);
  ell(g, 28, C, 5.2, 5.4, shade(t.color, 0.9), OUT, 1.2); ell(g, 29.4, C, 2.4, 2.8, shade(t.color, 0.7), null, 0, 0, false);   // pointed felt cap from above
}
// Sarmatian lancer: horse and rider in scale armour, the long two-handed lance (kontos) held along the horse's flank.
function steppeLancer(g, t, v) {
  shadow(g, true);
  horse(g, v);
  g.save(); g.beginPath(); g.ellipse(25, C, 21, 8.6, 0, 0, 7); g.clip();                                                      // a scale bard over the horse's body
  g.fillStyle = 'rgba(120,108,80,0.55)'; g.fillRect(4, C - 9, 42, 18);
  g.strokeStyle = 'rgba(40,32,18,0.45)'; g.lineWidth = 0.7; for (let x = 6; x < 46; x += 2.6) for (let y = C - 8; y < C + 8; y += 2.6) { g.beginPath(); g.arc(x + ((y / 2.6) % 2) * 1.3, y, 1.2, 0, Math.PI); g.stroke(); }
  g.restore();
  ell(g, 25.5, C - 7.8, 5, 2.3, '#6a6050', OUT, 1, 0.1); ell(g, 25.5, C + 7.8, 5, 2.3, '#6a6050', OUT, 1, -0.1);
  ell(g, 26.5, C, 5.6, 8.6, '#9a8c68', OUT, 1.2);                                                                          // scale shirt
  g.save(); g.beginPath(); g.ellipse(26.5, C, 5.4, 8.4, 0, 0, 7); g.clip(); g.strokeStyle = 'rgba(40,32,18,0.5)'; g.lineWidth = 0.6; for (let y = C - 8; y < C + 8; y += 2) { g.beginPath(); g.moveTo(21, y); g.lineTo(32, y + 0.6); g.stroke(); } g.restore();
  arm(g, 29, C - 4, 0.1, 7, '#9a8c68'); arm(g, 29, C + 4.5, 0.1, 7, '#9a8c68');
  line(g, 10, C + 7, 66, C + 4, WOOD, 2.4); poly(g, [[67.8, C + 3.8], [61, C + 1.6], [61.4, C + 6.6]], '#d7dbe0', OUT, 0.5);   // the kontos, long and two-handed
  ell(g, 28, C, 5.6, 5.6, IRON, OUT, 1.3); ell(g, 28, C, 2.6, 2.6, shade(IRON, 1.2)); line(g, 28, C - 5, 28, C + 5, shade(IRON, 0.75), 0.8);   // conical iron helmet
}
// A scythed chariot from above: two horses abreast, a small car with the driver, and the curved blades on the axle ends.
function scythedChariot(g, t, v) {
  ell(g, C + 2, C + 4, 28, 20, 'rgba(0,0,0,0.25)', null, 0, 0, false);
  const { body, dark } = COATS[v];
  for (const dy of [-6.5, 6.5]) { ell(g, 40, C + dy, 11, 4.6, body, OUT, 1.4); ell(g, 51.5, C + dy, 3.6, 2.6, body, OUT, 1.1); line(g, 34, C + dy, 46, C + dy, dark, 1.6); }   // the team
  line(g, 20, C, 34, C, WOOD, 2.2); line(g, 32, C - 8, 32, C + 8, WOOD, 1.6);                                             // pole and yoke
  rect(g, 10, C - 8, 12, 16, shade(t.color, 0.95), OUT, 1.4, 3);                                                         // the car
  line(g, 16, C - 17, 16, C + 17, '#4a3a22', 2);                                                                          // the axle
  for (const sy of [-1, 1]) { ell(g, 16, C + sy * 13, 4.5, 1.8, '#5a4428', OUT, 1); g.strokeStyle = '#d7dbe0'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(16, C + sy * 17); g.quadraticCurveTo(22, C + sy * 25, 30, C + sy * 24); g.stroke(); }   // wheels and scythe blades
  ell(g, 15, C, 3.4, 4.6, '#c9b48a', OUT, 1); ell(g, 15.6, C, 2.6, 2.6, '#6a5a3a', OUT, 0.9);                              // the driver
}

// A British war chariot (55-54 BC): a light two-wheeled car with wicker sides, two small ponies, a driver and a warrior with spears. No scythes.
function britChariot(g, t, v) {
  ell(g, C + 2, C + 4, 27, 19, 'rgba(0,0,0,0.25)', null, 0, 0, false);
  const { body, dark } = COATS[v];
  for (const dy of [-6, 6]) { ell(g, 41, C + dy, 10, 4.2, body, OUT, 1.3); ell(g, 51.5, C + dy, 3.2, 2.4, body, OUT, 1); line(g, 35, C + dy, 46, C + dy, dark, 1.4); }
  line(g, 22, C, 35, C, WOOD, 2); line(g, 33, C - 7.5, 33, C + 7.5, WOOD, 1.5);
  rect(g, 12, C - 8, 12, 16, '#9a7a46', OUT, 1.3, 4);                                                                   // wicker car
  g.strokeStyle = 'rgba(60,40,16,0.55)'; g.lineWidth = 0.7; for (let x = 14; x < 24; x += 2) { g.beginPath(); g.moveTo(x, C - 7.5); g.lineTo(x, C + 7.5); g.stroke(); }
  line(g, 18, C - 14, 18, C + 14, '#4a3a22', 1.8); for (const sy of [-1, 1]) ell(g, 18, C + sy * 12, 4, 1.6, '#5a4428', OUT, 1);   // axle and wheels
  ell(g, 21, C - 2.6, 3, 3, SKIN[v], OUT, 0.9); ell(g, 16, C + 3, 3, 3, HAIR[v], OUT, 0.9);                                // driver and warrior
  line(g, 14, C + 6, 44, C + 13, WOOD, 1.2); poly(g, [[45.4, C + 13.4], [40.4, C + 10.4], [40, C + 14.6]], '#d7dbe0', OUT, 0.4);   // a spear
  ell(g, 12, C + 9, 4.6, 3.2, shade(t.color, 0.95), OUT, 1);                                                                // shield on the side
}

const PAINT = {
  legionary: (g, t, v, a) => roman(g, t, v, a), aux_inf: (g, t, v) => aux(g, t, v), slinger: (g, t, v) => slinger(g, t, v), archer: (g, t, v) => archer(g, t, v),
  warband: (g, t, v) => gaul(g, t, v, 'warband'), gaul_elite: (g, t, v) => gaul(g, t, v, 'elite'), gaul_skirm: (g, t, v) => gaul(g, t, v, 'skirm'),
  equites: (g, t, v) => horseman(g, t, v, false, true), aux_cav: (g, t, v) => horseman(g, t, v, true, false), gaul_cav: (g, t, v) => horseman(g, t, v, true, true),
  baggage: (g, t, v) => wagon(g, t, v), antesignani: (g, t, v, a) => roman(g, t, v, a),
  suebi: (g, t, v) => german(g, t, v), german_cav: (g, t, v) => germanHorse(g, t, v), laager: (g, t, v) => wagon(g, t, v),
  numid_cav: (g, t, v) => numidHorse(g, t, v), numid_inf: (g, t, v) => numidFoot(g, t, v), elephant: (g, t, v) => elephant(g, t, v), pompeian: (g, t, v, a) => roman(g, t, v, a),
  britons: (g, t, v) => gaul(g, t, v, 'warband'), brit_cav: (g, t, v) => horseman(g, t, v, true, false), brit_chariot: (g, t, v) => britChariot(g, t, v),
  pomp_cav: (g, t, v) => horseman(g, t, v, false, true), pomp_missile: (g, t, v) => archer(g, t, v), pontic: (g, t, v, a) => roman(g, t, v, a), pomp_levy: (g, t, v, a) => roman(g, t, v, a),
  horse_archer: (g, t, v) => steppeArcher(g, t, v), lancer: (g, t, v) => steppeLancer(g, t, v), chariot: (g, t, v) => scythedChariot(g, t, v),
  centurion: (g, t, v) => centurion(g, t, v), signifer: (g, t, v) => signifer(g, t, v), general: (g, t) => general(g, t)
};

function render(key, typeKey, variant, armed) {
  const t = UNIT_TYPES[typeKey] || UNIT_TYPES.legionary, c = document.createElement('canvas'); c.width = PX; c.height = PX;
  const g = c.getContext('2d'); g.scale(SCALE, SCALE); g.lineJoin = 'round'; g.lineCap = 'round';
  (PAINT[key] || PAINT.legionary)(g, t, variant % 3, armed);
  return c;
}
// A 96x96 canvas of one soldier (or horseman) of this type, facing right. Cached.
export function soldierSprite(typeKey, variant = 0, armed = true) {
  const key = typeKey + variant + (armed ? 'a' : 'u'); if (cache.has(key)) return cache.get(key);
  const c = render(typeKey, typeKey, variant, armed); cache.set(key, c); return c;
}
// The officers and the general: 'centurion', 'signifer' (legionary kit) and 'general'.
export function specialSprite(kind) {
  const key = 'sp' + kind; if (cache.has(key)) return cache.get(key);
  const c = render(kind, kind === 'general' ? 'equites' : 'legionary', 0, true); cache.set(key, c); return c;
}
// One scutum seen face-on, for the roof of a testudo.
export function shieldTile(typeKey) {
  const key = 'tile' + typeKey; if (cache.has(key)) return cache.get(key);
  const t = UNIT_TYPES[typeKey] || UNIT_TYPES.legionary, c = document.createElement('canvas'); c.width = 48; c.height = 72;
  const g = c.getContext('2d'); g.scale(2, 2);
  if (typeKey === 'legionary') scutum(g, 12, 18, 21, 33, shade(t.color, 0.95)); else longShield(g, 12, 18, 21, 33, shade(t.color, 0.95), t.trim);
  cache.set(key, c); return c;
}
export const SPRITE_SIZE = PX;
