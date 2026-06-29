// Core types for the EXOSTATION MVP.
// MVP simplification: tile-based walls (a cell is space/floor/wall). The
// edge-wall model in TECH_DESIGN.md is a post-MVP refinement.

export type StructureKind =
  | "solar"
  | "toilet"
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
  | "orerefinery"
  | "table"
  | "library"
  | "bar";

export type Species = "human" | "drenn" | "thol" | "vryl" | "korro" | "vorn" | "chlorithe" | "naaz" | "voltaar" | "sszra";

export type FoodLine = "rations" | "fungal" | "protein" | "exotic";

export type GasKind = "o2" | "ch4" | "cl2" | "nh3" | "h2";

// Room climate band. Most species want "temperate"; a few exotic crews need their
// wing heated (Voltaar) or chilled (Naaz). Set by powered Heater / Cryo modules.
export type Temp = "cold" | "temperate" | "hot";

// What a room's atmosphere currently is: empty, a single breathable gas, or a
// lethal mix of incompatible gases.
export type RoomGas = "none" | GasKind | "mixed";

export type Tool = "floor" | "wall" | "door" | "storage" | "conduit" | "erase" | "pan" | "select" | StructureKind;

// A power conduit laid on a floor/storage cell. Relays the power grid's reach
// across the station; wears down and, at hp 0, breaks (stops conducting) until a
// crew member repairs it.
export interface Conduit {
  cell: number;
  hp: number; // 0..100; <=0 = broken (does not conduct)
  repairBy?: number; // agent id currently repairing it (-1/undefined = none)
}

export type Selection = { kind: "agent" | "structure" | "site"; id: number } | null;

export type OverlayMode = "none" | "power" | "rooms";

export type HoverTarget =
  | { kind: "agent" | "structure" | "site"; id: number }
  | { kind: "cell"; cell: number }
  | null;

// "door" is walkable (pathfinding) but blocks gas (atmosphere) — an airlock.
// "storage" is a walkable floor variant that is AIRLESS (never joins a breathable
// room) and storage-only (only a Light Fixture may be built on it). Crew haul
// produced goods onto it; it raises stockpile caps.
export type CellType = "space" | "floor" | "wall" | "door" | "storage";

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
  outBuf: number; // finished output units waiting for crew to haul to storage (producers stall when full)
  inBuf: number; // input feedstock units crew have delivered, ready to consume (Synth)
}

export type TaskType = "flee" | "eat" | "sleep" | "leave" | "service" | "relax" | "seal" | "court" | "haul" | "fixconduit" | "relieve" | "clean";

// An open hull breach (a vented wall cell) awaiting emergency repair by crew.
export interface Breach {
  cell: number; // the breached (now-space) wall cell
  sealer: number; // agent id repairing it, or -1 if unclaimed
  progress: number; // 0..1 toward resealed
}

// A floor mess (someone relieved themselves with no Lavatory) awaiting a crew clean-up.
export interface Mess {
  cell: number; // deck cell soiled
  cleaner: number; // agent id scrubbing it, or -1 if unclaimed
  progress: number; // 0..1 toward cleaned
}

export interface Task {
  type: TaskType;
  target: number; // destination cell index
  structureId?: number; // claimed structure (e.g. pod), or haul destination structure
  good?: string; // a haul task: which good is being carried (stock key)
  deliver?: boolean; // haul: true = deliver to structureId's input buffer; false = drop to storage (→ stock)
}

export interface Agent {
  id: number;
  species: Species;
  name: string; // individual given name (names.ts)
  mateId: number; // partner in a love-couple (romance.ts), -1 if single
  implantGas: GasKind | null; // a second gas they can breathe (cross-gas-couple implants)
  sight: number; // personal vision range (tiles): how far they spot faulty modules
  faceX: number; // facing direction (last movement); 0,0 = looking around (omni)
  faceY: number;
  guest: boolean; // transient visitor (pays lodging, departs)
  stay: number; // seconds remaining before a guest leaves (Infinity for residents)
  cell: number;
  o2: number; // 0..100
  suit: number; // 0..100 reserve; auto-dons in a non-native zone, then depletes
  food: number; // 0..100
  rest: number; // 0..100
  fun: number; // 0..100 recreation; restored at entertainment modules
  relief: number; // 0..100 bathroom need; at 0 they soil the floor (a Mess) unless a Lavatory is reached
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
  water: number; // ice harvested from comets; coolant/feedstock for advanced (Tier-2+) modules
  meals: Record<FoodLine, number>; // synthesized food, per line; eaten by crew
}

