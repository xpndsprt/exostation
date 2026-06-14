import { Application, Container, Ticker } from "pixi.js";
import "../assets/sprites.js"; // populates window.SPRITES (shared with the editor)
import { createWorld, setCell, addStructureMulti, addDock, seedAsteroids, eraseAt, inBounds, idx } from "./world";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { maintenanceSystem } from "./maintenance";
import { miningSystem } from "./mining";
import { foodSystem } from "./food";
import { fuelSystem } from "./fuel";
import { overflowSystem } from "./overflow";
import { atmosphereSystem } from "./atmosphere";
import { harmonySystem } from "./harmony";
import { agentSystem } from "./agents";
import { moodSystem } from "./mood";
import { combatSystem } from "./combat";
import { medicalSystem } from "./medical";
import { encountersSystem } from "./encounters";
import { economySystem } from "./economy";
import { eventsSystem } from "./events";
import { requestsSystem } from "./requests";
import { beaconSystem } from "./beacon";
import { objectivesSystem } from "./objectives";
import { buyUnlock, toolLock, isUnlocked, UNLOCKS, canResearch } from "./research";
import { updateSeen } from "./advisor";
import { resolveEncounter } from "./encounters";
import { saveWorld, loadWorld, deleteSave } from "./persistence";
import { canPlace, isAreaTool, dragCells, solarFootprint, footprintCells } from "./placement";
import { Renderer } from "./renderer";
import { createCamera, screenToTile, zoomAt } from "./camera";
import {
  setupUI,
  updateHud,
  updateInfo,
  renderAdvisor,
  renderAlienpedia,
  renderRequests,
  renderObjective,
  renderTutorial,
  renderTech,
  refreshPalette,
  showEndBanner,
  hideEndBanner,
  pushAlert,
  showTooltip,
  hideTooltip,
  showDragLabel,
  hideDragLabel,
  setActiveTool,
  setSpeed,
  markSaved,
  showFirstContact,
  isFirstContactOpen,
  showEncounter,
  isEncounterOpen,
  TOOL_KEYS,
  UIHandlers,
} from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES, costOf, isDock } from "./structures";
import { SPECIES } from "./species";
import { HoverTarget, OverlayMode, Phase, Selection, Speed, StructureKind, UIState, World } from "./types";

const STEP = 1 / SIM_HZ;

function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  maintenanceSystem(world, dt);
  miningSystem(world, dt);
  foodSystem(world, dt);
  fuelSystem(world, dt);
  overflowSystem(world, dt);
  atmosphereSystem(world);
  harmonySystem(world);
  agentSystem(world, dt);
  moodSystem(world, dt);
  combatSystem(world, dt);
  medicalSystem(world, dt);
  economySystem(world, dt);
  eventsSystem(world, dt);
  requestsSystem(world, dt);
  encountersSystem(world, dt);
  beaconSystem(world, dt);
  objectivesSystem(world, dt);
  world.tick++;
}

function refresh(world: World): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, 0);
  atmosphereSystem(world);
}

