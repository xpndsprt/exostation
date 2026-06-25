import { Site, World } from "./types";
import { TRAITS } from "./species";
import { storageCaps } from "./storage";
import { aiBoost } from "./structures";
import { beaconActive } from "./beacon";
import { industryBoost, isUnlocked } from "./research";
import { addBody } from "./world";

// Once Water Reclamation is researched, two ICE comets enter the system as drone
// targets (kind "comet"); dispatching a Bot Bay drone to one returns WATER. They're
// far + eccentric (long trips) and effectively endless. Idempotent.
// The station can hold drone cargo only if it has dedicated storage — a Storage
// Floor tile or a Storage Silo. Without it, drones have nowhere to unload.
export function hasStorage(w: World): boolean {
  for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") return true;
  for (const id in w.structures) if (w.structures[id].kind === "silo") return true;
  return false;
}

function ensureComets(w: World): void {
  if (!isUnlocked(w, "waterreclam")) return;
  for (const id in w.sites) if (w.sites[id].kind === "comet") return; // already added
  addBody(w, "comet", { angle: 1.2, dist: 0.92, yield: 30, richness: 1e7, name: "Comet Vela", orbSpeed: 0.05, tint: "#9fe0ff" });
  addBody(w, "comet", { angle: 4.0, dist: 0.78, yield: 26, richness: 1e7, name: "Comet Halis", orbSpeed: -0.07, tint: "#bff0ff" });
  w.notify.push("Water Reclamation online — two ICE comets are now dispatch targets in the Star Chart.");
}

// Drone trip timing. A round trip to a body is one off-map "transit" leg whose
// length scales with the body's orbital distance, bracketed by short lift-off /
// descent animations on the pad.
const OUT_FLY = 2.4; // s — ignite, lift, turn, then zoom off the pad (cinematic)
const IN_FLY = 2.2; // s — streak in, decelerate, turn upright, settle on the pad
const TRIP_BASE = 18; // s — transit time for a body at dist 0
const TRIP_SPAN = 55; // s — extra transit time at dist 1 (so far planets are slow)

// Drone loss & rebuild. Every trip risks the drone to a deep-space hazard; the
// odds climb with distance. A lost drone is rebuilt by its Bay for a fee (once
// you can afford it), after a short fabrication delay.
const LOSS_BASE = 0.02; // base per-trip loss chance
const LOSS_SLOPE = 0.06; // extra loss chance at orbit distance 1 (far = riskier)
export const REBUILD_COST = 300; // ¢ the Bay charges to fabricate a replacement drone
export const REBUILD_TIME = 18; // s to build the replacement (once funded)
const HAZARDS = ["a micrometeoroid storm", "a solar flare", "a pirate ambush", "a gravity-well slingshot gone wrong", "a reactor flare-out"];

export function transitSeconds(dist: number): number {
  return TRIP_BASE + dist * TRIP_SPAN;
}

// Effective distance from the station to a body: a moon is reached via its parent
// planet, so its trip cost tracks the planet's orbit, not the tiny moon orbit.
export function systemDist(w: World, s: Site): number {
  if (s.parent >= 0 && w.sites[s.parent]) return w.sites[s.parent].dist + s.dist * 0.4;
  return s.dist;
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

// Advance every star and body along its orbit (cosmetic motion + live positions).
function advanceOrbits(w: World, dt: number): void {
  const wrap = (a: number) => (a > Math.PI * 2 ? a - Math.PI * 2 : a < 0 ? a + Math.PI * 2 : a);
  for (const st of w.stars ?? []) st.angle = wrap(st.angle + st.orbSpeed * dt);
  for (const id in w.sites) {
    const s = w.sites[id];
    s.angle = wrap(s.angle + (s.orbSpeed ?? 0) * dt);
  }
  for (const c of w.comets ?? []) c.phase = wrap(c.phase + c.speed * dt);
}

// Drone dispatch loop: docked → outbound → transit (off-map) → inbound → unload.
// A drone only flies when its bay is powered AND it has a target (siteId) with
// richness left. Each trip risks loss to a hazard; a lost drone is rebuilt by the
// Bay for a fee. It keeps re-running trips to its target until the body is dry.
export function miningSystem(w: World, dt: number): void {
  ensureComets(w);
  if (dt > 0) advanceOrbits(w, dt);
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
        // A drone won't run a trip unless there's somewhere to PUT the cargo: a
        // Storage Floor or a Silo. No storage → it stays docked (build storage).
        if (!bay.powered || !site || site.richness <= 0 || !hasStorage(w)) {
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
        if (d.t >= transitSeconds(systemDist(w, site))) {
          // Hazard check: the deeper the trip, the likelier the drone is lost.
          const lossChance = LOSS_BASE + systemDist(w, site) * LOSS_SLOPE;
          if (Math.random() < lossChance) {
            const why = HAZARDS[Math.floor(Math.random() * HAZARDS.length)];
            w.notify.push(`Lost the drone to ${why} near ${site.discovered ? site.name : "an unknown body"} — the Bay will rebuild it (¢${REBUILD_COST}).`);
            d.state = "lost";
            d.t = 0;
            d.cargo = 0;
            break; // siteId kept so it resumes the run once rebuilt
          }
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
          if (site && site.kind === "comet") {
            // ice → water, piped straight to the tanks (capped by storage)
            w.stock.water = Math.min(storageCaps(w).water, w.stock.water + d.cargo);
          } else {
            bay.outBuf += d.cargo; // ore piles on the pad — crew haul it to storage
          }
          d.cargo = 0;
          d.state = "docked";
          if (site && site.richness <= 0) {
            w.notify.push(`${site.name} is depleted — pick a new target in the Star Chart.`);
            d.siteId = -1;
          }
        }
        break;
      }
      case "lost": {
        // The Bay fabricates a replacement once the build time has elapsed AND the
        // station can pay for it. Until funded it waits (no drone in service).
        d.t += dt;
        if (d.t >= REBUILD_TIME && w.credits >= REBUILD_COST) {
          w.credits -= REBUILD_COST;
          d.state = "docked";
          d.t = 0;
          d.cargo = 0;
          w.notify.push(`The ${bay ? "Bot Bay" : "Bay"} rebuilt its drone (−¢${REBUILD_COST}).`);
        }
        break;
      }
    }
  }

  // Bootstrap / headless: with no resident crew to haul, ore on the pads trickles
  // straight into the warehouse (mirrors the vat trickle in food.ts).
  let residents = 0;
  for (const id in w.agents) if (w.agents[id].alive && !w.agents[id].guest) residents++;
  if (residents === 0) {
    const cap = storageCaps(w).minerals;
    for (const id in w.structures) {
      const s = w.structures[id];
      if (s.kind !== "bay" || s.outBuf <= 0) continue;
      const move = Math.min(s.outBuf, cap - w.stock.minerals);
      if (move > 0) { w.stock.minerals += move; s.outBuf -= move; }
    }
  }
}
