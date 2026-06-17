import { Agent, Cell, CellType, Site, Species, Structure, StructureKind, World } from "./types";
import { GRID_W, GRID_H } from "./config";
import { nameFor } from "./names";

export const GUEST_STAY = 90; // seconds a Drenn guest stays before leaving

export function createWorld(): World {
  const cells: Cell[] = new Array(GRID_W * GRID_H);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { type: "space", roomId: -1, enclosed: false, structureId: -1 };
  }
  return {
    w: GRID_W,
    h: GRID_H,
    cells,
    dirtyRooms: true,
    structures: {},
    agents: {},
    drones: {},
    sites: {},
    ships: [],
    gods: [],
    godTimer: 0,
    godVerdict: null,
    rooms: {},
    power: { supply: 0, draw: 0, battery: 0, batteryMax: 0, brownout: false },
    // Generous starting biomass so the synth feeds crew for a long while — the
    // player needn't spend on Bio Vats right at the start.
    stock: { minerals: 0, biomass: 300, spores: 0, microbes: 0, fuel: 0, meals: { rations: 0, fungal: 0, protein: 0, exotic: 0 } },
    credits: 1000, // starting funds to build the first station
    tradeTimer: 0,
    crewTimer: 0,
    creditRate: 0,
    prevCredits: 1000,
    phase: "playing",
    objectiveIx: 0,
    loseTimer: 0,
    unlocked: {},
    eventTimer: 0,
    priceMult: 1,
    priceT: 0,
    notify: [],
    overflow: false,
    encounterTimer: 0,
    encounter: null,
    breaches: [],
    reputation: {},
    requests: [],
    reqTimer: 0,
    seen: [],
    welcomed: [],
    story: "",
    storyTimer: 0,
    eggs: [],
    pests: [],
    breedOffer: null,
    breedTimer: 0,
    couples: [],
    relThaw: {},
    romance: null,
    tick: 0,
    speed: 1,
    nextId: 1,
  };
}

export const idx = (w: World, x: number, y: number): number => y * w.w + x;

// For lodging (pod/hotel) the `recipe` field stores the species the room is
// prepped for — only that species may sleep there. Defaults: crew→human, hotel→drenn.
export const defaultRecipe = (kind: StructureKind): string =>
  kind === "vat" ? "biomass" : kind === "synth" ? "rations" : kind === "pod" ? "human" : kind === "hotel" ? "drenn" : "";

export const inBounds = (w: World, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < w.w && y < w.h;

export function setCell(w: World, x: number, y: number, type: CellType): void {
  if (!inBounds(w, x, y)) return;
  const i = idx(w, x, y);
  const c = w.cells[i];
  if (c.type === type) return;
  // Removing a floor also removes anything built on it.
  if (type !== "floor" && c.structureId >= 0) removeStructure(w, c.structureId);
  c.type = type;
  w.dirtyRooms = true;
}

// Place a structure on a floor cell. Returns true on success.
export function addStructure(w: World, kind: StructureKind, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  const i = idx(w, x, y);
  const c = w.cells[i];
  if (c.type !== "floor" || c.structureId >= 0) return false;
  const id = w.nextId++;
  const s: Structure = {
    id,
    kind,
    cell: i,
    cells: [i],
    on: true,
    powered: false,
    occupantId: -1,
    timer: 0,
    condition: 100,
    servicedBy: -1,
    recipe: defaultRecipe(kind),
    faultT: 0,
  };
  w.structures[id] = s;
  c.structureId = id;
  if (kind === "bay") spawnDrone(w, id);
  return true;
}

function spawnDrone(w: World, bayId: number): void {
  const did = w.nextId++;
  w.drones[did] = { id: did, bayId, siteId: -1, state: "docked", t: 0, cargo: 0 };
}

// Place a multi-tile structure occupying the given cells (e.g. a solar array).
export function addStructureMulti(w: World, kind: StructureKind, cells: number[]): boolean {
  if (cells.length === 0) return false;
  for (const c of cells) if (w.cells[c].structureId >= 0) return false;
  const id = w.nextId++;
  const s: Structure = {
    id,
    kind,
    cell: cells[0],
    cells: [...cells],
    on: true,
    powered: false,
    occupantId: -1,
    timer: 0,
    condition: 100,
    servicedBy: -1,
    recipe: defaultRecipe(kind),
    faultT: 0,
  };
  w.structures[id] = s;
  for (const c of cells) w.cells[c].structureId = id;
  if (kind === "bay") spawnDrone(w, id);
  return true;
}

// Remove a structure and clear every cell it occupied.
function removeStructure(w: World, id: number): void {
  const s = w.structures[id];
  if (!s) return;
  for (const c of s.cells ?? [s.cell]) if (w.cells[c]) w.cells[c].structureId = -1;
  delete w.structures[id];
}

const ADJ = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const isWalkable = (w: World, i: number): boolean =>
  w.cells[i].type === "floor" || w.cells[i].type === "door";

// A reachable (walkable) cell for a structure: the cell itself if walkable
// (floor machinery), else an adjacent walkable cell (wall-mounted docks). -1 if none.
export function accessCell(w: World, s: Structure): number {
  for (const c of s.cells) if (isWalkable(w, c)) return c;
  for (const c of s.cells) {
    const x = c % w.w;
    const y = (c / w.w) | 0;
    for (const [dx, dy] of ADJ) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(w, nx, ny) && isWalkable(w, idx(w, nx, ny))) return idx(w, nx, ny);
    }
  }
  return -1;
}

