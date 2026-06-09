import { World } from "./types";

// Recompute which floor cells are sealed from open space, and group floor
// cells into rooms. A floor cell is "enclosed" if it cannot reach the map
// border without crossing a wall — i.e. it would hold an atmosphere.
export function recomputeRooms(w: World): void {
  const n = w.w * w.h;
  const exposed = new Uint8Array(n); // reachable from the border through non-wall cells
  const stack: number[] = [];

  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w.w || y >= w.h) return;
    const i = y * w.w + x;
    if (exposed[i]) return;
    // walls and (closed) doors block gas flow / hold pressure
    if (w.cells[i].type === "wall" || w.cells[i].type === "door") return;
    exposed[i] = 1;
    stack.push(i);
  };

  // Seed from every border cell.
  for (let x = 0; x < w.w; x++) {
    push(x, 0);
    push(x, w.h - 1);
  }
  for (let y = 0; y < w.h; y++) {
    push(0, y);
    push(w.w - 1, y);
  }

  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % w.w;
    const y = (i / w.w) | 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  // Reset, then mark enclosed floors.
  for (let i = 0; i < n; i++) {
    const c = w.cells[i];
    c.roomId = -1;
    c.enclosed = c.type === "floor" && exposed[i] === 0;
  }

  // Group floor cells into connected rooms (floor-to-floor adjacency).
  let room = 0;
  const q: number[] = [];
  for (let i = 0; i < n; i++) {
    const c = w.cells[i];
    if (c.type !== "floor" || c.roomId !== -1) continue;
    c.roomId = room;
    q.length = 0;
    q.push(i);
    while (q.length) {
      const j = q.pop() as number;
      const x = j % w.w;
      const y = (j / w.w) | 0;
      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ];
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
        const nj = ny * w.w + nx;
        const nc = w.cells[nj];
        if (nc.type === "floor" && nc.roomId === -1) {
          nc.roomId = room;
          q.push(nj);
        }
      }
    }
    room++;
  }

  w.dirtyRooms = false;
}
