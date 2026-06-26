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
      // Output buffers ON the vat; crew haul it to storage (the warehouse = stock).
      // The vat STALLS when its buffer is full, so sustained growth needs crew +
      // storage. (A bootstrap trickle below moves it when there are no haulers.)
      if (s.outBuf >= VAT_OUTCAP || w.stock[grows] >= caps[grows]) {
        s.timer = 0;
        continue;
      }
      s.timer += dtp;
      if (s.timer >= VAT.time) {
        s.timer -= VAT.time;
        const boost = botanistIn(w, w.cells[s.cell].roomId) ? TRAITS.vrylVat : 1;
        s.outBuf += Math.round(VAT.amount * boost);
      }
    } else if (s.kind === "synth") {
      // recipe → the base resource this Synth consumes (its recipe IS the food line)
      const base = (SYNTH_RECIPE[s.recipe] ?? SYNTH_RECIPE.rations).base;
      // Cooked meals pile in the Synth's OWN output buffer (like a Vat). Crew carry
      // them to storage to stockpile food (only if storage exists); with nowhere to
      // bank them, crew just eat straight off the cooker. The Synth STALLS when its
      // buffer is full. Cook from crew-delivered feedstock (inBuf) or the warehouse.
      const hasFeed = s.inBuf >= SYNTH.input || w.stock[base] >= SYNTH.input;
      if (hasFeed && s.outBuf < SYNTH_OUTCAP) {
        s.timer += dtp;
        if (s.timer >= SYNTH.time) {
          s.timer -= SYNTH.time;
          if (s.inBuf >= SYNTH.input) s.inBuf -= SYNTH.input;
          else w.stock[base] -= SYNTH.input;
          s.outBuf = Math.min(SYNTH_OUTCAP, s.outBuf + SYNTH.meals);
        }
      } else {
        s.timer = 0;
      }
    }
  }

  // Bootstrap trickle: with no resident crew to haul (the opening, or a headless
  // sim), vat output flows straight into the warehouse so the station can start.
  // Once residents are aboard, they must physically haul it (see agents.ts).
  let residents = 0;
  for (const id in w.agents) if (w.agents[id].alive && !w.agents[id].guest) residents++;
  if (residents === 0) {
    for (const id in w.structures) {
      const s = w.structures[id];
      if (s.outBuf <= 0) continue;
      if (s.kind === "vat") {
        const grows = VAT_BASE[s.recipe] ?? "biomass";
        const move = Math.min(s.outBuf, caps[grows] - w.stock[grows]);
        if (move > 0) { w.stock[grows] += move; s.outBuf -= move; }
      } else if (s.kind === "synth") {
        const line = (SYNTH_RECIPE[s.recipe] ?? SYNTH_RECIPE.rations).line;
        const move = Math.min(s.outBuf, caps[line] - w.stock.meals[line]);
        if (move > 0) { w.stock.meals[line] += move; s.outBuf -= move; }
      }
    }
  }
}

export const VAT_OUTCAP = 9; // vat output units that pile up before it stalls (awaiting haul)
export const SYNTH_OUTCAP = 9; // cooked meals a Synth buffers before it stalls (awaiting haul/eat)
