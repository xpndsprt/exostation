import { Species, StructureKind, World } from "./types";

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
  tools?: StructureKind[]; // extra build tools this same unlock enables (e.g. Heater + Cryo)
  requires?: string[]; // prerequisite unlock ids that must be owned first
  excludes?: string[]; // sibling unlocks that owning this one permanently locks
}

export const UNLOCKS: UnlockDef[] = [
  // --- Tier 1: early expansion (1 Lab) ---
  { id: "powerstorage", label: "Energy Storage", desc: "Build Battery Banks to buffer power for spikes and the dark side.", cost: 100, labs: 1, tool: "battery" },
  { id: "recreation", label: "Recreation", desc: "Build Lounges where crew and guests relax and socialize.", cost: 120, labs: 1, tool: "rec" },
  { id: "robotics", label: "Robotics", desc: "Build Bot Bays — each comes with a mining drone for the minerals economy.", cost: 150, labs: 1, tool: "bay" },
  { id: "commerce", label: "Commerce", desc: "Build a Trade Hub so traders buy your minerals for credits.", cost: 150, labs: 1, tool: "tradehub" },
  { id: "fuelrefining", label: "Fuel Refining", desc: "Build Fuel Refineries that crack minerals into ship fuel — sold to docking ships for credits.", cost: 150, labs: 1, tool: "fuelrefinery" },
  { id: "medicine", label: "Medicine", desc: "Build a Med Bay — wounded crew (from fights or risky repairs) heal there instead of bleeding out.", cost: 200, labs: 1, tool: "medbay" },
  // --- Tier 2: species & infrastructure (2 Labs) ---
  { id: "logistics", label: "Cargo Logistics", desc: "Build Storage Silos that raise every resource cap.", cost: 250, labs: 2, tool: "silo" },
  { id: "fungal", label: "Fungal Synthesis", desc: "Set Vats to Spores and Synths to Fungal Mash — the food chain for Vry'l.", cost: 300, labs: 2 },
  { id: "methane", label: "Methane Life-Support", desc: "Build Methane Generators — a sealed CH₄ wing lets you host Thol.", cost: 350, labs: 2, tool: "ch4gen" },
  { id: "chlorine", label: "Chlorine Life-Support", desc: "Build Chlorine Generators — a sealed Cl₂ wing lets you host the Chlorithe.", cost: 400, labs: 2, tool: "cl2gen" },
  { id: "ammonia", label: "Ammonia Life-Support", desc: "Build Ammonia Generators — a sealed NH₃ wing lets you host the Naaz.", cost: 450, labs: 2, tool: "nh3gen" },
  { id: "hydrogen", label: "Hydrogen Life-Support", desc: "Build Hydrogen Generators — a sealed H₂ wing lets you host the Voltaar.", cost: 500, labs: 2, tool: "h2gen" },
  { id: "climate", label: "Climate Control", desc: "Build Heaters and Cryo Units to warm or chill a wing — keeps heat-loving Voltaar and cold-loving Naaz content.", cost: 300, labs: 2, tool: "heater", tools: ["heater", "cooler"] },
  { id: "exobiology", label: "Exobiology", desc: "Set Vats to Microbes and Synths to Live-Protein or Exo-Culture — the food chains for Sszra and the exotic-gas crews.", cost: 350, labs: 2 },
  { id: "security", label: "Station Security", desc: "Build Turrets that shoot down raiders before they wreck your modules.", cost: 500, labs: 2, tool: "turret" },
  { id: "largedock", label: "Expanded Docking", desc: "Build Large Docks — bigger berths land bigger ships: more guests and more fuel sold.", cost: 350, labs: 2, tool: "docklarge", requires: ["fuelrefining"] },
  { id: "implants", label: "Breathing Implants", desc: "Fit cross-gas lovers with implants so each can breathe the other's air — couples of different gases can finally live and work together.", cost: 400, labs: 2, requires: ["medicine"] },
  // --- Doctrine fork (2 Labs): pick ONE station specialization; it permanently
  // locks the other two. ¢ can no longer buy the whole tree in a single run. ---
  { id: "doc_industry", label: "Industrialist Doctrine", desc: "Specialize: +15% mining, food & repair across the station. Locks the other doctrines.", cost: 400, labs: 2, requires: ["robotics"], excludes: ["doc_hospitality", "doc_garrison"] },
  { id: "doc_hospitality", label: "Hospitality Doctrine", desc: "Specialize: guests pay +50% lodging and arrive faster. Locks the other doctrines.", cost: 400, labs: 2, requires: ["commerce"], excludes: ["doc_industry", "doc_garrison"] },
  { id: "doc_garrison", label: "Garrison Doctrine", desc: "Specialize: raiders deal half damage and can never reach life support. Locks the other doctrines.", cost: 400, labs: 2, requires: ["security"], excludes: ["doc_industry", "doc_hospitality"] },
  // --- Tier 3: heavy industry (3 Labs) — each builds on a Tier-1/2 prerequisite ---
  { id: "fusion", label: "Fusion Power", desc: "Build a Fusion Reactor (+150 PU; burns minerals).", cost: 600, labs: 3, tool: "fusion", requires: ["robotics"] },
  { id: "bulktrade", label: "Bulk Trade", desc: "Build a Cargo Exchange — bigger, faster mineral trades at better prices.", cost: 600, labs: 3, tool: "cargoex", requires: ["commerce"] },
  { id: "cybernetics", label: "Cybernetics", desc: "Build an AI Core — +25% to all production, repair and mining.", cost: 800, labs: 3, tool: "aicore", requires: ["logistics"] },
  { id: "superdock", label: "Spaceport", desc: "Build Spaceport Docks — the largest berths: huge ships, the biggest guest crowds and fuel sales.", cost: 700, labs: 3, tool: "docksuper", requires: ["largedock"] },
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

// Lodging (Crew Quarters / Hotel Rooms) is prepped per-species. Human & Drenn are
// free; every other species' lodging is gated by the research that lets you host
// them anyway, so you can only prep a room for a species you've unlocked.
const LODGING_GATE: Partial<Record<Species, string>> = {
  korro: "robotics",
  vryl: "fungal",
  thol: "methane",
  vorn: "methane",
  chlorithe: "chlorine",
  naaz: "ammonia",
  voltaar: "hydrogen",
  sszra: "exobiology",
};
export function lodgingUnlocked(w: World, sp: Species): boolean {
  const gate = LODGING_GATE[sp];
  return !gate || isUnlocked(w, gate);
}

// Does this unlock enable the given build tool (primary or one of its extras)?
function unlockEnables(u: UnlockDef, tool: string): boolean {
  return u.tool === tool || !!u.tools?.includes(tool as StructureKind);
}

// The unlock that gates a build tool, if it is gated and not yet owned.
export function toolLock(w: World, tool: string): UnlockDef | null {
  for (const u of UNLOCKS) if (unlockEnables(u, tool) && !isUnlocked(w, u.id)) return u;
  return null;
}

// A "high-tier" module is one whose unlock needs 2+ Labs — heavier, more
// dangerous machinery, so servicing it can injure the crew (see agents.ts).
export function highTierModule(kind: StructureKind): boolean {
  const u = UNLOCKS.find((x) => unlockEnables(x, kind));
  return !!u && u.labs >= 2;
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

// Why an unlock can't be bought right now (or { ok: true } if it can). Single
// source of truth for buyUnlock, the tech panel and the toast feedback.
export function canResearch(w: World, u: UnlockDef): { ok: boolean; reason?: string } {
  if (isUnlocked(w, u.id)) return { ok: false, reason: "Already researched." };
  if (poweredLabCount(w) < u.labs) return { ok: false, reason: `Needs ${u.labs} Lab${u.labs > 1 ? "s" : ""}` };
  const missing = (u.requires ?? []).find((r) => !isUnlocked(w, r));
  if (missing) return { ok: false, reason: `Needs ${UNLOCKS.find((x) => x.id === missing)?.label ?? missing}` };
  const chosen = (u.excludes ?? []).find((x) => isUnlocked(w, x));
  if (chosen) return { ok: false, reason: `Locked — chose ${UNLOCKS.find((x) => x.id === chosen)?.label ?? chosen}` };
  if (w.credits < u.cost) return { ok: false, reason: `Need ¢${u.cost}` };
  return { ok: true };
}

// Returns true if the unlock was purchased this call.
export function buyUnlock(w: World, id: string): boolean {
  const u = UNLOCKS.find((x) => x.id === id);
  if (!u || !canResearch(w, u).ok) return false;
  w.credits -= u.cost;
  w.unlocked[id] = true;
  return true;
}

// The chosen station specialization (M40), or null before a doctrine is picked.
export type Doctrine = "industry" | "hospitality" | "garrison";
export function activeDoctrine(w: World): Doctrine | null {
  if (isUnlocked(w, "doc_industry")) return "industry";
  if (isUnlocked(w, "doc_hospitality")) return "hospitality";
  if (isUnlocked(w, "doc_garrison")) return "garrison";
  return null;
}
// Industrialist doctrine: a flat multiplier on mining / food / repair output.
export const INDUSTRY_BOOST = 1.15;
export function industryBoost(w: World): number {
  return activeDoctrine(w) === "industry" ? INDUSTRY_BOOST : 1;
}
