# EXOSTATION — Technical Design

> How the shipped game is actually built (roughly milestone M39 — well past the
> original [`MVP_SCOPE.md`](MVP_SCOPE.md) slice). Stack: **TypeScript + Vite +
> PixiJS**. Bias: the simplest model that's *correct* and stays plain-JSON
> serializable, so save/load and the headless tests keep working. Some systems
> deliberately stay zone-level rather than per-tile (atmosphere, power) — see
> the *Risks / deferred refinements* section. Tuning numbers live in code and
> are mirrored by [`BALANCE.md`](BALANCE.md) / [`COSTS.md`](COSTS.md); this doc
> references them rather than duplicating them.

## Stack & tooling
- **Vite** dev server + build; **TypeScript** strict; **PixiJS 8** (WebGL 2D) for
  the world canvas.
- **UI** is a plain HTML/CSS DOM overlay (top bar, build palette, info panel,
  tech/requests/advisor panels, banners, toasts) above the Pixi canvas — far
  simpler than drawing UI in Pixi.
- No game framework, no ECS library — a hand-rolled **state + systems** model
  (below).
- **Build:** `npm run build` = strict `tsc` then `vite build`.
- **Tests:** `npm test` runs `scripts/simcheck.ts` via **`tsx`** (not Vitest) —
  a headless harness that drives the real systems with a fixed `DT` and a
  `localStorage` shim, asserting ~160+ checks across power, rooms, pathfinding,
  atmosphere, food, mining, agents, mood, harmony, combat, economy, requests,
  objectives, research, events and persistence. Add checks here for new systems.
- **Sprite art** lives in `assets/sprites.js` (populates `window.SPRITES`),
  shared with `editor.html` — a standalone in-repo sprite editor.

## Architecture: state + systems
A single serializable **`World`** state object (`src/types.ts`), mutated each tick
by a fixed, ordered list of **system** functions. Rendering reads `World` and is
fully decoupled from the simulation.

```
simStep(world, dt):              // src/main.ts
  if (dirtyRooms) recomputeRooms // flood-fill room/enclosure detection
  powerSystem        // 1.  supply/draw, battery, brownout priority-shedding, faults
  maintenanceSystem  // 2.  machinery wears down while running
  miningSystem       // 3.  drone shuttle loop -> minerals
  foodSystem         // 4.  Vats grow base resources; Synths -> meals
  fuelSystem         // 4b. Fuel Refineries crack minerals -> fuel (sold to ships)
  overflowSystem     // 5.  spoilage + overflow morale flag once stores hit cap (M41)
  atmosphereSystem   // 6.  per-room gas (o2 / ch4 / mixed / none)
  harmonySystem      // 7.  per-room relations -> harmony (productivity + mood)
  agentSystem        // 8.  needs decay, suit/o2, utility task selection, movement
  moodSystem         // 9.  ease mood toward needs+social+harmony(+overflow) target
  combatSystem       // 10. tension -> skirmishes, deaths, collateral
  economySystem      // 11. upkeep sink, lodging, trade, immigration shuttles
  eventsSystem       // 12. periodic incidents (surge/breach/shock/raid — M38 teeth)
  requestsSystem     // 13. species requests/goals, reputation
  beaconSystem       // 14. Sector Beacon charge while species-staffed (win finale)
  objectivesSystem   // 15. scenario goal progression, win/lose
  world.tick++
```

### Tick / time model
- Fixed simulation step: **10 ticks/sec at 1×** (`SIM_HZ`), driven by an
  accumulator inside PixiJS's `app.ticker`; rendering is decoupled and happens
  on the same RAF, gated by a `needRedraw` flag.
- Speed = tick multiplier: Pause (0), 1× (10/s), 2× (20/s), 3× (30/s). The
  accumulator caps catch-up at 120 steps/frame to avoid spiral-of-death.
- While paused, a lightweight `refresh()` still recomputes rooms / power /
  atmosphere so edits show their effect immediately.

### Determinism
There is **no stored seeded PRNG**. The sim avoids `Math.random` in the per-tick
path: incidents and requests choose deterministically by **hashing `world.tick`**
(`(tick * 2654435761) >>> 0`), so a given save replays identically. The one
exception is `seedAsteroids()`, which uses `Math.random` *once* at new-game time
to scatter asteroids — but the result is baked into the saved `World`, so it
stays reproducible thereafter.

