import { World } from "./types";
import { SYNTH, VAT } from "./structures";

// Bio Vats grow food base (biomass) from power; Rations Synths convert biomass
// into meals. (Minerals come from mining and are a separate stockpile.)
export function foodSystem(w: World, dt: number): void {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!s.powered) continue;

    if (s.kind === "vat") {
      s.timer += dt;
      if (s.timer >= VAT.time) {
        s.timer -= VAT.time;
        w.stock.biomass += VAT.biomass;
      }
    } else if (s.kind === "synth") {
      if (w.stock.biomass >= SYNTH.biomass) {
        s.timer += dt;
        if (s.timer >= SYNTH.time) {
          s.timer -= SYNTH.time;
          w.stock.biomass -= SYNTH.biomass;
          w.stock.meals += SYNTH.meals;
        }
      } else {
        s.timer = 0;
      }
    }
  }
}
