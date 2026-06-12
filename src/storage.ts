import { World } from "./types";

// Resource storage caps. Production idles at the cap, so stockpiles plateau
// instead of climbing forever — sizing production to population (and trading
// minerals to make room) becomes an ongoing decision. A Storage Silo raises
// every cap (unlocked via Cargo Logistics in the tech tree).
export const BASE_CAPS = { biomass: 400, spores: 250, rations: 50, fungal: 50, minerals: 200 } as const;
export const SILO_BONUS = 250;

export interface Caps {
  biomass: number;
  spores: number;
  rations: number;
  fungal: number;
  minerals: number;
}

export function storageCaps(w: World): Caps {
  let silos = 0;
  for (const id in w.structures) if (w.structures[id].kind === "silo") silos++;
  const add = silos * SILO_BONUS;
  return {
    biomass: BASE_CAPS.biomass + add,
    spores: BASE_CAPS.spores + add,
    rations: BASE_CAPS.rations + add,
    fungal: BASE_CAPS.fungal + add,
    minerals: BASE_CAPS.minerals + add,
  };
}
