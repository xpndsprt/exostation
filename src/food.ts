import { World } from "./types";
import { SYNTH } from "./structures";

// Synthesizers convert stored biomass + water into meals on a timer while
// powered. (M5 will add mining drones to keep biomass/water topped up.)
export function foodSystem(w: World, dt: number): void {
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind !== "synth" || !s.powered) continue;
    if (w.stock.biomass >= SYNTH.biomass && w.stock.water >= SYNTH.water) {
      s.timer += dt;
      if (s.timer >= SYNTH.time) {
        s.timer -= SYNTH.time;
        w.stock.biomass -= SYNTH.biomass;
        w.stock.water -= SYNTH.water;
        w.stock.meals += SYNTH.meals;
      }
    } else {
      s.timer = 0;
    }
  }
}
