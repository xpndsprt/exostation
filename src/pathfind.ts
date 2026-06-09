import { GasKind, World } from "./types";

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const walkable = (w: World, i: number): boolean => w.cells[i].type === "floor";

export function manhattan(w: World, a: number, b: number): number {
  const ax = a % w.w;
  const ay = (a / w.w) | 0;
  const bx = b % w.w;
  const by = (b / w.w) | 0;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// A* over walkable floor cells (4-directional). Returns the list of cells to
// step onto (excludes start, includes goal), [] if already there, or null if
// unreachable.
export function findPath(w: World, start: number, goal: number): number[] | null {
  if (start === goal) return [];
  if (!walkable(w, goal) || !walkable(w, start)) return null;

  const n = w.w * w.h;
  const g = new Float64Array(n);
  g.fill(Infinity);
  const f = new Float64Array(n);
  f.fill(Infinity);
  const came = new Int32Array(n);
  came.fill(-1);
  const inOpen = new Uint8Array(n);
  const open: number[] = [start];

  g[start] = 0;
  f[start] = manhattan(w, start, goal);
  inOpen[start] = 1;

  while (open.length) {
    // pop lowest f (linear scan — fine for MVP grid sizes)
    let bi = 0;
    for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
    const cur = open[bi];
    open[bi] = open[open.length - 1];
    open.pop();
    inOpen[cur] = 0;

    if (cur === goal) {
      const path: number[] = [];
      let c = cur;
      while (c !== start) {
        path.push(c);
        c = came[c];
      }
      path.reverse();
      return path;
    }

    const x = cur % w.w;
    const y = (cur / w.w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
      const ni = ny * w.w + nx;
      if (!walkable(w, ni)) continue;
      const ng = g[cur] + 1;
      if (ng < g[ni]) {
        came[ni] = cur;
        g[ni] = ng;
        f[ni] = ng + manhattan(w, ni, goal);
        if (!inOpen[ni]) {
          open.push(ni);
          inOpen[ni] = 1;
        }
      }
    }
  }
  return null;
}

// BFS over floor cells to the nearest room filled with the given gas. Returns a
// cell index or -1.
export function nearestBreathable(w: World, start: number, gas: GasKind): number {
  const seen = new Uint8Array(w.w * w.h);
  const q: number[] = [start];
  seen[start] = 1;
  while (q.length) {
    const c = q.shift() as number;
    const cell = w.cells[c];
    if (cell.type === "floor" && cell.roomId >= 0 && w.rooms[cell.roomId]?.gas === gas) return c;
    const x = c % w.w;
    const y = (c / w.w) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
      const ni = ny * w.w + nx;
      if (!seen[ni] && walkable(w, ni)) {
        seen[ni] = 1;
        q.push(ni);
      }
    }
  }
  return -1;
}
