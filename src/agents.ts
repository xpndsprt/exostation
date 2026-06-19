import { Agent, Structure, World } from "./types";
import { findPath, manhattan, nearestBreathable } from "./pathfind";
import { accessCell, idx, inBounds, setCell, hasLineOfSight } from "./world";
import { SPECIES, TRAITS } from "./species";
import { STRUCTURES, aiBoost } from "./structures";
import { productivity } from "./harmony";
import { SERVICE_THRESHOLD, REPAIR_RATE } from "./maintenance";
import { industryBoost, highTierModule } from "./research";
import { injure } from "./medical";
import { loveBoost } from "./romance";
import { storageCaps } from "./storage";

// What gas an agent can breathe: its native gas, plus a partner's gas if they
// carry cross-gas love-implants.
function breathes(a: Agent, gas: string | undefined): boolean {
  return gas === SPECIES[a.species].gas || (a.implantGas != null && gas === a.implantGas);
}

const REPAIR_INJURY_RATE = 0.03; // per-second injury chance servicing a high-tier module

const SPEED = 4; // cells / second
const O2_DECAY = 8; // breath lost per second once the suit is empty
const O2_RECOVER = 15;
const SUIT_DECAY = 14; // suit reserve spent per second off native air (~7s of cover)
const SUIT_RECHARGE = 40; // suit refilled per second back in native air (~2.5s)
const SUIT_PANIC = 30; // head for air once the suit drops below this (still time to exit)
const VENTURE_SUIT = 80; // only start a task in a hostile room when nearly fully charged
const FEED_CAP = 4; // feedstock units crew stage at a Synth before they stop topping it up
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
    const breathable = !!room && breathes(a, room.gas);
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

    advanceMovement(w, a, dt);

    // A departing guest that reached the dock leaves the station.
    if (a.task && a.task.type === "leave" && a.path.length === 0 && a.cell === a.task.target) {
      releaseTask(w, a);
      delete w.agents[id];
      continue;
    }

    think(w, a, dt, breathable);
  }
}

function advanceMovement(w: World, a: Agent, dt: number): void {
  if (a.path.length === 0) return;
  a.moveAcc += SPEED * dt;
  while (a.moveAcc >= 1 && a.path.length > 0) {
    const next = a.path.shift() as number;
    // record facing from the step taken (drives the vision cone + fault spotting)
    const dx = (next % w.w) - (a.cell % w.w);
    const dy = ((next / w.w) | 0) - ((a.cell / w.w) | 0);
    if (dx || dy) { a.faceX = Math.sign(dx); a.faceY = Math.sign(dy); }
    a.cell = next;
    a.moveAcc -= 1;
  }
  if (a.path.length === 0) a.moveAcc = 0;
}

function nativeAt(w: World, a: Agent, cell: number): boolean {
  const r = w.cells[cell].roomId;
  return r >= 0 && breathes(a, w.rooms[r]?.gas);
}

// Can this agent actually SEE a cell right now? Within their personal sight range
// and in the forward arc of their facing (or anywhere when standing still and
// looking around). This is how crew spot a faulty module — out of sight, out of mind.
function canSee(w: World, a: Agent, cell: number): boolean {
  const d = manhattan(w, a.cell, cell);
  if (d > a.sight) return false;
  if (d <= 1) return true; // right on top of it
  // walls and modules block the view — no seeing a fault through a bulkhead
  if (!hasLineOfSight(w, a.cell, cell)) return false;
  if (a.faceX === 0 && a.faceY === 0) return true; // idle: looking all around
  const vx = (cell % w.w) - (a.cell % w.w);
  const vy = ((cell / w.w) | 0) - ((a.cell / w.w) | 0);
  return vx * a.faceX + vy * a.faceY > 0; // ahead of them
}

// A random walkable cell in the agent's own air, for idle wandering (sweeping
// their vision cone around the wing until a fault comes into view).
function wanderStep(w: World, a: Agent): number {
  const x = a.cell % w.w, y = (a.cell / w.w) | 0;
  const opts: number[] = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, nx, ny)) continue;
    const ci = idx(w, nx, ny);
    const c = w.cells[ci];
    if ((c.type === "floor" || c.type === "door") && nativeAt(w, a, ci)) opts.push(ci);
  }
  return opts.length ? opts[Math.floor(Math.random() * opts.length)] : -1;
}

