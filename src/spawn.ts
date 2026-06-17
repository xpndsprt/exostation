import { Agent, Egg, Pest, Species, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";
import { addAgent } from "./world";

// ---- Reproduction & vermin ----------------------------------------------------
// A contented species (high average mood, several members aboard) periodically
// asks — through a paused dialog — to lay a clutch of eggs in your empty floor
// space, paying credits for the privilege. Accept and the clutch incubates; after
// "a few months" it hatches into a mix of new younglings (joining the crew) and
// "spiders": hostile vermin that roam, bite crew and gnaw modules until the crew
// (the parent species hunting hardest) cut them down.

// reproduction offer
export const BREED_FIRST = 120; // s — no offer before this
export const BREED_INTERVAL = 90; // s — between offer rolls
export const BREED_RETRY = 12; // s — recheck sooner when nobody is ready
export const BREED_MOOD = 70; // species avg mood needed to want to breed
export const BREED_MIN = 2; // minimum living residents of a species to breed
export const BREED_REWARD = 1000; // credits the species offers for your blessing
export const EGG_MIN = 4; // smallest clutch
export const EGG_MAX = 7; // largest clutch

// egg / hatch
export const EGG_INCUBATE = 60; // s to hatch (~a few months in sim time)
export const SPIDER_CHANCE = 0.5; // per egg: chance it hatches a spider, not young

// pest (spider)
export const PEST_HEALTH = 40;
export const PEST_SPEED = 2.2; // cells/s as it stalks the crew
export const PEST_BITE = 5; // crew health/s a spider bites at melee
export const PEST_GNAW = 10; // module condition/s a spider gnaws when no crew near
export const HUNT_RANGE = 2; // tiles within which crew cut a spider down
export const HUNT_DMG = 0.5; // pest health/s per point of nearby crew power
export const PARENT_HUNT = 1.8; // the clutch's own species hunt their spawn harder

const ADJ = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const manh = (w: World, a: number, b: number): number =>
  Math.abs((a % w.w) - (b % w.w)) + Math.abs(((a / w.w) | 0) - ((b / w.w) | 0));
const walkable = (w: World, i: number): boolean => {
  const t = w.cells[i]?.type;
  return t === "floor" || t === "door";
};

export function spawnSystem(w: World, dt: number): void {
  hatchEggs(w, dt);
  pestStep(w, dt);
  breedRoll(w, dt);
}

// --- eggs incubate, then hatch into young + spiders ---
function hatchEggs(w: World, dt: number): void {
  if (!w.eggs.length) return;
  const keep: Egg[] = [];
  const due: Egg[] = [];
  for (const e of w.eggs) {
    e.t -= dt;
    (e.t <= 0 ? due : keep).push(e);
  }
  w.eggs = keep;
  if (!due.length) return;
  const tally: Partial<Record<Species, { young: number; spiders: number }>> = {};
  for (const e of due) {
    const t = (tally[e.species] ??= { young: 0, spiders: 0 });
    const x = e.cell % w.w, y = (e.cell / w.w) | 0;
    const asYoung = Math.random() >= SPIDER_CHANCE && w.cells[e.cell]?.type === "floor";
    if (asYoung && addAgent(w, x, y, e.species, false)) {
      t.young++;
    } else {
      w.pests.push({ id: w.nextId++, species: e.species, cell: e.cell, health: PEST_HEALTH, moveAcc: 0 });
      t.spiders++;
    }
  }
  for (const sp in tally) {
    const t = tally[sp as Species]!;
    const label = SPECIES[sp as Species].label;
    w.notify.push(
      `A ${label} clutch hatches — ${t.young} young and ${t.spiders} spider${t.spiders === 1 ? "" : "s"}! The crew move to cull the vermin.`,
    );
  }
}

// --- spiders stalk the crew; the crew hunt them down ---
function pestStep(w: World, dt: number): void {
  if (!w.pests.length) return;
  const folk = Object.values(w.agents).filter((a) => a.alive);
  const dead: number[] = [];
  for (const p of w.pests) {
    // pick the nearest living person as prey
    let prey: Agent | null = null;
    let bd = Infinity;
    for (const a of folk) {
      const d = manh(w, p.cell, a.cell);
      if (d < bd) { bd = d; prey = a; }
    }
    // stalk (or wander when the station is empty of crew)
    p.moveAcc += PEST_SPEED * dt;
    while (p.moveAcc >= 1) {
      p.moveAcc -= 1;
      p.cell = prey ? stepToward(w, p.cell, prey.cell) : wanderStep(w, p.cell);
    }
    // nearby crew cut it down (parent species hunt their spawn hardest); a spider
    // at melee bites back, and can kill.
    let incoming = 0;
    for (const a of folk) {
      const d = manh(w, p.cell, a.cell);
      if (d > HUNT_RANGE) continue;
      incoming += SPECIES[a.species].power * HUNT_DMG * (a.species === p.species ? PARENT_HUNT : 1);
      a.fighting = true;
      if (d <= 1) {
        a.health -= PEST_BITE * dt;
        if (a.health <= 0 && a.alive) killAgent(w, a);
      }
    }
    p.health -= incoming * dt;
    if (p.health <= 0) { dead.push(p.id); continue; }
    // unmolested, it gnaws on the nearest machine
    if (bd > HUNT_RANGE) gnaw(w, p, dt);
  }
  if (dead.length) {
    w.pests = w.pests.filter((p) => !dead.includes(p.id));
    w.notify.push(`The crew put down ${dead.length} spider${dead.length === 1 ? "" : "s"}.`);
  }
}

function gnaw(w: World, p: Pest, dt: number): void {
  const x = p.cell % w.w, y = (p.cell / w.w) | 0;
  const cells = [p.cell];
  for (const [dx, dy] of ADJ) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w.w && ny < w.h) cells.push(ny * w.w + nx);
  }
  for (const ci of cells) {
    const sid = w.cells[ci].structureId;
    if (sid < 0) continue;
    const s = w.structures[sid];
    if (s && STRUCTURES[s.kind].draw > 0) {
      s.condition = Math.max(0, s.condition - PEST_GNAW * dt);
      return;
    }
  }
}

