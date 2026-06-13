import { Agent, Structure, World } from "./types";
import { findPath, manhattan, nearestBreathable } from "./pathfind";
import { accessCell, idx, inBounds, setCell } from "./world";
import { SPECIES, TRAITS } from "./species";
import { STRUCTURES } from "./structures";
import { productivity } from "./harmony";
import { SERVICE_THRESHOLD, REPAIR_RATE } from "./maintenance";

const SPEED = 4; // cells / second
const O2_DECAY = 8; // breath lost per second once the suit is empty
const O2_RECOVER = 15;
const SUIT_DECAY = 14; // suit reserve spent per second off native air (~7s of cover)
const SUIT_RECHARGE = 40; // suit refilled per second back in native air (~2.5s)
const SUIT_PANIC = 30; // head for air once the suit drops below this (still time to exit)
const VENTURE_SUIT = 80; // only start a task in a hostile room when nearly fully charged
const FOOD_DECAY = 1.5;
const REST_DECAY = 1.0;
const FUN_DECAY = 0.4;
const FOOD_LOW = 40;
const REST_LOW = 35;
const FUN_LOW = 40;
const REST_RATE = 12; // recovery while sleeping
const RELAX_RATE = 20; // fun recovered while at a Lounge
const SEAL_RATE = 0.4; // breach repair per second (~2.5s to reseal)
const BREACH_COST = 120; // emergency-repair credits per breach sealed

