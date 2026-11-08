// Officer skill trees and unit veteran traits.
export const PERKS = [
  { id: 'inspire', name: 'Inspiring Presence', trait: 'tactics', req: 2, text: 'Attached unit: +4 morale and 50% faster morale recovery.' },
  { id: 'shock', name: 'Shock Tactics', trait: 'tactics', req: 3, text: 'Attached unit: charges hit 25% harder, +5% attack.' },
  { id: 'steadfast', name: 'Steadfast', trait: 'tactics', req: 3, text: 'Attached unit: loses 20% less morale from casualties.' },
  { id: 'drillmaster', name: 'Drillmaster', trait: 'drill', req: 2, text: 'Drilling gives 25% more experience and drill when this officer leads it.' },
  { id: 'discipline', name: 'Disciplinarian', trait: 'drill', req: 3, text: 'Attached unit: +8 morale and turns 20% faster.' },
  { id: 'cadre', name: 'Veteran Cadre', trait: 'drill', req: 4, text: 'Attached unit: +10% attack.' },
  { id: 'quartermaster', name: 'Quartermaster', trait: 'logistics', req: 2, text: 'The whole army eats 10% less.' },
  { id: 'forager', name: 'Master Forager', trait: 'logistics', req: 3, text: 'Foraging brings back 20% more.' },
  { id: 'surgeon', name: 'Field Surgeons', trait: 'logistics', req: 3, text: 'Wounded recover 20% better after battle.' },
  { id: 'tribute', name: 'Tribute Master', trait: 'diplomacy', req: 2, text: 'Demanding tribute yields 30% more denarii.' },
  { id: 'spymaster', name: 'Spymaster', trait: 'diplomacy', req: 3, text: 'Sending scouts costs no day.' },
  { id: 'allies', name: 'Friend of Chieftains', trait: 'diplomacy', req: 4, text: 'Gifts to chieftains win 2 goodwill instead of 1.' }
];
export const perkById = (id) => PERKS.find(p => p.id === id);

// Veteran traits earned by a unit's experience level (0-5).
export const LEVEL_TRAITS = [
  null, null,
  { name: 'Disciplined', text: 'Loses 10% less morale from casualties.' },
  { name: 'Hardened', text: '+2% armour.' },
  { name: 'Elite', text: '+8% attack.' },
  { name: 'Legendary', text: '+5 morale and an extra pilum volley.' }
];

// Equipment tiers (0-3) per cohort. Names depend on unit category.
export const UPGRADES = {
  inf: { armour: 'Mail and helmets', weapon: 'Gladii and pila' },
  ranged: { armour: 'Light armour', weapon: 'Ammunition and bows' },
  cav: { armour: 'Mail and barding', weapon: 'Heavier lances' }
};
export const MAX_TIER = 3;
export function upgradeCost(h, kind) {
  const t = (h.upg && h.upg[kind]) || 0;
  return { gold: Math.round(h.men * 0.6 * (t + 1)), supplies: Math.round(h.men * 0.04 * (t + 1)), tier: t };
}
