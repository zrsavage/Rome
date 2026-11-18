// A big army on the defensive does not stand ready all at once. It comes up a legion at a time: you deploy the first legion and its
// supporting troops (up to FIRST_WAVE units), and the rest march onto the field from behind your line, one legion after another, if you
// can hold long enough. (As in the open battles of the civil war, where whole legions were still on the road when the fighting began.)
import { UNIT_TYPES } from './data.js';
export const FIRST_WAVE = 20, FIRST_AT = 110, EVERY = 80;
const STAGED = ['defend', 'fortdef'];
const fights = (s) => { const t = UNIT_TYPES[s.type]; return !!t && t.cat !== 'train' && !t.medic; };
export const staged = (scn) => !!scn && STAGED.includes(scn.posture) && scn.id !== 'prologue' && !scn.practice;
// Split the army: the specs that deploy now, and the waves that come later ({ at, name, specs }).
export function stageArmy(specs, scn) {
  const fighting = specs.filter(fights);
  if (!staged(scn) || fighting.length <= FIRST_WAVE) return { now: specs, waves: [] };
  const byLeg = new Map(); for (const s of fighting) { const k = s.legion || 1; if (!byLeg.has(k)) byLeg.set(k, []); byLeg.get(k).push(s); }
  const legs = [...byLeg.keys()].sort((a, b) => a - b), now = specs.filter(s => !fights(s)), waves = [];
  let first = [];
  for (const k of legs) {                                      // the first wave: whole legions while they fit
    const g = byLeg.get(k);
    if (!first.length || first.length + g.length <= FIRST_WAVE) { first.push(...g); byLeg.delete(k); } else break;
  }
  if (first.length > FIRST_WAVE) {                             // one legion bigger than the first wave: its foot first, the rest follow with the next
    const order = { inf: 0, ranged: 1, cav: 2 }; first.sort((a, b) => (order[UNIT_TYPES[a.type].cat] ?? 3) - (order[UNIT_TYPES[b.type].cat] ?? 3));
    const spill = first.splice(FIRST_WAVE); const k = spill[0].legion || 1; byLeg.set(k, [...spill, ...(byLeg.get(k) || [])]);
  }
  now.push(...first);
  [...byLeg.keys()].sort((a, b) => a - b).forEach((k, i) => { const g = byLeg.get(k); waves.push({ at: FIRST_AT + EVERY * i, name: g[0].legionName ? `Legio ${g[0].legionName}` : `The ${['second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'][i] || 'next'} wave`, specs: g }); });
  return { now, waves };
}
export const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;
