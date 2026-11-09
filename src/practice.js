// Configurable practice battles. Nothing here touches the campaign (no rewards, no saves).
import { newCampaign } from './state.js';
import { scaleScenario } from './data.js';

const BASE = { fog: false, act: 'P', theater: 'Training ground', year: '', kind: 'practice', timeLimit: 900, daysToPrepare: 0, reinforcements: [], objectives: [], rule: null,
  rewards: { gold: 0, supplies: 0, recruits: 0, xpBase: 0, officerXp: 0 }, rewardMult: 0, unlock: [], deploy: { mode: 'line', cx: 800, cy: 880 } };

const mkCohort = (id, name, type, men, maxMen, xp, drill, officerId = null) => ({ id, name, type, men, maxMen, xp, drill, condition: 100, officerId });

// ---------------- practice battle ----------------
export const PRACTICE_OPTIONS = {
  army: { grand: 'Grand (70 units: the army you will have at the end)', small: 'Small (2 cohorts, slingers, cavalry)', medium: 'Medium (4 cohorts, slingers, archers, 2 cavalry)', large: 'Large (8 cohorts, 2 missile units, 2 cavalry)' },
  enemy: { grand: 'Grand (70 units)', small: 'Small (about 900 men)', medium: 'Medium (about 1,800 men)', large: 'Large (about 3,200 men)', elite: 'Elite (champions and nobles)' },
  terrain: { open: 'Open field', ford: 'River ford', hill: 'Hill in the centre', forest: 'Forests on the flanks' },
  tactics: { rush: 'Rush: all-out charge', ambush: 'Ambush: waits until you approach', mixed: 'Mixed: skirmishers, flankers and a charge' },
  difficulty: { easy: 'Tiro', normal: 'Miles', hard: 'Centurion', legendary: 'Imperator' }
};
export const PRACTICE_DEFAULTS = { army: 'medium', enemy: 'medium', terrain: 'open', tactics: 'mixed', difficulty: 'normal' };

const ARMIES = {
  small: [['I Cohort', 'legionary', 480], ['II Cohort', 'legionary', 480], ['Balearic Slingers', 'slinger', 150], ['Equites Turma', 'equites', 60]],
  medium: [['I Cohort', 'legionary', 480], ['II Cohort', 'legionary', 480], ['III Cohort', 'legionary', 480], ['IV Cohort', 'legionary', 480], ['Balearic Slingers', 'slinger', 150], ['Cretan Archers', 'archer', 130], ['Equites Turma', 'equites', 60], ['Allied Gallic Horse', 'aux_cav', 70]],
  large: [['I Cohort', 'legionary', 480], ['II Cohort', 'legionary', 480], ['III Cohort', 'legionary', 480], ['IV Cohort', 'legionary', 480], ['V Cohort', 'legionary', 480], ['VI Cohort', 'legionary', 480], ['VII Cohort', 'legionary', 480], ['VIII Cohort', 'legionary', 480],
    ['Balearic Slingers', 'slinger', 150], ['Cretan Archers', 'archer', 130], ['Equites Turma', 'equites', 60], ['Allied Gallic Horse', 'aux_cav', 70]]
};
// The late-game scale: about seventy units a side on a four-thousand-unit field.
const GRAND_ARMY = [...Array.from({ length: 36 }, (_, i) => [`Cohort ${i + 1}`, 'legionary', 480]), ...Array.from({ length: 10 }, (_, i) => [`Allied Foot ${i + 1}`, 'aux_inf', 300]),
  ...Array.from({ length: 8 }, (_, i) => [`Slingers ${i + 1}`, 'slinger', 150]), ...Array.from({ length: 8 }, (_, i) => [`Archers ${i + 1}`, 'archer', 130]), ...Array.from({ length: 8 }, (_, i) => [`Turma ${i + 1}`, 'equites', 60])];
const GRAND_ENEMY = [...Array.from({ length: 34 }, () => ['warband', 480]), ...Array.from({ length: 10 }, () => ['gaul_elite', 300]), ...Array.from({ length: 14 }, () => ['gaul_skirm', 150]), ...Array.from({ length: 12 }, () => ['gaul_cav', 70])];
const ENEMIES = {
  small: [['warband', 240], ['warband', 240], ['warband', 220], ['gaul_skirm', 100], ['gaul_cav', 50]],
  medium: [['warband', 280], ['warband', 280], ['warband', 260], ['warband', 260], ['warband', 240], ['gaul_elite', 180], ['gaul_skirm', 110], ['gaul_skirm', 100], ['gaul_cav', 60]],
  large: [['warband', 300], ['warband', 300], ['warband', 300], ['warband', 280], ['warband', 280], ['warband', 280], ['warband', 260], ['warband', 260], ['gaul_elite', 250], ['gaul_elite', 250], ['gaul_skirm', 120], ['gaul_skirm', 120], ['gaul_skirm', 110], ['gaul_cav', 70], ['gaul_cav', 60]],
  elite: [['gaul_elite', 280], ['gaul_elite', 280], ['gaul_elite', 260], ['gaul_elite', 260], ['warband', 260], ['warband', 260], ['gaul_skirm', 120], ['gaul_cav', 80], ['gaul_cav', 70]]
};
ARMIES.grand = GRAND_ARMY; ENEMIES.grand = GRAND_ENEMY;
const TERRAINS = {
  open: [],
  ford: [{ kind: 'water', x: 0, y: 450, w: 650, h: 80 }, { kind: 'ford', x: 650, y: 450, w: 300, h: 80 }, { kind: 'water', x: 950, y: 450, w: 650, h: 80 }],
  hill: [{ kind: 'hill', cx: 800, cy: 520, rx: 300, ry: 130 }],
  forest: [{ kind: 'forest', cx: 250, cy: 480, rx: 260, ry: 220 }, { kind: 'forest', cx: 1350, cy: 480, rx: 260, ry: 220 }]
};

