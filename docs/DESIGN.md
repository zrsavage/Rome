# Design notes

## Pillars
1. **Grow an army, not a hero.** Persistent cohorts and officers; losses and veterancy matter.
2. **Fun over strict history.** Real battles are templates, not scripts. Difficult but winnable; **draws are a
   first-class outcome** (orderly withdrawal, time limit) with partial rewards.
3. **Preparation is gameplay.** Limited days between battles: train, forage, fortify, court or squeeze the locals.
4. **Escalating scale.** Early fights: 3-4 units a side. Late: multi-legion armies.

## Campaign structure (target 10-20 hours)
Each act: a few short minor fights, then a large named battle.

| Act | Theatre | Notes |
|---|---|---|
| I | Gaul, 58 BC | Done: the Helvetii, ending at Bibracte. |
| II | Upper Rhine, 58 BC | Done: Ariovistus and the Suebi. |
| III | Africa, 49 BC | The old lands of Carthage: Curio's campaign against Juba of Numidia and the Pompeians; the Bagradas as a historical defeat. |
| IV | Pontus and the Bosporus, 48-47 BC | Pharnaces II with Sarmatian steppe horse (the Scythians' heirs); Nicopolis, then Zela. |
| V | Africa and Spain, 46-45 BC | Roman against Roman: Ruspina, Thapsus, Munda. Epilogue: the triumphs in Rome. |

The full layout, with battles, new units, new rules and the history notes, is in `docs/ACTS.md`.

Historical-defeat scenarios use `rewardMult > 1` so a win or draw pays out a lot more troops and supplies.

## Systems
- **Battle:** real-time with pause; cohorts as units; angles (front/flank/rear), charge impact, pilum, ranged,
  morale/rout/rally, fatigue, terrain. Army-wide wavering at 40% strength.
- **Outcomes:** victory (enemy < 25%), draw (withdraw with >= 45% or time limit), defeat.
- **Camp:** drill (self mini-game vs. delegate), forage, fortify, rest, recruit, scout, tribute/gifts (goodwill
  shifts enemy strength +/-10%).
- **Officers:** tactics (combat/morale), drill (training), logistics (forage/fort), diplomacy (tribute). Level up
  through battle; can die (disabled on Tiro).
- **Difficulty:** enemy size and morale, Roman morale, officer risk, reward scaling.

## Roadmap
1. (done) Vertical slice: one battle + camp.
2. (done) Campaign map, Act I chain (5 minor + Bibracte), 3 save slots, objectives, reinforcements, battle-readability pass.
3. Unit roster expansion (hastati/principes/triarii, auxiliaries, archers, onagers/scorpions), unit upgrades/tech.
4. Battle features: reinforcements, fortifications/siege, weather/time of day, orders queue, better pathing.
5. Art pass (AI-generated sprites/portraits/map art - check Hugging Face periodically), UI polish.
6. Audio, full difficulty/balance pass, Acts II-V.

## Known limits / TODO
- Balance is first-pass; a headless harness (`npm run simtest`) exists. Aggressive play with cavalry is currently
  stronger than passive defence; tune enemy AI and add a smarter reference bot.
- No pathfinding (units go straight, blocked by enemy units, slowed by water/forest).
- Only one scenario; replaying it is possible from the result screen.
- Placeholder procedural art.

## Lessons taken from NapWorld
Battle readability (flank arcs, range rings, floating casualties, control groups, objectives), a headless balance harness,
and gradual difficulty tiers. Still to borrow: seasons and supply pressure on the map, generals with
traits, sound, a single-file build in `dist/`.

## Start of a campaign (new)
Origins (3 choices with tradeoffs) -> opening battle -> campaign map + army management. Modifiers live in `campaign.mods`
(`recovery`, `levy`, `supplyUse`, `spoils`, `xp`, `forage`, `morale`) and are read by the sim (recovery, morale), camp (food, foraging)
and `applyResult` (levies, XP) so new origins are one entry in `src/origins.js`.

## Teaching the game
No tutorial mode. The opening battle (First Blood at the Border) is a small, very winnable fight (30/30 wins even when idle) with contextual hints from `src/coach.js` that fire when relevant: advancing, enemy approaching, flanking arcs, morale, fatigue, waves, finishing. Each appears once and fades.

## Unit control (from NapWorld)
Adopted: friendly units never shove each other and marching through one is slow going (30% speed, only when actually marching into a
friend); moving missile units halt to fire when an enemy is in range ahead (Ctrl+right-click overrides); orderly fall back walks
backward facing the enemy; speed steps down to 0.5x. Not yet adopted: deployment phase with a placement zone, formation hotkeys
(line, column, square, skirmish), a general who rallies broken units, and a charge key.
