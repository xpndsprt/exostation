import { Species, Structure, World } from "./types";
import { STRUCTURES } from "./structures";

// The Sector Beacon: each species has one signature module that only operates
// while that species is aboard (in the module's room). While operating it gives
// a unique perk and charges toward the win. Bring all five to 100% to win.
const CHARGE_RATE = 2; // % per second while operating (~50s to full)
const FORGE_REPAIR = 6; // condition/s the Thol Auto-Forge restores station-wide

export const BEACON_SPECIES: Partial<Record<string, Species>> = {
  cmdhub: "human",
  tradenexus: "drenn",
  autoforge: "thol",
  bloomgarden: "vryl",
  orerefinery: "korro",
};
export const BEACON_KINDS = Object.keys(BEACON_SPECIES);

function speciesInRoom(w: World, rid: number, sp: Species): boolean {
  if (rid < 0) return false;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === sp && w.cells[a.cell].roomId === rid) return true;
  }
  return false;
}

// A beacon module is "operating" when powered AND its species is in its room.
export function moduleActive(w: World, s: Structure): boolean {
  const sp = BEACON_SPECIES[s.kind];
  if (!sp || !s.powered) return false;
  return speciesInRoom(w, w.cells[s.cell].roomId, sp);
}

// Is any module of this beacon kind currently operating? (Used for its perk.)
export function beaconActive(w: World, kind: string): boolean {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === kind && moduleActive(w, s)) return true;
  }
  return false;
}

// How many of the 5 beacon kinds have a module fully charged (timer >= 100).
export function beaconCharged(w: World): number {
  let n = 0;
  for (const kind of BEACON_KINDS) {
    for (const id in w.structures) {
      const s = w.structures[id];
      if (s.kind === kind && s.timer >= 100) {
        n++;
        break;
      }
    }
  }
  return n;
}

// Smooth 0..1 progress for the visual Beacon (the Bajoran-style wormhole): the
// average charge across the 5 beacon kinds (a missing/unbuilt kind counts as 0,
// each built kind by its best module's timer). 0 = nothing, 1 = all five at 100%.
export function beaconIntensity(w: World): number {
  let sum = 0;
  for (const kind of BEACON_KINDS) {
    let best = 0;
    for (const id in w.structures) {
      const s = w.structures[id];
      if (s.kind === kind) best = Math.max(best, s.timer || 0);
    }
    sum += Math.min(100, best) / 100;
  }
  return sum / BEACON_KINDS.length;
}

// Charge operating modules; the Thol Auto-Forge also repairs the station.
export function beaconSystem(w: World, dt: number): void {
  let forge = false;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!(s.kind in BEACON_SPECIES)) continue;
    if (moduleActive(w, s)) {
      s.timer = Math.min(100, s.timer + CHARGE_RATE * dt);
      if (s.kind === "autoforge") forge = true;
    }
  }
  if (forge) {
    for (const id in w.structures) {
      const s = w.structures[id];
      if (STRUCTURES[s.kind].draw > 0 && s.condition > 0 && s.condition < 100) {
        s.condition = Math.min(100, s.condition + FORGE_REPAIR * dt);
      }
    }
  }
}
