// Static game data: unit types, difficulty, XP ladder, terrain and scenarios.

export const WORLD = { w: 1600, h: 1000 };

export const XP_LEVELS = [0, 100, 250, 450, 700, 1000];
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
  }
};

// What it costs to raise a fresh unit of each Roman type at camp (and its full strength).
export const RAISE = {
  legionary: { men: 300, max: 480, gold: 420, supplies: 40 },
  slinger: { men: 100, max: 150, gold: 150, supplies: 10 },
  equites: { men: 50, max: 60, gold: 300, supplies: 20 },
  archer: { men: 100, max: 130, gold: 200, supplies: 12 },
  aux_cav: { men: 50, max: 70, gold: 240, supplies: 15 },
  aux_inf: { men: 250, max: 350, gold: 260, supplies: 25 }
};
export const START_TYPES = ['legionary', 'slinger', 'equites'];
export const TYPE_UNLOCKS = { arar: ['aux_cav'], convoy: ['archer'], oppidum: ['aux_inf'] };

export const DIFFICULTY = {
  easy:      { name: 'Tiro',       enemyMult: 0.8,  enemyMorale: -6, romeMorale: 8,  officerRisk: 0.0,  reward: 0.9,  desc: 'Forgiving. Officers cannot die.' },
  normal:    { name: 'Miles',      enemyMult: 1.0,  enemyMorale: 0,  romeMorale: 0,  officerRisk: 1.0,  reward: 1.0,  desc: 'Intended experience. Officers can fall.' },
  hard:      { name: 'Centurion',  enemyMult: 1.3,  enemyMorale: 6,  romeMorale: -2, officerRisk: 1.25, reward: 1.15, desc: 'Larger, braver enemies. Richer spoils.' },
  legendary: { name: 'Imperator',  enemyMult: 1.6,  enemyMorale: 12, romeMorale: -5, officerRisk: 1.5,  reward: 1.3,  desc: 'Brutal. Draws will feel like victories.' }
};

