import { Species, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";

export type Severity = "critical" | "warn" | "tip";
export interface Advice {
  sev: Severity;
  text: string;
}

const RANK: Record<Severity, number> = { critical: 0, warn: 1, tip: 2 };

// Remember every species that has ever appeared on the station.
export function updateSeen(world: World): void {
  for (const id in world.agents) {
    const s = world.agents[id].species;
    if (!world.seen.includes(s)) world.seen.push(s);
  }
}

function isNative(world: World, cell: number, species: Species): boolean {
  const rid = world.cells[cell].roomId;
  return rid >= 0 && world.rooms[rid]?.gas === SPECIES[species].gas;
}

// Rule-based "AI" advisor: inspect the whole world and surface the most useful
// next steps, most urgent first. Returns a prioritized list (caller trims).
export function advise(world: World): Advice[] {
  const out: Advice[] = [];
  const agents = Object.values(world.agents).filter((a) => a.alive);
  const structures = Object.values(world.structures);
  const has = (k: string) => structures.some((s) => s.kind === k);
  const p = world.power;

  // --- critical: active danger ---
  if (p.brownout) out.push({ sev: "critical", text: "Power shortfall — add a Solar Panel or Battery." });
  if (Object.values(world.rooms).some((r) => r.gas === "mixed"))
    out.push({ sev: "critical", text: "A room has MIXED gases (lethal) — keep different gas generators in separate rooms." });
  if (agents.some((a) => a.fighting))
    out.push({ sev: "critical", text: "Skirmish in progress — separate hostile species and raise morale." });
  if (agents.some((a) => a.o2 < 40 || (a.suit < 25 && !isNative(world, a.cell, a.species))))
    out.push({ sev: "critical", text: "Crew are losing air — fix power/atmosphere or get them to their gas." });
  if (agents.some((a) => a.food < 35 && world.stock.meals[SPECIES[a.species].diet] === 0))
    out.push({ sev: "critical", text: "Crew are starving — no meals of their food type." });
  if (agents.some((a) => a.alive && a.species === "vryl") && world.stock.meals.fungal === 0)
    out.push({ sev: "warn", text: "Vry'l eat Fungal Mash — set a Bio Vat to Spores and a Synth to Fungal." });
  if (structures.some((s) => STRUCTURES[s.kind].draw > 0 && s.condition <= 0))
    out.push({ sev: "critical", text: "A module has broken down — crew (residents) must repair it." });

  // crew vs upkeep: residents do the maintenance; visitors don't
  const residents = agents.filter((a) => !a.guest).length;
  const machines = structures.filter((s) => STRUCTURES[s.kind].draw > 0).length;
  if (machines > 0 && residents === 0)
    out.push({ sev: "warn", text: "No resident crew to maintain the station — add Humans to service modules." });
  else if (residents > 0 && machines > residents * 6)
    out.push({ sev: "tip", text: "Lots of machinery per crew — add residents so upkeep keeps pace." });

  // --- progression: the single next build-order gap ---
  const sealed = Object.values(world.rooms).some((r) => r.enclosed);
  if (!sealed) out.push({ sev: "warn", text: "Seal a room: lay Floor, then enclose it with Wall." });
  else if (!has("solar")) out.push({ sev: "warn", text: "Place a Solar Panel to power the station." });
  else if (!has("o2gen")) out.push({ sev: "warn", text: "Add an O₂ Generator inside a sealed room." });
  else if (agents.length === 0) out.push({ sev: "tip", text: "Add a Human (Crew) to start living aboard." });
  else if (!has("vat")) out.push({ sev: "warn", text: "Build a Bio Vat to grow food base (biomass)." });
  else if (!has("synth")) out.push({ sev: "warn", text: "Build a Rations Synth to turn biomass into meals." });
  else if (!has("pod")) out.push({ sev: "warn", text: "Add a Sleeping Pod so crew can rest." });
  else if (!has("dock")) out.push({ sev: "tip", text: "Build a Docking Port to attract paying Drenn guests." });

  // mining & trade (minerals economy)
  if (has("vat") && !has("bay"))
    out.push({ sev: "tip", text: "Mine minerals: build a Bot Bay near an asteroid." });
  if (has("bay") && !has("tradehub") && world.stock.minerals > 40)
    out.push({ sev: "tip", text: "Build a Trade Hub so traders buy your minerals for credits." });

  // --- quality / risk ---
  if (agents.length > 0) {
    const avgMood = agents.reduce((s, a) => s + a.mood, 0) / agents.length;
    if (avgMood < 40)
      out.push({ sev: "warn", text: "Morale is low — improve food/rest or separate disliked species." });
    const avgFun = agents.reduce((s, a) => s + a.fun, 0) / agents.length;
    if (!has("rec") && agents.length > 1)
      out.push({ sev: "tip", text: "Build a Lounge so crew and visitors can relax and socialize." });
    else if (has("rec") && avgFun < 35)
      out.push({ sev: "warn", text: "Everyone's bored — add another Lounge for recreation." });
  }
  if (agents.some((a) => a.tension > 50))
    out.push({ sev: "warn", text: "Tension is rising — keep disliked species apart." });
  if (Object.values(world.rooms).some((r) => r.harmony < -0.3))
    out.push({ sev: "warn", text: "Rivals share a room — productivity and mood suffer. Separate them, or group friends for a buff." });
  if (has("solar") && !has("battery") && p.supply - p.draw < 4)
    out.push({ sev: "tip", text: "Power margin is thin — add a Battery for safety." });

  // --- opportunity ---
  const pods = structures.filter((s) => s.kind === "pod").length;
  const guests = agents.filter((a) => a.guest).length;
  if (has("dock") && pods > 0 && guests >= pods)
    out.push({ sev: "tip", text: "All pods occupied — add Sleeping Pods to host more guests." });

  if (out.length === 0)
    out.push({ sev: "tip", text: "Station stable. Expand: more pods/guests for income, or host a new species." });

  out.sort((a, b) => RANK[a.sev] - RANK[b.sev]);
  return out;
}
