import { GasKind, StructureKind } from "./types";

export interface StructDef {
  label: string;
  color: number;
  gen: number; // power generated (PU)
  draw: number; // power consumed when on (PU)
  battery: number; // storage added (PU)
  priority: number; // higher = shed last in a brownout
  gas?: GasKind; // atmosphere this generator emits (life support)
  w: number; // footprint width (tiles)
  h: number; // footprint height (tiles)
  cost: number; // build cost (credits) — see COSTS.md
}

// MVP subset of the full catalog (see BUILDINGS.md). Solar (wall-mounted, 1x3)
// and dock (wall airlock, 1 cell) have their own placement; w/h there are unused.
// COSTS.md mirrors the `cost` values here (code is the source of truth).
export const STRUCTURES: Record<StructureKind, StructDef> = {
  solar: { label: "Solar Panel", color: 0x3a7bd5, gen: 10, draw: 0, battery: 0, priority: 0, w: 1, h: 1, cost: 60 },
  battery: { label: "Battery", color: 0xd5b13a, gen: 0, draw: 0, battery: 50, priority: 0, w: 1, h: 1, cost: 80 },
  o2gen: { label: "O₂ Generator", color: 0x35c2c2, gen: 0, draw: 6, battery: 0, priority: 10, gas: "o2", w: 2, h: 2, cost: 90 },
  ch4gen: { label: "Methane Gen", color: 0xc98a3a, gen: 0, draw: 9, battery: 0, priority: 10, gas: "ch4", w: 2, h: 2, cost: 140 },
  cl2gen: { label: "Chlorine Gen", color: 0x9bd14a, gen: 0, draw: 10, battery: 0, priority: 10, gas: "cl2", w: 2, h: 2, cost: 170 },
  nh3gen: { label: "Ammonia Gen", color: 0x6a8fd1, gen: 0, draw: 10, battery: 0, priority: 10, gas: "nh3", w: 2, h: 2, cost: 180 },
  h2gen: { label: "Hydrogen Gen", color: 0xd16a9b, gen: 0, draw: 11, battery: 0, priority: 10, gas: "h2", w: 2, h: 2, cost: 190 },
  synth: { label: "Rations Synth", color: 0xcf7a3a, gen: 0, draw: 5, battery: 0, priority: 5, w: 2, h: 1, cost: 70 },
  pod: { label: "Crew Quarters", color: 0x9b6cd5, gen: 0, draw: 1, battery: 0, priority: 2, w: 1, h: 1, cost: 40 },
  vat: { label: "Bio Vat", color: 0x4f9d5b, gen: 0, draw: 6, battery: 0, priority: 4, w: 2, h: 2, cost: 90 },
  bay: { label: "Bot Bay", color: 0x4aa3a3, gen: 0, draw: 4, battery: 0, priority: 3, w: 1, h: 2, cost: 120 },
  dock: { label: "Docking Port", color: 0x5a8ad5, gen: 0, draw: 5, battery: 0, priority: 1, w: 1, h: 1, cost: 150 },
  docklarge: { label: "Large Dock", color: 0x5a8ad5, gen: 0, draw: 8, battery: 0, priority: 1, w: 1, h: 1, cost: 400 },
  docksuper: { label: "Spaceport Dock", color: 0x5a8ad5, gen: 0, draw: 12, battery: 0, priority: 1, w: 1, h: 1, cost: 900 },
  fuelrefinery: { label: "Fuel Refinery", color: 0xe8b24a, gen: 0, draw: 6, battery: 0, priority: 4, w: 2, h: 2, cost: 220 },
  medbay: { label: "Med Bay", color: 0xe8e8f0, gen: 0, draw: 4, battery: 0, priority: 6, w: 2, h: 2, cost: 240 },
  heater: { label: "Heater", color: 0xe8794a, gen: 0, draw: 5, battery: 0, priority: 7, w: 2, h: 2, cost: 130 },
  cooler: { label: "Cryo Unit", color: 0x4ab0e8, gen: 0, draw: 7, battery: 0, priority: 7, w: 2, h: 2, cost: 170 },
  rec: { label: "Lounge", color: 0xc05fa8, gen: 0, draw: 4, battery: 0, priority: 2, w: 2, h: 2, cost: 80 },
  hotel: { label: "Hotel Room", color: 0xc99bd5, gen: 0, draw: 2, battery: 0, priority: 2, w: 2, h: 1, cost: 60 },
  tradehub: { label: "Trade Hub", color: 0x6fcf97, gen: 0, draw: 5, battery: 0, priority: 1, w: 2, h: 2, cost: 120 },
  lab: { label: "Research Lab", color: 0x8a6cf0, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 1, cost: 150 },
  silo: { label: "Storage Silo", color: 0x7c8596, gen: 0, draw: 0, battery: 0, priority: 0, w: 1, h: 1, cost: 70 },
  turret: { label: "Turret", color: 0xd0564a, gen: 0, draw: 4, battery: 0, priority: 1, w: 1, h: 1, cost: 200 },
  lamp: { label: "Light Fixture", color: 0xffe9a8, gen: 0, draw: 1, battery: 0, priority: 2, w: 1, h: 1, cost: 30 },
  fusion: { label: "Fusion Reactor", color: 0x7fe9ff, gen: 150, draw: 0, battery: 0, priority: 0, w: 2, h: 2, cost: 2000 },
  cargoex: { label: "Cargo Exchange", color: 0x6fcf97, gen: 0, draw: 6, battery: 0, priority: 1, w: 2, h: 2, cost: 1500 },
  aicore: { label: "AI Core", color: 0x8a6cf0, gen: 0, draw: 10, battery: 0, priority: 3, w: 2, h: 2, cost: 2500 },
  // Sector Beacon: one signature module per species (each only works with its species aboard).
  cmdhub: { label: "Command Hub", color: 0x6ea8ff, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 2, cost: 800 },
  tradenexus: { label: "Trade Nexus", color: 0xffd86a, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 2, cost: 800 },
  autoforge: { label: "Auto-Forge", color: 0xef6b3a, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 2, cost: 800 },
  bloomgarden: { label: "Bloom Garden", color: 0x7fd08f, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 2, cost: 800 },
  orerefinery: { label: "Ore Refinery", color: 0xe8a55a, gen: 0, draw: 6, battery: 0, priority: 3, w: 2, h: 2, cost: 800 },
};

