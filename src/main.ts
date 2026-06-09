import { Application, Container, Ticker } from "pixi.js";
import { createWorld, setCell, addStructure, eraseAt, addAgent, inBounds } from "./world";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { foodSystem } from "./food";
import { atmosphereSystem } from "./atmosphere";
import { agentSystem } from "./agents";
import { Renderer } from "./renderer";
import { createCamera, screenToTile, zoomAt } from "./camera";
import { setupUI, updateHud } from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES } from "./structures";
import { StructureKind, UIState, World } from "./types";

const STEP = 1 / SIM_HZ; // seconds per simulation step

// One simulation step (fixed dt). Order matches TECH_DESIGN.md.
function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  foodSystem(world, dt);
  atmosphereSystem(world);
  agentSystem(world, dt);
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
  setupUI(state, world);

  const applyCam = (): void => {
    worldContainer.position.set(cam.x, cam.y);
    worldContainer.scale.set(cam.scale);
  };
  applyCam();

  let needRedraw = true;
  const canvas = app.canvas;
  const STRUCTURE_TOOLS = Object.keys(STRUCTURES) as StructureKind[];

  const paintAt = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const { tx, ty } = screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
    if (!inBounds(world, tx, ty)) return;
    const tool = state.tool;
    if (tool === "floor") setCell(world, tx, ty, "floor");
    else if (tool === "wall") setCell(world, tx, ty, "wall");
    else if (tool === "erase") eraseAt(world, tx, ty);
    else if (tool === "human") addAgent(world, tx, ty);
    else if ((STRUCTURE_TOOLS as string[]).includes(tool))
      addStructure(world, tool as StructureKind, tx, ty);
    needRedraw = true;
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
    } else if (needRedraw) {
      refresh(world); // keep paused view coherent after edits
    }

    if (needRedraw) {
      renderer.draw(world);
      updateHud(world);
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
