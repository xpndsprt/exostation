import { Encounter, HoverTarget, OverlayMode, Selection, Site, Speed, Species, Tool, UIState, WeirdGod, World } from "./types";
import { transitSeconds, systemDist, REBUILD_COST } from "./mining";
import { COLORS } from "./config";
import { STRUCTURES, costOf } from "./structures";
import { SPECIES } from "./species";
import { RELATIONS, effRelation } from "./relations";
import { adviseByAI, AIAdvisor } from "./advisor";
import { getRep, requestText } from "./requests";
import { moodBreakdown } from "./mood";
import { productivity } from "./harmony";
import { OBJECTIVES, currentObjective } from "./objectives";
import { UNLOCKS, isUnlocked, toolLock, poweredLabCount, canResearch, lodgingUnlocked } from "./research";
import { RESIDENT_SPECIES, HOTEL_SPECIES } from "./economy";
import { BEACON_SPECIES, moduleActive, beaconIntensity } from "./beacon";
import { encounterText, encounterChoices } from "./encounters";
import { coupleOf } from "./romance";
import { isMuted, setMuted, isMusicMuted, setMusicMuted } from "./audio";
import { storageCaps } from "./storage";
import { listSaves, SlotId } from "./persistence";
import { currentYear } from "./story";
import { GODS, WEIRD_GODS } from "./gods";
import { chronicleSaga } from "./archive";

const SP_COLOR: Record<Species, string> = {
  human: "#6ea8ff",
  drenn: "#e8c349",
  thol: "#d98a3a",
  vryl: "#8fd14f",
  korro: "#d65a4e",
  vorn: "#b256c9",
  chlorithe: "#9bd14a",
  naaz: "#6a8fd1",
  voltaar: "#d16a9b",
  sszra: "#57c2a8",
};

const GAS_SYM: Record<string, string> = { o2: "O₂", ch4: "CH₄", cl2: "Cl₂", nh3: "NH₃", h2: "H₂" };
function gasLabel(g: string): string {
  return GAS_SYM[g] ?? g;
}

// Player-facing names for food lines + the Vat/Synth recipes that make them.
const FOOD_LABEL: Record<string, string> = { rations: "Rations", fungal: "Fungal Mash", protein: "Live-Protein", exotic: "Exo-Culture" };
const SYNTH_LABEL: Record<string, string> = { rations: "Std Rations", fungal: "Fungal Mash", protein: "Live-Protein", exotic: "Exo-Culture" };
const VAT_LABEL: Record<string, string> = { biomass: "Biomass", spores: "Spores", microbes: "Microbes" };

// The Chronicler panel (top): the storyteller's current narrative line.
export function renderStory(world: World): void {
  const el = document.getElementById("storyteller");
  if (!el) return;
  if (!world.story) { el.classList.remove("show"); return; }
  el.innerHTML = `<div class="st-h">⟡ THE CHRONICLER</div><div class="st-text">${world.story}</div>`;
  el.classList.add("show");
}

interface PaletteEntry {
  t: Tool;
  label: string;
  key: string; // keyboard shortcut
  group?: string;
}

const PALETTE: PaletteEntry[] = [
  { t: "floor", label: "Floor", key: "F", group: "Build" },
  { t: "wall", label: "Wall", key: "W" },
  { t: "door", label: "Door", key: "D" },
  { t: "storage", label: "Storage Floor", key: "" },
  { t: "conduit", label: "Power Conduit", key: "U" },
  { t: "erase", label: "Erase", key: "E" },
  { t: "solar", label: "Solar Panel", key: "1", group: "Modules" },
  { t: "battery", label: "Battery", key: "2" },
  { t: "o2gen", label: "O₂ Generator", key: "3" },
  { t: "ch4gen", label: "Methane Gen", key: "4" },
  { t: "cl2gen", label: "Chlorine Gen", key: "" },
  { t: "nh3gen", label: "Ammonia Gen", key: "" },
  { t: "h2gen", label: "Hydrogen Gen", key: "" },
  { t: "synth", label: "Rations Synth", key: "5" },
  { t: "vat", label: "Bio Vat", key: "6" },
  { t: "pod", label: "Crew Quarters", key: "7" },
  { t: "hotel", label: "Hotel Room", key: "8" },
  { t: "rec", label: "Lounge", key: "9" },
  { t: "bar", label: "Bar", key: "" },
  { t: "table", label: "Mess Table", key: "" },
  { t: "library", label: "Grand Library", key: "" },
  { t: "bay", label: "Bot Bay", key: "0" },
  { t: "dock", label: "Docking Port", key: "-" },
  { t: "docklarge", label: "Large Dock", key: "" },
  { t: "docksuper", label: "Spaceport Dock", key: "" },
  { t: "fuelrefinery", label: "Fuel Refinery", key: "" },
  { t: "medbay", label: "Med Bay", key: "" },
  { t: "heater", label: "Heater", key: "" },
  { t: "cooler", label: "Cryo Unit", key: "" },
  { t: "tradehub", label: "Trade Hub", key: "M" },
  { t: "lab", label: "Research Lab", key: "R" },
  { t: "silo", label: "Storage Silo", key: "G" },
  { t: "turret", label: "Turret", key: "U" },
  { t: "lamp", label: "Light Fixture", key: "L" },
  { t: "fusion", label: "Fusion Reactor", key: "X" },
  { t: "cargoex", label: "Cargo Exchange", key: "C" },
  { t: "aicore", label: "AI Core", key: "I" },
  { t: "cmdhub", label: "Command Hub", key: "", group: "Beacon" },
  { t: "tradenexus", label: "Trade Nexus", key: "" },
  { t: "autoforge", label: "Auto-Forge", key: "" },
  { t: "bloomgarden", label: "Bloom Garden", key: "" },
  { t: "orerefinery", label: "Ore Refinery", key: "" },
  { t: "select", label: "Select", key: "S", group: "View" },
  { t: "pan", label: "Pan", key: "P" },
];

export const TOOL_KEYS: Record<string, Tool> = Object.fromEntries(
  PALETTE.map((p) => [p.key.toLowerCase(), p.t]),
);

const SPEEDS: { s: Speed; label: string; title: string }[] = [
  { s: 0, label: "❚❚", title: "Pause (Space)" },
  { s: 1, label: "▶", title: "1×" },
  { s: 2, label: "▶▶", title: "2×" },
  { s: 3, label: "▶▶▶", title: "3×" },
];

const OVERLAYS: { m: OverlayMode; label: string }[] = [
  { m: "none", label: "None" },
  { m: "power", label: "Power" },
  { m: "rooms", label: "Rooms" },
];

export interface UIHandlers {
  onSaveSlot: (slot: SlotId) => void;
  onLoadSlot: (slot: SlotId) => void;
  onDeleteSlot: (slot: SlotId) => void;
  onExportSave: () => void; // download the live world as a portable .json file
  onImportSave: (text: string) => void; // load a world from an imported file's text
  onDeconstruct: (id: number) => void;
  onToggle: (id: number) => void;
  onRecipe: (id: number) => void;
  onStarChart: (bayId: number) => void; // open the orbital chart for a Bot Bay
  onArchive: (id: number) => void; // consult the Grand Library's archivist AI
  onOverlay: (mode: OverlayMode) => void;
  onRecenter: () => void;
  onBuyUnlock: (id: string) => void;
  onCycle: (kind: string) => void; // double-click a palette tool to find its instances
  onLocateSpecies: (species: Species) => void; // click an Alienpedia entry to find them
  onNewGame: () => void; // "New Station" — wipe the live world and start fresh
}

const toolButtons = new Map<Tool, HTMLButtonElement>();
// Lodging is broken out per species (Crew Quarters + Hotel Room, one button each
// per race). Keyed `${tool}:${species}`; locked individually by lodgingUnlocked.
const lodgingButtons = new Map<string, HTMLButtonElement>();
let speedButtons: HTMLButtonElement[] = [];
let overlayButtons = new Map<OverlayMode, HTMLButtonElement>();
let saveBtn: HTMLButtonElement | null = null;

export function setupUI(state: UIState, world: World, handlers: UIHandlers): void {
  buildPalette(state, handlers);
  buildTimeControls(world);
  buildOverlayControls(handlers);
  buildSaveControls(world, handlers);
  setupCollapse();
  setupTabs();
}

// Left dock: Build / Research / Species tabs share one panel; clicking a tab
// shows that pane and hides the others.
function showTab(id: string): void {
  document.querySelectorAll<HTMLElement>("#leftpanel .lp-pane").forEach((p) => p.classList.toggle("active", p.id === id));
  document.querySelectorAll<HTMLButtonElement>("#leftpanel .lp-tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
}
function setupTabs(): void {
  document.querySelectorAll<HTMLButtonElement>("#leftpanel .lp-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => showTab(btn.dataset.tab || "palette"));
  });
}

// Lower-right panels (Tech, Requests, Alienpedia, Advisor) fold/unfold when you
// click their header. State persists in localStorage and rides on the panel's
// container class, so the per-frame innerHTML rebuilds don't disturb it.
const COLLAPSE_KEY = "exostation.collapsed";
function loadCollapsed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(COLLAPSE_KEY) || "[]") as string[]);
  } catch {
    return new Set();
  }
}
function setupCollapse(): void {
  const col = document.getElementById("rightcol");
  if (!col) return;
  const collapsed = loadCollapsed();
  for (const id of collapsed) document.getElementById(id)?.classList.add("collapsed");
  col.addEventListener("click", (e) => {
    const h = (e.target as HTMLElement).closest("h3");
    const panel = h?.parentElement as HTMLElement | null;
    if (!h || !panel || panel.parentElement?.id !== "rightcol") return;
    panel.classList.toggle("collapsed");
    const set = loadCollapsed();
    if (panel.classList.contains("collapsed")) set.add(panel.id);
    else set.delete(panel.id);
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...set]));
    } catch {
      /* ignore */
    }
  });
}