## Data model (real shapes — see `src/types.ts`)
```ts
type CellType = "space" | "floor" | "wall" | "door"; // tile-based; "door" walks but blocks gas
type GasKind  = "o2" | "ch4";
type RoomGas  = "none" | GasKind | "mixed";           // mixed = lethal to everyone
type Species  = "human" | "drenn" | "thol" | "vryl" | "korro";
type FoodLine = "rations" | "fungal";

interface Cell {
  type: CellType;
  roomId: number;       // -1 if not a floor room
  enclosed: boolean;    // floor sealed from open space (would hold atmosphere)
  structureId: number;  // -1 if none
}

interface Structure {
  id: number; kind: StructureKind;
  cell: number; cells: number[];   // anchor + all occupied cells (multi-tile)
  on: boolean; powered: boolean;   // player toggle / receiving power this tick
  occupantId: number;              // agent using a pod/hotel; -1 free
  timer: number;                   // production progress (vat/synth) or dock spawn accumulator
  condition: number;               // 0..100 upkeep; breaks (dead) at 0
  servicedBy: number;              // crew currently repairing it; -1
  recipe: string;                  // synth: "rations"/"fungal"; vat: "biomass"/"spores"
  faultT: number;                  // seconds of a power-surge fault left (offline); 0 = fine
}

interface Agent {
  id: number; species: Species; guest: boolean; stay: number; // Infinity for residents
  cell: number;
  o2: number; suit: number;        // suit auto-dons off native air, then depletes
  food: number; rest: number; fun: number;
  mood: number; health: number; tension: number; fighting: boolean;
  alive: boolean;
  task: Task | null; path: number[]; moveAcc: number;  // remaining cells; sub-cell progress
}

interface Stock { minerals: number; biomass: number; spores: number; meals: Record<FoodLine, number>; }
// NB: there is NO water resource. Food chain is base resource -> meal line.

interface World {
  w, h: number; cells: Cell[];     // flat, index = y*w + x
  dirtyRooms: boolean;
  structures, agents, drones, sites: Record<number, ...>;
  ships: Ship[]; rooms: Record<number, RoomInfo>;
  power: PowerState; stock: Stock; credits: number;
  tradeTimer, crewTimer, reqTimer, eventTimer: number; // system accumulators
  creditRate, prevCredits: number; // smoothed net ¢/s HUD readout
  phase: "playing"|"won"|"lost"; objectiveIx, loseTimer: number;
  unlocked: Record<string, boolean>;          // researched tech
  priceMult, priceT: number;                  // market shock multiplier + remaining time
  notify: string[];                           // toast queue drained by the UI
  overflow: boolean;                          // a store is wasting at its cap (M41 mood drag)
  breaches: Breach[];                         // open hull breaches crew rush to reseal
  reputation: Partial<Record<Species, number>>; requests: StationRequest[]; seen: Species[];
  tick: number; speed: 0|1|2|3; nextId: number;
}
```
`Task.type` is one of `flee | eat | sleep | leave | service | relax | seal`.

## Key systems

