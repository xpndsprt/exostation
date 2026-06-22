import { World } from "./types";
import { STRUCTURES, isDock } from "./structures";
import { idx, inBounds, setCell, exteriorCell, eraseAt } from "./world";
import { activeDoctrine } from "./research";
import { spawnBoardingParty } from "./boarding";

// Periodic, escalating station incidents that make batteries, layout and
// Security matter under duress. Deterministic from the tick so runs replay.
const FIRST = 120; // seconds before the first incident (let the player establish)
const BASE_INTERVAL = 90; // seconds between incidents (shrinks slightly over time)
const SURGE_FAULT = 20; // seconds a surged module stays offline
const SHOCK_TIME = 40; // seconds a market shock lasts
const RAID_TIME = 18; // seconds a raider lingers
// Raider damage scales with station value (M38): a fat, undefended station is a
// fat target. condition/sec = BASE + PER·(powered modules), capped at MAX.
const RAID_DPS_BASE = 16; // raiders hit hard — an undefended module is wrecked fast
const RAID_DPS_PER = 0.7;
const RAID_DPS_MAX = 48;
const RAID_WALL_TICKS = 40; // every ~4s an active raid also blows open a hull wall

function hash(n: number): number {
  return (n * 2654435761) >>> 0;
}

function interval(w: World): number {
  // incidents come a little faster the longer the station runs (escalation)
  return Math.max(60, BASE_INTERVAL - Math.floor(w.tick / 6000) * 5);
}

// Production/economy/defence modules are always fair game. Life support
// (O₂/CH₄ generators) is protected *by default* — but that protection is now
// earned through redundancy, not granted unconditionally (M38, see below).
function isLifeSupport(kind: string): boolean {
  return kind === "o2gen" || kind === "ch4gen";
}
function targetable(kind: string): boolean {
  return !isLifeSupport(kind);
}

// Total battery capacity built — a battery bank absorbs a power-surge spike.
function stationBatteryMax(w: World): number {
  let max = 0;
  for (const id in w.structures) max += STRUCTURES[w.structures[id].kind].battery;
  return max;
}
function kindCount(w: World, kind: string): number {
  let n = 0;
  for (const id in w.structures) if (w.structures[id].kind === kind) n++;
  return n;
}
function hasTurretBuilt(w: World): boolean {
  for (const id in w.structures) if (w.structures[id].kind === "turret") return true;
  return false;
}

// A surge can fry a life-support generator only if the player skipped *both*
// forms of redundancy: a Battery Bank to soak the spike, and a backup generator
// for that gas. Build either and a surge can never take that room's air.
function surgeVulnerableLS(w: World, kind: string): boolean {
  if (!isLifeSupport(kind)) return false;
  return stationBatteryMax(w) <= 0 && kindCount(w, kind) <= 1;
}

// Condition lost per second by a raid, scaled to station size.
export function raiderDps(w: World): number {
  let n = 0;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (STRUCTURES[s.kind].draw > 0 && s.powered) n++;
  }
  const garrison = activeDoctrine(w) === "garrison" ? 0.5 : 1; // Garrison doctrine halves it
  return Math.min(RAID_DPS_MAX, RAID_DPS_BASE + n * RAID_DPS_PER) * garrison;
}

function enclosedRoomCount(w: World): number {
  const seen = new Set<number>();
  for (const c of w.cells) if (c.type === "floor" && c.enclosed && c.roomId >= 0) seen.add(c.roomId);
  return seen.size;
}

export function eventsSystem(w: World, dt: number): void {
  // ongoing: market shock decays back to normal
  if (w.priceT > 0) {
    w.priceT -= dt;
    if (w.priceT <= 0) {
      w.priceT = 0;
      w.priceMult = 1;
    }
  }
  // ongoing: surged modules come back online
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.faultT > 0) s.faultT = Math.max(0, s.faultT - dt);
  }
  // ongoing: raiders chew on modules unless a powered Turret drives them off
  handleRaiders(w, dt);

  // scheduler — first incident at FIRST, then every interval()
  w.eventTimer += dt;
  const due = w.tick < FIRST * 10 ? FIRST : interval(w);
  if (w.eventTimer >= due) {
    w.eventTimer = 0;
    fireEvent(w);
  }
}