// Drones fly OFF the map to orbital bodies (no on-grid asteroids). The trip is:
// docked → outbound (lift off the pad toward space) → transit (off-map, to the
// body and back) → inbound (descend onto the pad, unload) → docked.
export type DroneState = "docked" | "outbound" | "transit" | "inbound" | "lost";

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
export type SiteKind = "asteroid" | "planet" | "moon" | "comet";

export interface Site {
  id: number;
  kind: SiteKind;
  name: string; // designation shown on the chart, e.g. "AX-7" / "Veil"
  angle: number; // current angle around its primary (advances each tick — it orbits)
  dist: number; // orbit radius: 0..1 around the star, or a small fraction for a moon
  discovered: boolean; // revealed once a drone has visited
  richness: number; // remaining units (hidden until discovered)
  yield: number; // units delivered per trip (hidden until discovered)
  orbSpeed: number; // radians/sec it travels around its primary (signed)
  parent: number; // site id it orbits as a moon, or -1 if it orbits the star/barycentre
  tint?: string; // visual colour on the chart (planet/asteroid type), or undefined
  ring?: boolean; // a gas giant with a visible ring
}

// A star at the system centre — one (central) or two (a binary pair orbiting the
// barycentre). Cosmetic: drones mine Sites, not stars.
export interface Star {
  angle: number; // position around the barycentre (0 for a lone star)
  dist: number; // separation from centre (0 for a lone star)
  orbSpeed: number; // radians/sec around the barycentre
  color: string; // draw colour
  r: number; // draw radius (chart units)
  kind?: string; // star class label (e.g. "red dwarf", "blue giant")
}

// A comet on a long eccentric path, criss-crossing the system (chart flair only).
export interface Comet {
  cx: number; // ellipse centre offset from the system centre (chart fraction)
  cy: number;
  a: number; // semi-major / semi-minor axes (chart fraction)
  b: number;
  rot: number; // ellipse rotation (radians)
  phase: number; // current angle along the ellipse
  speed: number; // radians/sec
  color: string;
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
  rotV?: number; // smoothed visual heading (radians) — eased so turns are graceful
  race?: Species; // which race's ship design to render (Ship Editor), if any
  hp?: number; // raider health — turrets laser this down to 0 to destroy it
}

// A pending social encounter between two co-located agents, awaiting the player's
// response in a paused dialog. The choice definitions/outcomes live in encounters.ts;
// only the instance (who + which kind) is stored on the world (serializable).
export interface Encounter {
  // conflict/bond = clash or friendship between two crew; deal = a (costed or
  // paying) proposal from a friendly pair; complaint = a gripe about one module.
  kind: "conflict" | "bond" | "deal" | "complaint";
  aId: number; // first agent
  bId: number; // second agent
  aSpecies: Species; // captured for the dialog text/portrait (agents may move/die)
  bSpecies: Species;
  cell: number; // where it happened
  variant?: number; // index into the flavor/scenario pool for this kind (stable text)
  subjectId?: number; // module the encounter is about (complaint), or undefined
  subjectKind?: StructureKind; // captured module kind, for the dialog text ({M})
}

// A race's "god" — a Q-like, ship-sized being that drifts through space and visits
// once its race is aboard. It judges that species' contentment: pleased → gifts,
// wrathful → unmakes a module. One per species (see GODS in gods.ts).
// The four "weird gods" — wild cards that don't judge a species' mood but warp
// the station outright: cut/boost power, or empty/fill the larder. See gods.ts.
export type WeirdGod = "blackout" | "surge" | "famine" | "feast";

export interface God {
  species: Species;
  x: number; // cell-space float position (drifts across the map)
  y: number;
  vx: number; // drift velocity (cells/s)
  vy: number;
  t: number; // seconds since it appeared
  judged: boolean; // has it delivered its verdict this visit?
  verdict: "none" | "pleased" | "wrathful" | "neutral"; // for the renderer flourish
  weird?: WeirdGod; // set ⇒ a weird god; `species` is then a cosmetic tint only
}

// A clutch of eggs a comfortable species lays (with your blessing) in the empty
// floor cells of your station. After an incubation it hatches — see spawn.ts.
export interface Egg {
  id: number;
  species: Species; // who laid it (and who its young/hunters will be)
  cell: number; // floor cell it sits on
  t: number; // seconds remaining until it hatches
}

// A hostile creature ("spider") hatched from a bad egg. It roams, bites crew and
// gnaws modules; the parent species (and the rest of the crew) hunt it down.
export interface Pest {
  id: number;
  species: Species; // the clutch it came from — that species hunts it hardest
  cell: number;
  health: number; // 0..100
  moveAcc: number; // 0..1 movement accumulator
}

