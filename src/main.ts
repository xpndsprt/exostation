import { Application, Container, Ticker } from "pixi.js";
import { createWorld, setCell, addStructure, addStructureMulti, addSite, eraseAt, addAgent, inBounds, idx } from "./world";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { maintenanceSystem } from "./maintenance";
import { miningSystem } from "./mining";
import { foodSystem } from "./food";
import { atmosphereSystem } from "./atmosphere";
import { agentSystem } from "./agents";
import { moodSystem } from "./mood";
import { combatSystem } from "./combat";
import { economySystem } from "./economy";
import { updateSeen } from "./advisor";
import { saveWorld, loadWorld } from "./persistence";
import { canPlace, isAreaTool, rectCells, solarFootprint } from "./placement";
import { Renderer } from "./renderer";
import { createCamera, screenToTile, zoomAt } from "./camera";
import {
  setupUI,
  updateHud,
  updateInfo,
  renderAdvisor,
  pushAlert,
  showTooltip,
  hideTooltip,
  showDragLabel,
  hideDragLabel,
  setActiveTool,
  setSpeed,
  markSaved,
  TOOL_KEYS,
  UIHandlers,
} from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES } from "./structures";
import { SPECIES } from "./species";
import { HoverTarget, OverlayMode, Selection, Speed, StructureKind, UIState, World } from "./types";

const STEP = 1 / SIM_HZ;

