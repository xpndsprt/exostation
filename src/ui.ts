import { Selection, Speed, Tool, UIState, World } from "./types";
import { COLORS } from "./config";
import { STRUCTURES } from "./structures";

interface PaletteEntry {
  t: Tool;
  label: string;
  group?: string;
}

const PALETTE: PaletteEntry[] = [
  { t: "floor", label: "Floor", group: "Build" },
  { t: "wall", label: "Wall" },
  { t: "erase", label: "Erase" },
  { t: "solar", label: "Solar Panel", group: "Modules" },
  { t: "battery", label: "Battery" },
  { t: "o2gen", label: "O₂ Generator" },
  { t: "synth", label: "Rations Synth" },
  { t: "pod", label: "Sleeping Pod" },
  { t: "bay", label: "Bot Bay" },
  { t: "dock", label: "Docking Port" },
  { t: "asteroid", label: "Asteroid", group: "Space" },
  { t: "human", label: "Human", group: "Crew" },
  { t: "select", label: "Select", group: "View" },
  { t: "pan", label: "Pan" },
];

const SPEEDS: { s: Speed; label: string; title: string }[] = [
  { s: 0, label: "❚❚", title: "Pause" },
  { s: 1, label: "▶", title: "1×" },
  { s: 2, label: "▶▶", title: "2×" },
  { s: 3, label: "▶▶▶", title: "3×" },
];

let speedButtons: HTMLButtonElement[] = [];

export interface UIHandlers {
  onSave: () => void;
  onLoad: () => void;
}

export function setupUI(state: UIState, world: World, handlers: UIHandlers): void {
  buildPalette(state);
  buildTimeControls(world);
  buildSaveControls(handlers);
}

function buildSaveControls(handlers: UIHandlers): void {
  const bar = document.getElementById("topbar");
  if (!bar) return;
  const wrap = document.createElement("span");
  wrap.id = "savectl";
  const mk = (label: string, fn: () => void) => {
    const b = document.createElement("button");
    b.className = "tbtn";
    b.textContent = label;
    b.onclick = fn;
    wrap.appendChild(b);
  };
  mk("Save", handlers.onSave);
  mk("Load", handlers.onLoad);
  bar.appendChild(wrap);
}

export function pushAlert(text: string, kind: "info" | "warn" | "bad" = "info"): void {
  const box = document.getElementById("alerts");
  if (!box) return;
  const el = document.createElement("div");
  el.className = "toast" + (kind === "info" ? "" : " " + kind);
  el.textContent = text;
  box.appendChild(el);
  // auto-remove after the fade animation completes
  setTimeout(() => el.remove(), 5200);
  // cap the number of visible toasts
  while (box.children.length > 6) box.firstChild?.remove();
}

function bar(value: number, color: string): string {
  const v = Math.max(0, Math.min(100, value));
  return `<div class="bar"><i style="width:${v}%;background:${color}"></i></div>`;
}

export function updateInfo(world: World, sel: Selection): void {
  const panel = document.getElementById("infopanel");
  if (!panel) return;
  if (!sel) {
    panel.classList.remove("show");
    return;
  }

  let html = "";
  if (sel.kind === "agent") {
    const a = world.agents[sel.id];
    if (!a) {
      panel.classList.remove("show");
      return;
    }
    const name = a.species === "drenn" ? "Drenn" : "Human";
    html += `<h3>${name}${a.guest ? " (guest)" : ""}</h3>`;
    html += `<div class="row"><span>O₂</span><b>${Math.round(a.o2)}%</b></div>`;
    html += bar(a.o2, a.o2 > 30 ? "#49d17a" : "#e24b4b");
    html += `<div class="row"><span>Food</span><b>${Math.round(a.food)}%</b></div>`;
    html += bar(a.food, "#6ea8ff");
    html += `<div class="row"><span>Rest</span><b>${Math.round(a.rest)}%</b></div>`;
    html += bar(a.rest, "#9b6cd5");
    html += `<div class="row"><span>State</span><b>${a.alive ? a.task?.type ?? "idle" : "dead"}</b></div>`;
    if (a.guest && isFinite(a.stay)) {
      html += `<div class="row"><span>Leaves in</span><b>${Math.max(0, Math.round(a.stay))}s</b></div>`;
    }
  } else if (sel.kind === "structure") {
    const s = world.structures[sel.id];
    if (!s) {
      panel.classList.remove("show");
      return;
    }
    const def = STRUCTURES[s.kind];
    html += `<h3>${def.label}</h3>`;
    html += `<div class="row"><span>Power</span><b>${def.gen ? `+${def.gen}` : def.draw ? `−${def.draw}` : "0"} PU</b></div>`;
    if (def.draw > 0) {
      html += `<div class="row"><span>Status</span><b style="color:${s.powered ? "#49d17a" : "#e24b4b"}">${s.powered ? "powered" : "unpowered"}</b></div>`;
    }
    if (s.kind === "pod") {
      html += `<div class="row"><span>Occupant</span><b>${s.occupantId >= 0 ? "in use" : "free"}</b></div>`;
    } else if (s.kind === "synth") {
      html += `<div class="row"><span>Cooking</span><b>${Math.round(s.timer * 10)}%</b></div>`;
    }
  } else if (sel.kind === "site") {
    const site = world.sites[sel.id];
    if (!site) {
      panel.classList.remove("show");
      return;
    }
    html += `<h3>Asteroid</h3>`;
    html += `<div class="row"><span>Richness</span><b>${Math.round(site.richness)}</b></div>`;
    html += bar((site.richness / 1000) * 100, "#8a7a5c");
  }

  panel.innerHTML = html;
  panel.classList.add("show");
}

