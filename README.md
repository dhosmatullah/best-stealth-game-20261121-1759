# Quiet Vault

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/dhosmatullah/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/dhosmatullah/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

Built for the [best-stealth-game-20261121-1759 bounty on make.fun](https://make.fun/bounty/best-stealth-game-20261121-1759).

A top-down stealth heist in three floors of the Harrowgate Museum. You are
the thief. The wardens patrol with sweeping vision cones, the marble is loud
under running feet, the ferns hide you, and the lamplight exposes you. Steal
the Brass Key, then the Silver Key, then the Moon Sapphire itself — and reach
the EXIT unseen.

## How to play

Serve the game and open it in a desktop browser:

```
node serve.ts
```

then open http://localhost:8080. No network request, no build step, no
audio files: every sound is synthesised in the browser with WebAudio.

| Key | Action |
| --- | --- |
| WASD / arrow keys | Move |
| C | Toggle sneak (slow, quiet, harder to spot) |
| Shift (hold) | Run (fast, loud — wardens hear the noise ring) |
| Click | Throw a pebble at that spot; wardens go to investigate |
| P / Esc | Pause |
| Enter / Space | Start, restart |

## The rules of the heist

- **Vision cones.** A warden sees you only inside its cone with a clear
  line of sight. The detection meter fills while you are seen — faster in
  lamplight, faster up close, faster while running — and drains once you
  break sight. A full meter raises the alarm and the warden chases.
- **The chase can be lost.** Break line of sight and the warden searches
  the last place it saw you, then gives up and returns to patrol. Getting
  caught is the only way the night ends.
- **Cover you can read.** Fern planters hide you, gravel betrays you,
  lamplight exposes you. The floor tells you what is safe before you step
  on it.
- **Pebbles.** Six to start, two more each floor down. A thrown pebble
  rings a noise that pulls the nearest warden off its route.
- **The job.** Floor 1: steal the Brass Key and take the stairs. Floor 2:
  the Silver Key, three wardens now. Floor 3: the Moon Sapphire sits in the
  vault room — take it, and the EXIT opens. Optional coins are worth 100
  points each.
- **Rank.** Finish with no alarm raised and you are a **GHOST**. Raise one
  or two alarms and escape anyway: **SHADOW**. Louder than that: **BRASS**.

## Screenshots

The four screenshots in `screenshots/` are real renders of the game's own
`?shot=` scenes: the lobby at its best, a near miss in the ferns, a chase
in full alarm, and the vault itself.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` (Node 22, standard library only).
- `serve.ts` — a tiny static server for local play.
- `game/index.html` — the page; everything it loads lives under `game/`.
- `game/src/config.js` — every tuning number and colour.
- `game/src/levels.js` — the three floors, built by a small grid builder.
- `game/src/world.js` — the world: floors, objectives, pickups, the win.
- `game/src/guards.js` — warden AI: patrol, scan, investigate, chase,
  search, return — and the detection meter.
- `game/src/vision.js` — line of sight, cone tests, raycasts.
- `game/src/player.js` — the thief: postures, wall sliding, pebbles.
- `game/src/render.js` — the canvas painter: floors, cones, HUD, screens.
- `game/src/audio.js` — synthesised WebAudio: footsteps, stings, chimes.
- `game/src/input.js` — keyboard and mouse.
- `game/src/shots.js` — the four staged screenshot scenes.
- `game/src/main.js` — boot, the fixed-step loop, and a headless self-test
  (`?selftest=1`).
- `game/src/random.js` — the seeded random source behind `?seed=N`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see `LICENSE`.
