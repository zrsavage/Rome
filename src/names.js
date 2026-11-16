// Unit names. Every unit in the army has its own name, and the names are ones Caesar's army could have used.
// Legionary cohorts are numbered I to X inside a legion, and the legions carry the numbers of Caesar's own in Gaul: the VII, VIII and IX
// (the veteran legions from Aquileia), then the XI and XII raised in 58 BC, the XIII and XIV raised in 57, the XV of 53. The Tenth is
// Caesar's favourite and serves beside you as its own cohort, so your legions skip its number.
export const LEGIONS = ['VII', 'VIII', 'IX', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const NUM = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
export const numeral = (n) => NUM[n] || String(n);
export const cohortName = (coh, leg) => `${numeral(coh)} Cohort of the ${leg}`;

// The auxiliaries, from the peoples Caesar recruited them from (Commentarii and the Alexandrian, African and Spanish wars).
const POOLS = {
  slinger: ['Balearic Slingers', 'Slingers of Balearis Maior', 'Slingers of Balearis Minor', 'Achaean Slingers', 'Rhodian Slingers', 'Numidian Slingers'],
  archer: ['Cretan Archers', 'Archers of Gortyn', 'Archers of Cnossus', 'Archers of Lyttos', 'Numidian Archers', 'Ituraean Archers', 'Syrian Archers'],
  equites: ['Equites', 'Equites of the Seventh', 'Equites of the Eighth', 'Equites of the Ninth', 'Equites of the Eleventh', 'Equites of the Twelfth'],
  aux_cav: ['Aeduan Horse', 'Remi Horse', 'Treveran Horse', 'Lingonian Horse', 'German Horse', 'Spanish Horse', 'Ubian Horse', 'Allobrogian Horse'],
  aux_inf: ['Aeduan Foot', 'Remi Foot', 'Allobrogian Foot', 'Helvian Foot', 'Spanish Foot', 'Ligurian Foot'],
  galatian: ['Tolistobogii of Deiotarus', 'Tectosages of Deiotarus', 'Trocmi of Deiotarus'],
  medici: ['Medici of the Praetorium', 'Medici of the Field Hospital', 'Medici of the Baggage'],
  evocati: ['Evocati of the Seventh', 'Evocati of the Eighth', 'Evocati of the Ninth', 'Evocati of the Tenth', 'Evocati of the Eleventh', 'Evocati of the Twelfth'],
  ballista: ['I Ballistae', 'II Ballistae', 'III Ballistae', 'IV Ballistae'],
  scorpion: ['I Scorpiones', 'II Scorpiones', 'III Scorpiones', 'IV Scorpiones'],
  caetrati: ['Lusitanian Caetrati', 'Celtiberian Caetrati', 'Vettonian Caetrati', 'Callaecian Caetrati', 'Turdetanian Caetrati'],
  moor_cav: ['Moorish Horse of Bogud', 'Moorish Horse of Bocchus', 'Mauretanian Horse', 'Horse of Sittius']
};
// The names the game used to give (and still gives in a few old saves): these are renamed.
const GENERIC = /^(?:[IVXL]+ Cohort|(?:Slingers|Archers|Equites|Allied Horse|Allied Infantry|Galatians|Medici|Evocati|Ballistae|Caetrati|Moorish Horse|Scorpiones) \d+)$/;

const live = (c) => c.cohorts.filter(h => h.men > 0);
// The first free place for a new legionary cohort: the lowest free number in the most senior legion that has room.
function freeSlot(c, skip) {
  const used = new Set(live(c).filter(h => h !== skip && h.leg).map(h => h.leg + '/' + h.coh));
  for (const leg of LEGIONS) for (let k = 1; k <= 10; k++) if (!used.has(leg + '/' + k)) return { leg, coh: k };
  return { leg: LEGIONS[LEGIONS.length - 1], coh: 10 + live(c).filter(h => h.leg === LEGIONS[LEGIONS.length - 1]).length };
}
// A unique name for a new unit of this type (pass `want` to keep a scenario's own name if it is free).
export function nameFor(c, type, want = null, skip = null) {
  const taken = new Set(live(c).filter(h => h !== skip).map(h => h.name));
  if (type === 'legionary') return null;                      // legionaries take a place in a legion instead: see placeCohort
  if (want && !GENERIC.test(want) && !taken.has(want)) return want;
  const pool = POOLS[type] || [];
  for (const n of pool) if (!taken.has(n)) return n;
  const base = pool[0] || want || type;
  for (let k = 2; ; k++) { const n = `${base} ${numeral(k)}`; if (!taken.has(n)) return n; }
}
// Give a legionary cohort its legion and number, and the name that goes with them.
export function placeCohort(c, h, pref = null) {
  const used = new Set(live(c).filter(x => x !== h && x.leg).map(x => x.leg + '/' + x.coh));
  const slot = pref && !used.has(pref.leg + '/' + pref.coh) ? pref : freeSlot(c, h);
  h.leg = slot.leg; h.coh = slot.coh; h.name = cohortName(h.coh, h.leg);
  return h;
}
// A new unit joins: legionaries get a place in a legion, everyone else a free name. Returns the name.
export function nameNewUnit(c, h, want = null) {
  if (h.type === 'legionary' && !h.tenth) return placeCohort(c, h).name;
  h.name = nameFor(c, h.type, want, h) || h.name; return h.name;
}
// Old saves: number the legionary cohorts into legions (keeping "IV Cohort" as the IV of the first legion, "XIV Cohort" as the IV of the
// second), and rename any unit whose name is a generic one or is used twice.
export function renameArmy(c) {
  const L = live(c);
  for (const h of L) if (h.type === 'legionary' && !h.tenth && !h.leg) {
    const m = /^([IVXL]+) Cohort$/.exec(h.name), n = m ? NUM.indexOf(m[1]) : -1;
    placeCohort(c, h, n > 0 ? { leg: LEGIONS[Math.floor((n - 1) / 10)] || LEGIONS[0], coh: ((n - 1) % 10) + 1 } : null);
  }
  const seen = new Set();
  for (const h of L) {
    if (h.type === 'legionary' && !h.tenth) { seen.add(h.name); continue; }
    if (GENERIC.test(h.name) || seen.has(h.name)) { h.name = nameFor(c, h.type, null, h) || h.name; }
    seen.add(h.name);
  }
  return c;
}
