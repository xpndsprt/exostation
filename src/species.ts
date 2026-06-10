import { FoodLine, GasKind, Species } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  diet: FoodLine; // the food line this species eats
  accent: number; // ring color for quick visual ID
  power: number; // combat power (from BALANCE.md)
  role: string; // how they appear on the station
  blurb: string; // Alienpedia flavor / notes
}

export const SPECIES: Record<Species, SpeciesDef> = {
  human: {
    label: "Human",
    gas: "o2",
    diet: "rations",
    accent: 0x0d1016,
    power: 20,
    role: "Resident crew",
    blurb: "Baseline oxygen breathers. Adaptable generalists — your starting workforce.",
  },
  drenn: {
    label: "Drenn",
    gas: "o2",
    diet: "rations",
    accent: 0xe8c349,
    power: 18,
    role: "Visitor (trader)",
    blurb: "Gregarious merchant culture. Like nearly everyone; the station's social glue and best-paying guests.",
  },
  thol: {
    label: "Thol",
    gas: "ch4",
    diet: "rations",
    accent: 0xd98a3a,
    power: 35,
    role: "Resident crew",
    blurb: "Methane breathers — need a sealed CH₄ wing. Stoic and strong; humans resent them.",
  },
  vryl: {
    label: "Vry'l",
    gas: "o2",
    diet: "fungal",
    accent: 0x8fd14f,
    power: 22,
    role: "Resident crew",
    blurb: "Oxygen breathers, but they eat only Fungal Mash — they need a Spore vat + a Synth set to Fungal. Beloved by the Drenn.",
  },
};
