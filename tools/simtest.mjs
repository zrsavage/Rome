// Headless balance harness: node tools/simtest.mjs [runs] [scenarioIndex|all] [difficulty|all]
// Plays each scenario with the army you'd plausibly have at that point, using simple scripted "players".
import { Battle } from '../src/sim.js';
import { SCENARIOS } from '../src/data.js';
import { newCampaign, romeSpecs, modsOf } from '../src/state.js';
import { triplexLayout } from '../src/orders.js';

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


// A bot that plays like a person who knows the rules: it forms the triplex acies, fights with the front line, rotates tired cohorts, keeps a reserve
// for trouble, sends horse into the rear of engaged enemies, falls back skirmishers through the line, keeps the general near the front and rallies.
function smartBot(b, rome, S) {
  const dt = 0.1, active = (u) => u.active && u.present;
  if (b.t < 0.2) {
    const live = rome.filter(active), gs = b.units.filter(u => u.side === 'gaul' && active(u));
    const cx = live.reduce((a, u) => a + u.x, 0) / live.length, cy = live.reduce((a, u) => a + u.y, 0) / live.length;
    const gx = gs.length ? gs.reduce((a, u) => a + u.x, 0) / gs.length : cx, gy = gs.length ? gs.reduce((a, u) => a + u.y, 0) / gs.length : cy - 500;
    S.f = Math.atan2(gy - cy, gx - cx);
    const ents = triplexLayout(live, cx, cy, S.f), rank = ents.filter(e => e.u.type.cat === 'inf').map(e => ({ u: e.u, fw: (e.x - cx) * Math.cos(S.f) + (e.y - cy) * Math.sin(S.f) })).sort((a, c) => c.fw - a.fw);
    rank.forEach((r, i) => { r.u.botRow = i < Math.ceil(rank.length * 0.4) ? 0 : i < Math.ceil(rank.length * 0.7) ? 1 : 2; });
    b.setMoveGroup(ents.map(e => ({ ...e, x: Math.max(30, Math.min(1e5, e.x)), y: Math.max(30, e.y) })));
    for (const u of live) { if (u.type.cat === 'inf') u.rotate = true; if (u.type.cat === 'cav') u.cycle = true; }
    S.t = 0; return;
  }
  if (b.t - (S.t || 0) < 1.5) return; S.t = b.t;
  const live = rome.filter(active), inf = live.filter(u => u.type.cat === 'inf'), enemies = b.units.filter(u => u.side === 'gaul' && active(u) && u.type.cat !== 'cav' || (u.side === 'gaul' && active(u) && u.type.cat === 'cav'));
  const engagedE = enemies.filter(e => e.contacts.some(c => c.side === 'rome' && c.active));
  const nearestTo = (u, list) => { let best = null, bg = 1e9; for (const e of list) { const g = b.gap(u, e); if (g < bg) { bg = g; best = e; } } return best ? { e: best, gap: bg } : null; };
  const trouble = live.filter(u => u.state === 'routing' || u.flanked || u.surrounded || (u.contacts.some(e => e.active) && u.morale < u.maxMorale * 0.4));
  const rule = b.rule, obj = b.objectives[0];
  for (const u of live) {
    if (u.type.cat === 'inf') {
      if (u.contacts.some(e => e.active)) continue;
      const row = u.botRow ?? 0;
      if (u.order.back) continue;
      const near = nearestTo(u, enemies), nearEng = nearestTo(u, engagedE);
      if (row === 0 && near && near.gap < 300) b.setAttack(u, near.e);
      else if (row === 1 && (nearEng && nearEng.gap < 200 || near && near.gap < 160)) b.setAttack(u, (nearEng && nearEng.gap < 200 ? nearEng : near).e);
      else if (row === 2 && trouble.length) { const t0 = trouble[0], tgt = nearestTo(t0, enemies); if (tgt && b.gap(u, tgt.e) < 600) b.setAttack(u, tgt.e); }
      else if (rule && rule.attacker === 'rome' && obj && b.t > 35 && !near && u.order.kind === 'none') b.setMove(u, obj.x, obj.y + (row - 1) * 80, S.f, false, false);
      else if (rule && rule.attacker === 'gaul' && obj && row === 2 && u.order.kind === 'none' && Math.hypot(u.x - obj.x, u.y - obj.y) > 180) b.setMove(u, obj.x, obj.y + 60, S.f, true);
    } else if (u.type.cat === 'cav') {
      if (u.order.kind === 'attack' || u.cyc) continue;
      const cand = engagedE.filter(e => e.type.cat !== 'cav'); const t0 = nearestTo(u, cand.length ? cand : b.units.filter(e => e.side === 'gaul' && active(e) && e.type.cat === 'ranged'));
      if (t0 && b.t > 20) b.setAttack(u, t0.e, true);
    }
  }
  if (b.general) {
    const front = inf.filter(u => (u.botRow ?? 0) === 0 && active(u)); const eng = live.filter(u => u.contacts.some(e => e.active));
    const base = eng.length ? eng : front.length ? front : live;
    if (base.length) { const mx = base.reduce((a, u) => a + u.x, 0) / base.length, my = base.reduce((a, u) => a + u.y, 0) / base.length; b.moveGeneral(mx - Math.cos(S.f) * 70, my - Math.sin(S.f) * 70); }
    if (b.rallyCd <= 0 && live.filter(u => u.morale < u.maxMorale * 0.4).length + live.filter(u => u.state === 'routing').length >= 2) b.rally();
  }
}

