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
    stars: [],
    comets: [],
    ships: [],
    conduits: [],
    gods: [],
    godTimer: 0,
    godVerdict: null,
    blackoutT: 0,
    surgeT: 0,
    boarders: [],
    rooms: {},
    power: { supply: 0, draw: 0, battery: 0, batteryMax: 0, brownout: false },
    // Generous starting biomass so the synth feeds crew for a long while — the
    // player needn't spend on Bio Vats right at the start.
    stock: { minerals: 0, biomass: 300, spores: 0, microbes: 0, fuel: 0, water: 0, meals: { rations: 0, fungal: 0, protein: 0, exotic: 0 } },
    credits: 1000, // starting funds to build the first station
    tradeTimer: 0,
    crewTimer: 0,
    shipCooldown: 0,
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
    raidCount: 0,
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
    storyBeat: null,
    firedBeats: [],
    storyFlags: {},
    eggs: [],
    pests: [],
    breedOffer: null,
    breedTimer: 0,
    barTimer: 0,
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

// A cell that blocks line of sight: a wall, or any cell with a module on it.
// (Floors, storage decks, doorways and open space are see-through.)
export const isOpaque = (w: World, i: number): boolean =>
  w.cells[i] !== undefined && (w.cells[i].type === "wall" || w.cells[i].structureId >= 0);

// Clear line of sight between two cells? Walks the grid line (Bresenham) and
// fails on the first opaque cell strictly between them — the target itself (e.g.
// the module being looked at) and the viewer's own cell are never the blocker.
export function hasLineOfSight(w: World, from: number, to: number): boolean {
  let x = from % w.w, y = (from / w.w) | 0;
  const x1 = to % w.w, y1 = (to / w.w) | 0;
  const dx = Math.abs(x1 - x), dy = Math.abs(y1 - y);
  const sx = x < x1 ? 1 : -1, sy = y < y1 ? 1 : -1;
  let err = dx - dy;
  for (;;) {
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
    if (x === x1 && y === y1) return true; // reached the target with nothing in the way
    if (isOpaque(w, y * w.w + x)) return false; // an obstacle blocks the view
  }
}

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
    outBuf: 0,
    inBuf: 0,
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
    outBuf: 0,
    inBuf: 0,
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
  w.cells[i].type === "floor" || w.cells[i].type === "door" || w.cells[i].type === "storage";

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
    outBuf: 0,
    inBuf: 0,
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
    on: true, powered: false, occupantId: -1, timer: 0, condition: 100, servicedBy: -1, recipe: "", faultT: 0, outBuf: 0, inBuf: 0,
  };
  w.cells[wall].structureId = id;
  w.cells[interior].structureId = id;
  spawnDrone(w, id);
  return true;
}

// Designations for generated bodies (asteroid prefix + planet names + moons).
const PLANET_NAMES = ["Veil", "Kestrel", "Oort", "Tannhauser", "Cinder", "Halcyon", "Mistral", "Erebus", "Solace", "Vantage"];
const AST_LETTERS = "ABCDEFGHJKLMNPRSTVXZ";
const ROMAN = ["I", "II", "III", "IV"];

// Orbital speed (radians/sec) for a body at orbit radius `dist`: inner bodies
// sweep faster (a crude Kepler feel). Direction varies so the field isn't uniform.
function orbSpeedFor(dist: number, dir: number): number {
  const period = 45 + dist * 240; // seconds for a full orbit
  return dir * ((Math.PI * 2) / period);
}

