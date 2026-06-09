import { StructureKind } from "./types";

export interface StructDef {
  label: string;
  color: number;
  gen: number; // power generated (PU)
  draw: number; // power consumed when on (PU)
  battery: number; // storage added (PU)
  priority: number; // higher = shed last in a brownout
}

// MVP subset of the full catalog (see BUILDINGS.md).
export const STRUCTURES: Record<StructureKind, StructDef> = {
  solar: { label: "Solar Panel", color: 0x3a7bd5, gen: 10, draw: 0, battery: 0, priority: 0 },
  battery: { label: "Battery", color: 0xd5b13a, gen: 0, draw: 0, battery: 50, priority: 0 },
  o2gen: { label: "O₂ Generator", color: 0x35c2c2, gen: 0, draw: 6, battery: 0, priority: 10 },
};