// Station-wide ×1.25 to production, repair and mining while a powered AI Core runs.
export function aiBoost(w: { structures: Record<number, { kind: StructureKind; powered: boolean }> }): number {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "aicore" && s.powered) return 1.25;
  }
  return 1;
}

// Build cost of the basic structural tiles (credits).
export const TILE_COST: Record<string, number> = { floor: 2, wall: 3, door: 25 };

// Build cost for any tool that places something; 0 for tools/cursors.
export function costOf(tool: string): number {
  if (tool in STRUCTURES) return STRUCTURES[tool as StructureKind].cost;
  return TILE_COST[tool] ?? 0;
}

// Bio Vats grow a base resource from power (recipe: biomass or spores).
export const VAT = { time: 8, amount: 3 } as const;
// Synth converts a base resource into a food line (recipe: rations or fungal).
export const SYNTH = { time: 10, input: 2, meals: 4 } as const;
// Fuel Refinery converts mined minerals into ship fuel (needs a Bot Bay feeding it).
export const FUELREC = { time: 6, input: 2, out: 3 } as const;

// Docking tiers. A bigger berth lands a bigger ship that disembarks more guests
// (and a wider species mix) and buys more fuel — but draws more power and costs
// more. All three place like a standard dock (a single hull-wall airlock).
export type DockKind = "dock" | "docklarge" | "docksuper";
export const DOCK_KINDS: DockKind[] = ["dock", "docklarge", "docksuper"];
export function isDock(kind: StructureKind): kind is DockKind {
  return kind === "dock" || kind === "docklarge" || kind === "docksuper";
}
// size = visual/pad scale (1/2/3); guests = max passengers per shuttle;
// fuelNeed = fuel units a landing ship buys; padHalf = landing-pad half-extent (tiles).
export const DOCK_TIER: Record<DockKind, { size: number; guests: number; fuelNeed: number; padHalf: number }> = {
  dock: { size: 1, guests: 3, fuelNeed: 6, padHalf: 1.5 },
  docklarge: { size: 2, guests: 6, fuelNeed: 18, padHalf: 2.5 },
  docksuper: { size: 3, guests: 10, fuelNeed: 40, padHalf: 3.5 },
};
