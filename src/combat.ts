import { World } from "./types";
import { RELATIONS } from "./relations";
import { SPECIES } from "./species";
import { eraseAt } from "./world";

const ANGRY = 30; // mood below which resentment festers
const PROXIMITY = 4; // tiles that count as "living next to"
const FIGHT_RANGE = 2; // tiles within which blows land
const TENSION_RISE = 12; // per second while angry near a disliked neighbor (fast)
const FRICTION_RISE = 4; // per second in a chronically tense room — fires even when fed (slow burn)
const ROOM_TENSE = -0.3; // room harmony below this counts as chronic friction
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
    // Tension builds from a disliked neighbor either way: fast when morale has
    // cratered, or a slow burn from a chronically tense room even if everyone is
    // fed — so forcing rivals to cohabit eventually erupts. Separation stops it.
    const rid = w.cells[a.cell].roomId;
    const roomTense = rid >= 0 && w.rooms[rid] ? w.rooms[rid].harmony < ROOM_TENSE : false;
    let rise = 0;
    if (hostileNear) rise = a.mood < ANGRY ? TENSION_RISE : roomTense ? FRICTION_RISE : 0;
    if (rise > 0) a.tension = Math.min(100, a.tension + rise * dt);
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
