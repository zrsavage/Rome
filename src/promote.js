// Advancement, one decision at a time.
// Officers: every leader of the same kind (a centurion of foot, a prefect of horse, a staff officer) walks the same ladder, one either/or choice per level.
// Cohorts: every unit of the same kind (foot, missile troops, horse) gets one either/or choice each time it gains a rank.
// The effects are small changes to the unit's own numbers (see applyMods), so they show up on the unit record and in battle alike.
import { UNIT_TYPES, XP_LEVELS, LEVEL_NAMES } from './data.js';

const lvlOf = (xp) => { let l = 0; for (let i = 0; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) l = i; return l; };

// ---- what an upgrade does to a unit's numbers: [field, '*' or '+', amount] ----
export const MODS = {
  // cohort upgrades
  march: [['speed', '*', 1.08]], pila: [['pilum', '+', 1]], blade: [['atk', '*', 1.06]], shield: [['def', '+', 0.04]],
  grit: [['morale', '+', 6]], wind: [['tire', '*', 0.8]], impact: [['charge', '*', 1.15]], brace: [['antiCharge', '+', 0.15]],
  picked: [['atk', '*', 1.05], ['def', '+', 0.02]], eagle: [['morale', '+', 5], ['fragile', '*', 0.9]],
  reach: [['range', '*', 1.1]], shot: [['ammo', '*', 1.25]], aim: [['rate', '*', 1.1]], fleet: [['speed', '*', 1.1]],
  knife: [['atk', '*', 1.2]], cover: [['def', '+', 0.06]], volley: [['rate', '*', 1.08], ['ammo', '*', 1.1]],
  hunt: [['hunt', '*', 1.2]], wheel: [['turn', '*', 1.25]],
  // officer perks that change the attached unit's numbers (the older perks are handled in the battle code itself)
  pilani: [['pilum', '+', 1]], marcher: [['speed', '*', 1.08], ['tire', '*', 0.85]], ironwall: [['def', '+', 0.05]],
  outrider: [['speed', '*', 1.08]], hunter: [['hunt', '*', 1.25]], horsemaster: [['turn', '*', 1.3]], lancer: [['charge', '*', 1.1]]
};
export function applyMods(type, ids) {
  for (const id of ids || []) for (const [k, op, v] of MODS[id] || []) type[k] = op === '*' ? (type[k] ?? 1) * v : (type[k] || 0) + v;
  return type;
}

// ---------------- cohorts ----------------
const U = (id, name, text) => ({ id, name, text });
export const UNIT_TRACKS = {
  inf: [
    [U('march', 'Quick march', 'Marches 8% faster.'), U('pila', 'Extra pila', 'One more pilum volley each battle.')],
    [U('blade', 'Sword drill', '+6% attack.'), U('shield', 'Shield drill', '+4% armour.')],
    [U('grit', 'Grit', '+6 morale.'), U('wind', 'Wind', 'Tires 20% slower.')],
    [U('impact', 'Impact', 'Charges hit 15% harder.'), U('brace', 'Brace', 'Enemy charges bite 15% less.')],
    [U('picked', 'Picked men', '+5% attack and +2% armour.'), U('eagle', 'Under the eagle', '+5 morale; losses shake it 10% less.')]
  ],
  ranged: [
    [U('reach', 'Longer reach', '+10% range.'), U('shot', 'More shot', '+25% ammunition.')],
    [U('aim', 'Marksmen', 'Shoots 10% faster.'), U('fleet', 'Fleet-footed', 'Moves 10% faster.')],
    [U('grit', 'Grit', '+6 morale.'), U('wind', 'Wind', 'Tires 20% slower.')],
    [U('knife', 'Close quarters', '+20% in hand-to-hand fighting.'), U('cover', 'Shields', '+6% armour.')],
    [U('volley', 'Masters of the sling and bow', 'Shoots 8% faster with 10% more ammunition.'), U('eagle', 'Steady hands', '+5 morale; losses shake it 10% less.')]
  ],
  cav: [
    [U('fleet', 'Fast horses', 'Moves 10% faster.'), U('impact', 'Heavy charge', 'Charges hit 15% harder.')],
    [U('blade', 'Sword drill', '+6% attack.'), U('shield', 'Mail and shields', '+4% armour.')],
    [U('grit', 'Grit', '+6 morale.'), U('wind', 'Wind', 'Tires 20% slower.')],
    [U('hunt', 'Hunters', 'Rides down fleeing men 20% faster.'), U('wheel', 'Handy horses', 'Turns 25% faster.')],
    [U('picked', 'Picked men', '+5% attack and +2% armour.'), U('eagle', 'Proud squadron', '+5 morale; losses shake it 10% less.')]
  ]
};
export const unitTrack = (h) => UNIT_TRACKS[(UNIT_TYPES[h.type] || {}).cat] || UNIT_TRACKS.inf;
// The next undecided rank choice this cohort has earned, or null. Row i is earned at rank i+1.
export function unitPending(h) {
  const track = unitTrack(h), lv = Math.min(track.length, lvlOf(h.xp || 0)), ups = h.ups || [];
  for (let i = 0; i < lv; i++) if (!track[i].some(o => ups.includes(o.id))) return { row: i, options: track[i], rank: LEVEL_NAMES[i + 1] };
  return null;
}
export function chooseUnit(h, id) {
  const p = unitPending(h); if (!p || !p.options.some(o => o.id === id)) return false;
  h.ups = [...(h.ups || []), id]; return true;
}
export const unitChosen = (h) => unitTrack(h).flat().filter(o => (h.ups || []).includes(o.id));