async function boot(): Promise<void> {
  const app = new Application();
  // Force WebGL: dynamic CanvasSource texture re-uploads (the lighting buffer,
  // updated every frame via source.update()) don't reliably refresh on the WebGPU
  // backend, which left the multiply-lightmap blank → a black screen. WebGL is
  // plenty for 2D and avoids the "Failed to create WebGPU Context Provider" warning.
  await app.init({ preference: "webgl", background: COLORS.space, resizeTo: window, antialias: true });
  const mount = document.getElementById("app");
  if (!mount) throw new Error("#app mount missing");
  mount.appendChild(app.canvas);

  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  const world = createWorld();
  seedAsteroids(world); // scatter natural asteroids to mine
  const cam = createCamera();
  const renderer = new Renderer(worldContainer, app.renderer);
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

  let prevPhase: Phase = "playing";
  const restart = (): void => {
    const fresh = createWorld();
    seedAsteroids(fresh);
    Object.assign(world, fresh);
    world.dirtyRooms = true;
    sel = null;
    overlay = "none";
    known.clear();
    prevPhase = "playing";
    setSpeed(world, 1);
    recenter();
    needRedraw = true;
  };

  const handlers: UIHandlers = {
    onSaveSlot: (slot) => {
      if (saveWorld(world, slot)) {
        markSaved();
        pushAlert(slot === "auto" ? "Autosaved ✓" : `Saved to Slot ${slot} ✓`, "info");
      } else pushAlert("Save failed.", "bad");
    },
    onLoadSlot: (slot) => {
      const loaded = loadWorld(slot);
      if (!loaded) {
        pushAlert("That slot is empty.", "warn");
        return;
      }
      Object.assign(world, loaded);
      world.dirtyRooms = true;
      sel = null;
      overlay = "none";
      rememberAgents();
      prevPhase = world.phase;
      hideEndBanner();
      needRedraw = true;
      pushAlert("Station loaded.", "info");
    },
    onDeleteSlot: (slot) => {
      deleteSave(slot);
      pushAlert(`Deleted ${slot === "auto" ? "autosave" : "Slot " + slot}.`, "info");
    },
    onDeconstruct: (id) => {
      const s = world.structures[id];
      if (!s) return;
      world.credits += Math.floor(costOf(s.kind) * 0.5); // 50% salvage refund
      eraseAt(world, s.cell % world.w, (s.cell / world.w) | 0);
      if (sel && sel.kind === "structure" && sel.id === id) sel = null;
      needRedraw = true;
    },
    onToggle: (id) => {
      const s = world.structures[id];
      if (s) s.on = !s.on;
      needRedraw = true;
    },
    onRecipe: (id) => {
      const s = world.structures[id];
      if (!s) return;
      const next = s.kind === "synth" ? (s.recipe === "fungal" ? "rations" : "fungal") : s.kind === "vat" ? (s.recipe === "spores" ? "biomass" : "spores") : null;
      if (next === null) return;
      if ((next === "fungal" || next === "spores") && !isUnlocked(world, "fungal")) {
        pushAlert("Research Fungal Synthesis at a Lab first.", "warn");
        return;
      }
      s.recipe = next;
      needRedraw = true;
    },
    onOverlay: (m) => {
      overlay = m;
      needRedraw = true;
    },
    onRecenter: recenter,
    onBuyUnlock: (id) => {
      const u = UNLOCKS.find((x) => x.id === id);
      if (!u || isUnlocked(world, id)) return;
      // Always give feedback — never an inert click.
      const r = canResearch(world, u);
      if (!r.ok) {
        pushAlert(`${u.label}: ${r.reason}`, "warn");
        return;
      }
      if (buyUnlock(world, id)) {
        pushAlert(`Researched: ${u.label}.`, "info");
        refreshPalette(world);
        needRedraw = true;
      }
    },
    onCycle: (kind) => {
      const list = Object.values(world.structures).filter((s) => s.kind === kind);
      if (list.length === 0) {
        pushAlert(`No ${kind} built yet.`, "warn");
        return;
      }
      const next = ((cycleIx[kind] ?? -1) + 1) % list.length;
      cycleIx[kind] = next;
      const s = list[next];
      sel = { kind: "structure", id: s.id };
      centerOnCell(s.cell);
      needRedraw = true;
    },
    onLocateSpecies: (sp) => {
      let target = -1;
      for (const id in world.agents) {
        const a = world.agents[id];
        if (a.alive && a.species === sp) {
          target = a.cell;
          break;
        }
      }
      if (target < 0) return;
      renderer.flashSpecies(sp);
      centerOnCell(target);
      needRedraw = true;
    },
  };
  const cycleIx: Record<string, number> = {};

  setupUI(state, world, handlers);
  applyCam();

  const tileAt = (clientX: number, clientY: number): { tx: number; ty: number } => {
    const rect = canvas.getBoundingClientRect();
    return screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
  };

  const applyTool = (tx: number, ty: number): void => {
    if (!inBounds(world, tx, ty)) return;
    const tool = state.tool;
    // free actions
    if (tool === "erase") {
      eraseAt(world, tx, ty);
      needRedraw = true;
      return;
    }
    // paid actions — only charge on a successful placement
    if (toolLock(world, tool)) return; // tech not researched yet
    const cost = costOf(tool);
    if (world.credits < cost) return;
    let ok = false;
    if (tool === "floor") {
      if (world.cells[idx(world, tx, ty)].type !== "floor") {
        setCell(world, tx, ty, "floor");
        ok = true;
      }
    } else if (tool === "wall") {
      if (world.cells[idx(world, tx, ty)].type !== "wall") {
        setCell(world, tx, ty, "wall");
        ok = true;
      }
    } else if (tool === "door") {
      if (world.cells[idx(world, tx, ty)].type !== "door") {
        setCell(world, tx, ty, "door");
        ok = true;
      }
    } else if (tool === "solar") {
      const fp = solarFootprint(world, tx, ty);
      if (fp) ok = addStructureMulti(world, "solar", fp);
    } else if (isDock(tool as StructureKind)) {
      ok = addDock(world, tx, ty, tool as StructureKind);
    } else if ((STRUCTURE_TOOLS as string[]).includes(tool)) {
      const fp = footprintCells(world, tool as StructureKind, tx, ty);
      if (fp) ok = addStructureMulti(world, tool as StructureKind, fp);
    }
    if (ok) {
      world.credits -= cost;
      needRedraw = true;
    }
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
    let anchor = -1; // facing marker (e.g. a solar panel's wall-mounted base)
    if (dragging && dragStart >= 0 && hover >= 0) {
      ghost = dragCells(world, dragStart, hover, tool);
      valid = canPlace(world, tool, tx, ty);
      const w = Math.abs((dragStart % world.w) - tx) + 1;
      const h = Math.abs(((dragStart / world.w) | 0) - ty) + 1;
      // live running cost: only empties actually get built, so count placeable cells
      const unit = costOf(tool);
      let buildable = 0;
      for (const cell of ghost) if (canPlace(world, tool, cell % world.w, (cell / world.w) | 0)) buildable++;
      const total = unit * buildable;
      const label = unit > 0 ? `${w}×${h} · ¢${total}` : `${w}×${h}`;
      showDragLabel(label, clientX, clientY, total > world.credits);
    } else if (hover >= 0 && tool === "solar") {
      const fp = solarFootprint(world, tx, ty);
      ghost = fp ?? [hover];
      valid = fp !== null;
      if (fp) anchor = fp[0]; // the wall-mounted base, so the facing is unmistakable
    } else if (hover >= 0 && tool in STRUCTURES && !isDock(tool as StructureKind)) {
      const fp = footprintCells(world, tool as StructureKind, tx, ty);
      ghost = fp ?? [hover];
      valid = fp !== null;
    } else if (hover >= 0 && tool !== "pan" && tool !== "select") {
      ghost = [hover];
      valid = canPlace(world, tool, tx, ty);
    }
    renderer.drawCursor(world, ghost, valid, hover, anchor);

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
        for (const cell of dragCells(world, dragStart, idx(world, tx, ty), state.tool)) {
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
    // drain transient station-incident messages (M29 events)
    while (world.notify.length) pushAlert(world.notify.shift() as string, "warn");

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
      if (!known.has(id)) {
        const a = world.agents[id];
        const cell = a.cell;
        const label = SPECIES[a.species].label;
        const msg = guest ? `A ${label} guest docked.` : `${label} crew arrived by shuttle.`;
        pushAlert(msg, "info", () => {
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
    for (const id in world.agents) {
      const a = world.agents[id];
      if (a.alive && a.food < 30 && world.stock.meals[SPECIES[a.species].diet] === 0) {
        pushAlert("Crew are hungry — no meals of their food type.", "warn");
        break;
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

    // victory / defeat transitions — pause and surface the end banner
    if (world.phase !== prevPhase) {
      prevPhase = world.phase;
      if (world.phase === "won") {
        setSpeed(world, 0);
        showEndBanner("won", "Keep building", () => setSpeed(world, 1));
      } else if (world.phase === "lost") {
        setSpeed(world, 0);
        showEndBanner("lost", "New station", restart);
      } else {
        hideEndBanner();
      }
      needRedraw = true;
    }

    if (needRedraw) {
      const sc = selCell();
      if (sc < 0 && sel) sel = null;
      const firstSeen = updateSeen(world);
      if (firstSeen.length && world.phase === "playing") {
        const resumeSpeed = world.speed || 1; // pause to read; restore after
        setSpeed(world, 0);
        showFirstContact(firstSeen, () => {
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
        });
      }
      // a pending social encounter pauses the game for the player's choice
      // (defer if a first-contact card is still up — they share the pause)
      if (world.encounter && world.phase === "playing" && !isEncounterOpen() && !isFirstContactOpen()) {
        const resumeSpeed = world.speed || 1;
        setSpeed(world, 0);
        showEncounter(world.encounter, (choice) => {
          const msg = resolveEncounter(world, choice);
          if (msg) pushAlert(msg, "info");
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
          needRedraw = true;
        });
      }
      renderer.draw(world, sc, overlay);
      updateHud(world);
      updateInfo(world, sel, handlers);
      renderTech(world, handlers.onBuyUnlock);
      refreshPalette(world);
      renderRequests(world);
      renderAlienpedia(world, handlers.onLocateSpecies);
      renderAdvisor(world);
      renderObjective(world);
      renderTutorial(world);
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
