import { World } from "./types";
import { defaultRecipe } from "./world";

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
      if (typeof a.fun !== "number") a.fun = 100;
    }
    if (!Array.isArray(w.seen)) w.seen = []; // older saves
    if (!Array.isArray(w.ships)) w.ships = [];
    if (typeof w.tradeTimer !== "number") w.tradeTimer = 0;
    if (typeof w.crewTimer !== "number") w.crewTimer = 0;
    if (w.phase !== "won" && w.phase !== "lost") w.phase = "playing";
    if (typeof w.objectiveIx !== "number") w.objectiveIx = 0;
    if (typeof w.loseTimer !== "number") w.loseTimer = 0;
    if (!w.reputation || typeof w.reputation !== "object") w.reputation = {};
    if (!Array.isArray(w.requests)) w.requests = [];
    if (typeof w.reqTimer !== "number") w.reqTimer = 0;
    // stock shape: add spores, convert meals (number) -> per-line map
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
      if (!Array.isArray(s.cells)) s.cells = [s.cell]; // older saves
      if (typeof s.condition !== "number") s.condition = 100;
      if (typeof s.servicedBy !== "number") s.servicedBy = -1;
      if (typeof s.recipe !== "string") s.recipe = defaultRecipe(s.kind);
    }
    w.dirtyRooms = true;
    return w;
  } catch {
    return null;
  }
}
