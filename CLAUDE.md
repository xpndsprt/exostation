# EXOSTATION — Project Guide for Claude

A top-down space-station management sim (browser) — TypeScript + Vite + PixiJS.
Design lives in `GAME_DESIGN.md` / `BALANCE.md` / `BUILDINGS.md`; the engine in `src/`.

## Standing rules

### Keep the strategy guide in sync (important)
`STRATEGY.md` is the player-facing guide to **every mechanic**, ordered by importance
and appearance. **Whenever you change gameplay mechanics, update `STRATEGY.md` in the
same change** so it never drifts from the code. This includes:
- new/removed **modules, species, resources, tools, or systems**;
- changed **tuning numbers** (power draws, decay/recovery rates, thresholds, costs,
  timings, combat values) — update the inline numbers and the **Quick reference** table;
- new **controls / shortcuts / UI** the player needs to know.

`STRATEGY.html` is generated automatically from `STRATEGY.md` by the Markdown→HTML
hook — don't hand-edit it. A `Stop` hook reminds you if `src/` changed without a
`STRATEGY.md` update. Keep `BALANCE.md` consistent with the same numbers.

**Build costs:** the authoritative prices live in code (`STRUCTURES[*].cost` and
`TILE_COST` in `src/structures.ts`). `COSTS.md` mirrors them as the human-readable
source of truth — update it whenever you change a cost.

### Markdown → HTML
Every `.md` in this repo has a generated `.html` sibling (PostToolUse hook runs
`.claude/md2html.py`). Don't edit the `.html` files by hand.

### Build, test, commit
- After code changes: `npm run build` (strict tsc + Vite) **and** `npm test`
  (`scripts/simcheck.ts` — the headless sim checks). Add checks for new systems.
- Keep the simulation **state plain-JSON-serializable** (no class instances/functions)
  so save/load keeps working.
- **Commit locally; do not push unless asked.** End commit messages with the
  Co-Authored-By trailer.

## Architecture (quick map)
- `src/world.ts` — `World` state + create/place/erase helpers.
- `src/main.ts` — boot, fixed-step sim loop (10 Hz), input, camera, UI wiring.
- Systems (run per tick, in this order): `power → mining → food → atmosphere →
  agents → mood → combat → economy`.
- `src/rooms.ts` room detection · `src/pathfind.ts` A* · `src/renderer.ts` PixiJS
  layers · `src/ui.ts` DOM HUD/panels · `src/persistence.ts` localStorage save/load.
- Data: `src/structures.ts`, `src/species.ts`, `src/relations.ts`, `src/config.ts`.

## Milestones so far
M0–M8: build, power, atmosphere, crew (needs + A* pathfinding), mining, food, guests +
lodging, save/load, UI/UX pass. M9 multi-gas atmospheres + Thol; M10 political web
(relations → mood); M11 tension → skirmishes. See `MVP_SCOPE.md`.