// ---------------- officers ----------------
const P = (id, name, text) => ({ id, name, text });
export const OFFICER_KINDS = { foot: 'Centurion of foot', horse: 'Prefect of horse', staff: 'Staff officer' };
export const officerKind = (o) => /Centurion|Pilus/i.test(o.rank) ? 'foot' : /Horse|Alae|Equitum/i.test(o.rank) ? 'horse' : 'staff';
export const OFFICER_TRACKS = {
  foot: [
    [P('inspire', 'Inspiring Presence', 'His cohort: +4 morale and 50% faster morale recovery.'), P('discipline', 'Disciplinarian', 'His cohort: +8 morale and turns 20% faster.')],
    [P('shock', 'Shock Tactics', 'His cohort: charges hit 25% harder, +5% attack.'), P('steadfast', 'Steadfast', 'His cohort: loses 20% less morale from casualties.')],
    [P('cadre', 'Veteran Cadre', 'His cohort: +10% attack.'), P('drillmaster', 'Drillmaster', 'Drills he leads give 25% more experience and drill.')],
    [P('pilani', 'Pilum Master', 'His cohort: one more pilum volley.'), P('marcher', 'Forced Marches', 'His cohort: 8% faster and tires 15% slower.')],
    [P('ironwall', 'Wall of Shields', 'His cohort: +5% armour.'), P('mentor', 'Mentor', 'His cohort learns 25% faster from battle.')]
  ],
  horse: [
    [P('shock', 'Shock Tactics', 'His squadron: charges hit 25% harder, +5% attack.'), P('inspire', 'Inspiring Presence', 'His squadron: +4 morale and 50% faster morale recovery.')],
    [P('outrider', 'Outriders', 'His squadron: 8% faster.'), P('steadfast', 'Steadfast', 'His squadron: loses 20% less morale from casualties.')],
    [P('hunter', 'Hunter of Men', 'His squadron: rides down fleeing men 25% faster.'), P('cadre', 'Veteran Cadre', 'His squadron: +10% attack.')],
    [P('horsemaster', 'Horsemaster', 'His squadron: turns 30% faster.'), P('ironwall', 'Mail and Shield', 'His squadron: +5% armour.')],
    [P('lancer', 'Lancers', 'His squadron: charges hit 10% harder again.'), P('mentor', 'Mentor', 'His squadron learns 25% faster from battle.')]
  ],
  staff: [
    [P('quartermaster', 'Quartermaster', 'The whole army eats 10% less.'), P('tribute', 'Tribute Master', 'Demanding tribute yields 30% more denarii.')],
    [P('forager', 'Master Forager', 'Foraging brings back 20% more.'), P('spymaster', 'Spymaster', 'Sending scouts costs no day.')],
    [P('surgeon', 'Field Surgeons', 'Wounded recover 20% better after battle.'), P('allies', 'Friend of Chieftains', 'Gifts to chieftains win 2 goodwill instead of 1.')],
    [P('drillmaster', 'Drillmaster', 'Drills he leads give 25% more experience and drill.'), P('inspire', 'Inspiring Presence', 'A unit he is attached to: +4 morale and 50% faster morale recovery.')],
    [P('steadfast', 'Steadfast', 'A unit he is attached to: loses 20% less morale from casualties.'), P('mentor', 'Mentor', 'A unit he is attached to learns 25% faster from battle.')]
  ]
};
export const officerTrack = (o) => OFFICER_TRACKS[officerKind(o)];
// The next undecided step on this officer's ladder, if he has a point to spend. Step i opens at level i+1.
export function officerPending(o) {
  if (!o || !o.alive || (o.points || 0) < 1) return null;
  const track = officerTrack(o), perks = o.perks || [];
  for (let i = 0; i < Math.min(track.length, o.level || 1); i++) if (!track[i].some(p => perks.includes(p.id))) return { row: i, options: track[i] };
  return null;
}
export function chooseOfficer(o, id) {
  const p = officerPending(o); if (!p || !p.options.some(x => x.id === id)) return false;
  o.perks = [...(o.perks || []), id]; o.points = Math.max(0, (o.points || 0) - 1); return true;
}
const ALLP = Object.values(OFFICER_TRACKS).flat(2);
export const perkInfo = (id) => ALLP.find(p => p.id === id) || { id, name: id, text: '' };

