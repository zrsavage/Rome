// Campaign economy: can a player afford a big army? Plays the whole campaign as a string of victories (side act and optional fights
// included) with a greedy player who forages fully every camp, sells prisoners, and spends every spare denarius on new legionary
// cohorts up to the command limit. Prints gold, supplies, rations and army size before each battle.
//   node tools/economy.mjs [lossRate=0.10] [difficulty=normal] [orgLevels=0]
import { SCENARIOS, RAISE, DIFFICULTY } from '../src/data.js';
import { newCampaign, forceScale, commandLimit, slotsUsed, modsOf } from '../src/state.js';

const LOSS = +(process.argv[2] || 0.10), DIFF = process.argv[3] || 'normal', ORG = +(process.argv[4] || 0);
const c = newCampaign(DIFF); c.prologueDone = true; c.history = [{ id: 'prologue', outcome: 'victory' }]; c.gold = 400; c.supplies = 300;
c.career = { points: 0, levels: { organisation: 0 } };
const men = () => c.cohorts.reduce((a, h) => a + h.men, 0), food = () => Math.ceil(men() / 60 * modsOf(c).supplyUse);
let pool = 0, starved = 0;
console.log('battle                         units slots/limit   men   gold  supplies  rations  spoilsG spoilsS');
SCENARIOS.forEach((scn, i) => {
  if (scn.act === 'III' && ORG && c.career.levels.organisation < ORG) c.career.levels.organisation = ORG;      // a player who takes Army organisation
  // camp: forage everything once (cautious 35, wide 70, requisition 60, buy 60 for 90 denarii), sell last battle's prisoners
  c.supplies += 35 + 70 + 60; if (c.gold >= 90) { c.gold -= 90; c.supplies += 60; }
  // fill the ranks from the pool, then raise new cohorts with what is left
  for (const h of c.cohorts) { const add = Math.min(pool, h.maxMen - h.men); h.men += add; pool -= add; }
  const r = RAISE.legionary;
  while (slotsUsed(c) + 1 <= commandLimit(c) && c.gold >= r.gold && c.supplies >= r.supplies + 200) { c.gold -= r.gold; c.supplies -= r.supplies; c.cohorts.push({ id: 1000 + c.cohorts.length, name: 'new', type: 'legionary', men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100 }); }
  // the march: rations
  const due = food() * ((scn && scn.daysToPrepare) || 3); if (c.supplies < due) starved++; c.supplies = Math.max(0, c.supplies - due);
  // the battle: a victory
  const fs = forceScale(c, scn), rs = Math.pow(fs, 0.75), mult = (scn.rewardMult || 1) * DIFFICULTY[DIFF].reward * rs;
  const rw = scn.rewards, g = Math.round(rw.gold * mult), s = Math.round(rw.supplies * mult), rec = Math.round(rw.recruits * mult);
  const enemyMen = men() * fs * 0.9, prisoners = Math.round(enemyMen * 0.08);
  console.log(`${String(i + 1).padStart(2)} ${scn.name.slice(0, 27).padEnd(27)} ${String(c.cohorts.length).padStart(5)} ${String(slotsUsed(c)).padStart(5)}/${String(commandLimit(c)).padEnd(4)} ${String(men()).padStart(6)} ${String(c.gold).padStart(6)} ${String(c.supplies + due).padStart(9)} ${String(due).padStart(8)} ${String(g).padStart(8)} ${String(s).padStart(7)}`);
  c.gold += g + Math.round(prisoners * 3.5); c.supplies += s;
  for (const h of c.cohorts) { const lost = Math.round(h.men * LOSS); h.men -= lost; pool += Math.round((h.maxMen - h.men) * 0.25); }
  pool += rec;
  c.history.push({ id: scn.id, outcome: 'victory' });
});
console.log(`\nfinal: ${c.cohorts.length} units, ${men()} men; marches with too little food: ${starved} of ${SCENARIOS.length}`);