### Room / enclosure detection (`rooms.ts`)
Triggered when cells change (`dirtyRooms`). Two passes over the flat grid:
1. **Enclosure** — flood-fill *inward* from every border cell through any
   non-blocking cell (walls *and* doors block). Floor cells the fill never
   reaches are `enclosed` (they'd hold pressure); reachable floors are exposed.
2. **Rooms** — flood-fill groups connected `floor` cells (floor-to-floor only,
   4-dir) into numbered `roomId`s. A door does **not** merge two rooms — it's a
   pressure boundary — but it *is* walkable for pathfinding.

### Atmosphere (per-room zone — not per-tile physics) (`atmosphere.ts`)
Each enclosed room takes on the gas of the **powered atmosphere generator(s)
inside it**: one gas type → that gas (breathable only for the matching species);
two or more *different* gases → `"mixed"` (lethal to everyone); no generator or
not enclosed → `"none"` (vacuum). O₂ Generators emit `o2`; Methane Generators
emit `ch4`. No diffusion/decompression spread — a vented room flips instantly.

### Power (station-wide single network) (`power.ts`)
`supply = Σ gen` (solar), `batteryMax = Σ battery`. Consumers are modules with
`draw > 0` that are switched `on`. Broken (`condition ≤ 0`) and faulted
(`faultT > 0`) modules are skipped entirely (no gen, no draw, `powered = false`).
- If `supply ≥ draw`: everyone powered; battery integrates the surplus, clamped.
- If short but the battery can cover the deficit this tick: drain it, stay up.
- Otherwise **brownout**: battery to 0, then shed consumers in **ascending
  priority** (Life Support has the highest priority, so it's shed last) until
  `draw ≤ supply`. Per-module `priority` lives in `STRUCTURES`.

No conduit routing — adjacency/route graph is a deferred refinement.

### Maintenance (`maintenance.ts`)
Any module that draws power **wears down** (`condition` falls) while running.
Passive infrastructure (solar/battery, `draw = 0`) never wears. Below a service
threshold, crew pick it up as a `service` task and repair it; at `condition 0`
the machine is dead until repaired. Thol crew repair faster (trait).

### Needs + AI (autonomy) (`agents.ts`)
Per tick, `food`/`rest`/`fun` decay; guests' `stay` counts down. Air handling:
in **native** air (room gas == species gas) `o2` and the suit recharge; off
native air the **suit auto-dons** and depletes (covers brief transits, e.g.
crossing a door, which is itself a vacuum airlock tile); once the suit is empty
`o2` drains and at 0 the agent dies.

Task selection is **utility-by-priority** from the agent's *current* cell each
tick, in order:
1. **Emergency flee** to the nearest breathable room when off-air and the suit
   is running low (`nearestBreathable` BFS).
2. Departing **guest** heads to the nearest dock to `leave`.
3. Residents drop everything to **`seal`** an open hull breach (claim the nearest
   one, work from an adjacent interior cell; needs native air or a charged suit).
4. **`sleep`** when tired (crew in Crew Quarters, guests in Hotel Rooms).
5. **`eat`** when hungry *and* a meal of their food line is stocked.
6. **`relax`** at a Lounge when bored (also where socializing happens).
7. Residents **`service`** worn machinery; guests never take jobs.

Movement steps cell-to-cell at a fixed speed using `moveAcc` sub-cell
accumulation; `path` is recomputed via A\* on demand.

**Crew are not hand-placed.** Residents arrive by **immigration shuttle** when a
free bunk, a powered dock, a bunk in their breathable air, and stocked food they
can eat all line up (`economy.ts`); the system favours species diversity.

### Pathfinding (`pathfind.ts`)
**A\*** over walkable cells (`floor` + `door`), 4-directional, Manhattan
heuristic, linear-scan open set (fine at this grid size). Returns the cell list
to step onto (excludes start), `[]` if already there, `null` if unreachable.
`nearestBreathable` is a separate BFS to the closest room of a given gas.

### Mood, harmony & relations (`mood.ts`, `harmony.ts`, `relations.ts`)
`RELATIONS` is an asymmetric per-species opinion matrix using two strength tiers
each way (M42): **LOVE +15 / LIKE +8 / KIN +4 / DISLIKE −8 / HATE −15**.
**Harmony** is computed per room from the pairwise relations of its current
occupants and maps to a **productivity multiplier** (≈0.6–1.4) applied to food
production and repair speed. **Mood** eases toward a target of `base + needs +
nearby-neighbour social opinion (clamped ±45) + room harmony + command +
overflow`. The `overflow` term is a −5 station-wide drag set by `overflowSystem`
when any store is wasting at its cap (M41). The same `moodBreakdown` feeds the UI
tooltip.

### Overflow / spoilage (`overflow.ts`)
Runs after food/mining: a resource ≥95% of its cap **spoils** at 2%/s (floored at
95%, so it churns under the cap), and any store ≥99% sets `world.overflow` (the
mood drag above) + a toast. Makes overproduction a real cost instead of free
idling (M41).

### Combat: tension → skirmishes (`combat.ts`)
Tension rises while a disliked neighbour is in proximity — **fast** when morale
has cratered, or a **slow burn** in a chronically tense room even when everyone
is fed (so forcing rivals to cohabit eventually erupts). Separation bleeds it
off. At 100 tension an agent strikes the nearest disliked target (one-sided by
relation, damage scales with species `power`). A death can wreck a module in the
room as collateral — which may vent it into a breach.

### Mining (`mining.ts`)
Asteroids (`sites`) are scattered in open space. Each Bot Bay spawns a drone with
a shuttle FSM: `docked → outbound → mining → inbound → unload`. It auto-dispatches
to the nearest non-empty site; travel time scales with distance. Unloaded
minerals are added to stock up to the storage cap. Korro crew raise cargo
capacity (trait). Per-site standing orders are a deferred radar feature.

### Food (`food.ts`)
**Bio Vats** grow a base resource on a timer by recipe (`biomass` or `spores`);
**Rations Synths** convert a base resource into a **meal line** (`rations` from
biomass, `fungal` from spores). Crew eat the line their species eats. Production
idles at the storage cap, scaled by room productivity; Vry'l botanists boost
vats in their room (trait).

### Fuel & docks (`fuel.ts`, `economy.ts`, `structures.ts`)
**Fuel Refineries** convert **2 minerals → 3 fuel / 6 s** (`FUELREC`) while powered,
scaled by room productivity / AI Core / Industrialist; idle out of ore (needs a Bot
Bay) or at the fuel cap (`fuelSystem`, after mining). **Docking tiers** live in
`structures.ts` (`DOCK_KINDS` / `DOCK_TIER` — size, max guests, fuelNeed, padHalf);
`isDock(kind)` covers all three. All tiers place via the generalized `addDock(w,x,y,kind)`
as a hull-wall airlock. On a ship's `in→wait` landing, `economy.ts` sells `min(stockFuel,
ship.fuelNeed)` at 4¢/unit (×1.5 with a Vorn aboard — *Fuel Baron*), then disembarks guests
— larger berths set a bigger `ship.size` (sprite scale + pad) and a wider guest mix. Guests
are **gas-matched**: a shuttle carries `ship.gas`, and `GUEST_POOL[gas]` picks the species
(O₂ → drenn/human/vry'l, CH₄ → **vorn**/thol), so a methane wing with a CH₄ Hotel Room earns
its own lodging. The renderer reads `DOCK_TIER[kind].padHalf` for the pad and `ship.size` for
the ship scale.

### Storage (`storage.ts`)
Per-resource **caps** (biomass / spores / rations / fungal / minerals / fuel).
Production plateaus at the cap, so sizing production to population (and trading
ore to make room) is an ongoing decision. Each **Storage Silo** raises every cap
(gated behind the Cargo Logistics tech).

### Economy (`economy.ts`)
- **Upkeep sink:** crew **wages** + per-**operating-module** cost each tick. An
  idle station bleeds credits; only an active economy stays in the black.
- **Net-income readout:** `creditRate` is an exponentially-smoothed ¢/s shown on
  the HUD so lumpy payouts read as a trend.
- **Lodging:** living guests pay per second.
- **Guest arrivals:** a powered dock spawns Drenn visitors when a Hotel Room is
  free; Drenn reputation shortens the interval. A ship sprite parks at the dock.
- **Crew immigration:** the shuttle path above.
- **Trade:** with a powered Trade Hub and minerals in stock, a trader periodically
  buys a batch at the current `priceMult` (Drenn aboard raise the price).

### Tech tree (`research.ts`)
Credits spent at **powered Research Labs** buy unlocks (`unlocked` map); higher
tiers need more powered Labs. Each `UnlockDef` may carry `requires[]`
(prerequisite unlocks) and `excludes[]` (siblings it permanently locks). M40 adds:
prerequisites on the Tier-3 nodes (Fusion←Robotics, Bulk Trade←Commerce,
Cybernetics←Cargo Logistics) and a **mutually-exclusive doctrine fork** —
`doc_industry` / `doc_hospitality` / `doc_garrison`, each excluding the other two.
`canResearch(w, u)` is the single gate (labs + credits + requires + excludes) used
by `buyUnlock`, the tech panel and the toast feedback. `activeDoctrine(w)` /
`industryBoost(w)` expose the chosen specialization to the other systems
(mining/food/repair, economy lodging, raider damage). Gated build tools are locked
out of the palette until purchased.

### Incidents (`events.ts`)
After a grace period, periodic escalating incidents fire, chosen deterministically
by tick hash: **power surge**, **hull breach** (only with 2+ enclosed rooms so
crew can flee — vents a wall, crew rush to reseal), **market shock** (mineral
price ×2 or ×0.5), **raider** (a hostile ship chews modules until a powered Turret
drives it off). **M38 gives incidents teeth via redundancy gates:** a surge can
trip a life-support generator only when `surgeVulnerableLS` (no battery built **and**
a lone generator for that gas); `raiderDps(w)` scales with powered-module count
(8→26) and is halved by the Garrison doctrine; an undefended station (no Turret
ever built, 2+ rooms, not Garrison) exposes life support to the raider too. So the
counter to a lethal incident is cheap redundancy, not blanket immunity — and a
single-room beginner is still spared.

### Requests & reputation (`requests.ts`)
Seen species post time-limited **requests** (host N of us / keep us content /
build a Lounge). Fulfilling pays credits + **reputation**; letting one expire
costs reputation. Reputation (0..100, default 50) feeds back into guest arrival
frequency and trade.

### Objectives & win/lose (`objectives.ts`)
An ordered scenario goal list (grow crew → bank credits → host distinct resident
species). Clearing the list = **won**. **Lost** if the station has died, no
residents remain, and it can no longer attract crew — after a short grace timer
to avoid flicker during a recoverable wipe. `main.ts` pauses and shows an end
banner on the transition.

## Rendering (PixiJS) (`renderer.ts`, `camera.ts`)
- A single world `Container` holds the tile/structure/agent/drone/overlay layers;
  the camera is just that container's transform.
- **Camera:** drag (or right-drag) to pan, wheel to zoom toward the cursor
  (clamped `ZOOM_MIN..ZOOM_MAX`); `TILE = 24` world px/cell.
- Sprites come from `assets/sprites.js`; the renderer also draws overlays
  (power / rooms), a build ghost/cursor with validity tint, and species flashes
  for the locator.
- Draws are gated by `needRedraw`; the sim sets it whenever a step or edit
  changes state.

## UI (DOM overlay) (`ui.ts`)
- **Top bar:** credits + smoothed net ¢/s, power balance, sim clock, speed
  controls, save/load menu.
- **Build palette:** tools (floor/wall/door/erase/pan/select + every module);
  cost shown; locked tools greyed until researched; keyboard shortcuts
  (`TOOL_KEYS`, `[`/`]`/space for speed, Esc → select).
- **Info panel:** selected agent/structure detail + actions (toggle on/off,
  cycle recipe, deconstruct for a 50% salvage refund).
- **Side panels:** tech tree, active requests, Alienpedia (with species locator),
  rule-based **advisor** (`advisor.ts` surfaces the most urgent next steps),
  current objective, onboarding tutorial.
- **Feedback:** toast alerts (drained from `world.notify` plus client-side
  transition detection — brownout, skirmish, arrivals/deaths, hunger/air hints)
  and the win/lose end banner.

## Persistence (`persistence.ts`)
`World` is plain JSON → **localStorage**, across **named save slots**: an
**autosave** (every 30 s) plus **3 manual slots**. Each payload wraps the world
with a timestamp and a one-line summary for the load menu. **`loadWorld` runs a
`sanitize()` migration** that backfills fields missing from older saves
(including the legacy single-slot save and the old scalar `meals`/no-`spores`
stock shape), so old saves keep loading. Keeping `World` strictly
JSON-serializable (no class instances / functions) is a hard rule.

## Project layout
```
index.html  editor.html        // game + standalone sprite editor
package.json  tsconfig.json  vite.config.ts
assets/sprites.js              // window.SPRITES (shared with the editor)
scripts/simcheck.ts            // headless `npm test` harness (tsx)
src/                           // FLAT — no sim/ render/ ui/ data/ split
  types.ts  config.ts
  world.ts                     // World state + create/place/erase helpers
  main.ts                      // boot, fixed-step loop, simStep, input, camera/UI wiring
  power.ts maintenance.ts mining.ts food.ts atmosphere.ts harmony.ts
  agents.ts mood.ts combat.ts economy.ts events.ts requests.ts objectives.ts
  research.ts storage.ts
  rooms.ts pathfind.ts placement.ts
  structures.ts species.ts relations.ts advisor.ts
  renderer.ts camera.ts ui.ts persistence.ts
```

## Performance
80×60 grid, dozens of agents/drones, stable at 3×. The zone-level (not per-tile)
atmosphere and power models, the `needRedraw`-gated renderer, and typed-array
A\* scratch buffers keep it comfortably within budget. The A\* open set is a
linear scan — fine at this scale, a binary heap is the obvious upgrade if grids
grow.

## Risks / deferred refinements
- **Atmosphere creep:** per-room zones (no per-tile gas diffusion) are intentional;
  resist a full gas sim unless a mechanic demands it.
- **Edge walls:** the live model is tile-based (`space|floor|wall|door`); a
  per-edge wall bitmask was sketched in earlier docs and is a deferred refinement.
- **Power routing:** single station-wide network; conduit/adjacency routing deferred.
- **Pathfinding churn:** paths are recomputed on demand rather than globally
  cached; watch this if agent counts climb.
- **Save/load drift:** keep `World` strictly JSON-serializable, and extend
  `sanitize()` whenever the shape changes so old saves keep loading.
- **Determinism:** keep `Math.random` out of the per-tick path — hash `world.tick`
  for any new stochastic incident/choice so replays stay reproducible.
```
