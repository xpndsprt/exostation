import { World } from "./types";

const KEY = "exostation.save.v1";

export function saveWorld(w: World): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) != null;
  } catch {
    return false;
  }
}

// Load and sanitize a saved world. JSON can't represent Infinity, so resident
// `stay` comes back as null — restore it. Returns null if nothing valid saved.
export function loadWorld(): World | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const w = JSON.parse(raw) as World;
    for (const id in w.agents) {
      const a = w.agents[id];
      if (!a.guest) a.stay = Infinity;
      else if (a.stay == null) a.stay = 0;
    }
    if (!Array.isArray(w.seen)) w.seen = []; // older saves
    if (!Array.isArray(w.ships)) w.ships = [];
    for (const id in w.structures) {
      const s = w.structures[id];
      if (!Array.isArray(s.cells)) s.cells = [s.cell]; // older saves
      if (typeof s.condition !== "number") s.condition = 100;
      if (typeof s.servicedBy !== "number") s.servicedBy = -1;
    }
    w.dirtyRooms = true;
    return w;
  } catch {
    return null;
  }
}
