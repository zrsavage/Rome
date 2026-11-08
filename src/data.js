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
  gaul_cav: {
    name: 'Gallic Horse', side: 'gaul', cat: 'cav', perDot: 4, atk: 0.08, def: 0.22,
    speed: 56, turn: 2.5, morale: 56, charge: 1.7, space: 3.2, fragile: 1.1,
    color: '#2a4a8c', trim: '#d8d2b0', blurb: 'Noble horsemen, quick to hit your rear.'
  }
};

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

export const SCENARIOS = [
  {
    id: 'ford',
    act: 'I', theater: 'Gaul', year: '58 BC',
    name: 'The Ford of the Axona',
    kind: 'skirmish',
    briefing:
      'Your legion has crossed into Gaul. A raiding host of local warbands has been shadowing your foragers ' +
      'and now holds the far bank of the Axona. A shallow ford is the only easy crossing. Beat them back, ' +
      'or at least bloody them enough that they leave your column alone.',
    objective: 'Break the Gallic host (reduce it below 25%), or withdraw in good order with at least 45% of your men.',
    timeLimit: 540,
    daysToPrepare: 4,
    terrain: [
      { kind: 'water', x: 0, y: 460, w: 700, h: 70 },
      { kind: 'ford', x: 700, y: 460, w: 200, h: 70 },
      { kind: 'water', x: 900, y: 460, w: 700, h: 70 },
      { kind: 'hill', cx: 1230, cy: 760, rx: 170, ry: 95 },
      { kind: 'forest', cx: 360, cy: 270, rx: 170, ry: 100 },
      { kind: 'forest', cx: 1280, cy: 230, rx: 130, ry: 80 }
    ],
    enemy: [
      { type: 'warband', men: 230, x: 640, y: 250, ai: { kind: 'rush', delay: 6 } },
      { type: 'warband', men: 250, x: 820, y: 230, ai: { kind: 'rush', delay: 3 } },
      { type: 'warband', men: 200, x: 380, y: 300, ai: { kind: 'ambush', trigger: 260, maxDelay: 120 } },
      { type: 'gaul_skirm', men: 90, x: 740, y: 330, ai: { kind: 'skirm' } },
      { type: 'gaul_cav', men: 45, x: 1260, y: 200, ai: { kind: 'flank', delay: 20 } }
    ],
    reinforcements: [
      { at: 150, msg: 'War horns sound from the forest - another warband joins the fray!',
        unit: { type: 'warband', men: 200, x: 300, y: 80, ai: { kind: 'rush', delay: 0 } } }
    ],
    rewards: { gold: 260, supplies: 120, recruits: 60, xpBase: 30, officerXp: 35 },
    rewardMult: 1 // >1 for scenarios modelled on historical Roman defeats
  }
];
