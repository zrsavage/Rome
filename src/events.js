// Events on the march: between two battles, about two marches in three bring one short decision on the campaign map. Each event fits its
// theatre and time; each choice trades denarii, supplies, goodwill, men or knowledge of the enemy. The effects are written on the buttons.
import { SCENARIOS } from './data.js';

const clampFav = (v) => Math.max(-3, Math.min(3, v));
const fav = (c, d) => { c.favour = clampFav((c.favour || 0) + d); };
const legions = (c) => c.cohorts.filter(h => h.type === 'legionary');
const loseShare = (c, k) => { let lost = 0; for (const h of c.cohorts) { const n = Math.round(h.men * k); h.men = Math.max(Math.ceil(h.maxMen * 0.35), h.men - n); lost += n; } return lost; };
const tire = (c, d) => { for (const h of c.cohorts) h.condition = Math.max(35, Math.min(100, h.condition - d)); };
const gaul = (s) => ['I', 'II', 'B', 'G'].includes(s.act), civil = (s) => ['III', 'IV', 'V'].includes(s.act);

export const EVENTS = [
  { id: 'deserter', when: () => true, title: 'A deserter', text: 'A man from the enemy camp is brought in at night. He says he will tell you what they have, for a price.',
    choices: [
      { label: 'Pay him', fx: '60 denarii · the next enemy is scouted', ok: (c) => c.gold >= 60 && !c.scouted, apply: (c) => { c.gold -= 60; c.scouted = true; return 'He talks. You know what you will face.'; } },
      { label: 'Send him away', fx: 'nothing', apply: () => 'He is walked out of camp under guard.' }] },
  { id: 'tribe', when: (s) => gaul(s), title: 'A plea for help', text: 'Envoys of a small tribe beg you to drive raiders from their villages. It would cost the army two days.',
    choices: [
      { label: 'Help them', fx: '40 supplies · men a little tired · goodwill +1', ok: (c) => c.supplies >= 40, apply: (c) => { c.supplies -= 40; tire(c, 6); fav(c, 1); return 'The raiders scatter. The tribe will speak well of Rome.'; } },
      { label: 'Refuse', fx: 'goodwill -1', apply: (c) => { fav(c, -1); return 'The envoys go home empty-handed and bitter.'; } }] },
  { id: 'fever', when: () => true, title: 'Fever in the camp', text: 'Bad water: men are falling sick in the tents.',
    choices: [
      { label: 'Isolate the sick and boil the water', fx: '50 supplies · about 1% of the men lost', ok: (c) => c.supplies >= 50, apply: (c) => { c.supplies -= 50; const n = loseShare(c, (c.hospital || 0) >= 2 ? 0.005 : 0.01); return `The fever is held. ${n} men die of it.`; } },
      { label: 'March on', fx: 'about 4% of the men lost (2% with a hospital of level 2+) · men tired', apply: (c) => { const n = loseShare(c, (c.hospital || 0) >= 2 ? 0.02 : 0.04); tire(c, 10); return `The army marches the fever off. ${n} men are left in roadside graves.`; } }] },
  { id: 'hostage', when: (s) => gaul(s), title: 'A captured noble', text: 'Your patrols bring in a young noble taken on the road. His family will pay well.',
    choices: [
      { label: 'Ransom him', fx: '+150 denarii · goodwill -1', apply: (c) => { c.gold += 150; fav(c, -1); return 'His family pays. They will not forget the price.'; } },
      { label: 'Let him go with gifts', fx: '40 denarii · goodwill +1', ok: (c) => c.gold >= 40, apply: (c) => { c.gold -= 40; fav(c, 1); return 'He rides home praising Roman good faith.'; } }] },
  { id: 'traders', when: () => true, title: 'Traders at the gate', text: 'A train of traders has followed the army, with grain to sell at a soldier\'s price.',
    choices: [
      { label: 'Buy grain', fx: '120 denarii · +100 supplies', ok: (c) => c.gold >= 120, apply: (c) => { c.gold -= 120; c.supplies += 100; return 'The wagons are full again.'; } },
      { label: 'Requisition it', fx: '+100 supplies · goodwill -1', apply: (c) => { c.supplies += 100; fav(c, -1); return 'The grain is taken. Word of it spreads.'; } },
      { label: 'Send them off', fx: 'nothing', apply: () => 'The traders move on.' }] },
  { id: 'omens', when: () => true, title: 'Bad omens', text: 'The sacred chickens will not eat. The men have seen it, and they mutter.',
    choices: [
      { label: 'Sacrifice again, more richly', fx: '40 denarii · +3 morale next battle', ok: (c) => c.gold >= 40, apply: (c) => { c.gold -= 40; c.nextMorale = (c.nextMorale || 0) + 3; return 'The second sacrifice is favourable. The men cheer.'; } },
      { label: 'Laugh it off', fx: '-3 morale next battle', apply: (c) => { c.nextMorale = (c.nextMorale || 0) - 3; return 'You make a joke of it. Not everyone laughs.'; } }] },
  { id: 'allies', when: (s) => gaul(s) || s.theater === 'Africa' || s.theater === 'Hispania', title: 'Horsemen offered', text: 'A friendly chief offers a band of his horsemen, if you pay them.',
    choices: [
      { label: 'Take them into service', fx: '180 denarii · a unit of allied horse (half a command slot)', ok: (c, room) => c.gold >= 180 && room >= 0.5, apply: (c) => { c.gold -= 180; const id = Math.max(0, ...c.cohorts.map(h => h.id)) + 1; c.cohorts.push({ id, name: 'Allied Horse (volunteers)', type: 'aux_cav', men: 100, maxMen: 150, xp: 40, drill: 20, condition: 95, officerId: null }); return 'A hundred riders join the column.'; } },
      { label: 'Decline', fx: 'nothing', apply: () => 'The chief rides off with his men.' }] },
  { id: 'clemency', when: (s) => civil(s), title: 'Pompeian officers taken', text: 'A few Pompeian officers have been caught on the road. Caesar\'s way is clemency, but they would fetch a price.',
    choices: [
      { label: 'Pardon them', fx: 'goodwill +1 (your name for clemency)', apply: (c) => { fav(c, 1); return 'They are released. The story goes round both camps.'; } },
      { label: 'Hold them for ransom', fx: '+120 denarii · goodwill -1', apply: (c) => { c.gold += 120; fav(c, -1); return 'Their families pay. Pompeian soldiers hear of it.'; } }] },
  { id: 'mutiny', when: (s) => ['IV', 'V'].includes(s.act), title: 'The veterans want their pay', text: 'Veterans of many campaigns crowd your tent and demand their bonuses and their discharge.',
    choices: [
      { label: 'Pay them', fx: '200 denarii', ok: (c) => c.gold >= 200, apply: (c) => { c.gold -= 200; return 'Paid, they go back to their tents.'; } },
      { label: 'Call them "citizens" instead of soldiers', fx: 'a gamble: they may beg to stay, or some will leave', apply: (c) => { if (Math.random() < 0.6) { for (const h of legions(c)) h.xp += 30; return 'Stung, they beg to stay in the ranks. (Caesar did this in 47 BC.)'; } const h = legions(c).sort((a, b) => b.xp - a.xp)[0]; const n = h ? Math.round(h.men * 0.15) : 0; if (h) h.men -= n; return `It does not work this time: ${n} men of ${h ? h.name : 'the legion'} take their discharge.`; } }] },
  { id: 'storm', when: (s) => s.act === 'B' || s.theater === 'Africa', title: 'Storm at sea', text: 'A storm catches the supply ships. Some are driven ashore with their cargo.',
    choices: [
      { label: 'Send men to salvage what they can', fx: 'lose 30 supplies · men tired', apply: (c) => { c.supplies = Math.max(0, c.supplies - 30); tire(c, 8); return 'Much of the grain is saved from the surf.'; } },
      { label: 'Write it off', fx: 'lose 80 supplies', apply: (c) => { c.supplies = Math.max(0, c.supplies - 80); return 'The grain is gone.'; } }] },
  { id: 'guides', when: () => true, title: 'Local guides', text: 'Herdsmen who know every path offer to guide your scouts.',
    choices: [
      { label: 'Hire them', fx: '50 denarii · the next enemy is scouted', ok: (c) => c.gold >= 50 && !c.scouted, apply: (c) => { c.gold -= 50; c.scouted = true; return 'Your scouts come back with a full count of the enemy.'; } },
      { label: 'Trust your own scouts', fx: 'nothing', apply: () => 'You thank them and send them home.' }] }
];

// The event for the march to the next battle, or null: chosen once per battle, seeded so a reload shows the same one.
export function pendingEvent(c) {
  const scn = SCENARIOS[c.scenario];
  if (!scn || c.over || !c.prologueDone || c.eventFor === c.scenario || (c.phase || 0) > 0 || !(c.history || []).some(h => h.id !== 'prologue')) return null;
  const seed = (c.scenario * 7919 + (c.history || []).length * 104729) % 1000;
  if (seed % 3 === 0) { c.eventFor = c.scenario; return null; }       // about one march in three is quiet
  const seen = c.eventsSeen || [], pool = EVENTS.filter(e => e.when(scn) && !seen.slice(-4).includes(e.id));
  if (!pool.length) return null;
  return pool[seed % pool.length];
}
export function resolveEvent(c, ev, i, room) {
  const ch = ev.choices[i]; if (!ch || (ch.ok && !ch.ok(c, room))) return null;
  const msg = ch.apply(c); c.eventFor = c.scenario; c.eventsSeen = [...(c.eventsSeen || []), ev.id].slice(-12);
  return msg;
}
