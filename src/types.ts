// Core types for the EXOSTATION MVP.
// MVP simplification: tile-based walls (a cell is space/floor/wall). The
// edge-wall model in TECH_DESIGN.md is a post-MVP refinement.

export type StructureKind =
  | "solar"
  | "battery"
  | "o2gen"
  | "ch4gen"
  | "pod"
  | "synth"
  | "bay"
  | "dock";

export type Species = "human" | "drenn" | "thol";

export type GasKind = "o2" | "ch4";

// What a room's atmosphere currently is: empty, a single breathable gas, or a
// lethal mix of incompatible gases.
export type RoomGas = "none" | GasKind | "mixed";

export type Tool =
  | "floor"
  | "wall"
  | "erase"
  | "pan"
  | "select"
  | StructureKind
  | "human"
  | "thol"
  | "asteroid";

export type Selection = { kind: "agent" | "structure" | "site"; id: number } | null;

export type OverlayMode = "none" | "power" | "rooms";

export type HoverTarget =
  | { kind: "agent" | "structure" | "site"; id: number }
  | { kind: "cell"; cell: number }
  | null;

export type CellType = "space" | "floor" | "wall";

export type Speed = 0 | 1 | 2 | 3;

export interface Cell {
  type: CellType;
  roomId: number; // -1 if not part of a floor room
  enclosed: boolean; // floor sealed from open space (would hold atmosphere)
  structureId: number; // -1 if none
}

export interface Structure {
  id: number;
  kind: StructureKind;
  cell: number; // grid index
  on: boolean; // player toggle
  powered: boolean; // receiving power this tick
  occupantId: number; // agent using this (pods); -1 if free
  timer: number; // production progress (synth)
}

export type TaskType = "flee" | "eat" | "sleep" | "leave";

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
  food: number; // 0..100
  rest: number; // 0..100
  mood: number; // 0..100 (needs + neighbor relations)
  health: number; // 0..100 (combat)
  tension: number; // 0..100 (toward a skirmish)
  fighting: boolean; // transient: throwing blows this tick
  alive: boolean;
  task: Task | null;
  path: number[]; // remaining cells to step onto (excludes current)
  moveAcc: number; // 0..1 progress toward path[0]
}

export interface Stock {
  biomass: number;
  water: number;
  meals: number;
}

export type DroneState = "docked" | "outbound" | "mining" | "inbound";

export interface Drone {
  id: number;
  bayId: number;
  siteId: number; // -1 if unassigned
  state: DroneState;
  t: number; // 0..1 flight progress, or seconds while mining
  cargo: number; // units aboard
}

export interface Site {
  id: number;
  cell: number; // grid index (in space)
  richness: number; // remaining units
}

export interface RoomInfo {
  enclosed: boolean;
  gas: RoomGas;
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
  rooms: Record<number, RoomInfo>;
  power: PowerState;
  stock: Stock;
  credits: number;

  tick: number;
  speed: Speed;
  nextId: number;
}

export interface UIState {
  tool: Tool;
}
