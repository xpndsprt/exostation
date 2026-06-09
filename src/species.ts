import { GasKind, Species } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  accent: number; // ring color for quick visual ID
}

export const SPECIES: Record<Species, SpeciesDef> = {
  human: { label: "Human", gas: "o2", accent: 0x0d1016 },
  drenn: { label: "Drenn", gas: "o2", accent: 0xe8c349 },
  thol: { label: "Thol", gas: "ch4", accent: 0xd98a3a },
};
