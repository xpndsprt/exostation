import { World } from "./types";
import { defaultRecipe } from "./world";

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
    const payload: SavePayload = { savedAt: Date.now(), summary: summarize(w), world: w };
    localStorage.setItem(key(slot), JSON.stringify(payload));
    return true;
  } catch {
    return false;
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
  try {
    const parsed = JSON.parse(raw) as unknown;
    // new wrapped payload, or a legacy bare world
    const w = (parsed && typeof parsed === "object" && "world" in (parsed as object)
      ? (parsed as SavePayload).world
      : (parsed as World)) as World;
    return sanitize(w);
  } catch {
    return null;
  }
}

// Backfill fields missing from older saves so the sim stays valid.
function sanitize(w: World): World {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.guest) a.stay = Infinity;
    else if (a.stay == null) a.stay = 0;
    if (typeof a.fun !== "number") a.fun = 100;
  }
  if (!Array.isArray(w.seen)) w.seen = [];
  if (!Array.isArray(w.ships)) w.ships = [];
  if (typeof w.tradeTimer !== "number") w.tradeTimer = 0;
  if (typeof w.crewTimer !== "number") w.crewTimer = 0;
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
  if (!Array.isArray(w.breaches)) w.breaches = [];
  if (!w.reputation || typeof w.reputation !== "object") w.reputation = {};
  if (!Array.isArray(w.requests)) w.requests = [];
  if (typeof w.reqTimer !== "number") w.reqTimer = 0;
  const st = w.stock as unknown as { spores?: number; meals: unknown };
  if (typeof st.spores !== "number") st.spores = 0;
  if (typeof st.meals === "number") w.stock.meals = { rations: st.meals, fungal: 0 };
  else if (!st.meals || typeof st.meals !== "object") w.stock.meals = { rations: 0, fungal: 0 };
  else {
    if (typeof w.stock.meals.rations !== "number") w.stock.meals.rations = 0;
    if (typeof w.stock.meals.fungal !== "number") w.stock.meals.fungal = 0;
  }
  for (const id in w.structures) {
    const s = w.structures[id];
    if (!Array.isArray(s.cells)) s.cells = [s.cell];
    if (typeof s.condition !== "number") s.condition = 100;
    if (typeof s.servicedBy !== "number") s.servicedBy = -1;
    if (typeof s.recipe !== "string") s.recipe = defaultRecipe(s.kind);
    if (typeof s.faultT !== "number") s.faultT = 0;
  }
  w.dirtyRooms = true;
  return w;
}
