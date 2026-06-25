import { World } from "./types";
import { STRUCTURES } from "./structures";
import { isUnlocked, WATER_MODULE_KINDS } from "./research";

export const WEAR = 0.6; // condition lost per second while a machine runs
export const SERVICE_THRESHOLD = 60; // crew start servicing below this
export const REPAIR_RATE = 15; // condition restored per second while serviced
export const CONDUIT_WEAR = 0.25; // hp/s each conduit segment loses (independent → longer runs break more often)
export const WATER_PER_MODULE = 0.04; // water/s an advanced module sips as coolant/feedstock
export const WATER_COOL_WEAR = 0.5; // wear ×0.5 when an advanced module has water (runs cool)
export const WATER_DRY_WEAR = 3; // wear ×3 when an advanced module has no water (overheats)

// Machinery (anything that draws power) wears down while running and must be
// serviced by crew or it breaks (condition 0 -> treated as unpowered in
// powerSystem). Passive infrastructure (solar/battery, draw 0) never wears.
// Conduits also wear independently and, at hp 0, break until a crew member repairs.
// WATER (M-water, soft model): once Water Reclamation is researched, advanced (2+
// lab) modules draw on stored water — with water they run COOL (½ wear), dry they
// OVERHEAT (3× wear). Untouched modules + pre-water stations wear normally.
export function maintenanceSystem(w: World, dt: number): void {
  const waterActive = isUnlocked(w, "waterreclam");
  const dry = w.stock.water <= 0;
  let waterDemand = 0;
  for (const id in w.structures) {
    const s = w.structures[id];
    const def = STRUCTURES[s.kind];
    if (def.draw <= 0 || !s.powered) continue;
    const advanced = waterActive && WATER_MODULE_KINDS.has(s.kind);
    if (advanced) waterDemand += WATER_PER_MODULE;
    const wear = advanced ? WEAR * (dry ? WATER_DRY_WEAR : WATER_COOL_WEAR) : WEAR;
    s.condition = Math.max(0, s.condition - wear * dt);
  }
  if (waterDemand > 0) w.stock.water = Math.max(0, w.stock.water - waterDemand * dt);
  for (const c of w.conduits) {
    if (c.hp > 0) c.hp = Math.max(0, c.hp - CONDUIT_WEAR * dt);
  }
}
