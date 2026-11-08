// "Your Origins": three plain-language choices that shape the starting position, in the spirit of Ultimate General's
// character creation. Each option changes starting stats and a few campaign modifiers (wound recovery, food use, spoils...).
import { newCampaign, DEFAULT_MODS, modsOf } from './state.js';
export { DEFAULT_MODS, modsOf };

const officer = (c, id) => c.officers.find(o => o.id === id);
const addXp = (c, types, n) => c.cohorts.forEach(h => { if (!types || types.includes(h.type)) h.xp += n; });

export const ORIGINS = {
  family: {
    title: 'Where do you come from?', blurb: 'Your family sets your starting wealth and friends.',
    options: [
      { id: 'patrician', name: 'Patrician house', text: 'Old money and useful friends.', fx: ['+250 denarii', '+1 goodwill with local nobles', 'Provincial levies 10% smaller'],
        apply: (c) => { c.gold += 250; c.favour += 1; c.mods.levy *= 0.9; } },
      { id: 'equestrian', name: 'Equestrian merchant family', text: 'Traders who know how to keep an army fed.', fx: ['+90 supplies, +50 denarii', 'Foraging parties bring back 25% more'],
        apply: (c) => { c.supplies += 90; c.gold += 50; c.mods.forage *= 1.25; } },
      { id: 'soldier', name: 'Old soldier family', text: 'Your name means something to the men.', fx: ['Every unit starts with +35 experience', '+3 morale in battle', '-100 denarii'],
        apply: (c) => { addXp(c, null, 35); c.mods.morale += 3; c.gold = Math.max(100, c.gold - 100); } }
    ]
  },
  career: {
    title: 'How did you learn war?', blurb: 'Your early career decides which officers and skills you start with.',
    options: [
      { id: 'staff', name: 'Staff tribune', text: 'You organised hospitals, roads and supply trains.', fx: ['Wounded recover better (+25%)', 'Army eats 10% less', 'Tribune Silvanus: logistics +1'],
        apply: (c) => { c.mods.recovery *= 1.25; c.mods.supplyUse *= 0.9; officer(c, 3).logistics += 1; } },
      { id: 'ranks', name: 'Rose through the ranks', text: 'You fought as a legionary and centurion.', fx: ['Legion cohorts start with +12 drill', 'Centurions Pullo and Vorenus each +1 skill'],
        apply: (c) => { c.cohorts.forEach(h => { if (h.type === 'legionary') h.drill = Math.min(100, h.drill + 12); }); officer(c, 1).tactics += 1; officer(c, 2).drill += 1; } },
      { id: 'cavalry', name: 'Cavalry prefect', text: 'You made your name leading horse.', fx: ['Cavalry turma +20 men and +40 experience', 'Prefect Fabius: tactics +1'],
        apply: (c) => { const q = c.cohorts.find(h => h.type === 'equites'); q.men += 20; q.maxMen += 20; q.xp += 40; officer(c, 4).tactics += 1; } }
    ]
  },
  approach: {
    title: 'How do you fight?', blurb: 'Your temperament shows in how the army lives and learns.',
    options: [
      { id: 'cautious', name: 'Cautious: save every man', text: 'Veterans are worth more than glory.', fx: ['Wounded recover better (+20%)', 'More replacements arrive (+20%)', 'Spoils 10% smaller'],
        apply: (c) => { c.mods.recovery *= 1.2; c.mods.levy *= 1.2; c.mods.spoils *= 0.9; } },
      { id: 'bold', name: 'Bold: fortune favours the brave', text: 'Fast, aggressive and greedy for plunder.', fx: ['Spoils 15% larger', 'Units gain 20% more experience', 'Wounded recover worse (-15%)'],
        apply: (c) => { c.mods.spoils *= 1.15; c.mods.xp *= 1.2; c.mods.recovery *= 0.85; } },
      { id: 'provider', name: 'Provider: feed the army first', text: 'A fed army fights harder and marches further.', fx: ['+60 supplies', 'Army eats 10% less', '+2 morale in battle'],
        apply: (c) => { c.supplies += 60; c.mods.supplyUse *= 0.9; c.mods.morale += 2; } }
    ]
  }
};
export const RECOMMENDED = { family: 'patrician', career: 'staff', approach: 'cautious' };
export const DEFAULT_NAME = 'Gaius Aurelius';

export function buildCampaign(picks, name, difficulty) {
  const c = newCampaign(difficulty);
  c.mods = { ...DEFAULT_MODS };
  c.player = { name: (name || DEFAULT_NAME).trim().slice(0, 28) || DEFAULT_NAME, picks: { ...picks } };
  for (const key of Object.keys(ORIGINS)) { const o = ORIGINS[key].options.find(x => x.id === picks[key]); if (o) o.apply(c); }
  return c;
}

const grade = (v) => v >= 1.3 ? 'Much better than average' : v > 1.05 ? 'Better than average' : v < 0.8 ? 'Much worse than average' : v < 0.95 ? 'Worse than average' : 'Average';
export function describe(c) {
  const m = modsOf(c), men = c.cohorts.reduce((a, h) => a + h.men, 0), pct = (v) => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';
  return {
    numbers: [['Denarii', c.gold], ['Supplies', c.supplies], ['Soldiers', men], ['Goodwill', (c.favour > 0 ? '+' : '') + c.favour]],
    lines: [
      ['Wounded recovery', grade(m.recovery)], ['Replacements', grade(m.levy)], ['Food use', m.supplyUse < 0.95 ? `Lower (${pct(m.supplyUse)})` : 'Normal'],
      ['Spoils of war', m.spoils === 1 ? 'Normal' : pct(m.spoils)], ['Experience gain', m.xp === 1 ? 'Normal' : pct(m.xp)], ['Foraging', m.forage === 1 ? 'Normal' : pct(m.forage)],
      ['Battle morale', m.morale ? `+${m.morale}` : 'Normal']
    ]
  };
}
export function picksNames(c) {
  const p = (c.player && c.player.picks) || {};
  return Object.keys(ORIGINS).map(k => { const o = ORIGINS[k].options.find(x => x.id === p[k]); return o ? o.name : null; }).filter(Boolean);
}
