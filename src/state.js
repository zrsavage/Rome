// Campaign state: cohorts, officers, resources. Plain JSON so it saves to localStorage.
import { XP_LEVELS, SCENARIOS, WORLD, START_TYPES, TYPE_UNLOCKS, UNIT_TYPES } from './data.js';
import { PERKS } from './perks.js';
import { promote } from './officers.js';
import { levelFor } from './sim.js';
import { careerLv, realWin, legionsOf } from './campaign.js';
import { awardHonours, promoteFromRanks, decoMorale } from './heroes.js';

export const DEFAULT_MODS = { recovery: 1, supplyUse: 1, spoils: 1, forage: 1, levy: 1, morale: 0, xp: 1 };
// Effective campaign modifiers: origins, plus officer perks and the field hospital.
export function modsOf(c) {
  const m = { ...DEFAULT_MODS, ...(c.mods || {}) };
  const has = (id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
  if (has('quartermaster')) m.supplyUse *= 0.9;
  if (has('forager')) m.forage *= 1.2;
  if (has('surgeon')) m.recovery *= 1.2;
  m.recovery *= 1 + 0.30 * (c.hospital || 0);
  // the commander's career
  m.recovery *= 1 + 0.06 * careerLv(c, 'medicine'); m.supplyUse *= 1 - 0.05 * careerLv(c, 'logistics'); m.forage *= 1 + 0.08 * careerLv(c, 'logistics');
  m.xp *= 1 + 0.05 * careerLv(c, 'training'); m.spoils *= 1 + 0.05 * careerLv(c, 'politics'); m.recruits = 1 + 0.10 * careerLv(c, 'politics');
  return m;
}
export const hasPerk = (c, id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
// A campaign grows an army from a handful of cohorts to 50-60 units by the final battles, led by you with legates under you:
// four more units for every battle won or drawn, and four more for each level of Army organisation.
export const COMMAND_PER_WIN = 4, COMMAND_PER_ORG = 4;
export const commandLimit = (c) => Math.min(80, 8 + (c.history || []).filter(h => h.id !== 'prologue' && realWin(h)).length * COMMAND_PER_WIN + COMMAND_PER_ORG * careerLv(c, 'organisation'));
// ---- Fair enemy hosts ----
// The enemy is sized from your army, by what kind of fight it is: an attacker needs more men than a defender, and men behind a rampart
// or on a hill need fewer. Strength is counted man for man by fighting value, measured with the balance bot (tools/simtest.mjs): a
// legionary is 1 and a Gallic warrior is worth about the same in this game (he charges hard; the legionary is armoured and drilled), so an
// open battle is fought at roughly even numbers. Your army's quality (experience, drill,
// equipment) is NOT counted: training and arming your men is a real advantage, not something the enemy grows to match.
export const ENEMY_WEIGHT = { warband: 1.0, gaul_skirm: 0.8, gaul_elite: 1.6, gaul_cav: 2.0, suebi: 1.15, german_cav: 2.1, laager: 0.55 };
export const POSTURES = {
  attack: { ratio: 1.0, name: 'Battle in the open', text: 'An open fight: they bring about as much fighting strength as you.' },
  defend: { ratio: 1.2, name: 'You defend', text: 'They attack your position, so they bring more than you: about 1.2 times your strength.' },
  assault: { ratio: 0.85, name: 'You attack a strong place', text: 'They hold strong ground, so they need fewer men: about 0.85 times your strength.' },
  fortdef: { ratio: 1.4, name: 'You defend a fortified camp', text: 'They must storm your rampart, so they come in great numbers: about 1.4 times your strength.' },
  ambush: { ratio: 1.1, name: 'Ambush', text: 'They chose the ground and the moment: about 1.1 times your strength, and help is on its way.' },
  pursuit: { ratio: 0.75, name: 'Pursuit', text: 'You are catching a beaten or strung-out enemy: about 0.75 times your strength.' }
};
export const postureOf = (scn) => POSTURES[(scn && scn.posture) || 'attack'] || POSTURES.attack;
const unitWeight = (t) => ENEMY_WEIGHT[t] ?? ((UNIT_TYPES[t] && UNIT_TYPES[t].cost || 60) / 60);
// Fighting strength of your army, man for man by type (quality is deliberately left out, see above).
export function baseStrength(c) { return c.cohorts.reduce((a, h) => a + Math.max(0, h.men) * unitWeight(h.type), 0); }
// Strength of a scenario's host as written (main body and enemy reinforcements), before any scaling.
export function authoredStrength(scn) {
  return [...(scn.enemy || []), ...((scn.reinforcements || []).filter(r => r.side !== 'rome').map(r => r.unit))].reduce((a, e) => a + e.men * unitWeight(e.type), 0);
}
// Kept for anything that still wants a quality-weighted measure of the army.
export function armyPower(c) {
  let p = 0;
  for (const h of c.cohorts) {
    if (h.men <= 0) continue;
    const t = UNIT_TYPES[h.type], u = h.upg || {}, w = (t.cost || 60) / 60, lvl = levelFor(h.xp || 0);
    p += h.men * w * (1 + 0.07 * lvl) * (1 + 0.1 * Math.min(100, h.drill || 0) / 100) * (1 + 0.05 * ((u.armour || 0) + (u.weapon || 0))) * (1 + 0.03 * ((h.ups || []).length));
  }
  return p;
}
// The multiplier on the authored host so that its strength is your strength x the posture ratio. Difficulty and goodwill are applied on
// top of this in the battle (and shown in the briefing); a forced march catches the enemy 10% short.
export function forceScale(c, scn) {
  if (!scn || scn.id === 'prologue' || scn.practice || scn.id === 'practice') return 1;
  const auth = authoredStrength(scn) * (scn.boost || 1); if (auth <= 0) return 1;
  const surprise = c.surprise && c.surprise === (scn.id || '').split(':')[0] ? 0.9 : 1;
  return Math.max(0.3, Math.min(20, baseStrength(c) * postureOf(scn).ratio * (scn.odds || 1) * surprise / auth));   // scn.odds: a hand-tuned nudge for a fight that plays harder than its posture
}
export const unlockedTypes = (c) => c.unlockedTypes || START_TYPES;

export function newCampaign(difficulty = 'normal') {
  return {
    version: 3, difficulty, hospital: 0, manpower: 0, doctrines: [], unlockedTypes: [...START_TYPES], prologueDone: false, introShown: false, mods: { ...DEFAULT_MODS }, player: { name: 'Gaius Aurelius', picks: {} }, scenario: 0, day: 1, campUse: {},
    gold: 300, supplies: 160, fort: 0, favour: 0, scouted: false, log: [], over: false,
    cohorts: [
      { id: 1, name: 'I Cohort',   type: 'legionary', men: 400, maxMen: 480, xp: 60, drill: 30, condition: 90, officerId: 1 },
      { id: 2, name: 'II Cohort',  type: 'legionary', men: 380, maxMen: 480, xp: 30, drill: 20, condition: 90, officerId: 2 },
      { id: 3, name: 'III Cohort', type: 'legionary', men: 360, maxMen: 480, xp: 10, drill: 15, condition: 90, officerId: null },
      { id: 4, name: 'Balearic Slingers', type: 'slinger', men: 120, maxMen: 150, xp: 20, drill: 20, condition: 95, officerId: null },
      { id: 5, name: 'Equites Turma', type: 'equites', men: 50, maxMen: 60, xp: 20, drill: 25, condition: 95, officerId: 4 }
    ],
    officers: [
      { id: 1, name: 'Titus Pullo', rank: 'Centurion', tactics: 3, drill: 2, logistics: 1, diplomacy: 0, xp: 40, level: 1, points: 1, perks: [], alive: true, temper: 'bold', rival: 2, bio: 'A brawler who leads from the front line.' },
      { id: 2, name: 'Lucius Vorenus', rank: 'Centurion', tactics: 2, drill: 4, logistics: 1, diplomacy: 1, xp: 40, level: 1, points: 1, perks: [], alive: true, temper: 'steady', rival: 1, bio: 'A stern drillmaster; his cohorts march like clockwork.' },
      { id: 3, name: 'Decimus Silvanus', rank: 'Tribune', tactics: 1, drill: 0, logistics: 4, diplomacy: 3, xp: 20, level: 1, points: 1, perks: [], alive: true, temper: 'cautious', bio: 'A patrician quartermaster with a talent for haggling.' },
      { id: 4, name: 'Aulus Fabius', rank: 'Prefect of Horse', tactics: 3, drill: 1, logistics: 2, diplomacy: 1, xp: 20, level: 1, points: 1, perks: [], alive: true, temper: 'rash', bio: 'A dashing cavalryman, a little too fond of glory.' }
    ]
  };
}

export const OFFICER_XP = [0, 60, 150, 300, 500, 800];
export const TRAITS = ['tactics', 'drill', 'logistics', 'diplomacy'];

export function officerById(c, id) { return c.officers.find(o => o.id === id && o.alive) || null; }

// Roman battle specs from cohorts, deployed per the scenario's deploy block.
// The army as the battle sees it: the cohorts in their places, each marked with its legion, and the baggage train behind them.
export function romeSpecs(c, scn) {
  const specs = cohortSpecs(c, scn), lg = legionsOf(c);
  for (const s of specs) s.legion = lg.of[s.cohortId] || 1;
  if (scn && scn.id !== 'prologue' && specs.length) {
    const H = (scn.world && scn.world.h) || 1000, W = (scn.world && scn.world.w) || 1600, cx = specs.reduce((a, s) => a + s.x, 0) / specs.length, by = Math.max(...specs.map(s => s.y));
    const below = by + 130 < H - 30;
    specs.push({ type: 'baggage', name: 'Baggage Train', cohortId: null, men: 60, maxMen: 60, xp: 0, drill: 0, condition: 100, officer: null, x: Math.max(60, Math.min(W - 60, cx)), y: below ? by + 130 : Math.min(...specs.map(s => s.y)) - 130, stance: 'hold' });
  }
  return specs;
}
function cohortSpecs(c, scn) {
  const d = scn?.deploy || { mode: 'line', cx: 800, cy: 880 };
  const live = c.cohorts.filter(h => h.men > 0);
  const inf = live.filter(h => h.type === 'legionary' || h.type === 'aux_inf');
  const ranged = live.filter(h => h.type === 'slinger' || h.type === 'archer');
  const cav = live.filter(h => h.type === 'equites' || h.type === 'aux_cav');
  const specs = [];
  const mk = (h, x, y) => specs.push({ type: h.type, name: h.name, cohortId: h.id, men: h.men, maxMen: h.maxMen, xp: h.xp, drill: h.drill, condition: h.condition, officer: officerById(c, h.officerId), upg: h.upg, ups: h.ups, moraleBonus: decoMorale(h), x, y, f: d.f, stance: 'aggressive' });
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
        if (r.officerFate === 'killed') { o.alive = false; h.officerId = null; notes.push(`${o.rank} ${o.name} fell in battle with ${h.name}.`); const n = promoteFromRanks(c, h); if (n) { notes.push(`${n.name} of ${h.name} is promoted from the ranks to ${n.rank} in his place.`); (result.promotions = result.promotions || []).push({ unit: h.name, name: n.name, rank: n.rank, fallen: o.name }); } }
        else { o.xp += result.officerXp; const up = levelOfficer(o); if (up) notes.push(up); }
      }
    }
  }
  result.honours = awardHonours(c, result, scn.phaseName || scn.name);
  c.lastLoss = result.rows.reduce((x, r) => x + r.casualties, 0); c.lastBack = result.rows.reduce((x, r) => x + Math.max(0, r.endMen - (r.startMen - r.casualties)), 0);
  c.gold += result.spoils.gold; c.supplies += result.spoils.supplies;
  if (result.baggageLost) { const lost = Math.round(c.supplies * 0.25); c.supplies -= lost; notes.push(`Your baggage train was taken: ${lost} supplies are lost with it.`); }
  if (result.wagonsTaken) notes.push(`${result.wagonsTaken} enemy wagon camp${result.wagonsTaken > 1 ? 's were' : ' was'} taken: grain and plunder for the army.`);
  // a battle fought in stages: between stages there is no camp, no levy and no rest, only the wounded who can still stand
  if (scn.phases && result.outcome !== 'defeat' && scn.phaseIdx < scn.phaseCount - 1) {
    c.phase = scn.phaseIdx + 1;
    notes.push(`Stage ${scn.phaseIdx + 1} of ${scn.phaseCount} is won, but the day is not over. Your losses go with you into the next stage.`);
    return notes;
  }
  if (scn.phases && result.outcome !== 'defeat') c.phase = 0;
  // Volunteers and provincial levies go into a pool of available soldiers; once the barracks is built you assign them to units with
  // sliders. Until then (the very first camp) they are assigned automatically so a new player is not left with an unexplained pool.
  const wonCampaign = (c.history || []).filter(h => h.id !== 'prologue' && realWin(h)).length + (scn.id !== 'prologue' && result.outcome !== 'defeat' ? 1 : 0);
  const manual = wonCampaign >= 1; c.manpower = c.manpower || 0;
  let recruits = Math.round(result.spoils.recruits * (modsOf(c).recruits || 1)), pooled = 0;
  if (manual) { c.manpower += recruits; pooled += recruits; } else for (const h of c.cohorts) { const add = Math.min(recruits, h.maxMen - h.men); h.men += add; recruits -= add; }
  // Every unit's missing men come forward at a quarter, and nothing ever falls below 35% (no soft-locks).
  for (const h of c.cohorts) {
    const before = h.men; let levy = Math.round((h.maxMen - h.men) * 0.25 * modsOf(c).levy);
    if (manual) { levy = Math.min(levy, Math.max(0, c.cohorts.reduce((a, x) => a + x.maxMen - x.men, 0) - c.manpower)); c.manpower += levy; pooled += levy; } else h.men = Math.min(h.maxMen, h.men + levy);   // never more waiting men than empty places
    const floor = Math.ceil(h.maxMen * 0.35);
    if (h.men < floor) { notes.push(`${h.name} is reduced to a remnant; the governor sends replacements.`); h.men = floor; }
    if (h.men > before && before > 0) h.xp = Math.round(h.xp * (0.6 + 0.4 * before / h.men));
  }
  if (manual && pooled > 0) notes.push(`${pooled} soldiers are available to reinforce your units. Assign them at the Barracks with the sliders.`);
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
    c.career = c.career || { points: 0, levels: {} }; c.career.points++; notes.push('You have earned a career point. A flag over the Command Tent marks the choice.');
  }
  const next = SCENARIOS[c.scenario];
  c.campUse = {};                                             // a new camp: the countryside near it has not been stripped yet
  if (!next) c.over = true;
  else if (scn && next.act !== scn.act && result.outcome !== 'defeat') notes.push(`Act ${scn.act} is won. Caesar now turns to the next threat: Act ${next.act}, ${next.theater}.`);
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
  const pr = promote(o); if (pr) msg = (msg ? msg + ' ' : '') + pr;
  return msg;
}

export { levelFor, XP_LEVELS, WORLD };
