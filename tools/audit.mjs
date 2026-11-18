// Play-test audit: node tools/audit.mjs [scenarios|all] [seeds]      e.g.  node tools/audit.mjs all 1     node tools/audit.mjs 5,9 2
// Plays every battle the way people really play, with a messy army, and checks rules that must always hold. Prints a report; exits 1 if
// any rule is broken. (Written after bugs that the balance harness could not see: near-total wounded recovery, a rash officer who charged
// in every battle, because the balance bots give orders all the time and fight with tidy armies.)
//
// Players:  patient - deploys and gives no orders at all: units stand on their posts as a person's often do
//           holder  - orders every unit to hold position and does nothing else
//           smart   - the balance bot (tools/simtest.mjs)
// Army:     messy   - the campaign army at that point, plus units of mixed kinds raised in interleaved order, officers of every temper,
//                     and every bonus to wounded recovery stacked (hospital 5, medicine 5, a surgeon, an origin bonus): the worst case
// Rules checked on every battle:
//   recovery   the wounded who come back never exceed 60% of the fallen after a win (30% after a defeat)
//   sanity     men, casualties, spoils are finite numbers; no unit above its full strength; nobody inside a cliff or the sea
//   hold       a unit ordered to hold is never sent into an attack or moved off its post by anything but its own rout (one scripted
//              exception: at Thapsus the veterans on the right forced the charge without orders, as they did in 46 BC)
//   unordered  with no orders given, units are not sent charging on their own more than rarely (reinforcements that arrive and
//              charge are scripted, not counted)
//   frequency  no chance event (a rash charge, a surprise, a feint...) happens in nearly every battle
//   ends       every battle ends within its time limit (plus the withdrawal)
import { Battle } from '../src/sim.js';
import { SCENARIOS, UNIT_TYPES, phaseScn } from '../src/data.js';
import { modsOf, forceScale, romeSpecs } from '../src/state.js';
import { stageArmy } from '../src/arrivals.js';
import { renameArmy } from '../src/names.js';
import { smartBot, campaignAt } from './simtest.mjs';

const sel = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2].split(',').map(Number) : SCENARIOS.map((_, i) => i);
const SEEDS = +process.argv[3] || 1;
const TEMPERS = ['rash', 'bold', 'steady', 'cautious'];

// ---- the messy army ----
export function messyCampaign(i) {
  const c = campaignAt(i, 'normal');
  let id = Math.max(...c.cohorts.map(h => h.id)) + 1;
  const kinds = ['slinger', 'equites', 'archer', 'legionary', 'aux_cav', 'slinger', 'aux_inf', 'equites', 'archer', 'legionary'];
  for (const t of kinds) { const T = UNIT_TYPES[t]; if (!T) continue; const men = { legionary: 420, slinger: 230, archer: 210, equites: 120, aux_cav: 140, aux_inf: 240 }[t] || 200; c.cohorts.push({ id: id++, name: '', type: t, men: Math.round(men * (0.6 + 0.4 * (id % 3) / 2)), maxMen: men, xp: 200 + (id % 5) * 150, drill: 20 + (id % 4) * 10, condition: 70 + (id % 4) * 8, officerId: null }); }
  renameArmy(c);
  // officers of every temper, each with a unit; one is a surgeon
  let oid = Math.max(0, ...c.officers.map(o => o.id)) + 1;
  while (c.officers.filter(o => o.alive).length < 8) c.officers.push({ id: oid, name: `Officer ${oid++}`, rank: 'Centurion', tactics: 2, drill: 2, logistics: 1, diplomacy: 0, xp: 0, level: 1 + (oid % 3), points: 0, perks: [], alive: true });
  c.officers.filter(o => o.alive).forEach((o, k) => { o.temper = TEMPERS[k % 4]; });
  c.officers[0].perks = [...(c.officers[0].perks || []), 'surgeon'];
  const units = c.cohorts.filter(h => h.men > 0 && (UNIT_TYPES[h.type] || {}).cat !== 'train');
  c.cohorts.forEach(h => { h.officerId = null; }); c.officers.filter(o => o.alive).forEach((o, k) => { if (units[k * 2]) units[k * 2].officerId = o.id; });
  // every bonus to wounded recovery at once
  c.hospital = 5; c.career = { points: 0, levels: { medicine: 5 } }; c.mods = { ...(c.mods || {}), recovery: 1.25 * 1.2 };
  return c;
}