function buildPalette(state: UIState, handlers: UIHandlers): void {
  const bar = document.getElementById("palette");
  if (!bar) return;
  let grid: HTMLDivElement | null = null;
  for (const entry of PALETTE) {
    if (entry.group) {
      const h = document.createElement("div");
      h.className = "group";
      h.textContent = entry.group;
      bar.appendChild(h);
      grid = document.createElement("div");
      grid.className = "pal-grid";
      bar.appendChild(grid);
    }
    // Lodging is split into one button per species (prepped for that race).
    if (entry.t === "pod" || entry.t === "hotel") {
      const base = entry.t === "pod" ? "Quarters" : "Hotel";
      const cost = costOf(entry.t);
      // Crew Quarters only for resident species; Hotel Rooms only for visitors
      // (Drenn & Vorn never reside — they only ever come as guests).
      const species = entry.t === "pod" ? RESIDENT_SPECIES : HOTEL_SPECIES;
      for (const sp of species) {
        const b = document.createElement("button");
        const label = `${base}: ${SPECIES[sp].label}`;
        b.dataset.label = label;
        b.dataset.tool = entry.t;
        b.dataset.species = sp;
        b.style.borderLeft = `3px solid ${SP_COLOR[sp]}`;
        b.innerHTML = `<span class="nm">${label}</span><span class="hk">¢${cost}</span>`;
        b.title = label; // full name on hover (truncates in the grid)
        b.onclick = () => {
          if (b.classList.contains("locked")) return; // species not researched yet
          state.lodgingSpecies = sp;
          setActiveTool(entry.t, state);
          b.classList.add("active");
        };
        b.ondblclick = () => handlers.onCycle(entry.t);
        lodgingButtons.set(`${entry.t}:${sp}`, b);
        (grid ?? bar).appendChild(b);
      }
      continue;
    }
    const b = document.createElement("button");
    const cost = costOf(entry.t);
    const costStr = cost > 0 ? `¢${cost}` : "";
    b.dataset.label = entry.label;
    b.innerHTML = `<span class="nm">${entry.label}</span><span class="hk">${costStr ? costStr + " · " : ""}${entry.key}</span>`;
    if (entry.t === state.tool) b.classList.add("active");
    b.onclick = () => setActiveTool(entry.t, state);
    // double-click a build tool to pan-cycle through its placed instances
    if (entry.t in STRUCTURES) b.ondblclick = () => handlers.onCycle(entry.t);
    // hover shows the full name (the label truncates in the 3-col grid)
    b.title = entry.label + (entry.t in STRUCTURES ? " · double-click to find placed ones" : "");
    toolButtons.set(entry.t, b);
    (grid ?? bar).appendChild(b);
  }

  const legend = document.createElement("div");
  legend.id = "legend";
  const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  legend.innerHTML =
    `<div><span class="sw" style="background:${hex(COLORS.atmosphere)}"></span>O₂ air</div>` +
    `<div><span class="sw" style="background:#c98a3a"></span>methane (CH₄)</div>` +
    `<div><span class="sw" style="background:#e24b4b"></span>mixed — lethal</div>` +
    `<div><span class="sw" style="background:${hex(COLORS.floorOpen)}"></span>open to space</div>`;
  bar.appendChild(legend);
}

const lockedTools = new Set<string>();

export function setActiveTool(tool: Tool, state: UIState): void {
  if (lockedTools.has(tool)) return; // can't select tech that isn't researched yet
  state.tool = tool;
  for (const [, b] of toolButtons) b.classList.remove("active");
  for (const [, b] of lodgingButtons) b.classList.remove("active");
  toolButtons.get(tool)?.classList.add("active");
  showTab("palette"); // picking a tool (incl. via hotkey) reveals the Build tab
}

// Lock un-researched tools: show their name as "???" (keep the price), and
// flash a tool the moment it's unlocked so you see which button lit up.
export function refreshPalette(world: World): void {
  const prevLocked = new Set(lockedTools);
  lockedTools.clear();
  for (const [tool, btn] of toolButtons) {
    const lock = toolLock(world, tool);
    const nm = btn.querySelector(".nm") as HTMLElement | null;
    if (lock) {
      lockedTools.add(tool);
      btn.classList.add("locked");
      if (nm) nm.textContent = "🔒 " + (btn.dataset.label || ""); // lock icon like Quarters (shows what it is)
      btn.title = `Locked — research “${lock.label}” at a Research Lab`;
    } else {
      btn.classList.remove("locked");
      if (nm) nm.textContent = btn.dataset.label || "";
      btn.title = (btn.dataset.label || "") + (tool in STRUCTURES ? " · double-click to find placed ones" : "");
      if (prevLocked.has(tool)) {
        btn.classList.add("revealed"); // just researched — light it up
        setTimeout(() => btn.classList.remove("revealed"), 1100);
      }
    }
  }
  // per-species lodging: lock the races you can't host yet (first 4 are free)
  for (const [key, btn] of lodgingButtons) {
    const sp = key.split(":")[1] as Species;
    const locked = !lodgingUnlocked(world, sp);
    btn.classList.toggle("locked", locked);
    const nm = btn.querySelector(".nm") as HTMLElement | null;
    if (nm) nm.textContent = locked ? "🔒 " + (btn.dataset.label || "") : (btn.dataset.label || "");
    btn.title = locked ? `${btn.dataset.label} — locked: research to host the ${SPECIES[sp].label}` : (btn.dataset.label || "");
  }
}

function buildTimeControls(world: World): void {
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const ctl = document.createElement("span");
  ctl.id = "timectl";
  speedButtons = SPEEDS.map(({ s, label, title }) => {
    const b = document.createElement("button");
    b.className = "tbtn";
    b.textContent = label;
    b.title = title;
    if (world.speed === s) b.classList.add("active");
    b.onclick = () => setSpeed(world, s);
    ctl.appendChild(b);
    return b;
  });
  bar.appendChild(ctl);
}

export function setSpeed(world: World, s: Speed): void {
  world.speed = s;
  SPEEDS.forEach(({ s: bs }, i) => speedButtons[i]?.classList.toggle("active", bs === s));
}

function buildOverlayControls(handlers: UIHandlers): void {
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const ctl = document.createElement("span");
  ctl.id = "overlayctl";
  ctl.title = "Overlay view";
  overlayButtons = new Map();
  for (const { m, label } of OVERLAYS) {
    const b = document.createElement("button");
    b.className = "tbtn";
    b.textContent = label;
    if (m === "none") b.classList.add("active");
    b.onclick = () => {
      handlers.onOverlay(m);
      for (const [, x] of overlayButtons) x.classList.remove("active");
      b.classList.add("active");
    };
    overlayButtons.set(m, b);
    ctl.appendChild(b);
  }
  const recenter = document.createElement("button");
  recenter.className = "tbtn";
  recenter.textContent = "Recenter";
  recenter.onclick = handlers.onRecenter;
  ctl.appendChild(recenter);
  const sound = document.createElement("button");
  sound.className = "tbtn";
  sound.title = "Toggle sound";
  const sync = () => (sound.textContent = isMuted() ? "🔇" : "🔊");
  sync();
  sound.onclick = () => {
    setMuted(!isMuted());
    sync();
  };
  ctl.appendChild(sound);
  // music-only toggle (independent of the master sound mute)
  const music = document.createElement("button");
  music.className = "tbtn";
  music.title = "Toggle music";
  music.textContent = "🎵";
  const syncMusic = () => {
    const off = isMusicMuted();
    music.style.opacity = off ? "0.4" : "1";
    music.style.textDecoration = off ? "line-through" : "none";
    music.title = off ? "Music off — click to play" : "Music on — click to mute";
  };
  syncMusic();
  music.onclick = () => {
    setMusicMuted(!isMusicMuted());
    syncMusic();
  };
  ctl.appendChild(music);
  bar.appendChild(ctl);
}

let savesHandlers: UIHandlers | null = null;

function buildSaveControls(world: World, handlers: UIHandlers): void {
  void world;
  savesHandlers = handlers;
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const wrap = document.createElement("span");
  wrap.id = "savectl";
  saveBtn = document.createElement("button");
  saveBtn.className = "tbtn";
  saveBtn.textContent = "Saves";
  saveBtn.onclick = () => openSaves();
  wrap.appendChild(saveBtn);
  bar.appendChild(wrap);

  // close the modal on backdrop click
  const modal = document.getElementById("saves");
  modal?.addEventListener("click", (e) => {
    if (e.target === modal) closeSaves();
  });

  document.getElementById("saves-new")?.addEventListener("click", () => {
    closeSaves();
    handlers.onNewGame();
  });

  // portable save: export the live world to a file, or import one from disk
  document.getElementById("saves-export")?.addEventListener("click", () => handlers.onExportSave());
  const fileInput = document.getElementById("saves-import-file") as HTMLInputElement | null;
  document.getElementById("saves-import")?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      handlers.onImportSave(String(r.result));
      renderSaves(); // imported world becomes the live state; refresh slot summaries
    };
    r.readAsText(f);
    fileInput.value = ""; // let the same file be re-imported later
  });
}

export function markSaved(): void {
  if (!saveBtn) return;
  saveBtn.textContent = "Saved ✓";
  setTimeout(() => {
    if (saveBtn) saveBtn.textContent = "Saves";
  }, 1400);
}

