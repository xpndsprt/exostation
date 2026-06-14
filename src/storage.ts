import { World } from "./types";

// Resource storage caps. Production idles at the cap, so stockpiles plateau
// instead of climbing forever — sizing production to population (and trading
// minerals to make room) becomes an ongoing decision. A Storage Silo raises
// every cap (unlocked via Cargo Logistics in the tech tree).
export const BASE_CAPS = { biomass: 400, spores: 250, rations: 50, fungal: 50, minerals: 200, fuel: 120 } as const;
export const SILO_BONUS = 250;

export interface Caps {
  biomass: number;
  spores: number;
  rations: number;
  fungal: number;
  minerals: number;
  fuel: number;
}

export const CARGOEX_MINERAL_BONUS = 500; // a Cargo Exchange holds far more ore

export function storageCaps(w: World): Caps {
  let silos = 0;
  let cargoex = 0;
  for (const id in w.structures) {
    const k = w.structures[id].kind;
    if (k === "silo") silos++;
    else if (k === "cargoex") cargoex++;
  }
  const add = silos * SILO_BONUS;
  return {
    biomass: BASE_CAPS.biomass + add,
    spores: BASE_CAPS.spores + add,
    rations: BASE_CAPS.rations + add,
    fungal: BASE_CAPS.fungal + add,
    minerals: BASE_CAPS.minerals + add + cargoex * CARGOEX_MINERAL_BONUS,
    fuel: BASE_CAPS.fuel + add,
  };
}
