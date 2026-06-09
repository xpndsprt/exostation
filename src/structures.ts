import { GasKind, StructureKind } from "./types";

export interface StructDef {
  label: string;
  color: number;
  gen: number; // power generated (PU)
  draw: number; // power consumed when on (PU)
  battery: number; // storage added (PU)
  priority: number; // higher = shed last in a brownout
  gas?: GasKind; // atmosphere this generator emits (life support)
}

// MVP subset of the full catalog (see BUILDINGS.md).
export const STRUCTURES: Record<StructureKind, StructDef> = {
  solar: { label: "Solar Panel", color: 0x3a7bd5, gen: 10, draw: 0, battery: 0, priority: 0 },
  battery: { label: "Battery", color: 0xd5b13a, gen: 0, draw: 0, battery: 50, priority: 0 },
  o2gen: { label: "O₂ Generator", color: 0x35c2c2, gen: 0, draw: 6, battery: 0, priority: 10, gas: "o2" },
  ch4gen: { label: "Methane Gen", color: 0xc98a3a, gen: 0, draw: 9, battery: 0, priority: 10, gas: "ch4" },
  synth: { label: "Rations Synth", color: 0xcf7a3a, gen: 0, draw: 5, battery: 0, priority: 5 },
  pod: { label: "Sleeping Pod", color: 0x9b6cd5, gen: 0, draw: 1, battery: 0, priority: 2 },
  bay: { label: "Bot Bay", color: 0x4aa3a3, gen: 0, draw: 4, battery: 0, priority: 3 },
  dock: { label: "Docking Port", color: 0x5a8ad5, gen: 0, draw: 5, battery: 0, priority: 1 },
};

// Food synthesis recipe (matches BALANCE.md: 2 biomass + 1 water -> 4 meals / 10s).
export const SYNTH = { time: 10, biomass: 2, water: 1, meals: 4 } as const;
