// Core types for the EXOSTATION MVP.
// MVP simplification: tile-based walls (a cell is space/floor/wall). The
// edge-wall model in TECH_DESIGN.md is a post-MVP refinement.

export type StructureKind =
  | "solar"
  | "battery"
  | "o2gen"
  | "ch4gen"
  | "cl2gen"
  | "nh3gen"
  | "h2gen"
  | "pod"
  | "synth"
  | "vat"
  | "bay"
  | "dock"
  | "rec"
  | "hotel"
  | "tradehub"
  | "lab"
  | "silo"
  | "turret"
  | "lamp"
  | "fusion"
  | "cargoex"
  | "aicore"
  | "fuelrefinery"
  | "docklarge"
  | "docksuper"
  | "heater"
  | "cooler"
  | "medbay"
  | "cmdhub"
  | "tradenexus"
  | "autoforge"
  | "bloomgarden"
  | "orerefinery";

export type Species = "human" | "drenn" | "thol" | "vryl" | "korro" | "vorn" | "chlorithe" | "naaz" | "voltaar" | "sszra";

export type FoodLine = "rations" | "fungal" | "protein" | "exotic";

export type GasKind = "o2" | "ch4" | "cl2" | "nh3" | "h2";

// Room climate band. Most species want "temperate"; a few exotic crews need their
// wing heated (Voltaar) or chilled (Naaz). Set by powered Heater / Cryo modules.
export type Temp = "cold" | "temperate" | "hot";

// What a room's atmosphere currently is: empty, a single breathable gas, or a
// lethal mix of incompatible gases.
export type RoomGas = "none" | GasKind | "mixed";

export type Tool = "floor" | "wall" | "door" | "erase" | "pan" | "select" | StructureKind;

export type Selection = { kind: "agent" | "structure" | "site"; id: number } | null;

export type OverlayMode = "none" | "power" | "rooms";

export type HoverTarget =
  | { kind: "agent" | "structure" | "site"; id: number }
  | { kind: "cell"; cell: number }
  | null;

// "door" is walkable (pathfinding) but blocks gas (atmosphere) — an airlock.
export type CellType = "space" | "floor" | "wall" | "door";

export type Speed = 0 | 1 | 2 | 3;

export type Phase = "playing" | "won" | "lost";

export interface Cell {
  type: CellType;
  roomId: number; // -1 if not part of a floor room
  enclosed: boolean; // floor sealed from open space (would hold atmosphere)
  structureId: number; // -1 if none
}

export interface Structure {
  id: number;
  kind: StructureKind;
  cell: number; // anchor grid index
  cells: number[]; // all occupied cells (multi-tile, e.g. solar arrays)
  on: boolean; // player toggle
  powered: boolean; // receiving power this tick
  occupantId: number; // agent using this (pods); -1 if free
  timer: number; // production progress (synth)
  condition: number; // 0..100 upkeep; machinery wears down and breaks at 0
  servicedBy: number; // crew currently servicing this; -1 if none
  recipe: string; // synth: food line ("rations"/"fungal"); vat: base ("biomass"/"spores")
  faultT: number; // seconds remaining of a power-surge fault (offline); 0 = fine
}

export type TaskType = "flee" | "eat" | "sleep" | "leave" | "service" | "relax" | "seal";

// An open hull breach (a vented wall cell) awaiting emergency repair by crew.
export interface Breach {
  cell: number; // the breached (now-space) wall cell
  sealer: number; // agent id repairing it, or -1 if unclaimed
  progress: number; // 0..1 toward resealed
}

export interface Task {
  type: TaskType;
  target: number; // destination cell index
  structureId?: number; // claimed structure (e.g. pod)
}

export interface Agent {
  id: number;
  species: Species;
  guest: boolean; // transient visitor (pays lodging, departs)
  stay: number; // seconds remaining before a guest leaves (Infinity for residents)
  cell: number;
  o2: number; // 0..100
  suit: number; // 0..100 reserve; auto-dons in a non-native zone, then depletes
  food: number; // 0..100
  rest: number; // 0..100
  fun: number; // 0..100 recreation; restored at entertainment modules
  mood: number; // 0..100 (needs + neighbor relations)
  health: number; // 0..100 (combat)
  tension: number; // 0..100 (toward a skirmish)
  fighting: boolean; // transient: throwing blows this tick
  injured: boolean; // wounded (from an encounter/skirmish): bleeds out without a Med Bay
  alive: boolean;
  task: Task | null;
  path: number[]; // remaining cells to step onto (excludes current)
  moveAcc: number; // 0..1 progress toward path[0]
}

export interface Stock {
  minerals: number; // mined from asteroids
  biomass: number; // grown in Vats; feedstock for Rations
  spores: number; // grown in Vats; feedstock for Fungal Mash
  microbes: number; // grown in Vats; feedstock for exotic food (Live-Protein / Exo-Culture)
  fuel: number; // refined from minerals at a Fuel Refinery; sold to docking ships
  meals: Record<FoodLine, number>; // synthesized food, per line; eaten by crew
}

// Drones fly OFF the map to orbital bodies (no on-grid asteroids). The trip is:
// docked → outbound (lift off the pad toward space) → transit (off-map, to the
// body and back) → inbound (descend onto the pad, unload) → docked.
export type DroneState = "docked" | "outbound" | "transit" | "inbound";

export interface Drone {
  id: number;
  bayId: number;
  siteId: number; // assigned orbital body, -1 if idle (no target)
  state: DroneState;
  t: number; // outbound/inbound: 0..1 flight progress · transit: seconds elapsed
  cargo: number; // units aboard (revealed on the return leg)
}

