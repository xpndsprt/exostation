import { StructureKind, World } from "./types";

// Tech unlocks bought with credits at a powered Research Lab. They gate the
// optional/advanced content so the roster and systems become a progression
// instead of being available all at once. Starter modules stay unlocked.
export interface UnlockDef {
  id: string;
  label: string;
  desc: string;
  cost: number; // credits
  labs: number; // number of powered Research Labs required to research it
  tool?: StructureKind; // build tool this enables (if any)
}

export const UNLOCKS: UnlockDef[] = [
  // --- Tier 1: early expansion (1 Lab) ---
  { id: "powerstorage", label: "Energy Storage", desc: "Build Battery Banks to buffer power for spikes and the dark side.", cost: 100, labs: 1, tool: "battery" },
  { id: "recreation", label: "Recreation", desc: "Build Lounges where crew and guests relax and socialize.", cost: 120, labs: 1, tool: "rec" },
  { id: "robotics", label: "Robotics", desc: "Build Bot Bays — each comes with a mining drone for the minerals economy.", cost: 150, labs: 1, tool: "bay" },
  { id: "commerce", label: "Commerce", desc: "Build a Trade Hub so traders buy your minerals for credits.", cost: 150, labs: 1, tool: "tradehub" },
  // --- Tier 2: species & infrastructure (2 Labs) ---
  { id: "logistics", label: "Cargo Logistics", desc: "Build Storage Silos that raise every resource cap.", cost: 250, labs: 2, tool: "silo" },
  { id: "fungal", label: "Fungal Synthesis", desc: "Set Vats to Spores and Synths to Fungal Mash — the food chain for Vry'l.", cost: 300, labs: 2 },
  { id: "methane", label: "Methane Life-Support", desc: "Build Methane Generators — a sealed CH₄ wing lets you host Thol.", cost: 350, labs: 2, tool: "ch4gen" },
  { id: "security", label: "Station Security", desc: "Build Turrets that shoot down raiders before they wreck your modules.", cost: 500, labs: 2, tool: "turret" },
  // --- Tier 3: heavy industry (3 Labs) ---
  { id: "fusion", label: "Fusion Power", desc: "Build a Fusion Reactor (+150 PU; burns minerals).", cost: 600, labs: 3, tool: "fusion" },
  { id: "bulktrade", label: "Bulk Trade", desc: "Build a Cargo Exchange — bigger, faster mineral trades at better prices.", cost: 600, labs: 3, tool: "cargoex" },
  { id: "cybernetics", label: "Cybernetics", desc: "Build an AI Core — +25% to all production, repair and mining.", cost: 800, labs: 3, tool: "aicore" },
  // --- Tier 4: the Sector Beacon — one signature module per species (3 Labs) ---
  { id: "cmdhub", label: "Command Hub", desc: "Human signature module: a station-wide mood lift while a Human staffs it. Charges the Beacon.", cost: 700, labs: 3, tool: "cmdhub" },
  { id: "tradenexus", label: "Trade Nexus", desc: "Drenn signature module: +50% trade income while a Drenn is aboard. Charges the Beacon.", cost: 700, labs: 3, tool: "tradenexus" },
  { id: "autoforge", label: "Auto-Forge", desc: "Thol signature module: passively repairs every module while a Thol is aboard. Charges the Beacon.", cost: 700, labs: 3, tool: "autoforge" },
  { id: "bloomgarden", label: "Bloom Garden", desc: "Vry'l signature module: +50% food production while a Vry'l is aboard. Charges the Beacon.", cost: 700, labs: 3, tool: "bloomgarden" },
  { id: "orerefinery", label: "Ore Refinery", desc: "Korro signature module: +50% mining yield while a Korro is aboard. Charges the Beacon.", cost: 700, labs: 3, tool: "orerefinery" },
];

export function isUnlocked(w: World, id: string): boolean {
  return !!w.unlocked[id];
}

// The unlock that gates a build tool, if it is gated and not yet owned.
export function toolLock(w: World, tool: string): UnlockDef | null {
  for (const u of UNLOCKS) if (u.tool === tool && !isUnlocked(w, u.id)) return u;
  return null;
}

// How many powered Research Labs the station is running.
export function poweredLabCount(w: World): number {
  let n = 0;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "lab" && s.powered) n++;
  }
  return n;
}

export function hasPoweredLab(w: World): boolean {
  return poweredLabCount(w) >= 1;
}

// Returns true if the unlock was purchased this call.
export function buyUnlock(w: World, id: string): boolean {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u || isUnlocked(w, id)) return false;
  if (poweredLabCount(w) < u.labs) return false;
  if (w.credits < u.cost) return false;
  w.credits -= u.cost;
  w.unlocked[id] = true;
  return true;
}