// A boarding raider: a hostile humanoid that storms in from a raided dock, smashes
// modules and attacks crew until the crew/turrets put it down or it withdraws.
export interface Boarder {
  id: number;
  cell: number;
  health: number; // 0..100
  moveAcc: number; // 0..1 movement accumulator
  t: number; // seconds before it withdraws to its ship
}

// A pending reproduction offer: a contented species asks to lay a clutch and
// offers credits for your blessing. Paused dialog; one at a time (serializable).
export interface BreedOffer {
  species: Species;
  eggs: number; // size of the clutch they want to lay
  reward: number; // credits they pay if you allow it
}

// A love-couple: two crew of (usually) different species who fell for each other.
// Their love grows by the "day"; on turbulence days a dice-roll tests whether
// they stay together. A thriving couple thaws relations between their two species
// and works harder. See romance.ts.
export interface Couple {
  id: number;
  aId: number; // partner agent ids
  bId: number;
  aSpecies: Species; // captured for thaw/dialogs even if an agent dies
  bSpecies: Species;
  love: number; // 0..100, grows each calm day
  day: number; // relationship age in romance-days
  dayAcc: number; // seconds toward the next day
  implanted: boolean; // cross-gas implants granted (they can cohabit)
}

// A romance dialog awaiting the player (one at a time, serializable).
export interface RomancePopup {
  kind: "fell" | "turbulence" | "breakup" | "implant";
  title: string;
  body: string;
  good: boolean; // tone of the dialog (warm vs cold)
  aSpecies: Species; // portraits
  bSpecies: Species;
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
  stars: Star[]; // the system's star(s) — one central, or a binary pair
  comets: Comet[]; // decorative comets criss-crossing the Star Chart
  ships: Ship[];
  conduits: Conduit[]; // power cabling: relays grid reach across the station, decays + breaks
  gods: God[]; // active race-gods drifting past (gods.ts)
  godTimer: number; // accumulator toward the next god visit
  godVerdict: { species: Species; verdict: "pleased" | "wrathful" | "neutral"; weird?: WeirdGod } | null; // pending god-dialog popup
  blackoutT: number; // s remaining of a weird-god station blackout (all power dead)
  surgeT: number; // s remaining of a weird-god power surge (free surplus power)
  rooms: Record<number, RoomInfo>;
  power: PowerState;
  stock: Stock;
  credits: number;
  tradeTimer: number; // accumulator for periodic mineral trades
  crewTimer: number; // accumulator for resident-crew shuttle arrivals
  shipCooldown?: number; // quiet gap (s) between ship arrivals through the wormhole
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
  raidCount: number; // raids that have occurred — the FIRST one is a gentle introduction
  encounterTimer: number; // accumulator toward the next random social encounter
  encounter?: Encounter | null; // a pending crew encounter awaiting the player's choice
  breaches: Breach[]; // open hull breaches crew rush to reseal
  messes: Mess[]; // floor messes (no Lavatory) crew scrub away
  reputation: Partial<Record<Species, number>>; // 0..100 per species (default 50)
  requests: StationRequest[]; // active species requests (goals)
  reqTimer: number; // accumulator for spawning new requests
  seen: Species[]; // every species that has ever visited the station
  welcomed: Species[]; // species the Chronicler has already welcomed aboard
  story: string; // the Chronicler's current narrative line (story.ts)
  storyTimer: number; // accumulator toward the next chronicle entry
  storyBeat: string | null; // pending Command transmission (campaign beat id) awaiting the player
  firedBeats: string[]; // campaign beats already shown (save-persisted; never repeat)
  storyFlags: Record<string, number>; // remembered story choices (light branching)
  eggs: Egg[]; // incubating clutches laid by contented species (spawn.ts)
  pests: Pest[]; // spiders hatched from bad eggs, hunted by the crew
  boarders: Boarder[]; // raiders that stormed the station from a raided dock (boarding.ts)
  breedOffer: BreedOffer | null; // a pending "may we lay a clutch?" dialog
  breedTimer: number; // accumulator toward the next reproduction offer
  barTimer: number; // accumulator toward the next Bar social event (bar.ts)
  couples: Couple[]; // active love-couples (romance.ts)
  relThaw: Partial<Record<Species, Partial<Record<Species, number>>>>; // per-world relation lift from couples
  romance: RomancePopup | null; // a pending romance dialog (fell in love / turbulence / …)

  tick: number;
  speed: Speed;
  nextId: number;
}

export interface UIState {
  tool: Tool;
  lodgingSpecies?: Species; // which species the next Crew Quarters / Hotel Room is prepped for
}
