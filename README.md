# Sunset Keys

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Alim-14-code/gta6-01-r5/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Alim-14-code/gta6-01-r5/reward.svg)](https://make.fun/c/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/c/gta6-01). Play it offline in a
desktop browser: no build step, no network requests, every file under `game/`.

## The game

Kai Marlin, courier for the Keys Crew, works three sun-soaked islands joined
by bridges — Palmetto Cay, Marina Key and Sunset Isle. Drive and walk the
streets, steal cars, dodge traffic and pedestrians, outrun the police under a
five-star wanted system (with a helicopter at four stars), and run six story
missions: a delivery, a bridge chase, a timed sunset run, a quiet tail, a
heat-wave getaway, and the marina heist.

- **Open world:** three islands, bridges, a marina with docks and boats,
  traffic, pedestrians, a day that never leaves sunset.
- **Wanted system:** stealing and shooting raise the heat; police chase and
  ram; break line of sight to cool off; get caught on foot and you are busted.
- **Missions and story:** six jobs with objectives, timers, a tail that must
  never spot you, and cash that carries across sessions (localStorage save).
- **HUD and minimap:** cash, health, wanted stars, speed, mission briefing,
  and a live map of the islands, the cops and the objective marker.
- **Sound:** everything synthesized with WebAudio — engine, sirens, gunshots,
  pickup chimes and mission stingers. No audio files.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

WASD drive and walk · E enter or leave a car · Space shoot · Shift sprint ·
F handbrake · P pause · M restart the current mission · Enter start a mission.

## Files

- `game/index.html` — the page; `game/src/` — one module per job
  (`config`, `random`, `city`, `input`, `audio`, `people`, `vehicles`,
  `missions`, `hud`, `render`, `shots`, `main`).
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `screenshots/` — four real renders of the game (title, drive, chase,
  mission), staged by `shots.json` and `game/src/shots.js`.
- `serve.ts` — a tiny static server for local play.