// A walkable cell next to a mate that the courting agent can breathe in.
function courtSpot(w: World, a: Agent, mateCell: number): number {
  const x = mateCell % w.w, y = (mateCell / w.w) | 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = x + dx, ny = y + dy;
    if (!inBounds(w, nx, ny)) continue;
    const ci = idx(w, nx, ny);
    const c = w.cells[ci];
    if ((c.type === "floor" || c.type === "door") && nativeAt(w, a, ci)) return ci;
  }
  return -1;
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
        const tid = a.task.structureId;
        const table = tid != null ? w.structures[tid] : undefined;
        if (table && table.kind === "table") {
          // the meal was removed from the warehouse when crew staged it on the table
          if (table.inBuf > 0 && table.recipe === line) { table.inBuf -= 1; a.food = 100; }
        } else if (w.stock.meals[line] > 0) {
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
          const rate = REPAIR_RATE * (a.species === "thol" ? TRAITS.tholRepair : 1) * prod * aiBoost(w) * industryBoost(w) * loveBoost(w, a.id);
          s.condition = Math.min(100, s.condition + rate * dt);
          // servicing heavy, high-tier machinery (2+ Lab unlocks) risks injury;
          // Thol engineers are far more careful with it.
          if (highTierModule(s.kind)) {
            const risk = REPAIR_INJURY_RATE * (a.species === "thol" ? 0.4 : 1);
            if (Math.random() < risk * dt) {
              injure(w, a.id, 35);
              w.notify.push(`A ${a.species} was hurt servicing the ${STRUCTURES[s.kind].label}.`);
              releaseTask(w, a);
              return;
            }
          }
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
      } else if (a.task.type === "haul") {
        // arrived at the drop point — put the carried good into the warehouse (or a
        // consumer's input buffer), then the unit is no longer "in transit".
        const good = a.task.good;
        if (good) {
          if (a.task.deliver && a.task.structureId != null) {
            const s = w.structures[a.task.structureId];
            if (s) {
              s.inBuf += 1;
              if (s.kind === "table") s.recipe = good; // the line now staged at this table
            }
          } else {
            const cap = (storageCaps(w) as unknown as Record<string, number>)[good] ?? Infinity;
            const stock = w.stock as unknown as Record<string, number>;
            stock[good] = Math.min(cap, (stock[good] ?? 0) + 1);
          }
        }
        a.task = null;
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
  if (a.food < FOOD_LOW) {
    const diet = SPECIES[a.species].diet;
    // prefer a Mess Table stocked with their line — sit at a seat around it
    const seat = claimTableSeat(w, a, a.cell, diet);
    if (seat) {
      a.task = { type: "eat", target: seat.cell, structureId: seat.id };
      a.path = seat.path;
      return;
    }
    // fallback: eat at a Synth straight from the warehouse (keeps everyone fed)
    if (w.stock.meals[diet] > 0) {
      const synth = nearestReachable(w, a, a.cell, "synth", true); // eating is quick — may venture
      if (synth) {
        a.task = { type: "eat", target: synth.cell };
        a.path = synth.path;
        return;
      }
    }
  }
  // Both crew and visitors relax at a Lounge when bored (and socialize there).
  // You won't lounge somewhere you can't breathe, so this stays native-only.
  if (a.fun < FUN_LOW) {
    // unwind at a Lounge or a Bar (both are social venues)
    const spot = nearestReachable(w, a, a.cell, "rec", false) ?? nearestReachable(w, a, a.cell, "bar", false);
    if (spot) {
      a.task = { type: "relax", target: spot.cell };
      a.path = spot.path;
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

  // Residents haul a producer's buffered output to storage (a free room cell if no
  // storage exists yet), so the producer doesn't stall. Visitors never haul.
  if (!a.guest) {
    const haul = claimHaul(w, a, a.cell);
    if (haul) {
      a.task = { type: "haul", target: haul.target, good: haul.good, deliver: false };
      a.path = haul.path;
      return;
    }
  }

  // Residents fetch feedstock from storage to a Synth so it can cook meals (the
  // visible "out of storage to prepare meals"). Only fires when storage exists.
  if (!a.guest) {
    const feed = claimFeed(w, a, a.cell);
    if (feed) {
      a.task = { type: "haul", target: feed.target, good: feed.good, deliver: true, structureId: feed.synth };
      a.path = feed.path;
      return;
    }
  }

  // Residents stage meals on Mess Tables so the crew can sit and eat there.
  if (!a.guest) {
    const restock = claimRestock(w, a, a.cell);
    if (restock) {
      a.task = { type: "haul", target: restock.target, good: restock.good, deliver: true, structureId: restock.table };
      a.path = restock.path;
      return;
    }
  }

  // Residents carry minerals from storage to a Trade Hub so it has ore to sell.
  if (!a.guest) {
    const run = claimMineralRun(w, a, a.cell);
    if (run) {
      a.task = { type: "haul", target: run.target, good: "minerals", deliver: true, structureId: run.structure };
      a.path = run.path;
      return;
    }
  }

  // Lovers spend their free time together. With no pressing need or job, a
  // partnered agent heads to their mate — if there's a spot they can breathe.
  // Truly-in-love crew thus cluster, and (via loveBoost) work harder when they do.
  if (a.mateId >= 0) {
    const mate = w.agents[a.mateId];
    if (mate && mate.alive) {
      if (manhattan(w, a.cell, mate.cell) <= 1) {
        a.mood = Math.min(100, a.mood + 1.5 * dt); // the contentment of company
        return;
      }
      const spot = courtSpot(w, a, mate.cell);
      if (spot >= 0) {
        const p = findPath(w, a.cell, spot);
        if (p) {
          a.task = { type: "court", target: spot };
          a.path = p;
          return;
        }
      }
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
    return;
  }

  // Otherwise: patrol. If a module somewhere needs servicing but is out of this
  // resident's sight, they roam their wing — sweeping their vision cone around
  // until the fault comes into view. With nothing to find, they stand idle.
  if (!a.guest && a.path.length === 0 && hasUnseenWork(w, a)) {
    const step = wanderStep(w, a);
    if (step >= 0 && step !== a.cell) a.path = [step];
  }
}

// A vat-output haul job: nearest vat with buffered output the agent can reach,
// routed start → pickup → drop (a Storage tile, else a free cell in the vat's
// room). Reserves one unit. Returns the route + which good, or null.
function claimHaul(w: World, a: Agent, start: number): { target: number; path: number[]; good: string } | null {
  // producers that pile up output crew must clear: Bio Vats (feedstock) + Bot Bays (ore)
  const prod = Object.values(w.structures).filter((s) => (s.kind === "vat" || s.kind === "bay") && s.outBuf > 0);
  prod.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const v of prod) {
    const pick = accessCell(w, v);
    if (pick < 0) continue;
    if (!nativeAt(w, a, pick) && a.suit < VENTURE_SUIT) continue;
    const toPick = findPath(w, start, pick);
    if (!toPick) continue;
    const dest = pickHaulDest(w, a, pick, v);
    if (dest < 0) continue;
    const toDest = findPath(w, pick, dest);
    if (!toDest) continue;
    v.outBuf -= 1; // reserve one unit for this hauler
    const good = v.kind === "bay" ? "minerals" : v.recipe === "spores" || v.recipe === "microbes" ? v.recipe : "biomass";
    return { target: dest, path: toPick.concat(toDest), good };
  }
  return null;
}

const TABLE_CAP = 4; // rations a Mess Table stages before crew stop topping it up
const TRADE_FEED_CAP = 30; // minerals crew stage at a Trade Hub before they stop topping it up

// A mineral-delivery job: carry ore from a Storage tile to a powered Trade Hub so
// it has stock to sell. Needs storage (the pickup) + a charged suit (airless deck).
function claimMineralRun(w: World, a: Agent, start: number): { target: number; path: number[]; structure: number } | null {
  if (a.suit < VENTURE_SUIT) return null;
  const stock = w.stock as unknown as Record<string, number>;
  if ((stock.minerals ?? 0) < 1) return null;
  const hubs = Object.values(w.structures).filter((s) => (s.kind === "tradehub" || s.kind === "cargoex") && s.powered && s.inBuf < TRADE_FEED_CAP);
  hubs.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const h of hubs) {
    const drop = accessCell(w, h);
    if (drop < 0) continue;
    const store: number[] = [];
    for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") store.push(i);
    store.sort((p, q) => manhattan(w, start, p) - manhattan(w, start, q));
    let src = -1, toSrc: number[] | null = null;
    for (const c of store) { const p = findPath(w, start, c); if (p) { src = c; toSrc = p; break; } }
    if (src < 0 || !toSrc) return null; // no storage to draw from — Hub sells from the warehouse
    const toDrop = findPath(w, src, drop);
    if (!toDrop) continue;
    stock.minerals -= 1; // reserve from the warehouse
    return { target: drop, path: toSrc.concat(toDrop), structure: h.id };
  }
  return null;
}

// The walkable "seat" tiles ringing a table (where diners stand to eat).
function tableSeats(w: World, t: Structure): number[] {
  const seats = new Set<number>();
  for (const c of t.cells) {
    const x = c % w.w, y = (c / w.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx, ny = y + dy;
      if (!inBounds(w, nx, ny)) continue;
      const ci = idx(w, nx, ny);
      const cc = w.cells[ci];
      if ((cc.type === "floor" || cc.type === "door") && cc.structureId < 0) seats.add(ci);
    }
  }
  return [...seats];
}

// Find a Mess Table stocked with this diner's food line and a reachable free seat.
function claimTableSeat(w: World, a: Agent, start: number, diet: string): { id: number; cell: number; path: number[] } | null {
  const tables = Object.values(w.structures).filter((s) => s.kind === "table" && s.inBuf > 0 && s.recipe === diet);
  tables.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const t of tables) {
    const seats = tableSeats(w, t).sort((p, q) => manhattan(w, start, p) - manhattan(w, start, q));
    for (const seat of seats) {
      if (!nativeAt(w, a, seat) && a.suit < VENTURE_SUIT) continue;
      const path = findPath(w, start, seat);
      if (path) return { id: t.id, cell: seat, path };
    }
  }
  return null;
}

