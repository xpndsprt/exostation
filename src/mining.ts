import { World } from "./types";
import { TRAITS } from "./species";
import { storageCaps } from "./storage";
import { aiBoost } from "./structures";
import { beaconActive } from "./beacon";
import { industryBoost } from "./research";

// Drone trip timing. A round trip to a body is one off-map "transit" leg whose
// length scales with the body's orbital distance, bracketed by short lift-off /
// descent animations on the pad.
const OUT_FLY = 1.5; // s — lift off the pad toward space
const IN_FLY = 1.5; // s — descend onto the pad and unload
const TRIP_BASE = 18; // s — transit time for a body at dist 0
const TRIP_SPAN = 55; // s — extra transit time at dist 1 (so far planets are slow)

export function transitSeconds(dist: number): number {
  return TRIP_BASE + dist * TRIP_SPAN;
}

// Per-trip haul multiplier: Korro Hauler trait + AI Core + Industrialist doctrine
// + the Korro Ore Refinery beacon. Applied to a body's base yield.
function haulMult(w: World): number {
  let korro = 1;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && !a.guest && a.species === "korro") {
      korro = TRAITS.korroHaul;
      break;
    }
  }
  return korro * aiBoost(w) * industryBoost(w) * (beaconActive(w, "orerefinery") ? 1.5 : 1);
}

// Drone dispatch loop: docked → outbound → transit (off-map) → inbound → unload.
// A drone only flies when its bay is powered AND it has a target (siteId) with
// richness left — targets are assigned by the player from the Star Chart. It
// keeps re-running trips to that target until the body is depleted, then idles.
export function miningSystem(w: World, dt: number): void {
  const mult = haulMult(w);
  for (const id in w.drones) {
    const d = w.drones[id];
    const bay = w.structures[d.bayId];
    if (!bay || bay.kind !== "bay") {
      delete w.drones[id]; // bay was removed
      continue;
    }
    const site = d.siteId >= 0 ? w.sites[d.siteId] : undefined;

    switch (d.state) {
      case "docked": {
        if (!bay.powered || !site || site.richness <= 0) {
          if (site && site.richness <= 0) d.siteId = -1; // target ran dry — idle
          break;
        }
        d.state = "outbound";
        d.t = 0;
        break;
      }
      case "outbound": {
        if (!site) {
          d.state = "docked";
          d.t = 0;
          break;
        }
        d.t += dt / OUT_FLY;
        if (d.t >= 1) {
          d.t = 0;
          d.state = "transit";
        }
        break;
      }
      case "transit": {
        if (!site) {
          d.state = "inbound";
          d.t = 0;
          break;
        }
        d.t += dt; // seconds, off-map
        if (d.t >= transitSeconds(site.dist)) {
          // Arrive: reveal (first visit) and load up. Yield scaled by traits/boosts,
          // capped by what the body has left.
          const haul = Math.min(site.richness, Math.round(site.yield * mult));
          site.richness -= haul;
          d.cargo = haul;
          if (!site.discovered) {
            site.discovered = true;
            w.notify.push(`Drone surveyed ${site.name}: ${site.yield}/trip, ${Math.round(site.richness + haul)} units.`);
          }
          d.state = "inbound";
          d.t = 0;
        }
        break;
      }
      case "inbound": {
        d.t += dt / IN_FLY;
        if (d.t >= 1) {
          d.t = 0;
          w.stock.minerals = Math.min(storageCaps(w).minerals, w.stock.minerals + d.cargo);
          d.cargo = 0;
          d.state = "docked";
          if (site && site.richness <= 0) {
            w.notify.push(`${site.name} is depleted — pick a new target in the Star Chart.`);
            d.siteId = -1;
          }
        }
        break;
      }
    }
  }
}
