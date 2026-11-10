# Music

Background music lives in `audio/` (played by `src/music.js`). Calm, ancient-feeling pieces play on the menu, map, camp and briefing screens; driving
orchestral pieces play in battle. Pieces are shuffled and crossfade; the player stays silent until the first click or key press, and the
speaker button (bottom-left, or in the battle toolbar) turns it off, sets the volume and skips to the next piece.

## Licence and credits

All recordings are by **Kevin MacLeod** ([incompetech.com](https://incompetech.com)), licensed under **Creative Commons: By Attribution 4.0**
(<https://creativecommons.org/licenses/by/4.0/>). They were downloaded from the artist's catalogue (`pieces.json` on incompetech.com), then
re-encoded to 80 kbps MP3 and loudness-matched (calm about -22 LUFS, battle about -18 LUFS) for this game, which counts as a modification.
The Egmont Overture is built from MusOpen source recordings. In-game credits: speaker panel, "Credits".

Required credit line (also shown in-game):

> Music by Kevin MacLeod (incompetech.com). Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/

| Pool | Piece | Composer |
|---|---|---|
| calm | Temple of the Manes, Teller of the Tales, Suonatore di Liuto, Lord of the Land, Old Road, Tabuk, Ritual, Ancient Rite, Desert City | Kevin MacLeod |
| battle | Egmont Overture | Ludwig van Beethoven |
| battle | In the Hall of the Mountain King | Edvard Grieg |
| battle | Danse Macabre | Camille Saint-Saens |
| battle | Five Armies, Clash Defiant, Noble Race, Heroic Age, Undaunted | Kevin MacLeod |

The calm pool was first European classical (Satie, Bach, Pachelbel, Holst); it was replaced with modal pieces for plucked strings, flutes, double
reeds and hand drums, which sit closer to what little is known of ancient Mediterranean music. None of it is a reconstruction of Roman music.

## Adding or replacing tracks

1. Put an MP3 in `audio/` (name it `calm-...` or `battle-...`).
2. Add it to `TRACKS` in `src/music.js` and to the table above (a CC BY track needs its credit).
3. `npm run build` copies `audio/` to `dist/audio/` (git-ignored) so `dist/legio.html` finds it. For the Artifact, publish the files with `files`.

Other sources considered: Wikimedia Commons public-domain recordings (rate-limited from the build environment), Musopen, Free Music Archive, OpenGameArt.