function buildPalette(state: UIState): void {
  const bar = document.getElementById("palette");
  if (!bar) return;
  const buttons: HTMLButtonElement[] = [];

  for (const entry of PALETTE) {
    if (entry.group) {
      const h = document.createElement("div");
      h.className = "group";
      h.textContent = entry.group;
      bar.appendChild(h);
    }
    const b = document.createElement("button");
    b.textContent = entry.label;
    if (entry.t === state.tool) b.classList.add("active");
    b.onclick = () => {
      state.tool = entry.t;
      for (const x of buttons) x.classList.remove("active");
      b.classList.add("active");
    };
    buttons.push(b);
    bar.appendChild(b);
  }

  const legend = document.createElement("div");
  legend.id = "legend";
  const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  legend.innerHTML =
    `<div><span class="sw" style="background:${hex(COLORS.atmosphere)}"></span>breathable air</div>` +
    `<div><span class="sw" style="background:${hex(COLORS.floorSealed)}"></span>sealed (no air)</div>` +
    `<div><span class="sw" style="background:${hex(COLORS.floorOpen)}"></span>open to space</div>`;
  bar.appendChild(legend);
}

function buildTimeControls(world: World): void {
  const bar = document.getElementById("topbar");
  if (!bar) return;

  const power = document.createElement("span");
  power.id = "power";
  bar.appendChild(power);

  const ctl = document.createElement("span");
  ctl.id = "timectl";
  speedButtons = SPEEDS.map(({ s, label, title }) => {
    const b = document.createElement("button");
    b.className = "tbtn";
    b.textContent = label;
    b.title = title;
    if (world.speed === s) b.classList.add("active");
    b.onclick = () => {
      world.speed = s;
      for (const x of speedButtons) x.classList.remove("active");
      b.classList.add("active");
    };
    ctl.appendChild(b);
    return b;
  });
  bar.appendChild(ctl);
}

export function updateHud(world: World): void {
  const p = world.power;
  const pct = p.batteryMax > 0 ? Math.round((p.battery / p.batteryMax) * 100) : 0;
  const power = document.getElementById("power");
  if (power) {
    power.innerHTML =
      `⚡ ${p.supply}/${p.draw} PU&nbsp;&nbsp;🔋 ${pct}%` +
      (p.brownout ? ` &nbsp;<b style="color:#ff6a6a">BROWNOUT</b>` : "");
  }

  let alive = 0;
  let dead = 0;
  let guests = 0;
  for (const id in world.agents) {
    const a = world.agents[id];
    if (a.alive) {
      alive++;
      if (a.guest) guests++;
    } else {
      dead++;
    }
  }
  const seen = new Set<number>();
  let breathable = 0;
  for (const c of world.cells) {
    if (c.roomId >= 0 && !seen.has(c.roomId)) {
      seen.add(c.roomId);
      if (world.rooms[c.roomId]?.breathable) breathable++;
    }
  }
  const status = document.getElementById("status");
  if (status) {
    const st = world.stock;
    status.textContent =
      `¢${Math.floor(world.credits)} · rooms: ${seen.size} (${breathable} air) · ` +
      `crew: ${alive}${guests ? ` (${guests} guest)` : ""}` +
      (dead ? `, ${dead} dead` : "") +
      ` · B/W/meals: ${Math.floor(st.biomass)}/${Math.floor(st.water)}/${st.meals}`;
  }

  // keep speed buttons in sync (e.g. if changed programmatically)
  SPEEDS.forEach(({ s }, i) => {
    speedButtons[i]?.classList.toggle("active", world.speed === s);
  });
}
