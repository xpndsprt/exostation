import { FoodLine, GasKind, Species } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  diet: FoodLine; // the food line this species eats
  accent: number; // ring color for quick visual ID
  power: number; // combat power (from BALANCE.md)
  role: string; // how they appear on the station
  trait: string; // Alienpedia line describing their species bonus
  blurb: string; // Alienpedia flavor / notes
}

// trait magnitudes (used by the systems)
export const TRAITS = {
  tholRepair: 1.5, // Thol service machinery 50% faster
  vrylVat: 1.5, // Vry'l boost Bio Vat output in their room by 50%
  drennTrade: 1.5, // Drenn raise mineral sale price 50% while aboard
  korroHaul: 1.5, // Korro muscle lets mining drones carry 50% more
  vornFuel: 1.5, // Vorn fuel barons raise the price ships pay for fuel 50%
} as const;

export const SPECIES: Record<Species, SpeciesDef> = {
  human: {
    label: "Human",
    gas: "o2",
    diet: "rations",
    accent: 0x0d1016,
    power: 20,
    role: "Resident crew",
    trait: "Generalist — no bonuses or penalties.",
    blurb: "Baseline oxygen breathers. Adaptable generalists — your starting workforce.",
  },
  drenn: {
    label: "Drenn",
    gas: "o2",
    diet: "rations",
    accent: 0xe8c349,
    power: 18,
    role: "Visitor (trader)",
    trait: "Merchant — traders pay +50% for minerals while a Drenn is aboard.",
    blurb: "Gregarious merchant culture. Like nearly everyone; the station's social glue and best-paying guests.",
  },
  thol: {
    label: "Thol",
    gas: "ch4",
    diet: "rations",
    accent: 0xd98a3a,
    power: 35,
    role: "Resident crew",
    trait: "Engineer — service & repair machinery 50% faster.",
    blurb: "Methane breathers — need a sealed CH₄ wing. Stoic and strong; humans resent them.",
  },
  vryl: {
    label: "Vry'l",
    gas: "o2",
    diet: "fungal",
    accent: 0x8fd14f,
    power: 22,
    role: "Resident crew",
    trait: "Botanist — Bio Vats in their room grow +50% faster.",
    blurb: "Oxygen breathers, but they eat only Fungal Mash — they need a Spore vat + a Synth set to Fungal. Beloved by the Drenn.",
  },
  korro: {
    label: "Korro",
    gas: "o2",
    diet: "rations",
    accent: 0xc0453a,
    power: 25,
    role: "Resident crew",
    trait: "Hauler — their muscle lets mining drones carry +50% while a Korro is aboard.",
    blurb: "Oxygen-breathing brawlers who share humans' air and rations — but they have no love for Humans or Vry'l. Give them their OWN O₂ wing or the shared room turns tense.",
  },
  vorn: {
    label: "Vorn",
    gas: "ch4",
    diet: "rations",
    accent: 0xb256c9,
    power: 16,
    role: "Visitor (trader)",
    trait: "Fuel Baron — docking ships pay +50% for fuel while a Vorn is aboard.",
    blurb: "Methane-breathing merchant caste — the CH₄ counterpart of the Drenn. They only visit (never reside), and they need a sealed methane wing with a CH₄ Hotel Room to lodge. Host them to give your methane builds their own stream of paying guests.",
  },
};
