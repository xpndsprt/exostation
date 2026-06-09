import { World } from "./types";
import { RELATIONS } from "./relations";

const PROXIMITY = 4; // Manhattan tiles — "living next to each other"
const SOCIAL_CLAMP = 30;
const RATE = 0.5; // mood easing per second toward its target

// Mood blends need-satisfaction with how an agent feels about nearby neighbors
// (the political web). Drives the tension/skirmish system in M11.
export function moodSystem(w: World, dt: number): void {
  const agents = Object.values(w.agents).filter((a) => a.alive);
  for (const a of agents) {
    const ax = a.cell % w.w;
    const ay = (a.cell / w.w) | 0;
    let social = 0;
    for (const o of agents) {
      if (o === a) continue;
      const ox = o.cell % w.w;
      const oy = (o.cell / w.w) | 0;
      if (Math.abs(ax - ox) + Math.abs(ay - oy) <= PROXIMITY) {
        social += RELATIONS[a.species][o.species];
      }
    }
    social = Math.max(-SOCIAL_CLAMP, Math.min(SOCIAL_CLAMP, social));
    const target = Math.max(
      0,
      Math.min(100, 50 + (a.food - 50) * 0.15 + (a.rest - 50) * 0.15 + (a.fun - 50) * 0.15 + social),
    );
    a.mood += (target - a.mood) * Math.min(1, RATE * dt);
  }
}
