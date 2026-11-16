// Campaign economy: can a player afford a big army, and does money stay a choice? Plays the whole campaign as a string of victories
// (side act and optional fights included). The player forages fully every camp, sells prisoners, spends OTHER% of each battle's income
// on drills, kit and the hospital, and spends the rest on new legionary cohorts up to the command limit. Pay is drawn after every battle.
//   node tools/economy.mjs [lossRate=0.10] [otherSpend=0.33] [difficulty=normal]
import { SCENARIOS, RAISE, DIFFICULTY } from '../src/data.js';
import { newCampaign, forceScale, commandLimit, slotsUsed, modsOf, raiseMult, payDue } from '../src/state.js';
import { saleValue } from '../src/campaign.js';

const LOSS = +(process.argv[2] || 0.10), OTHER = +(process.argv[3] ?? 0.33), DIFF = process.argv[4] || 'normal';
const c = newCampaign(DIFF); c.prologueDone = true; c.history = [{ id: 'prologue', outcome: 'victory' }]; c.gold = 400; c.supplies = 300;
const men = () => c.cohorts.reduce((a, h) => a + h.men, 0), food = () => Math.ceil(men() / 60 * modsOf(c).supplyUse);
let pool = 0, starved = 0, unpaid = 0, other = 0;
console.log('battle                         units slots/limit   men   gold   price  pay  income  supplies rations');
SCENARIOS.forEach((scn, i) => {
  c.supplies += 35 + 70 + 60; if (c.gold >= 90 && c.supplies < food() * 6) { c.gold -= 90; c.supplies += 60; }
  for (const h of c.cohorts) { const add = Math.min(pool, h.maxMen - h.men); h.men += add; pool -= add; }
  const r = RAISE.legionary, price = () => Math.round(r.gold * raiseMult(c));
  const keep = payDue(c) * 0.6;                                     // a careful player keeps something back for pay
  while (slotsUsed(c) + 1 <= commandLimit(c) && c.gold - price() >= keep && c.supplies >= r.supplies + 200) { c.gold -= price(); c.supplies -= r.supplies; c.cohorts.push({ id: 1000 + c.cohorts.length, name: 'new', type: 'legionary', men: r.men, maxMen: r.max, xp: 0, drill: 10, condition: 100 }); }
  const due = food() * ((scn && scn.daysToPrepare) || 3); if (c.supplies < due) starved++; c.supplies = Math.max(0, c.supplies - due);
  const fs = forceScale(c, scn), mult = (scn.rewardMult || 1) * DIFFICULTY[DIFF].reward * Math.pow(fs, 0.75);
  const rw = scn.rewards, g = Math.round(rw.gold * mult), s = Math.round(rw.supplies * mult * Math.pow(fs, -0.35)), rec = Math.round(rw.recruits * mult);
  const prisoners = Math.round(men() * fs * 0.9 * 0.12), sale = saleValue(c, prisoners); c.glut = (c.glut || 0) + prisoners;
  const income = g + sale, pay = payDue(c);
  console.log(`${String(i + 1).padStart(2)} ${scn.name.slice(0, 27).padEnd(27)} ${String(c.cohorts.length).padStart(5)} ${String(slotsUsed(c)).padStart(5)}/${String(commandLimit(c)).padEnd(4)} ${String(men()).padStart(6)} ${String(c.gold).padStart(6)} ${String(price()).padStart(6)} ${String(pay).padStart(5)} ${String(income).padStart(7)} ${String(c.supplies + due).padStart(9)} ${String(due).padStart(7)}`);
  c.gold += Math.round(income * (1 - OTHER)); other += Math.round(income * OTHER); c.supplies += s;
  c.glut = Math.round(c.glut * 0.6);
  if (c.gold >= pay) c.gold -= pay; else { unpaid++; c.gold = 0; }
  for (const h of c.cohorts) { const lost = Math.round(h.men * LOSS); h.men -= lost; pool += Math.round((h.maxMen - h.men) * 0.25); }
  pool += rec; c.history.push({ id: scn.id, outcome: 'victory' });
});
console.log(`\nfinal: ${c.cohorts.length} units (${slotsUsed(c)} slots of ${commandLimit(c)}), ${men()} men, ${c.gold} denarii; spent on other things ${other}; unpaid battles ${unpaid}; hungry marches ${starved}`);