function fmtAgo(ms: number): string {
  if (!ms) return "saved";
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function openSaves(): void {
  renderSaves();
  document.getElementById("saves")?.classList.add("show");
}
export function closeSaves(): void {
  document.getElementById("saves")?.classList.remove("show");
}

function renderSaves(): void {
  const body = document.getElementById("saves-body");
  if (!body || !savesHandlers) return;
  const h = savesHandlers;
  const info = listSaves();
  const label = (s: SlotId) => (s === "auto" ? "Autosave" : `Slot ${s}`);
  body.innerHTML = info
    .map((si) => {
      const empty = si.savedAt === null;
      return (
        `<div class="slot"><div class="slot-h"><b>${label(si.slot)}</b>` +
        `<span class="muted">${empty ? "empty" : fmtAgo(si.savedAt as number)}</span></div>` +
        `<div class="slot-sum">${empty ? "&mdash;" : si.summary}</div>` +
        `<div class="slot-btns">` +
        `<button data-act="save" data-slot="${si.slot}">Save</button>` +
        `<button data-act="load" data-slot="${si.slot}"${empty ? " disabled" : ""}>Load</button>` +
        `<button class="danger" data-act="del" data-slot="${si.slot}"${empty ? " disabled" : ""}>Del</button>` +
        `</div></div>`
      );
    })
    .join("");
  body.querySelectorAll("button[data-act]").forEach((b) => {
    const el = b as HTMLButtonElement;
    const slot = el.dataset.slot as SlotId;
    el.onclick = () => {
      if (el.dataset.act === "save") h.onSaveSlot(slot);
      else if (el.dataset.act === "load") h.onLoadSlot(slot);
      else h.onDeleteSlot(slot);
      renderSaves(); // refresh timestamps/summaries
    };
  });
}

export function pushAlert(
  text: string,
  kind: "info" | "warn" | "bad" = "info",
  onClick?: () => void,
): void {
  const box = document.getElementById("alerts");
  if (!box) return;
  // group identical consecutive messages
  const last = box.lastElementChild as HTMLElement | null;
  if (last && last.dataset.msg === text) {
    const n = (parseInt(last.dataset.count || "1", 10) || 1) + 1;
    last.dataset.count = String(n);
    last.textContent = `${text} ×${n}`;
    return;
  }
  const el = document.createElement("div");
  el.className = "toast" + (kind === "info" ? "" : " " + kind) + (onClick ? " clickable" : "");
  el.dataset.msg = text;
  el.dataset.count = "1";
  el.textContent = text;
  if (onClick) el.onclick = onClick;
  box.appendChild(el);
  setTimeout(() => el.remove(), 5200);
  while (box.children.length > 6) box.firstChild?.remove();
}

function bar(value: number, color: string): string {
  // round the width so a continuously-changing value (e.g. condition) doesn't
  // make the panel markup churn every tick — keeps the action buttons stable.
  const v = Math.round(Math.max(0, Math.min(100, value)));
  return `<div class="bar"><i style="width:${v}%;background:${color}"></i></div>`;
}

function chip(icon: string, body: string, bad = false): string {
  return `<span class="chip${bad ? " bad" : ""}"><span class="ic">${icon}</span>${body}</span>`;
}

export function updateHud(world: World): void {
  const p = world.power;
  const pct = p.batteryMax > 0 ? Math.round((p.battery / p.batteryMax) * 100) : 0;

  let alive = 0;
  let dead = 0;
  let guests = 0;
  let moodSum = 0;
  for (const id in world.agents) {
    const a = world.agents[id];
    if (a.alive) {
      alive++;
      moodSum += a.mood;
      if (a.guest) guests++;
    } else dead++;
  }
  const residents = alive - guests;
  let pods = 0;
  let hotels = 0;
  for (const id in world.structures) {
    const k = world.structures[id].kind;
    if (k === "pod") pods++;
    else if (k === "hotel") hotels++;
  }
  const avgMood = alive > 0 ? Math.round(moodSum / alive) : 0;
  const seen = new Set<number>();
  let breathable = 0;
  for (const c of world.cells) {
    if (c.roomId >= 0 && !seen.has(c.roomId)) {
      seen.add(c.roomId);
      const g = world.rooms[c.roomId]?.gas;
      if (g && g !== "none" && g !== "mixed") breathable++;
    }
  }

  const st = world.stock;
  const caps = storageCaps(world);
  const status = document.getElementById("status");
  if (status) {
    const rate = world.creditRate;
    const rateStr = `${rate >= 0 ? "+" : "−"}${Math.abs(rate).toFixed(1)}/s`;
    status.innerHTML =
      chip("📅", `Yr ${currentYear(world)}`) +
      chip("¢", `<b>${Math.floor(world.credits)}</b> <span class="muted">${rateStr}</span>`, rate < -0.05) +
      chip(
        "⚡",
        `${p.supply}/${p.draw}<span class="pbar"><i style="width:${pct}%"></i></span>`,
        p.brownout,
      ) +
      chip("👥", `${residents}/${pods}${dead ? ` <span class="muted">${dead}✕</span>` : ""}`, residents > pods) +
      chip("🏨", `${guests}/${hotels}`) +
      chip("🙂", `${avgMood}%`, alive > 0 && avgMood < 35) +
      chip(
        "🍱",
        `${Math.floor(st.meals.rations)}/${Math.floor(st.meals.fungal)}` +
          (st.meals.protein > 0 ? ` ·${Math.floor(st.meals.protein)}pr` : "") +
          (st.meals.exotic > 0 ? ` ·${Math.floor(st.meals.exotic)}ex` : ""),
        st.meals.rations >= caps.rations * 0.95 ||
          st.meals.fungal >= caps.fungal * 0.95 ||
          st.meals.protein >= caps.protein * 0.95 ||
          st.meals.exotic >= caps.exotic * 0.95,
      ) +
      chip("🌱", `${Math.floor(st.biomass)}/${caps.biomass}${st.spores > 0 ? ` ·${Math.floor(st.spores)}sp` : ""}${st.microbes > 0 ? ` ·${Math.floor(st.microbes)}mi` : ""}`, st.biomass >= caps.biomass * 0.95) +
      chip("⛏", `${Math.floor(st.minerals)}/${caps.minerals}`, st.minerals >= caps.minerals * 0.95) +
      (st.fuel > 0 ? chip("⛽", `${Math.floor(st.fuel)}/${caps.fuel}`, st.fuel >= caps.fuel * 0.95) : "") +
      chip("▦", `${seen.size} <span class="muted">(${breathable} air)</span>`);
  }

  const banner = document.getElementById("banner");
  banner?.classList.toggle("show", p.brownout);

  const wm = document.getElementById("watermark");
  if (wm) wm.textContent = world.speed === 0 ? "❚❚ PAUSED" : `▶ ${world.speed}×`;
}

// Guided opening overlay (M33). Ticks steps off from live world state and
// self-dismisses once the first crew arrive. Shown only until completed/skipped
// (a localStorage flag), so returning players aren't nagged.
const TUT_KEY = "exostation.tutorialSeen";
function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUT_KEY) === "1";
  } catch {
    return false;
  }
}
function setTutorialSeen(): void {
  try {
    localStorage.setItem(TUT_KEY, "1");
  } catch {
    /* ignore */
  }
}

// ---- new-station intro: a one-time briefing on the Beacon goal + species rules ----
const INTRO_KEY = "exostation.introSeen";
let introShown = false;
export function isIntroOpen(): boolean {
  return introShown;
}
// Has the player seen the intro before (so a plain page reload doesn't re-nag)?
export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
}
// Show the briefing; calls onClose when dismissed (the caller resumes the sim).
export function showIntro(onClose: () => void): void {
  const el = document.getElementById("intro");
  if (!el) {
    onClose();
    return;
  }
  introShown = true;
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* ignore */
  }
  const go = el.querySelector(".intro-go") as HTMLButtonElement;
  const done = () => {
    el.classList.remove("show");
    introShown = false;
    go.removeEventListener("click", done);
    onClose();
  };
  go.addEventListener("click", done);
  el.classList.add("show");
}

let tutSig = ""; // last-rendered checklist signature — avoids rebuilding every frame
let tutWired = false; // the Skip handler is delegated to the stable container, once
export function renderTutorial(world: World): void {
  const el = document.getElementById("tutorial");
  if (!el) return;
  // Delegate Skip to the container (which never gets replaced) so a tap survives
  // any innerHTML rebuild — fixes the button being unresponsive on touch devices.
  if (!tutWired) {
    tutWired = true;
    el.addEventListener("click", (e) => {
      if ((e.target as HTMLElement | null)?.id === "tut-skip") {
        setTutorialSeen();
        el.classList.remove("show");
        tutSig = "";
      }
    });
  }
  let residents = 0;
  for (const id in world.agents) if (world.agents[id].alive && !world.agents[id].guest) residents++;
  if (tutorialSeen() || residents > 0) {
    if (residents > 0) setTutorialSeen(); // first crew arrived — goal achieved
    el.classList.remove("show");
    return;
  }
  const has = (k: string) => Object.values(world.structures).some((s) => s.kind === k);
  const sealed = Object.values(world.rooms).some((r) => r.enclosed);
  const powered = world.power.supply > 0;
  const air = Object.values(world.rooms).some((r) => r.gas !== "none" && r.gas !== "mixed");
  const steps: [string, boolean][] = [
    ["Seal a room — Floor, then Wall around it", sealed],
    ["Power it — a Solar Panel on the hull", powered],
    ["Add an O₂ Generator inside", air],
    ["Build a Rations Synth", has("synth")],
    ["Add Crew Quarters", has("pod")],
    ["Build a Docking Port", has("dock")],
  ];
  // only rebuild the markup when a step's state actually changes (not every frame)
  const sig = steps.map(([, done]) => (done ? "1" : "0")).join("");
  if (el.classList.contains("show") && sig === tutSig) return;
  tutSig = sig;
  const rows = steps.map(([t, done]) => `<li class="${done ? "done" : ""}">${done ? "✓" : "○"} ${t}</li>`).join("");
  el.innerHTML =
    `<h3>▶ GETTING STARTED</h3><ol>${rows}</ol>` +
    `<div class="tut-foot"><span>A shuttle brings your first crew once these are done.</span>` +
    `<button id="tut-skip">Skip</button></div>`;
  el.classList.add("show");
}

// Topbar scenario-objective indicator with a progress bar.
// The objective now lives inside the Advisor panel (see objectiveHtml/renderAdvisor);
// keep this to clear the old top-bar slot.
export function renderObjective(_world: World): void {
  const el = document.getElementById("objective");
  if (el) el.innerHTML = "";
}

// The current-goal bar markup, hosted at the top of the Advisor panel.
function objectiveHtml(world: World): string {
  const obj = world.phase === "playing" ? currentObjective(world) : null;
  if (!obj) return "";
  const cur = Math.min(obj.target, Math.floor(obj.progress(world)));
  const pct = Math.round((cur / obj.target) * 100);
  const u = obj.unit || "";
  return (
    `<div class="goalbar${pct >= 100 ? " done" : ""}">` +
    `<span class="gtag">🎯 ${world.objectiveIx + 1}/${OBJECTIVES.length}</span>` +
    `<span class="goal">${obj.label}</span>` +
    `<span class="ob"><i style="width:${pct}%"></i></span>` +
    `<span class="num">${u}${cur} / ${u}${obj.target}</span>` +
    `</div>`
  );
}

// Victory / defeat modal. The primary button's action is supplied by the caller
// (continue in free play on a win; start a fresh station on a loss).
export function showEndBanner(phase: "won" | "lost", label: string, onAction: () => void): void {
  const el = document.getElementById("endbanner");
  if (!el) return;
  const title = el.querySelector(".title") as HTMLElement | null;
  const sub = el.querySelector(".sub") as HTMLElement | null;
  const btn = el.querySelector("button") as HTMLButtonElement | null;
  el.classList.toggle("win", phase === "won");
  el.classList.toggle("lose", phase === "lost");
  if (title) title.textContent = phase === "won" ? "STATION SECURED" : "STATION LOST";
  if (sub)
    sub.textContent =
      phase === "won"
        ? "You cleared every objective. Keep building in free play."
        : "Your crew are gone and the station can no longer draw new arrivals.";
  if (btn) {
    btn.textContent = label;
    btn.onclick = () => {
      hideEndBanner();
      onAction();
    };
  }
  el.classList.add("show");
}

export function hideEndBanner(): void {
  document.getElementById("endbanner")?.classList.remove("show");
}

// The defeat screen: a post-mortem (why the station died) and a brutal letter
// from the Emperor, with a single Continue button at the bottom (→ new station).
let defeatShown = false;
export function isDefeatOpen(): boolean {
  return defeatShown;
}
export function showDefeat(reasons: string[], letter: string, onContinue: () => void): void {
  const el = document.getElementById("defeat");
  if (!el) {
    onContinue();
    return;
  }
  defeatShown = true;
  (el.querySelector(".def-reasons") as HTMLElement).innerHTML =
    `<h4>Cause of death</h4><ul>${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>`;
  (el.querySelector(".def-letter") as HTMLElement).innerHTML =
    letter.split("\n\n").map((p) => `<p>${p}</p>`).join("");
  const go = el.querySelector(".def-go") as HTMLButtonElement;
  const done = () => { el.classList.remove("show"); defeatShown = false; go.removeEventListener("click", done); onContinue(); };
  go.addEventListener("click", done);
  el.scrollTop = 0;
  el.classList.add("show");
}

