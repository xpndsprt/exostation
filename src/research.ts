import { StructureKind, World } from "./types";

// Tech unlocks bought with credits at a powered Research Lab. They gate the
// optional/advanced content so the roster and systems become a progression
// instead of being available all at once. Starter modules stay unlocked.
export interface UnlockDef {
  id: string;
  label: string;
  desc: string;
  cost: number; // credits
  tool?: StructureKind; // build tool this enables (if any)
}

export const UNLOCKS: UnlockDef[] = [
  // --- early expansion (cheap; build a Lab and these open up) ---
  {
    id: "powerstorage",
    label: "Energy Storage",
    desc: "Build Battery Banks to buffer power for spikes and the dark side.",
    cost: 100,
    tool: "battery",
  },
  {
    id: "recreation",
    label: "Recreation",
    desc: "Build Lounges where crew and guests relax and socialize.",
    cost: 120,
    tool: "rec",
  },
  {
    id: "robotics",
    label: "Robotics",
    desc: "Build Bot Bays — each comes with a mining drone for the minerals economy.",
    cost: 150,
    tool: "bay",
  },
  {
    id: "commerce",
    label: "Commerce",
    desc: "Build a Trade Hub so traders buy your minerals for credits.",
    cost: 150,
    tool: "tradehub",
  },
  {
    id: "methane",
    label: "Methane Life-Support",
    desc: "Build Methane Generators — a sealed CH₄ wing lets you host Thol.",
    cost: 350,
    tool: "ch4gen",
  },
  {
    id: "fungal",
    label: "Fungal Synthesis",
    desc: "Set Vats to Spores and Synths to Fungal Mash — the food chain for Vry'l.",
    cost: 300,
  },
  {
    id: "logistics",
    label: "Cargo Logistics",
    desc: "Build Storage Silos that raise every resource cap.",
    cost: 250,
    tool: "silo",
  },
  {
    id: "security",
    label: "Station Security",
    desc: "Build Turrets that shoot down raiders before they wreck your modules.",
    cost: 500,
    tool: "turret",
  },
  {
    id: "fusion",
    label: "Fusion Power",
    desc: "Build a Fusion Reactor (+150 PU) — one unit powers a whole station.",
    cost: 600,
    tool: "fusion",
  },
  {
    id: "bulktrade",
    label: "Bulk Trade",
    desc: "Build a Cargo Exchange — bigger, faster mineral trades at better prices.",
    cost: 600,
    tool: "cargoex",
  },
  {
    id: "cybernetics",
    label: "Cybernetics",
    desc: "Build an AI Core — +25% to all production, repair and mining.",
    cost: 800,
    tool: "aicore",
  },
];

export function isUnlocked(w: World, id: string): boolean {
  return !!w.unlocked[id];
}

// The unlock that gates a build tool, if it is gated and not yet owned.
export function toolLock(w: World, tool: string): UnlockDef | null {
  for (const u of UNLOCKS) if (u.tool === tool && !isUnlocked(w, u.id)) return u;
  return null;
}

// A powered Research Lab is required to spend credits on tech.
export function hasPoweredLab(w: World): boolean {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "lab" && s.powered) return true;
  }
  return false;
}

// Returns true if the unlock was purchased this call.
export function buyUnlock(w: World, id: string): boolean {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u || isUnlocked(w, id)) return false;
  if (!hasPoweredLab(w)) return false;
  if (w.credits < u.cost) return false;
  w.credits -= u.cost;
  w.unlocked[id] = true;
  return true;
}
