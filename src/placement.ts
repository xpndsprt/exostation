import { Tool, World } from "./types";
import { idx, inBounds } from "./world";

const STRUCTURE_KINDS = new Set([
  "solar",
  "battery",
  "o2gen",
  "ch4gen",
  "synth",
  "vat",
  "pod",
  "bay",
  "dock",
]);

function hasSite(w: World, cell: number): boolean {
  for (const id in w.sites) if (w.sites[id].cell === cell) return true;
  return false;
}

// Solar panels mount on the OUTSIDE of a space-facing wall and extend 3 tiles
// out into space, normal to the wall. Given a clicked space cell adjacent to a
// wall, returns the 3 occupied cells (starting at the wall, going outward), or
// null if it doesn't fit.
const NEIGHBORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export function solarFootprint(w: World, x: number, y: number): number[] | null {
  if (!inBounds(w, x, y)) return null;
  if (w.cells[idx(w, x, y)].type !== "space") return null;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(w, nx, ny) || w.cells[idx(w, nx, ny)].type !== "wall") continue;
    // outward = away from the wall
    const ox = -dx;
    const oy = -dy;
    const cells: number[] = [];
    let ok = true;
    for (let k = 0; k < 3; k++) {
      const cx = x + ox * k;
      const cy = y + oy * k;
      if (!inBounds(w, cx, cy)) {
        ok = false;
        break;
      }
      const cell = w.cells[idx(w, cx, cy)];
      if (cell.type !== "space" || cell.structureId >= 0) {
        ok = false;
        break;
      }
      cells.push(idx(w, cx, cy));
    }
    if (ok) return cells;
  }
  return null;
}

// Whether the current tool would do something valid at (x,y). Drives the
// ghost-preview tint and the invalid cursor.
export function canPlace(w: World, tool: Tool, x: number, y: number): boolean {
  if (!inBounds(w, x, y)) return false;
  if (tool === "solar") return solarFootprint(w, x, y) !== null;
  const c = w.cells[idx(w, x, y)];
  switch (tool) {
    case "floor":
      return c.type !== "floor";
    case "wall":
      return c.type !== "wall";
    case "door":
      return c.type !== "door";
    case "erase":
      return c.structureId >= 0 || c.type !== "space" || hasSite(w, idx(w, x, y));
    case "human":
    case "thol":
      return c.type === "floor";
    case "asteroid":
      return c.type === "space" && !hasSite(w, idx(w, x, y));
    default:
      if (STRUCTURE_KINDS.has(tool)) return c.type === "floor" && c.structureId < 0;
      return false; // pan / select have no placement
  }
}

// Tools that paint over an area via click-drag (rectangle fill).
export function isAreaTool(tool: Tool): boolean {
  return tool === "floor" || tool === "wall" || tool === "erase";
}

// Inclusive rectangle of cell indices between two corners.
export function rectCells(w: World, a: number, b: number): number[] {
  const ax = a % w.w;
  const ay = (a / w.w) | 0;
  const bx = b % w.w;
  const by = (b / w.w) | 0;
  const x0 = Math.min(ax, bx);
  const x1 = Math.max(ax, bx);
  const y0 = Math.min(ay, by);
  const y1 = Math.max(ay, by);
  const out: number[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(y * w.w + x);
  return out;
}