// Terrain features. Rectangles use x,y,w,h; ellipses use cx,cy,rx,ry.
export function terrainAt(scn, x, y) {
  let r = { speed: 1, def: 1, atk: 1, cav: 1, kind: 'grass' };
  if (!scn) return r;
  for (const f of scn.terrain) {
    let inside;
    if (f.rx) inside = ((x - f.cx) / f.rx) ** 2 + ((y - f.cy) / f.ry) ** 2 <= 1;
    else inside = x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h;
    if (!inside) continue;
    if (f.kind === 'water')  r = { speed: 0.35, def: 1.0, atk: 0.8, cav: 0.5, kind: 'water' };
    if (f.kind === 'ford')   r = { speed: 0.8,  def: 1.0, atk: 0.9, cav: 0.8, kind: 'ford' };
    if (f.kind === 'hill')   r = { speed: 0.9,  def: 0.88, atk: 1.08, cav: 0.9, kind: 'hill' };
    if (f.kind === 'forest') r = { speed: 0.6,  def: 0.95, atk: 0.95, cav: 0.55, kind: 'forest' };
  }
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
    id: 'ford', act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Fords of the Rhone', kind: 'skirmish',
    geo: { lat: 46.20, lon: 6.15, place: 'Genava (Geneva)', note: 'Fords of the Rhone, where the Helvetii tried to cross' },
    briefing: 'The Helvetii mean to cross the Rhone near Genava and march west through the Province. Your legion has cut the bridge and holds the river line. A few shallow fords are the only easy crossings, and warbands are probing them. Beat them back, or bloody them enough that they look for another road.',
    objective: 'Break the Gallic host (reduce it below 25%), or withdraw in good order with at least 45% of your men.',
    timeLimit: 540, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 800, cy: 880 },
    terrain: [
      { kind: 'water', x: 0, y: 460, w: 700, h: 70 }, { kind: 'ford', x: 700, y: 460, w: 200, h: 70 }, { kind: 'water', x: 900, y: 460, w: 700, h: 70 },
      { kind: 'hill', cx: 1230, cy: 760, rx: 170, ry: 95 }, { kind: 'forest', cx: 360, cy: 270, rx: 170, ry: 100 }, { kind: 'forest', cx: 1280, cy: 230, rx: 130, ry: 80 }
    ],
    enemy: [
      { type: 'warband', men: 300, x: 640, y: 250, ai: { kind: 'rush', delay: 6 } },
      { type: 'warband', men: 325, x: 820, y: 230, ai: { kind: 'rush', delay: 3 } },
      { type: 'warband', men: 260, x: 380, y: 300, ai: { kind: 'ambush', trigger: 260, maxDelay: 120 } },
      { type: 'gaul_skirm', men: 115, x: 740, y: 330, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 60, x: 1260, y: 200, ai: { kind: 'flank', delay: 20 } }
    ],
    reinforcements: [{ at: 150, msg: 'War horns sound from the forest - another warband joins the fray!', unit: { type: 'warband', men: 260, x: 300, y: 80, ai: { kind: 'rush', delay: 0 } } }],
    rewards: { gold: 260, supplies: 120, recruits: 60, xpBase: 30, officerXp: 35 }, rewardMult: 1, unlock: []
  },
  {
    id: 'arar', act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Crossing of the Arar', kind: 'skirmish',
    geo: { lat: 45.94, lon: 4.77, place: 'The Arar (Saone) near Trevoux', note: 'Site of the Tigurini crossing is approximate' },
    briefing: 'The Helvetii are crossing the Arar, and the Tigurini clan is still on your bank, strung out and unready. Strike hard before the rest can return. The river is deep: only the ford and the banks allow easy movement, and the warbands across the water are watching.',
    objective: 'Destroy the stragglers (reduce the host below 25%), or withdraw with at least 45% of your men.',
    timeLimit: 480, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 700, cy: 900 },
    terrain: [
      { kind: 'water', x: 0, y: 380, w: 520, h: 100 }, { kind: 'ford', x: 520, y: 380, w: 200, h: 100 }, { kind: 'water', x: 720, y: 380, w: 880, h: 100 },
      { kind: 'forest', cx: 1250, cy: 760, rx: 200, ry: 110 }, { kind: 'hill', cx: 330, cy: 760, rx: 150, ry: 85 }, { kind: 'forest', cx: 1100, cy: 150, rx: 220, ry: 90 }
    ],
    enemy: [
      { type: 'warband', men: 350, x: 560, y: 560, ai: { kind: 'ambush', trigger: 130, maxDelay: 90, quiet: true } },
      { type: 'warband', men: 325, x: 760, y: 590, ai: { kind: 'ambush', trigger: 130, maxDelay: 90, quiet: true } },
      { type: 'warband', men: 310, x: 960, y: 560, ai: { kind: 'ambush', trigger: 130, maxDelay: 95, quiet: true } },
      { type: 'gaul_skirm', men: 135, x: 650, y: 520, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 80, x: 1100, y: 620, ai: { kind: 'flank', delay: 35 } }
    ],
    reinforcements: [{ at: 120, msg: 'Warbands from across the Arar wade back to rescue their kin!', unit: { type: 'gaul_elite', men: 260, x: 620, y: 300, ai: { kind: 'rush', delay: 0 } } }],
    rewards: { gold: 360, supplies: 160, recruits: 80, xpBase: 44, officerXp: 50 }, rewardMult: 1.1,
    unlock: [{ type: 'aux_cav', name: 'Allied Gallic Horse', men: 60, maxMen: 70, xp: 20, drill: 15, msg: 'Aeduan cavalry ride in to support Rome.' }]
  },
  {
    id: 'convoy', act: 'I', theater: 'Gaul', year: '58 BC', name: "The Foragers' Road", kind: 'skirmish',
    geo: { lat: 46.78, lon: 4.85, place: 'Cabillonum (Chalon-sur-Saone)', note: 'Aeduan country; the road is illustrative' },
    briefing: 'Your supply train is crawling along a forest road when scouts report raiders closing in. The wagons carry the legion\'s grain. Hold the wagons and drive the raiders off, because if the Gauls seize them and hold them, the campaign starves.',
    objective: 'Keep the supply wagons (the gold marker) in Roman hands. If the Gauls hold them for 90 seconds the convoy is lost. Break the raiders to win.',
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
    id: 'oppidum', act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Hill Fort of the Sequani', kind: 'skirmish',
    geo: { lat: 47.24, lon: 6.02, place: 'Vesontio (Besancon)', note: 'Great oppidum of the Sequani on a loop of the Doubs' },
    briefing: 'A local chieftain has fortified a hilltop and refuses to supply your army. The slopes are steep and the defenders are dug in. Soften them with missiles, lure them down, or storm the crest.',
    objective: 'Capture the hill fort summit by holding it for 150 seconds, or break the defenders. Fighting uphill is costly.',
    timeLimit: 600, daysToPrepare: 3,
    deploy: { mode: 'line', cx: 800, cy: 900 },
    objectives: [{ id: 'fort', name: 'Hill Fort', x: 800, y: 270, r: 90, owner: 'gaul' }],
    rule: { holdSecs: 150, attacker: 'rome' },
    terrain: [
      { kind: 'hill', cx: 800, cy: 260, rx: 330, ry: 150 }, { kind: 'forest', cx: 250, cy: 520, rx: 170, ry: 100 }, { kind: 'forest', cx: 1350, cy: 560, rx: 180, ry: 110 },
      { kind: 'water', x: 0, y: 620, w: 520, h: 40 }, { kind: 'water', x: 1080, y: 620, w: 520, h: 40 }
    ],
    enemy: [
      { type: 'warband', men: 650, x: 700, y: 240, ai: { kind: 'ambush', trigger: 90, maxDelay: 140 } },
      { type: 'warband', men: 650, x: 900, y: 240, ai: { kind: 'ambush', trigger: 90, maxDelay: 140 } },
      { type: 'gaul_elite', men: 415, x: 800, y: 215, ai: { kind: 'ambush', trigger: 40, maxDelay: 200 } },
      { type: 'gaul_skirm', men: 285, x: 640, y: 300, ai: { kind: 'skirm' } },
      { type: 'gaul_skirm', men: 260, x: 960, y: 300, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 130, x: 1300, y: 330, ai: { kind: 'flank', delay: 50 } }
    ],
    reinforcements: [],
    rewards: { gold: 320, supplies: 140, recruits: 70, xpBase: 40, officerXp: 45 }, rewardMult: 1,
    unlock: [{ type: 'legionary', name: 'IV Cohort', men: 360, maxMen: 480, xp: 10, drill: 15, msg: 'Fresh legionaries of the IV Cohort arrive from Cisalpine Gaul.' }]
  },
  {
    id: 'silva', act: 'I', theater: 'Gaul', year: '58 BC', name: 'Ambush in the Silva', kind: 'skirmish',
    geo: { lat: 47.15, lon: 4.00, place: 'Forests of the Morvan', note: 'Illustrative ambush site' },
    briefing: 'Dense forest closes around your column. The Gauls know every path; you are caught in a clearing with enemies on both flanks. This is the sort of day that has broken Roman armies before. Hold together, survive until your rearguard arrives, and the spoils of a hard-won escape will be rich.',
    objective: 'Survive until the relief column arrives and the Gauls withdraw: break the host, or hold on until the time runs out with at least 45% of your army.',
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
    id: 'bibracte', act: 'I', theater: 'Gaul', year: '58 BC', name: 'The Battle of Bibracte', kind: 'named',
    geo: { lat: 46.93, lon: 4.03, place: 'Bibracte (Mont Beuvray)', note: 'Oppidum of the Aedui' },
    briefing: 'The Helvetii turn and attack your column near Bibracte. You hold the slope with the legion in triplex acies; the enemy mass on the ridge beyond, thousands strong, with elite retinues in the van. Break their assault with pila and the gladius, and be ready: their allies, the Boii and Tulingi, will fall on your flank and rear when the fight is at its height.',
    objective: 'Break the Helvetii host. Hold the line, keep your reserve fresh, and survive the flank attack. A well-ordered withdrawal still counts as a draw.',
    timeLimit: 780, daysToPrepare: 4,
    deploy: { mode: 'line', cx: 780, cy: 860 },
    objectives: [{ id: 'ridge', name: 'The Ridge', x: 800, y: 420, r: 110, owner: 'gaul' }],
    rule: { holdSecs: 180, attacker: 'rome' },
    terrain: [
      { kind: 'hill', cx: 800, cy: 260, rx: 520, ry: 190 }, { kind: 'hill', cx: 800, cy: 760, rx: 420, ry: 110 },
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
    rewards: { gold: 700, supplies: 400, recruits: 200, xpBase: 80, officerXp: 90 }, rewardMult: 1,
    unlock: [
      { type: 'legionary', name: 'VI Cohort', men: 420, maxMen: 480, xp: 60, drill: 30, msg: 'Survivors and volunteers form the VI Cohort.' },
      { type: 'legionary', name: 'VII Cohort', men: 420, maxMen: 480, xp: 60, drill: 30, msg: 'The VII Cohort is raised from the veterans of the Helvetian war.' }
    ]
  }
];

