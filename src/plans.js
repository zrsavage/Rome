// Battle plans and bonus goals. Before each battle the enemy commander picks a plan from his habits (his style), so the same battle plays
// differently from one attempt to the next; scouts can tell you which. Each battle also sets you one bonus goal: meet it in a victory for
// extra denarii and standing in Rome.

// The plans tune the enemy host's existing machinery (sim.js: the battle line, the surge, wings, feints, reserves, champions):
//   surgeWait  seconds the line waits, halted short of you, before it charges     wingEvery  every n-th line unit swings wide (0: none)
//   bothSides  wings split to both flanks           feints   extra feigned flights       stage  how far short of you the line halts
//   focus      everything goes at one weak point    raid     wings and horse ride for your baggage   trap  reserves fall on cohorts that chase
export const PLANS = {
  frontal: { name: 'Head-on assault', surgeWait: 6, wingEvery: 0,
    hint: 'means to come straight at you with everything at once, before you are set.', reveal: 'The whole host comes straight at you!' },
  envelop: { name: 'Double envelopment', surgeWait: 40, wingEvery: 2, bothSides: true,
    hint: 'means to hold your centre and send warriors wide round both your flanks.', reveal: 'They are going round both your flanks!' },
  feigned: { name: 'Feigned flight', surgeWait: 45, feints: 2, trap: true, gallic: true,
    hint: 'will send men forward to run away, to draw your cohorts out of the line into his reserve.', reveal: 'Their flight was a trap: the reserve falls on the cohorts that gave chase!' },
  hammer: { name: 'Hammer blow', surgeWait: 18, wingEvery: 0, focus: true,
    hint: 'will mass his best men against the weakest part of your line.', reveal: 'They are massing against one part of your line!' },
  attrition: { name: 'Wear them down', surgeWait: 110, stage: 700, wingEvery: 5,
    hint: 'will hold back and let his missiles and skirmishers bleed you before he closes.', reveal: 'At last their line comes on, now that your men are worn.' },
  raid: { name: 'Strike the baggage', surgeWait: 30, wingEvery: 3, raid: true,
    hint: 'has told off men and horse to fall on your baggage train while you are busy.', reveal: 'Riders are making for your baggage!' }
};
// Which plans each kind of commander likes (weights).
const BY_STYLE = {
  aggressive: { frontal: 4, hammer: 3, envelop: 2, raid: 1 },
  cautious: { attrition: 4, hammer: 2, envelop: 1, feigned: 1 },
  cunning: { feigned: 3, raid: 3, envelop: 3, hammer: 1 },
  stubborn: { frontal: 3, attrition: 3, hammer: 2 },
  balanced: { frontal: 2, envelop: 2, hammer: 2, attrition: 2, feigned: 1, raid: 1 }
};
// A small, steady hash: the same campaign, battle and attempt always get the same plan and goal (the briefing and the battle agree).
export function seeded(...parts) { let h = 2166136261; for (const ch of parts.join('|')) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; }
const pickW = (w, r) => { const e = Object.entries(w).filter(([, v]) => v > 0), tot = e.reduce((a, [, v]) => a + v, 0); let x = r * tot; for (const [k, v] of e) { if ((x -= v) < 0) return k; } return e[0][0]; };
const legionFoe = (scn) => (scn.enemy || []).filter(e => ['pompeian', 'pomp_levy', 'pontic'].includes(e.type)).length >= (scn.enemy || []).length * 0.5;
// The plan for a battle; `r` is a number in [0, 1) (seeded from the campaign, or the battle's own dice in practice).
export function choosePlan(scn, style, r) {
  if (!scn || scn.id === 'prologue') return null;
  const w = { ...(BY_STYLE[style] || BY_STYLE.balanced) };
  if (legionFoe(scn)) delete w.feigned;                         // feigned flight is a Gallic and German trick, not a legion's
  return pickW(w, r);
}
export function planFor(c, scn, style, attempt = 0) { return choosePlan(scn, style, seeded(c.cid || c.player?.name || 'x', scn.id, scn.phaseIdx ?? '', attempt, 'plan')); }

// ---------- bonus goals ----------
export const GOALS = {
  light: { name: 'Light losses', text: () => 'Win losing fewer than 12% of your men.' },
  swift: { name: 'Swift victory', text: (scn) => `Win within ${Math.round(scn.timeLimit * 0.5 / 60)} minutes.` },
  chief: { name: 'Break the chief', text: (scn) => `Break or destroy ${chiefBand(scn)} (marked with a star).` },
  captives: { name: 'Prisoners', text: () => 'Win and take prisoners: at least a tenth of their host.' },
  unbroken: { name: 'Unbroken', text: () => 'Win without any unit of yours breaking and running.' }
};
export const chiefBand = (scn) => { const n = scn.chief && scn.chief.name; return n && !/^the /i.test(n) ? `${n}'s guard` : 'the chief\'s guard'; };
export function chooseGoal(scn, r) {
  if (!scn || scn.id === 'prologue') return null;
  const w = { light: 2, swift: 2, captives: 2, unbroken: 2, chief: scn.chief ? 3 : 0 };
  return pickW(w, r);
}
export function goalFor(c, scn, attempt = 0) { return chooseGoal(scn, seeded(c.cid || c.player?.name || 'x', scn.id, scn.phaseIdx ?? '', attempt, 'goal')); }
export const GOAL_REWARD = { gold: 150, standing: 3 };
