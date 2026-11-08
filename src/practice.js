// Tutorial scenario and configurable practice battles. Neither touches the campaign (no rewards, no saves).
import { newCampaign } from './state.js';

const BASE = { act: 'P', theater: 'Training ground', year: '', kind: 'practice', timeLimit: 900, daysToPrepare: 0, reinforcements: [], objectives: [], rule: null,
  rewards: { gold: 0, supplies: 0, recruits: 0, xpBase: 0, officerXp: 0 }, rewardMult: 0, unlock: [], deploy: { mode: 'line', cx: 800, cy: 880 } };

const mkCohort = (id, name, type, men, maxMen, xp, drill, officerId = null) => ({ id, name, type, men, maxMen, xp, drill, condition: 100, officerId });

// ---------------- tutorial ----------------
export function buildTutorial() {
  const c = newCampaign('easy');
  c.cohorts = [
    mkCohort(1, 'I Cohort', 'legionary', 420, 480, 120, 40, 1),
    mkCohort(2, 'II Cohort', 'legionary', 400, 480, 60, 30, 2),
    mkCohort(3, 'Balearic Slingers', 'slinger', 120, 150, 40, 20),
    mkCohort(4, 'Equites Turma', 'equites', 50, 60, 40, 25, 4)
  ];
  const scn = {
    ...BASE, id: 'tutorial', name: 'Training Ground', briefing: 'A guided practice battle.', objective: 'Follow the instructions, then break the training host.',
    terrain: [{ kind: 'hill', cx: 1250, cy: 700, rx: 170, ry: 95 }, { kind: 'forest', cx: 330, cy: 420, rx: 190, ry: 110 }, { kind: 'forest', cx: 1300, cy: 300, rx: 140, ry: 80 }],
    enemy: [
      { type: 'warband', men: 120, x: 800, y: 470, ai: { kind: 'idle', tag: 'dummy' } },
      { type: 'warband', men: 200, x: 620, y: 300, ai: { kind: 'idle', tag: 'A' } },
      { type: 'warband', men: 170, x: 1000, y: 320, ai: { kind: 'idle', tag: 'B' } }
    ]
  };
  return { scn, campaign: c };
}

// ---------------- practice battle ----------------
export const PRACTICE_OPTIONS = {
  army: { small: 'Small (2 cohorts, slingers, cavalry)', medium: 'Medium (4 cohorts, slingers, archers, 2 cavalry)', large: 'Large (8 cohorts, 2 missile units, 2 cavalry)' },
  enemy: { small: 'Small (about 900 men)', medium: 'Medium (about 1,800 men)', large: 'Large (about 3,200 men)', elite: 'Elite (champions and nobles)' },
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
const ENEMIES = {
  small: [['warband', 240], ['warband', 240], ['warband', 220], ['gaul_skirm', 100], ['gaul_cav', 50]],
  medium: [['warband', 280], ['warband', 280], ['warband', 260], ['warband', 260], ['warband', 240], ['gaul_elite', 180], ['gaul_skirm', 110], ['gaul_skirm', 100], ['gaul_cav', 60]],
  large: [['warband', 300], ['warband', 300], ['warband', 300], ['warband', 280], ['warband', 280], ['warband', 280], ['warband', 260], ['warband', 260], ['gaul_elite', 250], ['gaul_elite', 250], ['gaul_skirm', 120], ['gaul_skirm', 120], ['gaul_skirm', 110], ['gaul_cav', 70], ['gaul_cav', 60]],
  elite: [['gaul_elite', 280], ['gaul_elite', 280], ['gaul_elite', 260], ['gaul_elite', 260], ['warband', 260], ['warband', 260], ['gaul_skirm', 120], ['gaul_cav', 80], ['gaul_cav', 70]]
};
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
  const list = ENEMIES[opt.enemy], n = list.length, enemy = [];
  list.forEach(([type, men], i) => {
    const x = n === 1 ? 800 : 220 + (1160 * i) / (n - 1), y = 180 + (i % 3) * 55 + (type === 'gaul_cav' ? -40 : 0), cat = type === 'gaul_skirm' ? 'skirm' : type === 'gaul_cav' ? 'cav' : 'inf';
    let ai;
    if (cat === 'skirm') ai = { kind: 'skirm' };
    else if (opt.tactics === 'rush') ai = { kind: 'rush', delay: 3 + (i % 4) * 3 };
    else if (opt.tactics === 'ambush') ai = { kind: 'ambush', trigger: 260, maxDelay: 400, quiet: true };
    else ai = cat === 'cav' ? { kind: 'flank', delay: 30 } : i % 3 === 0 ? { kind: 'ambush', trigger: 240, maxDelay: 120, quiet: true } : { kind: 'rush', delay: 5 + (i % 4) * 4 };
    enemy.push({ type, men, x, y, ai });
  });
  const scn = { ...BASE, id: 'practice', name: 'Practice Battle', briefing: 'Free practice. Nothing here affects your campaign.', objective: 'Break the enemy host, or withdraw in good order.', terrain: TERRAINS[opt.terrain], enemy };
  return { scn, campaign: c, opts: opt };
}
