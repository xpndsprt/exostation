import { World } from "./types";
import { STRUCTURES } from "./structures";

export const WEAR = 0.6; // condition lost per second while a machine runs
export const SERVICE_THRESHOLD = 60; // crew start servicing below this
export const REPAIR_RATE = 15; // condition restored per second while serviced

// Machinery (anything that draws power) wears down while running and must be
// serviced by crew or it breaks (condition 0 -> treated as unpowered in
// powerSystem). Passive infrastructure (solar/battery, draw 0) never wears.
export function maintenanceSystem(w: World, dt: number): void {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (STRUCTURES[s.kind].draw <= 0) continue;
    if (s.powered) s.condition = Math.max(0, s.condition - WEAR * dt);
  }
}
