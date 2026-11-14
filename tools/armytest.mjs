// Army composition test: how do different mixes of the same number of units fare against the same enemies?
//   node tools/armytest.mjs [runs] [opponent|all] [mode]
// mode 'slots' (default): every army fills 20 command slots at full strength (horse, missile troops, engines and medici take half a slot),
// topped up with legionary cohorts. mode 'units': 20 units each, whatever they are (the old rule).
// mode 'cost': every army costs about the same to raise (20 legionary cohorts' worth of denarii).
// The Roman side is played by the 'smart' test bot (triplex lines, cohorts relieve each other, horse on the wings, missile troops screening).
import { Battle } from '../src/sim.js';
import { SCENARIOS, RAISE } from '../src/data.js';
import { smartBot } from './simtest.mjs';
import { slotOf } from '../src/state.js';

const RUNS = +process.argv[2] || 6, ONLY = process.argv[3] && process.argv[3] !== 'all' ? process.argv[3] : null, MODE = process.argv[4] || 'slots';
const XP = 300, DRILL = 30;

// Roman armies of 20 units: L legionary, A archer, S slinger, E equites, C allied horse, Q scorpion, M medici
const COMPS = {
  '20 legions': { legionary: 20 },
  '15L 3 archers 2 equites': { legionary: 15, archer: 3, equites: 2 },
  '15L 5 slingers': { legionary: 15, slinger: 5 },
  '16L 4 equites': { legionary: 16, equites: 4 },
  '14L 2A 2S 2E': { legionary: 14, archer: 2, slinger: 2, equites: 2 },
  '16L 2A 2 scorpiones': { legionary: 16, archer: 2, scorpion: 2 },
  '17L 2E 1 medici': { legionary: 17, equites: 2, medici: 1 }
};
const line = (n, men, type, y, ai, spread = 115, cx = 2000) => Array.from({ length: n }, (_, i) => ({ type, men, x: cx + (i - (n - 1) / 2) * spread, y, ai }));
const OPP = {
  pompeian20: () => [...line(12, 480, 'pompeian', 800, { kind: 'rush', delay: 20 }), ...line(8, 480, 'pompeian', 600, { kind: 'rush', delay: 60, reserve: true })],
  pompeianMix: () => [...line(9, 480, 'pompeian', 800, { kind: 'rush', delay: 20 }), ...line(6, 480, 'pompeian', 600, { kind: 'rush', delay: 60, reserve: true }),
    ...line(3, 130, 'pomp_missile', 900, { kind: 'skirm' }, 300), { type: 'pomp_cav', men: 60, x: 3100, y: 820, ai: { kind: 'flank', delay: 10 } }, { type: 'pomp_cav', men: 60, x: 900, y: 820, ai: { kind: 'flank', delay: 10 } }],
  gauls: () => [...line(16, 520, 'warband', 800, { kind: 'rush', delay: 15 }, 120), ...line(3, 160, 'gaul_skirm', 900, { kind: 'skirm' }, 400),
    { type: 'gaul_cav', men: 180, x: 3200, y: 820, ai: { kind: 'flank', delay: 8 } }, { type: 'gaul_cav', men: 180, x: 800, y: 820, ai: { kind: 'flank', delay: 8 } }, { type: 'gaul_cav', men: 180, x: 3400, y: 700, ai: { kind: 'flank', delay: 14 } }],
  numidians: () => [...line(8, 480, 'pompeian', 800, { kind: 'rush', delay: 25 }), ...line(4, 300, 'numid_inf', 900, { kind: 'skirm' }, 300),
    ...[700, 900, 3100, 3300].map((x, i) => ({ type: 'numid_cav', men: 150, x, y: 820 + (i % 2) * 90, ai: { kind: 'flank', delay: 6 + i * 2 } })), ...line(2, 480, 'pompeian', 600, { kind: 'rush', delay: 60, reserve: true })]
};

// In 'cost' mode the army is scaled to the same denarii as 20 legionary cohorts at full strength, by adding or dropping legionaries.
function army(comp) {
  const c = { ...comp };
  if (MODE === 'slots') { const used = () => Object.entries(c).reduce((a, [t, n]) => a + n * slotOf(t), 0); while (used() + 1 <= 20) c.legionary++; }
  if (MODE === 'cost') {
    const cost = (k) => Object.entries(k).reduce((a, [t, n]) => a + n * RAISE[t].gold * (RAISE[t].max / RAISE[t].men), 0), target = 20 * RAISE.legionary.gold * (480 / 300);
    while (cost(c) + RAISE.legionary.gold * 1.6 <= target + 1) c.legionary++;
  }
  const specs = []; let id = 1;
  for (const [type, n] of Object.entries(c)) for (let i = 0; i < n; i++) specs.push({ type, name: `${type} ${i + 1}`, cohortId: id++, men: RAISE[type].max, maxMen: RAISE[type].max, xp: XP, drill: DRILL, condition: 100, officer: null, x: 2000 + (specs.length % 12 - 5.5) * 105, y: 2150 + Math.floor(specs.length / 12) * 90, f: -Math.PI / 2, stance: 'aggressive' });
  return specs;
}

const base = SCENARIOS.find(s => s.id === 'pharsalus');
function fight(specs, opp, seed) {
  const scn = { ...base, id: 'arena', name: 'Arena', terrain: [], enemy: OPP[opp](), reinforcements: [], timeLimit: 1500, deploy: { mode: 'line', cx: 2000, cy: 2150 }, dry: false, chief: { name: 'test', style: 'balanced' } };
  const b = new Battle(scn, specs.map(s => ({ ...s })), { difficulty: 'normal', seed, forceScale: 1 });
  const rome = b.units.filter(u => u.side === 'rome' && !u.type.medic), S = {};
  let guard = 0;
  while (!b.result && guard++ < 20000) { smartBot(b, rome, S); b.update(0.1); }
  return b.result;
}

const opps = ONLY ? [ONLY] : Object.keys(OPP);
console.log(`mode ${MODE}, ${RUNS} runs each, Roman xp ${XP} drill ${DRILL}`);
for (const opp of opps) {
  console.log(`\n== vs ${opp} ==`);
  for (const [name, comp] of Object.entries(COMPS)) {
    const specs = army(comp), men = specs.reduce((a, s) => a + s.men, 0), t = { victory: 0, draw: 0, defeat: 0 }; let lost = 0, killed = 0, time = 0;
    for (let n = 0; n < RUNS; n++) { const r = fight(specs, opp, 2000 + n); t[r.outcome]++; lost += r.rows.reduce((a, x) => a + x.casualties, 0); killed += r.enemyDead; time += r.time; }
    const legs = specs.filter(s => s.type === 'legionary').length;
    console.log(`${name.padEnd(26)} ${String(specs.length).padStart(2)} units (${legs}L) ${String(men).padStart(5)} men  W${t.victory} D${t.draw} L${t.defeat}  lost ${String(Math.round(lost / RUNS)).padStart(5)}  killed ${String(Math.round(killed / RUNS)).padStart(5)}  ${Math.round(time / RUNS)}s`);
  }
}
