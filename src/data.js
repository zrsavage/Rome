// Static game data: unit types, difficulty, XP ladder, terrain and scenarios.

// The battlefield is sized per scenario (see scaleScenario at the bottom); WORLD always describes the battle currently loaded.
export const WORLD = { w: 1600, h: 1000 };
export const setWorld = (scn) => { WORLD.w = (scn && scn.world && scn.world.w) || 1600; WORLD.h = (scn && scn.world && scn.world.h) || 1000; };

// Experience is slow: a raw cohort needs several battles to become Miles and a long campaign to become a veteran.
export const XP_LEVELS = [0, 260, 700, 1350, 2200, 3300];
export const LEVEL_NAMES = ['Tiro (raw)', 'Miles', 'Veteran', 'Seasoned', 'Elite', 'Legendary'];

// atk = kills per fighting man per second (before armour). def = damage reduction (0..1).
// speed in world units / second. charge = impact multiplier on first contact.
export const UNIT_TYPES = {
  legionary: {
    name: 'Legionary Cohort', side: 'rome', cat: 'inf', perDot: 8, atk: 0.056, def: 0.42,
    speed: 22, turn: 1.7, morale: 72, charge: 0.55, pilum: 2, space: 1, fragile: 0.85,
    antiCharge: 0.25, cost: 60, color: '#b3261e', trim: '#e8c36a', blurb: 'Heavy infantry. Pilum volley, then gladius.'
  },
  slinger: {
    name: 'Balearic Slingers', side: 'rome', cat: 'ranged', perDot: 8, atk: 0.028, def: 0.1,
    speed: 30, turn: 2.4, morale: 52, charge: 0.2, range: 105, rate: 0.016, ammo: 70, space: 1.5, fragile: 1,
    cost: 45, color: '#c46a2b', trim: '#e8c36a', blurb: 'Skirmishers. Lead shot punishes massed warbands.'
  },
  equites: {
    name: 'Equites (Cavalry Turma)', side: 'rome', cat: 'cav', perDot: 4, atk: 0.09, def: 0.3,
    speed: 58, turn: 2.6, morale: 66, charge: 1.6, space: 3.2, fragile: 1,
    cost: 90, color: '#8a3a8f', trim: '#e8c36a', blurb: 'Fast shock cavalry. Ruinous against flanks and routers.'
  },
  aux_inf: {
    name: 'Allied Gallic Infantry', side: 'rome', cat: 'inf', perDot: 8, atk: 0.058, def: 0.2,
    speed: 26, turn: 1.6, morale: 56, charge: 0.9, space: 1.2, fragile: 1.1,
    cost: 40, color: '#c9742b', trim: '#e8c36a', blurb: 'Loyal Gallic warriors in Roman pay. Cheap, fierce, less disciplined.'
  },
  archer: {
    name: 'Cretan Archers', side: 'rome', cat: 'ranged', perDot: 8, atk: 0.025, def: 0.08,
    speed: 30, turn: 2.4, morale: 50, charge: 0.2, range: 135, rate: 0.019, ammo: 60, space: 1.5, fragile: 1,
    cost: 55, color: '#d2a23a', trim: '#e8c36a', blurb: 'Long-range archers. Outrange everything the Gauls field.'
  },
  aux_cav: {
    name: 'Allied Gallic Horse', side: 'rome', cat: 'cav', perDot: 4, atk: 0.08, def: 0.22,
    speed: 60, turn: 2.6, morale: 58, charge: 1.5, space: 3.2, fragile: 1.05,
    cost: 70, color: '#d28a2b', trim: '#e8c36a', blurb: 'Loyal Gallic cavalry. Quick flankers and pursuers.'
  },
  warband: {
    name: 'Gallic Warband', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.06, def: 0.12,
    speed: 28, turn: 1.6, morale: 60, charge: 1.1, space: 1.25, fragile: 1.25,
    color: '#2f6fa8', trim: '#d8d2b0', blurb: 'Fierce, numerous and unarmoured. Terrifying charge.'
  },
  gaul_skirm: {
    name: 'Gallic Javelineers', side: 'gaul', cat: 'ranged', perDot: 8, atk: 0.03, def: 0.06,
    speed: 34, turn: 2.4, morale: 46, charge: 0.2, range: 52, rate: 0.022, ammo: 55, space: 1.6, fragile: 1.2,
    color: '#3f8f7a', trim: '#d8d2b0', blurb: 'Light skirmishers who harass and withdraw.'
  },
  gaul_elite: {
    name: 'Gallic Nobles & Champions', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.072, def: 0.3,
    speed: 26, turn: 1.5, morale: 74, charge: 1.2, space: 1.15, fragile: 0.9,
    color: '#1d3f7a', trim: '#e8c36a', blurb: 'Armoured chieftains and their sworn retinues. Hard to break.'
  },
  gaul_cav: {
    name: 'Gallic Horse', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.08, def: 0.22,
    speed: 56, turn: 2.5, morale: 56, charge: 1.7, space: 3.2, fragile: 1.1,
    color: '#2a4a8c', trim: '#d8d2b0', blurb: 'Noble horsemen, quick to hit your rear.'
  },
  // Scorpiones: torsion bolt-throwers worked by a small crew. Caesar used them from his ships at the landing in Britain (Gallic War IV.25) and on
  // his siege lines. Long range, bolts that go through shields and mail, deadly into a packed mass; slow, and they must be set up after each move.
  scorpion: {
    name: 'Scorpiones (bolt-throwers)', side: 'rome', cat: 'ranged', perDot: 4, atk: 0.01, def: 0.1, engine: true, setup: 5, pierce: 0.5, vsDense: 1.5,
    speed: 13, turn: 1.1, morale: 52, charge: 0, range: 230, rate: 0.065, ammo: 45, space: 2.2, fragile: 1.2,
    cost: 120, color: '#8a5a2a', trim: '#e8c36a', blurb: 'Bolt-throwers: the longest range on the field and bolts that pierce armour, deadliest into packed infantry. Slow, 5 seconds to set up after moving, helpless if reached.'
  },
  // ----- Regional recruits (raised only where the army is) -----
  // King Deiotarus of Galatia armed and drilled his men as Roman legions; two of them fought for Calvinus (Bellum Alexandrinum 34).
  galatian: {
    name: 'Galatian Legionaries', side: 'rome', cat: 'inf', perDot: 8, atk: 0.054, def: 0.36, pilum: 1,
    speed: 22, turn: 1.7, morale: 60, charge: 0.6, space: 1, fragile: 1.0, antiCharge: 0.15,
    cost: 50, color: '#9a3a2e', trim: '#e8c36a', blurb: "King Deiotarus' Galatians, armed and drilled as Romans. Solid, but greener than your legions."
  },
  // Spanish light foot: the caetra, a small round shield, the falcata and javelins. Quick and hard to pin down.
  caetrati: {
    name: 'Spanish Caetrati', side: 'rome', cat: 'inf', perDot: 8, atk: 0.055, def: 0.16, pilum: 1,
    speed: 30, turn: 2.0, morale: 56, charge: 0.85, space: 1.3, fragile: 1.1,
    cost: 38, color: '#c8b48a', trim: '#a8281f', blurb: 'Spanish light infantry with small round shields, javelins and the curved falcata. Fast flankers and skirmishers.'
  },
  // King Bogud of Mauretania and the adventurer Sittius fought for Caesar in Africa and Spain, 46-45 BC: Moorish light horse.
  moor_cav: {
    name: 'Moorish Horse', side: 'rome', cat: 'cav', perDot: 4, atk: 0.055, def: 0.12, native: true,
    speed: 64, turn: 3.0, morale: 54, charge: 0.9, range: 70, rate: 0.02, ammo: 45, space: 3.0, fragile: 1.15,
    cost: 65, color: '#b4783a', trim: '#e8c36a', blurb: "Light javelin horse from Caesar's Moorish allies. They throw from range; hold them still to shoot, keep them out of the melee."
  },
  // ----- Side act: Britannia, 55-54 BC -----
  // Britons fought much as Gauls did, with one difference Caesar describes at length (Gallic War IV.33): two-wheeled war chariots. They drive
  // along the line throwing javelins, the warriors leap down to fight on foot, and the drivers wait close by to carry them off if pressed.
  britons: {
    name: 'British Warriors', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.058, def: 0.12,
    speed: 29, turn: 1.7, morale: 58, charge: 1.05, space: 1.25, fragile: 1.2,
    color: '#3a6a8a', trim: '#d8d2b0', blurb: 'Warriors of the British tribes: brave, quick to charge, and gone into the woods when it goes badly.'
  },
  brit_chariot: {
    name: 'British War Chariots', side: 'gaul', cat: 'cav', perDot: 3, atk: 0.07, def: 0.18, native: true,
    speed: 60, turn: 2.4, morale: 58, charge: 1.2, range: 60, rate: 0.02, ammo: 40, space: 3.2, fragile: 1.05,
    color: '#5a7a5a', trim: '#d8d2b0', blurb: 'Light two-horse chariots: they race along your line throwing javelins, set warriors down to fight, and carry them off again. No scythes.'
  },
  brit_cav: {
    name: 'British Horse', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.075, def: 0.2,
    speed: 57, turn: 2.5, morale: 55, charge: 1.5, space: 3.2, fragile: 1.1,
    color: '#2f5a7a', trim: '#d8d2b0', blurb: 'British horsemen, fighting beside the chariots.'
  },
  // ----- Act III: Africa, 49 BC (Juba of Numidia and the Pompeians) -----
  // Numidians rode without saddle or bridle, guiding the horse with a neck rope and a switch; small round leather shields and a bundle of
  // javelins. They threw and wheeled away; they did not stand.
  numid_cav: {
    name: 'Numidian Horse', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.055, def: 0.12, native: true,
    speed: 66, turn: 3.0, morale: 52, charge: 0.9, range: 70, rate: 0.02, ammo: 45, space: 3.0, fragile: 1.15,
    color: '#4a6a9a', trim: '#e0d0a0', blurb: 'Fast, unarmoured javelin horse. They throw, wheel away from anything that comes at them, and come back. Roman horse cannot catch them on open ground.'
  },
  numid_inf: {
    name: 'Numidian Foot', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.05, def: 0.14, native: true, pilum: 1,
    speed: 32, turn: 1.9, morale: 50, charge: 0.75, space: 1.4, fragile: 1.15,
    color: '#3f7f9a', trim: '#e0d0a0', blurb: 'Light infantry with javelins and small round shields. Quick, and hard to pin down.'
  },
  // North African forest elephants: smaller than the Indian kind and carrying no towers, a driver on the neck. Terrifying to horses; maddened by
  // missiles; a panicked elephant runs through whoever is in the way, its own side included.
  elephant: {
    name: 'War Elephants', side: 'gaul', cat: 'inf', perDot: 10, atk: 0.16, def: 0.5, big: true, terror: 1.2, panicky: true, rampage: true,
    speed: 30, turn: 1.1, morale: 56, charge: 2.6, chargePer: 0.45, space: 1, fragile: 1.3,
    color: '#7a7468', trim: '#d8d2b0', blurb: 'A crushing charge that horses will not face. Missiles drive them mad, and a maddened elephant tramples its own side. Open ranks (.) let them through.'
  },
  // Pompeian legionaries wore the same kit as yours; the blue-grey shields are only so you can tell the two sides apart on the field.
  pompeian: {
    name: 'Pompeian Legionaries', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.056, def: 0.42, defects: true,
    speed: 22, turn: 1.7, morale: 70, charge: 0.55, pilum: 2, space: 1, fragile: 0.85, antiCharge: 0.25,
    color: '#5a6a8a', trim: '#e8c36a', blurb: 'Romans like your own: mail, scutum, pilum and gladius, the same drill and the same stubbornness.'
  },
  // ----- Act IV: Pharsalus and Pontus, 48-47 BC -----
  // Pompey's horse at Pharsalus was raised from allies and client kings (Gauls, Germans, Galatians, Cappadocians, Thracians); his light troops were
  // archers and slingers from the East.
  pomp_cav: {
    name: 'Pompeian Horse', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.08, def: 0.24,
    speed: 56, turn: 2.5, morale: 58, charge: 1.6, space: 3.2, fragile: 1.1,
    color: '#4a5a8a', trim: '#e8c36a', blurb: "Pompey's great mass of allied horse, gathered from half the kings of the East. Strong in the charge, unsteady if it goes wrong."
  },
  pomp_missile: {
    name: 'Pompeian Archers and Slingers', side: 'gaul', cat: 'ranged', perDot: 8, atk: 0.025, def: 0.08,
    speed: 30, turn: 2.4, morale: 46, charge: 0.2, range: 125, rate: 0.018, ammo: 60, space: 1.5, fragile: 1.1,
    color: '#5a7a9a', trim: '#e8c36a', blurb: 'Eastern archers and slingers behind the horse. Deadly at range, helpless when caught.'
  },
  // Pharnaces' foot: Pontic infantry drilled and armed in the Roman manner, as his father Mithridates had begun. Good, less steady than legionaries.
  pontic: {
    name: 'Pontic Infantry', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.054, def: 0.34,
    speed: 23, turn: 1.7, morale: 60, charge: 0.7, pilum: 1, space: 1, fragile: 1.0, antiCharge: 0.15,
    color: '#7a4a6a', trim: '#e8c36a', blurb: "Pharnaces' foot, armed and drilled in the Roman manner. Solid, but they break sooner than real legions."
  },
  // The Sarmatians (Siraces and Aorsi), steppe horsemen from beyond the Maeotis, the heirs of the Scythians (Strabo 11.5.8).
  horse_archer: {
    name: 'Sarmatian Horse Archers', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.03, def: 0.14, native: true, shootMoving: true,
    speed: 62, turn: 2.8, morale: 54, charge: 0.6, range: 110, rate: 0.016, ammo: 80, space: 3.0, fragile: 1.1,
    color: '#8a6a3a', trim: '#d8c48a', blurb: 'Steppe archers who shoot from the saddle and fall back shooting when charged. They carry only so many arrows.'
  },
  lancer: {
    name: 'Sarmatian Lancers', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.1, def: 0.4,
    speed: 50, turn: 2.0, morale: 66, charge: 2.1, space: 3.4, fragile: 0.95,
    color: '#6a4a2a', trim: '#d8c48a', blurb: 'Nobles in scale armour with the long two-handed lance. Ruinous in a frontal charge; slow to turn and poor when caught standing.'
  },
  // Scythed chariots: blades on the axles, a single headlong charge, then nothing. Pharnaces sent them in first at Zela (Bellum Alexandrinum 75).
  chariot: {
    name: 'Scythed Chariots', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.03, def: 0.2, big: true, oneShot: true, panicky: true,
    speed: 72, turn: 0.9, morale: 50, charge: 3, chargePer: 3.2, space: 1, fragile: 1.6,
    color: '#7a5a3a', trim: '#d8c48a', blurb: 'One straight, terrible charge, then they are spent. Missiles bring the horses down; open ranks let them through.'
  },
  // ----- Act V: Africa and Spain, 46-45 BC -----
  // Pompey's sons raised legions in Spain from local levies, deserters and freed slaves: many, armed like legionaries, but raw.
  pomp_levy: {
    name: 'Pompeian Levies', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.05, def: 0.38, defects: true,
    speed: 22, turn: 1.6, morale: 60, charge: 0.5, pilum: 1, space: 1, fragile: 1.0, antiCharge: 0.2,
    color: '#6a7a9a', trim: '#c8b070', blurb: "Legions raised in a hurry in Spain: Roman kit, little drill. Many of them, and they may come over if they waver."
  },
  // ----- the Roman train and detachments -----
  baggage: {
    name: 'Baggage Train', side: 'rome', cat: 'train', perDot: 20, atk: 0.012, def: 0.3, wagon: true,
    speed: 15, turn: 1.2, morale: 70, charge: 0, space: 5, fragile: 0.6,
    color: '#8a6a3a', trim: '#e8c36a', blurb: 'The legion\'s wagons: spare pila, sling-shot and arrows. Units beside it refill. Lose it and you lose supplies.'
  },
  antesignani: {
    name: 'Antesignani', side: 'rome', cat: 'ranged', perDot: 8, atk: 0.042, def: 0.22,
    speed: 31, turn: 2.4, morale: 64, charge: 0.4, range: 50, rate: 0.022, ammo: 32, space: 1.5, fragile: 1,
    color: '#b3261e', trim: '#e8c36a', blurb: 'Picked legionaries who fight in front of the standards as a light screen, then fall back into their cohort.'
  },
  // ----- Act II: Ariovistus and the Suebi (Germania) -----
  suebi: {
    name: 'Suebi Warband', side: 'gaul', cat: 'inf', perDot: 8, atk: 0.068, def: 0.14,
    speed: 31, turn: 1.5, morale: 64, charge: 1.2, space: 1.2, fragile: 1.1,
    color: '#7a5a2e', trim: '#d8d2b0', blurb: 'Tall, hard and quick on the march. They fight in a close mass behind their shields and long spears.'
  },
  german_cav: {
    name: 'Germanic Horse and Runners', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.085, def: 0.18,
    speed: 54, turn: 2.4, morale: 60, charge: 1.5, space: 3.2, fragile: 1.05, antiCharge: 0.2,
    color: '#6a4a2a', trim: '#d8d2b0', blurb: 'Each rider is paired with a fleet, light-armed foot runner who holds his horse\'s mane. They harry, raid and cut supply lines.'
  },
  laager: {
    name: 'Wagon Laager', side: 'gaul', cat: 'inf', perDot: 26, atk: 0.018, def: 0.5, wagon: true,
    speed: 0, turn: 0, morale: 95, charge: 0, space: 5, fragile: 0.5,
    color: '#8a6a3a', trim: '#d8d2b0', blurb: 'The wagons and carts of the host, drawn up behind the line with the families on them. Nobody flees past them, and they cannot move.'
  }
};

