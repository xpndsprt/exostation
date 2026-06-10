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
  synth: { label: "Rations Synth", color: 0xcf7a3a, gen: 0, draw: 5, battery: 0, priority: 5, w: 2, h: 1, cost: 70 },
  pod: { label: "Crew Quarters", color: 0x9b6cd5, gen: 0, draw: 1, battery: 0, priority: 2, w: 1, h: 1, cost: 40 },
  vat: { label: "Bio Vat", color: 0x4f9d5b, gen: 0, draw: 6, battery: 0, priority: 4, w: 2, h: 2, cost: 90 },
  bay: { label: "Bot Bay", color: 0x4aa3a3, gen: 0, draw: 4, battery: 0, priority: 3, w: 2, h: 2, cost: 120 },
  dock: { label: "Docking Port", color: 0x5a8ad5, gen: 0, draw: 5, battery: 0, priority: 1, w: 1, h: 1, cost: 150 },
  rec: { label: "Lounge", color: 0xc05fa8, gen: 0, draw: 4, battery: 0, priority: 2, w: 2, h: 2, cost: 80 },
  hotel: { label: "Hotel Room", color: 0xc99bd5, gen: 0, draw: 2, battery: 0, priority: 2, w: 2, h: 1, cost: 60 },
  tradehub: { label: "Trade Hub", color: 0x6fcf97, gen: 0, draw: 5, battery: 0, priority: 1, w: 2, h: 2, cost: 120 },
};

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
