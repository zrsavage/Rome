// Formation orders are learned in camp, one at a time, as the campaign goes on. A new player starts with move, attack, hold,
// defend post and fall back; everything else is earned. Each doctrine needs victories behind you and an officer who can teach it.
// Nothing but marching and attacking is known at the start. Every other order (even holding a position) is learned in camp, a pair at a time as
// the campaign goes on, from an officer who can teach it.
export const DOCTRINES = [
  { id: 'hold', name: 'Standing Orders', key: 'H / G', wins: 1, trait: 'drill', req: 0, gold: 40,
    text: 'Hold position (H): a unit stays exactly where you put it. Defend post (G): it fights what comes near, then returns to its place.' },
  { id: 'fallback', name: 'Orderly Withdrawal', key: 'R', wins: 1, trait: 'tactics', req: 1, gold: 50,
    text: 'A unit walks backward out of the fight facing the enemy, then holds, to rest and re-form. Select it and press R.' },
  { id: 'sprint', name: 'Double-time', key: 'Shift+right-click', wins: 2, trait: 'drill', req: 1, gold: 60,
    text: 'March at the run. Units move about 45% faster but tire fast. Shift+right-click the ground to sprint, or an enemy to charge.' },
  { id: 'holdfire', name: 'Fire Discipline', key: 'J', wins: 2, trait: 'tactics', req: 1, gold: 50,
    text: 'Missile troops hold or open fire. Press J.' },
  { id: 'queue', name: 'Marching Orders', key: 'N', wins: 2, trait: 'drill', req: 1, gold: 50,
    text: 'Press N, then right-click points to give a unit a route. N again to stop.' },
  { id: 'extend', name: 'The Extended Line', key: 'L, or Alt+right-drag', wins: 2, trait: 'drill', req: 2, gold: 90,
    text: 'A thinner, wider cohort (L, or Alt while drawing a line): more men fight, but losses and charges shake it more.' },
  { id: 'testudo', name: 'The Testudo', key: 'T', wins: 3, trait: 'drill', req: 1, gold: 80,
    text: 'Locked shields, every way. Missiles glance off and charges bite less, but the cohort crawls and fights weakly. Press T.' },
  { id: 'guard', name: 'Guard and Escort', key: 'right-click a friend', wins: 3, trait: 'tactics', req: 1, gold: 80,
    text: 'Right-click a friendly unit to stay beside it and guard it.' },
  { id: 'array', name: 'Triplex Acies', key: 'B (Ctrl+B saves, Alt+B recalls)', wins: 3, trait: 'drill', req: 2, gold: 90,
    text: 'Press B to form three lines, missiles screening, horse on the wings. Ctrl+B saves your own layout, Alt+B recalls it.' },
  { id: 'priority', name: 'Target Priority', key: 'I', wins: 4, trait: 'tactics', req: 1, gold: 70,
    text: 'Tell slingers and archers what to shoot at first: anything, enemy missile troops, horse or foot. Press I to cycle.' },
  { id: 'cycle', name: 'Charge and Rally', key: 'M', wins: 4, trait: 'tactics', req: 2, gold: 100,
    text: 'Horse charge, break off, re-form and charge again. Press M.' },
  { id: 'detach', name: 'Antesignani', key: ', (comma)', wins: 3, trait: 'tactics', req: 2, gold: 90,
    text: 'A cohort sends a fifth of its men ahead as a javelin screen. Press comma; again on the screen to recall it.' },
  { id: 'rally', name: 'Rally the Line', key: 'F', wins: 4, trait: 'tactics', req: 2, gold: 100,
    text: 'Your general rides the line: wavering cohorts steady and routers turn about. Once every 90 seconds, inside the command ring. Press F.' },
  { id: 'pursue', name: 'Pursuit', key: 'P', wins: 4, trait: 'tactics', req: 2, gold: 100,
    text: 'Cavalry ride down broken enemies within reach. They never do this on their own. Select horse and press P, or right-click a fleeing unit.' },
  { id: 'relieve', name: 'Relief of the Line', key: 'Y', wins: 5, trait: 'drill', req: 3, gold: 150,
    text: 'A fresh cohort steps up through the gaps while the tired one falls back to rest. Select the tired cohort and press Y.' },
  { id: 'rotate', name: 'Rotation of the Line', key: 'K', wins: 6, trait: 'drill', req: 3, gold: 140,
    text: 'A tired or wavering cohort is relieved from behind automatically. Press K.' },
  { id: 'wedge', name: 'The Wedge (cuneus)', key: 'U', wins: 5, trait: 'drill', req: 3, gold: 150,
    text: 'A narrow, deep column that hits much harder on the charge but is weaker on its flanks and slower. Press U before the charge.' },
  { id: 'works', name: 'Fieldworks', key: 'Dig in (deployment)', wins: 2, trait: 'drill', req: 1, gold: 60,
    text: 'When defending, dig a ditch and rampart during deployment (;). It slows and blunts attackers and shields from missiles. Up to half your infantry.' },
  { id: 'lanes', name: 'Open Ranks', key: '. (period)', wins: 7, trait: 'drill', req: 2, gold: 120,
    text: 'Lanes open between maniples: elephants run through them harmlessly, but other foes do 20% more damage. Press period.' },
  { id: 'orbis', name: 'The Orbis', key: 'O', wins: 6, trait: 'drill', req: 4, gold: 150,
    text: 'A hollow square with no flanks and no rear, for a cohort that is about to be surrounded. Slow and weak on the attack. Press O.' }
];
export const doctrineById = (id) => DOCTRINES.find(d => d.id === id);
export const winsOf = (c) => (c.history || []).filter(h => h.outcome === 'victory' || h.outcome === 'draw').length;
export const knownOrders = (c) => c.doctrines || [];