// Star classes (colour + draw radius). A system is a single star of one class, or
// (sometimes) a binary pair of two classes.
const STAR_TYPES = [
  { kind: "red dwarf", color: "#ff6a4a", r: 5 },
  { kind: "orange dwarf", color: "#ffae5a", r: 6 },
  { kind: "yellow star", color: "#ffe9a8", r: 7 },
  { kind: "white star", color: "#eaf2ff", r: 7 },
  { kind: "blue giant", color: "#9ac4ff", r: 9 },
];
// Planet "biomes" — a tint each, for a varied, colourful chart.
const PLANET_TINTS = ["#9a8a72", "#d8a85a", "#4a86c8", "#bfe6ff", "#e0552a", "#caa06a", "#6fae6f", "#b07ad0"];
const COMET_TINTS = ["#bfe9ff", "#cfe0ff", "#d8f0e6", "#eae6ff"];

// Populate the star system: a star (or binary), planets of varied biomes (some with
// moons + rings), an inner asteroid belt, a far Kuiper ice belt, and comets on long
// eccentric paths criss-crossing the whole field. Everything orbits and starts
// undiscovered. Called once for a fresh game (not from createWorld → tests stay set).
export function seedSolarSystem(w: World, asteroids = 22, planets = 6): void {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  const ang = () => Math.random() * Math.PI * 2;
  const dir = () => (Math.random() < 0.5 ? 1 : -1);

  // --- star(s): a class, ~35% binaries ---
  w.stars = [];
  const t1 = pick(STAR_TYPES);
  if (Math.random() < 0.35) {
    const t2 = pick(STAR_TYPES), sep = 0.05, sp = (Math.PI * 2) / 30, a0 = ang();
    w.stars.push({ angle: a0, dist: sep, orbSpeed: sp, color: t1.color, r: Math.max(5, t1.r - 1), kind: t1.kind });
    w.stars.push({ angle: a0 + Math.PI, dist: sep, orbSpeed: sp, color: t2.color, r: Math.max(4, t2.r - 2), kind: t2.kind });
  } else {
    w.stars.push({ angle: 0, dist: 0, orbSpeed: 0, color: t1.color, r: t1.r, kind: t1.kind });
  }

  // --- planets (varied biomes), each possibly with moons + a ring ---
  for (let i = 0; i < planets; i++) {
    const dist = rnd(0.3, 0.92);
    const pid = addBody(w, "planet", {
      angle: ang(), dist, orbSpeed: orbSpeedFor(dist, dir()),
      yield: Math.round(rnd(35, 90)),
      richness: Math.round(rnd(500, 1600)),
      name: PLANET_NAMES[i % PLANET_NAMES.length],
      tint: pick(PLANET_TINTS),
      ring: Math.random() < 0.3,
    });
    const moons = Math.floor(rnd(0, 2.6)); // 0–2 moons
    for (let m = 0; m < moons; m++) {
      addBody(w, "moon", {
        angle: ang(), dist: rnd(0.045, 0.085), orbSpeed: orbSpeedFor(0.05, dir()) * 2.2, parent: pid,
        yield: Math.round(rnd(10, 30)),
        richness: Math.round(rnd(120, 380)),
        name: `${PLANET_NAMES[i % PLANET_NAMES.length]} ${ROMAN[m] ?? "V"}`,
        tint: "#9aa6b8",
      });
    }
  }

  // --- inner asteroid belt (a ring at a mid radius) ---
  const belt = rnd(0.42, 0.58);
  const beltN = Math.floor(asteroids * 0.4);
  for (let i = 0; i < beltN; i++) {
    addBody(w, "asteroid", {
      angle: ang(), dist: belt + rnd(-0.03, 0.03), orbSpeed: orbSpeedFor(belt, 1),
      yield: Math.round(rnd(8, 18)), richness: Math.round(rnd(100, 280)),
      name: `${AST_LETTERS[Math.floor(Math.random() * AST_LETTERS.length)]}-${Math.floor(rnd(100, 999))}`,
      tint: "#9a8a64",
    });
  }
  // --- scattered rocks: a few rich metallic strikes, most lean ---
  const scatterN = Math.floor(asteroids * 0.35);
  for (let i = 0; i < scatterN; i++) {
    const metallic = Math.random() < 0.25;
    addBody(w, "asteroid", {
      angle: ang(), dist: rnd(0.12, 0.9), orbSpeed: orbSpeedFor(rnd(0.12, 0.9), dir()),
      yield: metallic ? Math.round(rnd(30, 55)) : Math.round(rnd(5, 16)),
      richness: metallic ? Math.round(rnd(300, 600)) : Math.round(rnd(70, 220)),
      name: `${AST_LETTERS[Math.floor(Math.random() * AST_LETTERS.length)]}X-${Math.floor(rnd(10, 99))}`,
      tint: metallic ? "#cbb27a" : "#7a7158",
    });
  }
  // --- far Kuiper ice belt: cold, lean, slow icy bodies on the rim ---
  for (let i = scatterN; i < asteroids; i++) {
    const dist = rnd(0.9, 1.0);
    addBody(w, "asteroid", {
      angle: ang(), dist, orbSpeed: orbSpeedFor(dist, dir()),
      yield: Math.round(rnd(6, 14)), richness: Math.round(rnd(120, 300)),
      name: `KB-${Math.floor(rnd(100, 999))}`,
      tint: "#bfe6ff",
    });
  }

  // --- comets: long eccentric paths, random orientations → criss-crossing ---
  w.comets = [];
  const nC = 3 + Math.floor(rnd(0, 4)); // 3–6
  for (let i = 0; i < nC; i++) {
    const a = rnd(0.55, 1.05);
    w.comets.push({
      cx: rnd(-0.25, 0.25), cy: rnd(-0.25, 0.25),
      a, b: a * rnd(0.25, 0.55), // eccentric
      rot: ang(),
      phase: ang(),
      speed: dir() * rnd(0.12, 0.3),
      color: pick(COMET_TINTS),
    });
  }
}

