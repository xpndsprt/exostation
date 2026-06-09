# EXOSTATION

A top-down space-station management sim for the browser — in the spirit of *Prison Architect* and *RimWorld*. Build a station module by module and run the busiest, most volatile crossroads in the sector: a **trading post, hotel, and fuel depot** all at once.

**Core thesis: station architecture *is* politics.** You never directly command anyone. You author the environment — atmospheres, food chains, room adjacency, drone directives — and the behavior of a dozen incompatible alien species emerges from your blueprint. Serve their needs and they collaborate; fail and tension hardens into armed skirmishes, breaches, and even a hostile takeover of your station.

## Pillars
- **Build & power** — grid-based modules, solar + batteries, life support you must zone and contain.
- **Resource gathering** — a Radar View of surrounding space; scan sites and assign a drone fleet (per-site, or per-resource standing orders).
- **Species & compatibility** — three tiers from kindred (shared air & food) to fully alien (exotic gas, diet, temperature), each needing its own sealed systems.
- **Politics** — an asymmetric web of loves and hatreds; adjacency is diplomacy.
- **Tech, profit & danger** — advanced species pay more but fight harder; skirmishes can vent a wing.
- **Structural integrity** — destroyed rooms can sever the station, forcing EVA spacewalks until you rebuild.

## Documents
| File | What it is |
|------|------------|
| [`GAME_DESIGN.md`](GAME_DESIGN.md) | The full design doc (all systems + an embedded copy of the balance sheet). |
| [`BALANCE.md`](BALANCE.md) | Standalone first-pass tuning sheet (species stats, yields, mood, combat, research). |
| [`BUILDINGS.md`](BUILDINGS.md) | Catalog of every buildable/interactive item: function, power draw, footprint, cost, states. |
| [`MVP_SCOPE.md`](MVP_SCOPE.md) | The tight first-build scope: what ships, what's deferred, milestones. |
| [`TECH_DESIGN.md`](TECH_DESIGN.md) | Technical/architecture design for the MVP (stack, tick model, systems, data model). |

Each `.md` has a nicely formatted `.html` sibling (e.g. `GAME_DESIGN.html`) generated automatically — open it in a browser for a styled read.

## Tooling
HTML versions are produced by a self-contained converter with **no third-party dependencies** (Python only — no pandoc or pip installs):

- `.claude/md2html.py` — Markdown → styled HTML (tables, nested lists, code, light/dark CSS).
- `.claude/md_hook.py` — a Claude Code `PostToolUse` hook entrypoint.
- `.claude/settings.json` — registers the hook so any `.md` written/edited in this repo regenerates its `.html` automatically.

To regenerate by hand:

```sh
python .claude/md2html.py GAME_DESIGN.md
```

## Running the game (MVP scaffold)
Stack: **TypeScript + Vite + PixiJS**.

```sh
npm install
npm run dev      # start the dev server, open the printed localhost URL
npm run build    # type-check (tsc) + production build to dist/
```

Current playable state (**M0 → M1**): boots to a rendered station grid with a
pan/zoom camera and a build palette. Place **Floor** and **Wall** tiles; the
sim continuously detects enclosed rooms and tints floor **green when sealed**
(would hold atmosphere) or **red when open to space**. Right-drag pans, wheel
zooms. See [`MVP_SCOPE.md`](MVP_SCOPE.md) for the milestone roadmap (power,
atmosphere, agents, mining, guests next).

## Status
Pre-production. Design complete for the MVP slice; engine scaffold builds and
runs (M0–M1). Next: power network (M2) and per-room atmosphere + a Human who
breathes (M3).
