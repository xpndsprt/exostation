import { GasKind, Species } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  accent: number; // ring color for quick visual ID
  power: number; // combat power (from BALANCE.md)
}

export const SPECIES: Record<Species, SpeciesDef> = {
  human: { label: "Human", gas: "o2", accent: 0x0d1016, power: 20 },
  drenn: { label: "Drenn", gas: "o2", accent: 0xe8c349, power: 18 },
  thol: { label: "Thol", gas: "ch4", accent: 0xd98a3a, power: 35 },
};