// Compact hover tooltip.
export function showTooltip(world: World, target: HoverTarget, x: number, y: number): void {
  const tip = document.getElementById("tooltip");
  if (!tip || !target) {
    tip?.classList.remove("show");
    return;
  }
  let html = "";
  if (target.kind === "agent") {
    const a = world.agents[target.id];
    if (!a) return hideTooltip();
    const name = `${a.name} <span class="muted">· ${SPECIES[a.species].label}</span>`;
    const sgn = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}`;
    let moodLine = `<div>Mood ${Math.round(a.mood)}%</div>`;
    if (a.alive) {
      const b = moodBreakdown(world, a);
      moodLine =
        `<div>Mood ${Math.round(a.mood)}% <span class="muted">→ ${Math.round(b.target)}</span></div>` +
        `<div class="muted">base 50 · needs ${sgn(b.needs)} · neighbors ${sgn(b.social)} · room ${sgn(b.harmony)}${b.command ? ` · command ${sgn(b.command)}` : ""}${b.overflow ? ` · waste ${sgn(b.overflow)}` : ""}${b.temp ? ` · climate ${sgn(b.temp)}` : ""}</div>`;
    }
    html =
      `<h4>${name}${a.guest ? " (guest)" : ""}</h4>` +
      `<div>${gasLabel(SPECIES[a.species].gas)} ${Math.round(a.o2)}%${a.suit < 100 ? ` · Suit ${Math.round(a.suit)}%` : ""} · Food ${Math.round(a.food)}% · Rest ${Math.round(a.rest)}% · Fun ${Math.round(a.fun)}%</div>` +
      moodLine +
      `<div class="muted">${a.alive ? a.task?.type ?? "idle" : "dead"}${a.guest && isFinite(a.stay) ? ` · leaves ${Math.max(0, Math.round(a.stay))}s` : ""}</div>`;
  } else if (target.kind === "structure") {
    const s = world.structures[target.id];
    if (!s) return hideTooltip();
    const def = STRUCTURES[s.kind];
    const cc = s.condition <= 0 ? "#e24b4b" : s.condition < 60 ? "#e8a33d" : "#49d17a";
    html =
      `<h4>${def.label}</h4>` +
      `<div>${def.gen ? `+${def.gen}` : def.draw ? `−${def.draw}` : "0"} PU` +
      (def.draw > 0 ? ` · <span style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "powered" : s.condition <= 0 ? "broken" : "unpowered"}</span>` : "") +
      (s.kind === "fusion" ? ` · <span style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "fueled" : "OUT OF FUEL — needs minerals"}</span>` : "") +
      `</div>` +
      (s.kind in BEACON_SPECIES
        ? `<div>Beacon charge <b>${Math.round(s.timer)}%</b> · <span style="color:${moduleActive(world, s) ? "#49d17a" : "#e8a33d"}">${moduleActive(world, s) ? "charging" : `idle — needs a ${SPECIES[BEACON_SPECIES[s.kind]!].label}`}</span></div>`
        : "") +
      (def.draw > 0
        ? `<div>Condition <span style="color:${cc}">${Math.round(s.condition)}%</span>${s.servicedBy >= 0 ? " · being serviced" : ""}</div>`
        : "");
  } else if (target.kind === "cell") {
    const c = world.cells[target.cell];
    const cx = target.cell % world.w;
    const cy = (target.cell / world.w) | 0;
    const kind = c.type === "floor" ? (c.enclosed ? "sealed floor" : "open floor") : c.type;
    const room = c.roomId >= 0 ? world.rooms[c.roomId] : undefined;
    const gas = room?.gas || "none";
    const air = gas === "none" ? "no air" : gas === "mixed" ? "MIXED ☠" : gasLabel(gas);
    html = `<div class="muted">${cx},${cy} · ${kind}${c.type === "floor" ? ` · ${air}` : ""}</div>`;
    if (room && c.type === "floor") {
      const mult = productivity(room.harmony);
      const word = room.harmony > 0.2 ? "harmonious" : room.harmony < -0.2 ? "tense" : "neutral";
      const col = room.harmony > 0.2 ? "#49d17a" : room.harmony < -0.2 ? "#e8a33d" : "#8b93a6";
      html += `<div>Room <span style="color:${col}">${word} ${room.harmony >= 0 ? "+" : "−"}${Math.abs(room.harmony).toFixed(2)}</span> → ×${mult.toFixed(2)} production</div>`;
    }
  }
  tip.innerHTML = html;
  // the tooltip is zoomed with the rest of the UI — divide cursor coords by the
  // UI scale so it still lands under the pointer.
  const z = (window as unknown as { UI_SCALE?: number }).UI_SCALE || 1;
  tip.style.left = `${(x + 14) / z}px`;
  tip.style.top = `${(y + 14) / z}px`;
  tip.classList.add("show");
}

export function hideTooltip(): void {
  document.getElementById("tooltip")?.classList.remove("show");
}

const GAS_LABEL: Record<string, string> = { o2: "Oxygen", ch4: "Methane", cl2: "Chlorine", nh3: "Ammonia", h2: "Hydrogen" };

// Active species requests (goals).
export function renderRequests(world: World): void {
  const el = document.getElementById("requests");
  if (!el) return;
  if (world.requests.length === 0) {
    el.innerHTML = `<h3>📋 REQUESTS</h3><div class="empty">No active requests.</div>`;
    return;
  }
  const rows = world.requests
    .map((r) => {
      const pct = Math.max(0, Math.min(100, (r.t / 120) * 100));
      return (
        `<div class="req"><span class="txt">${requestText(r)}</span>` +
        `<span class="meta">reward ¢${r.reward} · +${r.rep} rep · ${Math.ceil(r.t)}s left</span>` +
        `<span class="tbar"><i style="width:${pct}%"></i></span></div>`
      );
    })
    .join("");
  el.innerHTML = `<h3>📋 REQUESTS</h3>${rows}`;
}

// Tech panel: spend credits at a powered Research Lab to unlock advanced
// modules and species food chains. Hidden once everything is researched.
let techOnBuy: ((id: string) => void) | null = null;
let alienOnLocate: ((s: Species) => void) | null = null;

export function renderTech(world: World, onBuy: (id: string) => void): void {
  techOnBuy = onBuy;
  const el = document.getElementById("tech");
  if (!el) return;
  // Delegate clicks to the stable container — the panel's innerHTML is rebuilt
  // every redraw, so per-button handlers would be destroyed mid-click.
  if (!el.dataset.wired) {
    el.dataset.wired = "1";
    el.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("button[data-id]") as HTMLButtonElement | null;
      if (btn && techOnBuy) techOnBuy(btn.dataset.id as string); // always fire — the handler explains any block
    });
  }
  const locked = UNLOCKS.filter((u) => !isUnlocked(world, u.id));
  if (locked.length === 0) {
    if (el.dataset.sig !== "none") {
      el.dataset.sig = "none";
      el.innerHTML = "";
      el.style.display = "none";
    }
    return;
  }
  const labCount = poweredLabCount(world);
  const anyLab = Object.values(world.structures).some((s) => s.kind === "lab");
  // Only rebuild when something visible changes. Rebuilding the panel's HTML
  // every frame would destroy a button mid-click, so the click never registers.
  const states = locked.map((u) => canResearch(world, u));
  const sig = `${labCount}|${anyLab}|${locked.map((u, i) => `${u.id}:${states[i].ok ? 1 : 0}:${states[i].reason ?? ""}`).join(",")}`;
  if (el.dataset.sig === sig) return;
  el.dataset.sig = sig;
  el.style.display = "";
  const labNote = labCount > 0
    ? ` <span class="muted">— ${labCount} Lab${labCount > 1 ? "s" : ""}</span>`
    : anyLab ? ' <span class="muted">— Lab unpowered</span>' : ' <span class="muted">— build a Lab</span>';
  const head = `<h3>🔬 TECH${labNote}</h3>`;
  const rows = locked
    .map((u, i) => {
      const st = states[i];
      const label = st.ok ? "Research" : st.reason ?? "Locked";
      // prerequisite / exclusivity note, so the branching structure is legible
      const reqLabel = (u.requires ?? []).map((r) => UNLOCKS.find((x) => x.id === r)?.label ?? r).join(", ");
      const note = reqLabel ? `<div class="ul-d muted">After: ${reqLabel}</div>` : "";
      const excl = (u.excludes ?? []).length ? `<div class="ul-d muted">One doctrine only</div>` : "";
      return (
        `<div class="unlock"><div class="ul-h"><span class="goal">${u.label}</span><span class="num">🔬×${u.labs} · ¢${u.cost}</span></div>` +
        `<div class="ul-d">${u.desc}</div>${note}${excl}` +
        `<button data-id="${u.id}" class="${st.ok ? "" : "cant"}" title="${label}">${label}</button></div>`
      );
    })
    .join("");
  el.innerHTML = head + rows;
}

