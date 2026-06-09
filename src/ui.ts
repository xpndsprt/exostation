import { HoverTarget, OverlayMode, Selection, Speed, Tool, UIState, World } from "./types";
import { COLORS } from "./config";
import { STRUCTURES } from "./structures";

interface PaletteEntry {
  t: Tool;
  label: string;
  key: string; // keyboard shortcut
  group?: string;
}

const PALETTE: PaletteEntry[] = [
  { t: "floor", label: "Floor", key: "F", group: "Build" },
  { t: "wall", label: "Wall", key: "W" },
  { t: "erase", label: "Erase", key: "E" },
  { t: "solar", label: "Solar Panel", key: "1", group: "Modules" },
  { t: "battery", label: "Battery", key: "2" },
  { t: "o2gen", label: "O₂ Generator", key: "3" },
  { t: "ch4gen", label: "Methane Gen", key: "4" },
  { t: "synth", label: "Rations Synth", key: "5" },
  { t: "pod", label: "Sleeping Pod", key: "6" },
  { t: "bay", label: "Bot Bay", key: "7" },
  { t: "dock", label: "Docking Port", key: "8" },
  { t: "asteroid", label: "Asteroid", key: "A", group: "Space" },
  { t: "human", label: "Human", key: "H", group: "Crew" },
  { t: "thol", label: "Thol", key: "T" },
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
  onSave: () => void;
  onLoad: () => void;
  onDeconstruct: (id: number) => void;
  onToggle: (id: number) => void;
  onOverlay: (mode: OverlayMode) => void;
  onRecenter: () => void;
}

const toolButtons = new Map<Tool, HTMLButtonElement>();
let speedButtons: HTMLButtonElement[] = [];
let overlayButtons = new Map<OverlayMode, HTMLButtonElement>();
let saveBtn: HTMLButtonElement | null = null;

export function setupUI(state: UIState, world: World, handlers: UIHandlers): void {
  buildPalette(state);
  buildTimeControls(world);
  buildOverlayControls(handlers);
  buildSaveControls(handlers);
}

