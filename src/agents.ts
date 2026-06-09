import { Agent, Structure, World } from "./types";
import { findPath, manhattan, nearestBreathable } from "./pathfind";
import { SPECIES } from "./species";

const SPEED = 4; // cells / second
const O2_DECAY = 8;
const O2_RECOVER = 15;
const FOOD_DECAY = 1.5;
const REST_DECAY = 1.0;
const FOOD_LOW = 40;
const REST_LOW = 35;
const REST_RATE = 12; // recovery while sleeping

export function agentSystem(w: World, dt: number): void {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;

    a.food = Math.max(0, a.food - FOOD_DECAY * dt);
    a.rest = Math.max(0, a.rest - REST_DECAY * dt);
    if (a.guest) a.stay -= dt;

    const cell = w.cells[a.cell];
    const room = cell.roomId >= 0 ? w.rooms[cell.roomId] : undefined;
    const breathable = !!room && room.gas === SPECIES[a.species].gas;
    if (breathable) {
      a.o2 = Math.min(100, a.o2 + O2_RECOVER * dt);
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
  // Emergency: bad air overrides everything.
  if (!breathable) {
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

  // Safe air: a flee task is complete.
  if (a.task && a.task.type === "flee") a.task = null;

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
    const pod = claimPod(w, a, a.cell);
    if (pod) {
      a.task = { type: "sleep", target: pod.cell, structureId: pod.id };
      a.path = pod.path;
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
  // else: idle (stand)
}

function releaseTask(w: World, a: Agent): void {
  if (a.task && a.task.type === "sleep" && a.task.structureId != null) {
    const s = w.structures[a.task.structureId];
    if (s && s.occupantId === a.id) s.occupantId = -1;
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

function claimPod(w: World, a: Agent, start: number): Found | null {
  const pods = Object.values(w.structures).filter((s) => s.kind === "pod" && s.occupantId < 0);
  pods.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const p of pods) {
    const path = findPath(w, start, p.cell);
    if (path) {
      p.occupantId = a.id;
      return { id: p.id, cell: p.cell, path };
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