// ---------------- the unit record: what a cohort is good at ----------------
const BEST = {
  legionary: 'Holding a line, breaking a charge with pila, and the long grind.',
  aux_inf: 'A fast, hard charge and fighting in broken ground; brittle if the fight drags on.',
  slinger: 'Wearing down massed, unarmoured foot from a distance.',
  archer: 'The longest reach on the field; picking off skirmishers and horse.',
  equites: 'Charging flanks and rears, and riding down broken men.',
  aux_cav: 'Speed: scouting, chasing skirmishers and pursuit.'
};
// Effective numbers for a cohort, the way the battle will see them (type, rank, drill, equipment, chosen upgrades, its officer's unit perks).
export function unitRecord(h, officer = null) {
  const base = UNIT_TYPES[h.type], t = applyMods({ ...base }, [...(h.ups || []), ...((officer && officer.perks) || [])]);
  const lv = lvlOf(h.xp || 0), up = { armour: 0, weapon: 0, ...(h.upg || {}) }, pk = (id) => !!officer && (officer.perks || []).includes(id);
  const attack = t.atk * (1 + 0.07 * lv) * (1 + 0.12 * (h.drill || 0) / 100) * (1 + 0.10 * Math.min(3, up.weapon)) * (lv >= 4 ? 1.08 : 1) * (pk('shock') ? 1.05 : 1) * (pk('cadre') ? 1.1 : 1);
  const armour = Math.min(0.88, t.def + lv * 0.01 + (lv >= 3 ? 0.02 : 0) + 0.06 * Math.min(3, up.armour));
  const morale = t.morale + lv * 3 + (h.drill || 0) * 0.12 + (pk('inspire') ? 4 : 0) + (pk('discipline') ? 8 : 0) + (lv >= 5 ? 5 : 0);
  const pila = base.pilum ? t.pilum + (up.weapon >= 2 ? 1 : 0) + (lv >= 5 ? 1 : 0) : 0;
  return {
    cat: base.cat, best: BEST[h.type] || base.blurb,
    stats: [
      { key: 'attack', name: 'Attack', value: attack, base: base.atk, max: 0.16, show: Math.round(attack * 1000) },
      { key: 'armour', name: 'Armour', value: armour, base: base.def, max: 0.75, show: Math.round(armour * 100) + '%' },
      { key: 'speed', name: 'Speed', value: t.speed, base: base.speed, max: 70, show: Math.round(t.speed) },
      { key: 'morale', name: 'Morale', value: morale, base: base.morale, max: 110, show: Math.round(morale) },
      { key: 'charge', name: 'Charge', value: t.charge * (pk('shock') ? 1.25 : 1), base: base.charge, max: 2.4, show: (t.charge * (pk('shock') ? 1.25 : 1)).toFixed(2) },
      base.range ? { key: 'range', name: 'Range', value: t.range, base: base.range, max: 160, show: Math.round(t.range) } : null,
      base.range ? { key: 'ammo', name: 'Ammunition', value: t.ammo, base: base.ammo, max: 100, show: Math.round(t.ammo) } : null,
      base.pilum ? { key: 'pila', name: 'Pilum volleys', value: pila, base: base.pilum, max: 6, show: pila } : null
    ].filter(Boolean)
  };
}
// Which of its numbers stand out against the other cohorts of the same kind in the army.
export function standsOut(h, cohorts, officerOf) {
  const mine = unitRecord(h, officerOf(h)), peers = cohorts.filter(x => x.id !== h.id && (UNIT_TYPES[x.type] || {}).cat === mine.cat).map(x => unitRecord(x, officerOf(x)));
  if (!peers.length) return { better: [], worse: [] };
  const better = [], worse = [];
  for (const s of mine.stats) {
    const vals = peers.map(p => (p.stats.find(q => q.key === s.key) || {}).value).filter(v => v != null); if (!vals.length) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length; if (!avg) continue;
    if (s.value > avg * 1.04) better.push(s.name.toLowerCase()); else if (s.value < avg * 0.96) worse.push(s.name.toLowerCase());
  }
  return { better, worse };
}
