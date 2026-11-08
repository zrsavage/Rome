// Post-battle spoils: choose one bonus (3 options after a victory, 2 after a draw).
import { upgradeCost, MAX_TIER } from './perks.js';

const OFFICER_POOL = [
  { name: 'Gnaeus Pomponius', rank: 'Legate', tactics: 3, drill: 2, logistics: 2, diplomacy: 1, bio: 'A seasoned legate with a calm head in a crisis.' },
  { name: 'Publius Cornelius', rank: 'Tribune', tactics: 1, drill: 3, logistics: 1, diplomacy: 2, bio: 'A strict trainer of recruits.' },
  { name: 'Sextus Varro', rank: 'Prefect', tactics: 2, drill: 1, logistics: 3, diplomacy: 1, bio: 'Quartermaster who never runs short.' },
  { name: 'Marcus Fulvius', rank: 'Tribune', tactics: 2, drill: 1, logistics: 1, diplomacy: 3, bio: 'A smooth talker among the Gallic nobles.' },
  { name: 'Lucius Marcellus', rank: 'Centurion', tactics: 3, drill: 3, logistics: 0, diplomacy: 0, bio: 'A first-rank centurion who leads from the front.' }
];

export function rewardOptions(c, scn, outcome, rnd = Math.random) {
  if (outcome === 'defeat') return [];
  const rw = scn.rewards, k = outcome === 'victory' ? 1 : 0.6, pool = [];
  const gold = Math.round(rw.gold * 0.8 * k), sup = Math.round(rw.supplies * 0.9 * k);
  pool.push({ id: 'plunder', name: 'Plunder the enemy camp', text: `+${gold} denarii`, apply: (c) => { c.gold += gold; } });
  pool.push({ id: 'stores', name: 'Seize their stores', text: `+${sup} supplies`, apply: (c) => { c.supplies += sup; } });
  pool.push({ id: 'veterans', name: 'Veterans volunteer', text: 'Your weakest unit gains 80 men; every unit gains 20 experience.', apply: (c) => { const w = c.cohorts.slice().sort((a, b) => (a.men / a.maxMen) - (b.men / b.maxMen))[0]; w.men = Math.min(w.maxMen, w.men + 80); c.cohorts.forEach(h => { h.xp += 20; }); } });
  const best = c.cohorts.filter(h => (h.type === 'legionary' || h.type === 'aux_inf')).sort((a, b) => b.men - a.men).find(h => ((h.upg && h.upg.armour) || 0) < MAX_TIER);
  if (best) pool.push({ id: 'arms', name: 'Captured arms and armour', text: `${best.name} gains a free armour tier.`, apply: (c) => { const h = c.cohorts.find(x => x.id === best.id); h.upg = { armour: 0, weapon: 0, ...(h.upg || {}) }; h.upg.armour++; } });
  if ((c.hospital || 0) < 3) pool.push({ id: 'surgeons', name: 'Captured Greek surgeons', text: 'The field hospital gains a level.', apply: (c) => { c.hospital = (c.hospital || 0) + 1; } });
  const have = new Set(c.officers.map(o => o.name)), cand = OFFICER_POOL.filter(o => !have.has(o.name));
  if (cand.length && c.officers.filter(o => o.alive).length < 7) { const o = cand[Math.floor(rnd() * cand.length)]; pool.push({ id: 'officer', name: `${o.rank} ${o.name} joins`, text: `${o.bio} (tactics ${o.tactics}, drill ${o.drill}, logistics ${o.logistics}, diplomacy ${o.diplomacy})`, apply: (c) => { c.officers.push({ id: Math.max(0, ...c.officers.map(x => x.id)) + 1, name: o.name, rank: o.rank, tactics: o.tactics, drill: o.drill, logistics: o.logistics, diplomacy: o.diplomacy, xp: 0, level: 1, points: 1, perks: [], alive: true, bio: o.bio }); } }); }
  // shuffle, then take 3 (victory) or 2 (draw); always include one economy option so the choice is never all-or-nothing
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const n = outcome === 'victory' ? 3 : 2, picked = pool.slice(0, n);
  if (!picked.some(p => p.id === 'plunder' || p.id === 'stores')) picked[picked.length - 1] = pool.find(p => p.id === 'plunder');
  return picked;
}
