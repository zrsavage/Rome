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
