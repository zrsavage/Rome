// How well does the enemy keep its battle line? node tools/linetest.mjs [runs] [ids comma-separated]
// Plays battles with the smart bot and samples the enemy's line units every second:
//  - approach: how far units are from their place in the line (slot error), how ragged the front rank is (spread of the front along the
//    line of advance), and how many line units overlap a friend;
//  - contact: how long it takes for the line to hit home (first to 75% of line units in contact), a measure of one blow versus a trickle;
//  - melee: how many line units are stacked on a friend (piling) once the fighting starts.
import { play } from './simtest.mjs';
import { Battle } from '../src/sim.js';
import { SCENARIOS } from '../src/data.js';

const RUNS = +process.argv[2] || 3;
const IDS = (process.argv[3] || 'bibracte,ariovistus,utica,pharsalus,thapsus,munda').split(',');
const orig = Battle.prototype.update;
let M = null;
Battle.prototype.update = function (dt) {
  orig.call(this, dt);
  if (!M || this.t < M.next) return; M.next = this.t + 1;
  const S = this.aiS || {}, lines = this.units.filter(u => u.side === 'gaul' && u.active && u.role === 'line');
  if (lines.length < 2) return;
  for (const u of lines) if (u.contacts.some(e => e.active) && M.first[u.id] == null) M.first[u.id] = this.t;
  const overl = (list) => { let n = 0; for (const u of list) if (list.some(f => f !== u && this.gap(u, f) < -8)) n++; return n / list.length; };
  if (!S.surge && this.t > 8 && lines.every(u => u.slot)) {
    const a = { x: Math.cos(S.fa), y: Math.sin(S.fa) }, err = lines.reduce((q, u) => q + Math.hypot(u.slot.x - u.x, u.slot.y - u.y), 0) / lines.length;
    const perRank = Math.max(1, Math.floor(1900 / (Math.max(...lines.map(u => u.w)) + 24))), front = lines.filter(u => (u.slotIdx ?? 0) < perRank).map(u => u.x * a.x + u.y * a.y);
    M.app.push({ err, spread: Math.max(...front) - Math.min(...front), over: overl(lines) });
  } else if (S.surge) M.mel.push(overl(lines));
  M.n = Math.max(M.n, lines.length);
};
const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
console.log('battle          line units  slot error  front ragged  overlap(approach)  contact spread  stacked(melee)');
for (const id of IDS) {
  const i = SCENARIOS.findIndex(s => s.id === id); if (i < 0) { console.log('no scenario', id); continue; }
  const R = { err: [], spread: [], over: [], cs: [], mel: [], n: [] };
  for (let r = 0; r < RUNS; r++) {
    M = { next: 0, app: [], mel: [], first: {}, n: 0 };
    play('smart', i, 'normal', 1000 + r);
    R.err.push(avg(M.app.map(x => x.err))); R.spread.push(avg(M.app.map(x => x.spread))); R.over.push(avg(M.app.map(x => x.over)));
    const ft = Object.values(M.first).sort((p, q) => p - q); if (ft.length >= 2) R.cs.push(ft[Math.floor(ft.length * 0.75)] - ft[0]);
    R.mel.push(avg(M.mel)); R.n.push(M.n);
  }
  const f = (v, d = 0) => isNaN(v) ? '  -' : v.toFixed(d);
  console.log(`${id.padEnd(15)} ${f(avg(R.n)).padStart(10)}  ${f(avg(R.err)).padStart(10)}  ${f(avg(R.spread)).padStart(12)}  ${(f(avg(R.over) * 100) + '%').padStart(16)}  ${(f(avg(R.cs)) + 's').padStart(14)}  ${(f(avg(R.mel) * 100) + '%').padStart(14)}`);
}
