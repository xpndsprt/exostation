// Draggable + zoomable HUD panels. Every floating panel can be dragged to a new
// spot by grabbing any non-interactive part of it; a magnifier button scales them
// all to 1.5x. Drag positions and the zoom state persist in localStorage. Panels
// start exactly where their CSS puts them until the player moves them.

interface PanelDef { id: string; origin: string; tr: string }
// origin/tr keep each panel anchored sensibly while scaled, before it's dragged.
const PANELS: PanelDef[] = [
  { id: "leftpanel", origin: "top left", tr: "" },
  { id: "infopanel", origin: "top right", tr: "" },
  { id: "rightcol", origin: "bottom right", tr: "" },
  { id: "storyteller", origin: "top left", tr: "" },
  { id: "tutorial", origin: "top center", tr: "translateX(-50%)" },
  { id: "advisor", origin: "bottom center", tr: "translateX(-50%)" },
];
const POS_KEY = (id: string): string => "exo.panelpos." + id;
const SCALE_KEY = "exo.uiScale";
const INTERACTIVE = "button, input, select, textarea, canvas, a, label, .tool, .st, [data-act], [data-tab], [data-ind]";

// The magnifier cycles UI scale so it can be sized to fit any monitor (the panels
// + their text grow together). Persisted, so it sticks across reloads.
const SCALES = [1, 1.25, 1.5, 2];
let scaleIdx = 0;

function applyTransform(el: HTMLElement): void {
  const base = el.dataset.tr ?? "";
  const s = SCALES[scaleIdx];
  const tf = (base + (s !== 1 ? ` scale(${s})` : "")).trim();
  el.style.transform = tf || "none";
}
function applyAll(): void {
  for (const p of PANELS) {
    const el = document.getElementById(p.id) as HTMLElement | null;
    if (el) applyTransform(el);
  }
}

// Freeze a panel at an explicit screen position (drops its CSS anchor + centering
// translate) so dragging and scaling behave uniformly from its top-left.
function pin(el: HTMLElement, left: number, top: number): void {
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.right = "auto";
  el.style.bottom = "auto";
  el.dataset.tr = ""; // a dragged panel no longer needs its centering translate
  el.style.transformOrigin = "top left";
}

function makeDraggable(el: HTMLElement, id: string): void {
  el.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest(INTERACTIVE)) return; // leave controls alone
    const startX = e.clientX, startY = e.clientY;
    const rect = el.getBoundingClientRect();
    const ox = startX - rect.left, oy = startY - rect.top;
    let dragging = false;
    const move = (ev: PointerEvent): void => {
      if (!dragging) {
        if (Math.abs(ev.clientX - startX) + Math.abs(ev.clientY - startY) < 4) return;
        dragging = true;
        pin(el, rect.left, rect.top);
        applyTransform(el);
      }
      el.style.left = `${ev.clientX - ox}px`;
      el.style.top = `${ev.clientY - oy}px`;
    };
    const up = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (dragging) {
        try { localStorage.setItem(POS_KEY(id), JSON.stringify({ left: parseFloat(el.style.left), top: parseFloat(el.style.top) })); } catch { /* ignore */ }
        // swallow the click that follows a drag (e.g. so a header doesn't collapse)
        el.addEventListener("click", (c) => { c.stopPropagation(); c.preventDefault(); }, { capture: true, once: true });
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  });
}

export function setupPanels(): void {
  try { scaleIdx = Math.max(0, Math.min(SCALES.length - 1, parseInt(localStorage.getItem(SCALE_KEY) || "0", 10) || 0)); } catch { /* ignore */ }
  for (const p of PANELS) {
    const el = document.getElementById(p.id) as HTMLElement | null;
    if (!el) continue;
    el.dataset.tr = p.tr;
    el.style.transformOrigin = p.origin;
    el.style.cursor = "default";
    try {
      const raw = localStorage.getItem(POS_KEY(p.id));
      if (raw) { const s = JSON.parse(raw) as { left: number; top: number }; pin(el, s.left, s.top); }
    } catch { /* ignore */ }
    applyTransform(el);
    makeDraggable(el, p.id);
  }
  const btn = document.getElementById("zoombtn");
  if (btn) {
    const label = (): void => {
      btn.textContent = `🔍 ${Math.round(SCALES[scaleIdx] * 100)}%`;
      btn.classList.toggle("on", scaleIdx > 0);
    };
    label();
    btn.addEventListener("click", () => {
      scaleIdx = (scaleIdx + 1) % SCALES.length; // cycle 100 → 125 → 150 → 200 → 100
      try { localStorage.setItem(SCALE_KEY, String(scaleIdx)); } catch { /* ignore */ }
      label();
      applyAll();
    });
  }
}