export { campaignAt };
export function play(strategy, i, difficulty, seed, mutate = null) {
  const scn = SCENARIOS[i], c = campaignAt(i, difficulty);
  if (mutate) mutate(c, seed);   // camp decisions applied before the battle (used by tools/campbalance.mjs)
  const m = modsOf(c);
  const b = new Battle(scn, romeSpecs(c, scn), { difficulty, seed, fort: c.fort, recovery: m.recovery, moraleBonus: m.morale });
  const rome = b.units.filter(u => u.side === 'rome');
  const dt = 0.1;
  let guard = 0;
  while (!b.result && guard++ < 20000) {
    if (b.general && Math.abs(b.t % 3) < dt) { const live = rome.filter(u => u.active && u.type.cat === 'inf'); if (live.length) b.moveGeneral(live.reduce((a, u) => a + u.x, 0) / live.length, live.reduce((a, u) => a + u.y, 0) / live.length + 70); }   // the general trails the line
    if (strategy === 'charge' && b.t < 0.2) rome.forEach(u => { const n = b.nearestEnemy(u); if (n) b.setAttack(u, n.e); });
    if (strategy === 'objective' && b.t < 0.2) {
      // advance infantry on the objective (if any), hold cavalry/ranged back until contact
      const o = b.objectives[0];
      rome.forEach(u => { if (o && u.type.cat === 'inf') b.setMove(u, o.x + (u.x - 800) * 0.4, o.y + 80, -Math.PI / 2); else { const n = b.nearestEnemy(u); if (n) b.setAttack(u, n.e); } });
    }
    if (strategy === 'hold' && b.t < 0.2) rome.forEach(u => { if (u.type.cat === 'inf') u.stance = 'hold'; });
    if (strategy === 'retreat' && b.t > 60) b.retreatAll();
    if (strategy === 'smart') smartBot(b, rome, (b._bot = b._bot || {}));
    if (strategy === 'tactician') {
      // default stance is 'defend post' (engage nearby enemies, then return); no blanket hold
      if (b.t < 0.2 && b.rule && b.rule.attacker === 'gaul') { const o = b.objectives[0]; rome.filter(u => u.type.cat === 'inf').forEach((u, i, a) => b.setMove(u, o.x + (i - (a.length - 1) / 2) * 70, o.y + 30, -Math.PI / 2)); }
      if (Math.abs(b.t % 2) < dt) {
        const engagedEnemies = new Set(); rome.forEach(u => { if (u.active && u.type.cat === 'inf') u.contacts.forEach(e => { if (e.active) engagedEnemies.add(e); }); });
        for (const u of rome) {
          if (!u.active) continue;
          const n = b.nearestEnemy(u);
          if (u.type.cat === 'inf') {
            const tgt = u.order.kind === 'attack' ? b.byId(u.order.targetId) : null;
            if (u.contacts.some(e => e.active)) continue;
            if (u.order.back) continue; if (u.fatigue > 65 && (!n || n.gap > 60) && !(u.fbT > b.t)) { b.fallBack(u); u.fbT = b.t + 45; continue; }   // rest for a while after falling back
            const guard = b.rule && b.rule.attacker === 'gaul' ? b.objectives[0] : null;   // defending: stay near the objective
            const threatened = guard && b.units.some(e => e.side === 'gaul' && e.active && Math.hypot(e.x - guard.x, e.y - guard.y) < 260);
            const keeper = guard && u === rome.find(x => x.type.cat === 'inf');           // one cohort always stays on the wagons
            const reach = !guard ? 140 : (keeper || threatened) ? 140 : 1e9;              // others hunt stragglers once the wagons are safe
            if (n && n.gap < reach && (!tgt || !tgt.active) && (!guard || !keeper || Math.hypot(n.e.x - guard.x, n.e.y - guard.y) < 230)) b.setAttack(u, n.e);
            else if (!n || n.gap > 200) { if (u.order.kind === 'attack') u.order = { kind: 'none' }; }
          } else if (u.type.cat === 'cav') {
            const tgt = u.order.kind === 'attack' ? b.byId(u.order.targetId) : null;
            if (tgt && tgt.present) continue;
            let best = null, bd = 1e9; for (const e of engagedEnemies) { const g = b.gap(u, e); if (g < bd) { bd = g; best = e; } }
            if (!best && b.t > 60) { const nn = b.nearestEnemy(u, e => e.active && e.type.cat === 'ranged'); if (nn) best = nn.e; }
            if (best) b.setAttack(u, best);
          }
        }
      }
    }
    b.update(dt);
    if (process.env.TRACEU && Math.abs(b.t % 20) < dt / 2) { const u = b.units.find(x => x.name === process.env.TRACEU); if (u) console.log('  U', Math.round(b.t), Math.round(u.x), Math.round(u.y), u.state, u.order.kind, u.order.x ? Math.round(u.order.x) + ',' + Math.round(u.order.y) : '', 'post', Math.round(u.post.x) + ',' + Math.round(u.post.y), 'men', u.men, 'f', u.f.toFixed(2)); }
    if (process.env.TRACE && Math.abs(b.t % 30) < dt / 2) console.log('   t' + String(Math.round(b.t)).padStart(4), 'R', rome.filter(u => u.present).map(u => u.name.slice(0, 3) + u.men + (u.state === 'routing' ? 'R' : u.fighting ? 'f' : u.state[0])).join(' '), '| G', b.units.filter(u => u.side === 'gaul' && u.present).map(u => u.typeKey[0] + u.men + (u.state === 'routing' ? 'R' : u.fighting ? 'f' : u.state[0])).join(' '));
  }
  if (process.env.DEBUG2) console.log(b.units.filter(u => u.present).map(u => `${u.side[0]}:${u.name.slice(0, 8)} ${Math.round(u.x)},${Math.round(u.y)} ${u.state}/${u.order.kind}${u.order.x ? '>' + Math.round(u.order.x) + ',' + Math.round(u.order.y) : ''} ${u.role || ''}${u.blocked ? ' BLOCKED' : ''}`).join('\n'));
  if (process.env.DEBUG) b.result._log = b.log.filter(l => !/hurls|rallies|crashes/.test(l.msg)).slice(-2).map(l => l.msg).join(' / ') + ` [rome ${Math.round(b.activeMen('rome'))} gaul ${Math.round(b.activeMen('gaul'))} hold ${JSON.stringify(b.hold)}]`;
  return b.result;
}

