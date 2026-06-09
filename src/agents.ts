import { World } from "./types";

const O2_DECAY = 8; // per second in vacuum/unbreathable air
const O2_RECOVER = 15; // per second in breathable air

// MVP M3: agents don't move yet (pathfinding is M4). They breathe based on the
// room they're standing in: recover O₂ in breathable air, lose it otherwise,
// and suffocate at zero.
export function agentSystem(w: World, dt: number): void {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    const c = w.cells[a.cell];
    const room = c.roomId >= 0 ? w.rooms[c.roomId] : undefined;
    const breathable = !!room && room.breathable;
    if (breathable) {
      a.o2 = Math.min(100, a.o2 + O2_RECOVER * dt);
    } else {
      a.o2 = Math.max(0, a.o2 - O2_DECAY * dt);
      if (a.o2 <= 0) a.alive = false;
    }
  }
}
