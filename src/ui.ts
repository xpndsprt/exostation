import { Encounter, HoverTarget, OverlayMode, Selection, Speed, Species, Tool, UIState, World } from "./types";
import { COLORS } from "./config";
import { STRUCTURES, costOf } from "./structures";
import { SPECIES } from "./species";
import { RELATIONS } from "./relations";
import { advise } from "./advisor";
import { getRep, requestText } from "./requests";
import { moodBreakdown } from "./mood";
import { productivity } from "./harmony";
import { OBJECTIVES, currentObjective } from "./objectives";
import { UNLOCKS, isUnlocked, toolLock, poweredLabCount, canResearch } from "./research";
import { BEACON_SPECIES, moduleActive } from "./beacon";
import { encounterText, encounterChoices } from "./encounters";
import { storageCaps } from "./storage";
import { listSaves, SlotId } from "./persistence";

const SP_COLOR: Record<Species, string> = {
  human: "#6ea8ff",
  drenn: "#e8c349",
  thol: "#d98a3a",
  vryl: "#8fd14f",
  korro: "#d65a4e",
  vorn: "#b256c9",
};

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
  { t: "erase", label: "Erase", key: "E" },
  { t: "solar", label: "Solar Panel", key: "1", group: "Modules" },
  { t: "battery", label: "Battery", key: "2" },
  { t: "o2gen", label: "O₂ Generator", key: "3" },
  { t: "ch4gen", label: "Methane Gen", key: "4" },
  { t: "synth", label: "Rations Synth", key: "5" },
  { t: "vat", label: "Bio Vat", key: "6" },
  { t: "pod", label: "Crew Quarters", key: "7" },
  { t: "hotel", label: "Hotel Room", key: "8" },
  { t: "rec", label: "Lounge", key: "9" },
  { t: "bay", label: "Bot Bay", key: "0" },
  { t: "dock", label: "Docking Port", key: "-" },
  { t: "docklarge", label: "Large Dock", key: "" },
  { t: "docksuper", label: "Spaceport Dock", key: "" },
  { t: "fuelrefinery", label: "Fuel Refinery", key: "" },
  { t: "medbay", label: "Med Bay", key: "" },
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
  onDeconstruct: (id: number) => void;
  onToggle: (id: number) => void;
  onRecipe: (id: number) => void;
  onOverlay: (mode: OverlayMode) => void;
  onRecenter: () => void;
  onBuyUnlock: (id: string) => void;
  onCycle: (kind: string) => void; // double-click a palette tool to find its instances
  onLocateSpecies: (species: Species) => void; // click an Alienpedia entry to find them
}

const toolButtons = new Map<Tool, HTMLButtonElement>();
let speedButtons: HTMLButtonElement[] = [];
let overlayButtons = new Map<OverlayMode, HTMLButtonElement>();
let saveBtn: HTMLButtonElement | null = null;

