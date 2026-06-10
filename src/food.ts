import { FoodLine, World } from "./types";
import { SYNTH, VAT } from "./structures";
import { TRAITS } from "./species";

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
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!s.powered) continue;

    if (s.kind === "vat") {
      s.timer += dt;
      if (s.timer >= VAT.time) {
        s.timer -= VAT.time;
        const boost = botanistIn(w, w.cells[s.cell].roomId) ? TRAITS.vrylVat : 1;
        const yield_ = Math.round(VAT.amount * boost);
        if (s.recipe === "spores") w.stock.spores += yield_;
        else w.stock.biomass += yield_;
      }
    } else if (s.kind === "synth") {
      const fungal = s.recipe === "fungal";
      const base = fungal ? w.stock.spores : w.stock.biomass;
      if (base >= SYNTH.input) {
        s.timer += dt;
        if (s.timer >= SYNTH.time) {
          s.timer -= SYNTH.time;
          if (fungal) w.stock.spores -= SYNTH.input;
          else w.stock.biomass -= SYNTH.input;
          const line: FoodLine = fungal ? "fungal" : "rations";
          w.stock.meals[line] += SYNTH.meals;
        }
      } else {
        s.timer = 0;
      }
    }
  }
}
