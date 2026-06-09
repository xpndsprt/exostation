import { RoomInfo, World } from "./types";

// Per-room zone atmosphere (MVP — no per-tile gas diffusion).
// A room is breathable if it is enclosed AND contains a powered O₂ generator.
// All floor cells in one connected room share the same `enclosed` value, so we
// can key off any cell of the room.
export function atmosphereSystem(w: World): void {
  const rooms: Record<number, RoomInfo> = {};

  for (const c of w.cells) {
    if (c.type === "floor" && c.roomId >= 0 && !(c.roomId in rooms)) {
      rooms[c.roomId] = { enclosed: c.enclosed, breathable: false };
    }
  }

  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind !== "o2gen" || !s.powered) continue;
    const c = w.cells[s.cell];
    const room = rooms[c.roomId];
    if (room && room.enclosed) room.breathable = true;
  }

  w.rooms = rooms;
}
