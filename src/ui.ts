import { Speed, Tool, UIState, World } from "./types";
import { COLORS } from "./config";

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
  { t: "pan", label: "Pan", group: "View" },
];

const SPEEDS: { s: Speed; label: string; title: string }[] = [
  { s: 0, label: "❚❚", title: "Pause" },
  { s: 1, label: "▶", title: "1×" },
  { s: 2, label: "▶▶", title: "2×" },
  { s: 3, label: "▶▶▶", title: "3×" },
];

let speedButtons: HTMLButtonElement[] = [];

export function setupUI(state: UIState, world: World): void {
  buildPalette(state);
  buildTimeControls(world);
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
