// One short tip the first time each newer mechanic becomes yours, shown on the campaign map between battles (one at a time).
import { SCENARIOS } from './data.js';

const TIPS = [
  { id: 'pay', when: (c) => (c.history || []).filter(h => h.id !== 'prologue').length >= 1, title: 'Pay', text: 'The army is paid after every battle (shown next to your denarii). If you cannot pay, men desert.' },
  { id: 'slots', when: (c) => c.cohorts.some(h => ['archer', 'slinger', 'equites', 'aux_cav'].includes(h.type)) && (c.history || []).length >= 3, title: 'Command slots', text: 'Horse, missile troops, engines and medici take only half a command slot. A mixed army fights better than legions alone.' },
  { id: 'stores', when: (c) => c.captured && (c.captured.mail || c.captured.arms || c.captured.horses), title: 'Captured stores', text: 'Arms and horses taken in battle make gear cheaper at the Armourer and horse cheaper at the Barracks.' },
  { id: 'works', when: (c) => (c.doctrines || []).includes('works'), title: 'Fieldworks', text: 'In battles where you defend, select infantry during deployment and press ; to dig a ditch and rampart in front of them.' },
  { id: 'spec', when: (c) => c.cohorts.some(h => h.xp >= 700 && h.type === 'legionary'), title: 'Veterans', text: 'A cohort that reaches Veteran picks how it will fight from then on: Line, Shock or Garrison (at the Training Ground).' },
  { id: 'medici', when: (c) => (c.hospital || 0) >= 3, title: 'Medici', text: 'Your hospital can now train medici. Units that lose men inside their ring get more of them back.' },
  { id: 'rome', when: (c) => (c.standing ?? 30) >= 36, title: 'Standing in Rome', text: 'Your standing can be spent at the Officers\' tent (Letters to Rome) on funds, grain, veterans, an officer or a larger command.' },
  { id: 'evocati', when: (c) => (c.unlockedTypes || []).includes('evocati'), title: 'Evocati', text: 'Raise evocati at the Barracks with 400 of your waiting veterans: the steadiest foot you can field.' },
  { id: 'ballista', when: (c) => (c.unlockedTypes || []).includes('ballista'), title: 'Ballistae', text: 'Siege engines come only to assaults and wagon camps, where they wreck walls, wagons and the men behind them.' },
  { id: 'codex', when: (c) => (c.history || []).filter(h => h.id !== 'prologue').length >= 2, title: 'The Commentarii', text: 'The book on the campaign map fills in as you play: people, places and troops, with what the ancient writers say.' }
];
export function pendingTip(c) {
  if (!SCENARIOS[c.scenario] || c.over) return null;
  const seen = c.tipsSeen || [];
  return TIPS.find(t => !seen.includes(t.id) && t.when(c)) || null;
}
export function markTip(c, t) { c.tipsSeen = [...(c.tipsSeen || []), t.id]; }
