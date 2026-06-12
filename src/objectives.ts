import { Species, World } from "./types";

// Scenario goals, completed in order. Each reports a current value toward its
// target; reaching the target advances to the next. Clearing the list wins.
export interface ObjectiveDef {
  id: string;
  label: string;
  target: number;
  unit?: string; // shown after the numbers (e.g. "¢")
  progress: (w: World) => number;
}

function residentCount(w: World): number {
  let n = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && !a.guest) n++;
  }
  return n;
}

function distinctAliveSpecies(w: World): number {
  const s = new Set<Species>();
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive) s.add(a.species);
  }
  return s.size;
}

export const OBJECTIVES: ObjectiveDef[] = [
  { id: "grow", label: "Grow your crew", target: 3, progress: residentCount },
  { id: "bank", label: "Bank credits", target: 3000, unit: "¢", progress: (w) => Math.floor(w.credits) },
  { id: "diverse", label: "Host different species aboard", target: 4, progress: distinctAliveSpecies },
];

export function currentObjective(w: World): ObjectiveDef | null {
  return w.objectiveIx < OBJECTIVES.length ? OBJECTIVES[w.objectiveIx] : null;
}

// Can the station currently attract a new resident? Mirrors the immigration
// gates in economy.ts: a powered dock, a bunk in breathable air, and meals for
// a species that breathes that air. Used to decide an unrecoverable defeat.
function canAttractCrew(w: World): boolean {
  let dockPowered = false;
  const podGases = new Set<string>();
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "dock" && s.powered) dockPowered = true;
    else if (s.kind === "pod") {
      const rid = w.cells[s.cell].roomId;
      const g = rid >= 0 ? w.rooms[rid]?.gas : undefined;
      if (g && g !== "none" && g !== "mixed") podGases.add(g);
    }
  }
  if (!dockPowered) return false;
  const m = w.stock.meals;
  const fed = (g: string) => (g === "o2" ? m.rations > 0 || m.fungal > 0 : g === "ch4" ? m.rations > 0 : false);
  return [...podGases].some(fed);
}

const LOSE_GRACE = 20; // seconds a dead, unrecoverable station survives before defeat

// Advance objectives, declare victory when they're all met, and declare defeat
// when the station has died and can no longer attract crew.
export function objectivesSystem(w: World, dt: number): void {
  if (w.phase !== "playing") return;

  let obj = currentObjective(w);
  while (obj && obj.progress(w) >= obj.target) {
    w.objectiveIx++;
    obj = currentObjective(w);
  }
  if (!obj) {
    w.phase = "won";
    return;
  }

  // Defeat: something has died, no resident crew remain, and the station can't
  // recover. A brief grace period avoids a flicker during a recoverable wipe.
  let deaths = 0;
  let residents = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) deaths++;
    else if (!a.guest) residents++;
  }
  if (deaths > 0 && residents === 0 && !canAttractCrew(w)) {
    w.loseTimer += dt;
    if (w.loseTimer >= LOSE_GRACE) w.phase = "lost";
  } else {
    w.loseTimer = 0;
  }
}
