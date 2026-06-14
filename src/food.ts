import { FoodLine, World } from "./types";
import { SYNTH, VAT, aiBoost } from "./structures";
import { TRAITS } from "./species";
import { productivity } from "./harmony";
import { storageCaps } from "./storage";
import { beaconActive } from "./beacon";
import { industryBoost } from "./research";

// room productivity multiplier for a structure's location
function roomProd(w: World, cell: number): number {
  const r = w.cells[cell].roomId;
  return r >= 0 && w.rooms[r] ? productivity(w.rooms[r].harmony) : 1;
}

// A living Vry'l (botanist) in the same room boosts a vat's yield.
function botanistIn(w: World, roomId: number): boolean {
  if (roomId < 0) return false;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === "vryl" && w.cells[a.cell].roomId === roomId) return true;
  }
  return false;
}

// Bio Vats grow a base resource (biomass or spores by recipe); Rations Synths
// convert a base resource into a food line (rations from biomass, fungal from
// spores). Meals are stored per food line; crew eat the line their species eats.
export function foodSystem(w: World, dt: number): void {
  const caps = storageCaps(w);
  const boost = aiBoost(w) * industryBoost(w) * (beaconActive(w, "bloomgarden") ? 1.5 : 1); // AI Core + Industrialist + Vry'l Bloom Garden
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!s.powered) continue;
    const dtp = dt * roomProd(w, s.cell) * boost; // harmonious rooms (and an AI Core) produce faster

    if (s.kind === "vat") {
      const full = s.recipe === "spores" ? w.stock.spores >= caps.spores : w.stock.biomass >= caps.biomass;
      if (full) {
        s.timer = 0; // idle at cap — no infinite stockpiles
        continue;
      }
      s.timer += dtp;
      if (s.timer >= VAT.time) {
        s.timer -= VAT.time;
        const boost = botanistIn(w, w.cells[s.cell].roomId) ? TRAITS.vrylVat : 1;
        const yield_ = Math.round(VAT.amount * boost);
        if (s.recipe === "spores") w.stock.spores = Math.min(caps.spores, w.stock.spores + yield_);
        else w.stock.biomass = Math.min(caps.biomass, w.stock.biomass + yield_);
      }
    } else if (s.kind === "synth") {
      const fungal = s.recipe === "fungal";
      const line: FoodLine = fungal ? "fungal" : "rations";
      const base = fungal ? w.stock.spores : w.stock.biomass;
      if (base >= SYNTH.input && w.stock.meals[line] < caps[line]) {
        s.timer += dtp;
        if (s.timer >= SYNTH.time) {
          s.timer -= SYNTH.time;
          if (fungal) w.stock.spores -= SYNTH.input;
          else w.stock.biomass -= SYNTH.input;
          w.stock.meals[line] = Math.min(caps[line], w.stock.meals[line] + SYNTH.meals);
        }
      } else {
        s.timer = 0;
      }
    }
  }
}
