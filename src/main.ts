import { Application, Container, Ticker } from "pixi.js";
import "../assets/sprites.js"; // populates window.SPRITES (shared with the editor)
import { createWorld, setCell, addStructureMulti, addDock, addBay, seedSolarSystem, eraseAt, inBounds, idx } from "./world";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { maintenanceSystem } from "./maintenance";
import { miningSystem } from "./mining";
import { foodSystem } from "./food";
import { fuelSystem } from "./fuel";
import { overflowSystem } from "./overflow";
import { atmosphereSystem } from "./atmosphere";
import { hazardSystem } from "./hazards";
import { godsSystem } from "./gods";
import { storySystem } from "./story";
import { harmonySystem } from "./harmony";
import { agentSystem } from "./agents";
import { moodSystem } from "./mood";
import { combatSystem } from "./combat";
import { medicalSystem } from "./medical";
import { encountersSystem } from "./encounters";
import { spawnSystem, resolveBreed } from "./spawn";
import { romanceSystem } from "./romance";
import { economySystem, RESIDENT_SPECIES, HOTEL_SPECIES } from "./economy";
import { eventsSystem } from "./events";
import { requestsSystem } from "./requests";
import { beaconSystem } from "./beacon";
import { objectivesSystem } from "./objectives";
import { buyUnlock, toolLock, isUnlocked, UNLOCKS, canResearch, lodgingUnlocked } from "./research";
import { updateSeen } from "./advisor";
import { resolveEncounter } from "./encounters";
import * as audio from "./audio";
import { saveWorld, loadWorld, deleteSave } from "./persistence";
import { canPlace, isAreaTool, dragCells, solarFootprint, footprintCells, bayFootprint } from "./placement";
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
  showStarChart,
  isStarChartOpen,
  refreshStarChart,
  showIntro,
  renderStory,
  showGodDialog,
  isGodOpen,
  showBreedOffer,
  isBreedOpen,
  showRomance,
  isRomanceOpen,
  TOOL_KEYS,
  UIHandlers,
} from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES, costOf, isDock } from "./structures";
import { SPECIES } from "./species";
import { HoverTarget, OverlayMode, Phase, Selection, Species, Speed, StructureKind, UIState, World } from "./types";

const STEP = 1 / SIM_HZ;

// Map an incident/notify toast to a sound id (first match wins; "" = silent).
const NOTIFY_SFX: [RegExp, string][] = [
  [/raider inbound/i, "raider-inbound"],
  [/destroyed/i, "module-destroyed"],
  [/shot down a raider/i, "turret-fire"],
  [/hull breach|breached the hull/i, "breach-klaxon"],
  [/power surge/i, "power-surge"],
  [/prices/i, "market-shock"],
  [/recovered in the med bay/i, "medbay-heal"],
  [/hurt servicing/i, "injury"],
  [/storage overflowing/i, "overflow-warn"],
];
function sfxForNotify(msg: string): string {
  for (const [re, id] of NOTIFY_SFX) if (re.test(msg)) return id;
  return "";
}

