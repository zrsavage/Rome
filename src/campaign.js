// Campaign rules that sit between battles: the commander's career, the line of march, legions and legates, links between battles,
// prisoners, and the commanders you face. No DOM here; the screens call these.
import { SCENARIOS, UNIT_TYPES, phaseScn } from './data.js';

export const realWin = (h) => h.outcome === 'victory' || h.outcome === 'draw';       // a fight passed by is neither a win nor a defeat
export const currentScn = (c) => { const s = SCENARIOS[c.scenario]; return s && s.phases ? phaseScn(s, c.phase || 0) : s; };

// ---------------- the commander's career: one point for every battle won or drawn ----------------
export const CAREER = [
  { id: 'politics', name: 'Politics', text: 'Friends in Rome send men: +10% recruits after battles and +5% spoils per level.' },
  { id: 'economy', name: 'Economy', text: 'Everything you buy (hiring, equipment, raising units) costs 6% less per level.' },
  { id: 'medicine', name: 'Medicine', text: 'Your surgeons save more men: +6% wounded recovered per level.' },
  { id: 'training', name: 'Training', text: 'Cohorts learn 5% faster from battle per level, and veterans cost 10% less to hire.' },
  { id: 'organisation', name: 'Army organisation', text: 'You can command four more units per level.' },
  { id: 'logistics', name: 'Logistics', text: 'The army eats 5% less and foraging brings in 8% more per level.' },
  { id: 'recon', name: 'Reconnaissance', text: 'Your scouts see 7% farther per level. Level 1: your advisers in camp learn what the next enemy is made of. Level 2: the briefing always gives exact enemy numbers.' }
];
export const CAREER_MAX = 5;
export const careerLv = (c, id) => ((c.career && c.career.levels) || {})[id] || 0;
export const careerPoints = (c) => (c.career && c.career.points) || 0;
// Three skills are offered at a time (rotating, so every skill comes round): one decision, not a menu of seven.
export function careerOffer(c) {
  if (careerPoints(c) < 1) return null;
  const open = CAREER.filter(k => careerLv(c, k.id) < CAREER_MAX); if (!open.length) return null;
  const spent = Object.values((c.career && c.career.levels) || {}).reduce((a, b) => a + b, 0), out = [];
  for (let i = 0; i < open.length && out.length < 3; i++) out.push(open[(spent * 3 + i) % open.length]);
  return out;
}
export function chooseCareer(c, id) {
  const offer = careerOffer(c); if (!offer || !offer.some(k => k.id === id)) return false;
  c.career = c.career || { points: 0, levels: {} }; c.career.levels[id] = careerLv(c, id) + 1; c.career.points--; return true;
}
export const costMult = (c) => 1 - 0.06 * careerLv(c, 'economy');

// ---------------- the line of march: chosen once, on arriving at a new battle ----------------
export const ROUTES = [
  { id: 'road', name: 'Keep to the road', text: 'The supply line stays open behind you. The army arrives fed and in order.', effects: ['+45 supplies', 'nothing lost'] },
  { id: 'forced', name: 'Forced march', text: 'Outrun the wagons and fall on the enemy before all his men have come in. The men are tired and the grain is behind you.', effects: ['enemy host 10% smaller', '-12 condition, every unit', '-25 supplies'] },
  { id: 'forage', name: 'Live off the land', text: 'Spread out and strip the farms as you go. The wagons fill, and the tribes will not forget it.', effects: ['+90 supplies', 'goodwill -1'] }
];
export const routePending = (c) => { const s = SCENARIOS[c.scenario]; return !!s && !(c.phase > 0) && c.routeFor !== s.id; };
export function chooseRoute(c, id) {
  const s = SCENARIOS[c.scenario]; if (!s || !routePending(c)) return null;
  c.routeFor = s.id;
  if (id === 'forced') { c.surprise = s.id; c.cohorts.forEach(h => { h.condition = Math.max(35, h.condition - 12); }); c.supplies = Math.max(0, c.supplies - 25); return 'A forced march: you arrive before the enemy has gathered all his men, but tired, with the wagons far behind.'; }
  if (id === 'forage') { c.supplies += 90; c.favour = Math.max(-3, c.favour - 1); return 'The army lives off the land: full wagons and angry farmers.'; }
  c.supplies += 45; return 'You keep to the road and the grain comes up behind you.';
}