// Alienpedia: a reference card for every species that has visited the station.
// Click an entry to pan to that species and ring them; shows live count + mood.
export function renderAlienpedia(world: World, onLocate?: (s: Species) => void): void {
  const el = document.getElementById("alienpedia");
  if (!el) return;
  alienOnLocate = onLocate ?? null;
  if (!el.dataset.wired) {
    el.dataset.wired = "1";
    el.addEventListener("click", (e) => {
      const ent = (e.target as HTMLElement).closest(".ent.locatable") as HTMLElement | null;
      if (ent && alienOnLocate) alienOnLocate(ent.dataset.sp as Species);
    });
  }
  if (world.seen.length === 0) {
    if (el.dataset.sig !== "empty") {
      el.dataset.sig = "empty";
      el.innerHTML = `<h3>📖 ALIENPEDIA</h3><div class="empty">No species encountered yet.</div>`;
    }
    return;
  }
  const present: Record<string, number> = {};
  const moodSum: Record<string, number> = {};
  for (const id in world.agents) {
    const a = world.agents[id];
    if (a.alive) {
      present[a.species] = (present[a.species] || 0) + 1;
      moodSum[a.species] = (moodSum[a.species] || 0) + a.mood;
    }
  }
  // Only rebuild the DOM when something visible actually changes — mood is
  // quantized to steps of 10 so a drifting average doesn't thrash the panel
  // every second. Keeps the card stable so you can scroll it.
  const moodOf = (s: Species): number => (present[s] ? Math.round(moodSum[s] / present[s] / 10) * 10 : 0);
  const sig = world.seen
    .map((s) => `${s}:${present[s] || 0}:${moodOf(s)}:${Math.round(getRep(world, s))}`)
    .join("|") + `|c${world.couples?.length ?? 0}`; // couples thaw relations → refresh the matrix
  if (el.dataset.sig === sig) return; // nothing meaningful changed
  el.dataset.sig = sig;
  // Preserve scroll position across the (now-rare) rebuilds so a scrolled-down
  // reader isn't snapped back to the top.
  const prevList = el.querySelector(".ped-list") as HTMLElement | null;
  const prevScroll = prevList ? prevList.scrollTop : 0;

  const entries = world.seen
    .map((s) => {
      const d = SPECIES[s];
      const likes: string[] = [];
      const dislikes: string[] = [];
      for (const o in RELATIONS[s]) {
        if (o === s) continue;
        const v = RELATIONS[s][o as Species];
        if (v > 0) likes.push(SPECIES[o as Species].label);
        else if (v < 0) dislikes.push(SPECIES[o as Species].label);
      }
      const rel =
        [likes.length ? "likes " + likes.join(", ") : "", dislikes.length ? "dislikes " + dislikes.join(", ") : ""]
          .filter(Boolean)
          .join(" · ") || "neutral to all";
      const here = present[s] || 0;
      const mood = moodOf(s);
      const rep = Math.round(getRep(world, s));
      const aboard = here ? ` · ${here} aboard · 🙂${mood}%` : "";
      return (
        `<div class="ent${here ? " locatable" : ""}"${here ? ` data-sp="${s}"` : ""}><div class="hd"><span class="d" style="background:${SP_COLOR[s]}"></span>${d.label}` +
        `<span class="role">${d.role}${aboard}</span></div>` +
        `<div class="stat">Reputation <b>${rep}</b><span class="rep"><i style="width:${rep}%"></i></span></div>` +
        `<div class="stat">Breathes <b>${GAS_LABEL[d.gas] ?? d.gas}</b> · Eats <b>${FOOD_LABEL[d.diet] ?? d.diet}</b> · Power <b>${d.power}</b></div>` +
        `<div class="stat">${rel}</div>` +
        `<div class="stat" style="color:#9fd8a0">⭐ ${d.trait}</div>` +
        `<div class="blurb">${d.blurb}</div></div>`
      );
    })
    .join("");
  // relations matrix — how each row species feels about each column species
  const sp = world.seen;
  const cellSym = (r: Species, c: Species): { ch: string; col: string } => {
    if (r === c) return { ch: "·", col: "#6b7488" };
    const v = effRelation(world, r, c);
    if (v <= -8) return { ch: "−", col: "#e24b4b" };
    if (v >= 8) return { ch: "+", col: "#49d17a" };
    return { ch: "∗", col: "#8b93a6" };
  };
  const dot = (s: Species) => `<span class="rm-c"><span class="d" style="background:${SP_COLOR[s]}" title="${SPECIES[s].label}"></span></span>`;
  let matrix = `<div class="relmx"><div class="rm-row"><span class="rm-c"></span>${sp.map(dot).join("")}</div>`;
  for (const r of sp) {
    matrix += `<div class="rm-row">${dot(r)}${sp.map((c) => { const x = cellSym(r, c); return `<span class="rm-c" style="color:${x.col}">${x.ch}</span>`; }).join("")}</div>`;
  }
  matrix += `<div class="rm-key">row→col: <b style="color:#e24b4b">−</b> hate · <b style="color:#8b93a6">∗</b> ok · <b style="color:#49d17a">+</b> love</div></div>`;

  el.innerHTML = `<h3>📖 ALIENPEDIA</h3>${matrix}<div class="ped-list">${entries}</div>`;
  const newList = el.querySelector(".ped-list") as HTMLElement | null;
  if (newList) newList.scrollTop = prevScroll;
}

// Lower-centre advisory board, now broken into AI components: a STATION AI for
// infrastructure plus one AI per species aboard, each speaking only for its own.
export function renderAdvisor(world: World): void {
  const el = document.getElementById("advisor");
  if (!el) return;
  const card = (ai: AIAdvisor): string => {
    const isStation = ai.species === "station";
    const color = isStation ? "#6ea8ff" : SP_COLOR[ai.species as Species];
    const limit = isStation ? 4 : 2;
    const items = ai.advice
      .slice(0, limit)
      .map((a) => `<li class="${a.sev}"><span class="mk"></span><span>${a.text}</span></li>`)
      .join("");
    const label = isStation ? `🤖 ${ai.name}` : ai.name;
    return (
      `<div class="ai${isStation ? " station" : ""}">` +
      `<div class="aihead"><span class="d" style="background:${color};color:${color}"></span>${label}</div>` +
      `<ul class="advice" style="color:#cdd4e2">${items}</ul></div>`
    );
  };
  const ais = adviseByAI(world);
  const station = ais.filter((a) => a.species === "station");
  const species = ais.filter((a) => a.species !== "station");
  el.innerHTML =
    `<h3>🤖 STATION ADVISORS</h3>` +
    objectiveHtml(world) +
    `<div class="ais">${station.map(card).join("")}${species.map(card).join("")}</div>`;
}

export function showDragLabel(text: string, x: number, y: number, bad = false): void {
  const el = document.getElementById("draglabel");
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#ff6a6a" : "#d7dbe2";
  const z = (window as unknown as { UI_SCALE?: number }).UI_SCALE || 1;
  el.style.left = `${(x + 14) / z}px`;
  el.style.top = `${(y - 22) / z}px`;
  el.classList.add("show");
}

export function hideDragLabel(): void {
  document.getElementById("draglabel")?.classList.remove("show");
}

// The panel re-renders often, which wipes any per-button listeners. So we bind ONE
// delegated click listener to the stable panel element (it reads which structure to
// act on from module state) — it survives every innerHTML rewrite. We also only
// rewrite the DOM when the markup actually changes (bar widths are rounded so a
// drifting value doesn't churn it).
let infoHandlers: UIHandlers | null = null;
let infoStructId = -1; // structure the action buttons target
let infoWired = false;
let lastInfoHtml = "";

export function updateInfo(world: World, sel: Selection, handlers: UIHandlers): void {
  const panel = document.getElementById("infopanel");
  if (!panel) return;
  infoHandlers = handlers;
  if (!infoWired) {
    infoWired = true;
    panel.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
      if (!btn || !infoHandlers || infoStructId < 0) return;
      switch (btn.dataset.act) {
        case "remove": infoHandlers.onDeconstruct(infoStructId); break;
        case "toggle": infoHandlers.onToggle(infoStructId); break;
        case "recipe": infoHandlers.onRecipe(infoStructId); break;
        case "starchart": infoHandlers.onStarChart(infoStructId); break;
        case "archive": infoHandlers.onArchive(infoStructId); break;
      }
    });
  }
  infoStructId = sel && sel.kind === "structure" ? sel.id : -1;
  if (!sel) {
    panel.classList.remove("show");
    lastInfoHtml = "";
    return;
  }

  let html = "";
  let actions = "";
  if (sel.kind === "agent") {
    const a = world.agents[sel.id];
    if (!a) return void panel.classList.remove("show");
    const sp = SPECIES[a.species].label;
    html += `<h3>${a.name} <span style="font-weight:400;color:#9aa3b6">· ${sp}${a.guest ? ", guest" : ""}</span></h3>`;
    html += `<div class="row"><span>O₂</span><b>${Math.round(a.o2)}%</b></div>${bar(a.o2, a.o2 > 30 ? "#49d17a" : "#e24b4b")}`;
    if (a.suit < 100) html += `<div class="row"><span>Suit</span><b>${Math.round(a.suit)}%</b></div>${bar(a.suit, "#9fd8ff")}`;
    html += `<div class="row"><span>Food</span><b>${Math.round(a.food)}%</b></div>${bar(a.food, "#6ea8ff")}`;
    html += `<div class="row"><span>Rest</span><b>${Math.round(a.rest)}%</b></div>${bar(a.rest, "#9b6cd5")}`;
    html += `<div class="row"><span>Fun</span><b>${Math.round(a.fun)}%</b></div>${bar(a.fun, "#c05fa8")}`;
    const mc = a.mood >= 60 ? "#49d17a" : a.mood >= 35 ? "#e8c349" : "#e24b4b";
    html += `<div class="row"><span>Mood</span><b>${Math.round(a.mood)}%</b></div>${bar(a.mood, mc)}`;
    if (a.health < 100 || a.tension > 0) {
      html += `<div class="row"><span>Health</span><b>${Math.round(a.health)}%</b></div>${bar(a.health, "#e24b4b")}`;
      html += `<div class="row"><span>Tension</span><b>${Math.round(a.tension)}%</b></div>`;
    }
    const couple = coupleOf(world, a.id);
    if (couple) {
      const mate = world.agents[a.id === couple.aId ? couple.bId : couple.aId];
      html += `<div class="row"><span>❤ In love with</span><b style="color:#ff9ec4">${mate ? mate.name : "—"}</b></div>`;
      html += `<div class="row"><span>Love</span><b>${Math.round(couple.love)}%</b></div>${bar(couple.love, "#ff6fae")}`;
    }
    if (a.implantGas) html += `<div class="row"><span>Implant</span><b>breathes ${a.implantGas.toUpperCase()}</b></div>`;
    const sightLabel = a.sight <= 2 ? "short-sighted" : a.sight >= 5 ? "sharp-eyed" : "average";
    html += `<div class="row"><span>Eyesight</span><b>${a.sight} tiles · ${sightLabel}</b></div>`;
    const stateLabel = !a.alive ? "dead" : a.fighting ? "fighting" : a.task?.type === "court" ? "courting" : a.task?.type ?? "idle";
    html += `<div class="row"><span>State</span><b>${stateLabel}</b></div>`;
    if (a.guest && isFinite(a.stay))
      html += `<div class="row"><span>Leaves in</span><b>${Math.max(0, Math.round(a.stay))}s</b></div>`;
  } else if (sel.kind === "structure") {
    const s = world.structures[sel.id];
    if (!s) return void panel.classList.remove("show");
    const def = STRUCTURES[s.kind];
    html += `<h3>${def.label}</h3>`;
    html += `<div class="row"><span>Power</span><b>${def.gen ? `+${def.gen}` : def.draw ? `−${def.draw}` : "0"} PU</b></div>`;
    if (def.draw > 0)
      html += `<div class="row"><span>Status</span><b style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "powered" : s.condition <= 0 ? "BROKEN" : "unpowered"}</b></div>`;
    if (def.draw > 0) {
      const cc = s.condition <= 0 ? "#e24b4b" : s.condition < 60 ? "#e8a33d" : "#49d17a";
      html += `<div class="row"><span>Condition</span><b>${Math.round(s.condition)}%</b></div>${bar(s.condition, cc)}`;
      if (s.servicedBy >= 0) html += `<div class="row"><span></span><b style="color:#6ea8ff">being serviced</b></div>`;
    }
    if (s.kind in BEACON_SPECIES) {
      const act = moduleActive(world, s);
      html += `<div class="row"><span>Beacon charge</span><b>${Math.round(s.timer)}%</b></div>${bar(s.timer, "#b39cff")}`;
      html += `<div class="row"><span></span><b style="color:${act ? "#49d17a" : "#e8a33d"}">${act ? "charging" : `needs a ${SPECIES[BEACON_SPECIES[s.kind]!].label} aboard`}</b></div>`;
    }
    if (s.kind === "pod") {
      const sp = SPECIES[s.recipe as Species];
      html += `<div class="row"><span>Prepped for</span><b style="color:${SP_COLOR[s.recipe as Species] ?? "#e3e7ef"}">${sp ? sp.label : "—"}</b></div>`;
      html += `<div class="row"><span>Occupant</span><b>${s.occupantId >= 0 ? "in use" : "free"}</b></div>`;
    } else if (s.kind === "hotel") {
      const sp = SPECIES[s.recipe as Species];
      html += `<div class="row"><span>Prepped for</span><b style="color:${SP_COLOR[s.recipe as Species] ?? "#e3e7ef"}">${sp ? sp.label : "—"}</b></div>`;
    } else if (s.kind === "synth") {
      html += `<div class="row"><span>Recipe</span><b>${SYNTH_LABEL[s.recipe] ?? "Std Rations"}</b></div>`;
      html += `<div class="row"><span>Cooking</span><b>${Math.round(s.timer * 10)}%</b></div>`;
    } else if (s.kind === "vat") {
      html += `<div class="row"><span>Grows</span><b>${VAT_LABEL[s.recipe] ?? "Biomass"}</b></div>`;
    } else if (s.kind === "bay") {
      const drone = Object.values(world.drones).find((d) => d.bayId === s.id);
      const site = drone && drone.siteId >= 0 ? world.sites[drone.siteId] : undefined;
      const status = !drone
        ? "—"
        : drone.state === "docked"
          ? site
            ? "ready"
            : "idle — no target"
          : drone.state === "transit"
            ? `mining ${site?.name ?? "?"}`
            : drone.state === "outbound"
              ? "launching"
              : `returning${drone.cargo > 0 ? ` (+${Math.round(drone.cargo)})` : ""}`;
      html += `<div class="row"><span>Drone</span><b>${status}</b></div>`;
      if (site)
        html += `<div class="row"><span>Target</span><b>${site.discovered ? `${site.name} · ${Math.round(site.richness)} left` : `${site.name} (unknown)`}</b></div>`;
    }
    const toggleLabel = s.on ? "Turn off" : "Turn on";
    const recipeBtn =
      s.kind === "synth" || s.kind === "vat"
        ? `<button data-act="recipe">Switch recipe</button>`
        : s.kind === "pod" || s.kind === "hotel"
          ? `<button data-act="recipe">Reassign species</button>`
          : "";
    const starBtn = s.kind === "bay" ? `<button data-act="starchart">🛰 Star Chart</button>` : "";
    const archiveBtn = s.kind === "library" ? `<button data-act="archive">📜 Consult the Archivist</button>` : "";
    actions =
      `<div class="actions">` +
      recipeBtn +
      starBtn +
      archiveBtn +
      (def.draw > 0 ? `<button data-act="toggle">${toggleLabel}</button>` : "") +
      `<button class="danger" data-act="remove">Deconstruct</button></div>`;
  } else {
    panel.classList.remove("show"); // sites are off-map (Star Chart) now
    lastInfoHtml = "";
    return;
  }

  // Only touch the DOM when the markup changed (the delegated listener above keeps
  // the buttons working regardless).
  const out = html + actions;
  if (out !== lastInfoHtml) {
    panel.innerHTML = out;
    lastInfoHtml = out;
  }
  panel.classList.add("show");
}

