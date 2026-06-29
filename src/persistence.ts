import { World } from "./types";
import { defaultRecipe, seedSolarSystem } from "./world";
import { SPECIES } from "./species";
import { nameFor } from "./names";

const PREFIX = "exostation.save.";
const LEGACY = "exostation.save.v1";

export type SlotId = "auto" | "1" | "2" | "3";
export const SLOTS: SlotId[] = ["auto", "1", "2", "3"];

const key = (slot: SlotId): string => PREFIX + slot;

export interface SlotInfo {
  slot: SlotId;
  savedAt: number | null; // ms epoch, or null if empty
  summary: string | null; // one-line description
}

interface SavePayload {
  savedAt: number;
  summary: string;
  world: World;
}

function timeLabel(tick: number): string {
  const s = Math.floor(tick / 10);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function summarize(w: World): string {
  let crew = 0;
  for (const id in w.agents) if (w.agents[id].alive && !w.agents[id].guest) crew++;
  const tag = w.phase === "won" ? "✓ won · " : w.phase === "lost" ? "✕ lost · " : "";
  return `${tag}¢${Math.floor(w.credits)} · ${crew} crew · ${timeLabel(w.tick)}`;
}

export function saveWorld(w: World, slot: SlotId = "auto"): boolean {
  try {
    localStorage.setItem(key(slot), serializeWorld(w));
    return true;
  } catch {
    return false;
  }
}

// Serialize the live world to a portable save string (the same wrapped payload a
// slot save uses) — for exporting a save to a downloadable file.
export function serializeWorld(w: World): string {
  const payload: SavePayload = { savedAt: Date.now(), summary: summarize(w), world: w };
  return JSON.stringify(payload);
}

// Parse a save string (wrapped payload or a legacy bare world) into a sanitized
// World, or null if it isn't valid. Used by both slot loads and file imports.
export function parseSave(text: string): World | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    const w = (parsed && typeof parsed === "object" && "world" in (parsed as object)
      ? (parsed as SavePayload).world
      : (parsed as World)) as World;
    if (!w || typeof w !== "object") return null;
    return sanitize(w);
  } catch {
    return null;
  }
}

export function deleteSave(slot: SlotId): void {
  try {
    localStorage.removeItem(key(slot));
  } catch {
    /* ignore */
  }
}

export function listSaves(): SlotInfo[] {
  return SLOTS.map((slot) => {
    let savedAt: number | null = null;
    let summary: string | null = null;
    try {
      const raw = localStorage.getItem(key(slot)) ?? (slot === "auto" ? localStorage.getItem(LEGACY) : null);
      if (raw) {
        const p = JSON.parse(raw) as Partial<SavePayload>;
        if (p && typeof p === "object" && p.world) {
          savedAt = typeof p.savedAt === "number" ? p.savedAt : 0;
          summary = typeof p.summary === "string" ? p.summary : "saved station";
        } else {
          // legacy raw-world save (no wrapper)
          savedAt = 0;
          summary = "saved station";
        }
      }
    } catch {
      /* ignore */
    }
    return { slot, savedAt, summary };
  });
}

export function hasSave(): boolean {
  return listSaves().some((s) => s.savedAt !== null);
}

// Load and sanitize a saved world from a slot. Returns null if nothing valid.
export function loadWorld(slot: SlotId = "auto"): World | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key(slot));
    if (!raw && slot === "auto") raw = localStorage.getItem(LEGACY); // migrate old single save
  } catch {
    return null;
  }
  if (!raw) return null;
  return parseSave(raw);
}

