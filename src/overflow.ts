import { World } from "./types";
import { storageCaps } from "./storage";

// M41 — overflow consequences. Hitting a storage cap is no longer a free
// "production idles" screensaver: a resource sitting near its cap **spoils**
// (you jettison/lose the excess), and visible waste drags station morale. So
// over-building production past what you consume/trade actively costs you —
// right-sizing the food chain and keeping trade capacity ahead of mining
// becomes a live decision instead of a fire-and-forget.
const HI = 0.95; // start spoiling once a store is this fraction of its cap
const SPOIL = 0.02; // fraction of the held amount lost per second while over HI
const WASTE = 0.99; // at/above this fraction, crew see waste → morale drag

export function overflowSystem(w: World, dt: number): void {
  const caps = storageCaps(w);
  let wasting = false;

  const decay = (amount: number, cap: number): number => {
    if (cap <= 0 || amount < cap * HI) return amount;
    if (amount >= cap * WASTE) wasting = true;
    if (dt <= 0) return amount; // paused / redraw tick: no spoilage, keep morale state
    return Math.max(cap * HI, amount - amount * SPOIL * dt);
  };

  w.stock.biomass = decay(w.stock.biomass, caps.biomass);
  w.stock.spores = decay(w.stock.spores, caps.spores);
  w.stock.minerals = decay(w.stock.minerals, caps.minerals);
  w.stock.meals.rations = decay(w.stock.meals.rations, caps.rations);
  w.stock.meals.fungal = decay(w.stock.meals.fungal, caps.fungal);

  if (wasting && !w.overflow) w.notify.push("Storage overflowing — resources are going to waste. Trade or build a Silo.");
  if (dt > 0) w.overflow = wasting; // mood reads this; freeze it on paused ticks
}
