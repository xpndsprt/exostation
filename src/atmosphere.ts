import { GasKind, RoomGas, RoomInfo, Temp, World } from "./types";
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
  const climate: Record<number, number> = {}; // net heaters − coolers per room

  for (const c of w.cells) {
    if (c.type === "floor" && c.roomId >= 0 && !(c.roomId in rooms)) {
      rooms[c.roomId] = { enclosed: c.enclosed, gas: "none", temp: "temperate", harmony: 0 };
      gases[c.roomId] = new Set();
      climate[c.roomId] = 0;
    }
  }

  for (const id in w.structures) {
    const s = w.structures[id];
    if (!s.powered) continue;
    const rid = w.cells[s.cell].roomId;
    const room = rooms[rid];
    if (!room || !room.enclosed) continue;
    const gas = STRUCTURES[s.kind].gas;
    if (gas) gases[rid].add(gas);
    if (s.kind === "heater") climate[rid] += 1;
    else if (s.kind === "cooler") climate[rid] -= 1;
  }

  for (const rid in rooms) {
    const set = gases[rid];
    let g: RoomGas = "none";
    if (set.size === 1) g = [...set][0];
    else if (set.size > 1) g = "mixed";
    rooms[rid].gas = g;
    const c = climate[rid];
    const t: Temp = c > 0 ? "hot" : c < 0 ? "cold" : "temperate";
    rooms[rid].temp = t;
  }

  w.rooms = rooms;
}
