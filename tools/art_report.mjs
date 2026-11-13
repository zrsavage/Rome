// Art shot list: node tools/art_report.mjs [--write]
// Builds every prompt from game data, shows which assets already exist (assets/art/manifest.json), and can write docs/ART_SHOTLIST.md.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { UNIT_TYPES, SCENARIOS } from '../src/data.js';
import { newCampaign } from '../src/state.js';

const manifest = existsSync('assets/art/manifest.json') ? JSON.parse(readFileSync('assets/art/manifest.json', 'utf8')) : {};
const have = (k, id) => !!(manifest[k] && manifest[k][id]);

const STYLE = 'painterly digital illustration, muted earthy palette, dramatic natural light, historically grounded, game art, no text, no watermark';
const ACCURACY = 'Late Roman Republic, 58 BC (Caesar\'s Gallic Wars): Montefortino or Coolus bronze helmet, mail shirt (lorica hamata) with shoulder doubling, ' +
  'curved oval/rectangular scutum with thunderbolt, gladius Hispaniensis, pilum, hobnailed caligae, red woollen tunic. NOT segmentata plate armour, NOT Imperial-era kit, NOT gladiator armour.';
const GAUL = 'Gaulish warrior of 58 BC: long moustache, torc, woollen trousers (bracae) and checked cloak, long oval shield, long iron sword, some wearing mail and Coolus/Gallic helmets; NOT Viking, NOT fantasy barbarian.';
const SUBJECT = {
  legionary: `Roman legionary infantryman in formation. ${ACCURACY}`,
  slinger: 'Balearic slinger, light tunic, sling in hand, pouch of lead glandes, no armour, Mediterranean skirmisher of the 1st century BC',
  archer: 'Cretan archer auxiliary, composite bow, conical bronze helmet, short tunic, quiver, 1st century BC Roman mercenary',
  equites: `Roman Republican cavalryman (eques) on a horse, mail shirt, oval cavalry shield, spear. ${ACCURACY}`,
  aux_cav: 'Allied Gallic cavalryman serving Rome, Celtic horseman in mail and Gallic helmet, oval shield, spear, red Roman-allied sash, 58 BC',
  warband: GAUL, gaul_skirm: `Gallic javelin skirmisher, unarmoured, bundle of javelins, small shield. ${GAUL}`,
  gaul_elite: `Gallic noble champion with retinue, mail shirt, decorated helmet, gold torc, long sword. ${GAUL}`,
  gaul_cav: `Gallic noble horseman, mail shirt, Celtic helmet, long spear and oval shield. ${GAUL}`,
  aux_inf: `Allied Gallic infantryman in Roman pay, mail shirt, iron cap, long oval Celtic shield, spear. ${GAUL}`,
  baggage: 'Roman legion baggage wagon train, ox-drawn carts with leather covers, mules, camp servants, 1st century BC',
  antesignani: `Picked Roman legionaries skirmishing ahead of the standards with javelins. ${ACCURACY}`,
  suebi: 'Suebian Germanic warrior of 58 BC, hair tied in a knot at the side of the head (the Suebian knot), bare-chested or wool cloak, painted wooden board shield, short-bladed spear (framea); NOT Viking, NO horned helmets',
  german_cav: 'Germanic horseman of 58 BC on a small horse without saddle, spear and small shield, with a light-armed foot runner holding the horse\'s mane beside him (Caesar, Gallic War I.48); NOT Viking',
  laager: 'Germanic wagon laager of 58 BC: a ring of wooden ox-carts with hide covers, women standing on the wagons, families and goods',
  numid_cav: 'Numidian light horseman of 49 BC riding bareback with no bridle, only a neck rope, short tunic, small round leather shield, a bundle of light javelins, dark curly hair, North African; NOT Arab, NOT medieval',
  numid_inf: 'Numidian light infantryman of 49 BC, short tunic, small round leather shield, javelins, North African; NOT Arab, NOT medieval',
  elephant: 'North African forest war elephant of 49 BC with a driver (mahout) on its neck, smaller than an Indian elephant, large ears, NO tower or howdah, painted saddle-cloth',
  pompeian: `Roman legionary of the Pompeian army, 49-45 BC: identical kit to Caesar's men (Montefortino helmet, mail, scutum, pilum, gladius), shield painted blue-grey. NOT segmentata, NOT Imperial kit`,
  pomp_cav: 'Allied horseman in Pompey\'s army at Pharsalus, 48 BC: Galatian or Thracian noble cavalryman in mail with spear and round shield',
  pomp_missile: 'Eastern archer and slinger in Pompey\'s army, 48 BC: Cretan and Syrian archers with composite bows, short tunics, no armour',
  pontic: 'Pontic infantryman of King Pharnaces II, 47 BC, armed and drilled in the Roman manner: bronze helmet, mail shirt, oval shield, short sword and javelin, purple-red tunic',
  horse_archer: 'Sarmatian horse archer of the 1st century BC (steppe people north of the Black Sea): pointed felt cap, belted coat and trousers, short recurved composite bow, gorytos bow-case at the hip, small steppe horse; NOT Mongol, NOT Hun',
  lancer: 'Sarmatian noble lancer of the 1st century BC: horse and rider in scale armour, conical iron helmet, very long two-handed lance (kontos); NOT medieval knight, NO stirrups',
  chariot: 'Pontic scythed chariot, 47 BC: two horses abreast, small open car with one driver, long curved scythe blades on the axle ends, charging in a cloud of dust',
  pomp_levy: `Raw Pompeian legionary levy raised in Spain, 45 BC: Roman kit (bronze helmet, mail or leather, oval scutum, pilum) worn by young, nervous recruits; blue-grey shields. NOT segmentata`,
  britons: 'British warrior of 55-54 BC: long hair, moustache, checked cloak and trousers, long oval or rectangular shield, spear and long sword; NO woad body paint, NOT Viking',
  brit_cav: 'British horseman of 54 BC, like a Gallic horseman: checked cloak, spear, oval shield, small horse; NO woad, NOT Viking',
  brit_chariot: 'British war chariot of 54 BC: light two-wheeled wicker-sided chariot pulled by two small ponies, a driver and a spear-armed warrior who leaps down to fight; NO scythes'
};
const ERA = { I: 'Gaul, 58 BC', II: 'the Upper Rhine, 58 BC', III: 'Africa near Utica, 49 BC', IV: 'Greece and Pontus, 48-47 BC', V: 'Africa and southern Spain, 46-45 BC', B: 'Britain, 55-54 BC' };
const items = [];
for (const k of Object.keys(UNIT_TYPES)) if (!SUBJECT[k]) console.warn('no art subject for unit type', k);
for (const k of Object.keys(UNIT_TYPES)) items.push({ kind: 'unit', id: k, file: `unit_${k}.webp`, size: '512x512', prompt: `${SUBJECT[k]}; three-quarter view, full figure (horse and rider for cavalry), facing slightly left toward the viewer, centred with a clear silhouette, plain dark parchment background; ${STYLE}` });
for (const o of newCampaign('normal').officers) items.push({ kind: 'officer', id: o.id, file: `officer_${o.id}.webp`, size: '512x640', prompt: `Roman ${o.rank} named ${o.name}, ${o.bio} Three-quarter bust portrait from the chest up, facing slightly toward the viewer, against a softly blurred background of a Roman camp tent interior (lamplight, leather, standards) in dark warm tones, 58 BC, ${o.rank === 'Centurion' ? 'transverse crest helmet, vine staff (vitis), phalerae decorations' : o.rank === 'Tribune' ? 'bronze muscle cuirass, red plume, patrician bearing' : 'cavalry helmet with plume, mail, riding cloak'}; ${ACCURACY}; ${STYLE}` });
for (const s of SCENARIOS) items.push({ kind: 'scenario', id: s.id, file: `scenario_${s.id}.webp`, size: '1600x480', prompt: `Wide panoramic landscape of "${s.name}", ${s.theater} ${s.year}. ${s.briefing} Small figures of the armies in the distance; ${STYLE}` });
for (const [o, t] of [['victory', 'Roman legion triumphant on a battlefield at dawn, standards raised, Gallic host fleeing'], ['draw', 'Roman legion marching away in good order at dusk, battlefield smoke behind, tired but unbroken'], ['defeat', 'broken Roman line at dusk, fallen standard, survivors rallying, grim mood']])
  items.push({ kind: 'outcome', id: o, file: `outcome_${o}.webp`, size: '1600x400', prompt: `${t}; ${ACCURACY}; ${STYLE}` });

let md = '# Art shot list\n\nGenerated by `node tools/art_report.mjs --write`. Save finished images in `assets/art/` and add them to `assets/art/manifest.json`\n(`{"unit": {"legionary": "unit_legionary.webp"}, ...}`). Missing items use procedural placeholders.\n\n**Accuracy brief (include in every Roman prompt):** ' + ACCURACY + '\n\n';
let missing = 0;
for (const kind of ['unit', 'officer', 'scenario', 'outcome']) {
  md += `## ${kind}\n\n| id | status | file | size |\n|---|---|---|---|\n`;
  for (const it of items.filter(i => i.kind === kind)) { const ok = have(kind, it.id); if (!ok) missing++; md += `| ${it.id} | ${ok ? 'done' : 'placeholder'} | ${it.file} | ${it.size} |\n`; }
  md += '\n';
  for (const it of items.filter(i => i.kind === kind)) md += `**${it.file}**\n\n> ${it.prompt}\n\n`;
}
if (process.argv.includes('--write')) { writeFileSync('docs/ART_SHOTLIST.md', md); console.log('wrote docs/ART_SHOTLIST.md'); }
console.log(`${items.length} assets, ${missing} still placeholders`);
