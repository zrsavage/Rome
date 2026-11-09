// Officer character: temperament (how the man behaves under pressure), rivalry, and the promotions that change what his cohort does in a fight.
// Kept free of DOM and sim imports so the camp screen and the battle sim can both use it.
export const TEMPERS = {
  bold:     { name: 'Bold',     blurb: 'Leads from the front.', text: 'Cohort attacks 5% harder and its charges hit 10% harder, but he is more likely to fall (+30%).' },
  rash:     { name: 'Rash',     blurb: 'Cannot bear to wait.',  text: 'Charges any enemy that comes close without waiting for orders. Attacks 5% harder, charges hit 15% harder, but casualties shake the cohort 15% more.' },
  steady:   { name: 'Steady',   blurb: 'Cool under pressure.',  text: 'Never charges unordered. +5 morale and casualties shake the cohort 10% less.' },
  cautious: { name: 'Cautious', blurb: 'Spares his men.',       text: '+4 morale and the officer is 40% less likely to fall, but charges hit 15% softer.' }
};
const DEFAULT_TEMPER = { 1: 'bold', 2: 'steady', 3: 'cautious', 4: 'rash' };
const RIVALS = { 1: 2, 2: 1 };                      // Pullo and Vorenus (Caesar, Gallic War V.44)
export const temperOf = (o) => !o ? null : (o.temper || DEFAULT_TEMPER[o.id] || ['bold', 'steady', 'cautious', 'rash'][[...(o.name || '')].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 4]);
export const rivalOf = (o) => !o ? null : (o.rival !== undefined ? o.rival : RIVALS[o.id] ?? null);

// Rank ladders. A promotion at level 3 and again at level 5 changes the title and what the cohort does in battle.
const LADDERS = [
  ['Centurion', 'Pilus Prior', 'Primus Pilus'],
  ['Tribune', 'Tribunus Laticlavius', 'Legatus'],
  ['Prefect of Horse', 'Praefectus Alae', 'Praefectus Equitum'],
  ['Prefect', 'Praefectus Cohortis', 'Praefectus Castrorum']
];
export const tierOf = (o) => !o ? 0 : (o.level || 1) >= 5 ? 2 : (o.level || 1) >= 3 ? 1 : 0;
export function rankFor(o) {
  const lad = LADDERS.find(l => l.includes(o.rank)); if (!lad) return o.rank;
  return lad[Math.max(lad.indexOf(o.rank), tierOf(o))];
}
export const TIER_TEXT = [
  '',
  'Rallying point: friendly cohorts within a short distance recover morale 25% faster, and broken men near him rally sooner.',
  'Immovable: his cohort ignores the fear of neighbours breaking and holds until its morale is nearly gone. His aura still steadies the cohorts about him.'
];
export function promote(o) {
  const was = o.rank, now = rankFor(o);
  if (now === was) return null;
  o.rank = now;
  return `${o.name} is promoted to ${now}. ${TIER_TEXT[tierOf(o)]}`;
}
