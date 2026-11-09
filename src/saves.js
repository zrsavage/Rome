// Save safety: export and import a campaign as a file, and keep a few rolling backups per slot (taken after each battle and when you make camp),
// so a bad choice, a closed tab or cleared browser storage does not end a long campaign.
const histKey = (n) => `legio_slot_${n}_hist_v2`, MAX = 6;
const read = (k) => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch { return []; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };

export function snapshot(n, c, why) {
  const list = read(histKey(n)), data = JSON.stringify(c), last = list[list.length - 1];
  if (last && last.data === data) return;
  list.push({ t: Date.now(), why, summary: `Battle ${Math.min(c.scenario + 1, 99)}, day ${c.day}, ${c.cohorts.reduce((a, h) => a + h.men, 0)} men, ${c.gold} denarii`, data });
  while (list.length > MAX) list.shift();
  while (!write(histKey(n), list) && list.length > 1) list.shift();          // storage full: drop the oldest until it fits
}
export const backups = (n) => read(histKey(n)).map((b, i) => ({ i, t: b.t, why: b.why, summary: b.summary })).reverse();
export const restoreBackup = (n, i) => { const b = read(histKey(n))[i]; return b ? JSON.parse(b.data) : null; };
export const clearBackups = (n) => { try { localStorage.removeItem(histKey(n)); } catch { /* ignore */ } };

export async function exportCampaign(c) {
  const text = JSON.stringify({ game: 'legio', format: 1, savedAt: new Date().toISOString(), campaign: c }, null, 1);
  const name = `legio-${(c.player && c.player.name || 'campaign').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-battle${c.scenario + 1}-day${c.day}.json`;
  // Inside a claude.ai artifact the page may not trigger a download itself: ask the viewer through the downloads capability.
  try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: name, data: text }); return; } } catch (e) { if (e && e.code === 'declined') return; }
  const blob = new Blob([text], { type: 'application/json' }), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
// Returns a campaign object, or throws with a readable message.
export function parseImport(text) {
  let j; try { j = JSON.parse(text); } catch { throw new Error('That file is not a LEGIO save (it is not valid JSON).'); }
  const c = j && j.game === 'legio' ? j.campaign : null;
  if (!c || !Array.isArray(c.cohorts) || !Array.isArray(c.officers) || typeof c.scenario !== 'number') throw new Error('That file does not look like a LEGIO campaign save.');
  if (!c.cohorts.length || c.cohorts.some(h => typeof h.men !== 'number' || !h.type)) throw new Error('The save is damaged: its units are not readable.');
  return c;
}
