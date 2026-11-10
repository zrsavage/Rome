// Where units go, and which way they face, when you draw a battle line with a right-drag.
// Rule: the line faces to the LEFT of the way you draw it, like a person walking along it. Draw left to right and it faces north (up the screen);
// right to left, south; top to bottom, east; bottom to top, west. Units are placed along the line in the order they already stand along it,
// so they do not cross over each other.
export function dragLayout(units, d, fill = false) {
  const dx = d.x1 - d.x0, dy = d.y1 - d.y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  const ang = Math.atan2(-dx, dy);                                                     // facing = drag direction turned a quarter-turn anticlockwise on the screen
  const sorted = [...units].sort((a, b) => ((a.x - d.x0) * ux + (a.y - d.y0) * uy) - ((b.x - d.x0) * ux + (b.y - d.y0) * uy));
  const n = sorted.length;
  // with `fill` (Alt held) each unit stretches to cover its share of the line, up to the limit of a thin line
  const span = L / n, wideFor = (u) => (fill ? Math.max(1, Math.min(2.4, (span * 0.94) / (u.baseW || u.w))) : (u.wide || 1));
  const pts = sorted.map((u, i) => { const t = n === 1 ? 0.5 : i / (n - 1), w = wideFor(u); return { u, x: d.x0 + dx * t, y: d.y0 + dy * t, wide: w }; });
  return { ang, pts };
}
const NAMES = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'];
export const compass = (ang) => NAMES[((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8];

// ---------------- Battle array: the triplex acies, and a formation of your own ----------------
// Facing angle f; the line runs across it. Returns [{u, x, y, tf}].
// Infantry go in three lines (about four in ten in front, three in the second and the rest in the third, the freshest and strongest in front),
// slingers and archers in a screen ahead of the front (they fall back through the line when pressed), horse split on the two wings.
export function triplexLayout(units, cx, cy, f) {
  const fx = Math.cos(f), fy = Math.sin(f), px = -fy, py = fx;             // forward and "right-hand" lateral axes
  const lat = (u) => (u.x - cx) * px + (u.y - cy) * py, strength = (u) => u.men * (1 + 0.1 * (u.lvl || 0)) * (0.5 + 0.5 * (u.morale / u.maxMorale)) * (1 - u.fatigue / 250);
  const inf = units.filter(u => u.type.cat === 'inf').sort((a, b) => strength(b) - strength(a)), rng = units.filter(u => u.type.cat === 'ranged'), cav = units.filter(u => u.type.cat === 'cav');
  const n = inf.length, n1 = Math.max(1, Math.ceil(n * 0.4)), n2 = Math.min(n - n1, Math.ceil(n * 0.3)), rows = [inf.slice(0, n1), inf.slice(n1, n1 + n2), inf.slice(n1 + n2)].filter(r => r.length);
  const slot = Math.max(60, ...inf.map(u => (u.baseW || u.w) + 16)), depth = Math.max(40, ...inf.map(u => u.d)) + 44;
  const out = [], place = (u, x, y) => out.push({ u, x: cx + fx * y + px * x, y: cy + fy * y + py * x, tf: f });     // x lateral, y forward
  let half = 0;
  rows.forEach((row, ri) => {
    const sorted = [...row].sort((a, b) => lat(a) - lat(b)), y = (rows.length - 1) / 2 * depth - ri * depth;           // front row furthest forward
    sorted.forEach((u, i) => place(u, (i - (sorted.length - 1) / 2) * slot * (ri === 1 ? 1.0 : 1.0) + (ri === 1 ? slot / 2 : 0) * (sorted.length === rows[0].length ? 0 : 0), y));
    if (ri === 0) half = sorted.length * slot / 2;
  });
  const front = (rows.length - 1) / 2 * depth;
  [...rng].sort((a, b) => lat(a) - lat(b)).forEach((u, i, a) => place(u, (i - (a.length - 1) / 2) * Math.max(70, (u.baseW || u.w) + 20), front + 95));
  const L = cav.filter(u => lat(u) < 0), R = cav.filter(u => lat(u) >= 0); while (L.length < R.length - 1) L.push(R.pop()); while (R.length < L.length - 1) R.push(L.pop());
  const wing = (list, sign) => list.forEach((u, i) => place(u, sign * (half + 90 + i * Math.max(70, (u.baseW || u.w) + 14)), front - 20));
  wing(L, -1); wing(R, 1);
  return out;
}
// A formation of your own: remembered as positions in the frame of the way you face (one slot per unit, by type and strength), recalled round the units' centre.
const FKEY = 'legio_formation_v1';
export function saveFormation(units, f) {
  const cx = units.reduce((a, u) => a + u.x, 0) / units.length, cy = units.reduce((a, u) => a + u.y, 0) / units.length, fx = Math.cos(f), fy = Math.sin(f);
  const slots = units.map(u => ({ cat: u.type.cat, men: u.men, x: (u.x - cx) * -fy + (u.y - cy) * fx, y: (u.x - cx) * fx + (u.y - cy) * fy }));
  try { localStorage.setItem(FKEY, JSON.stringify(slots)); } catch { /* storage unavailable */ }
  return slots.length;
}
export function recallFormation(units, cx, cy, f) {
  let slots; try { slots = JSON.parse(localStorage.getItem(FKEY)); } catch { slots = null; }
  if (!slots || !slots.length) return null;
  const fx = Math.cos(f), fy = Math.sin(f), out = [];
  for (const cat of ['inf', 'ranged', 'cav']) {
    const us = units.filter(u => u.type.cat === cat).sort((a, b) => b.men - a.men), ss = slots.filter(s => s.cat === cat).sort((a, b) => b.men - a.men);
    us.forEach((u, i) => { const s = ss[i] || ss[ss.length - 1] || { x: (i - ss.length) * 90, y: -120 }, ex = ss[i] ? 0 : (i - ss.length + 1) * 90; out.push({ u, x: cx + fx * s.y + -fy * (s.x + ex), y: cy + fy * s.y + fx * (s.x + ex), tf: f }); });
  }
  return out;
}
