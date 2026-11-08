// Headless balance harness: node tools/simtest.mjs [runs]
// Compares a few simple "player" strategies on every difficulty.
import { Battle } from '../src/sim.js';
import { SCENARIOS } from '../src/data.js';
import { newCampaign, romeSpecs } from '../src/state.js';

const RUNS = +process.argv[2] || 30;

function play(strategy, difficulty, seed) {
  const c = newCampaign(difficulty);
  const b = new Battle(SCENARIOS[0], romeSpecs(c), { difficulty, seed });
  const rome = b.units.filter(u => u.side === 'rome');
  const inf = rome.filter(u => u.typeKey === 'legionary');
  const dt = 0.1;
  let guard = 0;
  if (strategy === 'hold') rome.forEach(u => { u.stance = 'hold'; });
  while (!b.result && guard++ < 20000) {
    if (strategy === 'charge' && b.t < 0.2) rome.forEach(u => { const n = b.nearestEnemy(u); if (n) b.setAttack(u, n.e); });
    if (strategy === 'smart') {
      // hold the line to receive the charge, cavalry and slingers act on their own
      if (b.t < 0.2) { inf.forEach(u => (u.stance = 'hold')); }
      if (b.t > 60 && b.t % 5 < dt) rome.forEach(u => { if (u.active && u.order.kind === 'none') u.stance = 'aggressive'; });
    }
    if (strategy === 'retreat' && b.t > 40) b.retreatAll();
    b.update(dt);
  }
  return b.result;
}

for (const diff of ['easy', 'normal', 'hard', 'legendary']) {
  for (const strat of ['hold', 'smart', 'charge', 'retreat']) {
    const tally = { victory: 0, draw: 0, defeat: 0 };
    let time = 0, loss = 0, kill = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = play(strat, diff, 1000 + i);
      if (!r) { console.log('NO RESULT', diff, strat, i); continue; }
      tally[r.outcome]++; time += r.time;
      loss += r.rows.reduce((a, x) => a + x.casualties, 0);
      kill += r.enemyDead;
    }
    console.log(`${diff.padEnd(9)} ${strat.padEnd(8)} W${String(tally.victory).padStart(3)} D${String(tally.draw).padStart(3)} L${String(tally.defeat).padStart(3)}  avg ${(time / RUNS).toFixed(0)}s  lost ${(loss / RUNS).toFixed(0)}  killed ${(kill / RUNS).toFixed(0)}`);
  }
}
