import { Agent, Species, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";
import { isUnlocked, WATER_MODULE_KINDS } from "./research";
import { hasStorage } from "./mining";
import { warehouseSlots, advancedSlotsUsed, SLOTS_PER_ADVANCED, isStorageGated } from "./storage";
import { RELATIONS } from "./relations";

export type Severity = "critical" | "warn" | "tip";
export interface Advice {
  sev: Severity;
  text: string;
}

// An "AI" persona giving advice. The STATION AI watches infrastructure and danger
// for the whole station; each species AI represents one species aboard and speaks
// only for "its" people (in the first person — "our", "we").
export interface AIAdvisor {
  species: Species | "station";
  name: string; // e.g. "STATION AI", "VRY'L AI"
  advice: Advice[];
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

// How a species gets fed — named per food line so each AI can point at its chain.
const FOOD_CHAIN: Record<string, string> = {
  rations: "a Rations Synth turns biomass into meals",
  fungal: "set a Bio Vat to Spores and a Synth to Fungal",
  protein: "set a Bio Vat to Microbes and a Synth to Live-Protein",
  exotic: "set a Bio Vat to Microbes and a Synth to Exo-Culture",
};
const TEMP_FIX: Record<string, string> = { hot: "add a Heater to their wing", cold: "add a Cryo Unit to their wing" };

// ---- STATION AI: global infrastructure, danger, build-order, economy ----
function stationAdvice(world: World): Advice[] {
  const out: Advice[] = [];
  const agents = Object.values(world.agents).filter((a) => a.alive);
  const structures = Object.values(world.structures);
  const has = (k: string) => structures.some((s) => s.kind === k);
  const p = world.power;

  if (p.brownout) out.push({ sev: "critical", text: "Power shortfall — add a Solar Panel or Battery." });
  // an UNWIRED module: a switched-on, working consumer left dark not by a shortfall
  // but because the grid can't reach it — power only carries 1 tile from a source, so
  // it needs cabling. (This is the most common first-module gotcha.)
  const hasSource = structures.some((s) => STRUCTURES[s.kind].gen > 0 || STRUCTURES[s.kind].battery > 0);
  if (hasSource && !p.brownout && structures.some((s) => {
    const d = STRUCTURES[s.kind];
    return d.draw > 0 && d.gen <= 0 && d.battery <= 0 && s.on && s.condition > 0 && (s.faultT ?? 0) <= 0 && !s.powered;
  }))
    out.push({ sev: "warn", text: "A module is dark because nothing's wired to it — power reaches only 1 tile from a Solar Panel's socket (the deck cell just inside its wall) or a Battery. Run a Power Conduit from the source to the module to light it up." });
  if (Object.values(world.rooms).some((r) => r.gas === "mixed"))
    out.push({ sev: "critical", text: "A room has MIXED gases (lethal) — keep different gas generators in separate rooms." });
  if (structures.some((s) => STRUCTURES[s.kind].draw > 0 && s.condition <= 0))
    out.push({ sev: "critical", text: "A module has broken down — crew must repair it." });
  if (isUnlocked(world, "waterreclam") && world.stock.water <= 0 && structures.some((s) => s.powered && WATER_MODULE_KINDS.has(s.kind) && STRUCTURES[s.kind].draw > 0))
    out.push({ sev: "warn", text: "Water empty — your advanced modules are overheating (3× wear). Dispatch a Bot Bay drone to a comet in the Star Chart." });
  if (has("bay") && !hasStorage(world))
    out.push({ sev: "warn", text: "Your Bot Bay drones have nowhere to unload — lay a Storage Floor (or build a Silo) so they can run mining trips." });

  const residents = agents.filter((a) => !a.guest).length;
  const machines = structures.filter((s) => STRUCTURES[s.kind].draw > 0).length;
  if (machines > 0 && residents === 0)
    out.push({ sev: "warn", text: "No resident crew yet — a shuttle brings crew once you have a powered Docking Port, Crew Quarters in breathable air, and meals in stock." });
  else if (residents > 0 && machines > residents * 6)
    out.push({ sev: "tip", text: "Lots of machinery per crew — add Crew Quarters so more residents arrive to keep upkeep pace." });

  // single next build-order gap
  const sealed = Object.values(world.rooms).some((r) => r.enclosed);
  if (!sealed) out.push({ sev: "warn", text: "Seal a room: lay Floor, then enclose it with Wall." });
  else if (!has("solar")) out.push({ sev: "warn", text: "Place a Solar Panel to power the station." });
  else if (!has("o2gen")) out.push({ sev: "warn", text: "Add an O₂ Generator inside a sealed room." });
  else if (!has("synth")) out.push({ sev: "warn", text: "Build a Rations Synth — it turns your biomass into meals." });
  else if (!has("pod")) out.push({ sev: "warn", text: "Build Crew Quarters — each bunk is room for one resident crew member." });
  else if (!has("dock")) out.push({ sev: "warn", text: "Build a Docking Port — a shuttle uses it to bring resident crew (and Drenn guests)." });
  else if (!has("vat")) out.push({ sev: "warn", text: "Build a Bio Vat to keep growing food before the starting biomass runs out." });

  // crew capacity free but nobody coming — name the blocking gate
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
    const fed = (g: string) => Object.values(SPECIES).some((sp) => sp.gas === g && m[sp.diet] > 0);
    const canArrive = dockPowered && [...podGases].some(fed);
    if (canArrive) out.push({ sev: "tip", text: "A crew shuttle is inbound to your free quarters." });
    else if (!dockPowered) out.push({ sev: "warn", text: "Crew can't arrive — the Docking Port is unpowered." });
    else if (podGases.size === 0) out.push({ sev: "warn", text: "Put Crew Quarters in a room with breathable air — crew won't bunk in vacuum." });
    else out.push({ sev: "warn", text: "No meals in stock — power a Synth and a shuttle will bring crew to your free quarters." });
  }

  // mining & trade
  if (has("vat") && !has("bay")) out.push({ sev: "tip", text: "Mine minerals: build a Bot Bay and dispatch its drone from the Star Chart." });
  if (has("bay") && !has("tradehub") && world.stock.minerals > 40)
    out.push({ sev: "tip", text: "Build a Trade Hub so traders buy your minerals for credits." });

  // hauling economy: storage + crew keep producers flowing, tables feed the crew
  const hasStorageFloor = world.cells.some((c) => c.type === "storage");
  const backedUp = structures.some((s) => (s.kind === "vat" || s.kind === "bay") && s.outBuf >= 8);
  if ((has("vat") || has("bay")) && !hasStorageFloor)
    out.push({ sev: "tip", text: "Lay Storage Floor — crew haul vat/drone output there; without it, producers back up and stall." });
  if (backedUp)
    out.push({ sev: "warn", text: "Output is piling up unhauled — a producer will stall. Add Storage Floor nearby and keep crew free to haul." });
  if (residents > 0 && !has("table"))
    out.push({ sev: "tip", text: "Build a Mess Table so crew gather and eat there (they'll carry meals from storage to it)." });
  // tier-gate: advanced (2+ Lab) modules each reserve warehouse capacity
  if (structures.some((s) => isStorageGated(s.kind)) && advancedSlotsUsed(world) + SLOTS_PER_ADVANCED > warehouseSlots(world))
    out.push({ sev: "tip", text: "Out of warehouse space for advanced modules — lay more Storage Floor or build a Silo before adding tier-2+ modules." });

  // recreation infrastructure + rivals sharing a room
  if (!has("rec") && agents.length > 1) out.push({ sev: "tip", text: "Build a Lounge so crew and visitors can relax and socialize." });
  if (Object.values(world.rooms).some((r) => r.harmony < -0.3))
    out.push({ sev: "warn", text: "Rivals share a room — productivity and mood suffer. Separate them, or group friends for a buff." });
  if (has("solar") && !has("battery") && p.supply - p.draw < 4)
    out.push({ sev: "tip", text: "Power margin is thin — add a Battery for safety." });

  // lodging opportunity
  const hotels = structures.filter((s) => s.kind === "hotel").length;
  const guests = agents.filter((a) => a.guest).length;
  if (has("dock") && hotels > 0 && guests >= hotels)
    out.push({ sev: "tip", text: "All Hotel Rooms occupied — add Hotel Rooms to host more paying guests." });
  else if (has("dock") && hotels === 0 && residents > 0)
    out.push({ sev: "tip", text: "Add Hotel Rooms to lodge paying guests for income." });

  if (out.length === 0)
    out.push({ sev: "tip", text: "Station stable. Expand: more Crew Quarters to grow, Hotel Rooms for income, or host a new species." });
  out.sort((a, b) => RANK[a.sev] - RANK[b.sev]);
  return out;
}

// ---- a single species' AI: speaks only for its own people ----
function speciesAdvice(world: World, sp: Species, mine: Agent[]): Advice[] {
  const out: Advice[] = [];
  const def = SPECIES[sp];
  const structures = Object.values(world.structures);
  const m = world.stock.meals;
  const residents = mine.filter((a) => !a.guest);

  // life-or-death first
  if (mine.some((a) => a.fighting))
    out.push({ sev: "critical", text: "We're trading blows — separate us from our rivals and raise morale, fast." });
  if (mine.some((a) => a.o2 < 40 || (a.suit < 25 && !isNative(world, a.cell, sp))))
    out.push({ sev: "critical", text: `We're losing air outside our ${def.gas.toUpperCase()} wing — get us back to breathable rooms.` });
  if (mine.some((a) => a.injured))
    out.push({ sev: "warn", text: "One of us is wounded — a Med Bay will heal us before we bleed out." });
  if (mine.some((a) => a.food < 35) && m[def.diet] === 0)
    out.push({ sev: "critical", text: `We're starving — no ${def.diet} stocked. ${cap(FOOD_CHAIN[def.diet])}.` });
  else if (m[def.diet] === 0)
    out.push({ sev: "warn", text: `No ${def.diet} in our larder — ${FOOD_CHAIN[def.diet]}.` });

  // comfort
  const avgMood = mine.reduce((s, a) => s + a.mood, 0) / mine.length;
  if (avgMood < 40) out.push({ sev: "warn", text: "Our morale is low — better food, rest, recreation, or fewer rivals nearby." });
  const rival = mine.some((a) => a.tension > 50);
  if (rival) {
    const foe = nearestFoe(world, sp);
    out.push({ sev: "warn", text: foe ? `Tension is rising — keep us apart from the ${SPECIES[foe].label}.` : "Tension is rising — keep us apart from species we dislike." });
  }
  // climate (mood, not lethal)
  const wrongTemp = mine.some((a) => {
    const rid = world.cells[a.cell].roomId;
    const room = rid >= 0 ? world.rooms[rid] : undefined;
    return room && room.gas === def.gas && room.temp !== def.temp;
  });
  if (wrongTemp && def.temp !== "temperate") out.push({ sev: "tip", text: `We prefer it ${def.temp} — ${TEMP_FIX[def.temp]}.` });

  // lodging — only residents bunk in Crew Quarters; guests use Hotels
  if (residents.length > 0) {
    let cap2 = 0;
    for (const s of structures) {
      if (s.kind !== "pod" || s.recipe !== sp) continue;
      const rid = world.cells[s.cell].roomId;
      if ((rid >= 0 ? world.rooms[rid]?.gas : undefined) === def.gas) cap2++;
    }
    if (cap2 < residents.length)
      out.push({ sev: "tip", text: `Not enough bunks prepped for us — set Crew Quarters (in ${def.gas.toUpperCase()}) to ${def.label}.` });
  }

  // thriving → may want to breed
  if (mine.length >= 2 && avgMood >= 70)
    out.push({ sev: "tip", text: "We're thriving — give us empty floor and we may ask to raise a brood." });

  if (out.length === 0) out.push({ sev: "tip", text: "All nominal. We're content." });
  out.sort((a, b) => RANK[a.sev] - RANK[b.sev]);
  return out;
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// The species present aboard that `sp` most dislikes (for "keep us apart" lines).
function nearestFoe(world: World, sp: Species): Species | null {
  const present = new Set<Species>();
  for (const id in world.agents) if (world.agents[id].alive) present.add(world.agents[id].species);
  let foe: Species | null = null;
  let worst = 0;
  for (const o of present) {
    if (o === sp) continue;
    const r = RELATIONS[sp][o];
    if (r < worst) { worst = r; foe = o; }
  }
  return foe;
}

// Break the advisory down into AI components: the STATION AI plus one AI per
// species currently aboard (each speaking only for its own people).
export function adviseByAI(world: World): AIAdvisor[] {
  const out: AIAdvisor[] = [{ species: "station", name: "STATION AI", advice: stationAdvice(world) }];
  const bySpecies = new Map<Species, Agent[]>();
  for (const id in world.agents) {
    const a = world.agents[id];
    if (!a.alive) continue;
    (bySpecies.get(a.species) ?? bySpecies.set(a.species, []).get(a.species)!).push(a);
  }
  // stable order: by first-seen so the cards don't jump around
  const order = world.seen.filter((s) => bySpecies.has(s));
  for (const s of bySpecies.keys()) if (!order.includes(s)) order.push(s);
  for (const sp of order) out.push({ species: sp, name: `${SPECIES[sp].label.toUpperCase()} AI`, advice: speciesAdvice(world, sp, bySpecies.get(sp)!) });
  return out;
}

// Flattened, prioritized advice across every AI (back-compat for callers/tests).
export function advise(world: World): Advice[] {
  const all = adviseByAI(world).flatMap((ai) => ai.advice);
  all.sort((a, b) => RANK[a.sev] - RANK[b.sev]);
  return all;
}
