import { Agent, Cell, CellType, Species, Structure, StructureKind, World } from "./types";
import { GRID_W, GRID_H } from "./config";

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
    rooms: {},
    power: { supply: 0, draw: 0, battery: 0, batteryMax: 0, brownout: false },
    // Seed some biomass so the synth can make meals before a Vat is built.
    stock: { minerals: 0, biomass: 40, meals: 0 },
    credits: 0,
    tradeTimer: 0,
    seen: [],
    tick: 0,
    speed: 1,
    nextId: 1,
  };
}

export const idx = (w: World, x: number, y: number): number => y * w.w + x;

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
export function addDock(w: World, x: number, y: number): boolean {
  if (!canDock(w, x, y)) return false;
  const i = idx(w, x, y);
  const id = w.nextId++;
  w.structures[id] = {
    id,
    kind: "dock",
    cell: i,
    cells: [i],
    on: true,
    powered: false,
    occupantId: -1,
    timer: 0,
    condition: 100,
    servicedBy: -1,
  };
  w.cells[i].structureId = id;
  return true;
}

// Scatter natural asteroids across open space, keeping the central build area
// clear. Called once for a fresh game (not from createWorld, so tests stay
// deterministic). Uses Math.random — fine because the result is saved.
export function seedAsteroids(w: World, count = 12): void {
  const cx = w.w / 2;
  const cy = w.h / 2;
  let placed = 0;
  let tries = 0;
  while (placed < count && tries < count * 30) {
    tries++;
    const x = Math.floor(Math.random() * w.w);
    const y = Math.floor(Math.random() * w.h);
    if (Math.hypot(x - cx, y - cy) < 20) continue; // leave room for the station
    if (addSite(w, x, y)) placed++;
  }
}

// Place a mining site (asteroid) on an empty space cell.
export function addSite(w: World, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  const i = idx(w, x, y);
  if (w.cells[i].type !== "space") return false;
  for (const id in w.sites) if (w.sites[id].cell === i) return false;
  const id = w.nextId++;
  w.sites[id] = { id, cell: i, richness: 1000 };
  return true;
}

// Erase: remove a structure if present, else clear the floor to space.
export function eraseAt(w: World, x: number, y: number): void {
  if (!inBounds(w, x, y)) return;
  const i = idx(w, x, y);
  const c = w.cells[i];
  // Remove a site (asteroid) sitting on this cell.
  for (const id in w.sites) {
    if (w.sites[id].cell === i) {
      delete w.sites[id];
      return;
    }
  }
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
    alive: true,
    task: null,
    path: [],
    moveAcc: 0,
  };
  w.agents[id] = a;
  return true;
}
