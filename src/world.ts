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
    rooms: {},
    power: { supply: 0, draw: 0, battery: 0, batteryMax: 0, brownout: false },
    // Seed some raw resources so the synthesizer can make meals before mining
    // (M5) exists to replenish them.
    stock: { biomass: 40, water: 40, meals: 0 },
    credits: 0,
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
  if (type !== "floor" && c.structureId >= 0) {
    delete w.structures[c.structureId];
    c.structureId = -1;
  }
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
  const s: Structure = { id, kind, cell: i, on: true, powered: false, occupantId: -1, timer: 0 };
  w.structures[id] = s;
  c.structureId = id;
  // A Bot Bay comes with one mining drone.
  if (kind === "bay") {
    const did = w.nextId++;
    w.drones[did] = { id: did, bayId: id, siteId: -1, state: "docked", t: 0, cargo: 0 };
  }
  return true;
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
    delete w.structures[c.structureId];
    c.structureId = -1;
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
    food: 100,
    rest: 100,
    mood: 70,
    alive: true,
    task: null,
    path: [],
    moveAcc: 0,
  };
  w.agents[id] = a;
  return true;
}