// A table-restock job: carry a meal from storage (or a Synth) to a Mess Table.
function claimRestock(w: World, a: Agent, start: number): { target: number; path: number[]; good: string; table: number } | null {
  const tables = Object.values(w.structures).filter((s) => s.kind === "table");
  if (!tables.length) return null;
  const diets = new Set<string>();
  for (const id in w.agents) { const o = w.agents[id]; if (o.alive) diets.add(SPECIES[o.species].diet); }
  const meals = w.stock.meals as unknown as Record<string, number>;
  tables.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const t of tables) {
    let line = "";
    if (t.recipe && diets.has(t.recipe) && (meals[t.recipe] ?? 0) > 0 && t.inBuf < TABLE_CAP) line = t.recipe;
    else if (t.inBuf === 0) { for (const L of diets) if ((meals[L] ?? 0) > 0) { line = L; break; } }
    if (!line) continue;
    const drop = accessCell(w, t);
    if (drop < 0) continue;
    const src = mealSource(w, a, start);
    if (src < 0) continue;
    const toSrc = findPath(w, start, src);
    const toDrop = findPath(w, src, drop);
    if (!toSrc || !toDrop) continue;
    meals[line] -= 1; // reserve from the warehouse
    return { target: drop, path: toSrc.concat(toDrop), good: line, table: t.id };
  }
  return null;
}

