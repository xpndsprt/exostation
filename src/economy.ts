import { World } from "./types";
import { addAgent, accessCell, exteriorCell } from "./world";

const SPAWN_INTERVAL = 20; // seconds between guest arrivals per dock
const LODGING_RATE = 1.5; // credits per second per living guest
const SHIP_TIME = 14; // seconds a ship stays parked at the dock

// Docking ports bring Drenn guests (a Tier-1 species — same air & food as
// humans). Guests pay lodging while present and leave after their stay.
// Arrivals are capped by Sleeping Pod count, so you must build capacity to host.
export function economySystem(w: World, dt: number): void {
  // ships depart over time
  for (let i = w.ships.length - 1; i >= 0; i--) {
    w.ships[i].t -= dt;
    if (w.ships[i].t <= 0) w.ships.splice(i, 1);
  }

  let guests = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.guest) guests++;
  }
  w.credits += guests * LODGING_RATE * dt;

  let pods = 0;
  const docks = [];
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "pod") pods++;
    else if (s.kind === "dock") docks.push(s);
  }

  for (const dock of docks) {
    if (!dock.powered) continue;
    dock.timer += dt;
    if (dock.timer >= SPAWN_INTERVAL) {
      dock.timer -= SPAWN_INTERVAL;
      if (guests < pods) {
        const access = accessCell(w, dock); // interior side of the airlock
        if (access < 0) continue;
        if (addAgent(w, access % w.w, (access / w.w) | 0, "drenn", true)) {
          guests++;
          const ex = exteriorCell(w, dock); // park a ship outside
          if (ex >= 0) w.ships.push({ cell: ex, t: SHIP_TIME });
        }
      }
    }
  }
}