// An exterior (space) cell adjacent to a structure — where a ship parks.
export function exteriorCell(w: World, s: Structure): number {
  for (const c of s.cells) {
    const x = c % w.w;
    const y = (c / w.w) | 0;
    for (const [dx, dy] of ADJ) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(w, nx, ny) && w.cells[idx(w, nx, ny)].type === "space") return idx(w, nx, ny);
    }
  }
  return -1;
}

// Whether a wall cell can host a Docking Port: it must border interior floor
// AND exterior space (a hull airlock).
export function canDock(w: World, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  const i = idx(w, x, y);
  const c = w.cells[i];
  if (c.type !== "wall" || c.structureId >= 0) return false;
  let floorN = false;
  let spaceN = false;
  for (const [dx, dy] of ADJ) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(w, nx, ny)) continue;
    const t = w.cells[idx(w, nx, ny)].type;
    if (t === "floor") floorN = true;
    if (t === "space") spaceN = true;
  }
  return floorN && spaceN;
}

// Place a Docking Port on a hull wall (it stays a wall — an airlock to ships).
// `kind` selects the tier (dock / docklarge / docksuper); all dock the same way.
export function addDock(w: World, x: number, y: number, kind: StructureKind = "dock"): boolean {
  if (!canDock(w, x, y)) return false;
  const i = idx(w, x, y);
  const id = w.nextId++;
  w.structures[id] = {
    id,
    kind,
    cell: i,
    cells: [i],
    on: true,
    powered: false,
    occupantId: -1,
    timer: 0,
    condition: 100,
    servicedBy: -1,
    recipe: "",
    faultT: 0,
  };
  w.cells[i].structureId = id;
  return true;
}

// A Bot Bay mounts on a space-facing hull wall (like a Docking Port) but occupies
// 1×2: the wall cell + the interior floor cell directly behind it. Drones launch
// out through the wall into space; crew service it from the interior cell.
export function canBay(w: World, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  const c = w.cells[idx(w, x, y)];
  if (c.type !== "wall" || c.structureId >= 0) return false;
  for (const [dx, dy] of ADJ) {
    const sx = x + dx, sy = y + dy; // space side
    const ix = x - dx, iy = y - dy; // interior side (opposite)
    if (!inBounds(w, sx, sy) || !inBounds(w, ix, iy)) continue;
    if (w.cells[idx(w, sx, sy)].type !== "space") continue;
    const ic = w.cells[idx(w, ix, iy)];
    if (ic.type === "floor" && ic.structureId < 0) return true;
  }
  return false;
}