function buildPalette(state: UIState): void {
  const bar = document.getElementById("palette");
  if (!bar) return;
  for (const entry of PALETTE) {
    if (entry.group) {
      const h = document.createElement("div");
      h.className = "group";
      h.textContent = entry.group;
      bar.appendChild(h);
    }
    const b = document.createElement("button");
    b.innerHTML = `${entry.label}<span class="hk">${entry.key}</span>`;
    if (entry.t === state.tool) b.classList.add("active");
    b.onclick = () => setActiveTool(entry.t, state);
    toolButtons.set(entry.t, b);
    bar.appendChild(b);
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

export function setActiveTool(tool: Tool, state: UIState): void {
  state.tool = tool;
  for (const [, b] of toolButtons) b.classList.remove("active");
  toolButtons.get(tool)?.classList.add("active");
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

function buildSaveControls(handlers: UIHandlers): void {
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const wrap = document.createElement("span");
  wrap.id = "savectl";
  saveBtn = document.createElement("button");
  saveBtn.className = "tbtn";
  saveBtn.textContent = "Save";
  saveBtn.onclick = handlers.onSave;
  const load = document.createElement("button");
  load.className = "tbtn";
  load.textContent = "Load";
  load.onclick = handlers.onLoad;
  wrap.appendChild(saveBtn);
  wrap.appendChild(load);
  bar.appendChild(wrap);
}

export function markSaved(): void {
  if (!saveBtn) return;
  saveBtn.textContent = "Saved ✓";
  setTimeout(() => {
    if (saveBtn) saveBtn.textContent = "Save";
  }, 1400);
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
  const status = document.getElementById("status");
  if (status) {
    status.innerHTML =
      chip("¢", `<b>${Math.floor(world.credits)}</b>`) +
      chip(
        "⚡",
        `${p.supply}/${p.draw}<span class="pbar"><i style="width:${pct}%"></i></span>`,
        p.brownout,
      ) +
      chip("👥", `${alive}${guests ? ` <span class="muted">(${guests}g)</span>` : ""}${dead ? `, ${dead}✕` : ""}`) +
      chip("🙂", `${avgMood}%`, alive > 0 && avgMood < 35) +
      chip("🍱", `${st.meals}`) +
      chip("⛏", `${Math.floor(st.biomass)}/${Math.floor(st.water)}`) +
      chip("▦", `${seen.size} <span class="muted">(${breathable} air)</span>`);
  }

  const banner = document.getElementById("banner");
  banner?.classList.toggle("show", p.brownout);

  const wm = document.getElementById("watermark");
  if (wm) wm.textContent = world.speed === 0 ? "❚❚ PAUSED" : `▶ ${world.speed}×`;
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
    const name = a.species === "drenn" ? "Drenn" : "Human";
    html =
      `<h4>${name}${a.guest ? " (guest)" : ""}</h4>` +
      `<div>O₂ ${Math.round(a.o2)}% · Food ${Math.round(a.food)}% · Rest ${Math.round(a.rest)}%</div>` +
      `<div>Mood ${Math.round(a.mood)}%</div>` +
      `<div class="muted">${a.alive ? a.task?.type ?? "idle" : "dead"}${a.guest && isFinite(a.stay) ? ` · leaves ${Math.max(0, Math.round(a.stay))}s` : ""}</div>`;
  } else if (target.kind === "structure") {
    const s = world.structures[target.id];
    if (!s) return hideTooltip();
    const def = STRUCTURES[s.kind];
    html =
      `<h4>${def.label}</h4>` +
      `<div>${def.gen ? `+${def.gen}` : def.draw ? `−${def.draw}` : "0"} PU` +
      (def.draw > 0 ? ` · <span style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "powered" : "unpowered"}</span>` : "") +
      `</div>`;
  } else if (target.kind === "site") {
    const site = world.sites[target.id];
    if (!site) return hideTooltip();
    html = `<h4>Asteroid</h4><div>richness ${Math.round(site.richness)}</div>`;
  } else if (target.kind === "cell") {
    const c = world.cells[target.cell];
    const cx = target.cell % world.w;
    const cy = (target.cell / world.w) | 0;
    const kind = c.type === "floor" ? (c.enclosed ? "sealed floor" : "open floor") : c.type;
    const gas = (c.roomId >= 0 && world.rooms[c.roomId]?.gas) || "none";
    const air = gas === "none" ? "no air" : gas === "mixed" ? "MIXED ☠" : gas;
    html = `<div class="muted">${cx},${cy} · ${kind}${c.type === "floor" ? ` · ${air}` : ""}</div>`;
  }
  tip.innerHTML = html;
  tip.style.left = `${x + 14}px`;
  tip.style.top = `${y + 14}px`;
  tip.classList.add("show");
}

export function hideTooltip(): void {
  document.getElementById("tooltip")?.classList.remove("show");
}

export function showDragLabel(text: string, x: number, y: number): void {
  const el = document.getElementById("draglabel");
  if (!el) return;
  el.textContent = text;
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
    const name = a.species === "drenn" ? "Drenn" : "Human";
    html += `<h3>${name}${a.guest ? " (guest)" : ""}</h3>`;
    html += `<div class="row"><span>O₂</span><b>${Math.round(a.o2)}%</b></div>${bar(a.o2, a.o2 > 30 ? "#49d17a" : "#e24b4b")}`;
    html += `<div class="row"><span>Food</span><b>${Math.round(a.food)}%</b></div>${bar(a.food, "#6ea8ff")}`;
    html += `<div class="row"><span>Rest</span><b>${Math.round(a.rest)}%</b></div>${bar(a.rest, "#9b6cd5")}`;
    const mc = a.mood >= 60 ? "#49d17a" : a.mood >= 35 ? "#e8c349" : "#e24b4b";
    html += `<div class="row"><span>Mood</span><b>${Math.round(a.mood)}%</b></div>${bar(a.mood, mc)}`;
    html += `<div class="row"><span>State</span><b>${a.alive ? a.task?.type ?? "idle" : "dead"}</b></div>`;
    if (a.guest && isFinite(a.stay))
      html += `<div class="row"><span>Leaves in</span><b>${Math.max(0, Math.round(a.stay))}s</b></div>`;
  } else if (sel.kind === "structure") {
    const s = world.structures[sel.id];
    if (!s) return void panel.classList.remove("show");
    const def = STRUCTURES[s.kind];
    html += `<h3>${def.label}</h3>`;
    html += `<div class="row"><span>Power</span><b>${def.gen ? `+${def.gen}` : def.draw ? `−${def.draw}` : "0"} PU</b></div>`;
    if (def.draw > 0)
      html += `<div class="row"><span>Status</span><b style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "powered" : "unpowered"}</b></div>`;
    if (s.kind === "pod") html += `<div class="row"><span>Occupant</span><b>${s.occupantId >= 0 ? "in use" : "free"}</b></div>`;
    else if (s.kind === "synth") html += `<div class="row"><span>Cooking</span><b>${Math.round(s.timer * 10)}%</b></div>`;
    const toggleLabel = s.on ? "Turn off" : "Turn on";
    actions =
      `<div class="actions">` +
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
  }
}