// What it costs to raise a fresh unit of each Roman type at camp (and its full strength).
export const RAISE = {
  legionary: { men: 300, max: 480, gold: 420, supplies: 40 },
  slinger: { men: 120, max: 150, gold: 130, supplies: 10 },
  equites: { men: 50, max: 60, gold: 300, supplies: 20 },
  archer: { men: 100, max: 130, gold: 200, supplies: 12 },
  aux_cav: { men: 50, max: 70, gold: 240, supplies: 15 },
  aux_inf: { men: 250, max: 350, gold: 340, supplies: 30 },
  galatian: { men: 300, max: 450, gold: 330, supplies: 30 },
  caetrati: { men: 250, max: 350, gold: 260, supplies: 20 },
  moor_cav: { men: 60, max: 80, gold: 260, supplies: 15 },
  scorpion: { men: 40, max: 40, gold: 420, supplies: 30 }
};
// What really happened at the named battles, shown on the result screen beside your own result. Ancient figures are given as the sources
// state them, and they are often exaggerated; romeLoss is the Roman loss in men where a source gives one.
export const HISTORY = {
  bibracte: { text: "Caesar fought the Helvetii from midday into the night, hardest at their wagons. He gives no losses of his own, but spent three days burying the dead. Of 368,000 who set out, he says 110,000 went home.", source: 'Caesar, Gallic War I.24-29' },
  ariovistus: { text: "Crassus saved the Roman left with the third line, and the Germans fled fifty miles to the Rhine. Ariovistus escaped by boat. Roman losses are not recorded.", source: 'Caesar, Gallic War I.51-53; Plutarch, Caesar 19' },
  cassivellaunus: { text: "Caesar forced the Thames and stormed the stronghold. Cassivellaunus gave hostages and tribute, and Caesar left before the autumn storms.", source: 'Caesar, Gallic War V.18-23' },
  bagradas: { text: "Juba surrounded Curio's army. Curio refused to flee and died fighting; almost all his men were killed or taken. If anyone came home, you beat history.", source: 'Caesar, Civil War II.39-44' },
  pharsalus: { text: "The fourth line routed Pompey's horse and turned his flank. Pompey fled to Egypt and was murdered. Caesar claims 200 of his own lost against 15,000 Pompeians killed.", source: 'Caesar, Civil War III.88-99', romeLoss: 200 },
  nicopolis: { text: "Calvinus' attack failed. The Pontic legion was almost destroyed, but the veteran Thirty-Sixth withdrew in good order, losing under 250 men.", source: 'Bellum Alexandrinum 39-40' },
  zela: { text: "Pharnaces charged uphill at the half-built camp and was routed in four hours. Caesar's report: veni, vidi, vici.", source: 'Bellum Alexandrinum 74-77; Suetonius, Julius 37' },
  ruspina: { text: "Caesar turned every other cohort about, broke out both ways and was back in camp by nightfall. Losses were light.", source: 'Bellum Africum 11-18' },
  thapsus: { text: "Caesar's veterans charged without orders, and the panicked elephants wrecked their own side. Ancient writers claim 10,000 Pompeians dead for 50 of Caesar's.", source: 'Bellum Africum 79-86; Plutarch, Caesar 53', romeLoss: 50 },
  munda: { text: "The lines fought evenly for hours, until a Pompeian move was mistaken for a retreat. Labienus and 30,000 Pompeians died. Caesar lost about 1,000.", source: 'Bellum Hispaniense 30-31', romeLoss: 1000 }
};
// How an act is named on screen: the side act is not numbered.
export const actLabel = (a) => a === 'B' ? 'Side act: Britannia' : `Act ${a}`;
export const START_TYPES = ['legionary', 'slinger', 'equites'];
// Where the army is decides who can be raised. Legionaries, slingers, archers, equites and Gallic horse go everywhere; local troops only locally.
export const REGION_NAMES = { gaul: 'Gaul', africa: 'Africa', greece: 'Greece', east: 'Pontus and Armenia', spain: 'Spain' };
export const RECRUITS = { gaul: ['aux_inf'], africa: [], greece: [], east: ['galatian'], spain: ['caetrati'] };   // Deiotarus' Galatians fought for Pompey at Pharsalus: none in Greece
export const EVERYWHERE = ['legionary', 'slinger', 'archer', 'equites', 'aux_cav', 'scorpion'];
export function regionOf(scn) {
  const th = (scn && scn.theater) || 'Gaul';
  return th === 'Africa' ? 'africa' : th === 'Hispania' ? 'spain' : th === 'Greece' ? 'greece' : ['Pontus', 'Armenia Minor'].includes(th) ? 'east' : 'gaul';
}
// troops a region offers on top of the usual ones (Bogud's Moors only once Caesar himself is in Africa, 46 BC)
export const regionalExtras = (scn) => { const r = regionOf(scn); return r === 'africa' && scn && scn.act === 'V' ? ['moor_cav'] : RECRUITS[r]; };
export const TYPE_UNLOCKS = { arar: ['aux_cav'], convoy: ['archer'], oppidum: ['aux_inf'], landing: ['scorpion'], anquillaria: ['scorpion'] };   // bolt-throwers after the landing in Britain, or the first fight in Africa

export const DIFFICULTY = {
  easy:      { name: 'Tiro',       enemyMult: 0.8,  enemyMorale: -6, romeMorale: 8,  officerRisk: 0.0,  reward: 0.9,  desc: 'Forgiving. Officers cannot die.' },
  normal:    { name: 'Miles',      enemyMult: 1.0,  enemyMorale: 0,  romeMorale: 0,  officerRisk: 1.0,  reward: 1.0,  desc: 'Intended experience. Officers can fall.' },
  hard:      { name: 'Centurion',  enemyMult: 1.3,  enemyMorale: 6,  romeMorale: -2, officerRisk: 1.25, reward: 1.15, desc: 'Larger, braver enemies. Richer spoils.' },
  legendary: { name: 'Imperator',  enemyMult: 1.6,  enemyMorale: 12, romeMorale: -5, officerRisk: 1.5,  reward: 1.3,  desc: 'Brutal. Draws will feel like victories.' }
};