// Add one orbital body. `opts` carries its (hidden) truth; it starts undiscovered.
export function addBody(
  w: World,
  kind: Site["kind"],
  opts: { angle: number; dist: number; yield: number; richness: number; name?: string; orbSpeed?: number; parent?: number; tint?: string; ring?: boolean },
): number {
  const id = w.nextId++;
  w.sites[id] = {
    id,
    kind,
    name: opts.name ?? `${kind === "planet" ? "P" : kind === "moon" ? "M" : "AX"}-${id}`,
    angle: opts.angle,
    dist: opts.dist,
    discovered: false,
    richness: opts.richness,
    yield: opts.yield,
    orbSpeed: opts.orbSpeed ?? 0,
    parent: opts.parent ?? -1,
    tint: opts.tint,
    ring: opts.ring,
  };
  return id;
}

// Erase: remove a structure if present, else a conduit, else clear floor to space.
export function eraseAt(w: World, x: number, y: number): void {
  if (!inBounds(w, x, y)) return;
  const i = idx(w, x, y);
  const c = w.cells[i];
  if (c.structureId >= 0) {
    removeStructure(w, c.structureId);
    return;
  }
  const ci = w.conduits.findIndex((k) => k.cell === i);
  if (ci >= 0) {
    w.conduits.splice(ci, 1);
    return;
  }
  setCell(w, x, y, "space");
}

// Lay a conduit on a floor/storage cell (one per cell). Returns true if added.
export function addConduit(w: World, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  const i = idx(w, x, y);
  const t = w.cells[i].type;
  if (t !== "floor" && t !== "storage" && t !== "door") return false; // deck or through a doorway
  if (w.conduits.some((c) => c.cell === i)) return false; // already wired
  w.conduits.push({ cell: i, hp: 100, repairBy: -1 });
  return true;
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
    // a personal eyesight spec: some are sharp-eyed (5), some short-sighted (2).
    // Sszra sentinels see a tile farther. This is how they spot faulty modules.
    sight: (2 + Math.floor(Math.random() * 4)) + (species === "sszra" ? 1 : 0),
    faceX: 0,
    faceY: 0,
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
