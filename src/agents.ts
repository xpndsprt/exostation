import { Agent, Structure, World } from "./types";
import { findPath, manhattan, nearestBreathable } from "./pathfind";
import { accessCell } from "./world";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";
import { SERVICE_THRESHOLD, REPAIR_RATE } from "./maintenance";

const SPEED = 4; // cells / second
const O2_DECAY = 8; // breath lost per second once the suit is empty
const O2_RECOVER = 15;
const SUIT_DECAY = 20; // suit reserve spent per second in a non-native zone (~5s)
const SUIT_RECHARGE = 40; // suit refilled per second back in native air
const SUIT_PANIC = 50; // only flee to native air once the suit drops below this
const FOOD_DECAY = 1.5;
const REST_DECAY = 1.0;
const FUN_DECAY = 0.4;
const FOOD_LOW = 40;
const REST_LOW = 35;
const FUN_LOW = 40;
const REST_RATE = 12; // recovery while sleeping
const RELAX_RATE = 20; // fun recovered while at a Lounge

export function agentSystem(w: World, dt: number): void {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;

    a.food = Math.max(0, a.food - FOOD_DECAY * dt);
    a.rest = Math.max(0, a.rest - REST_DECAY * dt);
    a.fun = Math.max(0, a.fun - FUN_DECAY * dt);
    if (a.guest) a.stay -= dt;

    const cell = w.cells[a.cell];
    const room = cell.roomId >= 0 ? w.rooms[cell.roomId] : undefined;
    const breathable = !!room && room.gas === SPECIES[a.species].gas;
    if (breathable) {
      a.o2 = Math.min(100, a.o2 + O2_RECOVER * dt);
      a.suit = Math.min(100, a.suit + SUIT_RECHARGE * dt);
    } else if (a.suit > 0) {
      // suit auto-dons in a hostile zone and keeps them breathing — for a while
      a.suit = Math.max(0, a.suit - SUIT_DECAY * dt);
    } else {
      a.o2 = Math.max(0, a.o2 - O2_DECAY * dt);
      if (a.o2 <= 0) {
        a.alive = false;
        releaseTask(w, a);
        continue;
      }
    }

    advanceMovement(a, dt);

    // A departing guest that reached the dock leaves the station.
    if (a.task && a.task.type === "leave" && a.path.length === 0 && a.cell === a.task.target) {
      releaseTask(w, a);
      delete w.agents[id];
      continue;
    }

    think(w, a, dt, breathable);
  }
}

function advanceMovement(a: Agent, dt: number): void {
  if (a.path.length === 0) return;
  a.moveAcc += SPEED * dt;
  while (a.moveAcc >= 1 && a.path.length > 0) {
    a.cell = a.path.shift() as number;
    a.moveAcc -= 1;
  }
  if (a.path.length === 0) a.moveAcc = 0;
}

