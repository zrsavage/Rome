// Named men in the ranks, the decorations they win (dona militaria) and the centurions who rise from among them.
// A cohort keeps two or three notable soldiers; after each battle the best deeds are rewarded, and when a centurion falls the cohort's
// most decorated man takes his place.
import { UNIT_TYPES } from './data.js';

const PRAE = ['Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Publius', 'Gnaeus', 'Sextus', 'Aulus', 'Decimus', 'Servius', 'Manius'];
const NOMEN = ['Antonius', 'Aurelius', 'Baculus', 'Caecilius', 'Crastinus', 'Domitius', 'Fabius', 'Fufius', 'Herennius', 'Junius', 'Laelius', 'Licinius', 'Lucanius', 'Marius', 'Minucius', 'Petronius', 'Pomponius', 'Sempronius', 'Sulpicius', 'Terentius', 'Valerius', 'Vettius', 'Volusenus', 'Afranius', 'Cassius', 'Hirtius', 'Arrius', 'Statius'];
const GALLIC = ['Litaviccus', 'Cotus', 'Eporedorix', 'Viridomarus', 'Catamantaloedis', 'Tasgetius', 'Moritasgus', 'Dumnacus', 'Cingetorix', 'Vercassivellaunus', 'Andecombogius', 'Cavarinus'];
const GREEK = ['Lykon', 'Nikias', 'Damon', 'Kallias', 'Philon', 'Teukros', 'Menon', 'Lysandros', 'Kleon', 'Hippias'];
const PUNIC = ['Bostar', 'Himilco', 'Mago', 'Hanno', 'Bomilcar', 'Adherbal', 'Gisco', 'Maharbal'];
// a small seeded random number from a string, so the same cohort always gets the same men
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function nameFor(h, i) {
  const r = (k) => hash(`${h.id}|${h.name}|${i}|${k}`);
  if (h.type === 'aux_inf' || h.type === 'aux_cav') return GALLIC[r(1) % GALLIC.length];
  if (h.type === 'archer') return `${GREEK[r(1) % GREEK.length]} of Crete`;
  if (h.type === 'slinger') return `${PUNIC[r(1) % PUNIC.length]} of the Baleares`;
  return `${PRAE[r(1) % PRAE.length]} ${NOMEN[r(2) % NOMEN.length]}`;
}
export function heroesOf(h) {
  if (!h.heroes) h.heroes = [0, 1].map(i => ({ name: nameFor(h, i), dec: [], deeds: [] }));
  return h.heroes;
}
// Decorations, as Rome gave them. Each adds a little to its cohort's morale (+1 each, at most +5 per cohort).
export const DECORATIONS = {
  phalerae: { name: 'Phalerae', text: 'Silver discs worn on the chest, for valour in the fight.' },
  torques: { name: 'Torques', text: 'A neck-ring taken from the Gauls, for holding when cut off.' },
  armillae: { name: 'Armillae', text: 'Arm-rings, for standing under heavy loss.' },
  civica: { name: 'Corona civica', text: 'The oak crown, for saving the lives of fellow citizens.' },
  muralis: { name: 'Corona muralis', text: 'The crown of the walls, for the first man over the enemy rampart.' },
  hasta: { name: 'Hasta pura', text: 'A silver spear-shaft, for leading the pursuit of a beaten host.' }
};
export const decoCount = (h) => (h.heroes || []).reduce((a, x) => a + x.dec.length, 0);
export const decoMorale = (h) => Math.min(5, decoCount(h));

// After a battle won or drawn: up to three awards. Returns lines for the result screen.
export function awardHonours(c, result, scnName) {
  if (result.outcome === 'defeat') return [];
  const out = [], rows = result.rows.filter(r => r.cohortId != null).map(r => ({ r, h: c.cohorts.find(x => x.id === r.cohortId) })).filter(x => x.h);
  const give = (x, key, why) => {
    if (!x || out.length >= 3 || out.some(o => o.cohortId === x.h.id)) return;
    const men = heroesOf(x.h), hero = men.slice().sort((a, b) => a.dec.length - b.dec.length)[0] || men[0];
    hero.dec.push(key); hero.deeds.push(`${scnName}: ${why}`);
    out.push({ cohortId: x.h.id, unit: x.h.name, hero: hero.name, key, name: DECORATIONS[key].name, why });
  };
  give(rows.find(x => x.r.firstIn), 'muralis', 'first into the enemy position');
  give(rows.filter(x => x.r.surrounded && !x.r.routed).sort((a, b) => b.r.kills - a.r.kills)[0], 'torques', 'held when surrounded');
  give(rows.filter(x => x.r.relieved > 0).sort((a, b) => b.r.relieved - a.r.relieved)[0], 'civica', 'relieved a hard-pressed cohort');
  give(rows.filter(x => !x.r.routed && x.r.casualties > x.r.startMen * 0.28).sort((a, b) => b.r.casualties - a.r.casualties)[0], 'armillae', 'stood under heavy loss');
  give(rows.filter(x => UNIT_TYPES[x.h.type] && UNIT_TYPES[x.h.type].cat === 'cav' && x.r.kills > 40).sort((a, b) => b.r.kills - a.r.kills)[0], 'hasta', 'led the pursuit');
  give(rows.filter(x => x.r.kills > 20).sort((a, b) => b.r.kills - a.r.kills)[0], 'phalerae', `the most enemies felled (${rows.reduce((m, x) => Math.max(m, x.r.kills), 0)})`);
  // every survivor remembers having been there
  for (const x of rows) for (const m of heroesOf(x.h)) if (!m.deeds.some(d => d.startsWith(scnName + ':'))) m.deeds.push(`${scnName}: fought there`);
  return out;
}
// A centurion has fallen: the cohort's most decorated man takes his place. Returns the new officer, or null.
export function promoteFromRanks(c, h) {
  const men = heroesOf(h); if (!men.length) return null;
  const best = men.slice().sort((a, b) => b.dec.length - a.dec.length)[0];
  h.heroes = men.filter(m => m !== best); h.heroes.push({ name: nameFor(h, 10 + c.officers.length), dec: [], deeds: [] });
  const cav = UNIT_TYPES[h.type] && UNIT_TYPES[h.type].cat === 'cav';
  const o = { id: Math.max(0, ...c.officers.map(x => x.id)) + 1, name: best.name, rank: cav ? 'Prefect of Horse' : 'Centurion', tactics: 1 + Math.min(2, best.dec.length), drill: 1, logistics: 0, diplomacy: 0, xp: 0, level: 1, points: 0, perks: [], alive: true,
    temper: ['bold', 'steady', 'rash', 'cautious'][hash(best.name) % 4], bio: `Risen from the ranks of ${h.name}${best.dec.length ? `; wears the ${best.dec.map(d => DECORATIONS[d].name).join(', ')}` : ''}.` };
  c.officers.push(o); h.officerId = o.id; return o;
}
