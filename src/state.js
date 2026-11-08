// Campaign state: cohorts, officers, resources. Plain JSON so it saves to localStorage.
import { XP_LEVELS, SCENARIOS, WORLD } from './data.js';
import { levelFor } from './sim.js';

export function newCampaign(difficulty = 'normal') {
  return {
    version: 1, difficulty, scenario: 0, day: 1, daysLeft: SCENARIOS[0].daysToPrepare,
    gold: 300, supplies: 160, fort: 0, favour: 0, scouted: false, log: [], over: false,
    cohorts: [
      { id: 1, name: 'I Cohort',   type: 'legionary', men: 400, maxMen: 480, xp: 60, drill: 30, condition: 90, officerId: 1 },
      { id: 2, name: 'II Cohort',  type: 'legionary', men: 380, maxMen: 480, xp: 30, drill: 20, condition: 90, officerId: 2 },
      { id: 3, name: 'III Cohort', type: 'legionary', men: 360, maxMen: 480, xp: 10, drill: 15, condition: 90, officerId: null },
      { id: 4, name: 'Balearic Slingers', type: 'slinger', men: 120, maxMen: 150, xp: 20, drill: 20, condition: 95, officerId: null },
      { id: 5, name: 'Equites Turma', type: 'equites', men: 50, maxMen: 60, xp: 20, drill: 25, condition: 95, officerId: 4 }
    ],
    officers: [
      { id: 1, name: 'Titus Pullo', rank: 'Centurion', tactics: 3, drill: 2, logistics: 1, diplomacy: 0, xp: 40, level: 1, alive: true, bio: 'A brawler who leads from the front line.' },
      { id: 2, name: 'Lucius Vorenus', rank: 'Centurion', tactics: 2, drill: 4, logistics: 1, diplomacy: 1, xp: 40, level: 1, alive: true, bio: 'A stern drillmaster; his cohorts march like clockwork.' },
      { id: 3, name: 'Decimus Silvanus', rank: 'Tribune', tactics: 1, drill: 0, logistics: 4, diplomacy: 3, xp: 20, level: 1, alive: true, bio: 'A patrician quartermaster with a talent for haggling.' },
      { id: 4, name: 'Aulus Fabius', rank: 'Prefect of Horse', tactics: 3, drill: 1, logistics: 2, diplomacy: 1, xp: 20, level: 1, alive: true, bio: 'Bold cavalryman, a little too fond of glory.' }
    ]
  };
}

export const OFFICER_XP = [0, 60, 150, 300, 500, 800];
export const TRAITS = ['tactics', 'drill', 'logistics', 'diplomacy'];

export function officerById(c, id) { return c.officers.find(o => o.id === id && o.alive) || null; }

// Roman battle specs from cohorts, auto-deployed in a battle line.
export function romeSpecs(c) {
  const cohorts = c.cohorts.filter(h => h.men > 0);
  const inf = cohorts.filter(h => h.type === 'legionary');
  const specs = [];
  const place = (list, y, x0, x1) => list.forEach((h, i) => {
    const x = list.length === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (list.length - 1);
    specs.push({ type: h.type, name: h.name, cohortId: h.id, men: h.men, maxMen: h.maxMen, xp: h.xp, drill: h.drill, condition: h.condition, officer: officerById(c, h.officerId), x, y, stance: 'aggressive' });
  });
  const half = (inf.length - 1) * 50;
  place(inf, 880, 800 - half, 800 + half);
  place(cohorts.filter(h => h.type === 'slinger'), 935, 740, 860);
  const cav = cohorts.filter(h => h.type === 'equites');
  place(cav, 905, 1010, 1110);
  return specs;
}

export function applyResult(c, result) {
  const notes = [];
  for (const r of result.rows) {
    const h = c.cohorts.find(x => x.id === r.cohortId);
    if (!h) continue;
    h.men = r.endMen; h.xp += r.xpGain; h.condition = Math.max(35, h.condition - 20);
    if (r.officerId != null) {
      const o = c.officers.find(x => x.id === r.officerId);
      if (o) {
        if (r.officerFate === 'killed') { o.alive = false; h.officerId = null; notes.push(`${o.rank} ${o.name} fell in battle with ${h.name}.`); }
        else { o.xp += result.officerXp; const up = levelOfficer(o); if (up) notes.push(up); }
      }
    }
  }
  c.gold += result.spoils.gold; c.supplies += result.spoils.supplies;
  let recruits = result.spoils.recruits;
  for (const h of c.cohorts) { const add = Math.min(recruits, h.maxMen - h.men); h.men += add; recruits -= add; }
  return notes;
}

export function levelOfficer(o) {
  let msg = null;
  while (o.level < OFFICER_XP.length - 1 && o.xp >= OFFICER_XP[o.level + 1]) {
    o.level++;
    // grow the officer's strongest trait; ties favour tactics
    const best = TRAITS.slice().sort((a, b) => o[b] - o[a] || TRAITS.indexOf(a) - TRAITS.indexOf(b))[0];
    o[best] = Math.min(5, o[best] + 1);
    msg = `${o.name} reached level ${o.level}! (${best} +1)`;
  }
  return msg;
}

export { levelFor, XP_LEVELS, WORLD };