const MAIN = process.argv[1] && process.argv[1].endsWith('simtest.mjs');
const strategies = (process.env.STRATS || 'tactician,charge,hold,retreat').split(',');
for (const i of MAIN ? SEL : []) {
  console.log(`\n== ${i + 1}. ${SCENARIOS[i].name} ==`);
  for (const diff of DIFFS) for (const strat of strategies) {
    const tally = { victory: 0, draw: 0, defeat: 0 }; let time = 0, loss = 0, kill = 0;
    for (let n = 0; n < RUNS; n++) {
      const r = play(strat, i, diff, 1000 + n);
      if (!r) { console.log('NO RESULT', diff, strat, n); continue; }
      if (process.env.DEBUG) console.log('   ', r.outcome, Math.round(r.time) + 's', r._log);
      tally[r.outcome]++; time += r.time; loss += r.rows.reduce((a, x) => a + x.casualties, 0); kill += r.enemyDead;
    }
    console.log(`${diff.padEnd(9)} ${strat.padEnd(9)} W${String(tally.victory).padStart(3)} D${String(tally.draw).padStart(3)} L${String(tally.defeat).padStart(3)}  avg ${(time / RUNS).toFixed(0)}s  lost ${(loss / RUNS).toFixed(0)}  killed ${(kill / RUNS).toFixed(0)}`);
  }
}
