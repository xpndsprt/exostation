# EXOSTATION — Technical Design (MVP)

> How the [`MVP_SCOPE.md`](MVP_SCOPE.md) slice is actually built. Stack: **TypeScript + Vite + PixiJS**. Bias: simplest model that's correct; simplify hard systems (atmosphere, power) to room/station-level zones rather than per-tile physics.

## Stack & tooling
- **Vite** dev server + build; **TypeScript** strict; **PixiJS** (WebGL 2D) for the world canvas.
- **UI** as plain HTML/CSS DOM overlay (top bar, build palette, info panel) above the Pixi canvas — far easier than drawing UI in Pixi for an MVP.
- No game framework, no ECS library — a hand-rolled **state + systems** model (below). Vitest for a few pure-logic unit tests (power, room detection, pathfinding).

## Architecture: state + systems
A single serializable **`World`** state object, mutated each tick by a fixed, ordered list of pure-ish **system** functions. Rendering reads `World` and is fully decoupled from simulation.

```
tick(world, dt):
  powerSystem(world)        // 1. compute supply/draw, set brownout, gate consumers
  atmosphereSystem(world)   // 2. recompute room breathability
  needsSystem(world)        // 3. decay needs, mark urgencies
  aiSystem(world)           // 4. pick actions, advance pathfinding/tasks
  miningSystem(world)       // 5. advance drone shuttle loop
  economySystem(world)      // 6. accrue lodging credits, spawn guests
  cleanupSystem(world)      // 7. deaths, removals, dirty-flag resets
```

### Tick / time model
- Fixed simulation step: **10 ticks/sec at 1×** (accumulator pattern; render via `requestAnimationFrame`, decoupled).
- Speed = tick multiplier: Pause (0), 1× (10/s), 2× (20/s), 3× (30/s).
- Determinism: no `Math.random()` in render; sim randomness via a small seeded PRNG stored in `World` (keeps save/load reproducible).

## Data model (sketch)
```ts
type CellType = 'space' | 'floor';
interface Cell {
  type: CellType;
  walls: number;        // bitmask N/E/S/W edges
  structureId?: ID;     // module occupying this cell
  roomId?: ID;          // assigned by room detection
}
interface World {
  tick: number; speed: 0|1|2|3; seed: number;
  grid: { w: number; h: number; cells: Cell[] };   // flat array, idx = y*w+x
  rooms: Record<ID, Room>;
  structures: Record<ID, Structure>;
  agents: Record<ID, Agent>;
  drones: Record<ID, Drone>;
  sites: Record<ID, Site>;       // MVP: one asteroid
  power: { supply: number; draw: number; battery: number; batteryMax: number; brownout: boolean };
  stock: { biomass: number; water: number; meals: number };  // station inventory (Silo)
  credits: number;
  dirty: { rooms: boolean };
}
interface Room { id: ID; cells: number[]; enclosed: boolean; breathable: boolean; o2: boolean; }
interface Structure { id: ID; kind: StructureKind; cell: number; on: boolean; powered: boolean; integrity: number; }
interface Agent { id: ID; species: 'human'|'drenn'; cell: number; path?: number[];
  needs: { o2: number; food: number; rest: number }; mood: number; task?: Task; alive: boolean; guest: boolean; }
interface Drone { id: ID; state: 'docked'|'outbound'|'mining'|'inbound'; progress: number; cargo: {biomass:number;water:number}; bayId: ID; }
interface Site { id: ID; resource: 'mixed'; richness: number; distance: number; }
```

## Key systems

### Room detection (atmosphere boundaries)
- Triggered when structures/walls change (`dirty.rooms`).
- **Flood fill** over `floor` cells, not crossing walls/closed doors, to partition the grid into rooms.
- A room is **enclosed** if its flood fill never touches a `space` cell or the map edge. Open airlocks/doors connect rooms (merge or link for traversal).

