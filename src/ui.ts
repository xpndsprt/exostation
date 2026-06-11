import { HoverTarget, OverlayMode, Selection, Speed, Species, Tool, UIState, World } from "./types";
import { COLORS } from "./config";
import { STRUCTURES, costOf } from "./structures";
import { SPECIES } from "./species";
import { RELATIONS } from "./relations";
import { advise } from "./advisor";
import { getRep, requestText } from "./requests";

const SP_COLOR: Record<Species, string> = {
  human: "#6ea8ff",
  drenn: "#e8c349",
  thol: "#d98a3a",
  vryl: "#8fd14f",
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
  { t: "tradehub", label: "Trade Hub", key: "M" },
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
  onRecipe: (id: number) => void;
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
    const cost = costOf(entry.t);
    const costStr = cost > 0 ? `¢${cost} ` : "";
    b.innerHTML = `${entry.label}<span class="hk">${costStr}${entry.key}</span>`;
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
      chip("🍱", `${st.meals.rations}/${st.meals.fungal}`) +
      chip("🌱", `${Math.floor(st.biomass)}/${Math.floor(st.spores)}`) +
      chip("⛏", `${Math.floor(st.minerals)}`) +
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
    const name = SPECIES[a.species].label;
    html =
      `<h4>${name}${a.guest ? " (guest)" : ""}</h4>` +
      `<div>O₂ ${Math.round(a.o2)}%${a.suit < 100 ? ` · Suit ${Math.round(a.suit)}%` : ""} · Food ${Math.round(a.food)}% · Rest ${Math.round(a.rest)}% · Fun ${Math.round(a.fun)}%</div>` +
      `<div>Mood ${Math.round(a.mood)}%</div>` +
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
      `</div>` +
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
    const harm = room ? (room.harmony > 0.2 ? " · harmonious" : room.harmony < -0.2 ? " · tense" : "") : "";
    html = `<div class="muted">${cx},${cy} · ${kind}${c.type === "floor" ? ` · ${air}${harm}` : ""}</div>`;
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

// Alienpedia: a reference card for every species that has visited the station.
export function renderAlienpedia(world: World): void {
  const el = document.getElementById("alienpedia");
  if (!el) return;
  if (world.seen.length === 0) {
    el.innerHTML = `<h3>📖 ALIENPEDIA</h3><div class="empty">No species encountered yet.</div>`;
    return;
  }
  const present: Record<string, number> = {};
  for (const id in world.agents) {
    const a = world.agents[id];
    if (a.alive) present[a.species] = (present[a.species] || 0) + 1;
  }
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
      const rep = Math.round(getRep(world, s));
      return (
        `<div class="ent"><div class="hd"><span class="d" style="background:${SP_COLOR[s]}"></span>${d.label}` +
        `<span class="role">${d.role}${here ? ` · ${here} aboard` : ""}</span></div>` +
        `<div class="stat">Reputation <b>${rep}</b><span class="rep"><i style="width:${rep}%"></i></span></div>` +
        `<div class="stat">Breathes <b>${GAS_LABEL[d.gas] ?? d.gas}</b> · Eats <b>${d.diet}</b> · Power <b>${d.power}</b></div>` +
        `<div class="stat">${rel}</div>` +
        `<div class="stat" style="color:#9fd8a0">⭐ ${d.trait}</div>` +
        `<div class="blurb">${d.blurb}</div></div>`
      );
    })
    .join("");
  el.innerHTML = `<h3>📖 ALIENPEDIA</h3>${entries}`;
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
    `<div class="seen">${seen}</div>` +
    `<ul class="advice">${advice}</ul>`;
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