// Place a Bot Bay on a valid hull wall. Returns true on success.
export function addBay(w: World, x: number, y: number): boolean {
  if (!canBay(w, x, y)) return false;
  let interior = -1;
  for (const [dx, dy] of ADJ) {
    const sx = x + dx, sy = y + dy, ix = x - dx, iy = y - dy;
    if (!inBounds(w, sx, sy) || !inBounds(w, ix, iy)) continue;
    if (w.cells[idx(w, sx, sy)].type === "space" && w.cells[idx(w, ix, iy)].type === "floor" && w.cells[idx(w, ix, iy)].structureId < 0) {
      interior = idx(w, ix, iy);
      break;
    }
  }
  if (interior < 0) return false;
  const wall = idx(w, x, y);
  const id = w.nextId++;
  w.structures[id] = {
    id, kind: "bay", cell: wall, cells: [wall, interior],
    on: true, powered: false, occupantId: -1, timer: 0, condition: 100, servicedBy: -1, recipe: "", faultT: 0,
  };
  w.cells[wall].structureId = id;
  w.cells[interior].structureId = id;
  spawnDrone(w, id);
  return true;
}

// Designations for generated bodies (asteroid prefix + planet names).
const PLANET_NAMES = ["Veil", "Kestrel", "Oort", "Tannhauser", "Cinder", "Halcyon", "Mistral", "Erebus"];
const AST_LETTERS = "ABCDEFGHJKLMNPRSTVXZ";

// Populate the star system with unknown orbital bodies — many near/modest
// asteroids and a few far/rich planets. All start undiscovered (a drone reveals
// each on its first visit). Called once for a fresh game (not from createWorld,
// so tests stay deterministic). Uses Math.random — fine because the result is saved.
export function seedSolarSystem(w: World, asteroids = 14, planets = 4): void {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  for (let i = 0; i < asteroids; i++) {
    const dist = rnd(0.08, 0.6); // near-ish
    addBody(w, "asteroid", {
      angle: Math.random() * Math.PI * 2,
      dist,
      yield: Math.round(rnd(8, 20)),
      richness: Math.round(rnd(120, 320)),
      name: `${AST_LETTERS[Math.floor(Math.random() * AST_LETTERS.length)]}X-${Math.floor(rnd(10, 99))}`,
    });
  }
  for (let i = 0; i < planets; i++) {
    const dist = rnd(0.62, 0.98); // far out
    addBody(w, "planet", {
      angle: Math.random() * Math.PI * 2,
      dist,
      yield: Math.round(rnd(40, 80)),
      richness: Math.round(rnd(600, 1400)),
      name: PLANET_NAMES[i % PLANET_NAMES.length],
    });
  }
}

// Add one orbital body. `opts` carries its (hidden) truth; it starts undiscovered.
export function addBody(
  w: World,
  kind: Site["kind"],
  opts: { angle: number; dist: number; yield: number; richness: number; name?: string },
): number {
  const id = w.nextId++;
  w.sites[id] = {
    id,
    kind,
    name: opts.name ?? `${kind === "planet" ? "P" : "AX"}-${id}`,
    angle: opts.angle,
    dist: opts.dist,
    discovered: false,
    richness: opts.richness,
    yield: opts.yield,
  };
  return id;
}

// Erase: remove a structure if present, else clear the floor to space.
export function eraseAt(w: World, x: number, y: number): void {
  if (!inBounds(w, x, y)) return;
  const i = idx(w, x, y);
  const c = w.cells[i];
  if (c.structureId >= 0) {
    removeStructure(w, c.structureId);
    return;
  }
  setCell(w, x, y, "space");
}

export function addAgent(
  w: World,
  x: number,
  y: number,
  species: Species = "human",
  guest = false,
): boolean {
  if (!inBounds(w, x, y)) return false;
  const c = w.cells[idx(w, x, y)];
  if (c.type !== "floor") return false;
  const id = w.nextId++;
  const a: Agent = {
    id,
    species,
    name: nameFor(species, id),
    mateId: -1,
    implantGas: null,
    guest,
    stay: guest ? GUEST_STAY : Infinity,
    cell: idx(w, x, y),
    o2: 100,
    suit: 100,
    food: 100,
    rest: 100,
    fun: 100,
    mood: 70,
    health: 100,
    tension: 0,
    fighting: false,
    injured: false,
    alive: true,
    task: null,
    path: [],
    moveAcc: 0,
  };
  w.agents[id] = a;
  return true;
}
