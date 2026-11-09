// Formation orders are learned in camp, one at a time, as the campaign goes on. A new player starts with move, attack, hold,
// defend post and fall back; everything else is earned. Each doctrine needs victories behind you and an officer who can teach it.
export const DOCTRINES = [
  { id: 'testudo', name: 'The Testudo', key: 'T', wins: 1, trait: 'drill', req: 1, gold: 80,
    text: 'Locked shields, every way. Missiles glance off and charges bite less, but the cohort crawls and fights weakly. Press T in battle.' },
  { id: 'rally', name: 'Rally the Line', key: 'F', wins: 2, trait: 'tactics', req: 2, gold: 100,
    text: 'Your general rides the line: wavering cohorts steady and routers turn about. Once every 90 seconds, inside the command ring. Press F.' },
  { id: 'relieve', name: 'Relief of the Line', key: 'Y', wins: 3, trait: 'drill', req: 3, gold: 150,
    text: 'A fresh cohort steps up through the gaps while the tired one falls back to rest. Select the tired cohort and press Y.' },
  { id: 'orbis', name: 'The Orbis', key: 'O', wins: 4, trait: 'drill', req: 4, gold: 150,
    text: 'A hollow square with no flanks and no rear, for a cohort that is about to be surrounded. Slow and weak on the attack. Press O.' }
];
export const doctrineById = (id) => DOCTRINES.find(d => d.id === id);
export const winsOf = (c) => (c.history || []).filter(h => h.outcome !== 'defeat').length;
export const knownOrders = (c) => c.doctrines || [];
