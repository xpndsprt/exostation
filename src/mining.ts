import { Site, World } from "./types";

const DRONE_SPEED = 6; // tiles / second
const CARGO_CAP = 10;
const MINE_RATE = 5; // minerals / second

function tileDist(w: World, a: number, b: number): number {
  const ax = a % w.w;
  const ay = (a / w.w) | 0;
  const bx = b % w.w;
  const by = (b / w.w) | 0;
  return Math.hypot(ax - bx, ay - by);
}

function nearestSite(w: World, cell: number): Site | null {
  let best: Site | null = null;
  let bestD = Infinity;
  for (const id in w.sites) {
    const s = w.sites[id];
    if (s.richness <= 0) continue;
    const d = tileDist(w, cell, s.cell);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

// Drone shuttle loop: docked -> outbound -> mining -> inbound -> unload.
// Auto-dispatches to the nearest non-empty site (per-site/standing-order
// assignment is a post-MVP radar feature).
export function miningSystem(w: World, dt: number): void {
  for (const id in w.drones) {
    const d = w.drones[id];
    const bay = w.structures[d.bayId];
    if (!bay || bay.kind !== "bay") {
      delete w.drones[id]; // bay was removed
      continue;
    }

    switch (d.state) {
      case "docked": {
        if (!bay.powered) break;
        const site = nearestSite(w, bay.cell);
        if (!site) break;
        d.siteId = site.id;
        d.state = "outbound";
        d.t = 0;
        break;
      }
      case "outbound": {
        const site = w.sites[d.siteId];
        if (!site) {
          d.state = "inbound";
          d.t = 0;
          break;
        }
        const dur = Math.max(0.2, tileDist(w, bay.cell, site.cell) / DRONE_SPEED);
        d.t += dt / dur;
        if (d.t >= 1) {
          d.t = 0;
          d.state = "mining";
        }
        break;
      }
      case "mining": {
        const site = w.sites[d.siteId];
        if (!site || site.richness <= 0) {
          d.state = "inbound";
          d.t = 0;
          break;
        }
        const want = Math.min(MINE_RATE * dt, CARGO_CAP - d.cargo, site.richness);
        d.cargo += want;
        site.richness -= want;
        if (d.cargo >= CARGO_CAP || site.richness <= 0) {
          d.state = "inbound";
          d.t = 0;
        }
        break;
      }
      case "inbound": {
        const site = w.sites[d.siteId];
        const from = site ? site.cell : bay.cell;
        const dur = Math.max(0.2, tileDist(w, bay.cell, from) / DRONE_SPEED);
        d.t += dt / dur;
        if (d.t >= 1) {
          d.t = 0;
          w.stock.minerals += d.cargo;
          d.cargo = 0;
          d.state = "docked";
        }
        break;
      }
    }
  }
}
