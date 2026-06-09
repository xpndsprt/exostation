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
| [`STRATEGY.md`](STRATEGY.md) | Player strategy guide — every mechanic, ordered by importance & appearance. Kept in sync with the code. |

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
npm test         # headless sim sanity check (power → atmosphere → suffocation)
```

Current playable state (**M0 → M7 — MVP complete**):
- Boots to a station grid; pan (right-drag) / zoom (wheel) camera; build palette.
- **Build:** place Floor / Wall / Erase; live room detection seals enclosed floor.
- **Modules:** Solar, Battery, O₂ Generator, Rations Synth, Sleeping Pod, Bot Bay, Docking Port.
- **Power (M2):** station-wide supply vs draw with a battery buffer; on shortfall the
  top bar shows **BROWNOUT** and consumers shed by priority (life support last).
- **Atmosphere (M3):** an enclosed room with a *powered* O₂ generator turns
  breathable (cyan tint). Crew hold O₂ in air and **suffocate** in vacuum/brownout.
- **Needs + AI (M4):** crew get hungry and tired (orange ring), then **A\*-pathfind**
  to a Rations Synth to eat or a Sleeping Pod to sleep.
- **Mining (M5):** place an **Asteroid** in space + a **Bot Bay**; its drone mines and
  shuttles biomass+water back, which the synth turns into meals — a self-sustaining loop.
- **Guests + economy (M6):** a **Docking Port** brings **Drenn** guests (gold ring),
  capped by your Sleeping Pod count; they lodge, pay **credits** (¢ in the top bar),
  and depart after their stay.
- **Polish (M7):** **Save/Load** (localStorage) survives a refresh; the **Select** tool
  opens an info panel with an entity's live state (O₂/food/rest, power, occupancy,
  richness); **toast alerts** announce brownouts, deaths, and guest arrivals/departures.
- **UI/UX pass (M8):** ghost placement preview with green/red validity tint and an
  invalid (`not-allowed`) cursor; **drag-rectangle** build for Floor/Wall/Erase with a
  size label; **hover tooltips** for crew/modules/asteroids/cells; **keyboard shortcuts**
  (tools, `Space` pause, `[`/`]` speed, `Esc` select) shown on palette buttons; info-panel
  **Deconstruct** / **toggle on-off**; HUD **chips** (credits, power+battery bar, crew,
  meals, resources) with a **BROWNOUT banner** and paused/speed watermark; **click-to-focus**
  + grouped alerts and contextual hints (no-O₂, starvation); **overlay** views (Power /
  Rooms); **Recenter**; **autosave** every 30s.
- **Time:** Pause / 1× / 2× / 3×.

### Beyond the MVP (M9–M11) — *architecture is politics*
- **Multi-gas atmospheres (M9):** generators emit a specific gas; a room takes that
  gas, and **two different gases in one room is a lethal "mixed" hazard**. The **Thol**
  breathe methane, so they need a sealed wing of their own — the zoning/airlock puzzle.
- **Political web (M10):** species hold asymmetric opinions; living near a liked
  neighbor lifts **mood**, a disliked one drops it (mood dot over each crew member).
- **Tension & skirmishes (M11):** sustained low mood next to a disliked species builds
  **tension** into a **skirmish** — fights cause casualties and **collateral that can vent
  a room**. Build well and they collaborate; build badly and it ends in blood.

### Controls
- **Left-drag** build · **right-drag** pan · **wheel** zoom · **Select** tool to inspect.
- Keys: tool hotkeys (shown on buttons), `Space` pause, `[` / `]` slower/faster, `Esc` → Select.

Try it: build a sealed room with Solar, O₂ Generator, Rations Synth, a few Sleeping
Pods, a Bot Bay, and a Docking Port; place an Asteroid in space; add a Human and run
at 3×. The drone mines, the synth cooks, Drenn guests arrive and pay rent, and
everyone eats/sleeps on their own.

## Status
**M0–M11 complete.** MVP loop (build → power → atmosphere → crew → mining → food →
guests + lodging) plus save/load and a full UI/UX pass, and now the core
*architecture-as-politics* systems: multi-gas atmospheres, the species political web,
and tension/skirmishes. **49/49 headless sim checks pass** (`npm test`).

Post-MVP candidates (from [`GAME_DESIGN.md`](GAME_DESIGN.md)): Tier 2/3 species &
multi-gas atmospheres, the political web, skirmishes/takeover, the radar layer with
survey + standing orders, build costs, and real art. See [`MVP_SCOPE.md`](MVP_SCOPE.md).