function think(w: World, a: Agent, dt: number, breathable: boolean): void {
  // Emergency: off native air AND the suit is running out. Crew are suited, so a
  // brief transit (e.g. crossing a door, which is a vacuum airlock tile) does
  // NOT trigger this — only genuine, prolonged exposure does.
  if (!breathable && a.suit < SUIT_PANIC) {
    if (!a.task || a.task.type !== "flee") {
      releaseTask(w, a);
      const air = nearestBreathable(w, a.cell, SPECIES[a.species].gas);
      if (air >= 0 && air !== a.cell) {
        const p = findPath(w, a.cell, air);
        if (p) {
          a.task = { type: "flee", target: air };
          a.path = p;
        }
      }
    }
    return;
  }

  // Back in good air: a flee task is complete.
  if (breathable && a.task && a.task.type === "flee") a.task = null;

  // Guest whose stay is up heads for a dock to leave (overrides eat/sleep).
  if (a.guest && a.stay <= 0) {
    if (!a.task || a.task.type !== "leave") {
      releaseTask(w, a);
      const dock = nearestReachable(w, a.cell, "dock");
      a.task = { type: "leave", target: dock ? dock.cell : a.cell };
      a.path = dock ? dock.path : [];
    }
    return;
  }

  if (a.path.length > 0) return; // still walking

  // Arrived at a task target — act on it.
  if (a.task) {
    if (a.cell === a.task.target) {
      if (a.task.type === "eat") {
        if (w.stock.meals > 0) {
          w.stock.meals -= 1;
          a.food = 100;
        }
        a.task = null;
      } else if (a.task.type === "sleep") {
        a.rest = Math.min(100, a.rest + REST_RATE * dt);
        if (a.rest >= 100) releaseTask(w, a);
        return; // keep sleeping
      } else if (a.task.type === "relax") {
        a.fun = Math.min(100, a.fun + RELAX_RATE * dt);
        a.mood = Math.min(100, a.mood + 2 * dt);
        if (a.fun >= 100) releaseTask(w, a);
        return; // keep relaxing (and socializing with whoever's here)
      } else if (a.task.type === "service") {
        const s = a.task.structureId != null ? w.structures[a.task.structureId] : undefined;
        if (s) {
          s.condition = Math.min(100, s.condition + REPAIR_RATE * dt);
          if (s.condition >= 100) releaseTask(w, a);
          return; // keep working until fully serviced
        }
        releaseTask(w, a);
      } else {
        a.task = null;
      }
    } else {
      releaseTask(w, a); // path lost / displaced
    }
  }
  if (a.task) return;

  // Pick a new task by need (rest first, then food).
  if (a.rest < REST_LOW) {
    // crew sleep in Crew Quarters; visitors in Hotel Rooms
    const bunk = claimBunk(w, a, a.cell, a.guest ? "hotel" : "pod");
    if (bunk) {
      a.task = { type: "sleep", target: bunk.cell, structureId: bunk.id };
      a.path = bunk.path;
      return;
    }
  }
  if (a.food < FOOD_LOW && w.stock.meals > 0) {
    const synth = nearestReachable(w, a.cell, "synth");
    if (synth) {
      a.task = { type: "eat", target: synth.cell };
      a.path = synth.path;
      return;
    }
  }
  // Both crew and visitors relax at a Lounge when bored (and socialize there).
  if (a.fun < FUN_LOW) {
    const rec = nearestReachable(w, a.cell, "rec");
    if (rec) {
      a.task = { type: "relax", target: rec.cell };
      a.path = rec.path;
      return;
    }
  }
  // Residents (crew) work: service worn machinery. Visitors never take jobs.
  if (!a.guest) {
    const job = claimService(w, a, a.cell);
    if (job) {
      a.task = { type: "service", target: job.cell, structureId: job.id };
      a.path = job.path;
      return;
    }
  }
  // else: idle (stand)
}

function releaseTask(w: World, a: Agent): void {
  if (a.task && a.task.structureId != null) {
    const s = w.structures[a.task.structureId];
    if (s) {
      if (a.task.type === "sleep" && s.occupantId === a.id) s.occupantId = -1;
      if (a.task.type === "service" && s.servicedBy === a.id) s.servicedBy = -1;
    }
  }
  a.task = null;
  a.path = [];
  a.moveAcc = 0;
}

interface Found {
  id: number;
  cell: number;
  path: number[];
}

function claimBunk(w: World, a: Agent, start: number, kind: Structure["kind"]): Found | null {
  const bunks = Object.values(w.structures).filter((s) => s.kind === kind && s.occupantId < 0);
  bunks.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const b of bunks) {
    const path = findPath(w, start, b.cell);
    if (path) {
      b.occupantId = a.id;
      return { id: b.id, cell: b.cell, path };
    }
  }
  return null;
}

function nearestReachable(w: World, start: number, kind: Structure["kind"]): Found | null {
  const list = Object.values(w.structures).filter((s) => s.kind === kind);
  list.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const s of list) {
    const path = findPath(w, start, s.cell);
    if (path) return { id: s.id, cell: s.cell, path };
  }
  return null;
}

// Claim the nearest worn, unclaimed machine that needs servicing.
function claimService(w: World, a: Agent, start: number): Found | null {
  const jobs = Object.values(w.structures).filter(
    (s) =>
      STRUCTURES[s.kind].draw > 0 &&
      s.condition < SERVICE_THRESHOLD &&
      (s.servicedBy < 0 || s.servicedBy === a.id),
  );
  jobs.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const s of jobs) {
    const target = accessCell(w, s); // wall-mounted docks are serviced from inside
    if (target < 0) continue;
    const path = findPath(w, start, target);
    if (path) {
      s.servicedBy = a.id;
      return { id: s.id, cell: target, path };
    }
  }
  return null;
}
