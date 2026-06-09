import { Application, Container, Ticker } from "pixi.js";
import { createWorld, setCell, addStructure, addSite, eraseAt, addAgent, inBounds } from "./world";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { miningSystem } from "./mining";
import { foodSystem } from "./food";
import { atmosphereSystem } from "./atmosphere";
import { agentSystem } from "./agents";
import { economySystem } from "./economy";
import { saveWorld, loadWorld } from "./persistence";
import { Renderer } from "./renderer";
import { createCamera, screenToTile, zoomAt } from "./camera";
import { setupUI, updateHud, updateInfo, pushAlert } from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES } from "./structures";
import { Selection, StructureKind, UIState, World } from "./types";

const STEP = 1 / SIM_HZ; // seconds per simulation step

// One simulation step (fixed dt). Order matches TECH_DESIGN.md.
function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  miningSystem(world, dt);
  foodSystem(world, dt);
  atmosphereSystem(world);
  agentSystem(world, dt);
  economySystem(world, dt);
  world.tick++;
}

// Recompute derived state without advancing time (so a paused view stays
// consistent right after the player builds something).
function refresh(world: World): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, 0);
  atmosphereSystem(world);
}

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({ background: COLORS.space, resizeTo: window, antialias: true });
  const mount = document.getElementById("app");
  if (!mount) throw new Error("#app mount missing");
  mount.appendChild(app.canvas);

  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  const world = createWorld();
  const cam = createCamera();
  const renderer = new Renderer(worldContainer);
  renderer.drawGrid(world.w, world.h);

  const state: UIState = { tool: "floor" };
  let sel: Selection = null;
  const known = new Map<number, boolean>(); // alive agent id -> isGuest (for alerts)

  const rememberAgents = (): void => {
    known.clear();
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive) known.set(+id, a.guest);
    }
  };

  setupUI(state, world, {
    onSave: () => {
      const ok = saveWorld(world);
      pushAlert(ok ? "Station saved." : "Save failed.", ok ? "info" : "bad");
    },
    onLoad: () => {
      const loaded = loadWorld();
      if (!loaded) {
        pushAlert("No save found.", "warn");
        return;
      }
      Object.assign(world, loaded);
      world.dirtyRooms = true;
      sel = null;
      rememberAgents();
      needRedraw = true;
      pushAlert("Station loaded.", "info");
    },
  });

  const applyCam = (): void => {
    worldContainer.position.set(cam.x, cam.y);
    worldContainer.scale.set(cam.scale);
  };
  applyCam();

  let needRedraw = true;
  const canvas = app.canvas;
  const STRUCTURE_TOOLS = Object.keys(STRUCTURES) as StructureKind[];

  const tileAt = (clientX: number, clientY: number): { tx: number; ty: number } => {
    const rect = canvas.getBoundingClientRect();
    return screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
  };

  const paintAt = (clientX: number, clientY: number): void => {
    const { tx, ty } = tileAt(clientX, clientY);
    if (!inBounds(world, tx, ty)) return;
    const tool = state.tool;
    if (tool === "floor") setCell(world, tx, ty, "floor");
    else if (tool === "wall") setCell(world, tx, ty, "wall");
    else if (tool === "erase") eraseAt(world, tx, ty);
    else if (tool === "human") addAgent(world, tx, ty);
    else if (tool === "asteroid") addSite(world, tx, ty);
    else if ((STRUCTURE_TOOLS as string[]).includes(tool))
      addStructure(world, tool as StructureKind, tx, ty);
    needRedraw = true;
  };

  const pickAt = (tx: number, ty: number): Selection => {
    if (!inBounds(world, tx, ty)) return null;
    const i = ty * world.w + tx;
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive && a.cell === i) return { kind: "agent", id: +id };
    }
    const c = world.cells[i];
    if (c.structureId >= 0) return { kind: "structure", id: c.structureId };
    for (const id in world.sites) if (world.sites[id].cell === i) return { kind: "site", id: +id };
    return null;
  };

  const selCell = (): number => {
    if (!sel) return -1;
    if (sel.kind === "agent") return world.agents[sel.id]?.cell ?? -1;
    if (sel.kind === "structure") return world.structures[sel.id]?.cell ?? -1;
    return world.sites[sel.id]?.cell ?? -1;
  };

  let painting = false;
  let panning = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    if (e.button === 2 || state.tool === "pan") {
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (state.tool === "select") {
      const { tx, ty } = tileAt(e.clientX, e.clientY);
      sel = pickAt(tx, ty);
      needRedraw = true;
    } else {
      painting = true;
      paintAt(e.clientX, e.clientY);
    }
  });
  window.addEventListener("pointerup", () => {
    painting = false;
    panning = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (panning) {
      cam.x += e.clientX - lastX;
      cam.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyCam();
    } else if (painting) {
      paintAt(e.clientX, e.clientY);
    }
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(cam, e.clientX - rect.left, e.clientY - rect.top, factor);
      applyCam();
    },
    { passive: false },
  );

  // Detect notable transitions and surface them as toasts.
  let prevBrownout = false;
  const detectAlerts = (): void => {
    if (world.power.brownout && !prevBrownout) pushAlert("Brownout — shedding power.", "warn");
    prevBrownout = world.power.brownout;

    const curAlive = new Map<number, boolean>();
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive) curAlive.set(+id, a.guest);
    }
    for (const [id, guest] of curAlive) {
      if (!known.has(id) && guest) pushAlert("A Drenn guest docked.", "info");
    }
    for (const [id, guest] of known) {
      if (!curAlive.has(id)) {
        const a = world.agents[id];
        if (a && !a.alive) {
          pushAlert(`A ${a.species === "drenn" ? "Drenn" : "crew member"} died.`, "bad");
        } else if (!a && guest) {
          pushAlert("A Drenn guest departed.", "info");
        }
      }
    }
    known.clear();
    for (const [id, guest] of curAlive) known.set(id, guest);
  };

  let acc = 0;
  app.ticker.add((ticker: Ticker) => {
    if (world.speed > 0) {
      acc += (ticker.deltaMS / 1000) * world.speed;
      let steps = 0;
      while (acc >= STEP && steps < 120) {
        simStep(world, STEP);
        acc -= STEP;
        steps++;
        needRedraw = true;
      }
      if (steps > 0) detectAlerts();
    } else if (needRedraw) {
      refresh(world); // keep paused view coherent after edits
    }

    if (needRedraw) {
      const sc = selCell();
      if (sc < 0 && sel) sel = null;
      renderer.draw(world, sc);
      updateHud(world);
      updateInfo(world, sel);
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
