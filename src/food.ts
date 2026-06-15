import { FoodLine, World } from "./types";
import { SYNTH, VAT, aiBoost } from "./structures";
import { TRAITS } from "./species";
import { productivity } from "./harmony";
import { storageCaps } from "./storage";
import { beaconActive } from "./beacon";
import { industryBoost } from "./research";

// Base resources a Vat can grow (raw feedstock), keyed by the Vat's recipe.
type Base = "biomass" | "spores" | "microbes";
const VAT_BASE: Record<string, Base> = { biomass: "biomass", spores: "spores", microbes: "microbes" };
// Synth recipes: each cooks one food line from one base resource.
//   rations ← biomass · fungal ← spores · protein/exotic ← microbes
const SYNTH_RECIPE: Record<string, { line: FoodLine; base: Base }> = {
  rations: { line: "rations", base: "biomass" },
  fungal: { line: "fungal", base: "spores" },
  protein: { line: "protein", base: "microbes" },
  exotic: { line: "exotic", base: "microbes" },
};

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
      // recipe → which base resource this vat grows
      const grows = VAT_BASE[s.recipe] ?? "biomass";
      if (w.stock[grows] >= caps[grows]) {
        s.timer = 0; // idle at cap — no infinite stockpiles
        continue;
      }
      s.timer += dtp;
      if (s.timer >= VAT.time) {
        s.timer -= VAT.time;
        const boost = botanistIn(w, w.cells[s.cell].roomId) ? TRAITS.vrylVat : 1;
        const yield_ = Math.round(VAT.amount * boost);
        w.stock[grows] = Math.min(caps[grows], w.stock[grows] + yield_);
      }
    } else if (s.kind === "synth") {
      // recipe → produced food line + the base resource it consumes
      const { line, base } = SYNTH_RECIPE[s.recipe] ?? SYNTH_RECIPE.rations;
      if (w.stock[base] >= SYNTH.input && w.stock.meals[line] < caps[line]) {
        s.timer += dtp;
        if (s.timer >= SYNTH.time) {
          s.timer -= SYNTH.time;
          w.stock[base] -= SYNTH.input;
          w.stock.meals[line] = Math.min(caps[line], w.stock.meals[line] + SYNTH.meals);
        }
      } else {
        s.timer = 0;
      }
    }
  }
}
