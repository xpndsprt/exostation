import { Cell, CellType, World } from "./types";
import { GRID_W, GRID_H } from "./config";

export function createWorld(): World {
  const cells: Cell[] = new Array(GRID_W * GRID_H);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = { type: "space", roomId: -1, enclosed: false };
  }
  return { w: GRID_W, h: GRID_H, cells, dirtyRooms: true };
}

export const idx = (w: World, x: number, y: number): number => y * w.w + x;

export const inBounds = (w: World, x: number, y: number): boolean =>
  x >= 0 && y >= 0 && x < w.w && y < w.h;

export function setCell(w: World, x: number, y: number, type: CellType): void {
  if (!inBounds(w, x, y)) return;
  const c = w.cells[idx(w, x, y)];
  if (c.type !== type) {
    c.type = type;
    w.dirtyRooms = true;
  }
}
