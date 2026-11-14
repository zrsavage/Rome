// Weather: chosen when the battle is set up and told to you in the briefing, so there are no surprises except the ones the sky has in store.
// Numbers are multipliers on the plain battle rules (the sim reads them; the renderer draws them).
export const WEATHER = {
  clear: { name: 'Clear', text: 'A clear day. Nothing to hinder either army.', speed: 1, cav: 1, missile: 1, charge: 1, sight: 1 },
  rain:  { name: 'Rain', text: 'Mud slows marches and horse charges; wet strings weaken missiles.', speed: 0.9, cav: 0.9, missile: 0.8, charge: 0.9, sight: 0.85 },
  fog:   { name: 'Fog', text: 'You see the enemy only up close, and missiles miss more.', speed: 1, cav: 1, missile: 0.85, charge: 1, sight: 0.5 },
  storm: { name: 'Storm', text: 'Mud slows everything, missiles are nearly useless, and the fords flood after a while.', speed: 0.85, cav: 0.85, missile: 0.55, charge: 0.85, sight: 0.75, floodAt: 100, floodSecs: 80 },
  heat:  { name: 'Scorching heat', text: 'Everyone but Numidians and steppe riders tires 40% faster. Rest the line.', speed: 0.97, cav: 1, missile: 1, charge: 1, sight: 1.1, fatigue: 1.4 },
  frost: { name: 'Hard frost', text: 'Rivers are frozen: cross on the ice, slowly. Marches are a little slower.', speed: 0.95, cav: 0.9, missile: 1, charge: 0.95, sight: 1, ice: true }
};
// Weather odds for each campaign battle (the prologue is always clear).
const ODDS = {
  ford:     { clear: 5, rain: 3, storm: 2 },
  arar:     { clear: 5, fog: 3, rain: 2 },
  convoy:   { clear: 5, rain: 4, storm: 1 },
  oppidum:  { clear: 5, rain: 3, fog: 2 },
  silva:    { fog: 5, rain: 3, clear: 2 },
  bibracte: { clear: 7, rain: 3 },
  anquillaria: { heat: 6, clear: 4 }, castra: { heat: 5, clear: 5 }, utica: { heat: 6, clear: 4 }, water: { heat: 9, clear: 1 }, bagradas: { heat: 8, clear: 2 },
  pharsalus: { heat: 5, clear: 5 }, comana: { clear: 6, rain: 2, fog: 2 }, steppe: { clear: 7, rain: 3 }, nicopolis: { rain: 4, frost: 3, clear: 3 }, zela: { clear: 6, heat: 4 },
  landing: { clear: 6, rain: 3, fog: 1 }, seventh: { clear: 7, rain: 3 }, bigbury: { rain: 4, clear: 4, fog: 2 }, cassivellaunus: { clear: 5, rain: 3, fog: 2 },
  ruspina: { clear: 7, rain: 3 }, uzitta: { clear: 6, heat: 2, rain: 2 }, thapsus: { clear: 6, heat: 4 }, ategua: { rain: 5, frost: 3, fog: 2 }, munda: { clear: 6, rain: 4 }
};
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
// The same campaign always meets the same weather at the same battle, so reloading or retrying does not re-roll it.
export function pickWeather(scn, campaign) {
  const odds = ODDS[scn.id]; if (!odds) return 'clear';
  const tot = Object.values(odds).reduce((a, b) => a + b, 0); let r = hash(`${scn.id}|${(campaign && campaign.player && campaign.player.name) || ''}|${(campaign && campaign.slot) || 0}`) * tot;
  for (const [k, w] of Object.entries(odds)) { r -= w; if (r < 0) return k; }
  return 'clear';
}
export const wxOf = (scn) => WEATHER[(scn && scn._wx) || 'clear'] || WEATHER.clear;