### Atmosphere (per-room zone — *not* per-tile physics)
- For each room: `o2 = enclosed && hasPoweredO2Generator(room)`; `breathable = o2`.
- A breach (a wall removed/destroyed exposing the room to `space`) flips `enclosed=false` → not breathable. MVP skips gradual diffusion and decompression spread (deferred).

### Power (station-wide single network)
- `supply = Σ solar (× lit factor)`; `draw = Σ on&powered consumers`.
- If `draw > supply + availableBattery`: **brownout** — shed consumers in ascending **priority** (Life Support last to die), recompute, set `powered=false` on shed modules.
- Battery integrates `supply − draw` each tick, clamped `[0, batteryMax]`. (MVP ignores conduit routing; adjacency/route graph is a post-MVP refinement.)

### Needs + AI (autonomy)
- Each tick needs decay: `o2` only while in a non-breathable room (fast), `food` and `rest` slowly. Mood derives from need satisfaction.
- **Utility selection:** score candidate actions (FleeToBreathableRoom, Eat if meals>0, Rest if tired, Wander) by urgency; pick the highest **achievable** one.
- **Pathfinding:** A\* over walkable cells (floor, passable wall edge / open door), 4-directional, Manhattan heuristic. Cache paths; invalidate on grid change.
- Death: `o2` hits 0 → suffocate; prolonged `food` 0 → starve. Removes agent (guests just leave/are lost).

### Mining loop
- One Site at a `distance`. Drone FSM: `docked → outbound (progress to 1) → mining (fill cargo) → inbound → unload to stock → repeat`. Round-trip time scales with `distance` and bot tier.
- Synthesizer: when it has power + inputs, consume `biomass+water` → produce `meals` into stock on a timer.

### Economy
- Each occupied Sleeping Pod accrues lodging `¢/day` (scaled by tick). Docking Port periodically spawns a **Drenn** guest (seeded) up to capacity; guest seeks a vacant pod, lodges, pays, eventually departs.

## Rendering (PixiJS)
- Root **world `Container`** holds: a tile layer, a structure layer, an agent/drone layer, an overlay layer (room tint / power / breathable heatmap toggles).
- **Camera** = world container transform: drag to pan, wheel to zoom (clamp scale). Tiles ~24px world units.
- Sprites are placeholder graphics (colored `Graphics` rects/circles) — no art pipeline in MVP.
- Render pass diff-updates only changed cells/entities; full redraw only on big changes.

## UI (DOM overlay)
- **Top bar:** credits, power balance (supply/draw/battery), tick clock, Pause/1×/2×/3×.
- **Build palette:** pick a tile/module; ghost preview; click/drag to place, right-click to remove; cost validated against credits.
- **Info panel:** on selecting a structure/agent, show kind, state flags (powered/on/breathable/needs), and actions (toggle on/off, deconstruct).
- **Alerts:** toast feed for brownout / suffocation / starvation / guest arrival.

## Persistence
- `World` is plain JSON-serializable → **localStorage** save/load (single slot for MVP). Version field for forward migration.

## Project layout
```
index.html
package.json  tsconfig.json  vite.config.ts
src/
  main.ts            // boot: create app, world, loops
  sim/               // world.ts, systems/*.ts, pathfind.ts, rooms.ts, rng.ts
  render/            // renderer.ts, camera.ts, layers.ts
  ui/                // topbar, palette, infopanel, alerts (DOM)
  data/              // structures.ts (catalog stats), species.ts, config.ts
  types.ts
test/                // power, rooms, pathfind unit tests
```

## Performance targets
~80×80 grid, dozens of agents/drones, stable at 3× — comfortably within Canvas/WebGL budget given the zone-level (not per-tile) atmosphere and power models.

## Risks / watch-list
- **Atmosphere creep:** resist per-tile gas sim in MVP; room zones are enough to prove the loop.
- **Pathfinding churn:** invalidate caches narrowly on grid edits, not globally.
- **Power priority bugs:** unit-test brownout shedding order (life support must never be shed before commerce).
- **Save/load drift:** keep `World` strictly JSON-serializable (no class instances / functions in state).
