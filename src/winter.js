// Winter quarters: between campaigning years (at the start of an act fought in a new year) the army goes into winter quarters. Two
// decisions: where to winter, and what to do with the winter. Then Rome's verdict on your standing arrives with the spring.
import { SCENARIOS } from './data.js';
import { standingOf, addStanding } from './state.js';

const men = (c) => c.cohorts.reduce((a, h) => a + h.men, 0);
const rest = (c, to) => { for (const h of c.cohorts) h.condition = Math.min(100, Math.max(h.condition, to === 100 ? 100 : h.condition + to)); };
const yearOf = (s) => (s && parseInt(s.year, 10)) || 0;

// Is a winter due before the battle the army now faces? Only at the first battle of an act fought in a later year than the last battle.
export function winterDue(c) {
  const s = SCENARIOS[c.scenario]; if (!s || c.over || (c.phase || 0) > 0 || c.winterFor === s.act) return false;
  const prev = SCENARIOS.slice(0, c.scenario).reverse().find(x => (c.history || []).some(h => h.id === x.id && h.outcome !== 'skipped'));
  return !!prev && prev.act !== s.act && yearOf(prev) > yearOf(s);       // years BC count down
}

export function winterWhere(c) {
  const m = men(c), allies = Math.round(m * 0.03), prov = Math.round(m * 0.06) + 100, req = Math.round(m * 0.04), recruits = Math.round(m * 0.05);
  return [
    { label: 'Among allied tribes', fx: `${allies} denarii for food and lodging · every unit fully rested · goodwill +1`, ok: () => c.gold >= allies, apply: () => { c.gold -= allies; rest(c, 100); c.favour = Math.min(3, (c.favour || 0) + 1); return 'The army winters among friends, fed and rested.'; } },
    { label: 'In a fortified camp in hostile country', fx: `+${req} supplies requisitioned · men only partly rested · goodwill -1`, apply: () => { c.supplies += req; rest(c, 15); c.favour = Math.max(-3, (c.favour || 0) - 1); return 'The army lives off the country behind its ramparts. The locals will remember it.'; } },
    { label: 'In the Province, under Rome\'s eye', fx: `${prov} denarii · fully rested · +${recruits} recruits · standing in Rome +4`, ok: () => c.gold >= prov, apply: () => { c.gold -= prov; rest(c, 100); c.manpower = (c.manpower || 0) + recruits; addStanding(c, 4); return 'You hold the assizes and are seen in the Province. Volunteers come in.'; } }
  ];
}
export function winterWhat(c) {
  const m = men(c), sup = Math.round(m * 0.02), n = Math.round(m * 0.08), rg = Math.round(n * 1.5), gift = Math.round(400 + m * 0.02);
  return [
    { label: 'Drill all winter', fx: `${sup} supplies · +60 experience for every unit`, ok: () => c.supplies >= sup, apply: () => { c.supplies -= sup; for (const h of c.cohorts) h.xp += 60; return 'The men drill through the snow. They will be sharper in spring.'; } },
    { label: 'A recruiting drive', fx: `${rg} denarii · +${n} recruits`, ok: () => c.gold >= rg, apply: () => { c.gold -= rg; c.manpower = (c.manpower || 0) + n; return `${n} recruits come in over the winter.`; } },
    { label: 'Send gold to friends in Rome', fx: `${gift} denarii · standing in Rome +12`, ok: () => c.gold >= gift, apply: () => { c.gold -= gift; addStanding(c, 12); return 'Your agents in Rome spend freely. Your name is heard in the Forum.'; } },
    { label: 'Rest and save the money', fx: 'nothing', apply: () => 'A quiet winter.' }
  ];
}
// Spring: Rome's verdict on your standing.
export function winterVerdict(c) {
  c.winterFor = (SCENARIOS[c.scenario] || {}).act;
  const st = standingOf(c);
  if (st >= 70) { c.vets = (c.vets || 0) + 300; return `Rome is proud of you (standing ${st}): the Senate sends a draft of 300 veterans.`; }
  if (st <= 15) { c.nextMorale = (c.nextMorale || 0) - 4; const g = Math.min(c.gold, 300); c.gold -= g; return `Your enemies in Rome move to recall you (standing ${st}). Defending yourself costs ${g} denarii, and the army hears of it.`; }
  return `Spring. Your standing in Rome is ${st}.`;
}
