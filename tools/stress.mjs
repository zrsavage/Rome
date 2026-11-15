// Stress test: a late-campaign pitched battle with a full army (80 command slots: 60 cohorts and 40 support units, 100 units) against
// a host sized to it. Reports unit counts and how long the simulation takes per second of battle.
//   node tools/stress.mjs [scenarioId=munda] [battleSeconds=600] [writeSave]
import { Battle } from '../src/sim.js';
import { SCENARIOS, RAISE } from '../src/data.js';
import { newCampaign, romeSpecs, forceScale, modsOf } from '../src/state.js';
import { smartBot } from './simtest.mjs';
import fs from 'fs';

const ID = process.argv[2] || 'munda', SECS = +(process.argv[3] || 600), idx = SCENARIOS.findIndex(s => s.id === ID), scn = SCENARIOS[idx];
export function bigCampaign() {
  const c = newCampaign('normal'); c.cohorts = []; let id = 1;
  const add = (type, n, name) => { for (let i = 0; i < n; i++) c.cohorts.push({ id: id++, name: `${name} ${i + 1}`, type, men: RAISE[type].max, maxMen: RAISE[type].max, xp: 1400, drill: 60, condition: 95, officerId: null }); };
  add('legionary', 60, 'Cohort'); add('slinger', 10, 'Slingers'); add('archer', 10, 'Archers'); add('equites', 10, 'Equites'); add('aux_cav', 10, 'Allied Horse');
  c.prologueDone = true; c.introShown = true; c.scenario = idx; c.gold = 5000; c.supplies = 5000; c.version = 6;
  c.history = [{ id: 'prologue', outcome: 'victory' }, ...SCENARIOS.slice(0, idx).map(s => ({ id: s.id, outcome: 'victory' }))]; c.routeFor = scn.id;
  c.seenBuildings = ['training', 'barracks', 'depot', 'officers', 'hospital', 'forge', 'hall']; c.visitedBuildings = [...c.seenBuildings]; c.actsSeen = ['II', 'III', 'IV', 'V']; c.britain = 'go';
  c.doctrines = ['hold', 'fallback', 'lanes', 'testudo', 'works', 'rally', 'relief']; c.eventFor = idx;
  return c;
}
const MAIN = process.argv[1] && process.argv[1].endsWith('stress.mjs');
if (MAIN) {
  const c = bigCampaign();
  if (process.argv[4]) { fs.writeFileSync(process.argv[4], JSON.stringify(c)); console.log('wrote', process.argv[4]); }
  const t0 = performance.now();
  const b = new Battle(scn, romeSpecs(c, scn), { difficulty: 'normal', seed: 7, recovery: modsOf(c).recovery, forceScale: forceScale(c, scn) });
  const build = performance.now() - t0, rome = b.units.filter(u => u.side === 'rome'), foe = b.units.filter(u => u.side !== 'rome');
  console.log(`${scn.name}: ${rome.length} Roman units (${b.startRome} men) vs ${foe.length} enemy units (${b.startGaul} men; reinforcements may add more). Setup ${build.toFixed(0)} ms`);
  const S = {}, dt = 0.1; let worst = 0, total = 0, steps = 0, mark = 60;
  while (!b.result && b.t < SECS) {
    const a = performance.now(); smartBot(b, rome, S); b.update(dt); const e = performance.now() - a;
    total += e; steps++; worst = Math.max(worst, e);
    if (b.t >= mark) { console.log(`  t=${String(mark).padStart(3)}s  avg ${(total / steps).toFixed(2)} ms per 0.1 s step (${(total / steps * 10).toFixed(0)} ms per battle second), worst step ${worst.toFixed(1)} ms, units on field ${b.units.filter(u => u.present && u.active).length}, bodies ${b.bodies.length}`); mark += 60; }
  }
  console.log(`done at t=${b.t.toFixed(0)}s ${b.result ? b.result.outcome : '(time)'}; at 4x speed the browser needs ${(total / steps * 40).toFixed(0)} ms of sim per real second`);
}
