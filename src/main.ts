import { Application, Container } from "pixi.js";
import { createWorld, setCell, inBounds } from "./world";
import { recomputeRooms } from "./rooms";
import { Renderer } from "./renderer";
import { createCamera, screenToTile, zoomAt } from "./camera";
import { setupUI, setStatus } from "./ui";
import { TILE, COLORS } from "./config";
import { UIState } from "./types";

async function boot(): Promise<void> {
  const app = new Application();
  await app.init({
    background: COLORS.space,
    resizeTo: window,
    antialias: true,
  });
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
  setupUI(state);

  const applyCam = (): void => {
    worldContainer.position.set(cam.x, cam.y);
    worldContainer.scale.set(cam.scale);
  };
  applyCam();

  let needRedraw = true;
  const canvas = app.canvas;

  const paintAt = (clientX: number, clientY: number): void => {
    const rect = canvas.getBoundingClientRect();
    const { tx, ty } = screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
    if (!inBounds(world, tx, ty)) return;
    if (state.tool === "floor") setCell(world, tx, ty, "floor");
    else if (state.tool === "wall") setCell(world, tx, ty, "wall");
    else if (state.tool === "erase") setCell(world, tx, ty, "space");
    if (world.dirtyRooms) needRedraw = true;
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

  app.ticker.add(() => {
    if (world.dirtyRooms) recomputeRooms(world);
    if (needRedraw) {
      renderer.draw(world);
      needRedraw = false;
      let rooms = 0;
      let sealed = 0;
      for (const c of world.cells) {
        if (c.type === "floor" && c.enclosed) sealed++;
      }
      const seen = new Set<number>();
      for (const c of world.cells) if (c.roomId >= 0) seen.add(c.roomId);
      rooms = seen.size;
      setStatus(`rooms: ${rooms} · sealed tiles: ${sealed}`);
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
