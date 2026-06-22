// Boarding raiders: a "raiding party" that storms in through a raided dock and
// rampages INSIDE the station — smashing modules and attacking crew until the
// crew/turrets put them down or they withdraw to their ship. Modeled on the
// spider/pest behavior (mobile hostiles the crew fight), but human and brutal.

import { Agent, Boarder, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES, isDock } from "./structures";
import { eraseAt, inBounds, idx } from "./world";

const ADJ = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
export const BOARDER_HEALTH = 70;
export const BOARDER_SPEED = 2.0; // cells/s as it storms the station
export const BOARDER_ATTACK = 8; // crew health/s at melee
export const BOARDER_SMASH = 18; // module condition/s when next to a machine
const CREW_DMG = 0.6; // boarder health/s per point of nearby crew power
const HUNT_RANGE = 2; // crew within this many tiles fight a boarder
const TURRET_DMG = 38; // a powered Turret's covering fire, health/s to each boarder
const FIGHT_RANGE = 3; // a boarder this close to crew turns to fight them

const manh = (w: World, a: number, b: number): number =>
  Math.abs((a % w.w) - (b % w.w)) + Math.abs(((a / w.w) | 0) - ((b / w.w) | 0));
const walkable = (w: World, i: number): boolean => {
  const t = w.cells[i]?.type;
  return t === "floor" || t === "door";
};
function stepToward(w: World, from: number, target: number): number {
  let best = from, bestd = manh(w, from, target);
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

// Where a boarding party climbs aboard: a floor cell just inside a raided dock.
function boardingEntry(w: World): number {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!isDock(s.kind)) continue;
    for (const c of s.cells) {
      const x = c % w.w, y = (c / w.w) | 0;
      for (const [dx, dy] of ADJ) {
        const nx = x + dx, ny = y + dy;
        if (inBounds(w, nx, ny) && w.cells[idx(w, nx, ny)].type === "floor") return idx(w, nx, ny);
      }
    }
  }
  return -1;
}

// Spawn a boarding party of `count` raiders at a raided dock. Returns how many
// actually got aboard (0 if there's no interior to board into).
export function spawnBoardingParty(w: World, count: number, lifetime: number): number {
  const entry = boardingEntry(w);
  if (entry < 0) return 0;
  for (let i = 0; i < count; i++)
    w.boarders.push({ id: w.nextId++, cell: entry, health: BOARDER_HEALTH, moveAcc: 0, t: lifetime });
  w.notify.push(`A raiding party of ${count} stormed aboard — repel them!`);
  return count;
}

function smash(w: World, b: Boarder, dt: number): boolean {
  const x = b.cell % w.w, y = (b.cell / w.w) | 0;
  const cells = [b.cell];
  for (const [dx, dy] of ADJ) {
    const nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < w.w && ny < w.h) cells.push(ny * w.w + nx);
  }
  for (const ci of cells) {
    const sid = w.cells[ci].structureId;
    if (sid < 0) continue;
    const s = w.structures[sid];
    if (s && STRUCTURES[s.kind].draw > 0 && s.condition > 0) {
      s.condition = Math.max(0, s.condition - BOARDER_SMASH * dt);
      if (s.condition <= 0) {
        const label = STRUCTURES[s.kind].label;
        eraseAt(w, s.cell % w.w, (s.cell / w.w) | 0);
        w.notify.push(`Boarders smashed your ${label}!`);
      }
      return true;
    }
  }
  return false;
}

export function boardingSystem(w: World, dt: number): void {
  if (!w.boarders.length) return;
  const folk = Object.values(w.agents).filter((a) => a.alive);
  let turret = false;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "turret" && s.powered) { turret = true; break; }
  }
  const dead: number[] = [];
  const left: number[] = [];
  for (const b of w.boarders) {
    b.t -= dt;
    if (b.t <= 0) { left.push(b.id); continue; } // withdrew to the ship

    // nearest crew (prey) and nearest live module (target to wreck)
    let prey: Agent | null = null, pd = Infinity;
    for (const a of folk) { const d = manh(w, b.cell, a.cell); if (d < pd) { pd = d; prey = a; } }
    let mod = -1, md = Infinity;
    for (const id in w.structures) {
      const s = w.structures[id];
      if (STRUCTURES[s.kind].draw > 0 && s.condition > 0) { const d = manh(w, b.cell, s.cell); if (d < md) { md = d; mod = s.cell; } }
    }
    // fight crew if they're close, otherwise march on the nearest machine
    const goal = prey && pd <= FIGHT_RANGE ? prey.cell : mod >= 0 ? mod : prey ? prey.cell : b.cell;
    b.moveAcc += BOARDER_SPEED * dt;
    while (b.moveAcc >= 1) { b.moveAcc -= 1; b.cell = stepToward(w, b.cell, goal); }

    // melee the nearest crew
    if (prey && manh(w, b.cell, prey.cell) <= 1) {
      prey.fighting = true;
      prey.health -= BOARDER_ATTACK * dt;
      if (prey.health <= 0 && prey.alive) killAgent(w, prey);
    }
    // smash an adjacent module
    smash(w, b, dt);

    // crew within range fight back; a powered Turret lays down covering fire
    let incoming = turret ? TURRET_DMG : 0;
    for (const a of folk) {
      if (manh(w, b.cell, a.cell) > HUNT_RANGE) continue;
      incoming += SPECIES[a.species].power * CREW_DMG;
      a.fighting = true;
    }
    b.health -= incoming * dt;
    if (b.health <= 0) dead.push(b.id);
  }
  if (dead.length || left.length) {
    const gone = new Set([...dead, ...left]);
    w.boarders = w.boarders.filter((b) => !gone.has(b.id));
    if (dead.length) w.notify.push(`The crew cut down ${dead.length} boarder${dead.length === 1 ? "" : "s"}.`);
    if (left.length && !dead.length) w.notify.push("The raiding party withdrew.");
  }
}
