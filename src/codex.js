// The Commentarii: a book that fills in as you play. Every commander you meet, every place you fight and every kind of troops you see
// gets an entry, with what the ancient writers say. Paraphrased unless marked as a quotation; the source is given each time.
import { SCENARIOS, UNIT_TYPES, HISTORY } from './data.js';
import { esc } from './ui.js';

export const PEOPLE = {
  caesar: ['Gaius Julius Caesar', 'Proconsul of Gaul from 58 BC, later dictator. He wrote his own account of these wars, the Commentarii, in the third person. It opens: "Gallia est omnis divisa in partes tres" (all Gaul is divided into three parts).', 'Caesar, Gallic War I.1'],
  labienus: ['Titus Labienus', 'Caesar\'s ablest legate in Gaul, trusted with whole armies. In 49 BC he went over to Pompey, and fought Caesar at Pharsalus, Ruspina and Munda, where he fell.', 'Caesar, Gallic War; Bellum Hispaniense 31'],
  crassus: ['Publius Licinius Crassus', 'The young commander of Caesar\'s cavalry in 58 BC. Against Ariovistus he saw the Roman left giving way and sent the third line to save it.', 'Caesar, Gallic War I.52'],
  divico: ['Divico', 'An old Helvetian chief who had beaten a Roman army in 107 BC. He told Caesar the Helvetii were used to taking hostages, not giving them.', 'Caesar, Gallic War I.13-14'],
  dumnorix: ['Dumnorix', 'An ambitious Aeduan noble who secretly helped the Helvetii. Caesar spared him for his brother\'s sake; he was killed in 54 BC trying to escape Caesar\'s camp.', 'Caesar, Gallic War I.18-20, V.7'],
  ariovistus: ['Ariovistus', 'King of the Suebi, settled west of the Rhine on land taken from the Sequani. Beaten in 58 BC, he escaped across the Rhine in a small boat.', 'Caesar, Gallic War I.31-53'],
  cassivellaunus: ['Cassivellaunus', 'The British war leader north of the Thames in 54 BC. He harried Caesar with chariots, then sued for peace and gave hostages.', 'Caesar, Gallic War V.11-22'],
  vercingetorix: ['Vercingetorix', 'A young Arvernian noble who united Gaul against Caesar in 52 BC, beat him at Gergovia, and was trapped at Alesia. He surrendered there, was kept prisoner for six years, shown in Caesar\'s triumph and then put to death.', 'Caesar, Gallic War VII; Plutarch, Caesar 27; Cassius Dio 40.41, 43.19'],
  vercassivellaunus: ['Vercassivellaunus', 'Cousin of Vercingetorix. At Alesia he led sixty thousand picked men against the weak camp below Mont Rea, and was taken alive.', 'Caesar, Gallic War VII.83-88'],
  curio: ['Gaius Scribonius Curio', 'A brilliant young tribune who went over to Caesar in 50 BC and was sent to take Africa. Trapped at the Bagradas, he refused to leave his men and died fighting.', 'Caesar, Civil War II.23-42'],
  varus: ['Publius Attius Varus', 'The Pompeian governor of Africa in 49 BC. Beaten by Curio at Utica, he was saved by King Juba. He died at Munda.', 'Caesar, Civil War II.23-44'],
  juba: ['Juba I of Numidia', 'King of Numidia and Pompey\'s ally. He destroyed Curio at the Bagradas and fought with Scipio at Thapsus; after the defeat he took his own life.', 'Caesar, Civil War II.40-44; Bellum Africum 94'],
  pompey: ['Gnaeus Pompeius Magnus', 'Rome\'s greatest general before Caesar, and his son-in-law until Julia died. Beaten at Pharsalus in 48 BC, he fled to Egypt and was murdered as he stepped ashore.', 'Caesar, Civil War III.82-104; Plutarch, Pompey 77-80'],
  calvinus: ['Gnaeus Domitius Calvinus', 'Caesar\'s general in the East. He attacked Pharnaces at Nicopolis with a scratch army and was beaten, though his veterans got away in good order.', 'Bellum Alexandrinum 34-40'],
  pharnaces: ['Pharnaces II', 'Son of Mithridates the Great, king of the Bosporus. He seized Pontus while Rome fought itself, beat Calvinus, and was routed by Caesar at Zela in a few hours: "veni, vidi, vici".', 'Bellum Alexandrinum 34-77; Suetonius, Julius 37'],
  scipio: ['Quintus Caecilius Metellus Scipio', 'Pompey\'s father-in-law, commander of the Pompeians in Africa. Beaten at Thapsus in 46 BC, he died at sea trying to escape.', 'Bellum Africum'],
  gnaeus: ['Gnaeus Pompeius the Younger', 'Pompey\'s elder son. He raised Spain against Caesar and fought him at Munda in 45 BC; he was caught and killed a few weeks later.', 'Bellum Hispaniense'],
  deiotarus: ['Deiotarus', 'King of Galatia, who armed and drilled his men as Roman legions. Two of them fought for Calvinus against Pharnaces.', 'Bellum Alexandrinum 34']
};
const PEOPLE_AT = { arar: ['divico'], silva: ['dumnorix'], bibracte: ['labienus'], parley: ['ariovistus'], supply: ['ariovistus'], ariovistus: ['ariovistus', 'crassus'],
  cassivellaunus: ['cassivellaunus'], gergovia: ['vercingetorix'], vingeanne: ['vercingetorix'], alesia: ['vercingetorix', 'vercassivellaunus', 'labienus'],
  anquillaria: ['curio', 'varus'], utica: ['curio', 'varus'], water: ['juba'], bagradas: ['curio', 'juba'], pharsalus: ['pompey', 'labienus'], comana: ['calvinus', 'deiotarus', 'pharnaces'],
  nicopolis: ['calvinus', 'pharnaces'], zela: ['pharnaces'], ruspina: ['labienus'], uzitta: ['scipio'], thapsus: ['scipio', 'juba'], munda: ['gnaeus', 'labienus', 'varus'] };
