import { GasKind, Species } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  accent: number; // ring color for quick visual ID
  power: number; // combat power (from BALANCE.md)
  diet: string; // food line they eat
  role: string; // how they appear on the station
  blurb: string; // Alienpedia flavor / notes
}

export const SPECIES: Record<Species, SpeciesDef> = {
  human: {
    label: "Human",
    gas: "o2",
    accent: 0x0d1016,
    power: 20,
    diet: "Rations",
    role: "Resident crew",
    blurb: "Baseline oxygen breathers. Adaptable generalists — your starting workforce.",
  },
  drenn: {
    label: "Drenn",
    gas: "o2",
    accent: 0xe8c349,
    power: 18,
    diet: "Rations",
    role: "Visitor (trader)",
    blurb: "Gregarious merchant culture. Like nearly everyone; the station's social glue and best-paying guests.",
  },
  thol: {
    label: "Thol",
    gas: "ch4",
    accent: 0xd98a3a,
    power: 35,
    diet: "Rations",
    role: "Resident crew",
    blurb: "Methane breathers — need a sealed CH₄ wing. Stoic and strong; humans resent them.",
  },
};
