// Headless balance harness: node tools/simtest.mjs [runs] [scenarioIndex|all] [difficulty|all]
// Plays each scenario with the army you'd plausibly have at that point, using simple scripted "players".
import { Battle } from '../src/sim.js';
import { SCENARIOS } from '../src/data.js';
import { newCampaign, romeSpecs } from '../src/state.js';

const RUNS = +process.argv[2] || 20;
const SEL = process.argv[3] && process.argv[3] !== 'all' ? [+process.argv[3]] : SCENARIOS.map((_, i) => i);
const DIFFS = process.argv[4] && process.argv[4] !== 'all' ? [process.argv[4]] : ['easy', 'normal', 'hard', 'legendary'];

function campaignAt(i, difficulty) {
  const c = newCampaign(difficulty);
  for (let k = 0; k < i; k++) {
    for (const u of SCENARIOS[k].unlock || []) c.cohorts.push({ id: c.cohorts.length + 10, name: u.name, type: u.type, men: u.men, maxMen: u.maxMen, xp: u.xp, drill: u.drill, condition: 100, officerId: null });
    c.cohorts.forEach(h => { h.xp += 35; h.drill = Math.min(100, h.drill + 5); h.men = Math.min(h.maxMen, h.men + 18 + Math.round((h.maxMen - h.men) * 0.25)); });
  }
  c.cohorts.forEach(h => { h.condition = 95; });
  c.fort = Math.min(2, Math.floor(i / 2));
  return c;
}

function play(strategy, i, difficulty, seed) {
  const scn = SCENARIOS[i], c = campaignAt(i, difficulty);
  const b = new Battle(scn, romeSpecs(c, scn), { difficulty, seed, fort: c.fort });
  const rome = b.units.filter(u => u.side === 'rome');
  const dt = 0.1;
  let guard = 0;
  while (!b.result && guard++ < 12000) {
    if (strategy === 'charge' && b.t < 0.2) rome.forEach(u => { const n = b.nearestEnemy(u); if (n) b.setAttack(u, n.e); });
    if (strategy === 'objective' && b.t < 0.2) {
      // advance infantry on the objective (if any), hold cavalry/ranged back until contact
      const o = b.objectives[0];
      rome.forEach(u => { if (o && u.type.cat === 'inf') b.setMove(u, o.x + (u.x - 800) * 0.4, o.y + 80, -Math.PI / 2); else { const n = b.nearestEnemy(u); if (n) b.setAttack(u, n.e); } });
    }
    if (strategy === 'hold' && b.t < 0.2) rome.forEach(u => { if (u.type.cat === 'inf') u.stance = 'hold'; });
    if (strategy === 'retreat' && b.t > 60) b.retreatAll();
    b.update(dt);
  }
  return b.result;
}

const strategies = ['charge', 'objective', 'hold', 'retreat'];
for (const i of SEL) {
  console.log(`\n== ${i + 1}. ${SCENARIOS[i].name} ==`);
  for (const diff of DIFFS) for (const strat of strategies) {
    const tally = { victory: 0, draw: 0, defeat: 0 }; let time = 0, loss = 0, kill = 0;
    for (let n = 0; n < RUNS; n++) {
      const r = play(strat, i, diff, 1000 + n);
      if (!r) { console.log('NO RESULT', diff, strat, n); continue; }
      tally[r.outcome]++; time += r.time; loss += r.rows.reduce((a, x) => a + x.casualties, 0); kill += r.enemyDead;
    }
    console.log(`${diff.padEnd(9)} ${strat.padEnd(9)} W${String(tally.victory).padStart(3)} D${String(tally.draw).padStart(3)} L${String(tally.defeat).padStart(3)}  avg ${(time / RUNS).toFixed(0)}s  lost ${(loss / RUNS).toFixed(0)}  killed ${(kill / RUNS).toFixed(0)}`);
  }
}
