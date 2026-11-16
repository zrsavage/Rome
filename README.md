# LEGIO - A Roman Campaign (vertical slice v0.1)

A real-time-with-pause Roman army-building campaign for the browser, inspired by *Ultimate General: Civil War /
American Revolution*. Start as a legate with a thin legion in Gaul, win battles, grow your army, and eventually
become Caesar.

## Run it

No build step. Serve the folder and open it in a browser:

```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## What's in it (v0.2)

- **Campaign map** with save slots (3), difficulty (Tiro / Miles / Centurion / Imperator) and a route through **Act I: Gaul, 58 BC**
  (later acts are shown locked on the map).
- **Six battles:** Fords of the Rhone at Genava (small skirmish), The Foragers' Road (defend the wagons), The Hill Fort of the Sequani
  (storm a hilltop), The Crossing of the Arar (catch stragglers), Ambush in the Silva (historical-defeat style: survive, big
  rewards) and the named **Battle of Bibracte** with a flank/rear attack by the Boii and Tulingi.
- **Camp phase** between battles (no time limit: only denarii, supplies and men limit what you do): training is a decision, not a minigame: pick *what* to drill (formation drill, weapons practice or field exercises, each with different gains, tiredness, casualty risk and supply cost), informed by the centurion's advice on the next battle, and the best leader in camp (you or a specialist officer) runs it automatically. A short skippable scene shows it being run. Also forage,
  fortify, rest, recruit, scout, demand tribute or give gifts. Fortifications improve morale and make orderly withdrawals easier.
- **Rewards:** victories and **draws** (orderly withdrawal or surviving to the time limit) give spoils and new units
  (Cretan archers, IV-VII Cohorts, allied Gallic horse). Defeat keeps you on the same battle; there is a replacement floor so a
  bad run cannot soft-lock the army.
- **Battle systems:** real-time with pause, facing, flanking/rear attacks, charge impact, pilum volleys, ranged fire, morale and
  routing, fatigue, terrain, testudo, objectives (capture-and-hold), reinforcements on both sides.
- **Battle readability:** flank arcs (green front / yellow flanks / red rear), range rings (V), floating casualty numbers, hit
  flashes, dust trails, destination ghosts with facing arrows, control groups, objective HUD.
- Officers level up and can die (not on Tiro). Cohorts keep XP, drill and condition across the campaign.

## Later additions (v0.3)

- **Act II: Ariovistus and the Suebi** (five battles, 58 BC): The Parley on the Mound, The Cut Supply Line, The Lesser Camp, the named **Battle Against
  Ariovistus** (tribal blocks, a wagon laager behind them, Crassus' third line arrives as a scripted Roman reserve) and The Pursuit to the Rhine. New enemy
  types: Suebi warbands, Germanic horse with foot runners, and immobile **wagon laagers** (men with wagons at their backs will not run until the wagons fall).
  The map zooms to the Upper Rhine for Act II. Places and tribes are checked for 58 BC; battle sites in Alsace are approximate.
- **Gaul/German AI**: feints, fighting withdrawals, champions that strike the weakest point of your line, extended lines when they outnumber you, and wings that
  pick the flank their scouts found weaker.
- **Deployment phase**: before the first move, right-click/right-drag places cohorts and the general anywhere in the gold zone (not on water).
- **Weather** (clear, rain/mud, fog, storm with rising fords, hard frost): chosen per campaign battle (same every time you retry), shown in the briefing and HUD; all five are in Practice.
- **Officers**: temperament (bold, rash, steady, cautious) with battle effects (a rash officer charges unordered), rivalry (Pullo and Vorenus) and promotions
  (level 3 and 5) that make a cohort a rallying point and then immovable.
- **Battle report** on the result screen: strength timeline, why each cohort broke, what decided the fight and short rule lessons.
- **Music**: nine calm ancient-feeling pieces (plucked strings, flutes, reeds, hand drums) for menu, map and camp and eight orchestral pieces for battle (Kevin MacLeod, CC BY 4.0), shuffled with crossfades; speaker button, volume, credits. See `docs/MUSIC.md`.
- **Movement and fighting (v0.4)**: a drawn line now marches as a line (every cohort paced so all arrive together, which gives wheels), friends are steered
  round instead of walked through, and woods and fords break formations and kill a charge's run-up. Learned in camp: Marching Orders (N, waypoints),
  Triplex Acies (B; Ctrl+B saves your own formation, Alt+B recalls it), Target Priority (I), Charge and Rally (M, horse break off and re-charge, and meet
  enemy horse), and Rotation of the Line (K, tired cohorts are relieved automatically). Skirmishers fall back *through* your line; ammunition shows
  under the label. The Gauls scale their tricks with difficulty (feints, extended lines, champion strikes, falling back to higher ground). An optional
  "messengers" rule (speaker panel) delays orders to cohorts outside the general's ring. `node tools/simtest.mjs 6 6 normal` with `STRATS=smart` runs a bot that plays
  with these tools (triplex, rotation, reserve, horse on rears) and is the balance yardstick.
- **Advancement, one decision at a time**: each officer level and each cohort rank earns a single either/or choice from a ladder that is the same for every
  leader or unit of that kind (centurion of foot, prefect of horse, staff officer; foot, missile troops, horse). A raised flag over the Officers' Tent or the
  Training Ground shows a choice is waiting. Clicking a unit shows its record: its real numbers, what it is best at and where it stands out. Rules in `src/promote.js`.
- **Campaign depth (v0.5, ideas from the Ultimate General games)**:
  - *Baggage train*: a wagon unit deploys behind the army. Units beside it refill pila, sling-shot and arrows; if it is taken you lose a quarter of your supplies. The Gauls go for it. Enemy wagon camps taken are worth supplies.
  - *Veterans or recruits*: the pool holds raw recruits (cheap, dilute experience) and veterans (hired dear, or your own lightly wounded after a rest; no dilution). Sliders place veterans first.
  - *Prisoners*: after a win, ransom them, sell them (goodwill -1), enrol the willing as recruits, or release them (goodwill +1).
  - *Antesignani* (doctrine, comma key): a legionary cohort detaches a fifth of its men as a javelin screen and takes them back.
  - *Career*: one point per battle won or drawn; three of seven skills are offered each time (Politics, Economy, Medicine, Training, Army organisation, Logistics, Reconnaissance). Flag over the Command Tent.
  - *Line of march*: on reaching a new battle choose the road (+supplies), a forced march (+1 day, tired, fewer supplies) or living off the land (+supplies, -1 day, goodwill -1).
  - *Legions and legates*: more than ten legionary cohorts form a second legion; give each a legate (Officers' Tent) with a command ring of his own. Alt+1, Alt+2 select a legion.
  - *Battles in stages*: Bibracte is three linked fights (the assault on the hill, the Boii and Tulingi on the flank, the wagons at dusk) with losses carried over and no camp between.
  - *Side fights*: the hill fort, the parley and the lesser camp may be marched past; winning them (and the supply and ambush fights) weakens the named battle's host or steadies your men. The briefing lists what was won.
  - *Enemy commanders*: each battle has a commander who is cautious, aggressive, cunning or stubborn, which changes how the host fights. Scouting (or Reconnaissance 2) reveals it in the briefing.
  Rules live in `src/campaign.js`.
- **Save safety**: export a campaign as a file, import it, and keep six rolling backups per slot (after every battle and when you make camp).

## Balancing the camp

`node tools/campbalance.mjs [seeds] [scenarios] [filter]` prices every camp option in denarii-equivalents (gold + 1.5 x supplies + 120 per
day) and measures what it buys in battle with the tactician bot (men alive afterwards, win rate), starting each seed from a slightly
different army so the result is not a coin-flip. Unit-targeted options are applied to three cohorts. Equipment: +6% armour, +10% attack per
tier. Drills about +50% over the first pass. Rest also returns 15% of missing men. Fortify +4 morale per level. Hospital +30% recovery per
level. Allied infantry 340 denarii, slingers 130.

## Combat geometry

Fighting a unit head-on is a slow grind; hitting it from the side or rear, or surrounding it, is decisive. In melee, damage is x0.8 head-on,
x1.5 from the flank and x2.2 from the rear; a flanked unit fights back less (-15% per attacker at its side or behind), and a *surrounded*
unit (enemies on opposite sides) loses 15% armour, deals 30% less damage and bleeds morale. Units show `FLANKED` or `SURROUNDED`.
Typical engagements, first contact until one side breaks (game seconds at 1x): an even head-on duel (480 v 480) about 110 s; one extra
warband on the flank about 40 s; cavalry into the rear about 20-25 s; caught between two warbands about 15 s; Roman horse into the rear of
a warband held by a cohort about 50 s. Tuning constants: `FRONT_GRIND`, `FLANK_DMG`, `REAR_DMG`, `FLANK_MORALE`, `REAR_MORALE`,
`SURROUND_MORALE` in `src/sim.js`.

## Command, charges and learned orders
- **The general.** A banner (select with `E`, right-click to move) carries a command ring. Cohorts inside it recover morale 20% faster and rally 30% faster; outside it they recover at 45% speed, rally at 60%, and charge at 70% strength. A general who rides into melee can be wounded, which halves the ring for a minute.
- **Charges need fresh, steady men.** Below 50% morale or above 60% fatigue a charge lands at 40% strength and the unit is disrupted.
- **High ground.** Defenders on hills lose 15% less morale from casualties; charging downhill hits 20% harder and uphill 20% softer; missile fire from above is 12% stronger.
- **Frontage.** Only three units can fight fully on one front. Extra frontal attackers fight at a reduced rate, so flanking is how you bring numbers to bear. A host that outnumbers you by 25% sends some warbands wide to wrap your line.
- **Pursuit.** Cavalry on "defend post" ride down routers within 220 units and kill them at 2.2x. Routs are where most real losses happen.
- **Every order beyond marching and attacking is learned in camp** (Training Ground, "Battle orders"), a pair at a time as the campaign goes on, each
  from an officer who can teach it: Standing Orders `H`/`G` and Orderly Withdrawal `R` (1 win), Double-time and Fire Discipline `J` (2), Testudo `T`
  and Guard (3), Rally `F` and Pursuit `P` (4), Relief `Y` and the Wedge `U` (5), Orbis `O` (6). Battle controls, the command bar and the help panel show
  only what you have learned; practice battles have everything. The list lives in `src/doctrine.js`. (Campaigns saved before this change start
  with no orders learned.)

## Height and sight
- **A real height map.** Hills are smooth, irregular bumps (`elevAt` in `src/data.js`, metres, per-hill `h`), not flat patches. The battlefield is drawn with hillshading and contour lines from the same data.
- **Slopes.** Marching uphill slows a unit (cavalry more), downhill speeds it up a little.
- **Charges and missiles.** The height difference between attacker and target scales charge impact by up to 30% either way and missile damage by up to 15%. Defenders lose up to 15% less morale on a hilltop.
- **Sight.** In scenarios with `fog: true` (Arar, Hill Fort, Silva) the enemy is hidden until seen. Sight range is 320 and grows with the viewer's height; the general sees 420. A ridge blocks the line of sight, tree canopy adds 11 m, and a unit inside a wood is only seen from about 40% of the normal range. Units in melee are always seen. Scouting in camp reveals the opening positions for the first 25 seconds. The enemy total shows as "Foe ?" while unseen enemies remain.
- **Effects.** Clashes flash and shake the screen, sparks show contact (red on flank and rear hits), routs send out a ring, the fallen lie on the field.

## Stances

Orders never change a unit's stance. A move order sets the unit's new **post**. Units on *Defend post* (the default) fight what
comes near, then walk back to the post; units on *Hold* never leave it. Routed units that rally return to their post. Stance
shows on the unit card (`- hold`), on the field (`H` after the count) and in the unit panel.

## Battle length and depth

- Battles run **5-10+ minutes** because of slower lethality, softer morale shocks, big maps and fog. There are **no waves**: the whole enemy
  host is on the field from the start. The only reinforcements are scripted surprises authored into a scenario (a flank attack, an ambush
  party, late allies); if the field is cleared before one has sprung it arrives at once.
- **Movement:** friendly units never shove each other; a unit marching through a friend moves at 30% speed. Marching missile units stop
  to fire when an enemy is in range ahead (Ctrl+right-click overrides). Fall back (R) is an orderly walk backward facing the enemy. A competent bot takes 7-10 minutes on Act I.
- The opening battle is easy and short (a few minutes): all the raiders are out there, coming from different distances.
- Fatigue builds during long fights; press **R** to pull a tired unit back to rest and re-form.

## Muster roll (soldiers and sliders)
After the first campaign victory, volunteers (battle spoils) and provincial levies no longer drop into units automatically. They go into a
**pool of available soldiers** shown at the top of the camp screen. Open the **Barracks** and use the sliders on the muster roll: drag a unit's
slider right to send men to it, left to take men back to the pool (free, no day). New men are raw and dilute experience; taking men away
does not. *Fill evenly* spreads the pool over the emptiest units and *Undo changes* restores the roll as it was when you opened it. You can
also **hire** volunteers (3 denarii each, one day) into the pool. Marching with unassigned soldiers asks for confirmation. (The very first camp
still fills units automatically so a new player is not left with an unexplained pool.)

## Army management depth

- **Officer skill trees:** each level earns a skill point; 12 perks across tactics, drill, logistics and diplomacy (attached
  officers help their unit, others help the whole army).
- **Equipment:** upgrade armour and weapons per cohort (3 tiers, denarii + supplies + a day).
- **Every building is a decision, not a checkbox:** each opens with an adviser's note tied to your army and the next enemy (quartermaster, camp prefect, armourer, physician, interpreter), live previews of what each choice does, and a real tradeoff. Foraging has four options (cautious, wide, requisition for goodwill, buy for coin); the Barracks weighs rest against recruiting (which dilutes experience) against fortifying; the Armourer shows per-man cost and effect; the Hospital shows how many men it would actually have saved last battle; the Hall shows what goodwill does to the enemy's size; scouting reveals reinforcement timing in the briefing.
- **Instructors:** assign an officer to train a cohort automatically every day.
- **Field hospital:** up to 5 levels (250, 500, 800, 1200, 1700 denarii; one level per camp), better wound recovery; see v0.8 below.
- **Raise units:** build new cohorts, slingers, archers and cavalry; the command limit grows with each battle won or drawn;
  new unit types unlock as you progress (allied cavalry, archers, allied infantry).
- **Veteran traits** by experience level, and a **choose-one bonus** after every victory or draw (plunder, captured arms,
  a new officer, veterans, surgeons, stores).

## Starting a campaign

The flow is **one question per screen** with a progress indicator, a Back button, and a live summary of your starting position. The camp is a drawn Roman fort: each building is one activity and opens one small panel. You start with a single building (the Training Ground, pulsing as the place to begin); every battle won or drawn builds the next (Supply Depot, Barracks, Officers' Tent, Armourer, Field Hospital, Chieftains' Hall). Unbuilt plots show as faint question marks, and each new building is introduced once in plain words.

New Campaign opens **Your Origins**, a short character creation in the spirit of Ultimate General: pick your family, early career
and approach (recommended picks are highlighted; a live summary shows starting denarii, supplies, soldiers, goodwill and
modifiers for wounded recovery, replacements, food use, spoils, experience, foraging and morale). Every answer is chosen by you (no quick start, no pre-filled picks), then you fight a short
**opening battle** (First Blood at the Border) and only afterwards reach the campaign map and army management, with a one-time
explanation of what to do there. Defeat in the opening battle simply lets you try again.

## Typography

Titles and labels use **Cinzel** (capitals modelled on Roman inscriptions such as Trajan's Column); body text uses **Cardo** (a serif made for classicists and Latin). Both load from Google Fonts with Palatino/Georgia fallbacks, so the game still reads offline.

## Learning the game (no tutorial mode)

- **No separate tutorial:** the opening battle is a small, easy fight (First Blood at the Border) with contextual hints that appear when they matter: advancing, an enemy approaching, flanks, morale, fatigue, waves.
- **Practice Battle** (main menu): a sandbox with no rewards or saves. Pick your army (small/medium/large), the enemy force,
  terrain (open, ford, hill, forest), enemy tactics (rush, ambush, mixed) and difficulty.

## Maps

The campaign map uses real geography: Natural Earth 10m coastlines, rivers and lakes (public domain) in Mercator, with Roman
place names at true latitude/longitude and a scale bar and graticule. `node tools/gen_map.mjs <rivers.geojson> <lakes.geojson>`
regenerates `src/mapdata.js`. Battle sites: Genava (Rhone fords), the Arar (Saone), Cabillonum, Vesontio, the Morvan, Bibracte.

## Controls

| Input | Action |
|---|---|
| Left click / drag | Select unit / box select (`Q` = all) |
| Right click | Move (or attack if clicking an enemy) |
| Right drag | Draw a battle line; units spread along it and face away from the drag |
| `Space`, `Z X C`, `-` `=` | Pause, speed 1x/2x/4x, step speed down to 0.5x (orders allowed while paused) |
| `Ctrl` + right-click | March without stopping to fire or fight |
| `Ctrl+1-9`, `1-9` | Set / recall control group (double-tap centres the camera) |
| `V` | Toggle range rings for all units |
| `H` / `G` | **Hold** (never leaves its spot) / **Defend post** (fights nearby enemies, then returns to its post) |
| `T` / `R` | Toggle testudo (loose order for skirmishers) / fall back and rest |
| `;` | Dig in the selected infantry (deployment only, once Fieldworks is learned and you are defending) |
| WASD, wheel | Pan, zoom |

## Layout

```
index.html, style.css
src/data.js      unit types, difficulty, terrain, scenarios
src/sim.js       pure battle simulation (no DOM) - deterministic with a seed
src/render.js    canvas renderer
src/battleui.js  input, HUD, game loop
src/camp.js      camp phase + drill mini-game
src/state.js     campaign state, deployment, officers, applying results and unlocks
src/map.js       campaign map screen (real geography)
src/mapdata.js   GENERATED coastlines, rivers, lakes (tools/gen_map.mjs)
src/coach.js     contextual hints for the opening battle
src/practice.js  practice battle builder
src/origins.js   character-creation choices, starting modifiers and their descriptions
src/perks.js     officer perks, veteran traits, equipment tiers
src/rewards.js   post-battle bonus choices
src/art.js       art loader with procedural placeholders
src/main.js      screen flow, briefing, results, saves
tools/simtest.mjs  headless balance harness: node tools/simtest.mjs [runs] [scenario|all] [difficulty|all]
docs/DESIGN.md   scope, roadmap, open questions
```

## Status

Balance is first-pass: on Miles an aggressive plan with cavalry beats every scenario; passive defence usually loses; Centurion
and Imperator scale enemy size and morale. Art is procedural placeholder; AI-generated art is planned. See `docs/DESIGN.md`.

## The extended line
A cohort can be stretched into a **thinner, wider line** (the *Extended Line* doctrine, taught at the training ground after two wins). Press `L` to cycle normal, x1.6 and x2.2, or hold
`Alt` while right-dragging a battle line to stretch every selected unit to cover its share of it (the preview shows the wider, shallower ghosts). Effects: more frontage so more men fight at once
(with diminishing returns: +55% of the extra width counts), and room for more attackers; but with no depth to absorb losses, casualties shake it more (morale loss x(1 + 0.7t + 0.6t^2) for stretch t),
a charge into it goes deeper (+30% per unit of stretch) and an extended unit takes a little more damage and moves a little slower. The unit panel shows "Extended x1.6".
Balance note: in practice-battle tests it makes fights decisively faster (about 40% shorter) but with more routs at x1.6; results are noisy, so treat the numbers as a first pass.

## Facing a battle line
Right-drag draws a battle line and the units form along it. **The line faces to the left of the way you draw it**, like walking along it: left to right faces north,
right to left south, top to bottom east, bottom to top west. While you drag you see a ghost of each selected unit in its place, an arrow showing the facing and a
compass label; on release the banner confirms it ("Line faces north"). Units are placed in the order they already stand along the line so they do not cross over each other.
A plain right-click still marches to a point and faces the way you travel (`src/orders.js`).

## The Gallic battle line
Gallic infantry no longer converge on your army as a swarm. The host forms a **moving battle line**: each unit gets a slot side by side across the axis of advance (a second
and third rank when the host is wide, the units nearest your army taking the front rank, each rank ordered by where its men stand so nobody crosses through a friend), the line
front marches at the pace of its slowest unit and halts short of you, and the host surges together once most units are in their places. When it surges, targets are spread so units
do not all pile onto the same cohort. Wings and the champions' reserve still act separately (`formLine` in `src/sim.js`).

## Playtest pass (v0.6)
- **No day limit in camp.** Every camp action costs only denarii, supplies or men, and you can do as many as you can pay for. The march to each
  battle takes `daysToPrepare` days of rations (men / 60 a day), paid once when the battle starts (`breakCamp` in `src/camp.js`). Some returns fall
  off within one camp so nothing is free and unlimited: each kind of foraging party (cautious, wide, requisition) can go out once between battles, grain merchants raise their price 25% each
  time, each tribute demand brings 60% of the last, re-drilling the same unit costs +50% each time, and only the first rest brings the lightly wounded
  back. Rest costs a day's rations, fortifying 25 supplies a step, scouting 40 denarii. Instructors drill their cohort on the march. The forced march now
  makes the next host 10% smaller instead of giving a day.
- **Training:** the best leader for the chosen drill is picked automatically; the unit record is shorter (notable men in one line, deeds on hover).
- **Advisers know less at first:** the camp prefect and armourer only describe the enemy's make-up after you scout (Chieftains' Hall) or with
  Reconnaissance 1 in your career.
- **Hiring:** the Barracks says plainly that the 20/50/100/200 chips set how many men both hire offers buy, with the price per man.
- **Command limit:** 8 units, +4 per battle won or drawn, +4 per level of Army organisation (cap 80), so a full campaign reaches 50-60 units in
  several legions under legates.
- **Fair enemy hosts:** the enemy is sized from your army's fighting strength by the kind of fight (`posture` on each scenario and Bibracte stage,
  `POSTURES` in `src/state.js`): open battle 1.15x, you defend 1.4x, you storm a strong place 1.0x, ambush 1.25x, pursuit 0.85x (fortified camp 1.6x
  is ready for later acts), then difficulty and goodwill. The first two defend battles have a small `odds` nudge down (0.8, 0.85), as do Bibracte and the Parley. Strength counts men by type (a legionary or a Gallic warrior 1, a horseman about 2); your
  experience, drill and equipment are not counted, so they stay your edge. The weights were calibrated with the smart bot. The briefing shows the odds.
- **Sound Retreat works:** the army falls back away from the enemy (men in contact step back facing the foe, the rest march off) and the battle ends
  after 30 seconds: a draw if enough men are still with the standards. Tested with `STRATS=lateretreat` (fight, then retreat after losing a third):
  draws in every Act I battle.
- **Pathing:** units no longer circle or bounce. A unit whose destination is taken stops alongside and the two dress into a line; a unit that makes no
  headway for 2.5 seconds files through friends at 60% pace; steering tries both sides. `node tools/pathtest.mjs` checks the cases.
- **Battle HUD:** at most three messages at a time in the top right, important ones only, each fading after a few seconds (all still in the report).
- **Buildings:** the Field Hospital now comes before the Armourer.
- **Acts III to V** are laid out (design only) in `docs/ACTS.md`: Africa and the old lands of Carthage (49 BC), Pharnaces and the Sarmatian steppe horse
  (48-47 BC), and Roman against Roman (46-45 BC, ending at Munda). The campaign map shows their markers.
- **Act III: Africa, 49 BC (playable).** Five battles after Act II: The Landing at Anquillaria, Castra Cornelia (side fight), The Walls of Utica
  (Romans against Romans), Water and Forage, and the named **Bagradas**, a historical defeat (Curio died there) where getting away is the goal.
  New enemies: Numidian horse that throw and wheel away, Numidian foot, war elephants that panic and trample their own side, Pompeian legions.
  New weather "African heat", the **Open Ranks** order (`.`) against elephants, a dry battlefield, a zoomed Act III map and an act introduction.
  Details in `docs/ACTS.md`.
- **Act IV: Pharsalus and Pontus, 48-47 BC (playable).** Pharsalus (optional, with Caesar's fourth line), The Road to Comana, The Steppe Riders,
  the named **Nicopolis** (a historical defeat: survive) and the named **Zela** (*veni, vidi, vici*). New enemies: Pompeian horse and archers,
  Pontic infantry drilled in the Roman manner, Sarmatian horse archers who shoot on the move and leave when out of arrows, armoured Sarmatian
  lancers, and scythed chariots (open ranks beat them). A Thessaly-to-Pontus map and an act introduction. Details in `docs/ACTS.md`.
- **Act V: Roman against Roman, 46-45 BC (playable), and the end of the campaign.** Ruspina, The Lines at Uzitta (side fight), Thapsus (with
  an unordered charge on your right), Ategua and the finale at **Munda**. Wavering Pompeian cohorts may come over to you: the better your goodwill
  (now your name for clemency), the likelier. After Munda, **the triumph in Rome** closes the campaign with an account of your war.
  Twenty-six battles in all. Details in `docs/ACTS.md`.
- **Side act: Britannia, 55-54 BC (optional).** Between Act II and Act III the map offers Caesar's two crossings to Britain: the landing in the
  surf, the Seventh caught at the harvest, the hillfort in the woods and the stronghold of Cassivellaunus. British war chariots (javelins,
  no scythes). Thirty battles in all. Art hand-off for an image AI: `docs/ART_BRIEF.md` with every prompt in `docs/ART_SHOTLIST.md`.
- **Smarter enemy lines (measured with `node tools/linetest.mjs`).** The enemy line front waits for stragglers; men waiting in ambush on open
  ground join the line instead of charging one by one; an enemy attacker hemmed in by its own side picks another target instead of
  climbing over them. Result: a much tighter advance (at Ariovistus the ragged front went from about 240 to 80 paces) and far less
  stacking in melee (56-85% of enemy line units overlapping a friend, now 21-64%). Your own units ordered through friends still pass.
- **Pompeian and Pontic legions fight like Romans:** a front line and a second line behind it. The second line relieves tired cohorts
  (they fall back to rest), steps into the gap when a cohort breaks, and joins the fight if you reach it. No feigned flights, no stretched lines.
- **Reputation cuts both ways (Act V and other Roman-against-Roman fights):** with goodwill below zero, a wavering cohort of yours may refuse
  to fight fellow Romans and march off (8% per point below zero, up to 24%), losing a third of its men. Wavering Pompeian cohorts still
  come over to you when your name is good. At most three of either per battle. The briefing shows both chances.
- **Painted camp ready:** upload the camp picture as `assets/art/camp.jpg` and the camp screen uses it, with the buildings' hotspots placed
  on it. Unbuilt buildings are dimmed with a question mark. Without the file the drawn camp is used.
- **Photographic battlefield ground:** the grass and forest textures (`assets/art/terrain_grass.jpg`, `terrain_forest.webp`) replace the drawn
  ground and woods: the grass laid as feathered, randomly flipped copies so no seam or repeat shows, woods cut to their real outline with a
  soft edge and shadow, lone trees cut from the canopy, and everything tinted to dry straw in Africa and high summer. It paints faster than the
  old drawn ground (0.26 s against 0.6 s at the start of a battle).
- **Marching through friends:** units you order to move or attack, and enemy units marching to a place, pass straight through friendly units
  that are not fighting, at 75% pace (it was 30%, with zigzag detours). They still go round friends locked in melee. A unit arriving where a
  friend already stands halts beside it, and idle units dress into line without jostling. Through a friendly line: 16 s instead of 23 s.
- **Surrender:** a unit that breaks while surrounded may lay down its arms instead of routing. Base chance 30%, more after a sudden bloody blow,
  with three or more enemies on it or when exhausted; less with friends nearby (12% each), inside your general's ring, for horse, for steady,
  veteran or elite units; never for wagons, elephants or chariots; at most 75%. A surrendered unit sits pale and unarmed, takes no part and
  cannot be attacked or commanded by the enemy. A friendly unit that reaches it while no enemy is within 80 paces frees it (35% morale, tired).
  When the battle ends, your surrendered men are freed if you win and lost as prisoners if you draw or lose; enemy units that surrendered to you
  join the prisoners you can ransom, sell, enrol or release. Bots see it about once a battle, three or four times at the Bagradas and Munda.


## Spoils, engines and the wider war (v0.7)
- **Soft map edge:** the camera can now pan about 40% of a screen beyond the battlefield, so units deployed on the edge are easy to click.
  The field edge is drawn as a dashed gold line; units still cannot leave the field.
- **Captured equipment:** after a win your men strip the field. Armoured foes (Gallic nobles, Pompeian and Pontic legions, lancers, Galatians)
  leave mail, every enemy leaves weapons, horsemen leave horses; surrendered units give almost everything, the dead much less; a draw gives a quarter.
  The result screen shows what was taken. At camp the Armourer can refit a cohort from the stores for a quarter of the denarii (25 men per item),
  and the Barracks can mount new horse from captured horses at half price.
- **Scorpiones (field artillery):** a bolt-thrower battery (40 men), unlocked after the landing at Anquillaria and raised everywhere. Long range
  (230), bolts that go through armour and shields, and hit dense formations hardest (half as well against skirmishers or a testudo). It must set
  up for 5 seconds after every move before it can shoot, and it cannot fight hand to hand.
- **Fieldworks (learned order, 2 wins, from a drill officer):** while deploying for a defensive battle, select infantry and press `;` (or "Dig in")
  to throw up a ditch and a staked rampart just in front of them. At most one work for every two infantry units. Men behind or in the works
  take 30% less from missiles; a charge into them hits at 35% of its force; an attacker crossing them is slowed and fights at 85%. Press again to
  fill a work in; moving the unit during deployment fills it in.
- **Regional recruits:** the Barracks raises local troops only where they live: Gallic infantry in Gaul, Galatians (armoured, Roman-drilled)
  in Pontus, Spanish caetrati (light, quick swordsmen) in Spain, Moorish horse (javelin cavalry) in Africa in 46 BC. Legionaries, slingers,
  archers, equites, auxiliary horse and scorpiones can be raised anywhere; units you already have stay with you everywhere.
- **Legates with traits:** when you have more than ten legionary cohorts, each legion's legate takes a trait from his temper: Aggressive
  (bold or rash: charges 12% harder, fights 5% harder), Steady (8% less morale loss), Careful (15% less morale loss while holding without orders)
  and, with drill 3 or more, Drillmaster (15% less fatigue). Traits apply only to cohorts of his legion inside his ring. The Officers' tent shows them.
- **What really happened:** after each named battle a card gives the historical outcome, the source (Caesar, the Alexandrian, African and
  Spanish Wars) and, where an ancient figure exists, your losses against Caesar's.

## Field hospital, medici and deployment (v0.8)
- **Medici (orderlies):** with a level 3 hospital you can train teams of 30 orderlies (260 denarii, 30 supplies, one unit of command).
  They do not fight. Any friendly unit that loses men inside a team's ring (green, 150 paces) gets an extra 35% of those men back after the
  battle (15% in a defeat), on top of the usual recovery. Left alone, a team walks up behind the nearest unit in melee and runs for cover
  behind a friendly unit when an enemy comes within 60 paces; a move order is obeyed first, and Hold keeps it still. In bot tests at
  Bibracte one team saved about 100 men a battle. The result screen shows how many they saved.
- **Treat the badly wounded:** once per camp, the hospital's surgeons can save 15% of the men lost in the last battle that did not return
  (more with Medicine in your career), for 2 denarii and half a supply each. They join the veterans waiting at the Barracks.
- **Every unit type now deploys:** scorpiones, Galatians, caetrati and Moorish horse were left out of the battle line by mistake; they now
  take their places (infantry in the line, missile troops behind, horse on the wings, medici at the rear).

## Hospital levels 4-5 and the army test (v0.9)
- **The hospital has five levels, one per camp:** 250, 500, 800, 1200 and 1700 denarii (20-80 supplies). Levels 1-3 add 30% wounded
  recovery each; level 3 unlocks the medici. Level 4, the **Surgeons' school**, adds 15% and doubles what "Treat the badly wounded"
  saves (30% instead of 15%). Level 5, the **Valetudinarium**, adds 15% and makes the medici better: a 200-pace ring, and they save half
  the men hit inside it instead of 35%.
- **`node tools/armytest.mjs [runs] [opponent|all] [slots|cost]`** fights armies of different make-up (all legions, legions with
  archers and horse, slingers, scorpiones, medici...) against the same enemies (a Pompeian mirror army, a mixed Pompeian army, a Gallic
  host, a Numidian army) on open ground, with the smart test bot in command. 'slots' gives every army 20 units; 'cost' gives every
  army the same denarii.

## Balance: every unit earns its place (v0.9)
An army test (`tools/armytest.mjs`) showed that with one command slot per unit, 20 legionary cohorts beat every mixed army, against
every enemy: 17 wins in 24 battles, against 3-7 for armies with horse and missile troops. Support units were a fraction of a cohort's
size in a full slot. The fix:
- **Half slots:** horse, slingers, archers, scorpiones and medici take half a command slot; a cohort of foot takes a whole one.
- **Bigger support units:** slingers 260 men, archers 240, equites 140 (a wing, not a turma), allied and Moorish horse 150, priced to
  match. Saves from before this change have their support units enlarged in proportion.
- **Hammer and anvil:** horse that strike the flank or rear of foot already held by your line hit 40% harder and shake it 40% more.
- **Missiles into a mass:** arrows and sling-shot do 15% more against packed foot (not a testudo), and their hits shake morale a little more.

Result (20 command slots each, 24 battles against four armies): a balanced mix of 17 cohorts with 2 archers, 2 slingers and 2 horse
won 19 and lost 2; legions with archers and horse 16-3; legions with slingers 14-4; all legions 13-3; legions with scorpiones 12-2.

## Decisive battles, sharper enemies, battle report, events on the march (v0.10)
- **No more grinding to the time limit:** a head-on melee wears the front ranks out and grows bloodier the longer it lasts (up to 80%
  more after about two and a half minutes of unbroken fighting; men pulled out of the fight recover). Once an army has lost 60% of its
  men and wavers, its units still in combat keep losing heart. In the army test, draws by time limit fell from about a third of
  Roman-against-Roman battles to almost none, and battles are 3-8 minutes shorter.
- **Cohorts grind down from the front:** every soldier figure keeps its own place and eases into its rank. Men fall on the side taking
  the blows (the front rank in a head-on fight, a flank, or the rear), their bodies drop there, and the ranks behind step up to fill
  the gap. Formation changes and losses flow instead of snapping.
- **Smarter enemy generals,** shaped by each commander's temper: enemy horse waits on the wing (a cautious chief up to two minutes, an
  aggressive one hardly at all) until your foot is pinned by his, then rides for its flank or rear, seeing off your horse if it comes
  close; a cunning chief picks shaken or already flanked units. Skirmishers fall back behind their own foot instead of straight away.
  Reserves are thrown at your weakest unit (as before). At Pharsalus Pompey's horse now does what it was meant to do.
- **Battle report:** the result screen has a "How they fought" column per unit: kills from flank and rear, in the charge, by missiles
  and by pila, wounded brought back by the medici, and how many each medici team saved.
- **Events on the march:** about two marches in three bring one decision on the campaign map, fitted to the theatre: a deserter or
  local guides (scout the next enemy), a tribe asking for help, fever in camp, a captured noble, traders, bad omens (morale next
  battle), allied horsemen for hire, Pompeian officers to pardon or ransom, veterans demanding pay (Caesar's "citizens" speech of 47 BC),
  storms wrecking supply ships. Every button shows its cost and effect. They live in `src/events.js`.

## New units and unit roles (v0.11)
- **Slingers and archers differ:** slingers have the shorter reach (100) but lead shot bruises through mail and shields (half the target's
  armour ignored): the answer to armoured foot. Archers have the longest reach on foot (155) and are deadly to the unarmoured, but
  arrows glance off mail (45% more armour). Measured: against Pompeian legions slingers kill about 15% more than archers; against Gauls
  the two are even, with archers safer at range.
- **Evocati (recalled veterans):** from the civil war (after Utica). A cohort of 400 of the steadiest men in the army, raised at the
  Barracks by spending 400 of your waiting veterans (plus 380 denarii). Their experience is never diluted. Six cohorts of them beat
  twenty plain legionary cohorts' worth of slots against a Pompeian army (6-0).
- **The Tenth Legion:** after the parley with Ariovistus (or the battle against him, if the parley was passed by) Caesar sends you the
  First Cohort of his own Tenth. It has +12 morale and wears a gold X on the field; cohorts within 180 paces of it lose 10% less
  morale; if it breaks, every other unit loses 8 morale. Campaigns already past the parley receive it on loading.
- **Ballistae (siege engines):** unlocked by taking the Sequani hill fort. Range 300, bolts that go through armour, four times as
  deadly against wagons. Too slow for open battle: they deploy only for assaults on strong places and fights against wagon camps.
- **Veteran specialisation:** a cohort of foot reaching Veteran picks how it fights for good: **Line** (+3% armour, +4 morale, long
  head-on fights wear it 40% more slowly), **Shock** (charges 20% harder, +4% attack, pursues 20% faster) or **Garrison** (enemy
  charges bite 15% less; on Hold or behind fieldworks +6% armour and 15% less morale loss).

## Great pitched battles: performance and the economy (v0.12)
- **`node tools/stress.mjs [scenario] [seconds]`** fights Munda with a full late army (80 command slots: 60 cohorts and 40 support units,
  101 units, 37,000 men) against a host sized to it (130 units, 50,000 men). The simulation is about 30% faster than before (cheaper
  distance checks, cached facings, the nearest-enemy search skips anything that cannot beat the best so far; results are unchanged).
- **Rendering big battles:** units off screen are no longer drawn; units so far away that a man would be a few pixels are painted as one
  patterned block of tiny figures; and the quality adjusts itself: when frames run slow, more distant units become blocks, and it eases
  back when there is room. Battles with more than 150 units step the simulation in tenths of a second (as all the balance tests do).
  In a headless browser with no graphics card the Munda test went from 15-26 frames a second to 40-55.
- **Battle messages name the right enemy:** the line, host and flank messages and the after-battle report used to call every enemy
  Gallic; they now say German, British, Pompeian or Pontic by theatre.
- **`node tools/economy.mjs`** plays the campaign as a run of victories with a greedy player who spends everything on cohorts.

## A tighter economy (v0.13)
Measured with `node tools/economy.mjs`, the old economy gave a greedy player 2.5 million spare denarii by Munda and filled the 80-slot
command limit by Act III: money stopped being a choice. Three changes:
- **Pay:** after every battle each soldier draws 0.12 denarii (less with the Economy career). The bill shows next to your denarii on the
  map and in camp. If you cannot pay, up to 8% of the men desert and the army fights with less heart in the next battle.
- **Prisoners lose value:** ransoms shrink as numbers grow (their kin can only raise so much), and selling captives gluts the slave
  markets, so every sale fetches less until the markets recover over the next battles.
- **Each unit costs more than the last:** beyond ten command slots, raising a unit costs 3% more per slot you already fill.
- Grain taken in battle grows more slowly than the enemy host, so a large army must still be fed.

With a player who spends a third of the income on drills, kit and the hospital and the rest on cohorts, the army now grows steadily
(12 units at Bibracte, 23 at the Rhine, 40 at the landing in Africa, about 70 at Munda), gold in hand stays at two or three cohorts'
worth, and supplies at about three marches' worth.

## Act III: Vercingetorix, winter quarters, standing in Rome, the Commentarii, commanders who remember (v0.14)
- **Act III: the great revolt of Vercingetorix, 52 BC** (between Britain and the civil war; the civil-war acts are now IV-VI):
  the Storm of Avaricum (in a rainstorm, as Caesar took it), Gergovia (Caesar's real defeat: take the camps and stop), the cavalry battle
  on the march (optional; Caesar's German horse), and Alesia in two stages: holding both siege lines at once against the relieving army
  and Vercingetorix's sally, then the camp below Mont Rea until Caesar's horse rides into the Gauls' rear. Alesia's siege lines are built
  into the battlefield: attackers crossing them are slowed and blunted, and Romans just behind them take less from missiles. Saves made
  before this change keep their place.
- **Winter quarters:** at the first battle of a new campaigning year you choose where to winter (among allies, in a fortified camp in
  hostile country, or in the Province) and how to spend it (drill, recruit, send gold to Rome, or save the money). Then Rome's verdict.
- **Standing in Rome (0-100, starts at 30):** wins raise it (+3, named battles +6), defeats sink it (-5, named -10); clemency in the
  civil war raises it. At 50+ the Senate votes you funds after each battle; at 70+ a draft of 300 veterans comes each winter; at 15 or
  less pay costs 25% more and your enemies move to recall you. Shown on the campaign map.
- **Commanders who remember:** Vercingetorix, Labienus, Juba, Scipio and Pharnaces meet you more than once. Each remembers the last fight
  and answers what beat him: more horse against your horse, more skirmishers and a quicker advance against your missile troops, a deeper,
  patient line against flank attacks; bolder if he won. The briefing says what he has learned.
- **The Commentarii:** a book (button on the campaign map) that fills in as you play, with entries on the people you meet, the places you
  fight and the troops you see, each with its ancient source.

## Spending your standing: Letters to Rome (v0.15)
Standing in Rome is now also a currency, spent at the **Officers' tent** under "Letters to Rome" (each request once per camp):
ask the Senate for funds (-10: 250 denarii plus 2.5 per man), grain ships (-6: 150 supplies plus 2 per 100 men), a draft of
300 veterans (-15), a proven officer from Rome (-20), or a larger command (-25: four more command slots for good, up to 16).
Spending it lowers what high standing gives by itself (funds after each battle at 50+, veterans each winter at 70+), and at
15 or less your pay costs a quarter more. Standing shows in the camp header next to your denarii.

## The result screen (v0.16)
What the battle brought now comes first: a **Spoils and news** card straight under the outcome lists the spoils and every
dispatch in one line each, gains in green first and costs (pay, losses, desertion) in red last. The battle report (chart, analysis, advice and key moments) is its own tab, not the default; "Your units" opens first.
Dispatches are no longer a tab.

## The ending, tips, settings and credits (v0.17)
- **The Triumph:** after Munda, a full account of your war: a title earned by your record and standing (from "A Survivor of the
  Wars" to "Pater Patriae"), the totals (battles, enemies fallen, your men lost, prisoners, standing), your best and most decorated
  cohorts, the officers who marched with you and those who fell, your career, Commentarii entries, every battle by act with its
  outcome, and what came after (the Ides of March). Totals are kept from this version on.
- **First-time tips:** one short line the first time each newer mechanic becomes yours (pay, half command slots, captured stores,
  fieldworks, Veteran specialisation, medici, Letters to Rome, evocati, ballistae, the Commentarii), on the campaign map, one at a time.
- **Settings** (the speaker button): text size (small, normal, large, largest; scales every screen and dialog, not the battlefield),
  a colour-blind palette (blue and orange in place of green and red, also on the battlefield's facing arcs), music and volume, and
  delayed orders. The game has no sound effects, only music.
- **Credits and sources:** the ancient sources, Natural Earth, the typefaces, the pictures and the music.

## New terrain tiles (v0.18)
Four photographic tiles (`assets/art/terrain_*.webp`, converted from the uploaded PNGs and listed in the art manifest):
**meadow** is mixed with the grass for more varied open ground; **hill** (rugged grass) is laid over every hill with a soft edge,
under the hillshade; **river** (a rocky stream) paints rivers as a band laid along their winding course, mirrored copy by copy so
it never shows a seam, with its phase tied to the map so neighbouring stretches join up; **ford** carries its track across the
water and fades into the river on either side. Africa's dry tint applies to all of them; frozen rivers keep the drawn ice.