// An orbital body in the star system (NOT on the grid). You dispatch a Bot Bay's
// drone to it from the Star Chart. Unknown until a drone first visits ("discovered"),
// at which point its yield/richness are revealed. Every body gives minerals; the
// only difference is how much (yield/trip) and how much is left (richness).
export type SiteKind = "asteroid" | "planet";

export interface Site {
  id: number;
  kind: SiteKind;
  name: string; // designation shown on the chart, e.g. "AX-7" / "Veil"
  angle: number; // 0..2π position around the star map
  dist: number; // 0..1 normalized orbital distance (→ trip time + chart radius)
  discovered: boolean; // revealed once a drone has visited
  richness: number; // remaining units (hidden until discovered)
  yield: number; // units delivered per trip (hidden until discovered)
}

export interface Ship {
  cell: number; // the landing-pad centre tile (exterior, next to a dock)
  t: number; // seconds remaining while landed (or legacy depart timer)
  trader?: boolean; // a trade ship (buys minerals) vs a guest shuttle
  hostile?: boolean; // a raider — damages modules until destroyed by a Turret
  phase?: "in" | "wait" | "out"; // cinematic flight: approach → landed → depart
  prog?: number; // 0..1 progress within the in/out flight
  guests?: number; // passengers a shuttle drops on landing
  dx?: number; // outward unit direction from the hull (the approach axis)
  dy?: number;
  size?: number; // dock-tier scale (1 standard, 2 large, 3 super) — bigger ships
  fuelNeed?: number; // fuel units the ship buys on landing (income)
  gas?: GasKind; // breathing gas of the guests aboard (which hotels they can use)
}

// A pending social encounter between two co-located agents, awaiting the player's
// response in a paused dialog. The choice definitions/outcomes live in encounters.ts;
// only the instance (who + which kind) is stored on the world (serializable).
export interface Encounter {
  kind: "conflict" | "bond";
  aId: number; // first agent
  bId: number; // second agent
  aSpecies: Species; // captured for the dialog text/portrait (agents may move/die)
  bSpecies: Species;
  cell: number; // where it happened
  variant?: number; // index into the flavor pool for this pair+kind (stable text)
}

// A race's "god" — a Q-like, ship-sized being that drifts through space and visits
// once its race is aboard. It judges that species' contentment: pleased → gifts,
// wrathful → unmakes a module. One per species (see GODS in gods.ts).
export interface God {
  species: Species;
  x: number; // cell-space float position (drifts across the map)
  y: number;
  vx: number; // drift velocity (cells/s)
  vy: number;
  t: number; // seconds since it appeared
  judged: boolean; // has it delivered its verdict this visit?
  verdict: "none" | "pleased" | "wrathful" | "neutral"; // for the renderer flourish
}

export type RequestKind = "host" | "happy" | "amenity";

export interface StationRequest {
  id: number;
  species: Species;
  kind: RequestKind;
  target: number;
  t: number; // seconds remaining before it expires
  reward: number; // credits paid on fulfilment
  rep: number; // reputation gained on fulfilment
  penalty: number; // reputation lost on expiry
}

export interface RoomInfo {
  enclosed: boolean;
  gas: RoomGas;
  temp: Temp; // climate band from powered Heater / Cryo modules (default temperate)
  harmony: number; // -1..1 from relations among occupants (synergy vs friction)
}

export interface PowerState {
  supply: number;
  draw: number;
  battery: number;
  batteryMax: number;
  brownout: boolean;
}

export interface World {
  w: number;
  h: number;
  cells: Cell[]; // flat, index = y * w + x
  dirtyRooms: boolean;

  structures: Record<number, Structure>;
  agents: Record<number, Agent>;
  drones: Record<number, Drone>;
  sites: Record<number, Site>;
  ships: Ship[];
  gods: God[]; // active race-gods drifting past (gods.ts)
  godTimer: number; // accumulator toward the next god visit
  rooms: Record<number, RoomInfo>;
  power: PowerState;
  stock: Stock;
  credits: number;
  tradeTimer: number; // accumulator for periodic mineral trades
  crewTimer: number; // accumulator for resident-crew shuttle arrivals
  creditRate: number; // smoothed net ¢/s (income − upkeep) shown on the HUD
  prevCredits: number; // last tick's credits, for the rate calc
  phase: Phase; // playing / won / lost
  objectiveIx: number; // index into the scenario objective list
  loseTimer: number; // seconds the station has been non-viable (toward defeat)
  unlocked: Record<string, boolean>; // researched tech unlocks (see research.ts)
  eventTimer: number; // accumulator toward the next station incident (M29)
  priceMult: number; // current mineral-price multiplier (market shocks)
  priceT: number; // seconds remaining of the current market shock
  notify: string[]; // transient toast queue drained by the UI each frame
  overflow: boolean; // a resource is wasting at its storage cap (M41 morale drag)
  raidTarget?: number; // cell a raider is currently attacking (renderer beam); -1/undef = none
  encounterTimer: number; // accumulator toward the next random social encounter
  encounter?: Encounter | null; // a pending crew encounter awaiting the player's choice
  breaches: Breach[]; // open hull breaches crew rush to reseal
  reputation: Partial<Record<Species, number>>; // 0..100 per species (default 50)
  requests: StationRequest[]; // active species requests (goals)
  reqTimer: number; // accumulator for spawning new requests
  seen: Species[]; // every species that has ever visited the station
  welcomed: Species[]; // species the Chronicler has already welcomed aboard
  story: string; // the Chronicler's current narrative line (story.ts)
  storyTimer: number; // accumulator toward the next chronicle entry

  tick: number;
  speed: Speed;
  nextId: number;
}

export interface UIState {
  tool: Tool;
}