// ---------------- legions and legates ----------------
// Legionary cohorts are grouped in tens; the other units are shared out among the legions. A legate (any officer not leading a unit) may lead each.
export function legionsOf(c) {
  const live = c.cohorts.filter(h => h.men > 0), leg = live.filter(h => h.type === 'legionary'), n = Math.max(1, Math.ceil(leg.length / 10)), map = {};
  leg.forEach((h, i) => { map[h.id] = Math.floor(i / 10) + 1; });
  live.filter(h => h.type !== 'legionary').forEach((h, i) => { map[h.id] = (i % n) + 1; });
  return { count: n, of: map };
}
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
export function legateOf(c, legion) { const id = (c.legates || {})[legion]; return id != null ? c.officers.find(o => o.id === id && o.alive) || null : null; }
export function setLegate(c, legion, officerId) {
  c.legates = c.legates || {};
  for (const k of Object.keys(c.legates)) if (c.legates[k] === officerId) delete c.legates[k];
  if (officerId == null) { delete c.legates[legion]; return; }
  c.cohorts.forEach(h => { if (h.officerId === officerId) h.officerId = null; });          // a legate leads a legion, not a cohort
  c.legates[legion] = officerId;
}

// ---------------- earlier fights shape the named battle ----------------
export function linksFor(c, scn) {
  const best = (id) => (c.history || []).filter(h => h.id === id).reduce((b, h) => (h.outcome === 'victory' ? 'victory' : b || h.outcome), null);
  return (scn.links || []).map(l => ({ ...l, won: best(l.from) === 'victory', name: (SCENARIOS.find(s => s.id === l.from) || {}).name || l.from }));
}
// Everything the campaign hands to a battle beyond the army itself.
export function battleExtras(c, scn) {
  const typeScale = {}; let morale = 0;
  for (const l of linksFor(c, scn)) if (l.won) { for (const [t, v] of Object.entries(l.scale || {})) typeScale[t] = (typeScale[t] ?? 1) * v; morale += l.morale || 0; }
  const lg = legionsOf(c), legates = [];
  if (lg.count > 1) for (let k = 1; k <= lg.count; k++) { const o = legateOf(c, k); if (o) legates.push({ legion: k, name: o.name, tactics: o.tactics || 0 }); }
  return { typeScale, moraleAdd: morale, legates, sight: 1 + 0.07 * careerLv(c, 'recon') };
}

// ---------------- the commander you face ----------------
export const STYLES = {
  cautious: 'Cautious: slow to commit, falls back to better ground and returns rested. Do not expect him to come to you quickly.',
  aggressive: 'Aggressive: comes straight at you without forming up, and throws in his champions early. The first clash is the dangerous one.',
  cunning: 'Cunning: more feints and wider flanking, and he goes for your baggage. Guard your wings and your wagons.',
  stubborn: 'Stubborn: his men are steadier than most and will not fall back to rest. They must be broken where they stand.',
  balanced: 'No particular habit is known.'
};

// ---------------- prisoners ----------------
export function prisonerOptions(c, n) {
  if (!n || n < 10) return [];
  return [
    { id: 'ransom', name: 'Ransom them to their kin', text: `+${n * 2} denarii`, apply: (c2) => { c2.gold += n * 2; } },
    { id: 'sell', name: 'Sell them to the slave dealers', text: `+${Math.round(n * 3.5)} denarii, goodwill -1`, apply: (c2) => { c2.gold += Math.round(n * 3.5); c2.favour -= 1; } },
    { id: 'enrol', name: 'Enrol the willing as recruits', text: `+${Math.round(n * 0.25)} recruits for the pool`, apply: (c2) => { c2.manpower = (c2.manpower || 0) + Math.round(n * 0.25); } },
    { id: 'release', name: 'Release them', text: 'Goodwill +1 (the next host is smaller)', apply: (c2) => { c2.favour += 1; } }
  ];
}

// ---------------- optional fights ----------------
export function canSkip(c) { const s = SCENARIOS[c.scenario]; return !!s && !!s.optional && !(c.phase > 0); }
export function skipBattle(c) {
  const s = SCENARIOS[c.scenario]; if (!canSkip(c)) return null;
  c.history = c.history || []; c.history.push({ id: s.id, outcome: 'skipped', day: c.day });
  c.scenario++; c.phase = 0; c.scouted = false; c.campUse = {}; const next = SCENARIOS[c.scenario]; if (!next) c.over = true;
  return `You march past ${s.name}. Nothing is won there and nothing is lost.`;
}
export const unitCat = (type) => (UNIT_TYPES[type] || {}).cat;