export function setupUI(state: UIState, world: World, handlers: UIHandlers): void {
  buildPalette(state, handlers);
  buildTimeControls(world);
  buildOverlayControls(handlers);
  buildSaveControls(world, handlers);
  setupCollapse();
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
    const b = document.createElement("button");
    const cost = costOf(entry.t);
    const costStr = cost > 0 ? `¢${cost}` : "";
    b.dataset.label = entry.label;
    b.innerHTML = `<span class="nm">${entry.label}</span><span class="hk">${costStr ? costStr + " · " : ""}${entry.key}</span>`;
    if (entry.t === state.tool) b.classList.add("active");
    b.onclick = () => setActiveTool(entry.t, state);
    // double-click a build tool to pan-cycle through its placed instances
    if (entry.t in STRUCTURES) b.ondblclick = () => handlers.onCycle(entry.t);
    b.title = entry.t in STRUCTURES ? "Double-click to find placed ones" : "";
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
  toolButtons.get(tool)?.classList.add("active");
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
      if (nm) nm.textContent = "???";
      btn.title = `Locked — research “${lock.label}” at a Research Lab`;
    } else {
      btn.classList.remove("locked");
      if (nm) nm.textContent = btn.dataset.label || "";
      btn.title = tool in STRUCTURES ? "Double-click to find placed ones" : "";
      if (prevLocked.has(tool)) {
        btn.classList.add("revealed"); // just researched — light it up
        setTimeout(() => btn.classList.remove("revealed"), 1100);
      }
    }
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
  const v = Math.max(0, Math.min(100, value));
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
      chip("¢", `<b>${Math.floor(world.credits)}</b> <span class="muted">${rateStr}</span>`, rate < -0.05) +
      chip(
        "⚡",
        `${p.supply}/${p.draw}<span class="pbar"><i style="width:${pct}%"></i></span>`,
        p.brownout,
      ) +
      chip("👥", `${residents}/${pods}${dead ? ` <span class="muted">${dead}✕</span>` : ""}`, residents > pods) +
      chip("🏨", `${guests}/${hotels}`) +
      chip("🙂", `${avgMood}%`, alive > 0 && avgMood < 35) +
      chip("🍱", `${Math.floor(st.meals.rations)}/${Math.floor(st.meals.fungal)}`, st.meals.rations >= caps.rations * 0.95 || st.meals.fungal >= caps.fungal * 0.95) +
      chip("🌱", `${Math.floor(st.biomass)}/${caps.biomass}${st.spores > 0 ? ` ·${Math.floor(st.spores)}sp` : ""}`, st.biomass >= caps.biomass * 0.95) +
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