// Where a meal is picked up to stage on a table: nearest Storage tile (needs a
// suit — airless), else a Synth's access cell (fresh off the cooker).
function mealSource(w: World, a: Agent, start: number): number {
  if (a.suit >= VENTURE_SUIT) {
    const store: number[] = [];
    for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") store.push(i);
    store.sort((p, q) => manhattan(w, start, p) - manhattan(w, start, q));
    for (const c of store) if (findPath(w, start, c)) return c;
  }
  const synths = Object.values(w.structures).filter((s) => s.kind === "synth");
  synths.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const s of synths) { const ac = accessCell(w, s); if (ac >= 0 && findPath(w, start, ac)) return ac; }
  return -1;
}

// A feedstock-delivery job: carry a Synth's input from a Storage tile to the Synth
// so it can cook (the visible "out of storage to prepare meals"). Needs storage to
// exist + a charged suit (the deck is airless); reserves one unit from the warehouse.
const SYNTH_FEED: Record<string, string> = { rations: "biomass", fungal: "spores", protein: "microbes", exotic: "microbes" };
function claimFeed(w: World, a: Agent, start: number): { target: number; path: number[]; good: string; synth: number } | null {
  if (a.suit < VENTURE_SUIT) return null; // the storage deck is airless
  const stock = w.stock as unknown as Record<string, number>;
  const synths = Object.values(w.structures).filter((s) => s.kind === "synth" && s.powered && s.inBuf < FEED_CAP);
  synths.sort((p, q) => manhattan(w, start, p.cell) - manhattan(w, start, q.cell));
  for (const s of synths) {
    const base = SYNTH_FEED[s.recipe] ?? "biomass";
    if ((stock[base] ?? 0) < 1) continue;
    const drop = accessCell(w, s);
    if (drop < 0) continue;
    const store: number[] = [];
    for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") store.push(i);
    store.sort((p, q) => manhattan(w, start, p) - manhattan(w, start, q));
    let src = -1, toSrc: number[] | null = null;
    for (const c of store) { const p = findPath(w, start, c); if (p) { src = c; toSrc = p; break; } }
    if (src < 0 || !toSrc) return null; // no storage to fetch from — Synth falls back to stock
    const toDrop = findPath(w, src, drop);
    if (!toDrop) continue;
    stock[base] -= 1; // reserve from the warehouse
    return { target: drop, path: toSrc.concat(toDrop), good: base, synth: s.id };
  }
  return null;
}