// ---- first-contact dialog: when a species first appears, show its portrait + lore ----
type SpriteDef = { name: string; tileW: number; tileH: number; palette: Record<string, string>; states: Record<string, string[]> };
const spriteList = (): SpriteDef[] => (window as unknown as { SPRITES?: SpriteDef[] }).SPRITES ?? [];

// Editor library (localStorage "exo.sprites"): flat-pixel sprites the editor saved.
// UI portraits prefer these so they match the in-game (renderer) art exactly.
type LibState = { name: string; pixels: (string | null)[] };
type LibSprite = { tileW: number; tileH: number; res?: number; w?: number; states: LibState[] };
function editorLibrary(): Record<string, LibSprite> | null {
  try {
    if (localStorage.getItem("exo.sprites.enabled") !== "1") return null; // opt-in (see renderer)
    const raw = localStorage.getItem("exo.sprites");
    return raw ? (JSON.parse(raw) as Record<string, LibSprite>) : null;
  } catch {
    return null;
  }
}
// Draw an editor-library sprite's idle frame onto the canvas; returns false if the
// species isn't in the library (so the caller falls back to window.SPRITES).
function drawLibArt(canvas: HTMLCanvasElement, species: string): boolean {
  const lib = editorLibrary();
  const b = lib?.[species];
  if (!b || !Array.isArray(b.states) || !b.states.length) return false;
  const st = b.states.find((s) => s.name === "idle") ?? b.states.find((s) => s.name === "default") ?? b.states[0];
  if (!st || !Array.isArray(st.pixels)) return false;
  const res = b.res || (b.w && b.tileW ? Math.round(b.w / b.tileW) : 32);
  const tw = b.tileW * res, th = b.tileH * res;
  const px = Math.max(1, Math.floor(96 / Math.max(tw, th)));
  canvas.width = tw * px;
  canvas.height = th * px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < th; y++)
    for (let x = 0; x < tw; x++) {
      const col = st.pixels[y * tw + x];
      if (col && col[0] === "#") {
        ctx.fillStyle = col;
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  return true;
}

// Rasterize a species' idle frame onto the given canvas (nearest-neighbour, ~96px).
function drawSpeciesArt(canvas: HTMLCanvasElement, species: string): void {
  if (drawLibArt(canvas, species)) return; // editor art wins, matching the game
  const s = spriteList().find((x) => x.name === species);
  const rows = s ? (s.states.idle ?? s.states.default ?? Object.values(s.states)[0] ?? []) : [];
  // Native px/tile: explicit res, else derived from the first row's length (like
  // the renderer/editor) so the portrait fills the canvas at any art resolution.
  const res = s ? ((s as { res?: number }).res || Math.floor((rows[0]?.length ?? 0) / s.tileW) || 16) : 16;
  const tw = (s?.tileW ?? 1) * res;
  const th = (s?.tileH ?? 1) * res;
  const px = Math.max(1, Math.floor(96 / Math.max(tw, th)));
  canvas.width = tw * px;
  canvas.height = th * px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!s) return;
  for (let y = 0; y < th; y++) {
    const row = rows[y] || "";
    for (let x = 0; x < tw; x++) {
      const ch = row[x];
      if (ch && ch !== "." && s.palette[ch]) {
        ctx.fillStyle = s.palette[ch];
        ctx.fillRect(x * px, y * px, px, px);
      }
    }
  }
}

let fcQueue: Species[] = [];
let fcDone: (() => void) | null = null;
let fcWired = false;

// Show a first-contact card for each newly-seen species, in turn; call onAllDone
// once the last one is dismissed (the caller uses it to un-pause).
export function showFirstContact(list: Species[], onAllDone: () => void): void {
  if (list.length === 0) {
    onAllDone();
    return;
  }
  const el = document.getElementById("firstcontact");
  if (!el) {
    onAllDone();
    return;
  }
  fcQueue.push(...list);
  fcDone = onAllDone;
  if (!fcWired) {
    fcWired = true;
    el.querySelector(".fc-go")?.addEventListener("click", () => renderNextFC());
  }
  if (!el.classList.contains("show")) renderNextFC();
}

function renderNextFC(): void {
  const el = document.getElementById("firstcontact");
  if (!el) return;
  const sp = fcQueue.shift();
  if (!sp) {
    el.classList.remove("show");
    const d = fcDone;
    fcDone = null;
    d?.();
    return;
  }
  const def = SPECIES[sp];
  drawSpeciesArt(el.querySelector(".fc-art") as HTMLCanvasElement, sp);
  (el.querySelector(".fc-name") as HTMLElement).textContent = def.label;
  (el.querySelector(".fc-role") as HTMLElement).textContent =
    `${def.role} · breathes ${gasLabel(def.gas)}`;
  (el.querySelector(".fc-lore") as HTMLElement).textContent = def.lore;
  el.classList.add("show");
}

export function isFirstContactOpen(): boolean {
  return !!document.getElementById("firstcontact")?.classList.contains("show");
}

// ---- social-encounter dialog (conflict / bond) with player choices ----
let encShown = false;

export function isEncounterOpen(): boolean {
  return encShown;
}

export function showEncounter(enc: Encounter, onChoose: (choice: number) => void): void {
  const el = document.getElementById("encounter");
  if (!el) {
    onChoose(0);
    return;
  }
  encShown = true;
  // A complaint is ONE crew member griping about a module — show the crew + the
  // module, not two identical crew portraits (aId === bId for a complaint).
  const isComplaint = enc.kind === "complaint";
  drawSpeciesArt(el.querySelector(".enc-a") as HTMLCanvasElement, enc.aSpecies);
  drawSpeciesArt(el.querySelector(".enc-b") as HTMLCanvasElement, isComplaint && enc.subjectKind ? enc.subjectKind : enc.bSpecies);
  (el.querySelector(".enc-vs") as HTMLElement).textContent =
    enc.kind === "conflict" ? "✕" : enc.kind === "deal" ? "🤝" : isComplaint ? "🔧" : "♥";
  const t = encounterText(enc);
  (el.querySelector(".enc-title") as HTMLElement).textContent = t.title;
  (el.querySelector(".enc-body") as HTMLElement).textContent = t.body;
  const box = el.querySelector(".enc-choices") as HTMLElement;
  const choices = encounterChoices(enc);
  box.innerHTML = choices
    .map((c, i) => `<button type="button" data-i="${i}"><b>${c.label}</b><span class="ch-hint">${c.hint}</span></button>`)
    .join("");
  box.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = Number((btn as HTMLButtonElement).dataset.i);
      el.classList.remove("show");
      encShown = false;
      onChoose(i);
    }, { once: true });
  });
  el.classList.add("show");
}

