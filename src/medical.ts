import { World } from "./types";

// Injuries (from skirmishes and bad encounter outcomes) heal at a powered Med Bay
// and bleed out without one. A wounded crew member is on a clock: build medical
// care, or they slowly die. Run after combat (which inflicts wounds).
const HEAL_RATE = 6; // health/s restored while a powered Med Bay is online
const BLEED_RATE = 0.5; // health/s lost while injured with NO Med Bay (~2 min from a fresh wound)

export function medicalSystem(w: World, dt: number): void {
  let medbay = false;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "medbay" && s.powered) {
      medbay = true;
      break;
    }
  }
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive || !a.injured) continue;
    if (medbay) {
      a.health = Math.min(100, a.health + HEAL_RATE * dt);
      if (a.health >= 100) {
        a.injured = false;
        w.notify.push(`A ${a.species} recovered in the Med Bay.`);
      }
    } else {
      a.health -= BLEED_RATE * dt;
      if (a.health <= 0) {
        a.alive = false;
        a.injured = false;
        w.notify.push(`A wounded ${a.species} died — no Med Bay to treat them.`);
      }
    }
  }
}

// Mark an agent wounded and knock its health down (used by encounters/combat).
export function injure(w: World, id: number, severity = 45): void {
  const a = w.agents[id];
  if (!a || !a.alive) return;
  a.injured = true;
  a.health = Math.max(1, Math.min(a.health, 100 - severity));
}
