# Acts III to V: layout (draft)

Status: **Act III is playable** (five battles, after Act II). Acts IV and V are design only; the map shows their markers as locked.

## The history problem, and the fix

The game starts in 58 BC. **Carthage was destroyed in 146 BC**, and Rome never fought the Scythians in Caesar's lifetime. So the
three themes asked for (Carthage, Scythians, Roman against Roman) are set where they really happened in Caesar's wars:

| Theme | What we use | Date | Why it is accurate |
|---|---|---|---|
| Carthage | **Africa, the old lands of Carthage**: King Juba I of Numidia and the Pompeians around Utica and the Bagradas river | 49 BC | Utica was Carthage's sister city; Curio's army camped in *Castra Cornelia*, Scipio's camp from the war that destroyed Carthage. Numidian horse were once Carthage's best troops. |
| Scythians | **The Bosporan kingdom of Pharnaces II** (Crimea and Pontus), with Sarmatian steppe horse of the Siraces and Aorsi | 48-47 BC | Strabo (11.5.8) records the Siraces and Aorsi sending horsemen to Pharnaces while he held the Bosporus. The Sarmatians were the steppe heirs of the Scythians; the Bosporus had been Scythian country for centuries. |
| Roman against Roman | **The last campaigns of the civil war**: Ruspina and Thapsus in Africa, then Munda in Spain | 46-45 BC | Real Roman-against-Roman battles; Munda was the last and hardest ("for the first time he fought for his life"). |

The order runs forward in time: Africa 49, Pharsalus and Pontus 48-47, Africa again and Spain 46-45. Act V returns to Africa,
which closes the "Carthage" thread with Thapsus and its elephants.

Britannia (54 BC, the old Act III plan) drops out for now. It could come back as an optional side act between Act II and Act III.

## Act III: Africa, the Old Lands of Carthage (49 BC) - built

After Gaul, the commander is lent to Gaius Scribonius Curio, who has to take Africa from the Pompeians. The ground is open, hot
and dry, and almost every enemy is on a horse.

| # | Battle | Posture | Notes |
|---|---|---|---|
| 1 | The Landing at Anquillaria | defend | Hold the beach while the transports unload. Numidian horse harass from every side. |
| 2 | Castra Cornelia | defend (side fight) | Fortify Scipio's old camp on its ridge. Win it and later fights start with a fortified camp. |
| 3 | The Walls of Utica | attack | Varus' Pompeian legion and Numidian foot before the city. The first Roman-against-Roman fight: a preview of Act V. |
| 4 | Water and Forage | defend | Water is short, and the Numidians raid every party sent for water and forage. A supply fight, like the Foragers' Road. |
| 5 | **The Bagradas** (named) | ambush | Saburra feigns retreat, then Juba's horse surround the army on the open plain. A *historical defeat*: Curio died here. Survive (withdraw in order or hold until dark) for large rewards; winning is possible but rare. |

New enemies:
- **Numidian horse:** fast, unarmoured, javelins. They never stand to fight: they throw, wheel away and come back. Roman horse cannot catch them on open ground. Counter: hold a tight line, use slingers and archers, and keep the baggage covered.
- **Numidian foot:** light infantry with javelins and small round shields (correct for Numidians, unlike Gauls).
- **War elephants** (one or two units at most; Juba is recorded with elephants in Africa): huge charge, terrify horses, and **panic when hurt**. A panicking elephant runs through the nearest unit of *either* side. Counter: missiles, legionaries opening lanes (a new "open ranks" order learned in Act III).
- **Pompeian legionaries:** the same troops as yours (see Act V).

New rules: **heat** (the "African heat" weather: everyone but the Numidians tires 40% faster), **water** (the wells are an objective to hold), and **open-plain fighting** (no woods to anchor a flank).

As built:
- Unit types `numid_cav`, `numid_inf`, `elephant`, `pompeian` in `src/data.js`; sprites in `src/sprites.js`. Numidian horse use the `numidian` AI (throw, wheel away from anything moving at them, come back; go for a flank when out of javelins; ride down routers).
- Elephants: a big charge (`chargePer`), terror that drains the morale of anything in contact (horse twice as much), missiles hurt their morale far more (`panicky`), and when they break they **stampede** (`stepRampage`): straight away from the enemy, trampling every unit in the way, their own side included. They never rally.
- **Open Ranks** (`lanes`, key `.`, taught after 7 wins): elephant charges into the cohort do 30% damage and their melee half, the elephants lose morale in the lanes, and the cohort's men fear them less; anyone else does 20% more damage to it.
- Ground is drawn dry and scrubby (`scn.dry`). Enemy weights: Numidian horse 1.6, foot 0.85, elephant 2.5 (per man; ten men to an elephant), Pompeian 1.15.
- Odds nudges: Anquillaria 0.85, Castra Cornelia 0.9, Bagradas 0.9. Bot results (normal, 4 runs each): the smart and tactician bots win roughly half of the first four; the Bagradas is mostly lost by bots that stand and fight, and drawn 4/4 by a bot that sounds the retreat after losing a third, which is the intended way through.

## Act IV: The Bosporus and the Steppe Horse (48-47 BC)

After Pharsalus the commander goes east with Gnaeus Domitius Calvinus. Pharnaces II, king of the Bosporus and son of Mithridates,
has invaded Pontus and Armenia Minor with his own army and steppe horse from beyond the Maeotis.

