import { World } from "./types";
import { FUELREC, aiBoost } from "./structures";
import { productivity } from "./harmony";
import { storageCaps } from "./storage";
import { industryBoost } from "./research";

// Fuel Refineries convert mined **minerals** into ship **fuel**. Fuel is sold to
// ships that dock (see economy.ts) — the bigger the dock, the more they buy — so
// a refinery turns the minerals economy into a second income stream. Needs a Bot
// Bay feeding minerals, like the Fusion Reactor. Runs after mining (which fills
// minerals) so a fresh haul can be refined the same tick.
export function fuelSystem(w: World, dt: number): void {
  const caps = storageCaps(w);
  const boost = aiBoost(w) * industryBoost(w); // AI Core + Industrialist doctrine
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind !== "fuelrefinery" || !s.powered) continue;
    if (w.stock.fuel >= caps.fuel) {
      s.timer = 0; // tank full — idle (overflow spoilage handles waste)
      continue;
    }
    if (w.stock.minerals < FUELREC.input) {
      s.timer = 0; // no ore to crack — needs a Bot Bay mining
      continue;
    }
    const r = w.cells[s.cell].roomId;
    const prod = r >= 0 && w.rooms[r] ? productivity(w.rooms[r].harmony) : 1;
    s.timer += dt * prod * boost;
    if (s.timer >= FUELREC.time) {
      s.timer -= FUELREC.time;
      w.stock.minerals -= FUELREC.input;
      w.stock.fuel = Math.min(caps.fuel, w.stock.fuel + FUELREC.out);
    }
  }
}
