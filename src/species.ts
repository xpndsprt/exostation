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
  lore: string; // backstory paragraph, shown in the first-contact dialog
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
    lore:
      "Three centuries after the first slow colony ships left a crowded Earth, humans are " +
      "the frontier's middlemen — found on every station, signed to every contract, fluent " +
      "in nobody's language but their own. They breathe oxygen, eat ration packs without " +
      "complaint, and master no single craft, which is exactly why they fit anywhere. Your " +
      "first crews will be human: dependable, unremarkable, and quietly indispensable.",
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
    lore:
      "The Drenn built no empire — they built a market, and let everyone else fight over the " +
      "territory. Gold-scaled, endlessly affable, and constitutionally unable to hold a grudge, " +
      "they glide between rival species brokering deals nobody else could. A Drenn aboard means " +
      "better prices, smoother tempers, and a guest who tips well; their only loyalty is to a " +
      "comfortable room and an open ledger. Where the Drenn dock, credits follow.",
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
    lore:
      "From the methane-shrouded moons of a gas giant they still call home, the Thol are a " +
      "guild-people raised in the roar of pressure plants — they read a failing machine the way " +
      "others read a face. Slow to speak and immensely strong, they keep a station's systems alive " +
      "and ask only for a sealed methane wing and to be left to their work. Humans, who fought them " +
      "in a war neither side quite remembers starting, still bristle at them; the gentle Vry'l, by " +
      "contrast, they count as kin.",
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
    lore:
      "The Vry'l are growers — a soft-spoken, spore-tending people who turned a dying fungal " +
      "homeworld into a garden and never lost the habit. They share humanity's air but not its " +
      "table, living only on fungal mash they coax from their own vats with uncanny skill. The " +
      "Drenn adore their living artworks and the Thol treasure them as friends; only the brutish " +
      "Korro, who trample what the Vry'l nurture, earn their quiet, lasting hatred.",
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
    lore:
      "Bred for heavy labor on high-gravity worlds and then, by their own account, abandoned " +
      "there, the Korro carry their resentment like a second skeleton. They are the strongest " +
      "haulers in the sector — a mining fleet with a Korro aboard simply moves more ore — but " +
      "they breathe the same oxygen as humans, so you cannot wall them off behind a gas zone. " +
      "Humans and Vry'l despise them and the feeling is mutual; the only peace is architecture: " +
      "give the Korro their own oxygen wing, behind a door, and let proximity do no harm.",
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
    lore:
      "If the Drenn cornered the market in goods, the Vorn cornered the market in what makes " +
      "everything move: fuel. A methane-breathing merchant house grown rich shipping reaction mass " +
      "between the gas moons, they arrive only where a station can host them — a sealed CH₄ wing " +
      "with a room of their own air — and tip the scales of every fuel sale in your favor while " +
      "they stay. Build for the Thol, and you open your docks to the Vorn and their deep, " +
      "methane-scented purses.",
  },
};
