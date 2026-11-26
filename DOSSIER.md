# Skyhawk Ridge Run — Dossier

**Bounty:** Make the best flight game (best-flight-game-20261126-0057, $500)
**Game:** Skyhawk Ridge Run — a chase-view flight game in a single static HTML file.
**Tech:** HTML5 Canvas 2D, vanilla JavaScript, zero network requests, zero external assets.
Every pixel is drawn in code: procedural terrain, sky, aircraft, instruments, rings.

## The game

You are the pilot of the Skyhawk, a light aerobatic jet, flying a ridge valley at
dawn. Ahead of you: a chain of golden target rings suspended over the valley, a
river winding below, pine ridges on both sides, and a runway strip at the far end
of the valley. Thread the rings for points, keep your speed up, watch the ridges,
and bring her down on the runway for a landing bonus.

## Controls

| Input | Action |
|---|---|
| Arrow Up / Down | Pitch down / up |
| Arrow Left / Right | Bank and turn |
| W / S | Throttle up / down |
| Space | Afterburner boost (burns fuel) |
| R | Reset flight |
| M | Toggle mouse steering |
| Click / tap | Start, restart after crash or landing |

Mouse steering: move the mouse left/right to bank, up/down to pitch.

## Instruments (all live, all lit)

- **HUD:** altitude (ft), airspeed (kts), heading (deg) — top bar, always visible.
- **Artificial horizon:** banking horizon ball with pitch ladder, bottom-left.
- **Altimeter dial:** analogue dial with needle, bottom-left cluster.
- **Airspeed dial:** analogue dial, bottom-left cluster.
- **Throttle gauge:** vertical gauge with afterburner zone, bottom-right.
- **Compass tape:** heading strip across the top of the screen.
- **Fuel gauge:** afterburner drains fuel; land before it runs dry.

## Scoring

- +100 per ring threaded, +25 style bonus for threading a ring dead-centre.
- Landing on the runway: +500 plus a speed/centreline bonus.
- Crash into terrain or the ground: run over, score kept, restart with R.
- Running out of fuel: forced glide — find the runway.

## Physics

Simple arcade flight model: speed follows throttle, altitude follows pitch,
heading follows bank angle, with gentle inertia and a stall warning below
90 kts. The valley is endless — terrain is generated procedurally from a
seeded ridge function, so no two runs are identical.

## Files

- `main.ts` — entrypoint: verifies the bundle, prints this dossier, or serves
  the game locally with `--serve [port]`.
- `game/index.html` — the whole game (canvas, physics, rendering, sound-free).
- `vendor/makefun-game.ts` — kit harness file, copied unchanged.
- `screenshots/*.png` — real renders of the game's own code (headless Chromium).

## Screenshots

- `1-takeoff.jpg` — rotation off the runway at dawn, instruments lit (the cover).
- `2-cruise.jpg` — chase view over the river valley, ridges both sides.
- `3-rings.jpg` — lining up a golden ring, HUD and horizon live.
- `4-final.jpg` — low over the runway on final approach, strip ahead.
