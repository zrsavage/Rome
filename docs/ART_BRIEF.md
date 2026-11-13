# Art brief for an image-generating AI (or a person)

This is a complete, self-contained brief. You do not need to read the code. Make the images in the order below, save them with the exact
file names and sizes given, and follow "How to deliver" at the end. Every prompt for every single asset is also listed, ready to paste, in
`docs/ART_SHOTLIST.md` (regenerate it with `node tools/art_report.mjs --write`).

The game is **LEGIO**, a Roman campaign strategy game in the spirit of *Ultimate General*. It follows one of Caesar's legates from Gaul in
58 BC to Munda in 45 BC. The look we want: **painterly digital illustration, muted earthy palette, dramatic natural light, historically
grounded strategy-game art, no text, no watermark, no frames, no UI.**

## Priority 1: the camp picture (one image, the most important)

The camp screen is a painted Roman marching camp. The buildings are clickable hotspots laid over the picture, so the painting must put each
building in a predictable place.

- **Size:** 2000 x 1240 pixels (the screen maps it onto a 1000 x 620 grid; any 50:31 size works). JPEG or WebP, under 600 KB.
- **File name:** `camp.webp`
- **View:** a high oblique bird's-eye view (about 50-60 degrees down), looking north, the whole camp filling the frame with a little
  countryside round the edges. Not straight top-down, not a ground-level view.
- **Prompt:**
  > Wide hand-painted strategy-game background of a Roman legionary marching camp in Gaul, 58 BC, seen from a high oblique bird's-eye angle
  > looking north. A rectangular fort with rounded corners, a ditch and an earth rampart topped by a timber palisade, a wooden watchtower at
  > each corner and a gate in the middle of the south (bottom) side. Two dirt streets cross at the centre. In the centre-top a large red-brown
  > leather command tent (praetorium) with legionary standards and an eagle in front of it. Rows of small brown goatskin tents. Green fields,
  > hedges and dark forest outside the walls. Warm late-afternoon light, long shadows, soldiers small and busy. Painterly digital
  > illustration, muted earthy palette, historically grounded, no text, no watermark.
- **Negative prompt:** segmented plate armour, medieval castle, stone walls, modern buildings, fantasy, text, letters, watermark, signature,
  UI, frame.

### Where each building must sit (x, y on a 1000 x 620 grid; 0,0 is the top-left)

| Building | Centre (x, y) | What it should look like |
|---|---|---|
| Command tent (praetorium) | 500, 125 | Large red-brown leather tent with standards and an eagle in front. Top centre. |
| Barracks | 190, 150 | Three or four brown goatskin tents in a row, with a rack of shields. Top left. |
| Officers' tent | 810, 150 | A larger red tent with a gold pennant and a table of maps. Top right. |
| Armourer (smithy) | 190, 310 | An open forge under a lean-to roof, an anvil, smoke, racks of shields and pila. Middle left. |
| Field hospital | 810, 310 | A long white linen tent; a staff with a snake (Aesculapius) by the door. **No red cross** (a modern symbol). Middle right. |
| Training ground | 190, 470 | An open sandy yard with wooden practice posts (pali) and men drilling with wicker shields. Bottom left. |
| Supply depot | 810, 470 | A timber granary on posts with a tiled roof, wagons, sacks and barrels. Bottom right. |
| Chieftains' hall | 500, 450 | A round Gallic house with a conical thatched roof, just inside the gate, with a few Gauls waiting outside. Bottom centre. |
| Gate | 500, 600 | The south gate, a wooden tower on each side, at the bottom edge. |

Each building should fill roughly a 170 x 110 box around its centre. Leave a clear dirt street between the buildings. If the image comes
out with buildings in different places, that is fine: **write down the actual centre of each building** (x, y in the 1000 x 620 grid) and
include it with the image; only the coordinates in the code need changing.

Make 3 to 6 versions with different seeds and pick the one with the clearest, most separated buildings.

## Priority 2: briefing banners (one per battle, 30 images)

- **Size:** 1600 x 480, WebP, under 150 KB each.
- **File names:** `scenario_<id>.webp`, for example `scenario_bibracte.webp`. The id of each battle is in the table below.
- **Prompt pattern:** `Wide panoramic landscape of "<battle name>", <place>, <year>. <one line from the table>. Small figures of the armies
  in the distance; painterly digital illustration, muted earthy palette, dramatic natural light, historically grounded, game art, no text,
  no watermark.`