| # | Battle | Posture | Notes |
|---|---|---|---|
| 1 | **Pharsalus** (opener, optional) | attack | August 48 BC. Caesar's fourth line of picked cohorts stops Pompey's cavalry. Roman against Roman, a short set piece that teaches the mirror rules for Act V. Can be moved off-stage if the act should stay purely eastern. |
| 2 | The Road to Comana | attack | A small fight with Pontic raiders. |
| 3 | The Steppe Riders | defend | Sarmatian horse archers and lancers hit the column on the march. The baggage train is their target. |
| 4 | **Nicopolis** (named, December 48) | defend | Historical defeat: Calvinus' green legions (one raised in Pontus) break against Pharnaces' trenches and horse. Survive for big rewards. |
| 5 | **Zela** (named, August 47) | defend | Pharnaces' army charges uphill against Caesar's camp while it is still being fortified, with scythed chariots in front. *Veni, vidi, vici*: a short, sharp, winnable fight. |

New enemies:
- **Sarmatian horse archers:** shoot at range while riding, **fall back and shoot** when charged, and carry limited arrows. Counter: cavalry that can catch them, slingers who outrange them standing still, and keeping your horse fresh for the moment they run dry.
- **Sarmatian lancers:** heavy armoured horse (scale armour, long lance). Devastating in a frontal charge, poor when caught standing. Counter: a steady legionary line with pila.
- **Scythed chariots:** a single, very fast charge in a straight line. Huge damage to anything in its path, then spent. Counter: missiles before contact, or open lanes so they pass through (the "open ranks" order from Act III pays off here).
- **Pontic infantry:** Pharnaces had infantry drilled in the Roman manner. Good, but less steady than legionaries.

New rules: **the fortified camp under attack** (`fortdef` posture, 1.6x), where the first minute of Zela is the camp still being dug.

## Act V: Roman against Roman (46-45 BC)

The last Pompeians (Metellus Scipio, Labienus, Cato in Utica) hold Africa with King Juba; then Pompey's sons raise Spain. The enemy
fights like you, knows your tricks and has the same doctrines.

| # | Battle | Posture | Notes |
|---|---|---|---|
| 1 | **Ruspina** (named) | ambush | Labienus' Numidian horse and light foot surround Caesar's foraging column. Caesar forms a double-faced line (every other cohort turns about). Historical near-defeat; teaches the orbis and double line. |
| 2 | The Lines at Uzitta | assault | Siege lines and skirmishes for a ridge. |
| 3 | **Thapsus** (named) | attack | Scipio, Juba and their elephants. Caesar's veterans charge before the order (a "rash" moment the player can allow or stop). Caesar's archers and slingers panic the elephants, which wreck their own line. |
| 4 | Ategua | assault | A winter siege in Spain. |
| 5 | **Munda** (named, finale) | assault | Uphill against Pompey's sons and Labienus: thirteen Pompeian legions against Caesar's eight. Even, long and bloody. The battle turns when the enemy mistakes a movement on their flank for a retreat. |
| - | Rome | none | Epilogue, not a battle: the triumphs and the end of the campaign. Caesar never fought a battle in Rome, so the old "final battle in Rome" idea is dropped. |

New rules for Roman against Roman:
- **Mirror armies:** enemy legions use your unit types, doctrines (testudo, triplex acies, relief of the line) and veteran levels. The AI gets the smart bot's habits from `tools/simtest.mjs`.
- **Same colours:** both sides look alike in reality. The game keeps red for you and gives the Pompeians a different shield blazon and cloak colour, so units stay readable.
- **Defections:** goodwill becomes **reputation**. High reputation can make a wavering enemy cohort change sides mid-battle (this happened in the civil war); low reputation can make one of yours waver.
- **Veterans against recruits:** Pompeian legions in Spain were many and raw; yours are few and veteran. The posture ratio stays, but enemy experience drops and numbers rise.

## Systems to build, in order

1. **Act data:** the scenario format already supports acts, postures, phases, side fights and links. Each act is about five scenario entries in `src/data.js` with a zoomed map (like Act II).
2. **New unit types:** Numidian horse (skirmish-evade AI), elephants (panic and trample), horse archers (shoot while falling back), lancers, scythed chariots (one-shot charge), Pontic infantry, Pompeian legion (a recoloured legionary).
3. **New orders:** open ranks (lanes against elephants and chariots), double-faced line (Ruspina).
4. **New rules:** heat and water, defections and reputation, the camp being fortified while attacked.
5. **Map:** Act III zoom on the coast near Utica, Act IV on Pontus and the north coast of Asia Minor, with an inset for the Bosporus, Act V back to Africa then to southern Spain.
6. **Balance:** postures and the smart bot, as for Acts I and II.

## Accuracy checks to keep

- Numidians: no saddles or bridles (a neck rope), small round leather shields and javelins. Round shields are correct here, not on Gauls.
- Elephants in Juba's army: North African forest elephants, smaller than Indian ones, with no towers.
- Sarmatians: scale armour on the nobles, long lances, horse archers. Not Huns or Mongols.
- Pompeians: the same kit as Caesar's men (mail, scutum, pilum). Not segmentata, and not Imperial helmets.
- Place names as in 49-45 BC: Utica, Hadrumetum, Thapsus, Ruspina, Zela, Comana, Nicopolis (in Armenia Minor), Panticapaeum (the Bosporan capital), Corduba, Munda (the exact site is disputed).
- Uncertain points to state in-game: the exact site of Munda, and how many elephants Juba brought in 49 BC.