// Where to drop a hauled good: the nearest reachable Storage tile (airless — needs
// a charged suit), else the nearest free floor cell in the producer's own room.
function pickHaulDest(w: World, a: Agent, from: number, src: Structure): number {
  if (a.suit >= VENTURE_SUIT) {
    const store: number[] = [];
    for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") store.push(i);
    store.sort((p, q) => manhattan(w, from, p) - manhattan(w, from, q));
    for (const c of store) if (findPath(w, from, c)) return c;
  }
  const ac = accessCell(w, src); // use the walkable side (a Bay's anchor is a wall cell)
  const room = ac >= 0 ? w.cells[ac].roomId : w.cells[src.cell].roomId;
  const floor: number[] = [];
  for (let i = 0; i < w.cells.length; i++) {
    const c = w.cells[i];
    if (c.type === "floor" && c.roomId === room && c.structureId < 0) floor.push(i);
  }
  floor.sort((p, q) => manhattan(w, from, p) - manhattan(w, from, q));
  for (const c of floor) if (findPath(w, from, c)) return c;
  return -1;
}

// Is there worn machinery this resident can't currently see (so it's worth a
// patrol to go look for it)? Keeps idle crew still when everything's healthy.
function hasUnseenWork(w: World, a: Agent): boolean {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (
      STRUCTURES[s.kind].draw > 0 &&
      s.condition < SERVICE_THRESHOLD &&
      (s.servicedBy < 0 || s.servicedBy === a.id) &&
      !canSee(w, a, s.cell)
    )
      return true;
  }
  return false;
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
  // a dropped haul shouldn't vanish the unit — bank it back in the warehouse
  if (a.task && a.task.type === "haul" && a.task.good) {
    const g = a.task.good;
    if (g === "rations" || g === "fungal" || g === "protein" || g === "exotic") {
      const meals = w.stock.meals as unknown as Record<string, number>;
      meals[g] = (meals[g] ?? 0) + 1;
    } else {
      const stock = w.stock as unknown as Record<string, number>;
      stock[g] = (stock[g] ?? 0) + 1;
    }
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
  // only bunks prepped for this species that it can actually breathe at
  const bunks = Object.values(w.structures).filter(
    (s) => s.kind === kind && s.occupantId < 0 && s.recipe === a.species && nativeAt(w, a, s.cell),
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
      (s.servicedBy < 0 || s.servicedBy === a.id) &&
      canSee(w, a, s.cell), // they only fix faults they can actually see
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
