import { Species, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";

export type Severity = "critical" | "warn" | "tip";
export interface Advice {
  sev: Severity;
  text: string;
}

const RANK: Record<Severity, number> = { critical: 0, warn: 1, tip: 2 };

// Remember every species that has ever appeared on the station. Returns the
// species newly seen this call (drives the first-contact dialog).
export function updateSeen(world: World): Species[] {
  const added: Species[] = [];
  for (const id in world.agents) {
    const s = world.agents[id].species;
    if (!world.seen.includes(s)) {
      world.seen.push(s);
      added.push(s);
    }
  }
  return added;
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

  // crew vs upkeep: residents do the maintenance; visitors don't. Crew now
  // immigrate by shuttle, so the fix is infrastructure, not hand-placing them.
  const residents = agents.filter((a) => !a.guest).length;
  const machines = structures.filter((s) => STRUCTURES[s.kind].draw > 0).length;
  if (machines > 0 && residents === 0)
    out.push({ sev: "warn", text: "No resident crew yet — a shuttle brings crew once you have a powered Docking Port, Crew Quarters in breathable air, and meals in stock." });
  else if (residents > 0 && machines > residents * 6)
    out.push({ sev: "tip", text: "Lots of machinery per crew — add Crew Quarters so more residents arrive to keep upkeep pace." });

  // --- progression: the single next build-order gap ---
  const sealed = Object.values(world.rooms).some((r) => r.enclosed);
  if (!sealed) out.push({ sev: "warn", text: "Seal a room: lay Floor, then enclose it with Wall." });
  else if (!has("solar")) out.push({ sev: "warn", text: "Place a Solar Panel to power the station." });
  else if (!has("o2gen")) out.push({ sev: "warn", text: "Add an O₂ Generator inside a sealed room." });
  else if (!has("synth")) out.push({ sev: "warn", text: "Build a Rations Synth — it turns your biomass into meals." });
  else if (!has("pod")) out.push({ sev: "warn", text: "Build Crew Quarters — each bunk is room for one resident crew member." });
  else if (!has("dock")) out.push({ sev: "warn", text: "Build a Docking Port — a shuttle uses it to bring resident crew (and Drenn guests)." });
  else if (!has("vat")) out.push({ sev: "warn", text: "Build a Bio Vat to keep growing food before the starting biomass runs out." });

  // crew capacity is free but nobody is coming — name the blocking gate (or
  // confirm a shuttle is inbound). Mirrors the immigration gates in economy.ts.
  const podCount = structures.filter((s) => s.kind === "pod").length;
  if (has("dock") && podCount > residents) {
    const dockPowered = structures.some((s) => s.kind === "dock" && s.powered);
    const podGases = new Set<string>();
    for (const s of structures) {
      if (s.kind !== "pod") continue;
      const rid = world.cells[s.cell].roomId;
      const g = rid >= 0 ? world.rooms[rid]?.gas : undefined;
      if (g && g !== "none" && g !== "mixed") podGases.add(g);
    }
    const m = world.stock.meals;
    const fed = (g: string) => (g === "o2" ? m.rations > 0 || m.fungal > 0 : g === "ch4" ? m.rations > 0 : false);
    const canArrive = dockPowered && [...podGases].some(fed);
    if (canArrive) out.push({ sev: "tip", text: "A crew shuttle is inbound to your free quarters." });
    else if (!dockPowered) out.push({ sev: "warn", text: "Crew can't arrive — the Docking Port is unpowered." });
    else if (podGases.size === 0) out.push({ sev: "warn", text: "Put Crew Quarters in a room with breathable air — crew won't bunk in vacuum." });
    else out.push({ sev: "warn", text: "No meals in stock — power a Synth and a shuttle will bring crew to your free quarters." });
  }

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
  const hotels = structures.filter((s) => s.kind === "hotel").length;
  const guests = agents.filter((a) => a.guest).length;
  if (has("dock") && pods > 0 && residents >= pods)
    out.push({ sev: "tip", text: "All Crew Quarters full — add more so the shuttle can bring extra crew." });
  if (has("dock") && hotels > 0 && guests >= hotels)
    out.push({ sev: "tip", text: "All Hotel Rooms occupied — add Hotel Rooms to host more paying guests." });
  else if (has("dock") && hotels === 0 && residents > 0)
    out.push({ sev: "tip", text: "Add Hotel Rooms to lodge paying Drenn guests for income." });

  if (out.length === 0)
    out.push({ sev: "tip", text: "Station stable. Expand: more Crew Quarters to grow, Hotel Rooms for income, or host a new species." });

  out.sort((a, b) => RANK[a.sev] - RANK[b.sev]);
  return out;
}
