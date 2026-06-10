import { Species, World } from "./types";
import { RELATIONS } from "./relations";

// Room harmony: how the species currently sharing a room get along. Drives a
// productivity multiplier (work/production) and a mood term — compatible
// neighbours synergize, rivals create friction. Run after atmosphere (rooms
// exist) and reads current agent positions.
export function harmonySystem(w: World): void {
  const byRoom: Record<number, Species[]> = {};
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    const rid = w.cells[a.cell].roomId;
    if (rid < 0) continue;
    (byRoom[rid] ||= []).push(a.species);
  }
  for (const rid in w.rooms) w.rooms[rid].harmony = 0;
  for (const key in byRoom) {
    const sp = byRoom[key];
    if (sp.length < 2 || !w.rooms[key]) continue;
    let sum = 0;
    let n = 0;
    for (let i = 0; i < sp.length; i++)
      for (let j = i + 1; j < sp.length; j++) {
        sum += (RELATIONS[sp[i]][sp[j]] + RELATIONS[sp[j]][sp[i]]) / 2;
        n++;
      }
    w.rooms[key].harmony = Math.max(-1, Math.min(1, sum / n / 15));
  }
}

// Work/production multiplier for a room's harmony (0.6 .. 1.4).
export function productivity(harmony: number): number {
  return Math.max(0.6, Math.min(1.4, 1 + harmony * 0.4));
}
