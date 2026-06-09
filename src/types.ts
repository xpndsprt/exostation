// Core types for the EXOSTATION MVP scaffold.
// MVP simplification: tile-based walls (a cell is space/floor/wall). The
// edge-wall model in TECH_DESIGN.md is a post-MVP refinement.

export type Tool = "floor" | "wall" | "erase" | "pan";

export type CellType = "space" | "floor" | "wall";

export interface Cell {
  type: CellType;
  roomId: number; // -1 if not part of a floor room
  enclosed: boolean; // floor sealed from open space (would hold atmosphere)
}

export interface World {
  w: number;
  h: number;
  cells: Cell[]; // flat, index = y * w + x
  dirtyRooms: boolean;
}

export interface UIState {
  tool: Tool;
}