// ---- Height ----
// Hills are smooth, slightly irregular bumps (height in metres, `h` per hill, default 40). Everything that matters about a hill in battle
// (speed up and down slopes, charge power, morale, missile fire, who can see whom) is derived from this one function.
const hash2 = (ix, iy) => { let h = Math.imul(ix, 374761393) + Math.imul(iy, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const vnoise = (x, y) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1); return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
export { vnoise };
// Woods are ragged blobs with clearings, not ovals; rivers wander. Terrain tests and drawing share these so what you see is what the sim uses.
export function forestIn(f, x, y) {
  const nx = (x - f.cx) / f.rx, ny = (y - f.cy) / f.ry, r = Math.hypot(nx, ny);
  if (r > 1.25) return false;
  const a = Math.atan2(ny, nx), sd = f.cx * 0.013 + f.cy * 0.007;
  const edge = 0.86 + 0.3 * vnoise(Math.cos(a) * 1.7 + sd, Math.sin(a) * 1.7 + sd * 1.3) + 0.2 * vnoise(Math.cos(a) * 4.1 + sd * 2, Math.sin(a) * 4.1 - sd) - 0.08;
  if (r >= edge) return false;
  const gs = 52 * Math.pow(f.sc || 1, 0.6);
  if (r > 0.38 && vnoise(x / gs + sd, y / gs - sd) < 0.2) return false;     // a glade
  return true;
}
export function riverShift(f, x) { const sc = f.sc || 1; return ((vnoise(x / (150 * sc) + f.y * 0.013 / sc, f.y * 0.031 / sc) - 0.5) * 2 * 26 + Math.sin(x / (210 * sc) + f.y * 0.02 / sc) * 12) * Math.sqrt(sc); }
export function elevAt(scn, x, y) {
  if (!scn || !scn.terrain) return 0;
  let e = 0;
  for (const f of scn.terrain) {
    if (f.kind !== 'hill') continue;
    const nx = (x - f.cx) / f.rx, ny = (y - f.cy) / f.ry;
    const sc = f.sc || 1, r = Math.sqrt(nx * nx + ny * ny) + (vnoise(x / (80 * sc) + f.cx * 0.017 / sc, y / (80 * sc) + f.cy * 0.011 / sc) - 0.5) * 0.32;
    if (r >= 1) continue;
    const t = 1 - Math.max(0, r), v = (f.h || 40) * t * t * (3 - 2 * t) * (0.88 + 0.24 * vnoise(x / (38 * sc), y / (38 * sc)));
    if (v > e) e = v;
  }
  return e;
}

// Terrain features. Rectangles use x,y,w,h; ellipses use cx,cy,rx,ry.
export function terrainAt(scn, x, y) {
  let r = { speed: 1, def: 1, atk: 1, cav: 1, kind: 'grass' };
  if (!scn) return r;
  for (const f of scn.terrain) {
    let inside;
    if (f.kind === 'hill') continue;                                   // hills come from the height map below
    if (f.kind === 'forest') inside = forestIn(f, x, y);
    else if (f.rx) inside = ((x - f.cx) / f.rx) ** 2 + ((y - f.cy) / f.ry) ** 2 <= 1;
    else { const sh = f.kind === 'water' || f.kind === 'ford' ? riverShift(f, x) : 0; inside = x >= f.x && x <= f.x + f.w && y - sh >= f.y && y - sh <= f.y + f.h; }
    if (!inside) continue;
    const fl = scn.flood || 0;                                          // a storm raises the river: fords deepen as the water comes up
    if (f.kind === 'water')  r = scn._wx === 'frost' ? { speed: 0.7, def: 1.0, atk: 0.95, cav: 0.6, kind: 'ice' } : { speed: 0.35, def: 1.0, atk: 0.8, cav: 0.5, kind: 'water' };
    if (f.kind === 'ford')   r = scn._wx === 'frost' ? { speed: 0.8, def: 1.0, atk: 0.95, cav: 0.7, kind: 'ice' } : { speed: 0.8 - 0.4 * fl, def: 1.0, atk: 0.9 - 0.15 * fl, cav: 0.8 - 0.4 * fl, kind: 'ford' };
    if (f.kind === 'forest') r = { speed: 0.6,  def: 0.95, atk: 0.95, cav: 0.55, kind: 'forest' };
  }
  if (r.kind === 'grass' && elevAt(scn, x, y) >= 6) r = { speed: 1, def: 0.9, atk: 1.06, cav: 0.95, kind: 'hill' };
  return r;
}

// ---------------------------------------------------------------------------
// Act I - Gaul, 58 BC. Five minor fights, then the named battle of Bibracte.
// deploy: {mode,cx,cy,spacing,cols,f}; objectives: capture points; rule: hold-all for holdSecs wins.
// reinforcements: {at, side?, msg, unit}. unlock: new cohorts granted after the scenario (win or draw).
// rewardMult > 1 marks scenarios modelled on historical Roman defeats/ambushes.
// ---------------------------------------------------------------------------
export const SCENARIOS = [
  {
    id: 'ford', odds: 0.8, posture: 'defend', chief: { name: "Nammeius", style: 'cautious' }, act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Fords of the Rhone', kind: 'skirmish',
    geo: { lat: 46.20, lon: 6.15, place: 'Genava (Geneva)', note: 'Fords of the Rhone, where the Helvetii tried to cross' },
    briefing: 'The Helvetii want to cross the Rhone into the Province. You hold the river; warbands are probing the fords. Throw them back.',
    objective: 'Break the host (below 25%), or withdraw with 45% of your men.',
    timeLimit: 540, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    terrain: [
      { kind: 'water', x: 0, y: 460, w: 700, h: 70 }, { kind: 'ford', x: 700, y: 460, w: 200, h: 70 }, { kind: 'water', x: 900, y: 460, w: 700, h: 70 },
      { kind: 'hill', cx: 1230, cy: 760, rx: 170, ry: 95 }, { kind: 'forest', cx: 360, cy: 270, rx: 170, ry: 100 }, { kind: 'forest', cx: 1280, cy: 230, rx: 130, ry: 80 }
    ],
    enemy: [
      { type: 'warband', men: 240, x: 640, y: 250, ai: { kind: 'rush', delay: 6 } },
      { type: 'warband', men: 265, x: 820, y: 230, ai: { kind: 'rush', delay: 3 } },
      { type: 'warband', men: 210, x: 380, y: 300, ai: { kind: 'ambush', trigger: 260, maxDelay: 120 } },
      { type: 'gaul_skirm', men: 90, x: 740, y: 330, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 50, x: 1260, y: 200, ai: { kind: 'flank', delay: 20 } }
    ],
    reinforcements: [{ at: 150, msg: 'War horns sound from the forest - another warband joins the fray!', unit: { type: 'warband', men: 210, x: 300, y: 80, ai: { kind: 'rush', delay: 0 } } }],
    rewards: { gold: 260, supplies: 120, recruits: 60, xpBase: 30, officerXp: 35 }, rewardMult: 1, unlock: []
  },
  {
    id: 'arar', posture: 'pursuit', chief: { name: "Divico", style: 'stubborn' }, fog: true, act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Crossing of the Arar', kind: 'skirmish',
    geo: { lat: 45.94, lon: 4.77, place: 'The Arar (Saone) near Trevoux', note: 'Site of the Tigurini crossing is approximate' },
    briefing: 'The Tigurini are still on your bank of the Arar, strung out and unready. Strike before the rest return. The river is deep: use the ford.',
    objective: 'Destroy the stragglers (below 25%), or withdraw with 45% of your men.',
    timeLimit: 480, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 700, cy: 900 },
    terrain: [
      { kind: 'water', x: 0, y: 380, w: 520, h: 100 }, { kind: 'ford', x: 520, y: 380, w: 200, h: 100 }, { kind: 'water', x: 720, y: 380, w: 880, h: 100 },
      { kind: 'forest', cx: 1250, cy: 760, rx: 200, ry: 110 }, { kind: 'hill', cx: 330, cy: 760, rx: 150, ry: 85 }, { kind: 'forest', cx: 1100, cy: 150, rx: 220, ry: 90 }
    ],
    enemy: [
      { type: 'warband', men: 320, x: 560, y: 560, ai: { kind: 'ambush', trigger: 130, maxDelay: 90, quiet: true } },
      { type: 'warband', men: 300, x: 760, y: 590, ai: { kind: 'ambush', trigger: 130, maxDelay: 90, quiet: true } },
      { type: 'warband', men: 285, x: 960, y: 560, ai: { kind: 'ambush', trigger: 130, maxDelay: 95, quiet: true } },
      { type: 'gaul_skirm', men: 125, x: 650, y: 520, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 75, x: 1100, y: 620, ai: { kind: 'flank', delay: 35 } }
    ],
    reinforcements: [{ at: 120, msg: 'Warbands from across the Arar wade back to rescue their kin!', unit: { type: 'gaul_elite', men: 240, x: 620, y: 300, ai: { kind: 'rush', delay: 0 } } }],
    rewards: { gold: 360, supplies: 160, recruits: 80, xpBase: 44, officerXp: 50 }, rewardMult: 1.1,
    unlock: [{ type: 'aux_cav', name: 'Allied Gallic Horse', men: 60, maxMen: 70, xp: 20, drill: 15, msg: 'Aeduan cavalry ride in to support Rome.' }]
  },
  {
    id: 'convoy', odds: 0.85, posture: 'defend', chief: { name: "Verucloetius", style: 'cunning' }, act: 'I', theater: 'Gaul', year: '58 BC', name: "The Foragers' Road", kind: 'skirmish',
    geo: { lat: 46.78, lon: 4.85, place: 'Cabillonum (Chalon-sur-Saone)', note: 'Aeduan country; the road is illustrative' },
    briefing: 'Raiders are closing on your grain train on a forest road. Lose the wagons and the army starves.',
    objective: 'Keep the wagons (gold marker). If the Gauls hold them 90 s, the convoy is lost. Break the raiders to win.',
    timeLimit: 450, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 745 },
    objectives: [{ id: 'wagons', name: 'Supply Wagons', x: 800, y: 700, r: 70, owner: 'rome' }],
    rule: { holdSecs: 90, attacker: 'gaul' },
    terrain: [
      { kind: 'forest', cx: 280, cy: 500, rx: 260, ry: 230 }, { kind: 'forest', cx: 1330, cy: 480, rx: 260, ry: 240 },
      { kind: 'hill', cx: 800, cy: 330, rx: 140, ry: 80 }, { kind: 'forest', cx: 820, cy: 120, rx: 220, ry: 90 }
    ],
    enemy: [
      { type: 'warband', men: 400, x: 450, y: 450, ai: { kind: 'raid', obj: 'wagons' } },
      { type: 'warband', men: 385, x: 1150, y: 430, ai: { kind: 'raid', obj: 'wagons', delay: 8 } },
      { type: 'gaul_skirm', men: 160, x: 830, y: 330, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 90, x: 1400, y: 380, ai: { kind: 'raid', obj: 'wagons', delay: 12 } },
      { type: 'warband', men: 310, x: 300, y: 380, ai: { kind: 'ambush', trigger: 200, maxDelay: 100 } }
    ],
    reinforcements: [{ at: 100, msg: 'More raiders pour out of the eastern woods!', unit: { type: 'warband', men: 295, x: 1500, y: 420, ai: { kind: 'raid', obj: 'wagons' } } }],
    rewards: { gold: 180, supplies: 260, recruits: 50, xpBase: 34, officerXp: 40 }, rewardMult: 1,
    unlock: [{ type: 'archer', name: 'Cretan Archers', men: 100, maxMen: 130, xp: 25, drill: 20, msg: 'Cretan mercenary archers join your column.' }]
  },
  {
    id: 'oppidum', posture: 'assault', chief: { name: "Casticus of the Sequani", style: 'stubborn' }, optional: true, fog: true, act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Hill Fort of the Sequani', kind: 'skirmish',
    geo: { lat: 47.24, lon: 6.02, place: 'Vesontio (Besancon)', note: 'Great oppidum of the Sequani on a loop of the Doubs' },
    briefing: 'A chieftain has fortified a hilltop and refuses you grain. Soften the defenders with missiles, lure them down, or storm the crest.',
    objective: 'Hold the summit 150 s, or break the defenders. Fighting uphill is costly.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    objectives: [{ id: 'fort', name: 'Hill Fort', x: 800, y: 270, r: 90, owner: 'gaul' }],
    rule: { holdSecs: 150, attacker: 'rome' },
    terrain: [
      { kind: 'hill', cx: 800, cy: 260, rx: 330, ry: 150, h: 70 }, { kind: 'forest', cx: 250, cy: 520, rx: 170, ry: 100 }, { kind: 'forest', cx: 1350, cy: 560, rx: 180, ry: 110 },
      { kind: 'water', x: 0, y: 620, w: 520, h: 40 }, { kind: 'water', x: 1080, y: 620, w: 520, h: 40 }
    ],
    enemy: [
      { type: 'warband', men: 535, x: 700, y: 240, ai: { kind: 'ambush', trigger: 90, maxDelay: 140 } },
      { type: 'warband', men: 535, x: 900, y: 240, ai: { kind: 'ambush', trigger: 90, maxDelay: 140 } },
      { type: 'gaul_elite', men: 340, x: 800, y: 215, ai: { kind: 'ambush', trigger: 40, maxDelay: 200 } },
      { type: 'gaul_skirm', men: 235, x: 640, y: 300, ai: { kind: 'skirm' } },
      { type: 'gaul_skirm', men: 215, x: 960, y: 300, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 105, x: 1300, y: 330, ai: { kind: 'flank', delay: 50 } }
    ],
    reinforcements: [],
    rewards: { gold: 320, supplies: 140, recruits: 70, xpBase: 40, officerXp: 45 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'IV Cohort', men: 360, maxMen: 480, xp: 10, drill: 15, msg: 'Fresh legionaries of the IV Cohort arrive from Cisalpine Gaul.' }]
  },
  {
    id: 'silva', posture: 'ambush', chief: { name: "Dumnorix's partisans", style: 'cunning' }, fog: true, act: 'I', theater: 'Gaul', year: '58 BC', name: 'Ambush in the Silva', kind: 'skirmish',
    geo: { lat: 47.15, lon: 4.00, place: 'Forests of the Morvan', note: 'Illustrative ambush site' },
    briefing: 'The Gauls spring an ambush in dense forest, on both your flanks. Hold together until the rearguard arrives.',
    objective: 'Survive: break the host, or keep 45% of your army until time runs out.',
    timeLimit: 360, daysToPrepare: 2,
    deploy: { mode: 'grid', cx: 800, cy: 620, cols: 3, dx: 110, dy: 80 },
    terrain: [
      { kind: 'forest', cx: 250, cy: 500, rx: 320, ry: 420 }, { kind: 'forest', cx: 1350, cy: 500, rx: 320, ry: 420 },
      { kind: 'forest', cx: 800, cy: 90, rx: 420, ry: 110 }, { kind: 'hill', cx: 800, cy: 900, rx: 200, ry: 70 }
    ],
    enemy: [
      { type: 'warband', men: 805, x: 520, y: 520, ai: { kind: 'ambush', trigger: 400, maxDelay: 6, quiet: true } },
      { type: 'warband', men: 805, x: 1080, y: 560, ai: { kind: 'ambush', trigger: 400, maxDelay: 9, quiet: true } },
      { type: 'warband', men: 680, x: 800, y: 300, ai: { kind: 'ambush', trigger: 400, maxDelay: 14, quiet: true } },
      { type: 'gaul_elite', men: 495, x: 560, y: 380, ai: { kind: 'ambush', trigger: 400, maxDelay: 20, quiet: true } },
      { type: 'gaul_skirm', men: 310, x: 1000, y: 330, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 155, x: 1180, y: 700, ai: { kind: 'flank', delay: 25 } }
    ],
    reinforcements: [
      { at: 170, side: 'rome', msg: 'Your rearguard cohort fights its way up the road to relieve you!', unit: { type: 'legionary', men: 300, x: 800, y: 1010, f: -1.5708, name: 'Rearguard Cohort' } }
    ],
    rewards: { gold: 420, supplies: 300, recruits: 120, xpBase: 55, officerXp: 60 }, rewardMult: 1.7,
    unlock: [{ type: 'legionary', name: 'V Cohort', men: 380, maxMen: 480, xp: 25, drill: 20, msg: 'The V Cohort joins your legion, impressed by your escape.' }]
  },
  {
    id: 'bibracte', odds: 0.8, posture: 'defend', chief: { name: "the Helvetian war council", style: 'aggressive' }, act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Battle of Bibracte', kind: 'named',
    geo: { lat: 46.93, lon: 4.03, place: 'Bibracte (Mont Beuvray)', note: 'Oppidum of the Aedui' },
    briefing: 'The Helvetii turn on your column at Bibracte. Break their assault with pila and sword, and watch your flank: the Boii and Tulingi will strike at the height of the fight.',
    objective: 'Break the Helvetii. Keep a fresh reserve for the flank attack. A clean withdrawal is a draw.',
    links: [
      { from: 'silva', scale: { gaul_elite: 0.65 }, text: 'Their champions fell in the forest ambush: fewer nobles stand in the line.' },
      { from: 'oppidum', scale: { gaul_skirm: 0.6 }, text: 'The Sequani hill fort is yours: fewer javelin men have joined the Helvetii.' },
      { from: 'convoy', morale: 3, text: 'The grain got through: the army is well fed (+3 morale).' }
    ],
    timeLimit: 780, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 780, cy: 860 },
    objectives: [{ id: 'ridge', name: 'The Ridge', x: 800, y: 420, r: 110, owner: 'gaul' }],
    rule: { holdSecs: 180, attacker: 'rome' },
    terrain: [
      { kind: 'hill', cx: 800, cy: 260, rx: 520, ry: 190, h: 60 }, { kind: 'hill', cx: 800, cy: 760, rx: 420, ry: 110, h: 30 },
      { kind: 'forest', cx: 160, cy: 470, rx: 180, ry: 140 }, { kind: 'forest', cx: 1460, cy: 480, rx: 150, ry: 130 }, { kind: 'water', x: 0, y: 620, w: 330, h: 50 }
    ],
    enemy: [
      { type: 'warband', men: 350, x: 520, y: 260, ai: { kind: 'ambush', trigger: 120, maxDelay: 70, quiet: true } },
      { type: 'warband', men: 350, x: 680, y: 240, ai: { kind: 'ambush', trigger: 120, maxDelay: 60, quiet: true } },
      { type: 'warband', men: 350, x: 920, y: 240, ai: { kind: 'ambush', trigger: 120, maxDelay: 60, quiet: true } },
      { type: 'warband', men: 350, x: 1080, y: 260, ai: { kind: 'ambush', trigger: 120, maxDelay: 70, quiet: true } },
      { type: 'gaul_elite', men: 300, x: 800, y: 290, ai: { kind: 'ambush', trigger: 100, maxDelay: 75, quiet: true } },
      { type: 'gaul_skirm', men: 150, x: 640, y: 340, ai: { kind: 'skirm' } },
      { type: 'gaul_skirm', men: 150, x: 960, y: 340, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 80, x: 1350, y: 330, ai: { kind: 'flank', delay: 60 } }
    ],
    reinforcements: [
      { at: 120, msg: 'The Helvetii reserve advances to join the fight!', unit: { type: 'warband', men: 350, x: 800, y: 40, ai: { kind: 'rush', delay: 0 } } },
      { at: 240, msg: 'The Boii and Tulingi appear on your flank and rear!', unit: { type: 'warband', men: 405, x: 1500, y: 700, ai: { kind: 'rush', delay: 0 } } },
      { at: 245, msg: '', unit: { type: 'gaul_elite', men: 215, x: 1560, y: 820, ai: { kind: 'rush', delay: 0 } } }
    ],
    // The day was fought in three stages with no rest between them: losses carry from one into the next.
    phases: [
      {
        phaseName: 'The Assault on the Hill', posture: 'defend',
        briefing: 'The Helvetii come up the slope at your three lines in a dense mass. Break them with pila from the high ground, then the sword.',
        objective: 'Break the assault (below 25%). Stay on the hill: uphill charges are weak.',
        timeLimit: 600, deploy: { mode: 'line', cx: 800, cy: 790 }, objectives: [], rule: null,
        terrain: [{ kind: 'hill', cx: 800, cy: 260, rx: 520, ry: 190, h: 60 }, { kind: 'hill', cx: 800, cy: 790, rx: 440, ry: 130, h: 40 }, { kind: 'forest', cx: 160, cy: 470, rx: 180, ry: 140 }, { kind: 'forest', cx: 1460, cy: 480, rx: 150, ry: 130 }, { kind: 'water', x: 0, y: 620, w: 330, h: 50 }],
        enemy: [
          { type: 'warband', men: 350, x: 520, y: 300, ai: { kind: 'rush', delay: 0 } }, { type: 'warband', men: 350, x: 680, y: 280, ai: { kind: 'rush', delay: 2 } },
          { type: 'warband', men: 350, x: 920, y: 280, ai: { kind: 'rush', delay: 1 } }, { type: 'warband', men: 350, x: 1080, y: 300, ai: { kind: 'rush', delay: 3 } },
          { type: 'gaul_skirm', men: 150, x: 640, y: 380, ai: { kind: 'skirm' } }, { type: 'gaul_skirm', men: 150, x: 960, y: 380, ai: { kind: 'skirm' } },
          { type: 'gaul_cav', men: 80, x: 1350, y: 330, ai: { kind: 'flank', delay: 60 } }
        ],
        reinforcements: []
      },
      {
        phaseName: 'The Boii and the Tulingi', posture: 'ambush',
        briefing: 'You follow the Helvetii towards a ridge, and the Boii and Tulingi fall on your right and rear. Turn your third line to face them.',
        objective: 'Hold the ridge (gold marker) 150 s, or break the host. Keep a reserve for your right and rear.',
        timeLimit: 780, deploy: { mode: 'line', cx: 780, cy: 860 },
        objectives: [{ id: 'ridge', name: 'The Ridge', x: 800, y: 420, r: 110, owner: 'gaul' }], rule: { holdSecs: 150, attacker: 'rome' },
        terrain: [{ kind: 'hill', cx: 800, cy: 260, rx: 520, ry: 190, h: 60 }, { kind: 'hill', cx: 800, cy: 760, rx: 420, ry: 110, h: 30 }, { kind: 'forest', cx: 160, cy: 470, rx: 180, ry: 140 }, { kind: 'forest', cx: 1460, cy: 480, rx: 150, ry: 130 }, { kind: 'water', x: 0, y: 620, w: 330, h: 50 }],
        enemy: [
          { type: 'warband', men: 330, x: 640, y: 250, ai: { kind: 'ambush', trigger: 120, maxDelay: 70, quiet: true } }, { type: 'warband', men: 330, x: 960, y: 250, ai: { kind: 'ambush', trigger: 120, maxDelay: 70, quiet: true } },
          { type: 'gaul_elite', men: 300, x: 800, y: 290, ai: { kind: 'ambush', trigger: 100, maxDelay: 75, quiet: true } }, { type: 'gaul_skirm', men: 140, x: 800, y: 350, ai: { kind: 'skirm' } }
        ],
        reinforcements: [
          { at: 70, msg: 'The Boii and Tulingi appear on your flank and rear!', unit: { type: 'warband', men: 405, x: 1500, y: 700, ai: { kind: 'rush', delay: 0 } } },
          { at: 74, msg: '', unit: { type: 'warband', men: 300, x: 1540, y: 560, ai: { kind: 'rush', delay: 0 } } },
          { at: 78, msg: '', unit: { type: 'gaul_elite', men: 215, x: 1560, y: 820, ai: { kind: 'rush', delay: 0 } } }
        ]
      },
      {
        phaseName: 'The Fight at the Wagons', posture: 'assault',
        briefing: 'Evening. The Helvetii make a rampart of their wagons and fight from it. Take the camp and the war is over.',
        objective: 'Hold the wagon camp (gold marker) 120 s, or break the defenders before nightfall.',
        timeLimit: 540, deploy: { mode: 'line', cx: 800, cy: 890 },
        objectives: [{ id: 'wagons', name: 'The Wagon Camp', x: 800, y: 300, r: 105, owner: 'gaul' }], rule: { holdSecs: 120, attacker: 'rome' },
        terrain: [{ kind: 'hill', cx: 800, cy: 300, rx: 300, ry: 110, h: 20 }, { kind: 'forest', cx: 220, cy: 420, rx: 190, ry: 140 }, { kind: 'forest', cx: 1400, cy: 460, rx: 180, ry: 150 }],
        enemy: [
          { type: 'laager', men: 170, x: 600, y: 330, ai: { kind: 'idle' } }, { type: 'laager', men: 170, x: 800, y: 350, ai: { kind: 'idle' } }, { type: 'laager', men: 170, x: 1000, y: 330, ai: { kind: 'idle' } }, { type: 'laager', men: 150, x: 800, y: 210, ai: { kind: 'idle' } },
          { type: 'warband', men: 320, x: 660, y: 270, ai: { kind: 'ambush', trigger: 110, maxDelay: 120, quiet: true } }, { type: 'warband', men: 320, x: 940, y: 270, ai: { kind: 'ambush', trigger: 110, maxDelay: 120, quiet: true } },
          { type: 'gaul_skirm', men: 150, x: 700, y: 390, ai: { kind: 'skirm' } }, { type: 'gaul_skirm', men: 150, x: 900, y: 390, ai: { kind: 'skirm' } }
        ],
        reinforcements: []
      }
    ],
    rewards: { gold: 700, supplies: 400, recruits: 200, xpBase: 80, officerXp: 90 }, rewardMult: 1,
    unlock: [
      { type: 'legionary', name: 'VI Cohort', men: 420, maxMen: 480, xp: 60, drill: 30, msg: 'Survivors and volunteers form the VI Cohort.' },
      { type: 'legionary', name: 'VII Cohort', men: 420, maxMen: 480, xp: 60, drill: 30, msg: 'The VII Cohort is raised from the veterans of the Helvetian war.' }
    ]
  },
  // ======================= ACT II: Ariovistus and the Suebi (Germania, 58 BC) =======================
  // Fewer fortified places and more movement: Germanic horse mixed with runners, warbands in tribal blocks, and wagon laagers that nobody flees past.
  {
    boost: 1.25, id: 'parley', odds: 0.7, posture: 'defend', chief: { name: "Ariovistus' horsemen", style: 'aggressive' }, optional: true, fog: true, act: 'II', theater: 'Germania', year: '58 BC', name: 'The Parley on the Mound', kind: 'skirmish',
    geo: { lat: 47.62, lon: 7.28, place: 'The Upper Rhine plain (Alsace)', note: 'The mound where Caesar and Ariovistus met; the exact site is not known' },
    briefing: 'The parley with Ariovistus breaks down as his riders attack your mounted escort. Take the mound and hold it until the army comes up.',
    objective: 'Hold the mound (gold marker) 110 s, or break the riders. Watch your flanks: they are fast.',
    timeLimit: 540, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 840 },
    objectives: [{ id: 'mound', name: 'The Mound', x: 800, y: 540, r: 85, owner: 'rome' }],
    rule: { holdSecs: 110, attacker: 'gaul' },
    terrain: [{ kind: 'hill', cx: 800, cy: 530, rx: 150, ry: 75, h: 40 }, { kind: 'forest', cx: 230, cy: 330, rx: 210, ry: 120 }, { kind: 'forest', cx: 1400, cy: 300, rx: 190, ry: 110 }],
    enemy: [
      { type: 'german_cav', men: 210, x: 520, y: 260, ai: { kind: 'raid', obj: 'mound', delay: 0 } },
      { type: 'german_cav', men: 210, x: 1080, y: 250, ai: { kind: 'raid', obj: 'mound', delay: 6 } },
      { type: 'german_cav', men: 160, x: 820, y: 180, ai: { kind: 'flank', delay: 25 } },
      { type: 'suebi', men: 330, x: 640, y: 220, ai: { kind: 'ambush', trigger: 200, maxDelay: 110, quiet: true } },
      { type: 'suebi', men: 330, x: 980, y: 210, ai: { kind: 'ambush', trigger: 200, maxDelay: 120, quiet: true } }
    ],
    reinforcements: [],
    rewards: { gold: 480, supplies: 220, recruits: 90, xpBase: 62, officerXp: 60 }, rewardMult: 1,
    unlock: []
  },
  {
    boost: 1.15, id: 'supply', posture: 'defend', chief: { name: "Ariovistus", style: 'cunning' }, fog: true, act: 'II', theater: 'Germania', year: '58 BC', name: 'The Cut Supply Line', kind: 'skirmish',
    geo: { lat: 47.55, lon: 6.80, place: 'The gap between the Vosges and the Jura', note: 'The road from the Sequani; the exact place is illustrative' },
    briefing: 'German horse are cutting your grain road. A wagon column is coming up with a thin escort. Hold it.',
    objective: 'Keep the wagons (gold marker). If the Germans hold them 100 s, the grain is lost. Break the raiders to win.',
    timeLimit: 480, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 760 },
    objectives: [{ id: 'wagons', name: 'Supply Wagons', x: 800, y: 700, r: 75, owner: 'rome' }],
    rule: { holdSecs: 100, attacker: 'gaul' },
    terrain: [{ kind: 'forest', cx: 250, cy: 480, rx: 240, ry: 210 }, { kind: 'forest', cx: 1360, cy: 470, rx: 250, ry: 220 }, { kind: 'hill', cx: 800, cy: 310, rx: 170, ry: 80 }, { kind: 'forest', cx: 800, cy: 100, rx: 230, ry: 85 }],
    enemy: [
      { type: 'german_cav', men: 220, x: 430, y: 420, ai: { kind: 'raid', obj: 'wagons' } },
      { type: 'german_cav', men: 220, x: 1180, y: 400, ai: { kind: 'raid', obj: 'wagons', delay: 8 } },
      { type: 'german_cav', men: 150, x: 800, y: 260, ai: { kind: 'raid', obj: 'wagons', delay: 14 } },
      { type: 'suebi', men: 380, x: 320, y: 420, ai: { kind: 'raid', obj: 'wagons', delay: 5 } },
      { type: 'suebi', men: 380, x: 1280, y: 410, ai: { kind: 'raid', obj: 'wagons', delay: 10 } },
      { type: 'suebi', men: 300, x: 700, y: 300, ai: { kind: 'ambush', trigger: 200, maxDelay: 110 } }
    ],
    reinforcements: [{ at: 110, msg: 'More German horse come thundering out of the northern woods!', unit: { type: 'german_cav', men: 190, x: 800, y: 60, ai: { kind: 'raid', obj: 'wagons' } } }],
    rewards: { gold: 400, supplies: 420, recruits: 90, xpBase: 66, officerXp: 62 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'VIII Cohort', men: 400, maxMen: 480, xp: 50, drill: 25, msg: 'The VIII Cohort marches up with the grain train.' }]
  },
  {
    boost: 1.3, id: 'lessercamp', posture: 'attack', chief: { name: "the camp's elders", style: 'stubborn' }, optional: true, fog: true, act: 'II', theater: 'Germania', year: '58 BC', name: 'The Lesser Camp', kind: 'skirmish',
    geo: { lat: 47.78, lon: 7.05, place: 'The Upper Rhine plain (Alsace)', note: 'The smaller German camp Caesar attacked; the place is approximate' },
    briefing: 'Ariovistus will not fight, so you assault his smaller wagon camp to draw him out. Warbands wait in the brush, horse on the flanks.',
    objective: 'Hold the camp (gold marker) 100 s, or break the host. Men with wagons at their backs will not run.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    objectives: [{ id: 'camp', name: 'The Lesser Camp', x: 800, y: 290, r: 105, owner: 'gaul' }],
    rule: { holdSecs: 100, attacker: 'rome' },
    terrain: [{ kind: 'forest', cx: 230, cy: 560, rx: 200, ry: 150 }, { kind: 'forest', cx: 1380, cy: 540, rx: 210, ry: 150 }, { kind: 'hill', cx: 800, cy: 640, rx: 220, ry: 60, h: 25 }],
    enemy: [
      { type: 'laager', men: 190, x: 640, y: 250, ai: { kind: 'idle' } },
      { type: 'laager', men: 190, x: 960, y: 250, ai: { kind: 'idle' } },
      { type: 'laager', men: 190, x: 800, y: 180, ai: { kind: 'idle' } },
      { type: 'suebi', men: 420, x: 560, y: 330, ai: { kind: 'ambush', trigger: 130, maxDelay: 100, quiet: true } },
      { type: 'suebi', men: 420, x: 800, y: 340, ai: { kind: 'ambush', trigger: 120, maxDelay: 90, quiet: true } },
      { type: 'suebi', men: 420, x: 1040, y: 330, ai: { kind: 'ambush', trigger: 130, maxDelay: 100, quiet: true } },
      { type: 'german_cav', men: 180, x: 1330, y: 440, ai: { kind: 'flank', delay: 50 } },
      { type: 'german_cav', men: 150, x: 270, y: 450, ai: { kind: 'flank', delay: 70 } },
      { type: 'gaul_skirm', men: 120, x: 700, y: 380, ai: { kind: 'skirm' } }
    ],
    reinforcements: [],
    rewards: { gold: 620, supplies: 300, recruits: 120, xpBase: 74, officerXp: 70 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'IX Cohort', men: 400, maxMen: 480, xp: 55, drill: 25, msg: 'The IX Cohort is drawn from the camp guards.' }]
  },
  {
    boost: 1.45, id: 'ariovistus', posture: 'attack', chief: { name: "Ariovistus", style: 'cunning' }, act: 'II', theater: 'Germania', year: '58 BC', name: 'The Battle Against Ariovistus', kind: 'named',
    geo: { lat: 47.90, lon: 7.33, place: 'The Upper Rhine plain (Alsace)', note: 'Battlefield not securely identified; the plain between the Vosges and the Rhine' },
    briefing: 'Ariovistus draws up his tribes with wagons behind them so no one can flee. You lead the right, where they are weakest. Crassus holds the cavalry and the third line.',
    objective: 'Break the German host. Your left will be pressed: the third line relieves it. A withdrawal is only a draw.',
    links: [
      { from: 'supply', scale: { german_cav: 0.6 }, text: 'The German horse were mauled on the supply road: fewer riders are on his wings.' },
      { from: 'lessercamp', scale: { laager: 0.6 }, text: 'The lesser camp is taken: fewer wagons stand behind his line.' },
      { from: 'parley', morale: 3, text: 'The men saw the Germans driven off the mound and do not fear them (+3 morale).' }
    ],
    timeLimit: 960, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    objectives: [], rule: null,
    terrain: [{ kind: 'hill', cx: 1240, cy: 520, rx: 220, ry: 90, h: 25 }, { kind: 'forest', cx: 170, cy: 560, rx: 190, ry: 150 }, { kind: 'forest', cx: 1480, cy: 330, rx: 150, ry: 110 }, { kind: 'forest', cx: 560, cy: 120, rx: 200, ry: 70 }],
    enemy: [
      { type: 'suebi', men: 360, x: 380, y: 330, ai: { kind: 'rush', delay: 0 } },
      { type: 'suebi', men: 360, x: 520, y: 320, ai: { kind: 'rush', delay: 1 } },
      { type: 'suebi', men: 360, x: 660, y: 310, ai: { kind: 'rush', delay: 2 } },
      { type: 'suebi', men: 360, x: 800, y: 305, ai: { kind: 'rush', delay: 1 } },
      { type: 'suebi', men: 360, x: 940, y: 310, ai: { kind: 'rush', delay: 2 } },
      { type: 'suebi', men: 360, x: 1080, y: 320, ai: { kind: 'rush', delay: 1 } },
      { type: 'suebi', men: 360, x: 1220, y: 330, ai: { kind: 'rush', delay: 3 } },
      { type: 'suebi', men: 280, x: 800, y: 250, ai: { kind: 'rush', delay: 0, reserve: true } },
      { type: 'laager', men: 170, x: 380, y: 170, ai: { kind: 'idle' } },
      { type: 'laager', men: 170, x: 620, y: 150, ai: { kind: 'idle' } },
      { type: 'laager', men: 170, x: 860, y: 140, ai: { kind: 'idle' } },
      { type: 'laager', men: 170, x: 1100, y: 150, ai: { kind: 'idle' } },
      { type: 'laager', men: 170, x: 1300, y: 180, ai: { kind: 'idle' } },
      { type: 'german_cav', men: 190, x: 220, y: 380, ai: { kind: 'flank', delay: 30 } },
      { type: 'german_cav', men: 190, x: 1400, y: 400, ai: { kind: 'flank', delay: 40 } },
      { type: 'gaul_skirm', men: 130, x: 620, y: 400, ai: { kind: 'skirm' } },
      { type: 'gaul_skirm', men: 130, x: 980, y: 400, ai: { kind: 'skirm' } }
    ],
    reinforcements: [
      { at: 300, side: 'rome', msg: 'Young Publius Crassus has seen your left wing hard pressed: he sends the third line to its aid!', unit: { type: 'legionary', men: 420, x: 420, y: 1010, f: -1.5708, name: 'Third Line' } }
    ],
    rewards: { gold: 1100, supplies: 600, recruits: 300, xpBase: 110, officerXp: 120 }, rewardMult: 1,
    unlock: [
      { type: 'legionary', name: 'X Cohort', men: 440, maxMen: 480, xp: 80, drill: 30, msg: 'The Tenth sends a cohort to the army that beat Ariovistus.' }
    ]
  },
  {
    boost: 1.35, id: 'rhine', posture: 'pursuit', chief: { name: "the rearguard chiefs", style: 'cautious' }, fog: true, act: 'II', theater: 'Germania', year: '58 BC', name: 'The Pursuit to the Rhine', kind: 'skirmish',
    geo: { lat: 47.95, lon: 7.58, place: 'The left bank of the Rhine', note: 'The pursuit ran towards the Rhine; the point is illustrative' },
    briefing: 'The Germans are running for the Rhine. Catch the rearguard before it reaches the water. Cornered men fight hard.',
    objective: 'Break the rearguard (below 25%) before time runs out. Fresh cavalry are deadly against runners.',
    timeLimit: 420, daysToPrepare: 2,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    terrain: [{ kind: 'water', x: 0, y: 110, w: 1600, h: 90 }, { kind: 'forest', cx: 240, cy: 540, rx: 220, ry: 150 }, { kind: 'forest', cx: 1380, cy: 600, rx: 220, ry: 160 }],
    enemy: [
      { type: 'laager', men: 160, x: 560, y: 330, ai: { kind: 'idle' } },
      { type: 'laager', men: 160, x: 860, y: 320, ai: { kind: 'idle' } },
      { type: 'laager', men: 160, x: 1120, y: 340, ai: { kind: 'idle' } },
      { type: 'suebi', men: 400, x: 480, y: 420, ai: { kind: 'ambush', trigger: 160, maxDelay: 90, quiet: true } },
      { type: 'suebi', men: 400, x: 720, y: 430, ai: { kind: 'ambush', trigger: 150, maxDelay: 80, quiet: true } },
      { type: 'suebi', men: 400, x: 980, y: 430, ai: { kind: 'ambush', trigger: 160, maxDelay: 90, quiet: true } },
      { type: 'suebi', men: 300, x: 1220, y: 410, ai: { kind: 'ambush', trigger: 170, maxDelay: 100, quiet: true } },
      { type: 'german_cav', men: 170, x: 300, y: 380, ai: { kind: 'flank', delay: 40 } },
      { type: 'gaul_skirm', men: 110, x: 840, y: 480, ai: { kind: 'skirm' } }
    ],
    reinforcements: [],
    rewards: { gold: 800, supplies: 320, recruits: 160, xpBase: 76, officerXp: 76 }, rewardMult: 1,
    unlock: []
  },
  // ======================= SIDE ACT: Britannia (55-54 BC), optional =======================
  // Caesar's two expeditions across the Ocean (Gallic War IV.20-36, V.1-23). Chosen or passed by as a whole on reaching it on the map.
  {
    id: 'landing', posture: 'assault', odds: 0.85, chief: { name: 'the Cantii', style: 'aggressive' }, act: 'B', theater: 'Britannia', year: '55 BC', name: 'The Landing in Britain', kind: 'skirmish',
    geo: { lat: 51.22, lon: 1.40, place: 'The shingle beach near Deal, Kent', note: 'Caesar landed on an open beach some miles from the cliffs of Dover (Gallic War IV.23-26); site probable, not certain' },
    briefing: 'The legions must wade ashore in armour against chariots in the surf. Then the eagle-bearer of the Tenth jumps: \'Jump, soldiers!\'',
    objective: 'Hold the beach (gold marker) 90 s, or break the Britons. You start in the water: get into line on dry ground.',
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    objectives: [{ id: 'beach', name: 'The Beach', x: 800, y: 700, r: 90, owner: 'gaul' }],
    rule: { holdSecs: 90, attacker: 'rome' },
    terrain: [{ kind: 'ford', x: 0, y: 830, w: 1600, h: 170 }, { kind: 'hill', cx: 800, cy: 260, rx: 520, ry: 110, h: 35 }, { kind: 'forest', cx: 220, cy: 300, rx: 200, ry: 120 }],
    enemy: [
      { type: 'brit_chariot', men: 120, x: 450, y: 600, ai: { kind: 'numidian' } },
      { type: 'brit_chariot', men: 120, x: 1150, y: 600, ai: { kind: 'numidian', delay: 4 } },
      { type: 'britons', men: 420, x: 640, y: 560, ai: { kind: 'rush', delay: 20 } },
      { type: 'britons', men: 420, x: 960, y: 560, ai: { kind: 'rush', delay: 22 } },
      { type: 'brit_cav', men: 120, x: 1350, y: 620, ai: { kind: 'flank', delay: 30 } }
    ],
    reinforcements: [],
    rewards: { gold: 560, supplies: 300, recruits: 150, xpBase: 78, officerXp: 78 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'seventh', posture: 'ambush', chief: { name: 'the Cantii', style: 'cunning' }, fog: true, act: 'B', theater: 'Britannia', year: '55 BC', name: 'The Seventh at the Harvest', kind: 'skirmish',
    geo: { lat: 51.18, lon: 1.25, place: 'Cornfields in Kent', note: 'The Seventh Legion was ambushed while reaping (Gallic War IV.32-34); site illustrative' },
    briefing: 'The Seventh is out reaping, arms stacked, when the Britons strike from the woods. Hold together until Caesar comes.',
    objective: 'Survive: break the Britons, or keep 45% of your army until time runs out.',
    timeLimit: 480, daysToPrepare: 3,
    deploy: { mode: 'grid', cx: 800, cy: 560, cols: 3, dx: 110, dy: 80 },
    terrain: [{ kind: 'forest', cx: 250, cy: 450, rx: 260, ry: 330 }, { kind: 'forest', cx: 1350, cy: 450, rx: 260, ry: 330 }, { kind: 'forest', cx: 800, cy: 90, rx: 380, ry: 100 }],
    enemy: [
      { type: 'brit_chariot', men: 110, x: 420, y: 420, ai: { kind: 'numidian' } },
      { type: 'brit_chariot', men: 110, x: 1180, y: 420, ai: { kind: 'numidian', delay: 3 } },
      { type: 'brit_chariot', men: 100, x: 800, y: 230, ai: { kind: 'numidian', delay: 6 } },
      { type: 'britons', men: 380, x: 500, y: 300, ai: { kind: 'ambush', trigger: 380, maxDelay: 20, quiet: true } },
      { type: 'britons', men: 380, x: 1100, y: 300, ai: { kind: 'ambush', trigger: 380, maxDelay: 25, quiet: true } },
      { type: 'brit_cav', men: 110, x: 1300, y: 760, ai: { kind: 'flank', delay: 30 } }
    ],
    reinforcements: [
      { at: 150, side: 'rome', msg: 'Caesar comes up at the double with the cohorts that were on guard. The Britons pause.', unit: { type: 'legionary', men: 420, x: 800, y: 1010, f: -1.5708, name: 'Guard Cohorts', xp: 300 } }
    ],
    rewards: { gold: 480, supplies: 360, recruits: 130, xpBase: 72, officerXp: 72 }, rewardMult: 1.3,
    unlock: []
  },
  {
    id: 'bigbury', posture: 'assault', optional: true, chief: { name: 'the Cantii', style: 'stubborn' }, fog: true, act: 'B', theater: 'Britannia', year: '54 BC', name: 'The Hillfort in the Woods', kind: 'skirmish',
    geo: { lat: 51.27, lon: 1.03, place: 'Bigbury hillfort, near the Stour', note: "The Seventh took a fort in the woods by testudo and a ramp (Gallic War V.9); usually identified with Bigbury" },
    briefing: 'The Britons hold a fort in the woods, its gates blocked with felled trees. Go up under locked shields and storm it.',
    objective: 'Hold the fort (gold marker) 100 s, or break the defenders. Testudo (T) blunts the missiles. Optional fight.',
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    objectives: [{ id: 'fort', name: 'The Hillfort', x: 800, y: 300, r: 95, owner: 'gaul' }],
    rule: { holdSecs: 100, attacker: 'rome' },
    terrain: [{ kind: 'hill', cx: 800, cy: 300, rx: 360, ry: 170, h: 50 }, { kind: 'forest', cx: 300, cy: 520, rx: 260, ry: 220 }, { kind: 'forest', cx: 1300, cy: 520, rx: 260, ry: 220 }],
    enemy: [
      { type: 'britons', men: 400, x: 680, y: 300, ai: { kind: 'ambush', trigger: 150, maxDelay: 130 } },
      { type: 'britons', men: 400, x: 920, y: 300, ai: { kind: 'ambush', trigger: 150, maxDelay: 130 } },
      { type: 'gaul_skirm', men: 200, x: 800, y: 380, ai: { kind: 'skirm' } },
      { type: 'brit_chariot', men: 100, x: 1350, y: 420, ai: { kind: 'numidian', delay: 30 } }
    ],
    reinforcements: [],
    rewards: { gold: 480, supplies: 320, recruits: 120, xpBase: 72, officerXp: 72 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'cassivellaunus', posture: 'assault', chief: { name: 'Cassivellaunus', style: 'cunning' }, fog: true, act: 'B', theater: 'Britannia', year: '54 BC', name: 'The Stronghold of Cassivellaunus', kind: 'named',
    geo: { lat: 51.80, lon: -0.30, place: 'North of the Thames', note: "Caesar forced the Thames and took Cassivellaunus' stronghold among woods and marshes (Gallic War V.18-21); the site is uncertain" },
    briefing: 'Force the staked ford of the Thames and storm Cassivellaunus\' stronghold in the marsh. Take it, and the tribes will sue for peace.',
    objective: 'Hold the stronghold (gold marker) 110 s, or break his army. The staked ford is slow to cross.',
    links: [
      { from: 'seventh', morale: 3, text: 'The Seventh has not forgotten the harvest field (+3 morale).' },
      { from: 'bigbury', scale: { britons: 0.85 }, text: 'The hillfort in the woods fell: fewer warriors stand with Cassivellaunus.' }
    ],
    timeLimit: 720, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    objectives: [{ id: 'oppidum', name: 'The Stronghold', x: 800, y: 210, r: 100, owner: 'gaul' }],
    rule: { holdSecs: 110, attacker: 'rome' },
    terrain: [{ kind: 'ford', x: 0, y: 700, w: 1600, h: 70 }, { kind: 'forest', cx: 300, cy: 300, rx: 280, ry: 220 }, { kind: 'forest', cx: 1300, cy: 300, rx: 280, ry: 220 }, { kind: 'hill', cx: 800, cy: 210, rx: 260, ry: 110, h: 30 }],
    enemy: [
      { type: 'britons', men: 420, x: 600, y: 560, ai: { kind: 'rush', delay: 15 } },
      { type: 'britons', men: 420, x: 1000, y: 560, ai: { kind: 'rush', delay: 15 } },
      { type: 'britons', men: 400, x: 800, y: 240, ai: { kind: 'ambush', trigger: 180, maxDelay: 240 } },
      { type: 'brit_chariot', men: 120, x: 350, y: 520, ai: { kind: 'numidian', delay: 5 } },
      { type: 'brit_chariot', men: 120, x: 1250, y: 520, ai: { kind: 'numidian', delay: 8 } },
      { type: 'brit_chariot', men: 100, x: 800, y: 420, ai: { kind: 'numidian', delay: 30 } },
      { type: 'brit_cav', men: 120, x: 1400, y: 300, ai: { kind: 'flank', delay: 60 } }
    ],
    reinforcements: [],
    rewards: { gold: 900, supplies: 460, recruits: 240, xpBase: 100, officerXp: 105 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'Cohors Britannica', men: 420, maxMen: 480, xp: 140, drill: 35, msg: 'Veterans of both crossings of the Ocean form a new cohort.' }]
  },
  // ======================= ACT III: Africa, the old lands of Carthage (49 BC) =======================
  // Caesar's legate Gaius Scribonius Curio crosses from Sicily to take Africa from the Pompeian Attius Varus and his ally, King Juba I of
  // Numidia (Caesar, Civil War II.23-44). Open, hot country; nearly every enemy is on a horse.
  {
    id: 'anquillaria', odds: 0.85, posture: 'defend', chief: { name: "Varus' Numidian horse", style: 'cunning' }, fog: true, act: 'III', theater: 'Africa', year: '49 BC', name: 'The Landing at Anquillaria', kind: 'skirmish',
    geo: { lat: 36.93, lon: 11.03, place: 'Anquillaria, on the Cape Bon peninsula', note: 'Curio landed here (Civil War II.23); the exact beach is not known' },
    briefing: 'You are landing at Anquillaria and the horses are still on the ships. Numidian riders are closing from every side. Hold the beach.',
    objective: 'Don\'t let them hold the beach (gold marker) 100 s. Break the raiders to win. Missiles and a steady line beat Numidians; chasing does not.',
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 780 },
    objectives: [{ id: 'beach', name: 'The Landing Beach', x: 800, y: 860, r: 85, owner: 'rome' }],
    rule: { holdSecs: 100, attacker: 'gaul' },
    terrain: [{ kind: 'water', x: 0, y: 940, w: 1600, h: 60 }, { kind: 'hill', cx: 1250, cy: 420, rx: 200, ry: 90, h: 25 }, { kind: 'hill', cx: 330, cy: 380, rx: 180, ry: 80, h: 20 }],
    enemy: [
      { type: 'numid_cav', men: 160, x: 300, y: 420, ai: { kind: 'numidian' } },
      { type: 'numid_cav', men: 160, x: 1300, y: 400, ai: { kind: 'numidian', delay: 6 } },
      { type: 'numid_cav', men: 140, x: 800, y: 220, ai: { kind: 'numidian', delay: 12 } },
      { type: 'numid_inf', men: 380, x: 640, y: 200, ai: { kind: 'raid', obj: 'beach', delay: 25 } },
      { type: 'numid_inf', men: 380, x: 960, y: 210, ai: { kind: 'raid', obj: 'beach', delay: 30 } }
    ],
    reinforcements: [],
    rewards: { gold: 520, supplies: 380, recruits: 120, xpBase: 70, officerXp: 70 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'castra', odds: 0.9, posture: 'defend', chief: { name: "Varus' foragers", style: 'cautious' }, optional: true, fog: true, act: 'III', theater: 'Africa', year: '49 BC', name: 'Castra Cornelia', kind: 'skirmish',
    geo: { lat: 37.14, lon: 10.12, place: 'Castra Cornelia, the ridge north of Utica', note: "Scipio's camp of 204 BC, from the wars against Carthage (Civil War II.24); site approximate" },
    briefing: 'Hold the ridge of Castra Cornelia, Scipio\'s old camp, while the legions re-cut its ditch.',
    objective: 'Don\'t let them hold the crest (gold marker) 110 s. Break them to win. Optional: a win gives you a safe base.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 620 },
    objectives: [{ id: 'crest', name: "Scipio's Ridge", x: 800, y: 520, r: 90, owner: 'rome' }],
    rule: { holdSecs: 110, attacker: 'gaul' },
    terrain: [{ kind: 'hill', cx: 800, cy: 520, rx: 420, ry: 110, h: 45 }, { kind: 'water', x: 1480, y: 0, w: 120, h: 1000 }],
    enemy: [
      { type: 'numid_inf', men: 340, x: 520, y: 200, ai: { kind: 'raid', obj: 'crest', delay: 10 } },
      { type: 'numid_inf', men: 340, x: 1000, y: 190, ai: { kind: 'raid', obj: 'crest', delay: 14 } },
      { type: 'numid_cav', men: 150, x: 260, y: 300, ai: { kind: 'numidian' } },
      { type: 'numid_cav', men: 150, x: 1300, y: 260, ai: { kind: 'numidian', delay: 8 } },
      { type: 'pompeian', men: 300, x: 780, y: 140, ai: { kind: 'rush', delay: 40 } }
    ],
    reinforcements: [],
    rewards: { gold: 420, supplies: 300, recruits: 90, xpBase: 64, officerXp: 64 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'utica', odds: 0.9, posture: 'attack', chief: { name: 'Publius Attius Varus', style: 'stubborn' }, fog: true, act: 'III', theater: 'Africa', year: '49 BC', name: 'The Walls of Utica', kind: 'skirmish',
    geo: { lat: 37.05, lon: 10.06, place: 'Before Utica', note: 'Curio beat Varus in the valley before the town (Civil War II.34-35)' },
    briefing: 'Varus waits before Utica beyond a steep valley, with Juba\'s Numidians on his wings. For the first time you face Romans. Many of his men were pardoned by Caesar once.',
    objective: 'Break Varus\' army (below 25%). His legions fight like yours; his horse will go round you.',
    timeLimit: 720, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 860 },
    terrain: [{ kind: 'hill', cx: 800, cy: 280, rx: 560, ry: 150, h: 30 }, { kind: 'hill', cx: 800, cy: 820, rx: 520, ry: 130, h: 26 }],   // a steep valley between the two lines
    enemy: [
      { type: 'pompeian', men: 420, x: 560, y: 330, ai: { kind: 'rush', delay: 5 } },
      { type: 'pompeian', men: 420, x: 800, y: 320, ai: { kind: 'rush', delay: 5 } },
      { type: 'pompeian', men: 420, x: 1040, y: 330, ai: { kind: 'rush', delay: 5 } },
      { type: 'pompeian', men: 360, x: 800, y: 220, ai: { kind: 'rush', delay: 30, reserve: true } },
      { type: 'numid_inf', men: 300, x: 380, y: 360, ai: { kind: 'rush', delay: 10 } },
      { type: 'numid_cav', men: 140, x: 220, y: 380, ai: { kind: 'numidian', delay: 15 } },
      { type: 'numid_cav', men: 140, x: 1380, y: 380, ai: { kind: 'numidian', delay: 20 } }
    ],
    reinforcements: [],
    rewards: { gold: 640, supplies: 360, recruits: 140, xpBase: 76, officerXp: 76 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'XI Cohort', men: 400, maxMen: 480, xp: 70, drill: 30, msg: "Men of Varus' legions who served at Corfinium come over to you: they form the XI Cohort." }]
  },
  {
    id: 'water', posture: 'defend', chief: { name: "Juba's raiders", style: 'cunning' }, fog: true, act: 'III', theater: 'Africa', year: '49 BC', name: 'Water and Forage', kind: 'skirmish',
    geo: { lat: 36.97, lon: 9.93, place: 'The plain of the Bagradas below Utica', note: 'Illustrative: the army had to fetch water and forage under Numidian raids' },
    briefing: 'Numidians ride at every water party outside Utica. Hold the carts at the wells, and break the raiders when they close.',
    objective: 'Keep the water carts (gold marker). If the enemy holds them 100 s, the army goes thirsty. Break the raiders to win.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 760 },
    objectives: [{ id: 'wells', name: 'The Wells', x: 800, y: 680, r: 80, owner: 'rome' }],
    rule: { holdSecs: 100, attacker: 'gaul' },
    terrain: [{ kind: 'hill', cx: 380, cy: 300, rx: 200, ry: 90, h: 20 }, { kind: 'hill', cx: 1220, cy: 320, rx: 200, ry: 90, h: 20 }],
    enemy: [
      { type: 'numid_cav', men: 170, x: 250, y: 480, ai: { kind: 'numidian' } },
      { type: 'numid_cav', men: 170, x: 1350, y: 470, ai: { kind: 'numidian', delay: 5 } },
      { type: 'numid_cav', men: 150, x: 800, y: 200, ai: { kind: 'numidian', delay: 10 } },
      { type: 'numid_cav', men: 150, x: 500, y: 240, ai: { kind: 'numidian', delay: 20 } },
      { type: 'numid_inf', men: 360, x: 1100, y: 220, ai: { kind: 'raid', obj: 'wells', delay: 45 } },
      { type: 'numid_inf', men: 300, x: 600, y: 180, ai: { kind: 'raid', obj: 'wells', delay: 60 } }
    ],
    reinforcements: [],
    rewards: { gold: 460, supplies: 460, recruits: 100, xpBase: 70, officerXp: 70 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'bagradas', odds: 0.9, posture: 'ambush', chief: { name: 'Saburra, general of King Juba', style: 'cunning' }, fog: true, act: 'III', theater: 'Africa', year: '49 BC', name: 'The Bagradas', kind: 'named',
    geo: { lat: 36.84, lon: 9.78, place: 'The plain of the Bagradas (Medjerda)', note: 'Curio was destroyed here (Civil War II.38-42); the exact field is not known' },
    briefing: 'You march at night to catch a small force on the Bagradas. It is a trap: Juba\'s whole army waits behind the hills. Curio died here. Keep the army together until dark.',
    objective: 'Survive: break the host, or keep 45% of your army until nightfall. A draw here pays well.',
    links: [
      { from: 'castra', morale: 4, text: "Scipio's camp is held behind you: the men know where to fall back to (+4 morale)." },
      { from: 'utica', scale: { numid_inf: 0.75 }, text: "Varus' beaten legions are shut up in Utica: fewer foot march with Juba." },
      { from: 'water', scale: { numid_cav: 0.85 }, text: 'The raiders at the wells were cut up: Juba has fewer horsemen.' }
    ],
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'grid', cx: 800, cy: 640, cols: 4, dx: 110, dy: 80 },
    terrain: [{ kind: 'hill', cx: 250, cy: 420, rx: 230, ry: 160, h: 35 }, { kind: 'hill', cx: 1350, cy: 420, rx: 230, ry: 160, h: 35 }, { kind: 'hill', cx: 800, cy: 120, rx: 360, ry: 90, h: 30 }, { kind: 'hill', cx: 800, cy: 880, rx: 160, ry: 60, h: 22 }],
    enemy: [
      { type: 'numid_cav', men: 140, x: 800, y: 380, ai: { kind: 'numidian' } },
      { type: 'numid_inf', men: 260, x: 800, y: 300, ai: { kind: 'skirm' } },
      { type: 'numid_cav', men: 220, x: 260, y: 420, ai: { kind: 'ambush', trigger: 380, maxDelay: 30, quiet: true } },
      { type: 'numid_cav', men: 220, x: 1340, y: 420, ai: { kind: 'ambush', trigger: 380, maxDelay: 35, quiet: true } },
      { type: 'numid_cav', men: 180, x: 260, y: 700, ai: { kind: 'flank', delay: 60 } },
      { type: 'numid_cav', men: 180, x: 1340, y: 720, ai: { kind: 'flank', delay: 70 } },
      { type: 'numid_inf', men: 380, x: 600, y: 140, ai: { kind: 'ambush', trigger: 300, maxDelay: 50, quiet: true } },
      { type: 'numid_inf', men: 380, x: 1000, y: 140, ai: { kind: 'ambush', trigger: 300, maxDelay: 55, quiet: true } },
      { type: 'elephant', men: 60, x: 800, y: 110, ai: { kind: 'ambush', trigger: 300, maxDelay: 70, quiet: true } }
    ],
    reinforcements: [],
    rewards: { gold: 700, supplies: 420, recruits: 220, xpBase: 100, officerXp: 110 }, rewardMult: 1.6,
    unlock: [{ type: 'legionary', name: 'XII Cohort', men: 380, maxMen: 480, xp: 90, drill: 35, msg: 'The survivors of the Bagradas are formed into the XII Cohort. They will not be beaten like that again.' }]
  },
  // ======================= ACT IV: Pharsalus, and Pharnaces of the Bosporus (48-47 BC) =======================
  // After the Bagradas the commander crosses to Caesar in Greece in time for Pharsalus (August 48), then goes east with Gnaeus Domitius
  // Calvinus against Pharnaces II, son of Mithridates and king of the Bosporus, who has invaded Pontus with his own army and Sarmatian horse
  // from beyond the Maeotis (Bellum Alexandrinum 34-41, 65-77; Strabo 11.5.8).
  {
    id: 'pharsalus', posture: 'attack', chief: { name: 'Gnaeus Pompeius Magnus', style: 'cautious' }, optional: true, act: 'IV', theater: 'Greece', year: '48 BC', name: 'Pharsalus', dry: true, kind: 'skirmish',
    geo: { lat: 39.29, lon: 22.38, place: 'The plain of Pharsalus, Thessaly', note: 'Caesar against Pompey, 9 August 48 BC; the exact field is disputed' },
    briefing: 'Pompey has twice your foot and seven times your horse, massed on his left. Caesar has hidden a fourth line behind his right. Hold Pompey\'s legions and trust the fourth line.',
    objective: 'Break Pompey\'s army (below 25%). His horse will come round your right; the fourth line meets it.',
    timeLimit: 720, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 760, cy: 860 },
    terrain: [{ kind: 'water', x: 0, y: 0, w: 70, h: 1000 }, { kind: 'hill', cx: 1350, cy: 250, rx: 220, ry: 90, h: 25 }],   // the Enipeus guards the left of both armies
    enemy: [
      { type: 'pompeian', men: 420, x: 380, y: 320, ai: { kind: 'rush', delay: 20 } },
      { type: 'pompeian', men: 420, x: 560, y: 315, ai: { kind: 'rush', delay: 20 } },
      { type: 'pompeian', men: 420, x: 740, y: 310, ai: { kind: 'rush', delay: 20 } },
      { type: 'pompeian', men: 420, x: 920, y: 315, ai: { kind: 'rush', delay: 20 } },
      { type: 'pompeian', men: 380, x: 650, y: 220, ai: { kind: 'rush', delay: 60, reserve: true } },
      { type: 'pomp_cav', men: 260, x: 1200, y: 330, ai: { kind: 'flank', delay: 10 } },
      { type: 'pomp_cav', men: 260, x: 1340, y: 360, ai: { kind: 'flank', delay: 12 } },
      { type: 'pomp_missile', men: 200, x: 1240, y: 250, ai: { kind: 'skirm' } }
    ],
    reinforcements: [
      { at: 75, side: 'rome', msg: "Caesar's fourth line comes out from behind the right, pila held as spears at the horses' faces!", unit: { type: 'legionary', men: 420, x: 1320, y: 1010, f: -1.5708, name: 'Fourth Line', xp: 900 } }
    ],
    rewards: { gold: 760, supplies: 420, recruits: 220, xpBase: 86, officerXp: 86 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'XIII Cohort', men: 420, maxMen: 480, xp: 80, drill: 30, msg: "Pompey's surrendered legionaries are enrolled: they form the XIII Cohort." }]
  },
  {
    id: 'comana', posture: 'attack', odds: 0.9, chief: { name: "Pharnaces' raiders", style: 'cautious' }, fog: true, act: 'IV', theater: 'Pontus', year: '48 BC', name: 'The Road to Comana', kind: 'skirmish',
    geo: { lat: 40.36, lon: 36.60, place: 'Near Comana Pontica', note: 'Illustrative: Calvinus marched on Pharnaces through Pontus; the fight is not recorded' },
    briefing: 'Pharnaces has overrun Pontus. Near Comana his raiders are driving off the herds. Clear the road.',
    objective: 'Break the raiders (below 25%). Your first look at his Roman-drilled foot and steppe horse archers.',
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 860 },
    terrain: [{ kind: 'hill', cx: 330, cy: 380, rx: 260, ry: 140, h: 40 }, { kind: 'hill', cx: 1280, cy: 360, rx: 260, ry: 140, h: 40 }, { kind: 'forest', cx: 800, cy: 120, rx: 260, ry: 80 }],
    enemy: [
      { type: 'pontic', men: 360, x: 640, y: 300, ai: { kind: 'rush', delay: 10 } },
      { type: 'pontic', men: 360, x: 960, y: 300, ai: { kind: 'rush', delay: 12 } },
      { type: 'horse_archer', men: 130, x: 300, y: 420, ai: { kind: 'numidian' } },
      { type: 'horse_archer', men: 130, x: 1300, y: 400, ai: { kind: 'numidian', delay: 8 } }
    ],
    reinforcements: [],
    rewards: { gold: 540, supplies: 380, recruits: 130, xpBase: 72, officerXp: 72 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'steppe', odds: 1.15, posture: 'defend', chief: { name: 'the Sarmatian chiefs', style: 'aggressive' }, fog: true, act: 'IV', theater: 'Pontus', year: '48 BC', name: 'The Steppe Riders', kind: 'skirmish',
    geo: { lat: 40.90, lon: 36.20, place: 'The road from Amisus', note: 'Illustrative: Sarmatian horse of the Siraces and Aorsi served Pharnaces (Strabo 11.5.8)' },
    briefing: 'Sarmatian riders come over the skyline for your grain wagons: horse archers and lancers in scale armour.',
    objective: 'Keep the wagons (gold marker). If they hold them 100 s, the grain is lost. Horse archers retreat while shooting and run out of arrows; lancers are deadly head-on but slow to turn.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 720 },
    objectives: [{ id: 'grain', name: 'Grain Wagons', x: 800, y: 660, r: 80, owner: 'rome' }],
    rule: { holdSecs: 100, attacker: 'gaul' },
    terrain: [{ kind: 'hill', cx: 800, cy: 240, rx: 380, ry: 90, h: 30 }],
    enemy: [
      { type: 'horse_archer', men: 150, x: 280, y: 420, ai: { kind: 'numidian' } },
      { type: 'horse_archer', men: 150, x: 1320, y: 420, ai: { kind: 'numidian', delay: 4 } },
      { type: 'horse_archer', men: 130, x: 800, y: 260, ai: { kind: 'numidian', delay: 8 } },
      { type: 'lancer', men: 120, x: 560, y: 220, ai: { kind: 'raid', obj: 'grain', delay: 45 } },
      { type: 'lancer', men: 120, x: 1040, y: 220, ai: { kind: 'flank', delay: 55 } },
      { type: 'horse_archer', men: 120, x: 160, y: 760, ai: { kind: 'numidian', delay: 30 } }
    ],
    reinforcements: [],
    rewards: { gold: 520, supplies: 480, recruits: 120, xpBase: 76, officerXp: 76 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'nicopolis', posture: 'assault', odds: 1.35, chief: { name: 'Pharnaces II', style: 'cunning' }, fog: true, act: 'IV', theater: 'Armenia Minor', year: '48 BC', name: 'Nicopolis', kind: 'named',
    geo: { lat: 40.15, lon: 37.85, place: 'Nicopolis in Armenia Minor', note: 'Calvinus was defeated here in December 48 BC (Bellum Alexandrinum 38-40); site approximate' },
    briefing: 'Pharnaces stands behind two trenches before Nicopolis. On your left stands a green legion raised in Pontus. If it breaks, the army is in danger.',
    objective: 'Break Pharnaces, or keep 45% of your army until nightfall. A draw here pays well.',
    links: [
      { from: 'comana', morale: 3, text: 'The road to Comana was cleared: the men have beaten these troops before (+3 morale).' },
      { from: 'steppe', scale: { horse_archer: 0.8, lancer: 0.8 }, text: 'The Sarmatians were mauled at the grain wagons: fewer of them ride with Pharnaces.' }
    ],
    timeLimit: 720, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 860 },
    terrain: [{ kind: 'hill', cx: 800, cy: 230, rx: 520, ry: 120, h: 30 }, { kind: 'forest', cx: 140, cy: 320, rx: 140, ry: 180 }],
    enemy: [
      { type: 'pontic', men: 400, x: 520, y: 330, ai: { kind: 'rush', delay: 40 } },
      { type: 'pontic', men: 400, x: 800, y: 320, ai: { kind: 'rush', delay: 40 } },
      { type: 'pontic', men: 400, x: 1080, y: 330, ai: { kind: 'rush', delay: 40 } },
      { type: 'pontic', men: 380, x: 800, y: 210, ai: { kind: 'rush', delay: 90, reserve: true } },
      { type: 'lancer', men: 130, x: 260, y: 420, ai: { kind: 'flank', delay: 50 } },
      { type: 'lancer', men: 130, x: 1340, y: 420, ai: { kind: 'flank', delay: 55 } },
      { type: 'horse_archer', men: 140, x: 340, y: 520, ai: { kind: 'numidian', delay: 10 } },
      { type: 'horse_archer', men: 140, x: 1260, y: 520, ai: { kind: 'numidian', delay: 12 } }
    ],
    reinforcements: [
      { at: 3, side: 'rome', msg: 'The new legion raised in Pontus takes its place on the left. It has never stood in a battle line.', unit: { type: 'legionary', men: 420, x: 380, y: 940, f: -1.5708, name: 'Legio Pontica', xp: 0 } }
    ],
    rewards: { gold: 760, supplies: 460, recruits: 240, xpBase: 104, officerXp: 112 }, rewardMult: 1.6,
    unlock: []
  },
  {
    id: 'zela', posture: 'fortdef', odds: 0.7, chief: { name: 'Pharnaces II', style: 'aggressive' }, act: 'IV', theater: 'Pontus', year: '47 BC', name: 'Zela', dry: true, kind: 'named',
    geo: { lat: 40.30, lon: 35.89, place: 'Zela (Zile), Pontus', note: 'Caesar beat Pharnaces here on 2 August 47 BC: veni, vidi, vici (Bellum Alexandrinum 72-77)' },
    briefing: 'Pharnaces charges up the hill while your men are still digging the camp. Scythed chariots come first.',
    objective: 'Don\'t let him hold the camp (gold marker) 100 s. Break his army to win. Open ranks (.) and missiles beat chariots.',
    links: [{ from: 'nicopolis', morale: 4, text: 'The men who came through Nicopolis want their revenge (+4 morale).' }],
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 640 },
    objectives: [{ id: 'camp', name: "Caesar's Camp", x: 800, y: 720, r: 95, owner: 'rome' }],
    rule: { holdSecs: 100, attacker: 'gaul' },
    terrain: [{ kind: 'hill', cx: 800, cy: 680, rx: 560, ry: 220, h: 55 }, { kind: 'hill', cx: 800, cy: 90, rx: 500, ry: 90, h: 40 }],
    enemy: [
      { type: 'chariot', men: 40, x: 600, y: 200, ai: { kind: 'chariot', delay: 6 } },
      { type: 'chariot', men: 40, x: 1000, y: 200, ai: { kind: 'chariot', delay: 8 } },
      { type: 'pontic', men: 400, x: 500, y: 150, ai: { kind: 'rush', delay: 12 } },
      { type: 'pontic', men: 400, x: 800, y: 140, ai: { kind: 'rush', delay: 10 } },
      { type: 'pontic', men: 400, x: 1100, y: 150, ai: { kind: 'rush', delay: 12 } },
      { type: 'pontic', men: 360, x: 800, y: 60, ai: { kind: 'rush', delay: 40, reserve: true } },
      { type: 'lancer', men: 120, x: 220, y: 220, ai: { kind: 'flank', delay: 30 } },
      { type: 'horse_archer', men: 130, x: 1380, y: 220, ai: { kind: 'numidian', delay: 15 } }
    ],
    reinforcements: [],
    rewards: { gold: 1100, supplies: 600, recruits: 320, xpBase: 120, officerXp: 130 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'XIV Cohort', men: 440, maxMen: 480, xp: 120, drill: 40, msg: 'The Sixth Legion, which won Zela almost alone, sends a cohort to your army.' }]
  },
  // ======================= ACT V: Roman against Roman (46-45 BC) =======================
  // The last Pompeians: Metellus Scipio, Labienus and King Juba in Africa (Bellum Africum), then Pompey's sons and Labienus in Spain
  // (Bellum Hispaniense). The enemy fights like you; a wavering Pompeian cohort may come over to you (goodwill = your name for clemency).
  {
    id: 'ruspina', posture: 'ambush', odds: 0.8, defect: true, chief: { name: 'Titus Labienus', style: 'cunning' }, act: 'V', theater: 'Africa', year: '46 BC', name: 'Ruspina', kind: 'named', dry: true,
    geo: { lat: 35.77, lon: 10.83, place: 'The plain near Ruspina (Monastir)', note: 'Labienus surrounded Caesar here on 4 January 46 BC (Bellum Africum 11-18)' },
    briefing: 'Caught foraging on the plain, you are surrounded by Labienus\' horse. Caesar orders every other cohort to turn about and fight both ways.',
    objective: 'Survive: break the host, or keep 45% of your army until nightfall. Face both ways, or form orbis.',
    timeLimit: 600, daysToPrepare: 4,
    deploy: { mode: 'grid', cx: 800, cy: 560, cols: 4, dx: 110, dy: 90 },
    terrain: [{ kind: 'hill', cx: 800, cy: 880, rx: 300, ry: 80, h: 22 }],
    enemy: [
      { type: 'numid_cav', men: 180, x: 260, y: 300, ai: { kind: 'numidian' } },
      { type: 'numid_cav', men: 180, x: 1340, y: 300, ai: { kind: 'numidian', delay: 3 } },
      { type: 'numid_cav', men: 160, x: 220, y: 760, ai: { kind: 'numidian', delay: 15 } },
      { type: 'numid_cav', men: 160, x: 1380, y: 760, ai: { kind: 'numidian', delay: 18 } },
      { type: 'pomp_cav', men: 220, x: 600, y: 200, ai: { kind: 'flank', delay: 40 } },
      { type: 'pomp_cav', men: 220, x: 1000, y: 200, ai: { kind: 'flank', delay: 45 } },
      { type: 'numid_inf', men: 340, x: 800, y: 220, ai: { kind: 'rush', delay: 30 } },
      { type: 'numid_inf', men: 300, x: 800, y: 960, ai: { kind: 'rush', delay: 60 } }
    ],
    reinforcements: [],
    rewards: { gold: 700, supplies: 420, recruits: 220, xpBase: 100, officerXp: 105 }, rewardMult: 1.4,
    unlock: []
  },
  {
    id: 'uzitta', posture: 'assault', defect: true, chief: { name: 'Metellus Scipio', style: 'cautious' }, optional: true, fog: true, act: 'V', theater: 'Africa', year: '46 BC', name: 'The Lines at Uzitta', kind: 'skirmish', dry: true,
    geo: { lat: 35.60, lon: 10.72, place: 'The ridges before Uzitta', note: 'Months of siege lines and skirmishes for the high ground (Bellum Africum 37-66); site approximate' },
    briefing: 'Scipio holds the next crest before Uzitta. Take it, and your lines command the town\'s water.',
    objective: 'Hold the crest (gold marker) 100 s, or break the defenders. Optional: a win weakens Scipio at Thapsus.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 860 },
    objectives: [{ id: 'crest', name: 'The Crest', x: 800, y: 300, r: 95, owner: 'gaul' }],
    rule: { holdSecs: 100, attacker: 'rome' },
    terrain: [{ kind: 'hill', cx: 800, cy: 300, rx: 420, ry: 130, h: 40 }],
    enemy: [
      { type: 'pompeian', men: 400, x: 640, y: 300, ai: { kind: 'ambush', trigger: 160, maxDelay: 110 } },
      { type: 'pompeian', men: 400, x: 960, y: 300, ai: { kind: 'ambush', trigger: 160, maxDelay: 110 } },
      { type: 'numid_inf', men: 320, x: 800, y: 220, ai: { kind: 'skirm' } },
      { type: 'pomp_missile', men: 180, x: 800, y: 330, ai: { kind: 'skirm' } },
      { type: 'numid_cav', men: 150, x: 1340, y: 420, ai: { kind: 'numidian', delay: 20 } }
    ],
    reinforcements: [],
    rewards: { gold: 560, supplies: 380, recruits: 150, xpBase: 80, officerXp: 80 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'thapsus', posture: 'attack', odds: 0.85, defect: true, chief: { name: 'Metellus Scipio and King Juba', style: 'stubborn' }, fog: true, act: 'V', theater: 'Africa', year: '46 BC', name: 'Thapsus', kind: 'named', dry: true,
    geo: { lat: 35.62, lon: 11.05, place: 'Before Thapsus', note: 'Caesar destroyed Scipio and Juba here on 6 April 46 BC (Bellum Africum 79-86)' },
    briefing: 'Scipio is trapped outside Thapsus between sea and lagoon, elephants on his wings. Your veterans are eager, perhaps too eager.',
    objective: 'Break Scipio\'s army (below 25%). Missiles madden elephants; open ranks (.) let them through. Wavering Pompeians may defect.',
    links: [
      { from: 'uzitta', scale: { pompeian: 0.85 }, text: 'Scipio lost his crest at Uzitta, and men with it: fewer legionaries stand in his line.' },
      { from: 'ruspina', morale: 4, text: 'The recruits who came through Ruspina are veterans now (+4 morale).' }
    ],
    timeLimit: 720, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 860 },
    terrain: [{ kind: 'water', x: 0, y: 0, w: 110, h: 1000 }, { kind: 'water', x: 1490, y: 0, w: 110, h: 1000 }],
    events: [{ at: 40, kind: 'rashRight', msg: 'On the right the veterans force a trumpeter to sound the charge before Caesar has given the order! The right wing goes in.' }],
    enemy: [
      { type: 'pompeian', men: 420, x: 520, y: 320, ai: { kind: 'rush', delay: 30 } },
      { type: 'pompeian', men: 420, x: 700, y: 315, ai: { kind: 'rush', delay: 30 } },
      { type: 'pompeian', men: 420, x: 880, y: 315, ai: { kind: 'rush', delay: 30 } },
      { type: 'pompeian', men: 420, x: 1060, y: 320, ai: { kind: 'rush', delay: 30 } },
      { type: 'pompeian', men: 380, x: 800, y: 220, ai: { kind: 'rush', delay: 70, reserve: true } },
      { type: 'elephant', men: 60, x: 330, y: 330, ai: { kind: 'rush', delay: 20 } },
      { type: 'elephant', men: 60, x: 1260, y: 330, ai: { kind: 'rush', delay: 20 } },
      { type: 'numid_cav', men: 180, x: 220, y: 260, ai: { kind: 'numidian', delay: 25 } },
      { type: 'numid_cav', men: 180, x: 1380, y: 260, ai: { kind: 'numidian', delay: 25 } },
      { type: 'numid_inf', men: 320, x: 800, y: 420, ai: { kind: 'skirm' } }
    ],
    reinforcements: [],
    rewards: { gold: 1200, supplies: 640, recruits: 340, xpBase: 124, officerXp: 130 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'XV Cohort', men: 440, maxMen: 480, xp: 140, drill: 40, msg: 'Men of the Fifth, who fought the elephants at Thapsus, join your army as the XV Cohort.' }]
  },
  {
    id: 'ategua', posture: 'assault', defect: true, chief: { name: 'the garrison of Ategua', style: 'stubborn' }, fog: true, act: 'V', theater: 'Hispania', year: '45 BC', name: 'Ategua', kind: 'skirmish',
    geo: { lat: 37.80, lon: -4.62, place: 'Ategua (Teba la Vieja), near Corduba', note: 'Caesar besieged it in the winter of 46-45 BC (Bellum Hispaniense 6-19)' },
    briefing: 'Winter in Spain. Storm the hill town of Ategua, where Pompey\'s son keeps his supplies, while his horse attack your lines.',
    objective: 'Hold the gate (gold marker) 110 s, or break the defenders.',
    timeLimit: 660, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    objectives: [{ id: 'gate', name: 'The Town Gate', x: 800, y: 320, r: 90, owner: 'gaul' }],
    rule: { holdSecs: 110, attacker: 'rome' },
    terrain: [{ kind: 'hill', cx: 800, cy: 250, rx: 380, ry: 170, h: 55 }, { kind: 'forest', cx: 180, cy: 600, rx: 150, ry: 140 }],
    enemy: [
      { type: 'pomp_levy', men: 420, x: 650, y: 320, ai: { kind: 'ambush', trigger: 140, maxDelay: 130 } },
      { type: 'pomp_levy', men: 420, x: 950, y: 320, ai: { kind: 'ambush', trigger: 140, maxDelay: 130 } },
      { type: 'pompeian', men: 380, x: 800, y: 240, ai: { kind: 'ambush', trigger: 120, maxDelay: 130 } },
      { type: 'pomp_missile', men: 200, x: 800, y: 360, ai: { kind: 'skirm' } },
      { type: 'pomp_cav', men: 180, x: 1380, y: 500, ai: { kind: 'flank', delay: 60 } }
    ],
    reinforcements: [],
    rewards: { gold: 620, supplies: 480, recruits: 170, xpBase: 90, officerXp: 90 }, rewardMult: 1,
    unlock: []
  },
  {
    id: 'munda', posture: 'assault', odds: 1.55, defect: true, chief: { name: 'Gnaeus Pompeius and Titus Labienus', style: 'stubborn' }, act: 'V', theater: 'Hispania', year: '45 BC', name: 'Munda', kind: 'named',
    geo: { lat: 37.40, lon: -4.80, place: 'The plain and ridge of Munda', note: 'The last battle of the civil war, 17 March 45 BC (Bellum Hispaniense 27-31); the site is disputed' },
    briefing: 'The last Pompeian army holds the ridge above Munda: thirteen legions against Caesar\'s eight. Cross the marshy stream and climb. Caesar said that here he fought for his life.',
    objective: 'Break the Pompeian army (below 25%). Climb steadily, rotate tired cohorts. Wavering cohorts may defect.',
    links: [
      { from: 'ategua', scale: { pomp_levy: 0.85 }, text: "Ategua has fallen with Gnaeus' supplies: his levies are fewer and hungrier." },
      { from: 'thapsus', morale: 4, text: 'These are the men who won Thapsus (+4 morale).' }
    ],
    timeLimit: 900, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    terrain: [{ kind: 'hill', cx: 800, cy: 260, rx: 640, ry: 190, h: 50 }, { kind: 'ford', x: 120, y: 620, w: 1360, h: 45 }],
    events: [{ at: 330, kind: 'shake', amount: 14, msg: "Labienus pulls five cohorts out of the line to meet Bogud's horse at the camp. The Pompeians see them go and think he is running: their line shudders!" }],
    enemy: [
      { type: 'pompeian', men: 420, x: 420, y: 300, ai: { kind: 'ambush', trigger: 170, maxDelay: 120 } },
      { type: 'pompeian', men: 420, x: 600, y: 290, ai: { kind: 'ambush', trigger: 170, maxDelay: 120 } },
      { type: 'pompeian', men: 420, x: 1000, y: 290, ai: { kind: 'ambush', trigger: 170, maxDelay: 120 } },
      { type: 'pompeian', men: 420, x: 1180, y: 300, ai: { kind: 'ambush', trigger: 170, maxDelay: 120 } },
      { type: 'pomp_levy', men: 420, x: 800, y: 285, ai: { kind: 'ambush', trigger: 170, maxDelay: 120 } },
      { type: 'pomp_levy', men: 420, x: 500, y: 190, ai: { kind: 'rush', delay: 150, reserve: true } },
      { type: 'pomp_levy', men: 420, x: 1100, y: 190, ai: { kind: 'rush', delay: 150, reserve: true } },
      { type: 'pomp_cav', men: 200, x: 200, y: 360, ai: { kind: 'flank', delay: 60 } },
      { type: 'pomp_cav', men: 200, x: 1400, y: 360, ai: { kind: 'flank', delay: 70 } },
      { type: 'pomp_missile', men: 200, x: 800, y: 380, ai: { kind: 'skirm' } }
    ],
    reinforcements: [
      { at: 300, side: 'rome', msg: "King Bogud's Moorish horse ride round the Pompeian flank towards their camp!", unit: { type: 'aux_cav', men: 160, x: 1500, y: 120, f: 3.1416, name: "Bogud's Moorish Horse", xp: 300 } }
    ],
    rewards: { gold: 1600, supplies: 800, recruits: 400, xpBase: 150, officerXp: 160 }, rewardMult: 1,
    unlock: []
  }
];