| id | Battle | Year | Scene |
|---|---|---|---|
| ford | The Fords of the Rhone | 58 BC | A wide river with shallow fords near Lake Geneva, Gallic warbands probing the crossings, a Roman line on the near bank |
| arar | The Crossing of the Arar | 58 BC | A slow river (the Saone) at dawn, part of a Gallic tribe still on the near bank, Roman legions coming out of the mist |
| convoy | The Foragers' Road | 58 BC | Roman grain wagons on a forest road, raiders breaking from the trees |
| oppidum | The Hill Fort of the Sequani | 58 BC | A Gallic hillfort with timber-laced ramparts on a steep hill, legionaries climbing |
| silva | Ambush in the Silva | 58 BC | A clearing in a dark forest, a Roman column caught with warriors on both flanks |
| bibracte | The Battle of Bibracte | 58 BC | Rolling hills, the Roman legion in three lines on a slope, a huge Helvetian host and wagons beyond |
| parley | The Parley on the Mound | 58 BC | A low mound on the Rhine plain, Roman and German horsemen facing each other |
| supply | The Cut Supply Line | 58 BC | A road between hills and woods, German horse with runners attacking a grain convoy |
| lessercamp | The Lesser Camp | 58 BC | A ring of German ox-wagons on the plain, Roman cohorts advancing |
| ariovistus | The Battle Against Ariovistus | 58 BC | German tribes in blocks, a ring of wagons behind them with women standing on them |
| rhine | The Pursuit to the Rhine | 58 BC | Germans fleeing towards the broad Rhine, Roman horse in pursuit |
| landing | The Landing in Britain | 55 BC | Roman warships close to a shingle beach under white cliffs, legionaries leaping into the surf, British chariots on the beach |
| seventh | The Seventh at the Harvest | 55 BC | A cornfield in Kent, a Roman legion reaping, British chariots and horse bursting from the woods |
| bigbury | The Hillfort in the Woods | 54 BC | A wooded British hillfort with a rampart and felled trees, legionaries in testudo building a ramp |
| cassivellaunus | The Stronghold of Cassivellaunus | 54 BC | The Thames with sharpened stakes in the ford, then a stronghold among woods and marsh beyond |
| anquillaria | The Landing at Anquillaria | 49 BC | Transports on a North African beach, Numidian horsemen riding in from dry hills |
| castra | Castra Cornelia | 49 BC | A long ridge running to the sea north of Utica, an old ditch being re-cut |
| utica | The Walls of Utica | 49 BC | A Punic walled town on a plain, two Roman armies facing across a steep valley |
| water | Water and Forage | 49 BC | Wells and water carts on a hot dry plain, Numidian horsemen circling |
| bagradas | The Bagradas | 49 BC | A wide river plain at dawn, a Roman army surrounded by thousands of Numidian horse and a few elephants |
| pharsalus | Pharsalus | 48 BC | The plain of Thessaly in August, two Roman armies, a great mass of cavalry on one wing |
| comana | The Road to Comana | 48 BC | A road through green hills in Pontus near a temple town |
| steppe | The Steppe Riders | 48 BC | Sarmatian horse archers and armoured lancers coming over a skyline at a wagon column |
| nicopolis | Nicopolis | 48 BC | A town in Armenia Minor, an army drawn up behind two trenches, winter light |
| zela | Zela | 47 BC | A steep hill with a half-built Roman camp, scythed chariots charging up out of the valley |
| ruspina | Ruspina | 46 BC | A flat African plain, a Roman army in a hollow formation surrounded by horsemen |
| uzitta | The Lines at Uzitta | 46 BC | Siege lines and earthworks on dry ridges before a small town |
| thapsus | Thapsus | 46 BC | A narrow strip of land between the sea and a salt lagoon, elephants on both wings of a Roman army |
| ategua | Ategua | 45 BC | A hill town in Spain in winter rain, Roman siege works below |
| munda | Munda | 45 BC | A ridge above a marshy stream in southern Spain, two huge Roman armies |

## Priority 3: unit portraits (one per unit type)

- **Size:** 512 x 512, WebP, under 80 KB. **File names:** `unit_<id>.webp`.
- Square icon portrait, one figure (or a horse and rider), centred, plain dark parchment background.
- The exact subject for every id (legionary, slinger, equites, archer, aux_cav, aux_inf, warband, gaul_skirm, gaul_elite, gaul_cav, suebi,
  german_cav, laager, numid_cav, numid_inf, elephant, pompeian, pomp_cav, pomp_missile, pontic, horse_archer, lancer, chariot, pomp_levy,
  britons, brit_chariot, brit_cav, baggage, antesignani) is in `docs/ART_SHOTLIST.md`.

