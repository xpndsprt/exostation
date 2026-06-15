import { FoodLine, GasKind, Species, Temp } from "./types";

export interface SpeciesDef {
  label: string;
  gas: GasKind; // the atmosphere this species breathes
  temp: Temp; // the room climate this species is comfortable in (mood, not lethal)
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
    temp: "temperate",
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
    temp: "temperate",
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
    temp: "temperate",
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
    temp: "temperate",
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
    temp: "temperate",
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
  chlorithe: {
    label: "Chlorithe",
    gas: "cl2",
    temp: "temperate",
    diet: "exotic",
    accent: 0x9bd14a,
    power: 28,
    role: "Resident crew (Tier-3)",
    trait: "Generalist — no special bonus (their challenge is the sealed Cl₂ wing + Exo-Culture food).",
    blurb: "Chlorine-breathing crystalline aliens. Their Cl₂ air is instantly lethal to everyone else — and corrodes the very modules around it, so the wing needs constant upkeep. They eat Exo-Culture (a Vat set to Microbes → a Synth set to Exo-Culture). Wary of the Vry'l, close to the Naaz.",
    lore:
      "The Chlorithe are a crystalline, chlorine-breathing people from a world of green " +
      "corrosive skies — slow, deliberate, and utterly indifferent to the soft-bodied races " +
      "around them. Their atmosphere eats through anything not built to hold it, so a Chlorithe " +
      "wing is a sealed, hazardous island on your station. They have no quarrel with most, but " +
      "the delicate Vry'l unsettle them; only the gentle Naaz they consider true kin.",
  },
  naaz: {
    label: "Naaz",
    gas: "nh3",
    temp: "cold",
    diet: "exotic",
    accent: 0x6a8fd1,
    power: 12,
    role: "Resident crew (Tier-3)",
    trait: "Peacemaker — the Naaz hold no grudges; they get along with everyone.",
    blurb: "Ammonia-breathing, soft-spoken aliens — the station's social glue. They need a sealed NH₃ wing kept COLD (a Cryo Unit), and eat Exo-Culture. In return they befriend every other species and dislike none.",
    lore:
      "The Naaz drift through ammonia seas on a cold, dim world, and something of that calm " +
      "comes with them — a serene, conflict-averse people who seem to like everyone they meet. " +
      "They ask only for a sealed ammonia wing of their own; in return they soften every feud " +
      "around them, beloved by the Vry'l and the reclusive Chlorithe alike. The closest thing " +
      "the sector has to universal peace tends to gather wherever the Naaz settle.",
  },
  voltaar: {
    label: "Voltaar",
    gas: "h2",
    temp: "hot",
    diet: "exotic",
    accent: 0xd16a9b,
    power: 30,
    role: "Resident crew (Tier-3)",
    trait: "Generalist — no special bonus (their challenge is the volatile, HOT H₂ wing + Exo-Culture food).",
    blurb: "Hydrogen-breathing energy-beings. Their H₂ atmosphere is wildly flammable — never mix it with O₂ in one room or it DETONATES. They run hot (a Heater keeps them happy) and eat Exo-Culture. Powerful, aloof, and at odds with the Thol and Chlorithe.",
    lore:
      "The Voltaar are barely-contained patterns of plasma and current, breathing hydrogen and " +
      "humming with restless energy. Brilliant and aloof, they regard slower species with cool " +
      "detachment — and their volatile hydrogen air will ignite at the first whiff of oxygen, so " +
      "their wing must sit well clear of everyone else's. They bristle at the stolid Thol and the " +
      "crystalline Chlorithe, and rarely warm to anyone but a persistent Drenn.",
  },
  vorn: {
    label: "Vorn",
    gas: "ch4",
    temp: "temperate",
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
  sszra: {
    label: "Sszra",
    gas: "o2",
    temp: "temperate",
    diet: "protein",
    accent: 0x57c2a8,
    power: 32,
    role: "Resident crew",
    trait: "Generalist — formidable, but no production bonus (their challenge is the Live-Protein chain).",
    blurb: "Oxygen-breathing reptilian sentinels. They share humanity's air but are pure carnivores — they eat only Live-Protein (a Vat set to Microbes → a Synth set to Live-Protein), never rations. Disciplined and strong; humans and the gentle Vry'l find them unnerving, while the Korro respect a fellow predator.",
    lore:
      "The Sszra are an old warrior-scholar people of scales and stillness, hatched on a hot " +
      "oxygen world where everything that lived had teeth. They breathe the same air as humans — " +
      "you cannot wall them off behind a gas zone — but they will not touch a ration pack: the " +
      "Sszra are obligate carnivores who eat only living protein, cultured fresh from microbial " +
      "vats. Patient, exacting, and quietly lethal, they make superb crew for a captain who can " +
      "feed them. Humans and the soft-spoken Vry'l flinch at their gaze; the brawling Korro, who " +
      "understand a predator on sight, count them as the closest thing to kin a stranger can be.",
  },
};