// Opening battle: a short, forgiving skirmish fought before the player ever sees the management screen.
export const PROLOGUE = {
  id: 'prologue', act: 'I', theater: 'Gaul', year: '58 BC', name: 'First Blood at the Border', kind: 'skirmish',
  geo: { lat: 45.52, lon: 4.87, place: 'Vienna (Vienne) on the Rhone', note: 'Border of the Province, Allobroges country' },
  briefing: 'Raiders have crossed the Rhone and are burning farms in sight of your camp. Drive them off. An easy fight: hints will show you the controls.',
  objective: 'Break their warbands. Take your time and learn the controls.',
  timeLimit: 720, callDelay: 45, daysToPrepare: 0, deploy: { mode: 'line', cx: 800, cy: 880 },
  terrain: [{ kind: 'hill', cx: 1220, cy: 700, rx: 170, ry: 90 }, { kind: 'forest', cx: 300, cy: 330, rx: 160, ry: 90 }],
  enemy: [
    { type: 'warband', men: 130, x: 700, y: 300, ai: { kind: 'rush', delay: 30 } },
    { type: 'warband', men: 110, x: 900, y: 290, ai: { kind: 'rush', delay: 55 } }
  ],
  reinforcements: [
    { at: 70, msg: 'A few more raiders wade across the river!', unit: { type: 'warband', men: 80, x: 780, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 130, msg: 'Another band appears on the ridge.', unit: { type: 'warband', men: 80, x: 640, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 190, msg: '', unit: { type: 'warband', men: 80, x: 900, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 250, msg: 'Raiders pour out of the woods on your left!', unit: { type: 'warband', men: 70, x: 340, y: 200, ai: { kind: 'rush', delay: 0 } } },
    { at: 310, msg: 'The last raiders rush from the hills!', unit: { type: 'warband', men: 70, x: 1100, y: 160, ai: { kind: 'rush', delay: 0 } } }
  ],
  objectives: [], rule: null,
  rewards: { gold: 120, supplies: 60, recruits: 30, xpBase: 22, officerXp: 25 }, rewardMult: 1, unlock: []
};
// The opening fight has no waves either: the raiders are all out there, coming from different distances.
PROLOGUE.enemy.push(...PROLOGUE.reinforcements.map(r => ({ ...r.unit, ai: { kind: 'rush', delay: 0 } }))); PROLOGUE.reinforcements = [];

// ---------------------------------------------------------------------------
// Battles are all or nothing: the whole enemy host is on the field from the start. The only reinforcements are the ones authored
// into a scenario as a deliberate surprise (a flank attack, an ambush party, allies arriving late).
// ---------------------------------------------------------------------------
const TIME_LIMITS = { landing: 1080, seventh: 840, bigbury: 1080, cassivellaunus: 1320, ruspina: 1080, uzitta: 1080, thapsus: 1320, ategua: 1200, munda: 1560, pharsalus: 1320, comana: 1080, steppe: 1080, nicopolis: 1320, zela: 1080, anquillaria: 1080, castra: 1080, utica: 1320, water: 1080, bagradas: 1080, ford: 1080, arar: 1080, convoy: 1080, oppidum: 1200, silva: 840, bibracte: 1500, parley: 800, supply: 1080, lessercamp: 1200, ariovistus: 1800, rhine: 900 };
for (const scn of SCENARIOS) scn.timeLimit = TIME_LIMITS[scn.id] || scn.timeLimit;
for (const scn of SCENARIOS) if (scn.act === 'III') scn.dry = true;   // Africa is drawn as dry, open country

// ---------------------------------------------------------------------------
// Battlefield scale. Maps are authored on a 1600x1000 grid and enlarged here, so the armies start far apart and you have to find the
// enemy, manoeuvre, and choose your ground. Heights grow more slowly than distances so slopes stay walkable.
// ---------------------------------------------------------------------------
export const MAP_SCALE = 2.5, PROLOGUE_SCALE = 1.8;
export function scaleScenario(scn, k) {
  const S = (v) => Math.round(v * k), p = (o, ...keys) => { for (const key of keys) if (key in o) o[key] = S(o[key]); };
  for (const f of scn.terrain) {
    f.sc = k;
    if (f.kind === 'hill') { p(f, 'cx', 'cy', 'rx', 'ry'); f.h = Math.round((f.h || 40) * Math.sqrt(k)); }
    else if (f.rx) p(f, 'cx', 'cy', 'rx', 'ry');
    else p(f, 'x', 'y', 'w', 'h');
  }
  for (const o of scn.objectives || []) { p(o, 'x', 'y'); o.r = Math.round(o.r * Math.sqrt(k) * 1.2); }
  p(scn.deploy, 'cx', 'cy'); if (scn.deploy.dx) { scn.deploy.dx = Math.round(scn.deploy.dx * 1.4); scn.deploy.dy = Math.round(scn.deploy.dy * 1.4); }
  for (const e of scn.enemy) { p(e, 'x', 'y'); if (e.ai && e.ai.trigger) e.ai.trigger = Math.round(e.ai.trigger * 1.6); }
  for (const r of scn.reinforcements || []) { if (r.unit) p(r.unit, 'x', 'y'); }
  scn.timeLimit = Math.round(scn.timeLimit * 1.2);
  scn.world = { w: S(1600), h: S(1000) };
  scn.scale = k;
}
scaleScenario(PROLOGUE, PROLOGUE_SCALE);
for (const scn of SCENARIOS) { scaleScenario(scn, MAP_SCALE); for (const ph of scn.phases || []) scaleScenario(ph, MAP_SCALE); }
// A battle fought in stages: the scenario as it stands for one stage (same battle, its own ground, enemy and objective). Rewards come with the last.
export function phaseScn(scn, i) {
  if (!scn || !scn.phases) return scn;
  const n = scn.phases.length, k = Math.max(0, Math.min(n - 1, i || 0)), last = k === n - 1, rw = scn.rewards;
  return { ...scn, ...scn.phases[k], phaseIdx: k, phaseCount: n, rewards: last ? rw : { gold: 0, supplies: 0, recruits: 0, xpBase: Math.round(rw.xpBase * 0.45), officerXp: Math.round(rw.officerXp * 0.4) }, unlock: last ? scn.unlock : [] };
}
