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
- **Camp phase** between battles (limited days): drill a cohort yourself (timing mini-game) or delegate to an officer, forage,
  fortify, rest, recruit, scout, demand tribute or give gifts. Fortifications improve morale and make orderly withdrawals easier.
- **Rewards:** victories and **draws** (orderly withdrawal or surviving to the time limit) give spoils and new units
  (Cretan archers, IV-VII Cohorts, allied Gallic horse). Defeat keeps you on the same battle; there is a replacement floor so a
  bad run cannot soft-lock the army.
- **Battle systems:** real-time with pause, facing, flanking/rear attacks, charge impact, pilum volleys, ranged fire, morale and
  routing, fatigue, terrain, testudo, objectives (capture-and-hold), reinforcements on both sides.
- **Battle readability:** flank arcs (green front / yellow flanks / red rear), range rings (V), floating casualty numbers, hit
  flashes, dust trails, destination ghosts with facing arrows, control groups, objective HUD.
- Officers level up and can die (not on Tiro). Cohorts keep XP, drill and condition across the campaign.

## Starting a campaign

New Campaign opens **Your Origins**, a short character creation in the spirit of Ultimate General: pick your family, early career
and approach (recommended picks are highlighted; a live summary shows starting denarii, supplies, soldiers, goodwill and
modifiers for wounded recovery, replacements, food use, spoils, experience, foraging and morale). Then you fight a short
**opening battle** (First Blood at the Border) and only afterwards reach the campaign map and army management, with a one-time
explanation of what to do there. Defeat in the opening battle simply lets you try again.

## Learning the game

- **Tutorial** (main menu): a guided practice battle with 12 steps that react to what you actually do: zoom and pan, select,
  move, battle lines, pause-and-plan, arcs and range rings, close order, control groups, slingers, holding a charge, and flanking.
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
| `Space`, `Z X C` | Pause, speed 1x/2x/4x (orders allowed while paused) |
| `Ctrl+1-9`, `1-9` | Set / recall control group (double-tap centres the camera) |
| `V` | Toggle range rings for all units |
| `H` / `T` | Hold position / toggle testudo (loose order for skirmishers) |
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
src/tutorial.js  guided tutorial
src/practice.js  tutorial scenario and practice battle builder
src/origins.js   character-creation choices, starting modifiers and their descriptions
src/art.js       art loader with procedural placeholders
src/main.js      screen flow, briefing, results, saves
tools/simtest.mjs  headless balance harness: node tools/simtest.mjs [runs] [scenario|all] [difficulty|all]
docs/DESIGN.md   scope, roadmap, open questions
```

## Status

Balance is first-pass: on Miles an aggressive plan with cavalry beats every scenario; passive defence usually loses; Centurion
and Imperator scale enemy size and morale. Art is procedural placeholder; AI-generated art is planned. See `docs/DESIGN.md`.