// Opening battle: a short, forgiving skirmish fought before the player ever sees the management screen.
export const PROLOGUE = {
  id: 'prologue', act: 'I', theater: 'Gaul', year: '58 BC', name: 'First Blood at the Border', kind: 'skirmish',
  geo: { lat: 45.52, lon: 4.87, place: 'Vienna (Vienne) on the Rhone', note: 'Border of the Province, Allobroges country' },
  briefing: 'You have taken command of a legion on the edge of the Province. A small band of raiders has crossed the Rhone and is plundering farms within sight of your camp. Drive them off. This is an easy fight against a weak enemy, and hints will appear as you play to show you how things work.',
  objective: 'Drive off the raiders: break their warbands. You vastly outnumber them, so take your time and try the controls.',
  timeLimit: 660, daysToPrepare: 0, deploy: { mode: 'line', cx: 800, cy: 880 },
  terrain: [{ kind: 'hill', cx: 1220, cy: 700, rx: 170, ry: 90 }, { kind: 'forest', cx: 300, cy: 330, rx: 160, ry: 90 }],
  enemy: [
    { type: 'warband', men: 130, x: 700, y: 300, ai: { kind: 'rush', delay: 30 } },
    { type: 'warband', men: 110, x: 900, y: 290, ai: { kind: 'rush', delay: 55 } }
  ],
  reinforcements: [
    { at: 80, msg: 'A few more raiders wade across the river!', unit: { type: 'warband', men: 80, x: 780, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 150, msg: 'Another band appears on the ridge.', unit: { type: 'warband', men: 80, x: 640, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 220, msg: '', unit: { type: 'warband', men: 70, x: 900, y: 40, ai: { kind: 'rush', delay: 0 } } },
    { at: 290, msg: 'The last raiders rush out of the woods!', unit: { type: 'warband', men: 70, x: 420, y: 120, ai: { kind: 'rush', delay: 0 } } }
  ],
  objectives: [], rule: null,
  rewards: { gold: 120, supplies: 60, recruits: 30, xpBase: 22, officerXp: 25 }, rewardMult: 1, unlock: []
};

// ---------------------------------------------------------------------------
// Battle phases. Holding back part of each enemy army as later waves (vanguard, main body, reserve) means a fight
// cannot be over until the last wave has been met, which keeps battles in the 5-10 minute range.
// plan: {keep: share of enemy infantry present at the start, at: [arrival times in seconds]}
// ---------------------------------------------------------------------------
const WAVE_PLAN = {
  ford: { keep: 0.4, at: [190, 400] },
  arar: { keep: 0.4, at: [200, 420] },
  convoy: { keep: 0.4, at: [220, 430] },
  oppidum: { keep: 0.4, at: [230, 470] },
  silva: { keep: 0.4, at: [180, 360] },
  bibracte: { keep: 0.35, at: [230, 460, 620] }
};
const WAVE_MSGS = ['A fresh Gallic host marches onto the field!', 'The enemy reserve joins the fight!', 'Distant horns: yet another warband closes in!'];
const TIME_LIMITS = { ford: 1080, arar: 1080, convoy: 1080, oppidum: 1200, silva: 840, bibracte: 1500 };
for (const scn of [PROLOGUE, ...SCENARIOS]) {
  const plan = WAVE_PLAN[scn.id]; if (!plan) continue;
  scn.timeLimit = TIME_LIMITS[scn.id] || scn.timeLimit;
  const inf = scn.enemy.filter(e => (e.type === 'warband' || e.type === 'gaul_elite') && e.ai.kind !== 'idle');
  const stay = Math.max(1, Math.ceil(inf.length * plan.keep)), later = inf.slice(stay), parts = plan.at.length;
  later.forEach((e, i) => {
    scn.enemy.splice(scn.enemy.indexOf(e), 1);
    for (let w = 0; w < parts; w++) {
      scn.reinforcements.push({ at: plan.at[w] + ((i + w) % 3) * 7, msg: i === 0 ? WAVE_MSGS[w % WAVE_MSGS.length] : '',
        unit: { type: e.type, men: Math.max(70, Math.round(e.men / parts)), x: Math.max(120, Math.min(1480, e.x + (w - 1) * 90)), y: 40, ai: { kind: 'rush', delay: 0 } } });
    }
  });
}
