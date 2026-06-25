import { World } from "./types";

// Resource storage caps. Production idles at the cap, so stockpiles plateau
// instead of climbing forever — sizing production to population (and trading
// minerals to make room) becomes an ongoing decision. A Storage Silo raises
// every cap (unlocked via Cargo Logistics in the tech tree).
export const BASE_CAPS = { biomass: 400, spores: 250, microbes: 250, rations: 50, fungal: 50, protein: 50, exotic: 50, minerals: 200, fuel: 120, water: 80 } as const;
export const SILO_BONUS = 250;

export interface Caps {
  biomass: number;
  spores: number;
  microbes: number;
  rations: number;
  fungal: number;
  protein: number;
  exotic: number;
  minerals: number;
  fuel: number;
  water: number;
}

export const CARGOEX_MINERAL_BONUS = 500; // a Cargo Exchange holds far more ore
// Airless Storage tiles are the warehouse: each tile raises the haulable-goods
// caps (meals + minerals), so laying more storage floor lets you stockpile more.
export const STORE_MEAL_PER_CELL = 3;
export const STORE_MINERAL_PER_CELL = 6;

export function storageCaps(w: World): Caps {
  let silos = 0;
  let cargoex = 0;
  for (const id in w.structures) {
    const k = w.structures[id].kind;
    if (k === "silo") silos++;
    else if (k === "cargoex") cargoex++;
  }
  let storeCells = 0;
  for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") storeCells++;
  const add = silos * SILO_BONUS;
  const mealAdd = add + storeCells * STORE_MEAL_PER_CELL;
  return {
    biomass: BASE_CAPS.biomass + add,
    spores: BASE_CAPS.spores + add,
    microbes: BASE_CAPS.microbes + add,
    rations: BASE_CAPS.rations + mealAdd,
    fungal: BASE_CAPS.fungal + mealAdd,
    protein: BASE_CAPS.protein + mealAdd,
    exotic: BASE_CAPS.exotic + mealAdd,
    minerals: BASE_CAPS.minerals + add + cargoex * CARGOEX_MINERAL_BONUS + storeCells * STORE_MINERAL_PER_CELL,
    fuel: BASE_CAPS.fuel + add,
    water: BASE_CAPS.water + add + storeCells * STORE_MINERAL_PER_CELL, // Silos + storage floor hold more water
  };
}