function stepToward(w: World, from: number, target: number): number {
  let best = from;
  let bestd = manh(w, from, target);
  const x = from % w.w, y = (from / w.w) | 0;
  for (const [dx, dy] of ADJ) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
    const ni = ny * w.w + nx;
    if (!walkable(w, ni)) continue;
    const d = manh(w, ni, target);
    if (d < bestd) { bestd = d; best = ni; }
  }
  return best;
}

function wanderStep(w: World, from: number): number {
  const x = from % w.w, y = (from / w.w) | 0;
  const opts: number[] = [];
  for (const [dx, dy] of ADJ) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
    const ni = ny * w.w + nx;
    if (walkable(w, ni)) opts.push(ni);
  }
  return opts.length ? opts[Math.floor(Math.random() * opts.length)] : from;
}

function killAgent(w: World, a: Agent): void {
  a.alive = false;
  a.task = null;
  a.path = [];
  a.moveAcc = 0;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.occupantId === a.id) s.occupantId = -1;
    if (s.servicedBy === a.id) s.servicedBy = -1;
  }
}

// --- reproduction offer ---
function breedRoll(w: World, dt: number): void {
  if (w.breedOffer) return; // a clutch offer is already awaiting the player
  if (w.tick < BREED_FIRST * 10) return;
  w.breedTimer += dt;
  if (w.breedTimer < BREED_INTERVAL) return;
  const sp = breedCandidate(w);
  const room = emptyFloorCells(w).length;
  if (!sp || room < 2) {
    w.breedTimer = BREED_INTERVAL - BREED_RETRY; // not ready / no room — recheck soon
    return;
  }
  w.breedTimer = 0;
  const want = EGG_MIN + Math.floor(Math.random() * (EGG_MAX - EGG_MIN + 1));
  w.breedOffer = { species: sp, eggs: Math.min(want, room), reward: BREED_REWARD };
}

// A species ready to breed: at least BREED_MIN living residents, content on average.
function breedCandidate(w: World): Species | null {
  const sum: Partial<Record<Species, { m: number; n: number }>> = {};
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive || a.guest) continue;
    const e = (sum[a.species] ??= { m: 0, n: 0 });
    e.m += a.mood;
    e.n++;
  }
  const ready: Species[] = [];
  for (const sp in sum) {
    const e = sum[sp as Species]!;
    if (e.n >= BREED_MIN && e.m / e.n >= BREED_MOOD) ready.push(sp as Species);
  }
  return ready.length ? ready[Math.floor(Math.random() * ready.length)] : null;
}

// Empty interior floor: a floor cell with no module and nobody/nothing on it.
function emptyFloorCells(w: World): number[] {
  const occ = new Set<number>();
  for (const id in w.agents) if (w.agents[id].alive) occ.add(w.agents[id].cell);
  for (const e of w.eggs) occ.add(e.cell);
  for (const p of w.pests) occ.add(p.cell);
  const out: number[] = [];
  for (let i = 0; i < w.cells.length; i++) {
    const c = w.cells[i];
    if (c.type === "floor" && c.structureId < 0 && !occ.has(i)) out.push(i);
  }
  return out;
}

// Player's answer to a clutch offer (off the sim tick → Math.random is fine).
export function resolveBreed(w: World, accept: boolean): string {
  const off = w.breedOffer;
  w.breedOffer = null;
  if (!off) return "";
  const label = SPECIES[off.species].label;
  if (!accept) {
    const cur = w.reputation[off.species] ?? 50;
    w.reputation[off.species] = Math.max(0, cur - 8);
    for (const id in w.agents) {
      const a = w.agents[id];
      if (a.alive && a.species === off.species) a.mood = Math.max(0, a.mood - 10);
    }
    return `You denied the ${label} their clutch. They are disheartened.`;
  }
  // lay the clutch on empty floor, clustered near their own kind
  const members = Object.values(w.agents).filter((a) => a.alive && a.species === off.species).map((a) => a.cell);
  const cells = emptyFloorCells(w).sort((p, q) => nearestDist(w, p, members) - nearestDist(w, q, members));
  const n = Math.min(off.eggs, cells.length);
  for (let i = 0; i < n; i++) w.eggs.push({ id: w.nextId++, species: off.species, cell: cells[i], t: EGG_INCUBATE });
  w.credits += off.reward;
  return `The ${label} lay a clutch of ${n} eggs and pay ¢${off.reward}. They'll hatch before long…`;
}

function nearestDist(w: World, cell: number, members: number[]): number {
  let b = Infinity;
  for (const m of members) { const d = manh(w, cell, m); if (d < b) b = d; }
  return b === Infinity ? 0 : b;
}