const TROOP_NOTES = {
  legionary: 'A cohort of about 480 men, six centuries; ten cohorts made a legion. Each man carried two pila, the short sword (gladius), an oval shield and a mail shirt (Polybius 6.23; Caesar passim).',
  evocati: 'Time-served soldiers recalled to the standards, prized for their steadiness; both sides used them in the civil wars (Caesar, Civil War III.88).',
  equites: 'By Caesar\'s day Rome\'s cavalry came almost entirely from allies: Gauls, then Germans (Caesar, Gallic War I.15, VII.13).',
  slinger: 'Slingers from the Balearic islands were famous; lead shot was cast with mottoes, and could break bone through armour (Caesar, Gallic War II.7).',
  archer: 'Cretan archers served Rome as mercenaries for centuries (Caesar, Gallic War II.7).',
  scorpion: 'A torsion bolt-thrower worked by a small crew. At the landing in Britain Caesar used them from his warships to drive the Britons from the beach (Gallic War IV.25).',
  ballista: 'Heavier torsion engines used against walls and towns, as at Avaricum (Caesar, Gallic War VII.25).',
  medici: 'Roman armies carried surgeons and orderlies; Caesar mentions his care for the wounded after Bibracte (Gallic War I.26).',
  warband: 'Gallic warriors fought in a dense mass behind their shields, trusting to a first terrible rush (Caesar, Gallic War I.24-25).',
  gaul_elite: 'Noble warriors and their sworn followers, better armed than the rest (Caesar, Gallic War VI.15).',
  gaul_cav: 'The Gallic nobility fought on horseback, and their cavalry was the best in Gaul (Caesar, Gallic War VI.15).',
  suebi: 'The Suebi were the largest and most warlike of the Germans (Caesar, Gallic War IV.1).',
  german_cav: 'German horsemen fought with fast foot runners who held on to the horses\' manes (Caesar, Gallic War I.48).',
  brit_chariot: 'British chariots drove along the enemy line throwing javelins, set warriors down to fight on foot, and carried them off again (Caesar, Gallic War IV.33).',
  numid_cav: 'Numidian horsemen rode without bridles, threw javelins and wheeled away before they could be caught (Caesar, Civil War II.41).',
  elephant: 'Juba\'s elephants were a terror at Thapsus until slingers and archers turned them on their own line (Bellum Africum 83-84).',
  pompeian: 'Pompey\'s legions were armed and drilled exactly like Caesar\'s: Roman against Roman.',
  pontic: 'Pharnaces armed some of his foot in the Roman way (Bellum Alexandrinum 34).',
  chariot: 'Scythed chariots led Pharnaces\' attack up the hill at Zela (Bellum Alexandrinum 75).',
  horse_archer: 'Horse archers of the steppe shot from the saddle and fell back shooting when charged.',
  lancer: 'Sarmatian nobles fought as armoured lancers, heavy and hard to stop head-on.'
};