## Priority 4: officer portraits and outcome banners

- Officers: 512 x 640 bust portraits, `officer_<id>.webp`, prompts in `docs/ART_SHOTLIST.md`.
- Outcome banners: 1600 x 400, `outcome_victory.webp`, `outcome_draw.webp`, `outcome_defeat.webp`, prompts in `docs/ART_SHOTLIST.md`.

## Decisions for the whole set (answers to the artist's questions)

1. **Viewpoint for all portraits: three-quarter view** (option A). Units: the full figure, or horse and rider, turned slightly toward the
   viewer, with a clear silhouette and the shield and weapon visible; these are shown small (40 to 90 pixels) on unit cards, so readable
   shapes matter more than faces. Officers: chest-up bust, same angle. **Never top-down:** the soldiers on the battlefield are drawn by the
   game's code from directly above, so no generated art is needed for that view.
2. **Backgrounds:** unit portraits on the **plain dark parchment** background, so a whole army reads as one set. Officer portraits get a
   **subtle, softly blurred environment**: the inside of a Roman command tent by lamplight (leather, a standard, a map table), in the same
   dark warm tones, with no strong colours behind the face. All officers are Roman; the same background for all of them keeps them a set.
3. **The shot list** is `docs/ART_SHOTLIST.md`: every unit type, officer, battle banner and outcome banner, with a ready-made prompt for each
   (66 assets). It already includes the viewpoint and background decisions above.
4. **One look for everything:** the same model, style words, lighting (warm, from the upper left) and palette for every image. Make the
   legionary unit portrait first and use it as the reference for the rest.

## Historical accuracy (check every image)

- **Romans, all acts:** Montefortino or Coolus bronze helmets, mail shirts (lorica hamata) with doubled shoulders, curved oval or
  round-cornered scutum, pilum, short sword (gladius) on the right hip, red tunics. **Never** segmented plate armour (lorica segmentata), the
  rectangular Imperial shield with eagle wings, or gladiator kit. Pompeian soldiers look exactly like Caesar's.
- **Gauls:** long hair and moustaches, checked cloaks and trousers, **long oval** shields, long swords, torcs; nobles in mail. **No round
  shields, no blue body paint (woad), no horned helmets, not Vikings.**
- **Germans (Suebi):** hair in a knot at the side of the head, cloaks, board shields, short spears. Not Vikings, no horns.
- **Britons (55-54 BC):** like Gauls, with two-wheeled wicker war chariots and no scythes. No woad (Caesar's remark about blue dye is
  disputed and the game leaves it out).
- **Numidians:** ride bareback with no bridle, small round leather shields, javelins. **North African elephants are small and carry no
  tower.**
- **Sarmatians:** felt caps and bows for the archers, scale armour and very long lances for the nobles; no stirrups. Not Mongols or Huns.
- **Places:** only what existed then. Carthage is a ruin in 49 BC; there is no London; no stone castles anywhere; Roman camps are timber and
  earth.
- **No red cross** on the hospital (a modern symbol).

## How to deliver

1. Put each image in `assets/art/` with its exact file name.
2. List it in `assets/art/manifest.json` under its kind and id, for example:
   ```json
   { "unit": { "legionary": "unit_legionary.webp" },
     "officer": { "1": "officer_1.webp" },
     "scenario": { "bibracte": "scenario_bibracte.webp" },
     "outcome": { "victory": "outcome_victory.webp" } }
   ```
   The game uses any image listed here and draws its own placeholder for anything that is not.
3. The camp picture is wired in differently: send `camp.webp` together with the building centres you measured. The code change is to set
   `CAMP_PAINTING` in `src/campart.js` and, if needed, the `x`/`y` of each building in `BUILDINGS` in `src/campscene.js`. A Claude Code
   session can do that step.
4. Run `npm run build` to inline the art into the single-file build in `dist/`.

## Tools that are known to work

- Any image model that takes a text prompt and a size: FLUX, Stable Diffusion XL, Qwen-Image, Z-Image-Turbo (Hugging Face Spaces, which use a
  small free daily GPU quota), or a paid service. Use the same model and style words for the whole set so it looks like one game.
- No model can draw a true top-down soldier. That is why the battlefield soldiers are drawn by code and are not on this list.