// Backfill fields missing from older saves so the sim stays valid.
function sanitize(w: World): World {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.guest) a.stay = Infinity;
    else if (a.stay == null) a.stay = 0;
    if (typeof a.fun !== "number") a.fun = 100;
    if (typeof a.relief !== "number") a.relief = 100;
    if (typeof a.injured !== "boolean") a.injured = false;
    if (typeof a.name !== "string") a.name = nameFor(a.species, +id);
    if (typeof a.mateId !== "number") a.mateId = -1;
    if (a.implantGas === undefined) a.implantGas = null;
    if (typeof a.sight !== "number") a.sight = 2 + Math.floor(Math.random() * 4);
    if (typeof a.faceX !== "number") a.faceX = 0;
    if (typeof a.faceY !== "number") a.faceY = 0;
  }
  if (!Array.isArray(w.seen)) w.seen = [];
  if (!Array.isArray(w.welcomed)) w.welcomed = [];
  if (typeof w.story !== "string") w.story = "";
  if (typeof w.storyTimer !== "number") w.storyTimer = 0;
  if (w.storyBeat !== null && typeof w.storyBeat !== "string") w.storyBeat = null;
  if (!Array.isArray(w.firedBeats)) w.firedBeats = [];
  if (typeof w.storyFlags !== "object" || w.storyFlags === null) w.storyFlags = {};
  if (!Array.isArray(w.ships)) w.ships = [];
  if (!Array.isArray(w.gods)) w.gods = [];
  if (typeof w.godTimer !== "number") w.godTimer = 0;
  if (typeof w.blackoutT !== "number") w.blackoutT = 0;
  if (typeof w.surgeT !== "number") w.surgeT = 0;
  if (w.godVerdict === undefined) w.godVerdict = null;
  if (typeof w.tradeTimer !== "number") w.tradeTimer = 0;
  if (typeof w.crewTimer !== "number") w.crewTimer = 0;
  if (typeof w.shipCooldown !== "number") w.shipCooldown = 0;
  if (!Array.isArray(w.conduits)) w.conduits = [];
  for (const c of w.conduits) { if (typeof c.hp !== "number") c.hp = 100; c.repairBy = -1; } // drop stale claims
  if (typeof w.creditRate !== "number") w.creditRate = 0;
  if (typeof w.prevCredits !== "number") w.prevCredits = w.credits;
  if (w.phase !== "won" && w.phase !== "lost") w.phase = "playing";
  if (typeof w.objectiveIx !== "number") w.objectiveIx = 0;
  if (typeof w.loseTimer !== "number") w.loseTimer = 0;
  if (!w.unlocked || typeof w.unlocked !== "object") w.unlocked = {};
  if (typeof w.eventTimer !== "number") w.eventTimer = 0;
  if (typeof w.priceMult !== "number") w.priceMult = 1;
  if (typeof w.priceT !== "number") w.priceT = 0;
  if (!Array.isArray(w.notify)) w.notify = [];
  if (typeof w.overflow !== "boolean") w.overflow = false;
  if (typeof w.raidCount !== "number") w.raidCount = 0;
  if (typeof w.encounterTimer !== "number") w.encounterTimer = 0;
  if (w.encounter === undefined) w.encounter = null;
  if (!Array.isArray(w.breaches)) w.breaches = [];
  if (!Array.isArray(w.messes)) w.messes = [];
  if (!w.reputation || typeof w.reputation !== "object") w.reputation = {};
  if (!Array.isArray(w.requests)) w.requests = [];
  if (typeof w.reqTimer !== "number") w.reqTimer = 0;
  if (!Array.isArray(w.eggs)) w.eggs = [];
  if (!Array.isArray(w.pests)) w.pests = [];
  if (!Array.isArray(w.boarders)) w.boarders = [];
  if (w.breedOffer === undefined) w.breedOffer = null;
  if (typeof w.breedTimer !== "number") w.breedTimer = 0;
  if (typeof w.barTimer !== "number") w.barTimer = 0;
  if (!Array.isArray(w.couples)) w.couples = [];
  if (!w.relThaw || typeof w.relThaw !== "object") w.relThaw = {};
  if (w.romance === undefined) w.romance = null;
  const st = w.stock as unknown as { spores?: number; microbes?: number; fuel?: number; water?: number; meals: unknown };
  if (typeof st.spores !== "number") st.spores = 0;
  if (typeof st.microbes !== "number") st.microbes = 0;
  if (typeof st.fuel !== "number") st.fuel = 0;
  if (typeof st.water !== "number") st.water = 0;
  if (typeof st.meals === "number") w.stock.meals = { rations: st.meals, fungal: 0, protein: 0, exotic: 0 };
  else if (!st.meals || typeof st.meals !== "object") w.stock.meals = { rations: 0, fungal: 0, protein: 0, exotic: 0 };
  else {
    if (typeof w.stock.meals.rations !== "number") w.stock.meals.rations = 0;
    if (typeof w.stock.meals.fungal !== "number") w.stock.meals.fungal = 0;
    if (typeof w.stock.meals.protein !== "number") w.stock.meals.protein = 0;
    if (typeof w.stock.meals.exotic !== "number") w.stock.meals.exotic = 0;
  }
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!Array.isArray(s.cells)) s.cells = [s.cell];
    if (typeof s.condition !== "number") s.condition = 100;
    if (typeof s.servicedBy !== "number") s.servicedBy = -1;
    if (typeof s.recipe !== "string") s.recipe = defaultRecipe(s.kind);
    // lodging now stores a prepped species in `recipe`; backfill legacy "" bunks
    if ((s.kind === "pod" || s.kind === "hotel") && !(s.recipe in SPECIES)) s.recipe = defaultRecipe(s.kind);
    if (typeof s.faultT !== "number") s.faultT = 0;
    if (typeof s.outBuf !== "number") s.outBuf = 0;
    if (typeof s.inBuf !== "number") s.inBuf = 0;
  }
  // Sites became orbital bodies (no grid cell). A legacy save has on-grid sites
  // (a `cell`, no `kind`/`discovered`) — discard those and re-seed a fresh system,
  // then reset every drone to idle so none references a dropped target.
  if (!w.sites || typeof w.sites !== "object") w.sites = {};
  const legacySites = Object.values(w.sites).some((s) => (s as { kind?: string }).kind === undefined);
  if (legacySites) {
    w.sites = {};
    seedSolarSystem(w);
    for (const id in w.drones) {
      const d = w.drones[id];
      d.state = "docked";
      d.siteId = -1;
      d.t = 0;
      d.cargo = 0;
    }
  } else {
    // backfill orbit fields on pre-orbit saves (kept bodies, just static before)
    for (const id in w.sites) {
      const s = w.sites[id];
      if (typeof s.orbSpeed !== "number") s.orbSpeed = 0;
      if (typeof s.parent !== "number") s.parent = -1;
    }
  }
  // a system needs at least one star to draw — give pre-star saves a lone sun
  if (!Array.isArray(w.stars)) w.stars = [];
  if (w.stars.length === 0 && Object.keys(w.sites).length > 0)
    w.stars.push({ angle: 0, dist: 0, orbSpeed: 0, color: "#ffe9a8", r: 7 });
  if (!Array.isArray(w.comets)) w.comets = [];
  for (const id in w.drones) {
    const d = w.drones[id];
    if (!["docked", "outbound", "transit", "inbound", "lost"].includes(d.state)) {
      d.state = "docked"; // old "mining" state retired
      d.t = 0;
    }
  }
  w.dirtyRooms = true;
  return w;
}