export function renderTutorial(world: World): void {
  const el = document.getElementById("tutorial");
  if (!el) return;
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
  const air = Object.values(world.rooms).some((r) => r.gas === "o2" || r.gas === "ch4");
  const steps: [string, boolean][] = [
    ["Seal a room — Floor, then Wall around it", sealed],
    ["Power it — a Solar Panel on the hull", powered],
    ["Add an O₂ Generator inside", air],
    ["Build a Rations Synth", has("synth")],
    ["Add Crew Quarters", has("pod")],
    ["Build a Docking Port", has("dock")],
  ];
  const rows = steps.map(([t, done]) => `<li class="${done ? "done" : ""}">${done ? "✓" : "○"} ${t}</li>`).join("");
  el.innerHTML =
    `<h3>▶ GETTING STARTED</h3><ol>${rows}</ol>` +
    `<div class="tut-foot"><span>A shuttle brings your first crew once these are done.</span>` +
    `<button id="tut-skip">Skip</button></div>`;
  el.classList.add("show");
  const skip = document.getElementById("tut-skip");
  if (skip) skip.onclick = () => {
    setTutorialSeen();
    el.classList.remove("show");
  };
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
    const name = SPECIES[a.species].label;
    const sgn = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}`;
    let moodLine = `<div>Mood ${Math.round(a.mood)}%</div>`;
    if (a.alive) {
      const b = moodBreakdown(world, a);
      moodLine =
        `<div>Mood ${Math.round(a.mood)}% <span class="muted">→ ${Math.round(b.target)}</span></div>` +
        `<div class="muted">base 50 · needs ${sgn(b.needs)} · neighbors ${sgn(b.social)} · room ${sgn(b.harmony)}${b.command ? ` · command ${sgn(b.command)}` : ""}${b.overflow ? ` · waste ${sgn(b.overflow)}` : ""}</div>`;
    }
    html =
      `<h4>${name}${a.guest ? " (guest)" : ""}</h4>` +
      `<div>${SPECIES[a.species].gas === "ch4" ? "CH₄" : "O₂"} ${Math.round(a.o2)}%${a.suit < 100 ? ` · Suit ${Math.round(a.suit)}%` : ""} · Food ${Math.round(a.food)}% · Rest ${Math.round(a.rest)}% · Fun ${Math.round(a.fun)}%</div>` +
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
  } else if (target.kind === "site") {
    const site = world.sites[target.id];
    if (!site) return hideTooltip();
    html = `<h4>Asteroid</h4><div>richness ${Math.round(site.richness)}</div>`;
  } else if (target.kind === "cell") {
    const c = world.cells[target.cell];
    const cx = target.cell % world.w;
    const cy = (target.cell / world.w) | 0;
    const kind = c.type === "floor" ? (c.enclosed ? "sealed floor" : "open floor") : c.type;
    const room = c.roomId >= 0 ? world.rooms[c.roomId] : undefined;
    const gas = room?.gas || "none";
    const air = gas === "none" ? "no air" : gas === "mixed" ? "MIXED ☠" : gas;
    html = `<div class="muted">${cx},${cy} · ${kind}${c.type === "floor" ? ` · ${air}` : ""}</div>`;
    if (room && c.type === "floor") {
      const mult = productivity(room.harmony);
      const word = room.harmony > 0.2 ? "harmonious" : room.harmony < -0.2 ? "tense" : "neutral";
      const col = room.harmony > 0.2 ? "#49d17a" : room.harmony < -0.2 ? "#e8a33d" : "#8b93a6";
      html += `<div>Room <span style="color:${col}">${word} ${room.harmony >= 0 ? "+" : "−"}${Math.abs(room.harmony).toFixed(2)}</span> → ×${mult.toFixed(2)} production</div>`;
    }
  }
  tip.innerHTML = html;
  tip.style.left = `${x + 14}px`;
  tip.style.top = `${y + 14}px`;
  tip.classList.add("show");
}

export function hideTooltip(): void {
  document.getElementById("tooltip")?.classList.remove("show");
}

const GAS_LABEL: Record<string, string> = { o2: "Oxygen", ch4: "Methane" };

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
    .join("|");
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
        `<div class="stat">Breathes <b>${GAS_LABEL[d.gas] ?? d.gas}</b> · Eats <b>${d.diet}</b> · Power <b>${d.power}</b></div>` +
        `<div class="stat">${rel}</div>` +
        `<div class="stat" style="color:#9fd8a0">⭐ ${d.trait}</div>` +
        `<div class="blurb">${d.blurb}</div></div>`
      );
    })
    .join("");
  el.innerHTML = `<h3>📖 ALIENPEDIA</h3><div class="ped-list">${entries}</div>`;
  const newList = el.querySelector(".ped-list") as HTMLElement | null;
  if (newList) newList.scrollTop = prevScroll;
}

// Lower-right advisor board: species seen so far + the AI's next-step guidance.
export function renderAdvisor(world: World): void {
  const el = document.getElementById("advisor");
  if (!el) return;
  const seen = world.seen.length
    ? world.seen
        .map(
          (s) =>
            `<span class="sp"><span class="d" style="background:${SP_COLOR[s]}"></span>${SPECIES[s].label}</span>`,
        )
        .join("")
    : `<span class="muted">none yet</span>`;
  const advice = advise(world)
    .slice(0, 4)
    .map((a) => `<li class="${a.sev}"><span class="mk"></span><span>${a.text}</span></li>`)
    .join("");
  el.innerHTML =
    `<h3>🤖 ADVISOR</h3>` +
    objectiveHtml(world) +
    `<div class="seen">${seen}</div>` +
    `<ul class="advice">${advice}</ul>`;
}

export function showDragLabel(text: string, x: number, y: number, bad = false): void {
  const el = document.getElementById("draglabel");
  if (!el) return;
  el.textContent = text;
  el.style.color = bad ? "#ff6a6a" : "#d7dbe2";
  el.style.left = `${x + 14}px`;
  el.style.top = `${y - 22}px`;
  el.classList.add("show");
}

export function hideDragLabel(): void {
  document.getElementById("draglabel")?.classList.remove("show");
}

export function updateInfo(world: World, sel: Selection, handlers: UIHandlers): void {
  const panel = document.getElementById("infopanel");
  if (!panel) return;
  if (!sel) {
    panel.classList.remove("show");
    return;
  }

  let html = "";
  let actions = "";
  if (sel.kind === "agent") {
    const a = world.agents[sel.id];
    if (!a) return void panel.classList.remove("show");
    const name = SPECIES[a.species].label;
    html += `<h3>${name}${a.guest ? " (guest)" : ""}</h3>`;
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
    const stateLabel = !a.alive ? "dead" : a.fighting ? "fighting" : a.task?.type ?? "idle";
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
    if (s.kind === "pod") html += `<div class="row"><span>Occupant</span><b>${s.occupantId >= 0 ? "in use" : "free"}</b></div>`;
    else if (s.kind === "synth") {
      html += `<div class="row"><span>Recipe</span><b>${s.recipe === "fungal" ? "Fungal Mash" : "Std Rations"}</b></div>`;
      html += `<div class="row"><span>Cooking</span><b>${Math.round(s.timer * 10)}%</b></div>`;
    } else if (s.kind === "vat") {
      html += `<div class="row"><span>Grows</span><b>${s.recipe === "spores" ? "Spores" : "Biomass"}</b></div>`;
    }
    const toggleLabel = s.on ? "Turn off" : "Turn on";
    const recipeBtn = s.kind === "synth" || s.kind === "vat" ? `<button data-act="recipe">Switch recipe</button>` : "";
    actions =
      `<div class="actions">` +
      recipeBtn +
      (def.draw > 0 ? `<button data-act="toggle">${toggleLabel}</button>` : "") +
      `<button class="danger" data-act="remove">Deconstruct</button></div>`;
  } else {
    const site = world.sites[sel.id];
    if (!site) return void panel.classList.remove("show");
    html += `<h3>Asteroid</h3>`;
    html += `<div class="row"><span>Richness</span><b>${Math.round(site.richness)}</b></div>${bar((site.richness / 1000) * 100, "#8a7a5c")}`;
  }

  panel.innerHTML = html + actions;
  panel.classList.add("show");

  if (sel.kind === "structure") {
    const id = sel.id;
    panel.querySelector('[data-act="remove"]')?.addEventListener("click", () => handlers.onDeconstruct(id));
    panel.querySelector('[data-act="toggle"]')?.addEventListener("click", () => handlers.onToggle(id));
    panel.querySelector('[data-act="recipe"]')?.addEventListener("click", () => handlers.onRecipe(id));
  }
}

// ---- first-contact dialog: when a species first appears, show its portrait + lore ----
type SpriteDef = { name: string; tileW: number; tileH: number; palette: Record<string, string>; states: Record<string, string[]> };
const spriteList = (): SpriteDef[] => (window as unknown as { SPRITES?: SpriteDef[] }).SPRITES ?? [];

// Rasterize a species' idle frame onto the given canvas (nearest-neighbour, ~96px).
function drawSpeciesArt(canvas: HTMLCanvasElement, species: string): void {
  const s = spriteList().find((x) => x.name === species);
  const tw = (s?.tileW ?? 1) * 16;
  const th = (s?.tileH ?? 1) * 16;
  const px = Math.max(1, Math.floor(96 / Math.max(tw, th)));
  canvas.width = tw * px;
  canvas.height = th * px;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!s) return;
  const rows = s.states.idle ?? s.states.default ?? Object.values(s.states)[0] ?? [];
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
    `${def.role} · breathes ${def.gas === "ch4" ? "methane (CH₄)" : "oxygen (O₂)"}`;
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
  drawSpeciesArt(el.querySelector(".enc-a") as HTMLCanvasElement, enc.aSpecies);
  drawSpeciesArt(el.querySelector(".enc-b") as HTMLCanvasElement, enc.bSpecies);
  (el.querySelector(".enc-vs") as HTMLElement).textContent = enc.kind === "conflict" ? "✕" : "♥";
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