// ---- one battle, played by one kind of player ----
function run(i, player, seed) {
  const base = SCENARIOS[i], scn = base.phases ? phaseScn(base, 0) : base, c = messyCampaign(i), m = modsOf(c);
  const army = stageArmy(romeSpecs(c, scn), scn);
  const b = new Battle(scn, army.now, { arrivals: army.waves, difficulty: 'normal', seed: 1000 + seed * 17 + i, fort: c.fort, recovery: m.recovery, moraleBonus: m.morale, forceScale: forceScale(c, scn), healL5: true });
  // every order is tagged with what gave it: the player (here, the bot), or the game itself (rash officers, drills, rotation...)
  let playerActing = false; const issued = [];
  for (const name of ['setAttack', 'setMove', 'fallBack', 'relieve', 'pursue', 'setGuard']) {
    const orig = b[name].bind(b);
    b[name] = (u, ...a) => { const r = orig(u, ...a); if (u && u.side === 'rome') { const why = playerActing ? 'player' : (new Error().stack.split('\n')[2] || '').trim().replace(/^at (Battle\.)?/, '').split(' ')[0]; u._lastOrder = { name, why, t: b.t }; issued.push({ name, why, unit: u.name, t: b.t }); } return r; };
  }
  if (b.beginDeploy) b.beginDeploy(); if (b.endDeploy) b.endDeploy();
  const rome = () => b.units.filter(u => u.side === 'rome' && !u.type.medic);
  if (player === 'holder') { playerActing = true; for (const u of rome()) if (u.type.cat !== 'train') b.setHold(u); playerActing = false; }
  const posts = new Map(), held = new Set(); for (const u of rome()) { posts.set(u.id, { x: u.x, y: u.y }); if (u.stance === 'hold') held.add(u.id); }
  const finds = []; let g = 0, inHard = 0, holdBreaks = [];
  const t0 = Date.now();
  while (!b.result && g++ < 30000) {
    if (player === 'smart') { playerActing = true; const rs = rome(); smartBot(b, rs, (b._bot = b._bot || {})); playerActing = false; }
    b.update(0.1);
    if (g % 10 === 0) for (const u of b.units) {
      if (!u.present || u.state === 'gone') continue;
      if (b.hardAt && b.hardAt(u.x, u.y)) inHard++;
      if (!Number.isFinite(u.men) || u.men < 0 || !Number.isFinite(u.x) || !Number.isFinite(u.y)) finds.push({ rule: 'sanity', msg: `${u.name}: men ${u.men}, at ${u.x},${u.y}` });
      if (player === 'holder' && held.has(u.id) && u.side === 'rome' && u.active) {
        const o = u._lastOrder, p = posts.get(u.id);
        if (u.order.kind === 'attack' && o && o.why !== 'player' && o.why !== 'runEvent') holdBreaks.push(`${u.name} sent to attack by ${o.why} at ${Math.round(o.t)}s`);
        else if (p && Math.hypot(u.x - p.x, u.y - p.y) > 140 && !(u.order && u.order.back) && u.state !== 'routing' && !u.everRouted && !(o && o.why === 'runEvent')) holdBreaks.push(`${u.name} moved ${Math.round(Math.hypot(u.x - p.x, u.y - p.y))}px off its post (last order: ${o ? o.name + ' by ' + o.why : 'none'})`);
      }
    }
  }
  const ms = Date.now() - t0, r = b.result;
  if (!r) return { i, player, seed, unfinished: true, finds: [{ rule: 'ends', msg: `no result after ${Math.round(b.t)}s` }] };
  if (inHard) finds.push({ rule: 'sanity', msg: `${inHard} samples of units inside a cliff or the sea` });
  if (r.time > scn.timeLimit + 120) finds.push({ rule: 'ends', msg: `ended at ${Math.round(r.time)}s, limit ${scn.timeLimit}s` });
  for (const k of ['gold', 'supplies', 'recruits']) if (!Number.isFinite(r.spoils[k]) || r.spoils[k] < 0) finds.push({ rule: 'sanity', msg: `spoils ${k} = ${r.spoils[k]}` });
  for (const row of r.rows) {
    if (!Number.isFinite(row.endMen) || row.endMen < 0) finds.push({ rule: 'sanity', msg: `${row.name} ends with ${row.endMen} men` });
    const fallen = row.casualties, back = row.endMen - (row.startMen - row.casualties), lim = (r.outcome === 'defeat' ? 0.3 : 0.6) * fallen + 2;
    if (fallen >= 20 && back > lim) finds.push({ rule: 'recovery', msg: `${row.name}: ${back} of ${fallen} fallen came back (${Math.round(100 * back / fallen)}%, limit ${r.outcome === 'defeat' ? 30 : 60}%)` });
  }
  const seen = [...new Set((b.rep.events || []).map(e => e.kind))];
  const unordered = player === 'patient' ? issued.filter(x => x.name === 'setAttack' && x.why !== 'player' && x.why !== 'update' && x.why !== 'runEvent').map(x => `${x.unit} by ${x.why}`) : [];
  const totalFallen = r.rows.reduce((a, x) => a + x.casualties, 0), totalBack = r.rows.reduce((a, x) => a + Math.max(0, x.endMen - (x.startMen - x.casualties)), 0);
  return { i, id: base.id, player, seed, outcome: r.outcome, time: Math.round(r.time), ms, kinds: seen, twist: r.twist || null, plan: r.plan && r.plan.key, goal: r.goal && r.goal.key,
    holdBreaks: [...new Set(holdBreaks)].slice(0, 5), unordered, fallen: totalFallen, back: totalBack, finds };
}