function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  maintenanceSystem(world, dt);
  miningSystem(world, dt);
  foodSystem(world, dt);
  atmosphereSystem(world);
  agentSystem(world, dt);
  moodSystem(world, dt);
  combatSystem(world, dt);
  economySystem(world, dt);
  world.tick++;
}

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
  let overlay: OverlayMode = "none";
  let needRedraw = true;
  const canvas = app.canvas;
  const STRUCTURE_TOOLS = Object.keys(STRUCTURES) as StructureKind[];
  const known = new Map<number, boolean>();

  const applyCam = (): void => {
    worldContainer.position.set(cam.x, cam.y);
    worldContainer.scale.set(cam.scale);
  };

  const centerOnCell = (cell: number): void => {
    const wx = (cell % world.w) * TILE + TILE / 2;
    const wy = ((cell / world.w) | 0) * TILE + TILE / 2;
    cam.x = window.innerWidth / 2 - wx * cam.scale;
    cam.y = window.innerHeight / 2 - wy * cam.scale;
    applyCam();
  };

  const recenter = (): void => {
    let minx = 1e9;
    let miny = 1e9;
    let maxx = -1;
    let maxy = -1;
    const grow = (cell: number): void => {
      const x = cell % world.w;
      const y = (cell / world.w) | 0;
      minx = Math.min(minx, x);
      miny = Math.min(miny, y);
      maxx = Math.max(maxx, x);
      maxy = Math.max(maxy, y);
    };
    for (let i = 0; i < world.cells.length; i++) if (world.cells[i].type !== "space") grow(i);
    for (const id in world.sites) grow(world.sites[id].cell);
    if (maxx < 0) {
      minx = world.w / 2 - 1;
      maxx = world.w / 2;
      miny = world.h / 2 - 1;
      maxy = world.h / 2;
    }
    const cx = ((minx + maxx + 1) / 2) * TILE;
    const cy = ((miny + maxy + 1) / 2) * TILE;
    cam.x = window.innerWidth / 2 - cx * cam.scale;
    cam.y = window.innerHeight / 2 - cy * cam.scale;
    applyCam();
  };

  const rememberAgents = (): void => {
    known.clear();
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive) known.set(+id, a.guest);
    }
  };

  const handlers: UIHandlers = {
    onSave: () => {
      const ok = saveWorld(world);
      if (ok) markSaved();
      else pushAlert("Save failed.", "bad");
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
    onDeconstruct: (id) => {
      const s = world.structures[id];
      if (!s) return;
      eraseAt(world, s.cell % world.w, (s.cell / world.w) | 0);
      if (sel && sel.kind === "structure" && sel.id === id) sel = null;
      needRedraw = true;
    },
    onToggle: (id) => {
      const s = world.structures[id];
      if (s) s.on = !s.on;
      needRedraw = true;
    },
    onOverlay: (m) => {
      overlay = m;
      needRedraw = true;
    },
    onRecenter: recenter,
  };

  setupUI(state, world, handlers);
  applyCam();

  const tileAt = (clientX: number, clientY: number): { tx: number; ty: number } => {
    const rect = canvas.getBoundingClientRect();
    return screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
  };

  const applyTool = (tx: number, ty: number): void => {
    if (!inBounds(world, tx, ty)) return;
    const tool = state.tool;
    if (tool === "floor") setCell(world, tx, ty, "floor");
    else if (tool === "wall") setCell(world, tx, ty, "wall");
    else if (tool === "door") setCell(world, tx, ty, "door");
    else if (tool === "erase") eraseAt(world, tx, ty);
    else if (tool === "human") addAgent(world, tx, ty);
    else if (tool === "thol") addAgent(world, tx, ty, "thol");
    else if (tool === "asteroid") addSite(world, tx, ty);
    else if (tool === "solar") {
      const fp = solarFootprint(world, tx, ty);
      if (fp) addStructureMulti(world, "solar", fp);
    } else if ((STRUCTURE_TOOLS as string[]).includes(tool))
      addStructure(world, tool as StructureKind, tx, ty);
    needRedraw = true;
  };

  const pickEntity = (cell: number): Selection => {
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive && a.cell === cell) return { kind: "agent", id: +id };
    }
    const c = world.cells[cell];
    if (c.structureId >= 0) return { kind: "structure", id: c.structureId };
    for (const id in world.sites) if (world.sites[id].cell === cell) return { kind: "site", id: +id };
    return null;
  };

  const selCell = (): number => {
    if (!sel) return -1;
    if (sel.kind === "agent") return world.agents[sel.id]?.cell ?? -1;
    if (sel.kind === "structure") return world.structures[sel.id]?.cell ?? -1;
    return world.sites[sel.id]?.cell ?? -1;
  };

  // --- pointer interaction ---
  let painting = false; // drag-place point tools
  let dragging = false; // area rect drag
  let panning = false;
  let dragStart = -1;
  let lastX = 0;
  let lastY = 0;

  const updateCursorAndGhost = (clientX: number, clientY: number): void => {
    const { tx, ty } = tileAt(clientX, clientY);
    const within = inBounds(world, tx, ty);
    const hover = within ? idx(world, tx, ty) : -1;
    const tool = state.tool;

    // ghost cells
    let ghost: number[] = [];
    let valid = true;
    if (dragging && dragStart >= 0 && hover >= 0) {
      ghost = rectCells(world, dragStart, hover);
      valid = canPlace(world, tool, tx, ty);
      const w = Math.abs((dragStart % world.w) - tx) + 1;
      const h = Math.abs(((dragStart / world.w) | 0) - ty) + 1;
      showDragLabel(`${w}×${h}`, clientX, clientY);
    } else if (hover >= 0 && tool === "solar") {
      const fp = solarFootprint(world, tx, ty);
      ghost = fp ?? [hover];
      valid = fp !== null;
    } else if (hover >= 0 && tool !== "pan" && tool !== "select") {
      ghost = [hover];
      valid = canPlace(world, tool, tx, ty);
    }
    renderer.drawCursor(world, ghost, valid, hover);

    // cursor style
    let cursor = "default";
    if (tool === "pan") cursor = panning ? "grabbing" : "grab";
    else if (tool === "select") cursor = "pointer";
    else cursor = within && canPlace(world, tool, tx, ty) ? "crosshair" : "not-allowed";
    canvas.style.cursor = cursor;

    // tooltip (skip while actively building)
    if (!dragging && !painting && !panning && hover >= 0) {
      const ent = pickEntity(hover);
      const target: HoverTarget = ent ?? (tool === "select" || tool === "pan" ? { kind: "cell", cell: hover } : null);
      if (target) showTooltip(world, target, clientX, clientY);
      else hideTooltip();
    } else {
      hideTooltip();
    }
  };

  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener("pointerdown", (e) => {
    const { tx, ty } = tileAt(e.clientX, e.clientY);
    if (e.button === 2 || state.tool === "pan") {
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (state.tool === "select") {
      sel = inBounds(world, tx, ty) ? pickEntity(idx(world, tx, ty)) : null;
      needRedraw = true;
    } else if (isAreaTool(state.tool)) {
      dragging = true;
      dragStart = inBounds(world, tx, ty) ? idx(world, tx, ty) : -1;
    } else {
      painting = true;
      applyTool(tx, ty);
    }
    updateCursorAndGhost(e.clientX, e.clientY);
  });

  window.addEventListener("pointerup", (e) => {
    if (dragging && dragStart >= 0) {
      const { tx, ty } = tileAt(e.clientX, e.clientY);
      if (inBounds(world, tx, ty)) {
        for (const cell of rectCells(world, dragStart, idx(world, tx, ty))) {
          applyTool(cell % world.w, (cell / world.w) | 0);
        }
      }
    }
    painting = false;
    dragging = false;
    panning = false;
    dragStart = -1;
    hideDragLabel();
  });

  window.addEventListener("pointermove", (e) => {
    if (panning) {
      cam.x += e.clientX - lastX;
      cam.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      applyCam();
    } else if (painting) {
      const { tx, ty } = tileAt(e.clientX, e.clientY);
      applyTool(tx, ty);
    }
    updateCursorAndGhost(e.clientX, e.clientY);
  });

  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      zoomAt(cam, e.clientX - rect.left, e.clientY - rect.top, factor);
      applyCam();
      updateCursorAndGhost(e.clientX, e.clientY);
    },
    { passive: false },
  );

  // --- keyboard shortcuts ---
  let lastSpeed: Speed = 1;
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (k === " " || e.code === "Space") {
      e.preventDefault();
      if (world.speed !== 0) {
        lastSpeed = world.speed;
        setSpeed(world, 0);
      } else setSpeed(world, lastSpeed || 1);
      needRedraw = true;
    } else if (k === "]") {
      setSpeed(world, Math.min(3, world.speed + 1) as Speed);
      needRedraw = true;
    } else if (k === "[") {
      setSpeed(world, Math.max(0, world.speed - 1) as Speed);
      needRedraw = true;
    } else if (k === "escape") {
      setActiveTool("select", state);
    } else if (TOOL_KEYS[k]) {
      setActiveTool(TOOL_KEYS[k], state);
    }
  });

  // --- alerts (transition detection) ---
  let prevBrownout = false;
  let prevFighting = false;
  const detectAlerts = (): void => {
    if (world.power.brownout && !prevBrownout) pushAlert("Brownout — shedding power.", "warn");
    prevBrownout = world.power.brownout;

    let anyFight = false;
    for (const id in world.agents) if (world.agents[id].fighting) anyFight = true;
    if (anyFight && !prevFighting) pushAlert("Skirmish! Crew are fighting.", "bad");
    prevFighting = anyFight;

    const curAlive = new Map<number, boolean>();
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive) curAlive.set(+id, a.guest);
    }
    for (const [id, guest] of curAlive) {
      if (!known.has(id) && guest) {
        const cell = world.agents[id].cell;
        pushAlert("A Drenn guest docked.", "info", () => {
          sel = { kind: "agent", id };
          centerOnCell(cell);
          needRedraw = true;
        });
      }
    }
    for (const [id, guest] of known) {
      if (!curAlive.has(id)) {
        const a = world.agents[id];
        if (a && !a.alive) {
          pushAlert(`A ${SPECIES[a.species].label} died.`, "bad", () => {
            sel = { kind: "agent", id };
            centerOnCell(a.cell);
            needRedraw = true;
          });
        } else if (!a && guest) {
          pushAlert("A Drenn guest departed.", "info");
        }
      }
    }
    rememberAgents();

    // contextual hints (throttled by message-grouping in pushAlert)
    for (const id in world.agents) {
      const a = world.agents[id];
      if (!a.alive) continue;
      const room = world.cells[a.cell].roomId;
      const gas = room >= 0 ? world.rooms[room]?.gas : "none";
      if (a.o2 < 40 && gas !== SPECIES[a.species].gas) {
        pushAlert("Crew can't breathe — check atmosphere.", "warn");
        break;
      }
    }
    if (world.stock.meals === 0) {
      for (const id in world.agents) {
        const a = world.agents[id];
        if (a.alive && a.food < 30) {
          pushAlert("Crew are hungry and there are no meals.", "warn");
          break;
        }
      }
    }
  };

  // --- autosave ---
  setInterval(() => {
    if (saveWorld(world)) markSaved();
  }, 30000);

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
      refresh(world);
    }

    if (needRedraw) {
      const sc = selCell();
      if (sc < 0 && sel) sel = null;
      updateSeen(world);
      renderer.draw(world, sc, overlay);
      updateHud(world);
      updateInfo(world, sel, handlers);
      renderAdvisor(world);
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