export function buildPractice(o) {
  const opt = { ...PRACTICE_DEFAULTS, ...o };
  const c = newCampaign(opt.difficulty);
  c.cohorts = ARMIES[opt.army].map(([name, type, max], i) => mkCohort(i + 1, name, type, max, max, 90, 35, null));
  // officers: the first three legion cohorts get a centurion/tribune, the first cavalry unit gets the prefect
  c.cohorts.filter(h => h.type === 'legionary').slice(0, 3).forEach((h, i) => { h.officerId = i + 1; });
  const cav = c.cohorts.find(h => h.type === 'equites'); if (cav) cav.officerId = 4;
  const list = ENEMIES[opt.enemy], n = list.length, enemy = [], grand = opt.army === 'grand' || opt.enemy === 'grand';
  list.forEach(([type, men], i) => {
    const x = n === 1 ? 800 : 220 + (1160 * i) / (n - 1), y = 180 + (i % 3) * 55 + (type === 'gaul_cav' ? -40 : 0), cat = type === 'gaul_skirm' ? 'skirm' : type === 'gaul_cav' ? 'cav' : 'inf';
    let ai;
    if (cat === 'skirm') ai = { kind: 'skirm' };
    else if (opt.tactics === 'rush') ai = { kind: 'rush', delay: 3 + (i % 4) * 3 };
    else if (opt.tactics === 'ambush') ai = { kind: 'ambush', trigger: 260, maxDelay: 400, quiet: true };
    else ai = cat === 'cav' ? { kind: 'flank', delay: 30 } : i % 3 === 0 ? { kind: 'ambush', trigger: 240, maxDelay: 120, quiet: true } : { kind: 'rush', delay: 5 + (i % 4) * 4 };
    enemy.push({ type, men, x, y, ai });
  });
  const scn = { ...BASE, id: 'practice', name: grand ? 'Grand Practice Battle' : 'Practice Battle', briefing: 'Free practice. Nothing here affects your campaign.', objective: 'Break the enemy host, or withdraw in good order.', terrain: TERRAINS[opt.terrain].map(f => ({ ...f })), enemy };
  if (grand) {
    enemy.length = 0; const k = 2.5; scn.terrain = scn.terrain.map(f => ({ ...f })); scn.deploy = { ...scn.deploy };
    const tmp = { terrain: scn.terrain, enemy: [], reinforcements: [], objectives: [], deploy: scn.deploy, timeLimit: 2400 }; scaleScenario(tmp, k); scn.world = tmp.world; scn.timeLimit = 2400; scn.deploy = tmp.deploy;
    // enemy ranks: infantry in rows of fourteen across the field, champions behind, skirmishers in front, horse on the wings
    const inf = list.filter(([t]) => t === 'warband'), elite = list.filter(([t]) => t === 'gaul_elite'), skirm = list.filter(([t]) => t === 'gaul_skirm'), cav = list.filter(([t]) => t === 'gaul_cav');
    const W = scn.world.w, row = (arr, y0, per, dx, ai) => arr.forEach(([type, men], i) => { const r = Math.floor(i / per), kk = i % per, cnt = Math.min(per, arr.length - r * per); enemy.push({ type, men, x: W / 2 + (kk - (cnt - 1) / 2) * dx, y: y0 + r * 130, ai: ai(i) }); });
    row(skirm, 520, 14, 190, () => ({ kind: 'skirm' }));
    row(inf, 760, 14, 215, (i) => ({ kind: 'rush', delay: 3 + (i % 5) }));
    row(elite, 1060, 10, 215, () => ({ kind: 'rush', delay: 3 }));
    cav.forEach(([type, men], i) => enemy.push({ type, men, x: W / 2 + (i % 2 ? 1 : -1) * (1500 + Math.floor(i / 2) * 90), y: 760 + (i % 3) * 60, ai: { kind: 'flank', delay: 40 } }));
  }
  return { scn, campaign: c, opts: opt };
}
