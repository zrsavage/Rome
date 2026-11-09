// Camp balance harness: node tools/campbalance.mjs [seedsPerScenario] [scenarioIndexes e.g. 1,3,4] [filter]
// Prices every camp option in one currency (denarii-equivalents: gold + 1.5 x supplies + DAY per day) and measures its benefit with
// the tactician bot: the army's size after the battle (including wounded who return) and the win rate, against a baseline.
// Unit-targeted options are applied to all three legion cohorts and the cost is multiplied by three, to lift the effect out of the noise.
import { play } from './simtest.mjs';
import { planDrill } from '../src/camp.js';
import { RAISE } from '../src/data.js';
import { upgradeCost } from '../src/perks.js';

const SEEDS = +process.argv[2] || 30;
const SCENS = (process.argv[3] || '1,3,4').split(',').map(Number);
const FILTER = process.argv[4] || '';
const DAY = 120, SUP = 1.5;
const inf = (c) => c.cohorts.filter(h => h.type === 'legionary');
const each = (c, f) => inf(c).forEach(f);
const base = (c) => { c.cohorts.forEach(h => { h.condition = 70; }); c.fort = 0; c.hospital = 0; };
const recruit = (n) => (c) => each(c, h => { const add = Math.min(n, h.maxMen - h.men), old = h.men; h.men += add; h.xp = Math.round(h.xp * old / h.men); });
const gear = (kind) => (c) => each(c, h => { h.upg = { armour: 0, weapon: 0, ...(h.upg || {}) }; h.upg[kind]++; });
const drill = (key) => (c) => each(c, h => { const p = planDrill(c, h, key, 'self'); h.xp += p.xp; h.drill = Math.min(100, h.drill + p.dr); h.condition = Math.max(25, h.condition + p.cond); h.men -= Math.round(p.risk * 0.015 * h.men); });
const raise = (type) => (c) => { const r = RAISE[type]; c.cohorts.push({ id: 99, name: 'New ' + type, type, men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100, officerId: null }); };
const gearCost = (kind) => 3 * (upgradeCost({ men: 450, upg: {} }, kind).gold + SUP * upgradeCost({ men: 450, upg: {} }, kind).supplies + DAY);
const rcost = (t) => RAISE[t].gold + SUP * RAISE[t].supplies + DAY;

const VARIANTS = [
  { name: 'baseline', mut: () => {}, cost: 0 },
  { name: 'recruit +20 (x3 cohorts)', mut: recruit(20), cost: 3 * (60 + DAY) },
  { name: 'recruit +40 (x3 cohorts)', mut: recruit(40), cost: 3 * (120 + DAY) },
  { name: 'armour tier 1 (x3)', mut: gear('armour'), cost: gearCost('armour') },
  { name: 'weapon tier 1 (x3)', mut: gear('weapon'), cost: gearCost('weapon') },
  { name: 'formation drill (x3)', mut: drill('formation'), cost: 3 * (8 * SUP + DAY) },
  { name: 'weapons practice (x3)', mut: drill('weapons'), cost: 3 * (8 * SUP + DAY) },
  { name: 'field exercises (x3)', mut: drill('field'), cost: 3 * (14 * SUP + DAY) },
  { name: 'rest the army (+20 cond)', mut: (c) => c.cohorts.forEach(h => { h.condition = Math.min(100, h.condition + 20); }), cost: DAY },
  { name: 'fortify +1 level', mut: (c) => { c.fort = 1; }, cost: 2 * (10 * SUP + DAY) },
  { name: 'fortify +2 levels', mut: (c) => { c.fort = 2; }, cost: 4 * (10 * SUP + DAY) },
  { name: 'hospital level 1', mut: (c) => { c.hospital = 1; }, cost: 120 + 20 * SUP + DAY },
  { name: 'hospital level 3', mut: (c) => { c.hospital = 3; }, cost: 120 + 240 + 360 + 3 * (20 * SUP + DAY) },
  { name: 'raise legionary cohort', mut: raise('legionary'), cost: rcost('legionary') },
  { name: 'raise slingers', mut: raise('slinger'), cost: rcost('slinger') },
  { name: 'raise archers', mut: raise('archer'), cost: rcost('archer') },
  { name: 'raise equites', mut: raise('equites'), cost: rcost('equites') },
  { name: 'raise allied infantry', mut: raise('aux_inf'), cost: rcost('aux_inf') }
].filter(v => v.name === 'baseline' || v.name.includes(FILTER));

const stats = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length, v = a.reduce((x, y) => x + (y - m) ** 2, 0) / Math.max(1, a.length - 1); return { m, se: Math.sqrt(v / a.length) }; };
const res = {};
for (const v of VARIANTS) {
  const S = [], W = [];
  for (const i of SCENS) for (let n = 0; n < SEEDS; n++) {
    let baseStart = 0;
    const r = play('tactician', i, 'normal', 1000 + n, (c) => { base(c); baseStart = c.cohorts.reduce((a, h) => a + h.men, 0); v.mut(c); });
    S.push(r.rows.filter(x => x.cohortId != null).reduce((a, x) => a + x.endMen, 0) - baseStart); W.push(r.outcome === 'victory' ? 100 : 0);
  }
  res[v.name] = { S: stats(S), W: stats(W), cost: v.cost, n: S.length };
}
const b = res.baseline;
console.log(`\n${SCENS.length} scenarios x ${SEEDS} seeds = ${b.n} battles per option. Baseline: army size change ${b.S.m.toFixed(0)} (+/-${b.S.se.toFixed(0)}), win rate ${b.W.m.toFixed(0)}%\n`);
console.log('option'.padEnd(28), 'cost'.padStart(5), 'men saved'.padStart(10), '+/-'.padStart(4), 'win pts'.padStart(8), 'men/100cost'.padStart(12), 'win pts/100cost'.padStart(16));
for (const v of VARIANTS) {
  if (v.name === 'baseline') continue; const r = res[v.name], dS = r.S.m - b.S.m, dW = r.W.m - b.W.m, se = Math.hypot(r.S.se, b.S.se);
  console.log(v.name.padEnd(28), String(Math.round(r.cost)).padStart(5), dS.toFixed(0).padStart(10), se.toFixed(0).padStart(4), dW.toFixed(1).padStart(8), (dS / r.cost * 100).toFixed(2).padStart(12), (dW / r.cost * 100).toFixed(2).padStart(16));
}
