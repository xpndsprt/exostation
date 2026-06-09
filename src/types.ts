// Core types for the EXOSTATION MVP.
// MVP simplification: tile-based walls (a cell is space/floor/wall). The
// edge-wall model in TECH_DESIGN.md is a post-MVP refinement.

export type StructureKind = "solar" | "battery" | "o2gen" | "pod" | "synth";

export type Tool =
  | "floor"
  | "wall"
  | "erase"
  | "pan"
  | StructureKind
  | "human";

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

export type TaskType = "flee" | "eat" | "sleep";

export interface Task {
  type: TaskType;
  target: number; // destination cell index
  structureId?: number; // claimed structure (e.g. pod)
}

export interface Agent {
  id: number;
  species: "human";
  cell: number;
  o2: number; // 0..100
  food: number; // 0..100
  rest: number; // 0..100
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

export interface RoomInfo {
  enclosed: boolean;
  breathable: boolean;
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
  rooms: Record<number, RoomInfo>;
  power: PowerState;
  stock: Stock;

  tick: number;
  speed: Speed;
  nextId: number;
}

export interface UIState {
  tool: Tool;
}
