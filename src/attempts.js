// Fighting a battle again is harder. Each time you start a battle you have started before (after a defeat, a reloaded backup, or a tab
// closed in the middle of a fight), the enemy has learned your ways: more of them come, they stand longer, they are better led, and there is
// less to take from them. The count lives in its own corner of the browser's storage as well as in the save, so restoring an older
// backup does not wipe it.
const KEY = 'legio_attempts_v1';
const readAll = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const writeAll = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage full or blocked: the save still keeps a count */ } };
export const MAX_REPLAY = 4;
const keyOf = (scn) => scn.id + (scn.phaseIdx != null ? '#' + scn.phaseIdx : '');
function campId(c) { if (!c.cid) c.cid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8); return c.cid; }

// How many times this battle has been started before.
export function triesOf(c, scn) {
  if (!scn || scn.id === 'prologue' || scn.practice) return 0;
  const k = keyOf(scn), all = readAll(), mine = all[campId(c)] || {};
  return Math.max(mine[k] || 0, (c.tries || {})[k] || 0);
}
// The battle is starting: count it (before it is fought, so leaving mid-battle still counts). Returns the number of earlier attempts.
export function recordTry(c, scn) {
  const n = triesOf(c, scn); if (!scn || scn.id === 'prologue' || scn.practice) return 0;
  const k = keyOf(scn), all = readAll(), id = campId(c);
  all[id] = all[id] || {}; all[id][k] = n + 1; writeAll(all);
  c.tries = c.tries || {}; c.tries[k] = n + 1;
  return n;
}
// What an earlier attempt costs you. n = earlier attempts (0 on the first try).
export function replayEffect(n) {
  const k = Math.min(MAX_REPLAY, n || 0);
  return { k, men: 1 + 0.2 * k, morale: 5 * k, ai: k >= 1 ? 1 : 0, spoils: Math.pow(0.7, k) };
}
export function replayHtml(n) {
  if (!n) return '';
  const e = replayEffect(n), ord = ['', 'second', 'third', 'fourth', 'fifth'][Math.min(4, n)] || `${n + 1}th`;
  return `<div class="card warnc" style="margin-top:12px"><h3>The ${ord} attempt</h3><div class="small">They have fought you here before and know your ways.
    <b>${Math.round((e.men - 1) * 100)}% more men</b>, steadier (+${e.morale} morale), better led, and <b>${Math.round((1 - e.spoils) * 100)}% less spoils</b>.
    ${n < MAX_REPLAY ? 'Every further attempt makes it worse.' : 'It can get no worse than this.'}</div></div>`;
}
