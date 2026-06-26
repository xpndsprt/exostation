import { StructureKind, World } from "./types";
import { WATER_MODULE_KINDS } from "./research";

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

// ── Tier-gated storage ────────────────────────────────────────────────────────
// Advanced (2+ Lab) modules draw parts/feedstock from the warehouse, so each one
// reserves some storage capacity. You can't build a tier-2+ module unless the
// station has free warehouse "slots" for it — making storage a real prerequisite
// for expanding past the basic (1-Lab) tier instead of an afterthought. The
// storage modules themselves (Silo / Cargo Exchange) are exempt, otherwise the
// fix for "not enough storage" would itself be gated.
export const STORAGE_SLOTS_PER_TILE = 1; // a Storage Floor tile
export const STORAGE_SLOTS_PER_SILO = 5; // a Storage Silo holds a lot more
export const STORAGE_SLOTS_PER_CARGOEX = 8; // a Cargo Exchange, more still
export const SLOTS_PER_ADVANCED = 2; // warehouse slots each advanced module reserves

// Is `kind` an advanced module that the storage gate applies to? (2+ Lab, but not
// the warehouse modules that PROVIDE storage.)
export function isStorageGated(kind: StructureKind): boolean {
  return WATER_MODULE_KINDS.has(kind) && kind !== "silo" && kind !== "cargoex";
}

// Total warehouse "slots" the station provides (Storage Floor tiles + Silos +
// Cargo Exchanges).
export function warehouseSlots(w: World): number {
  let tiles = 0;
  for (let i = 0; i < w.cells.length; i++) if (w.cells[i].type === "storage") tiles++;
  let silos = 0, cargoex = 0;
  for (const id in w.structures) {
    const k = w.structures[id].kind;
    if (k === "silo") silos++;
    else if (k === "cargoex") cargoex++;
  }
  return tiles * STORAGE_SLOTS_PER_TILE + silos * STORAGE_SLOTS_PER_SILO + cargoex * STORAGE_SLOTS_PER_CARGOEX;
}

// Slots already reserved by the advanced modules currently placed.
export function advancedSlotsUsed(w: World): number {
  let n = 0;
  for (const id in w.structures) if (isStorageGated(w.structures[id].kind)) n++;
  return n * SLOTS_PER_ADVANCED;
}

// Would building one more of `kind` be blocked for lack of warehouse capacity?
// (Only advanced modules are gated; everything else is always allowed.)
export function storageBlocksBuild(w: World, kind: StructureKind): boolean {
  if (!isStorageGated(kind)) return false;
  return advancedSlotsUsed(w) + SLOTS_PER_ADVANCED > warehouseSlots(w);
}

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