// ---- god dialog: a race-god's verdict, with its creature portrait ----
let godShown = false;
export function isGodOpen(): boolean {
  return godShown;
}
// each weird god: portrait glyph + tint + the line it speaks when it strikes
const WEIRD_INFO: Record<WeirdGod, { glyph: string; color: string; verdict: string }> = {
  blackout: { glyph: "🌑", color: "#3a3f4d", verdict: "It swallows the lights. Every system aboard falls dark — and stays dark for a while." },
  surge: { glyph: "⚡", color: "#ffd84a", verdict: "It floods your grid with borrowed lightning. For a while, everything runs free of charge." },
  famine: { glyph: "🩸", color: "#e24b4b", verdict: "It opens its maw. Your every meal store is devoured to nothing." },
  feast: { glyph: "🍖", color: "#49d17a", verdict: "It gorges your larder. Every meal store overflows to the brim." },
};
function paintWeirdGod(canvas: HTMLCanvasElement, kind: WeirdGod): void {
  canvas.width = 96;
  canvas.height = 96;
  const o = canvas.getContext("2d");
  if (!o) return;
  const info = WEIRD_INFO[kind];
  const g = o.createRadialGradient(48, 44, 6, 48, 48, 50);
  g.addColorStop(0, info.color);
  g.addColorStop(1, "rgba(8,10,16,0)");
  o.fillStyle = g;
  o.fillRect(0, 0, 96, 96);
  o.font = "48px serif";
  o.textAlign = "center";
  o.textBaseline = "middle";
  o.fillText(info.glyph, 48, 50);
}
export function showGodDialog(species: Species, verdict: "pleased" | "wrathful" | "neutral", onClose: () => void, weird?: WeirdGod): void {
  const el = document.getElementById("god");
  if (!el) {
    onClose();
    return;
  }
  godShown = true;
  const v = el.querySelector(".god-verdict") as HTMLElement;
  if (weird) {
    paintWeirdGod(el.querySelector(".god-art") as HTMLCanvasElement, weird);
    (el.querySelector(".god-name") as HTMLElement).textContent = `${WEIRD_GODS[weird]} — a weird god`;
    v.textContent = WEIRD_INFO[weird].verdict;
    v.style.color = verdict === "pleased" ? "#49d17a" : "#e24b4b";
  } else {
    drawSpeciesArt(el.querySelector(".god-art") as HTMLCanvasElement, "god_" + species);
    (el.querySelector(".god-name") as HTMLElement).textContent = `${GODS[species]} — god of the ${SPECIES[species].label}`;
    v.textContent =
      verdict === "pleased"
        ? "It is pleased. A gift of credits and minerals descends upon the station."
        : verdict === "wrathful"
          ? "It is wrathful. One of your modules is unmade before your eyes."
          : "It watches in silence, and finds you neither worthy nor wanting.";
    v.style.color = verdict === "pleased" ? "#49d17a" : verdict === "wrathful" ? "#e24b4b" : "#aab2c4";
  }
  const go = el.querySelector(".god-go") as HTMLButtonElement;
  const done = () => { el.classList.remove("show"); godShown = false; go.removeEventListener("click", done); onClose(); };
  go.addEventListener("click", done);
  el.classList.add("show");
}

// ---- romance dialog: fell in love / turbulence / breakup / implants ----
let romanceShown = false;
export function isRomanceOpen(): boolean {
  return romanceShown;
}
export function showRomance(
  popup: { kind: string; title: string; body: string; good: boolean; aSpecies: Species; bSpecies: Species },
  onClose: () => void,
): void {
  const el = document.getElementById("romance");
  if (!el) {
    onClose();
    return;
  }
  romanceShown = true;
  drawSpeciesArt(el.querySelector(".rom-a") as HTMLCanvasElement, popup.aSpecies);
  drawSpeciesArt(el.querySelector(".rom-b") as HTMLCanvasElement, popup.bSpecies);
  (el.querySelector(".rom-vs") as HTMLElement).textContent =
    popup.kind === "breakup" ? "💔" : popup.kind === "turbulence" ? (popup.good ? "❤️‍🔥" : "⚡") : popup.kind === "implant" ? "🧬" : "❤";
  const title = el.querySelector(".rom-title") as HTMLElement;
  title.textContent = popup.title;
  title.style.color = popup.good ? "#ff9ec4" : "#9aa3b6";
  (el.querySelector(".rom-body") as HTMLElement).textContent = popup.body;
  const go = el.querySelector(".rom-go") as HTMLButtonElement;
  const done = () => { el.classList.remove("show"); romanceShown = false; go.removeEventListener("click", done); onClose(); };
  go.addEventListener("click", done);
  el.classList.add("show");
}

// ---- breed offer: a contented species asks to lay a clutch (with payment) ----
let breedShown = false;
export function isBreedOpen(): boolean {
  return breedShown;
}
export function showBreedOffer(
  species: Species,
  eggs: number,
  reward: number,
  onChoose: (accept: boolean) => void,
): void {
  const el = document.getElementById("breed");
  if (!el) {
    onChoose(false);
    return;
  }
  breedShown = true;
  drawSpeciesArt(el.querySelector(".breed-art") as HTMLCanvasElement, species);
  const label = SPECIES[species].label;
  (el.querySelector(".breed-name") as HTMLElement).textContent = `The ${label} wish to breed`;
  (el.querySelector(".breed-body") as HTMLElement).textContent =
    `Content aboard your station, the ${label} ask leave to lay a clutch of about ${eggs} eggs in your empty quarters. ` +
    `They offer ¢${reward} for your blessing. The clutch will incubate for a while — most will hatch as new ${label} crew, ` +
    `but a few always come up wrong, hatching as spiders the ${label} will have to hunt down.`;
  const yes = el.querySelector(".breed-yes") as HTMLButtonElement;
  const no = el.querySelector(".breed-no") as HTMLButtonElement;
  yes.textContent = `Allow it (+¢${reward})`;
  const pick = (accept: boolean) => () => {
    el.classList.remove("show");
    breedShown = false;
    yes.removeEventListener("click", yesH);
    no.removeEventListener("click", noH);
    onChoose(accept);
  };
  const yesH = pick(true);
  const noH = pick(false);
  yes.addEventListener("click", yesH);
  no.addEventListener("click", noH);
  el.classList.add("show");
}

// ---- Grand Library: the mad archivist AI recites 2,000 years on demand ----
let archiveShown = false;
export function isArchiveOpen(): boolean {
  return archiveShown;
}
export function showArchive(world: World): void {
  const el = document.getElementById("archive");
  if (!el) return;
  archiveShown = true;
  (el.querySelector(".arc-body") as HTMLElement).textContent = chronicleSaga(world);
  const close = () => { el.classList.remove("show"); archiveShown = false; };
  if (!(el as HTMLElement & { _wired?: boolean })._wired) {
    (el as HTMLElement & { _wired?: boolean })._wired = true;
    el.querySelector(".arc-close")?.addEventListener("click", close);
    el.addEventListener("click", (e) => { if (e.target === el) close(); });
  }
  el.classList.add("show");
}

// ---- Star Chart: the Bot Bay's orbital dispatch dialog (non-pausing) ----
const SC_SIZE = 520; // canvas px (square)
let scOpen = false;
let scBayId = -1;
let scSelected = -1; // selected body id, or -1
let scWorld: World | null = null;
let scDispatch: ((siteId: number) => void) | null = null;
let scWired = false;
let scHits: { id: number; x: number; y: number; r: number }[] = [];

export function isStarChartOpen(): boolean {
  return scOpen;
}

// The drone belonging to the open chart's bay (if any).
function scDrone(world: World) {
  return Object.values(world.drones).find((d) => d.bayId === scBayId);
}

export function showStarChart(world: World, bayId: number, onDispatch: (siteId: number) => void): void {
  const el = document.getElementById("starchart");
  if (!el) return;
  scOpen = true;
  scBayId = bayId;
  scWorld = world;
  scDispatch = onDispatch;
  const d = scDrone(world);
  scSelected = d && d.siteId >= 0 ? d.siteId : -1; // preselect the current target

  if (!scWired) {
    scWired = true;
    el.querySelector(".sc-close")?.addEventListener("click", closeStarChart);
    const canvas = el.querySelector(".sc-map") as HTMLCanvasElement;
    canvas.width = SC_SIZE;
    canvas.height = SC_SIZE;
    canvas.addEventListener("click", (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * SC_SIZE;
      const my = ((e.clientY - rect.top) / rect.height) * SC_SIZE;
      let pick = -1;
      let best = 18 * 18; // generous click radius²
      for (const h of scHits) {
        const dd = (h.x - mx) ** 2 + (h.y - my) ** 2;
        if (dd < best) {
          best = dd;
          pick = h.id;
        }
      }
      if (pick >= 0) scSelected = pick;
      if (scWorld) refreshStarChart(scWorld);
    });
    el.querySelector(".sc-dispatch")?.addEventListener("click", () => {
      // commit the target and CLOSE — the drone then launches on the map, not
      // behind the open dialog.
      if (scSelected >= 0 && scDispatch) scDispatch(scSelected);
      closeStarChart();
    });
  }
  el.classList.add("show");
  refreshStarChart(world);
}

function closeStarChart(): void {
  scOpen = false;
  document.getElementById("starchart")?.classList.remove("show");
}

const SC_ASTEROID = "#9a8a64";
const SC_PLANET = "#6fa8d0";
const SC_MOON = "#8a93a6";
const SC_UNKNOWN = "#566074";