function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  maintenanceSystem(world, dt);
  miningSystem(world, dt);
  foodSystem(world, dt);
  fuelSystem(world, dt);
  overflowSystem(world, dt);
  atmosphereSystem(world);
  hazardSystem(world, dt);
  harmonySystem(world);
  agentSystem(world, dt);
  moodSystem(world, dt);
  combatSystem(world, dt);
  medicalSystem(world, dt);
  spawnSystem(world, dt);
  economySystem(world, dt);
  eventsSystem(world, dt);
  godsSystem(world, dt);
  storySystem(world, dt);
  requestsSystem(world, dt);
  encountersSystem(world, dt);
  romanceSystem(world, dt);
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
  audio.initAudio(); // loads SFX + unlocks audio on the first user gesture
  const mount = document.getElementById("app");
  if (!mount) throw new Error("#app mount missing");
  mount.appendChild(app.canvas);

  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  const world = createWorld();
  seedSolarSystem(world); // populate the star system with unknown orbital bodies
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
  let prevObjectiveIx = world.objectiveIx;
  // Pause and show the new-station briefing (Beacon goal + species rules), then resume.
  const launchIntro = (): void => {
    const resume = world.speed || 1;
    setSpeed(world, 0);
    showIntro(() => {
      if (world.phase === "playing") setSpeed(world, resume);
    });
  };

  const restart = (): void => {
    const fresh = createWorld();
    seedSolarSystem(fresh);
    Object.assign(world, fresh);
    world.dirtyRooms = true;
    sel = null;
    overlay = "none";
    known.clear();
    prevPhase = "playing";
    prevObjectiveIx = world.objectiveIx;
    setSpeed(world, 1);
    recenter();
    needRedraw = true;
    launchIntro(); // a deliberate new station always gets the briefing
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
      prevObjectiveIx = world.objectiveIx;
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
      // Crew Quarters / Hotel Rooms cycle the SPECIES they're prepped for (only that
      // species sleeps there). You can prep for any species whose lodging is unlocked.
      if (s.kind === "pod" || s.kind === "hotel") {
        const opts = (s.kind === "pod" ? RESIDENT_SPECIES : HOTEL_SPECIES).filter((sp) => lodgingUnlocked(world, sp));
        if (opts.length <= 1) {
          pushAlert("Research more species to prep this room for them.", "warn");
          return;
        }
        const i = opts.indexOf(s.recipe as Species);
        s.recipe = opts[(i + 1) % opts.length];
        needRedraw = true;
        return;
      }
      // Cycle within the recipes the station has actually researched. Fungal needs
      // Fungal Synthesis; the exotic chain (Microbes / Live-Protein / Exo-Culture)
      // needs Exobiology.
      const fungal = isUnlocked(world, "fungal");
      const exo = isUnlocked(world, "exobiology");
      let list: string[] | null = null;
      if (s.kind === "vat") list = ["biomass", ...(fungal ? ["spores"] : []), ...(exo ? ["microbes"] : [])];
      else if (s.kind === "synth") list = ["rations", ...(fungal ? ["fungal"] : []), ...(exo ? ["protein", "exotic"] : [])];
      if (!list) return;
      if (list.length === 1) {
        pushAlert(s.kind === "vat" ? "Research Fungal Synthesis or Exobiology to grow other cultures." : "Research Fungal Synthesis or Exobiology to cook other food lines.", "warn");
        return;
      }
      const i = list.indexOf(s.recipe);
      s.recipe = list[(i + 1) % list.length];
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
        audio.play("research-denied");
        return;
      }
      if (buyUnlock(world, id)) {
        pushAlert(`Researched: ${u.label}.`, "info");
        audio.play(id.startsWith("doc_") ? "doctrine-pick" : "research-buy");
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
    onNewGame: () => {
      if (!window.confirm("Start a new station? Any unsaved progress on the current station will be lost.")) return;
      restart();
    },
    onStarChart: (bayId) => {
      // Open the orbital chart for this bay; clicking a body dispatches its drone.
      showStarChart(world, bayId, (siteId) => {
        for (const id in world.drones) {
          const d = world.drones[id];
          if (d.bayId !== bayId) continue;
          d.siteId = siteId; // applies now if docked; otherwise on its next return
          break;
        }
        needRedraw = true;
      });
    },
  };
  const cycleIx: Record<string, number> = {};

  setupUI(state, world, handlers);
  applyCam();
  launchIntro(); // show the briefing on every fresh game start

  const tileAt = (clientX: number, clientY: number): { tx: number; ty: number } => {
    const rect = canvas.getBoundingClientRect();
    return screenToTile(cam, clientX - rect.left, clientY - rect.top, TILE);
  };

  const applyTool = (tx: number, ty: number): void => {
    if (!inBounds(world, tx, ty)) return;
    const tool = state.tool;
    // free actions
    if (tool === "erase") {
      if (world.cells[idx(world, tx, ty)].structureId >= 0 || world.cells[idx(world, tx, ty)].type !== "space") audio.play("build-deconstruct");
      eraseAt(world, tx, ty);
      needRedraw = true;
      return;
    }
    // paid actions — only charge on a successful placement
    if (toolLock(world, tool)) return; // tech not researched yet
    const cost = costOf(tool);
    if (world.credits < cost) {
      audio.play("build-invalid");
      return;
    }
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
    } else if (tool === "bay") {
      ok = addBay(world, tx, ty); // hull-mounted, like a dock
    } else if (isDock(tool as StructureKind)) {
      ok = addDock(world, tx, ty, tool as StructureKind);
    } else if ((STRUCTURE_TOOLS as string[]).includes(tool)) {
      const fp = footprintCells(world, tool as StructureKind, tx, ty);
      if (fp) ok = addStructureMulti(world, tool as StructureKind, fp);
    }
    if (ok) {
      world.credits -= cost;
      audio.play(tool === "floor" ? "build-floor" : tool === "wall" ? "build-wall" : tool === "door" ? "build-door" : "build-module");
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
    return null; // asteroids/planets are off-map (selected from the Star Chart)
  };

  const selCell = (): number => {
    if (!sel) return -1;
    if (sel.kind === "agent") return world.agents[sel.id]?.cell ?? -1;
    if (sel.kind === "structure") return world.structures[sel.id]?.cell ?? -1;
    return -1;
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
    } else if (hover >= 0 && tool === "bay") {
      const fp = bayFootprint(world, tx, ty);
      ghost = fp ?? [hover];
      valid = fp !== null;
      if (fp) anchor = fp[0]; // the hull wall cell
    } else if (hover >= 0 && tool in STRUCTURES && !isDock(tool as StructureKind)) {
      const fp = footprintCells(world, tool as StructureKind, tx, ty);
      ghost = fp ?? [hover];
      valid = fp !== null;
    } else if (hover >= 0 && tool !== "pan" && tool !== "select") {
      ghost = [hover];
      valid = canPlace(world, tool, tx, ty);
    }
    renderer.drawCursor(world, ghost, valid, hover, anchor);

    const ent = hover >= 0 ? pickEntity(hover) : null;
    const clickable = ent && tool !== "erase"; // any non-erase tool can click a module to inspect it

    // cursor style
    let cursor = "default";
    if (tool === "pan") cursor = panning ? "grabbing" : "grab";
    else if (tool === "select" || clickable) cursor = "pointer";
    else cursor = within && canPlace(world, tool, tx, ty) ? "crosshair" : "not-allowed";
    canvas.style.cursor = cursor;

    // tooltip (skip while actively building)
    if (!dragging && !painting && !panning && hover >= 0) {
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
    const cell = inBounds(world, tx, ty) ? idx(world, tx, ty) : -1;
    const ent = cell >= 0 ? pickEntity(cell) : null;
    if (e.button === 2 || state.tool === "pan") {
      panning = true;
      lastX = e.clientX;
      lastY = e.clientY;
    } else if (state.tool !== "erase" && ent) {
      // Clicking any module/crew opens its options — no need to switch to Select.
      // (Erase is the exception: it deletes instead, with no panel.)
      sel = ent;
      needRedraw = true;
    } else if (state.tool === "select") {
      sel = null; // clicked empty space with the Select tool → deselect
      needRedraw = true;
    } else if (isAreaTool(state.tool)) {
      sel = null; // resuming a build/erase closes the inspector
      dragging = true;
      dragStart = cell;
    } else {
      sel = null;
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
    } else if (k === "k") {
      // quick-open the Star Chart from anywhere (uses the first Bot Bay; with none,
      // it still opens the system map for a look)
      const bay = Object.values(world.structures).find((s) => s.kind === "bay");
      handlers.onStarChart(bay ? bay.id : -1);
    } else if (TOOL_KEYS[k]) {
      setActiveTool(TOOL_KEYS[k], state);
    }
  });

  // --- alerts (transition detection) ---
  let prevBrownout = false;
  let prevFighting = false;
  const detectAlerts = (): void => {
    // drain transient station-incident messages (M29 events) — map each to a sound
    while (world.notify.length) {
      const msg = world.notify.shift() as string;
      pushAlert(msg, "warn");
      audio.play(sfxForNotify(msg));
    }

    if (world.power.brownout && !prevBrownout) {
      pushAlert("Brownout — shedding power.", "warn");
      audio.play("brownout");
    }
    prevBrownout = world.power.brownout;

    let anyFight = false;
    for (const id in world.agents) if (world.agents[id].fighting) anyFight = true;
    if (anyFight && !prevFighting) {
      pushAlert("Skirmish! Crew are fighting.", "bad");
      audio.play("skirmish-start");
    }
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
        audio.play(guest ? "guest-arrive" : "crew-arrive");
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
          audio.play("crew-death");
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
        audio.play("suffocation-warn");
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
  const autosaveTimer = setInterval(() => {
    if (saveWorld(world)) markSaved();
  }, 30000);

  // Dev-only: Vite HMR re-runs boot() on hot updates. Without disposing the old
  // PixiJS app each reload leaks its WebGL context; after ~16 the browser starts
  // force-losing contexts ("CONTEXT_LOST_WEBGL") and the canvas corrupts. Tear the
  // old app + timers down before the new module evaluates. (Production has no HMR.)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      clearInterval(autosaveTimer);
      try {
        app.destroy(true, { children: true });
      } catch {
        /* ignore */
      }
    });
  }

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

    // objective ladder progress chime
    if (world.objectiveIx !== prevObjectiveIx) {
      if (world.objectiveIx > prevObjectiveIx && world.phase === "playing") audio.play("objective-complete");
      prevObjectiveIx = world.objectiveIx;
    }

    // victory / defeat transitions — pause and surface the end banner
    if (world.phase !== prevPhase) {
      prevPhase = world.phase;
      if (world.phase === "won") {
        setSpeed(world, 0);
        audio.play("victory");
        showEndBanner("won", "Keep building", () => setSpeed(world, 1));
      } else if (world.phase === "lost") {
        setSpeed(world, 0);
        audio.play("defeat");
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
        audio.play("first-contact");
        showFirstContact(firstSeen, () => {
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
        });
      }
      // a pending social encounter pauses the game for the player's choice
      // (defer if a first-contact card is still up — they share the pause)
      if (world.encounter && world.phase === "playing" && !isEncounterOpen() && !isFirstContactOpen()) {
        const resumeSpeed = world.speed || 1;
        const conflict = world.encounter.kind === "conflict";
        setSpeed(world, 0);
        audio.play(conflict ? "encounter-conflict" : "encounter-bond");
        showEncounter(world.encounter, (choice) => {
          const msg = resolveEncounter(world, choice);
          audio.play("encounter-choice");
          if (msg) pushAlert(msg, "info");
          // outcome flavour: wounds/brawls sound bad, everything else good
          audio.play(/wound|hurt|brawl|sideways/i.test(msg) ? "outcome-bad" : "outcome-good");
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
          needRedraw = true;
        });
      }
      // a god has rendered a verdict → pause and show its dialog (with portrait)
      if (world.godVerdict && world.phase === "playing" && !isGodOpen() && !isEncounterOpen() && !isFirstContactOpen()) {
        const gv = world.godVerdict;
        world.godVerdict = null;
        const resumeSpeed = world.speed || 1;
        setSpeed(world, 0);
        audio.play(gv.verdict === "wrathful" ? "outcome-bad" : "outcome-good");
        showGodDialog(gv.species, gv.verdict, () => {
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
        });
      }
      // a contented species asks to lay a clutch → pause for the player's answer
      if (
        world.breedOffer && world.phase === "playing" &&
        !isBreedOpen() && !isGodOpen() && !isEncounterOpen() && !isFirstContactOpen()
      ) {
        const bo = world.breedOffer;
        const resumeSpeed = world.speed || 1;
        setSpeed(world, 0);
        audio.play("encounter-bond");
        showBreedOffer(bo.species, bo.eggs, bo.reward, (accept) => {
          const msg = resolveBreed(world, accept);
          audio.play(accept ? "outcome-good" : "outcome-bad");
          if (msg) pushAlert(msg, accept ? "info" : "warn");
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
          needRedraw = true;
        });
      }
      // a romance milestone (fell in love / turbulence / breakup / implants)
      if (
        world.romance && world.phase === "playing" &&
        !isRomanceOpen() && !isBreedOpen() && !isGodOpen() && !isEncounterOpen() && !isFirstContactOpen()
      ) {
        const rp = world.romance;
        world.romance = null;
        const resumeSpeed = world.speed || 1;
        setSpeed(world, 0);
        audio.play(rp.good ? "outcome-good" : "outcome-bad");
        showRomance(rp, () => {
          if (world.phase === "playing") setSpeed(world, resumeSpeed);
        });
      }
      renderer.draw(world, sc, overlay);
      updateHud(world);
      updateInfo(world, sel, handlers);
      if (isStarChartOpen()) refreshStarChart(world); // live ETAs / drone position while it's up
      renderTech(world, handlers.onBuyUnlock);
      refreshPalette(world);
      renderRequests(world);
      renderAlienpedia(world, handlers.onLocateSpecies);
      renderAdvisor(world);
      renderObjective(world);
      renderTutorial(world);
      renderStory(world);
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
