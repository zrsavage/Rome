// Battle names. Caesar's legions won titles for what they did: the Tenth became Equestris after he mounted it on Gallic horses to ride with
// him to the parley with Ariovistus (58 BC), and the Fifth carried an elephant on its standards after Thapsus. Here a unit that does
// something remarkable earns a name of its own once, keeps it for the rest of the war, and fights a little prouder for it.
import { UNIT_TYPES } from './data.js';
export const TITLE_MORALE = 4;
export const TITLES = {
  equestris: { latin: 'Equestris', en: 'the Mounted', why: 'rode with Caesar to the parley with Ariovistus' },
  firma: { latin: 'Firma', en: 'the Steadfast', why: 'held its ground when surrounded' },
  elephantis: { latin: 'Elephantis', en: 'of the Elephant', why: 'stood against the elephants and brought them down: it paints an elephant on its shields' },
  fortis: { latin: 'Fortis', en: 'the Brave', why: 'stood its ground through terrible losses' },
  fidelis: { latin: 'Fidelis', en: 'the Faithful', why: 'came up again and again to relieve its sister cohorts' },
  celer: { latin: 'Celer', en: 'the Swift', why: 'rode down the beaten enemy' },
  certa: { latin: 'Certa', en: 'the Sure-aimed', why: 'shot down more of the enemy than any missile troops before it' },
  victrix: { latin: 'Victrix', en: 'the Victorious', why: 'broke the enemy line almost alone' }
};
export const titleMorale = (h) => (h && h.title ? TITLE_MORALE : 0);
export const titleText = (h) => { const t = h && h.title && TITLES[h.title]; return t ? `${t.latin}, "${t.en}": ${t.why}` : ''; };
function give(c, h, key, scnName) {
  const t = TITLES[key]; if (!t || !h || h.title) return null;
  h.title = key; h.titleLatin = t.latin; h.titleAt = scnName; h.name = `${h.name} ${t.latin}`;
  return `${h.name.replace(' ' + t.latin, '')} ${t.why}, and will be called ${t.latin} ("${t.en}") from now on: +${TITLE_MORALE} morale in every battle.`;
}
// After a battle won or drawn: at most one unit earns a name, the most remarkable deed first.
export function awardTitles(c, result, scn) {
  const notes = []; if (result.outcome === 'defeat' || scn.id === 'prologue') return notes;
  const name = scn.phaseName || scn.name;
  if (['parley', 'ariovistus'].includes(scn.id)) { const t = c.cohorts.find(h => h.tenth && !h.title); const n = t && give(c, t, 'equestris', name); if (n) notes.push(n); }
  const rows = result.rows.filter(r => r.cohortId != null).map(r => ({ r, h: c.cohorts.find(x => x.id === r.cohortId) })).filter(x => x.h && !x.h.title && x.h.men > 0 && !x.r.routed && !x.r.medic);
  const cat = (x) => (UNIT_TYPES[x.h.type] || {}).cat, top = (a, f) => a.sort((p, q) => f(q) - f(p))[0];
  const cands = [
    ['firma', top(rows.filter(x => x.r.surrounded && x.r.kills >= 30), x => x.r.kills)],
    ['elephantis', top(rows.filter(x => (x.r.bigKills || 0) >= 25), x => x.r.bigKills)],
    ['fortis', top(rows.filter(x => cat(x) === 'inf' && x.r.casualties >= x.r.startMen * 0.4 && x.r.kills >= x.r.casualties), x => x.r.casualties)],
    ['fidelis', top(rows.filter(x => (x.r.relieved || 0) >= 3), x => x.r.relieved)],
    ['celer', top(rows.filter(x => cat(x) === 'cav' && x.r.kills >= Math.max(90, x.r.startMen * 0.8)), x => x.r.kills)],
    ['certa', top(rows.filter(x => cat(x) === 'ranged' && x.r.kills >= Math.max(120, x.r.startMen * 0.7)), x => x.r.kills)],
    ['victrix', result.outcome === 'victory' ? top(rows.filter(x => cat(x) === 'inf' && x.r.kills >= x.r.startMen * 0.9), x => x.r.kills) : null]
  ];
  for (const [key, x] of cands) if (x) { const n = give(c, x.h, key, name); if (n) { notes.push(n); break; } }
  return notes;
}
