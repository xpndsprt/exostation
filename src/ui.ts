import { Tool, UIState } from "./types";
import { COLORS } from "./config";

const TOOLS: { t: Tool; label: string }[] = [
  { t: "floor", label: "Floor" },
  { t: "wall", label: "Wall" },
  { t: "erase", label: "Erase" },
  { t: "pan", label: "Pan" },
];

export function setupUI(state: UIState): void {
  const bar = document.getElementById("palette");
  if (!bar) return;

  for (const { t, label } of TOOLS) {
    const b = document.createElement("button");
    b.textContent = label;
    if (t === state.tool) b.classList.add("active");
    b.onclick = () => {
      state.tool = t;
      for (const child of Array.from(bar.children)) child.classList.remove("active");
      b.classList.add("active");
    };
    bar.appendChild(b);
  }

  const legend = document.createElement("div");
  legend.id = "legend";
  const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");
  legend.innerHTML =
    `<div><span class="sw" style="background:${hex(COLORS.floorSealed)}"></span>sealed room</div>` +
    `<div><span class="sw" style="background:${hex(COLORS.floorOpen)}"></span>open to space</div>` +
    `<div><span class="sw" style="background:${hex(COLORS.wall)}"></span>wall</div>`;
  bar.appendChild(legend);
}

export function setStatus(text: string): void {
  const el = document.getElementById("status");
  if (el) el.textContent = text;
}
