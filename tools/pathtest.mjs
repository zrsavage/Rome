// Pathing harness: node tools/pathtest.mjs
// Puts friendly units in the situations where they used to get stuck (marching through a line, two units sent to the same spot,
// a line moving through another line, two lines swapping places, a slot already occupied) and measures, for every unit that was
// ordered to move: did it arrive within the time limit, how long it took, how often it reversed direction (bouncing), and how much
// friendly units overlap at the end.
import { Battle, Unit } from '../src/sim.js';
import { SCENARIOS } from '../src/data.js';

const base = { ...SCENARIOS[0], id: 'pathtest', practice: true, enemy: [], reinforcements: [], objectives: [], rule: null, fog: false, terrain: [], hills: [], timeLimit: 9999 };
const coh = (name, x, y) => ({ type: 'legionary', name, men: 460, maxMen: 480, x, y, f: -Math.PI / 2, drill: 40 });
const line = (tag, y, n = 5, x0 = 800, gap = 120) => Array.from({ length: n }, (_, i) => coh(`${tag}${i}`, x0 + (i - (n - 1) / 2) * gap, y));

const CASES = {
  'one through a line': { specs: [...line('L', 600), coh('M', 800, 760)], orders: (b, U) => b.setMove(U.M, 800, 430, -Math.PI / 2) },
  'two to the same spot': { specs: [coh('A', 700, 700), coh('B', 900, 700)], orders: (b, U) => { b.setMove(U.A, 800, 450, -Math.PI / 2); b.setMove(U.B, 800, 450, -Math.PI / 2); } },
  'line through a line': { specs: [...line('S', 520), ...line('M', 700)], orders: (b, U) => b.setMoveGroup([0, 1, 2, 3, 4].map(i => ({ u: U['M' + i], x: 800 + (i - 2) * 120, y: 380, tf: -Math.PI / 2 }))) },
  'two lines swap': { specs: [...line('A', 560), ...line('B', 700)], orders: (b, U) => {
    b.setMoveGroup([0, 1, 2, 3, 4].map(i => ({ u: U['B' + i], x: 800 + (i - 2) * 120, y: 470, tf: -Math.PI / 2 })));
    b.setMoveGroup([0, 1, 2, 3, 4].map(i => ({ u: U['A' + i], x: 800 + (i - 2) * 120, y: 780, tf: -Math.PI / 2 }))); } },
  'slot occupied': { specs: [coh('X', 800, 500), ...line('M', 720, 3)], orders: (b, U) => b.setMoveGroup([0, 1, 2].map(i => ({ u: U['M' + i], x: 800 + (i - 1) * 120, y: 500, tf: -Math.PI / 2 }))) },
  'reserve attacks past own line': { specs: [...line('L', 560, 3), coh('R', 800, 760)], foes: [[680, 470], [800, 470], [920, 470]], orders: (b, U) => b.setAttack(U.R, U.G1) },
  'three attack one': { specs: [coh('A', 650, 720), coh('B', 800, 740), coh('C', 950, 720)], foes: [[800, 450]], orders: (b, U) => ['A', 'B', 'C'].forEach(k => b.setAttack(U[k], U.G0)) },
  'returning to a taken post': { specs: [coh('P', 800, 500), coh('Q', 820, 640)], orders: (b, U) => { U.Q.post = { x: 800, y: 505 }; U.Q.goalPost = true; } },
  'crowd to one point': { specs: line('C', 750, 6, 800, 100), orders: (b, U) => Object.values(U).forEach(u => b.setMove(u, 800, 420, -Math.PI / 2)) }
};

let bad = 0;
for (const [name, cs] of Object.entries(CASES)) {
  const b = new Battle(base, cs.specs, { difficulty: 'normal', seed: 7, general: false, orders: undefined });
  if (b.deploying) b.endDeploy && b.endDeploy();
  (cs.foes || []).forEach(([x, y], i) => b.units.push(new Unit({ side: 'gaul', type: 'warband', name: 'G' + i, men: 420, x, y, stance: 'hold', ai: { kind: 'idle' } })));
  const U = {}; for (const u of b.units) U[u.name] = u;
  cs.orders(b, U);
  const movers = b.units.filter(u => u.order.kind === 'move' || (b.pending || []).some(p => p.u === u)), track = new Map();
  const goalOf = (u) => u.goalPost && u.order.kind === 'none' ? { x: u.x, y: u.y, post: true } : u.order.kind === 'move' ? { x: u.order.x, y: u.order.y } : u.order.kind === 'attack' && u.side === 'rome' ? { att: true } : null;
  const T = 120, dt = 0.1; let t = 0;
  for (const u of b.units) track.set(u, { goal: null, arrived: null, rev: 0, lastV: null, path: 0 });
  while (t < T) {
    const before = new Map(b.units.map(u => [u, [u.x, u.y]]));
    b.update(dt); t += dt;
    for (const u of b.units) {
      const tr = track.get(u), g = goalOf(u); if (g) tr.goal = g;
      const [x0, y0] = before.get(u), vx = u.x - x0, vy = u.y - y0, sp = Math.hypot(vx, vy); tr.path += sp;
      if (sp > 0.3) { if (tr.lastV && (vx * tr.lastV[0] + vy * tr.lastV[1]) / (sp * Math.hypot(...tr.lastV)) < -0.3) tr.rev++; tr.lastV = [vx, vy]; }
      if (tr.goal && tr.goal.att) { if (tr.arrived == null && (u.contacts.some(e => e.active) || (u.order.kind !== 'attack' && tr.path > 50))) tr.arrived = t; continue; }   // reached the fight, or the target broke first
      if (tr.goal && tr.arrived == null && u.order.kind !== 'move' && Math.hypot(u.x - tr.goal.x, u.y - tr.goal.y) < 40) tr.arrived = t;
    }
  }
  const rows = [], us = b.units; let overlap = 0;
  for (let i = 0; i < us.length; i++) for (let j = i + 1; j < us.length; j++) { if (us[i].side !== us[j].side || (us[i].contacts.length && us[j].contacts.length)) continue; const g = b.gap(us[i], us[j]); if (g < -4) overlap += -g; }
  let caseBad = false;
  for (const u of us) { const tr = track.get(u); if (!tr.goal) continue;
    const dist = tr.goal.att ? 999 : Math.round(Math.hypot(u.x - tr.goal.x, u.y - tr.goal.y)), ok = tr.arrived != null || dist < 60;
    if (!ok || tr.rev > 6) caseBad = true;
    rows.push(`${u.name}:${tr.arrived != null ? tr.arrived.toFixed(0) + 's' : 'NO(' + dist + ')'}${tr.rev ? ' rev' + tr.rev : ''}`); }
  if (caseBad || overlap > 40) bad++;
  console.log(`${(caseBad || overlap > 40) ? 'BAD ' : 'ok  '} ${name.padEnd(22)} overlap ${String(Math.round(overlap)).padStart(4)}  ${rows.join('  ')}`);
}
process.exitCode = bad ? 1 : 0;