// What the book contains for this campaign so far.
export function unlockCodex(c, scn, result) {
  const k = c.codex = c.codex || { people: ['caesar'], places: [], troops: [] }, add = (arr, v) => { if (v && !arr.includes(v)) arr.push(v); };
  if (!scn || scn.id === 'prologue') return;
  add(k.places, scn.id);
  for (const p of PEOPLE_AT[scn.id] || []) add(k.people, p);
  for (const e of [...(scn.enemy || []), ...(scn.reinforcements || []).map(r => r.unit)]) if (e && UNIT_TYPES[e.type]) add(k.troops, e.type);
  for (const h of c.cohorts) add(k.troops, h.type);
}
// Rebuild from the campaign's history (for campaigns begun before the book existed).
export function codexFromHistory(c) {
  for (const h of c.history || []) if (h.outcome !== 'skipped') { const s = SCENARIOS.find(x => x.id === h.id); if (s) unlockCodex(c, s); }
  unlockCodex(c, null); c.codex = c.codex || { people: ['caesar'], places: [], troops: [] }; for (const h of c.cohorts) if (!c.codex.troops.includes(h.type)) c.codex.troops.push(h.type);
}
export function codexCount(c) {
  const k = c.codex || { people: [], places: [], troops: [] }, total = Object.keys(PEOPLE).length + SCENARIOS.length + Object.keys(TROOP_NOTES).length;
  return { have: k.people.length + k.places.length + k.troops.filter(t => TROOP_NOTES[t]).length, total };
}
export function showCodex(c, tab = 'people') {
  const k = c.codex || { people: ['caesar'], places: [], troops: [] };
  let el = document.getElementById('codex'); if (!el) { el = document.createElement('div'); el.id = 'codex'; document.body.appendChild(el); }
  const entry = (title, text, src, sub = '') => `<div class="cxe"><h4>${esc(title)}${sub ? ` <span class="muted small">${esc(sub)}</span>` : ''}</h4><p>${esc(text)}</p>${src ? `<div class="muted small">${esc(src)}</div>` : ''}</div>`;
  const locked = (n) => n > 0 ? `<div class="cxe locked muted small">${n} more ${n === 1 ? 'entry' : 'entries'} still to be written.</div>` : '';
  let body = '';
  if (tab === 'people') { const ks = Object.keys(PEOPLE).filter(p => k.people.includes(p)); body = ks.map(p => entry(PEOPLE[p][0], PEOPLE[p][1], PEOPLE[p][2])).join('') + locked(Object.keys(PEOPLE).length - ks.length); }
  if (tab === 'places') { const ss = SCENARIOS.filter(s => k.places.includes(s.id)); body = ss.map(s => { const h = HISTORY[s.id]; return entry(s.name, [s.geo && s.geo.note, h && h.text].filter(Boolean).join('. ') + '.', h ? h.source : '', `${s.geo ? s.geo.place : ''}, ${s.year}`); }).join('') + locked(SCENARIOS.length - ss.length); }
  if (tab === 'troops') { const ts = Object.keys(TROOP_NOTES).filter(t => k.troops.includes(t)); body = ts.map(t => entry(UNIT_TYPES[t].name, `${UNIT_TYPES[t].blurb || ''} ${TROOP_NOTES[t]}`, '')).join('') + locked(Object.keys(TROOP_NOTES).length - ts.length); }
  const n = codexCount(c);
  el.innerHTML = `<div class="cxbox"><div class="cxhead"><div><h2>Commentarii</h2><div class="muted small">${n.have} of ${n.total} entries. More appear as you play.</div></div><button id="cx-close">Close</button></div>
    <div class="chips" style="margin:8px 0">${[['people', 'People'], ['places', 'Places'], ['troops', 'Troops']].map(([id, nm]) => `<button class="chip ${tab === id ? 'sel' : ''}" data-cx="${id}">${nm}</button>`).join('')}</div><div class="cxbody">${body || '<p class="muted">Nothing yet.</p>'}</div></div>`;
  el.classList.remove('hidden');
  el.querySelector('#cx-close').onclick = () => el.classList.add('hidden');
  el.querySelectorAll('[data-cx]').forEach(b => b.onclick = () => showCodex(c, b.dataset.cx));
  el.onclick = (e) => { if (e.target === el) el.classList.add('hidden'); };
}
