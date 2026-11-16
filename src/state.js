// Campaign state: cohorts, officers, resources. Plain JSON so it saves to localStorage.
import { XP_LEVELS, SCENARIOS, WORLD, START_TYPES, TYPE_UNLOCKS, UNIT_TYPES, actLabel, EVERYWHERE, regionalExtras } from './data.js';
import { PERKS } from './perks.js';
import { promote } from './officers.js';
import { levelFor } from './sim.js';
import { careerLv, realWin, legionsOf, rememberFoes } from './campaign.js';
import { unlockCodex } from './codex.js';
import { awardHonours, promoteFromRanks, decoMorale } from './heroes.js';

// The field hospital: five levels, each dearer than the last, one level per camp. Levels 1-3 add 30% wounded recovery each, 4 and 5
// add 15% each and bring a unique upgrade: the Surgeons' school (level 4) doubles what treating the badly wounded saves, and the
// Valetudinarium (level 5) widens the medici's ring and lets them save half the men hit inside it.
export const HOSP_MAX = 5, HOSP_COST = [250, 500, 800, 1200, 1700], HOSP_SUP = [20, 30, 40, 60, 80];
export const HOSP_NAMES = ['Field dressing station', 'Hospital tents', 'Field hospital', "Surgeons' school", 'Valetudinarium'];
export const hospRecovery = (l) => 1 + 0.3 * Math.min(l, 3) + 0.15 * Math.max(0, l - 3);
export const DEFAULT_MODS = { recovery: 1, supplyUse: 1, spoils: 1, forage: 1, levy: 1, morale: 0, xp: 1 };
// Effective campaign modifiers: origins, plus officer perks and the field hospital.
export function modsOf(c) {
  const m = { ...DEFAULT_MODS, ...(c.mods || {}) };
  const has = (id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
  if (has('quartermaster')) m.supplyUse *= 0.9;
  if (has('forager')) m.forage *= 1.2;
  if (has('surgeon')) m.recovery *= 1.2;
  m.recovery *= hospRecovery(c.hospital || 0);
  // the commander's career
  m.recovery *= 1 + 0.06 * careerLv(c, 'medicine'); m.supplyUse *= 1 - 0.05 * careerLv(c, 'logistics'); m.forage *= 1 + 0.08 * careerLv(c, 'logistics');
  m.xp *= 1 + 0.05 * careerLv(c, 'training'); m.spoils *= 1 + 0.05 * careerLv(c, 'politics'); m.recruits = 1 + 0.10 * careerLv(c, 'politics');
  return m;
}
export const hasPerk = (c, id) => (c.officers || []).some(o => o.alive && (o.perks || []).includes(id));
// A campaign grows an army from a handful of cohorts to 50-60 units by the final battles, led by you with legates under you:
// four more units for every battle won or drawn, and four more for each level of Army organisation.
export const COMMAND_PER_WIN = 4, COMMAND_PER_ORG = 4;
// Command is counted in slots: a cohort of foot takes a whole slot; horse, missile troops, engines and medici, which are smaller and
// work in support, take half a slot each. (Army tests showed that at one slot each, an army of nothing but legions won most often.)
export const slotOf = (type) => (UNIT_TYPES[type] && UNIT_TYPES[type].cat !== 'inf' ? 0.5 : 1);
export const slotsUsed = (c) => c.cohorts.reduce((a, h) => a + slotOf(h.type), 0);
// The economy: an army costs money to keep and more to grow. Every new unit is dearer than the last (recruiters must go further for
// men, horses and kit), and every soldier draws pay after each battle; an army that cannot be paid loses heart and men.
export const raiseMult = (c) => 1 + 0.03 * Math.max(0, slotsUsed(c) - 10);
export const PAY_PER_MAN = 0.12;
export const payDue = (c) => Math.round(c.cohorts.reduce((a, h) => a + h.men, 0) * PAY_PER_MAN * (1 - 0.06 * careerLv(c, 'economy')) * (standingOf(c) <= 15 ? 1.25 : 1));   // with no friends in Rome, money costs more
// Standing in Rome (0-100): what the Senate and the people think of you. Victories raise it, defeats sink it; it brings funds and men.
export const standingOf = (c) => (c.standing ?? 30);
export const addStanding = (c, d) => { c.standing = Math.max(0, Math.min(100, standingOf(c) + d)); };
export const commandLimit = (c) => Math.min(80 + (c.bonusCommand || 0), (c.bonusCommand || 0) + 8 + (c.history || []).filter(h => h.id !== 'prologue' && realWin(h)).length * COMMAND_PER_WIN + COMMAND_PER_ORG * careerLv(c, 'organisation'));
// ---- Fair enemy hosts ----
// The enemy is sized from your army, by what kind of fight it is: an attacker needs more men than a defender, and men behind a rampart
// or on a hill need fewer. Strength is counted man for man by fighting value, measured with the balance bot (tools/simtest.mjs): a
// legionary is 1 and a Gallic warrior is worth about the same in this game (he charges hard; the legionary is armoured and drilled), so an
// open battle is fought at roughly even numbers. Your army's quality (experience, drill,
// equipment) is NOT counted: training and arming your men is a real advantage, not something the enemy grows to match.
export const ENEMY_WEIGHT = { warband: 1.0, gaul_skirm: 0.8, gaul_elite: 1.6, gaul_cav: 2.0, suebi: 1.15, german_cav: 2.1, laager: 0.55, numid_cav: 1.6, numid_inf: 0.85, elephant: 2.5, pompeian: 1.15, pomp_cav: 1.9, pomp_missile: 0.8, pontic: 1.1, horse_archer: 1.7, lancer: 2.4, chariot: 3.0, pomp_levy: 0.95, britons: 1.0, brit_chariot: 1.8, brit_cav: 1.9 };
export const POSTURES = {
  attack: { ratio: 1.15, name: 'Battle in the open', text: 'An open fight: about 1.15 times your strength.' },
  defend: { ratio: 1.4, name: 'You defend', text: 'They attack you: about 1.4 times your strength.' },
  assault: { ratio: 1.0, name: 'You attack a strong place', text: 'They hold strong ground: about your strength.' },
  fortdef: { ratio: 1.6, name: 'You defend a fortified camp', text: 'They storm your rampart: about 1.6 times your strength.' },
  ambush: { ratio: 1.25, name: 'Ambush', text: 'They chose the ground and the moment: about 1.25 times your strength.' },
  pursuit: { ratio: 0.85, name: 'Pursuit', text: 'A beaten or strung-out enemy: about 0.85 times your strength.' }
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
// What can be raised now: the types the campaign has unlocked that are available where the army is, plus that region's local troops.
export function unlockedTypes(c) {
  const base = c.unlockedTypes || START_TYPES, scn = SCENARIOS[Math.min(c.scenario || 0, SCENARIOS.length - 1)], local = regionalExtras(scn);
  return [...base.filter(t => EVERYWHERE.includes(t) || local.includes(t)), ...local.filter(t => !base.includes(t))];
}

export function newCampaign(difficulty = 'normal') {
  return {
    version: 7, standing: 30, difficulty, hospital: 0, manpower: 0, doctrines: [], unlockedTypes: [...START_TYPES], prologueDone: false, introShown: false, mods: { ...DEFAULT_MODS }, player: { name: 'Gaius Aurelius', picks: {} }, scenario: 0, day: 1, campUse: {},
    gold: 300, supplies: 160, fort: 0, favour: 0, scouted: false, log: [], over: false,
    cohorts: [
      { id: 1, name: 'I Cohort',   type: 'legionary', men: 400, maxMen: 480, xp: 60, drill: 30, condition: 90, officerId: 1 },
      { id: 2, name: 'II Cohort',  type: 'legionary', men: 380, maxMen: 480, xp: 30, drill: 20, condition: 90, officerId: 2 },
      { id: 3, name: 'III Cohort', type: 'legionary', men: 360, maxMen: 480, xp: 10, drill: 15, condition: 90, officerId: null },
      { id: 4, name: 'Balearic Slingers', type: 'slinger', men: 210, maxMen: 260, xp: 20, drill: 20, condition: 95, officerId: null },
      { id: 5, name: 'Equites', type: 'equites', men: 110, maxMen: 140, xp: 20, drill: 25, condition: 95, officerId: 4 }
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
  // siege engines come only to assaults on strong places and to fights against wagon camps
  const siege = scn && scn.id !== 'landing' && (scn.posture === 'assault' || (scn.posture !== 'pursuit' && (scn.enemy || []).some(e => (UNIT_TYPES[e.type] || {}).wagon)));
  const live = c.cohorts.filter(h => h.men > 0 && (siege || !(UNIT_TYPES[h.type] || {}).siege));
  const cat = (h) => (UNIT_TYPES[h.type] || {}).cat;                        // every kind deploys: legions first, then allies and regional troops
  const inf = live.filter(h => cat(h) === 'inf').sort((a, b) => (b.type === 'legionary') - (a.type === 'legionary'));
  const ranged = live.filter(h => cat(h) === 'ranged');
  const cav = live.filter(h => cat(h) === 'cav');
  const medics = live.filter(h => UNIT_TYPES[h.type] && UNIT_TYPES[h.type].medic);
  const specs = [];
  const mk = (h, x, y) => specs.push({ type: h.type, name: h.name, cohortId: h.id, men: h.men, maxMen: h.maxMen, xp: h.xp, drill: h.drill, condition: h.condition, officer: officerById(c, h.officerId), upg: h.upg, ups: h.ups, moraleBonus: decoMorale(h), tenth: !!h.tenth, x, y, f: d.f, stance: 'aggressive' });
  if (d.mode === 'grid') {
    [...inf, ...ranged, ...cav, ...medics].forEach((h, i) => { const col = i % d.cols, row = Math.floor(i / d.cols); mk(h, d.cx + (col - (d.cols - 1) / 2) * d.dx, d.cy + row * d.dy); });
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
    medics.forEach((h, i) => mk(h, d.cx + (i - (medics.length - 1) / 2) * 260, cy + rowsI * 85 + rowsR * 70 + 30));
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
  medics.forEach((h, i) => mk(h, d.cx + (i - (medics.length - 1) / 2) * 260, d.cy + (back ? 240 : 130)));
  return specs;
}

export function applyResult(c, result, scn) {
  const notes = []; c.nextMorale = 0;
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
  if (result.captured && (result.captured.mail || result.captured.arms || result.captured.horses)) {     // the stripped field goes into the stores
    const st = c.captured = c.captured || { mail: 0, arms: 0, horses: 0 }; for (const k of ['mail', 'arms', 'horses']) st[k] += result.captured[k] || 0;
    notes.push(`Captured: ${[[result.captured.mail, 'mail shirts'], [result.captured.arms, 'weapons'], [result.captured.horses, 'horses']].filter(x => x[0]).map(x => `${x[0]} ${x[1]}`).join(', ')}`);
  }
  if (result.baggageLost) { const lost = Math.round(c.supplies * 0.25); c.supplies -= lost; notes.push(`Your baggage train was taken: ${lost} supplies are lost with it.`); }
  if (result.wagonsTaken) notes.push(`${result.wagonsTaken} enemy wagon camp${result.wagonsTaken > 1 ? 's were' : ' was'} taken: grain and plunder for the army.`);
  // a battle fought in stages: between stages there is no camp, no levy and no rest, only the wounded who can still stand
  if (scn.phases && result.outcome !== 'defeat' && scn.phaseIdx < scn.phaseCount - 1) {
    c.phase = scn.phaseIdx + 1;
    notes.push(`Stage ${scn.phaseIdx + 1} of ${scn.phaseCount} is won, but the day is not over. Your losses go with you into the next stage.`);
    return notes;
  }
  if (scn.phases && result.outcome !== 'defeat') c.phase = 0;
  c.glut = Math.round((c.glut || 0) * 0.6);                        // the slave markets recover between battles
  if (scn.id !== 'prologue') { rememberFoes(c, scn, result); unlockCodex(c, scn, result); }         // the enemy commander remembers this fight
  if (scn.id !== 'prologue') {                                     // news of the battle reaches Rome
    const named = scn.kind === 'named', d = result.outcome === 'victory' ? (named ? 6 : 3) : result.outcome === 'draw' ? 0 : (named ? -10 : -5);
    if (d) { addStanding(c, d); notes.push(`Standing in Rome ${d > 0 ? '+' : ''}${d} (now ${standingOf(c)})`); }
    if (standingOf(c) >= 50) { const f = Math.round((standingOf(c) - 40) * 6); c.gold += f; notes.push(`Senate funds: +${f} denarii`); }
  }
  if (scn.id !== 'prologue') {                                     // the men are paid after every battle
    const due = payDue(c);
    if (c.gold >= due) { c.gold -= due; notes.push(`Pay: -${due} denarii`); }
    else {
      const short = 1 - c.gold / Math.max(1, due); c.gold = 0; let left = 0;
      for (const h of c.cohorts) { const n = Math.round(h.men * 0.08 * short); h.men = Math.max(Math.ceil(h.maxMen * 0.35), h.men - n); left += n; }
      c.nextMorale = (c.nextMorale || 0) - Math.round(6 * short);
      notes.push(`No money for pay (${due} denarii due): ${left} men desert, and the rest fight sullenly next battle.`);
    }
  }
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
    if (h.men > before && before > 0 && !(UNIT_TYPES[h.type] || {}).noDilute) h.xp = Math.round(h.xp * (0.6 + 0.4 * before / h.men));
  }
  if (manual && pooled > 0) notes.push(`+${pooled} soldiers waiting at the Barracks`);
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
    // Caesar's Tenth: after the parley on the mound (or the battle against Ariovistus, if the parley was passed by), a cohort of the Tenth Legion joins you
    if (['parley', 'ariovistus'].includes(scn.id) && !c.cohorts.some(h => h.tenth)) {
      const id = Math.max(0, ...c.cohorts.map(h => h.id)) + 1;
      c.cohorts.push({ id, name: 'First Cohort of the Tenth', type: 'legionary', men: 480, maxMen: 480, xp: 900, drill: 55, condition: 100, officerId: null, tenth: true });
      notes.push("New unit: the First Cohort of Caesar's own Tenth Legion. Cohorts beside it hold their nerve better.");
    }
    c.scenario++;
    c.scouted = false; c.favour = Math.round(c.favour * 0.5);
    c.career = c.career || { points: 0, levels: {} }; c.career.points++; notes.push('+1 career point (choose it at the Command Tent)');
  }
  const next = SCENARIOS[c.scenario];
  c.campUse = {};                                             // a new camp: the countryside near it has not been stripped yet
  if (!next) c.over = true;
  else if (scn && next.act !== scn.act && result.outcome !== 'defeat') notes.push(`${actLabel(scn.act)} is won. Next: ${actLabel(next.act)}, ${next.theater}.`);
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