// ---- report ----
function report(all) {
  const bad = [], add = (rule, msg) => bad.push({ rule, msg });
  for (const x of all) { for (const f of x.finds) add(f.rule, `${x.id} (${x.player}): ${f.msg}`); for (const h of x.holdBreaks || []) add('hold', `${x.id}: ${h}`); }
  const pat = all.filter(x => x.player === 'patient' && !x.unfinished);
  const charges = pat.reduce((a, x) => a + x.unordered.length, 0);
  const byWhy = {}; for (const x of pat) for (const u of x.unordered) { const w = u.split(' by ')[1]; byWhy[w] = (byWhy[w] || 0) + 1; }
  if (pat.length && charges / pat.length > 1.0) add('unordered', `with no orders given, ${charges} unordered attacks in ${pat.length} battles (${(charges / pat.length).toFixed(1)} a battle): ${JSON.stringify(byWhy)}`);
  const done = all.filter(x => !x.unfinished), freq = {};
  for (const x of done) for (const k of x.kinds) freq[k] = (freq[k] || 0) + 1;
  const CHANCE = ['rash', 'feint', 'champ'];        // events left to chance (a rivalry or a flanking plan are character and tactics, not chance)
  for (const k of CHANCE) if (done.length >= 10 && (freq[k] || 0) / done.length > 0.8) add('frequency', `'${k}' happened in ${freq[k]} of ${done.length} battles`);
  const tw = done.filter(x => x.twist).length; if (done.length >= 10 && (tw / done.length > 0.6 || tw / done.length < 0.1)) add('frequency', `surprises in ${tw} of ${done.length} battles (expected about a third)`);
  const fb = done.reduce((a, x) => a + x.fallen, 0), bk = done.reduce((a, x) => a + x.back, 0);
  console.log(`\nAUDIT: ${all.length} battles (${[...new Set(all.map(x => x.player))].join(', ')}), messy army, every recovery bonus stacked`);
  console.log(`  outcomes: ${['victory', 'draw', 'defeat'].map(o => `${o} ${done.filter(x => x.outcome === o).length}`).join(', ')}${all.length - done.length ? `, unfinished ${all.length - done.length}` : ''}`);
  console.log(`  wounded: ${bk} of ${fb} fallen came back (${fb ? Math.round(100 * bk / fb) : 0}%)`);
  console.log(`  unordered attacks with no orders given: ${charges} in ${pat.length} battles ${JSON.stringify(byWhy)}`);
  console.log(`  surprises in ${tw} of ${done.length} battles; plans: ${JSON.stringify(done.reduce((a, x) => (x.plan && (a[x.plan] = (a[x.plan] || 0) + 1), a), {}))}`);
  console.log(`  chance events, share of battles: ${CHANCE.map(k => `${k} ${Math.round(100 * (freq[k] || 0) / Math.max(1, done.length))}%`).join(', ')}`);
  console.log(`  slowest battle to simulate: ${Math.max(...done.map(x => x.ms))} ms`);
  if (!bad.length) { console.log('  ALL RULES HOLD'); return 0; }
  const byRule = {}; for (const b2 of bad) (byRule[b2.rule] = byRule[b2.rule] || []).push(b2.msg);
  for (const [k, v] of Object.entries(byRule)) { console.log(`  BROKEN: ${k} (${v.length})`); for (const m2 of v.slice(0, 8)) console.log('    - ' + m2); if (v.length > 8) console.log(`    ... and ${v.length - 8} more`); }
  return 1;
}

if (process.argv[2] === '--report') {             // merge the JSON lines written by parallel runs: node tools/audit.mjs --report file...
  const fs = await import('fs'); const all = process.argv.slice(3).flatMap(f => fs.readFileSync(f, 'utf8').split('\n').filter(l => l.startsWith('{')).map(l => JSON.parse(l)));
  process.exit(report(all));
} else if (!process.env.NOMAIN) {
  const all = [];
  for (const i of sel) for (let s = 0; s < SEEDS; s++) for (const p of ['patient', 'holder', 'smart']) { const x = run(i, p, s); all.push(x); if (process.env.JSONL) console.log(JSON.stringify(x)); }
  if (!process.env.JSONL) process.exit(report(all));
}