export function agentSystem(w: World, dt: number): void {
  // Drop breaches already resealed (by crew or the player), and free a claim
  // whose sealer died/left so another crew member can take over.
  if (w.breaches.length) {
    w.breaches = w.breaches.filter((b) => w.cells[b.cell].type === "space");
    for (const b of w.breaches) {
      if (b.sealer >= 0 && !w.agents[b.sealer]?.alive) b.sealer = -1;
    }
  }

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

function nativeAt(w: World, a: Agent, cell: number): boolean {
  const r = w.cells[cell].roomId;
  return r >= 0 && w.rooms[r]?.gas === SPECIES[a.species].gas;
}

function think(w: World, a: Agent, dt: number, _breathable: boolean): void {
  // Recompute from the agent's CURRENT cell (it may have just moved onto a door
  // or into another room this tick — the value passed in is pre-movement).
  const breathable = nativeAt(w, a, a.cell);

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
      const dock = nearestDockAccess(w, a.cell); // gas doesn't matter — they're leaving
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
        const line = SPECIES[a.species].diet;
        if (w.stock.meals[line] > 0) {
          w.stock.meals[line] -= 1;
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
          const room = w.cells[a.cell].roomId;
          const prod = room >= 0 && w.rooms[room] ? productivity(w.rooms[room].harmony) : 1;
          const rate = REPAIR_RATE * (a.species === "thol" ? TRAITS.tholRepair : 1) * prod;
          s.condition = Math.min(100, s.condition + rate * dt);
          if (s.condition >= 100) releaseTask(w, a);
          return; // keep working until fully serviced
        }
        releaseTask(w, a);
      } else if (a.task.type === "seal") {
        const b = w.breaches.find((x) => x.sealer === a.id);
        if (b && w.cells[b.cell].type === "space") {
          b.progress += SEAL_RATE * dt;
          if (b.progress >= 1) {
            setCell(w, b.cell % w.w, (b.cell / w.w) | 0, "wall"); // hull restored
            const cost = Math.min(w.credits, BREACH_COST);
            w.credits -= cost;
            w.notify.push(`Crew sealed a hull breach (−¢${Math.round(cost)}).`);
            w.breaches = w.breaches.filter((x) => x !== b);
            releaseTask(w, a);
          }
          return; // keep sealing
        }
        releaseTask(w, a); // breach already gone
      } else {
        a.task = null;
      }
    } else {
      releaseTask(w, a); // path lost / displaced
    }
  }
  if (a.task) return;

  // EMERGENCY: residents drop everything to reseal an open hull breach.
  if (!a.guest) {
    const seal = claimSeal(w, a, a.cell);
    if (seal) {
      a.task = { type: "seal", target: seal.cell };
      a.path = seal.path;
      return;
    }
  }

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
  if (a.food < FOOD_LOW && w.stock.meals[SPECIES[a.species].diet] > 0) {
    const synth = nearestReachable(w, a, a.cell, "synth", true); // eating is quick — may venture
    if (synth) {
      a.task = { type: "eat", target: synth.cell };
      a.path = synth.path;
      return;
    }
  }
  // Both crew and visitors relax at a Lounge when bored (and socialize there).
  // You won't lounge somewhere you can't breathe, so this stays native-only.
  if (a.fun < FUN_LOW) {
    const rec = nearestReachable(w, a, a.cell, "rec", false);
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

  // Nothing to do and standing in the wrong air? Head home to your own gas
  // rather than loitering on suit (keeps Thol in their methane wing, etc.)
  // until it runs low. This is a calm return, not the suit-panic emergency flee.
  if (!breathable) {
    const air = nearestBreathable(w, a.cell, SPECIES[a.species].gas);
    if (air >= 0 && air !== a.cell) {
      const p = findPath(w, a.cell, air);
      if (p) {
        a.task = { type: "flee", target: air };
        a.path = p;
      }
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
  if (a.task && a.task.type === "seal") {
    const b = w.breaches.find((x) => x.sealer === a.id);
    if (b) b.sealer = -1; // unclaim so another crew member can finish it
  }
  a.task = null;
  a.path = [];
  a.moveAcc = 0;
}

// Claim the nearest open breach: stand on a reachable interior cell next to it.
// Only with breathable air there, or a charged suit to work in the vacuum.
function claimSeal(w: World, a: Agent, start: number): { cell: number; path: number[] } | null {
  const open = w.breaches.filter((b) => b.sealer < 0 && w.cells[b.cell].type === "space");
  open.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const b of open) {
    const bx = b.cell % w.w;
    const by = (b.cell / w.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = bx + dx;
      const ny = by + dy;
      if (!inBounds(w, nx, ny)) continue;
      const ci = idx(w, nx, ny);
      const c = w.cells[ci];
      if (c.type !== "floor" && c.type !== "door") continue;
      if (!nativeAt(w, a, ci) && a.suit < VENTURE_SUIT) continue;
      const path = findPath(w, start, ci);
      if (path) {
        b.sealer = a.id;
        return { cell: ci, path };
      }
    }
  }
  return null;
}

interface Found {
  id: number;
  cell: number;
  path: number[];
}

function claimBunk(w: World, a: Agent, start: number, kind: Structure["kind"]): Found | null {
  // only bunks the agent can actually breathe at
  const bunks = Object.values(w.structures).filter(
    (s) => s.kind === kind && s.occupantId < 0 && nativeAt(w, a, s.cell),
  );
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

// Find the nearest reachable module of a kind. Native-air targets are always
// allowed; a hostile-air target is only allowed when `venture` is set AND the
// suit is nearly full (enough cover to do the job and get back).
function nearestReachable(
  w: World,
  a: Agent,
  start: number,
  kind: Structure["kind"],
  venture: boolean,
): Found | null {
  const ok = (s: Structure) => nativeAt(w, a, s.cell) || (venture && a.suit >= VENTURE_SUIT);
  const list = Object.values(w.structures).filter((s) => s.kind === kind && ok(s));
  list.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const s of list) {
    const path = findPath(w, start, s.cell);
    if (path) return { id: s.id, cell: s.cell, path };
  }
  return null;
}

// Nearest dock, targeting its interior access cell (the wall cell isn't
// walkable). Gas-agnostic — used by departing guests.
function nearestDockAccess(w: World, start: number): Found | null {
  const docks = Object.values(w.structures).filter((s) => s.kind === "dock");
  docks.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const d of docks) {
    const t = accessCell(w, d);
    if (t < 0) continue;
    const path = findPath(w, start, t);
    if (path) return { id: d.id, cell: t, path };
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
    // only service in hostile air with a charged suit (enough cover to finish)
    if (!nativeAt(w, a, target) && a.suit < VENTURE_SUIT) continue;
    const path = findPath(w, start, target);
    if (path) {
      s.servicedBy = a.id;
      return { id: s.id, cell: target, path };
    }
  }
  return null;
}