function handleRaiders(w: World, dt: number): void {
  let turret = false;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "turret" && s.powered) {
      turret = true;
      break;
    }
  }
  let raided = false;
  for (let i = w.ships.length - 1; i >= 0; i--) {
    const sh = w.ships[i];
    if (!sh.hostile) continue;
    if (turret) {
      w.ships.splice(i, 1);
      w.notify.push("A Turret shot down a raider.");
    } else {
      raided = true;
    }
  }
  if (!raided) {
    w.raidTarget = -1;
    return;
  }
  // An undefended, established station (no Turret ever built, 2+ rooms) exposes
  // even life support to the raider — so "build Security" is a real decision,
  // not optional. A beginner's single room stays safe.
  const lsExposed = !hasTurretBuilt(w) && enclosedRoomCount(w) >= 2 && activeDoctrine(w) !== "garrison";
  const machines = Object.values(w.structures).filter(
    (s) => STRUCTURES[s.kind].draw > 0 && s.condition > 0 && (targetable(s.kind) || (lsExposed && isLifeSupport(s.kind))),
  );
  if (machines.length) {
    const m = machines[hash(Math.floor(w.tick / 10)) % machines.length];
    m.condition = Math.max(0, m.condition - raiderDps(w) * dt);
    w.raidTarget = m.cell; // renderer draws an attack beam here
    if (m.condition <= 0) {
      // wrecked: actually destroy it, so a raid you don't defend costs you a module
      const label = STRUCTURES[m.kind].label;
      eraseAt(w, m.cell % w.w, (m.cell / w.w) | 0);
      w.notify.push(`Raiders destroyed your ${label}! Build a Turret to fight back.`);
      w.raidTarget = -1;
    }
  } else if (breach(w)) {
    // nothing left to wreck — they blow a hole in the hull instead
    w.raidTarget = -1;
  } else {
    w.raidTarget = -1;
  }
  // Raiders also blast the hull itself: every few seconds an active raid tears a
  // wall open so the wing vents to space (crew scramble to reseal). That makes an
  // undefended raid genuinely dangerous — modules wrecked AND air escaping.
  if (w.tick % RAID_WALL_TICKS === 0) breach(w);
}

function fireEvent(w: World): void {
  const roll = hash(w.tick) % 4;
  const order = [roll, (roll + 1) % 4, (roll + 2) % 4, (roll + 3) % 4];
  for (const e of order) {
    if (e === 0 && surge(w)) return;
    if (e === 1 && breach(w)) return;
    if (e === 2 && shock(w)) return;
    if (e === 3 && raid(w)) return;
  }
}

// Trigger a specific incident (used by tests; the scheduler picks at random).
export function forceEvent(w: World, type: "surge" | "breach" | "shock" | "raid"): boolean {
  if (type === "surge") return surge(w);
  if (type === "breach") return breach(w);
  if (type === "shock") return shock(w);
  return raid(w);
}

// Power surge: a random running machine trips offline for a while. Life support
// is included only when it's unredundant (no Battery + a lone generator) — so
// the counter to a life-threatening surge is redundancy, not blanket immunity.
function surge(w: World): boolean {
  const machines = Object.values(w.structures).filter(
    (s) => STRUCTURES[s.kind].draw > 0 && s.powered && s.faultT <= 0 && (targetable(s.kind) || surgeVulnerableLS(w, s.kind)),
  );
  if (machines.length === 0) return false;
  const m = machines[hash(w.tick + 1) % machines.length];
  m.faultT = SURGE_FAULT;
  const warn = isLifeSupport(m.kind) ? " — life support is DOWN, build a Battery or backup generator!" : ".";
  w.notify.push(`Power surge — ${STRUCTURES[m.kind].label} tripped offline${warn}`);
  return true;
}

// Hull breach: a wall between a sealed room and space blows out, venting it.
// Only once the station has 2+ enclosed rooms, so crew can flee through a door
// (a single-room station would be an unavoidable wipe).
function breach(w: World): boolean {
  if (enclosedRoomCount(w) < 2) return false;
  const cands: number[] = [];
  for (let i = 0; i < w.cells.length; i++) {
    if (w.cells[i].type !== "wall") continue;
    const x = i % w.w;
    const y = (i / w.w) | 0;
    let enclosed = false;
    let space = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(w, nx, ny)) {
        space = true;
        continue;
      }
      const c = w.cells[idx(w, nx, ny)];
      if (c.type === "floor" && c.enclosed) enclosed = true;
      if (c.type === "space") space = true;
    }
    if (enclosed && space) cands.push(i);
  }
  if (cands.length === 0) return false;
  const cell = cands[hash(w.tick + 2) % cands.length];
  setCell(w, cell % w.w, (cell / w.w) | 0, "space");
  w.breaches.push({ cell, sealer: -1, progress: 0 }); // crew will rush to reseal it
  w.notify.push("Hull breach! Crew are scrambling to reseal the wall.");
  return true;
}

// Market shock: mineral prices spike or crash for a window.
function shock(w: World): boolean {
  const up = (hash(w.tick + 3) & 1) === 0;
  w.priceMult = up ? 2 : 0.5;
  w.priceT = SHOCK_TIME;
  w.notify.push(up ? "Mineral prices SURGE ×2 — sell now!" : "Mineral prices CRASH ×0.5 — hold your ore.");
  return true;
}

// Raider: a hostile ship parks at a dock and wrecks modules until a Turret kills it.
function raid(w: World): boolean {
  let dock = null;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (isDock(s.kind) && s.powered) {
      dock = s;
      break;
    }
  }
  if (!dock) return false;
  const ex = exteriorCell(w, dock);
  if (ex < 0) return false;
  w.ships.push({ cell: ex, t: RAID_TIME, hostile: true });
  w.notify.push("Raider inbound! Build a Turret to drive it off.");
  // a boarding party storms aboard to wreck the place from the inside
  spawnBoardingParty(w, 2 + (hash(w.tick) % 3), RAID_TIME);
  return true;
}
