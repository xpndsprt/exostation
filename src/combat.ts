import { World } from "./types";
import { RELATIONS } from "./relations";
import { SPECIES } from "./species";
import { eraseAt } from "./world";

const ANGRY = 30; // mood below which resentment festers
const PROXIMITY = 4; // tiles that count as "living next to"
const FIGHT_RANGE = 2; // tiles within which blows land
const TENSION_RISE = 12; // per second while angry near a disliked neighbor
const TENSION_FALL = 15; // per second otherwise
const DMG = 0.4; // health lost per second = attacker power * DMG

function manh(w: World, a: number, b: number): number {
  return Math.abs((a % w.w) - (b % w.w)) + Math.abs(((a / w.w) | 0) - ((b / w.w) | 0));
}

// When architecture fails (bad mood + forced proximity to a disliked species),
// tension builds into a skirmish. Attacks are one-sided by relation (you strike
// who *you* resent). Deaths can wreck a module in the room — venting it.
export function combatSystem(w: World, dt: number): void {
  const agents = Object.values(w.agents).filter((a) => a.alive);
  for (const a of agents) a.fighting = false;

  // 1) tension
  for (const a of agents) {
    let hostileNear = false;
    for (const o of agents) {
      if (o === a) continue;
      if (RELATIONS[a.species][o.species] < 0 && manh(w, a.cell, o.cell) <= PROXIMITY) {
        hostileNear = true;
        break;
      }
    }
    if (a.mood < ANGRY && hostileNear) a.tension = Math.min(100, a.tension + TENSION_RISE * dt);
    else a.tension = Math.max(0, a.tension - TENSION_FALL * dt);
  }

  // 2) fights
  const deaths: number[] = [];
  for (const a of agents) {
    if (!a.alive || a.tension < 100) continue;
    let target = null;
    let best = Infinity;
    for (const o of agents) {
      if (o === a || !o.alive) continue;
      if (RELATIONS[a.species][o.species] >= 0) continue;
      const d = manh(w, a.cell, o.cell);
      if (d <= FIGHT_RANGE && d < best) {
        best = d;
        target = o;
      }
    }
    if (!target) continue;
    a.fighting = true;
    target.health -= SPECIES[a.species].power * DMG * dt;
    a.mood = Math.max(0, a.mood - 5 * dt);
    if (target.health <= 0 && target.alive) {
      target.alive = false;
      a.tension = 0;
      deaths.push(target.cell);
    }
  }

  // 3) collateral — a death wrecks the first module in its room (may vent it)
  for (const cell of deaths) {
    const rid = w.cells[cell].roomId;
    if (rid < 0) continue;
    for (const id in w.structures) {
      const s = w.structures[id];
      if (w.cells[s.cell].roomId === rid) {
        eraseAt(w, s.cell % w.w, (s.cell / w.w) | 0);
        break;
      }
    }
  }
}
