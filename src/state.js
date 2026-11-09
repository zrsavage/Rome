// Campaign state: cohorts, officers, resources. Plain JSON so it saves to localStorage.
import { XP_LEVELS, SCENARIOS, WORLD, START_TYPES, TYPE_UNLOCKS, UNIT_TYPES } from './data.js';
import { PERKS } from './perks.js';
import { levelFor } from './sim.js';

export const DEFAULT_MODS = { recovery: 1, supplyUse: 1, spoils: 1, forage: 1, levy: 1, morale: 0, xp: 1 };
// Effective campaign modifiers: origins, plus officer perks and the field hospital.
export function modsOf(c) {
  const m = { ...DEFAULT_MODS, ...(c.mods || {}) };
  const has = (id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
  if (has('quartermaster')) m.supplyUse *= 0.9;
  if (has('forager')) m.forage *= 1.2;
  if (has('surgeon')) m.recovery *= 1.2;
  m.recovery *= 1 + 0.30 * (c.hospital || 0);
  return m;
}
export const hasPerk = (c, id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
// A campaign grows an army from a handful of cohorts to 60-80 units by the final battles.
export const commandLimit = (c) => Math.min(80, 6 + Math.round((c.history || []).filter(h => h.outcome !== 'defeat').length * 2.2));
// ---- Enemy strength follows yours ----
// The Gauls gather in proportion to the army you bring (a little less than one for one, so a bigger and better army is still an
// advantage). Early battles are authored for the starting army; as your host grows to seventy units, so do the hosts that meet it.
export function armyPower(c) {
  let p = 0;
  for (const h of c.cohorts) {
    if (h.men <= 0) continue;
    const t = UNIT_TYPES[h.type], u = h.upg || {}, w = (t.cost || 60) / 60, lvl = levelFor(h.xp || 0);
    p += h.men * w * (1 + 0.07 * lvl) * (1 + 0.1 * Math.min(100, h.drill || 0) / 100) * (1 + 0.05 * ((u.armour || 0) + (u.weapon || 0)));
  }
  return p;
}
let POWER_REF = 0;
export const powerRef = () => POWER_REF || (POWER_REF = armyPower(newCampaign('normal')));
export function forceScale(c, scn) {
  if (!scn || scn.id === 'prologue' || scn.practice || scn.id === 'practice') return 1;
  return Math.max(0.8, Math.min(20, Math.pow(armyPower(c) / powerRef(), 0.9)));
}
export const unlockedTypes = (c) => c.unlockedTypes || START_TYPES;

export function newCampaign(difficulty = 'normal') {
  return {
    version: 3, difficulty, hospital: 0, doctrines: [], unlockedTypes: [...START_TYPES], prologueDone: false, introShown: false, mods: { ...DEFAULT_MODS }, player: { name: 'Gaius Aurelius', picks: {} }, scenario: 0, day: 1, daysLeft: SCENARIOS[0].daysToPrepare,
    gold: 300, supplies: 160, fort: 0, favour: 0, scouted: false, log: [], over: false,
    cohorts: [
      { id: 1, name: 'I Cohort',   type: 'legionary', men: 400, maxMen: 480, xp: 60, drill: 30, condition: 90, officerId: 1 },
      { id: 2, name: 'II Cohort',  type: 'legionary', men: 380, maxMen: 480, xp: 30, drill: 20, condition: 90, officerId: 2 },
      { id: 3, name: 'III Cohort', type: 'legionary', men: 360, maxMen: 480, xp: 10, drill: 15, condition: 90, officerId: null },
      { id: 4, name: 'Balearic Slingers', type: 'slinger', men: 120, maxMen: 150, xp: 20, drill: 20, condition: 95, officerId: null },
      { id: 5, name: 'Equites Turma', type: 'equites', men: 50, maxMen: 60, xp: 20, drill: 25, condition: 95, officerId: 4 }
    ],
    officers: [
      { id: 1, name: 'Titus Pullo', rank: 'Centurion', tactics: 3, drill: 2, logistics: 1, diplomacy: 0, xp: 40, level: 1, points: 1, perks: [], alive: true, bio: 'A brawler who leads from the front line.' },
      { id: 2, name: 'Lucius Vorenus', rank: 'Centurion', tactics: 2, drill: 4, logistics: 1, diplomacy: 1, xp: 40, level: 1, points: 1, perks: [], alive: true, bio: 'A stern drillmaster; his cohorts march like clockwork.' },
      { id: 3, name: 'Decimus Silvanus', rank: 'Tribune', tactics: 1, drill: 0, logistics: 4, diplomacy: 3, xp: 20, level: 1, points: 1, perks: [], alive: true, bio: 'A patrician quartermaster with a talent for haggling.' },
      { id: 4, name: 'Aulus Fabius', rank: 'Prefect of Horse', tactics: 3, drill: 1, logistics: 2, diplomacy: 1, xp: 20, level: 1, points: 1, perks: [], alive: true, bio: 'Bold cavalryman, a little too fond of glory.' }
    ]
  };
}

export const OFFICER_XP = [0, 60, 150, 300, 500, 800];
export const TRAITS = ['tactics', 'drill', 'logistics', 'diplomacy'];

export function officerById(c, id) { return c.officers.find(o => o.id === id && o.alive) || null; }

// Roman battle specs from cohorts, deployed per the scenario's deploy block.
export function romeSpecs(c, scn) {
  const d = scn?.deploy || { mode: 'line', cx: 800, cy: 880 };
  const live = c.cohorts.filter(h => h.men > 0);
  const inf = live.filter(h => h.type === 'legionary' || h.type === 'aux_inf');
  const ranged = live.filter(h => h.type === 'slinger' || h.type === 'archer');
  const cav = live.filter(h => h.type === 'equites' || h.type === 'aux_cav');
  const specs = [];
  const mk = (h, x, y) => specs.push({ type: h.type, name: h.name, cohortId: h.id, men: h.men, maxMen: h.maxMen, xp: h.xp, drill: h.drill, condition: h.condition, officer: officerById(c, h.officerId), upg: h.upg, x, y, f: d.f, stance: 'aggressive' });
  if (d.mode === 'grid') {
    [...inf, ...ranged, ...cav].forEach((h, i) => { const col = i % d.cols, row = Math.floor(i / d.cols); mk(h, d.cx + (col - (d.cols - 1) / 2) * d.dx, d.cy + row * d.dy); });
    return specs;
  }
  if (inf.length > 12 || ranged.length > 14 || cav.length > 8) {
    // a big army deploys in ranks: infantry in rows of twelve, missile troops behind them, cavalry on the wings
    const perRow = 12, sp = 100, n = inf.length, rowsI = Math.ceil(n / perRow), rowsR = Math.ceil(ranged.length / 14), depth = rowsI * 85 + rowsR * 70 + 60;
    const worldH = (scn && scn.world && scn.world.h) || 1000; let cy = d.cy; if (cy + depth > worldH - 80) cy = worldH - 80 - depth;
    inf.forEach((h, i) => { const r = Math.floor(i / perRow), k = i % perRow, cnt = Math.min(perRow, n - r * perRow); mk(h, d.cx + (k - (cnt - 1) / 2) * sp, cy + r * 85); });
    ranged.forEach((h, i) => { const r = Math.floor(i / 14), k = i % 14, cnt = Math.min(14, ranged.length - r * 14); mk(h, d.cx + (k - (cnt - 1) / 2) * 80, cy + rowsI * 85 + 20 + r * 70); });
    const half = (Math.min(perRow, n) - 1) / 2 * sp + 120;
    cav.forEach((h, i) => { const side = i % 2 ? 1 : -1, idx = Math.floor(i / 2); mk(h, d.cx + side * (half + Math.floor(idx / 4) * 80), cy + 20 + (idx % 4) * 60); });
    return specs;
  }
  const sp = 100, n = inf.length, front = n <= 4 ? n : Math.ceil(n / 2), back = n - front;
  inf.forEach((h, i) => {
    const isBack = i >= front, k = isBack ? i - front : i, cnt = isBack ? back : front;
    mk(h, d.cx + (k - (cnt - 1) / 2) * sp, d.cy + (isBack ? 85 : 0));
  });
  ranged.forEach((h, i) => mk(h, d.cx + (i - (ranged.length - 1) / 2) * 80, d.cy + (back ? 170 : 58)));
  const half = Math.max(0, (front - 1) / 2) * sp + 110;
  cav.forEach((h, i) => mk(h, d.cx + (i % 2 ? 1 : -1) * (half + Math.floor(i / 2) * 75), d.cy + 25));
  return specs;
}

export function applyResult(c, result, scn) {
  const notes = [];
  for (const r of result.rows) {
    const h = c.cohorts.find(x => x.id === r.cohortId);
    if (!h) continue;
    h.men = r.endMen; h.xp += Math.round(r.xpGain * modsOf(c).xp); h.condition = Math.max(35, h.condition - 20);
    if (r.officerId != null) {
      const o = c.officers.find(x => x.id === r.officerId);
      if (o) {
        if (r.officerFate === 'killed') { o.alive = false; h.officerId = null; notes.push(`${o.rank} ${o.name} fell in battle with ${h.name}.`); }
        else { o.xp += result.officerXp; const up = levelOfficer(o); if (up) notes.push(up); }
      }
    }
  }
  c.lastLoss = result.rows.reduce((x, r) => x + r.casualties, 0); c.lastBack = result.rows.reduce((x, r) => x + Math.max(0, r.endMen - (r.startMen - r.casualties)), 0);
  c.gold += result.spoils.gold; c.supplies += result.spoils.supplies;
  let recruits = result.spoils.recruits;
  for (const h of c.cohorts) { const add = Math.min(recruits, h.maxMen - h.men); h.men += add; recruits -= add; }
  // Provincial levies: every cohort regains a quarter of its missing men, and nothing ever falls below 35% (no soft-locks).
  for (const h of c.cohorts) {
    const before = h.men;
    h.men = Math.min(h.maxMen, h.men + Math.round((h.maxMen - h.men) * 0.25 * modsOf(c).levy));
    const floor = Math.ceil(h.maxMen * 0.35);
    if (h.men < floor) { notes.push(`${h.name} is reduced to a remnant; the governor sends replacements.`); h.men = floor; }
    if (h.men > before && before > 0) h.xp = Math.round(h.xp * (0.6 + 0.4 * before / h.men));
  }
  c.history = c.history || [];
  c.history.push({ id: scn.id, outcome: result.outcome, day: c.day });
  if (scn.id === 'prologue') { if (result.outcome !== 'defeat') c.prologueDone = true; return notes; }
  if (result.outcome !== 'defeat') {
    for (const t of TYPE_UNLOCKS[scn.id] || []) { c.unlockedTypes = c.unlockedTypes || [...START_TYPES]; if (!c.unlockedTypes.includes(t)) { c.unlockedTypes.push(t); notes.push(`You can now raise ${t.replace('_', ' ')} units at camp.`); } }
    for (const u of scn.unlock || []) {
      const id = Math.max(0, ...c.cohorts.map(h => h.id)) + 1;
      c.cohorts.push({ id, name: u.name, type: u.type, men: u.men, maxMen: u.maxMen, xp: u.xp, drill: u.drill, condition: 100, officerId: null });
      notes.push(u.msg);
    }
    c.scenario++;
    c.scouted = false; c.favour = Math.round(c.favour * 0.5);
  }
  const next = SCENARIOS[c.scenario];
  c.daysLeft = next ? next.daysToPrepare : 0;
  if (!next) c.over = true;
  return notes;
}

export function levelOfficer(o) {
  let msg = null;
  while (o.level < OFFICER_XP.length - 1 && o.xp >= OFFICER_XP[o.level + 1]) {
    o.level++; o.points = (o.points || 0) + 1;
    // grow the officer's strongest trait; ties favour tactics
    const best = TRAITS.slice().sort((a, b) => o[b] - o[a] || TRAITS.indexOf(a) - TRAITS.indexOf(b))[0];
    o[best] = Math.min(5, o[best] + 1);
    msg = `${o.name} reached level ${o.level}! (${best} +1)`;
  }
  return msg;
}

export { levelFor, XP_LEVELS, WORLD };