// Mineral grade by per-trip yield — drives both the dot colour and the label, so
// the chart shows "various levels of minerals on various bodies" at a glance.
function gradeColor(y: number): string {
  return y >= 30 ? "#d8b463" : y >= 16 ? SC_ASTEROID : "#7a7158";
}
function gradeLabel(y: number): string {
  return y >= 50 ? "Mineral-rich" : y >= 30 ? "Ore-rich" : y >= 16 ? "Moderate" : "Lean";
}
// Deterministic 0..1 generator seeded per body — unique-but-stable textures.
function bodyRng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shadeHex(hex: string, amt: number): string {
  const s = hex.replace("#", "");
  if (s.length < 6) return hex;
  const f = (h: string) => Math.max(0, Math.min(255, Math.round(parseInt(h, 16) + amt * 255))).toString(16).padStart(2, "0");
  return "#" + f(s.slice(0, 2)) + f(s.slice(2, 4)) + f(s.slice(4, 6));
}
// Procedurally texture a body, clipped to its disc and lit from the upper-left:
// gas-giant bands or rocky continents for planets, craters for moons, mottling for
// rocks — seeded by id so each looks distinct.
function drawTexturedBody(ctx: CanvasRenderingContext2D, x: number, y: number, rad: number, s: Site): void {
  const base = s.tint ?? "#9a8a72";
  const rng = bodyRng(s.id);
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = base; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  if (s.kind === "planet") {
    if (rng() < 0.5) {
      for (let by = -rad; by < rad; by += 1.5) { ctx.fillStyle = shadeHex(base, (rng() - 0.5) * 0.35); ctx.fillRect(x - rad, y + by, rad * 2, 1.5); }
    } else {
      for (let k = 0; k < 14; k++) { ctx.fillStyle = shadeHex(base, (rng() - 0.5) * 0.5); ctx.beginPath(); ctx.arc(x + (rng() - 0.5) * rad * 1.7, y + (rng() - 0.5) * rad * 1.7, rng() * rad * 0.55, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (s.kind === "moon") {
    for (let k = 0; k < 7; k++) { ctx.fillStyle = shadeHex(base, -0.22 - rng() * 0.15); ctx.beginPath(); ctx.arc(x + (rng() - 0.5) * rad * 1.4, y + (rng() - 0.5) * rad * 1.4, rng() * rad * 0.38 + 0.5, 0, Math.PI * 2); ctx.fill(); }
  } else {
    for (let k = 0; k < 5; k++) { ctx.fillStyle = shadeHex(base, (rng() - 0.5) * 0.45); ctx.beginPath(); ctx.arc(x + (rng() - 0.5) * rad, y + (rng() - 0.5) * rad, rng() * rad * 0.6, 0, Math.PI * 2); ctx.fill(); }
  }
  const g = ctx.createRadialGradient(x - rad * 0.4, y - rad * 0.4, rad * 0.15, x, y, rad * 1.25);
  g.addColorStop(0, "rgba(255,255,255,0.22)");
  g.addColorStop(0.5, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  ctx.restore();
}

// The Beacon as a Bajoran-style wormhole on the star chart: a faint swirl that
// blooms into a bright blue flower of light as the five nodes charge (intensity
// 0..1). Drawn additively behind the bodies; rotation driven by the sim tick.
function drawSCWormhole(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, intensity: number, tick: number): void {
  const ramp = Math.min(1, Math.max(0, intensity));
  const rad = R * 0.85 * (1 / 3 + ramp * (2 / 3)); // ~1/3 size early → full at 5/5
  const t = tick * 0.015;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // nebulous glow
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, `rgba(190,225,255,${0.45 * ramp + 0.1})`);
  g.addColorStop(0.4, `rgba(90,140,230,${0.26 * ramp})`);
  g.addColorStop(0.75, `rgba(120,90,220,${0.15 * ramp})`);
  g.addColorStop(1, "rgba(40,30,90,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.fill();
  // flare petals
  const N = 10;
  for (let i = 0; i < N; i++) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t + (i / N) * Math.PI * 2);
    const pg = ctx.createLinearGradient(0, 0, 0, -rad * 1.3);
    pg.addColorStop(0, "rgba(200,235,255,0)");
    pg.addColorStop(0.5, `rgba(160,210,255,${0.22 * ramp})`);
    pg.addColorStop(1, "rgba(120,160,255,0)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(0, -rad * 0.65, Math.max(0.6, rad * 0.018), rad * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // bright core
  const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.18);
  cg.addColorStop(0, `rgba(240,250,255,${0.6 * ramp + 0.15})`);
  cg.addColorStop(1, "rgba(160,210,255,0)");
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(cx, cy, rad * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function refreshStarChart(world: World): void {
  if (!scOpen) return;
  scWorld = world;
  const el = document.getElementById("starchart");
  if (!el) return;
  const canvas = el.querySelector(".sc-map") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const cx = SC_SIZE / 2;
  const cy = SC_SIZE / 2;
  const r0 = 64; // station orbit radius
  const rMax = SC_SIZE / 2 - 26;
  const bodyR = (s: Site) => r0 + 26 + s.dist * (rMax - r0 - 26);

  // backdrop
  ctx.fillStyle = "#070a12";
  ctx.fillRect(0, 0, SC_SIZE, SC_SIZE);
  // faint starfield (deterministic by index so it doesn't shimmer)
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 90; i++) {
    const a = i * 2.39996;
    const rr = ((i * 97) % 1000) / 1000;
    ctx.globalAlpha = 0.12 + ((i * 7) % 10) / 50;
    ctx.fillRect(cx + Math.cos(a) * rr * (SC_SIZE / 2), cy + Math.sin(a) * rr * (SC_SIZE / 2), 1.4, 1.4);
  }
  ctx.globalAlpha = 1;

  // --- the system's star(s): one central sun, or a binary pair ---
  const starPos = (st: { angle: number; dist: number }): [number, number] =>
    st.dist <= 0 ? [cx, cy] : [cx + Math.cos(st.angle) * st.dist * r0 * 1.4, cy + Math.sin(st.angle) * st.dist * r0 * 1.4];
  const stars = world.stars ?? [];
  const hex6 = (c: string) => (/^#[0-9a-fA-F]{6}$/.test(c) ? c : "#ffd27a"); // guard hex8 concat
  for (const st of stars) {
    const [sx, sy] = starPos(st);
    const c = hex6(st.color);
    const R = st.r * 5.5;
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R);
    gl.addColorStop(0, c);
    gl.addColorStop(0.35, c + "99");
    gl.addColorStop(1, c + "00");
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = c; // disc
    ctx.beginPath();
    ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)"; // hot core
    ctx.beginPath();
    ctx.arc(sx, sy, st.r * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stars.length === 0) {
    ctx.fillStyle = "#ffd27a";
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  // the station orbits the sun slowly; the Beacon wormhole rides around it like a moon
  ctx.strokeStyle = "rgba(110,168,255,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, r0, 0, Math.PI * 2);
  ctx.stroke();
  const stAngle = -Math.PI / 2 + world.tick * 0.0006; // slow orbit (starts near the top)
  const stx = cx + Math.cos(stAngle) * r0;
  const sty = cy + Math.sin(stAngle) * r0;
  // the Beacon wormhole orbits the station like a moon
  const moonA = world.tick * 0.002;
  drawSCWormhole(ctx, stx + Math.cos(moonA) * 48, sty + Math.sin(moonA) * 48, SC_SIZE * 0.085, beaconIntensity(world), world.tick);
  ctx.fillStyle = "#49d17a";
  ctx.fillRect(stx - 4, sty - 4, 8, 8);

  scHits = [];
  const drone = scDrone(world);

  // position of a body: planets/asteroids around the centre; a moon rides around
  // its parent planet's current position.
  const moonR = (s: Site) => 15 + s.dist * 130;
  const posOf = (s: Site): [number, number] => {
    if (s.parent >= 0 && world.sites[s.parent]) {
      const p = world.sites[s.parent];
      const px = cx + Math.cos(p.angle) * bodyR(p), py = cy + Math.sin(p.angle) * bodyR(p);
      return [px + Math.cos(s.angle) * moonR(s), py + Math.sin(s.angle) * moonR(s)];
    }
    const r = bodyR(s);
    return [cx + Math.cos(s.angle) * r, cy + Math.sin(s.angle) * r];
  };

  // faint orbit rings — star-orbiting bodies around the centre, moons around planets
  ctx.lineWidth = 1;
  for (const id in world.sites) {
    const s = world.sites[id];
    if (s.parent >= 0) {
      const p = world.sites[s.parent];
      if (!p) continue;
      const px = cx + Math.cos(p.angle) * bodyR(p), py = cy + Math.sin(p.angle) * bodyR(p);
      ctx.strokeStyle = "rgba(120,140,170,0.12)";
      ctx.beginPath();
      ctx.arc(px, py, moonR(s), 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(120,140,170,0.10)";
      ctx.beginPath();
      ctx.arc(cx, cy, bodyR(s), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // the bodies themselves
  for (const id in world.sites) {
    const s = world.sites[id];
    const [x, y] = posOf(s);
    const known = s.discovered;
    const depleted = known && s.richness <= 0;
    const col = depleted
      ? "#3a4150"
      : !known
        ? SC_UNKNOWN
        : s.tint ?? (s.kind === "planet" ? SC_PLANET : s.kind === "moon" ? SC_MOON : gradeColor(s.yield));
    const rad = s.kind === "planet" ? 8 : s.kind === "moon" ? 4 : 5;
    if (s.id === scSelected) {
      ctx.strokeStyle = "#6ea8ff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, rad + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    // a gas-giant's ring (behind the disc)
    if (s.kind === "planet" && s.ring && known) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5);
      ctx.strokeStyle = "rgba(220,224,238,0.45)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, rad + 6, (rad + 6) * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (known && !depleted) {
      drawTexturedBody(ctx, x, y, rad, s); // unique procedural texture, lit upper-left
    } else {
      ctx.fillStyle = col; // undiscovered "?" / depleted — flat dot
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = known ? "#c3cbdc" : "#6b7488";
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(known ? s.name : "?", x, y + rad + 11);
    scHits.push({ id: s.id, x, y, r: rad });
  }

  // comets: bright head + a gradient tail streaming away from the system centre
  for (const c of world.comets ?? []) {
    const ex = Math.cos(c.phase) * c.a, ey = Math.sin(c.phase) * c.b;
    const rx = ex * Math.cos(c.rot) - ey * Math.sin(c.rot) + c.cx;
    const ry = ex * Math.sin(c.rot) + ey * Math.cos(c.rot) + c.cy;
    const hx = cx + rx * rMax, hy = cy + ry * rMax;
    const dx = hx - cx, dy = hy - cy, len = Math.hypot(dx, dy) || 1;
    const tlen = 30 + 30 * (1 - Math.min(1, len / rMax)); // longer tail near the sun
    const tx = hx + (dx / len) * tlen, ty = hy + (dy / len) * tlen;
    const grad = ctx.createLinearGradient(hx, hy, tx, ty);
    grad.addColorStop(0, c.color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(hx, hy, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // the bay's drone, drawn en route along its target line (out then back)
  if (drone && drone.siteId >= 0 && drone.state !== "lost") {
    const s = world.sites[drone.siteId];
    if (s) {
      const [tx, ty] = posOf(s);
      ctx.strokeStyle = "rgba(110,168,255,0.5)";
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(stx, sty);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      if (drone.state === "transit") {
        const frac = Math.min(1, drone.t / transitSeconds(systemDist(world, s)));
        const p = frac < 0.5 ? frac * 2 : (1 - frac) * 2; // out, then back
        ctx.fillStyle = "#dfe6f2";
        ctx.beginPath();
        ctx.arc(stx + (tx - stx) * p, sty + (ty - sty) * p, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // side panel: selected-body details + dispatch state
  const sel = scSelected >= 0 ? world.sites[scSelected] : undefined;
  const selEl = el.querySelector(".sc-sel") as HTMLElement;
  if (sel) {
    const trip = Math.round(transitSeconds(systemDist(world, sel)));
    const kindLabel = sel.kind === "planet" ? "Planet" : sel.kind === "moon" ? "Moon" : "Asteroid";
    const risk = Math.round((0.02 + systemDist(world, sel) * 0.06) * 100);
    selEl.innerHTML =
      `<div class="sc-name">${sel.discovered ? sel.name : "Unknown contact"}</div>` +
      `<div class="sc-stat">${kindLabel} · ~${trip}s round trip · ~${risk}% loss risk</div>` +
      (sel.discovered
        ? `<div class="sc-stat">${gradeLabel(sel.yield)} · Yield <b>${sel.yield}</b>/trip · <b>${Math.round(sel.richness)}</b> left${sel.richness <= 0 ? " (depleted)" : ""}</div>`
        : `<div class="sc-stat">Yield unknown — send a drone to survey it.</div>`);
  } else {
    selEl.innerHTML = `<div class="sc-stat">Select a body to send the drone. Each trip risks the drone — a loss costs ¢${REBUILD_COST} to rebuild.</div>`;
  }

  const btn = el.querySelector(".sc-dispatch") as HTMLButtonElement;
  const targeted = drone && drone.siteId === scSelected;
  const canDispatch = !!sel && sel.richness > 0 && !targeted;
  btn.disabled = !canDispatch;
  btn.textContent = !sel ? "Dispatch drone" : targeted ? "Drone assigned" : sel.discovered ? "Send drone here" : "Survey this body";

  const hint = el.querySelector(".sc-hint") as HTMLElement;
  if (!drone) hint.textContent = "This bay has no drone.";
  else if (drone.state === "lost") hint.textContent = `Drone lost — the Bay is fabricating a replacement (¢${REBUILD_COST}).`;
  else if (drone.state === "docked") hint.textContent = drone.siteId >= 0 ? "Drone ready — it will launch shortly." : "Drone idle — pick a target.";
  else if (drone.state === "transit") hint.textContent = "Drone is out mining — new orders apply on its return.";
  else hint.textContent = drone.state === "outbound" ? "Drone launching…" : "Drone returning…";
}
