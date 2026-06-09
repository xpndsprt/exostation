import { GasKind, RoomGas, RoomInfo, World } from "./types";
import { STRUCTURES } from "./structures";

// Per-room zone atmosphere (MVP — no per-tile diffusion).
// A room takes on the gas of the powered atmosphere generator(s) inside it:
//   - enclosed + exactly one gas type powered  -> that gas (breathable for the
//     matching species)
//   - two or more *different* gases            -> "mixed" (lethal to everyone)
//   - not enclosed, or no powered generator    -> "none" (vacuum)
export function atmosphereSystem(w: World): void {
  const rooms: Record<number, RoomInfo> = {};
  const gases: Record<number, Set<GasKind>> = {};

  for (const c of w.cells) {
    if (c.type === "floor" && c.roomId >= 0 && !(c.roomId in rooms)) {
      rooms[c.roomId] = { enclosed: c.enclosed, gas: "none" };
      gases[c.roomId] = new Set();
    }
  }

  for (const id in w.structures) {
    const s = w.structures[id];
    if (!s.powered) continue;
    const gas = STRUCTURES[s.kind].gas;
    if (!gas) continue;
    const room = rooms[w.cells[s.cell].roomId];
    if (room && room.enclosed) gases[w.cells[s.cell].roomId].add(gas);
  }

  for (const rid in rooms) {
    const set = gases[rid];
    let g: RoomGas = "none";
    if (set.size === 1) g = [...set][0];
    else if (set.size > 1) g = "mixed";
    rooms[rid].gas = g;
  }

  w.rooms = rooms;
}
