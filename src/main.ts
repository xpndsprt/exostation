import { Application, Container, Ticker } from "pixi.js";
import "../assets/sprites.js"; // populates window.SPRITES (shared with the editor)
import "../assets/ships.js"; // populates window.SHIPS — default per-race ship designs
import { createWorld, setCell, addStructureMulti, addDock, addBay, seedSolarSystem, eraseAt, inBounds, idx, addConduit } from "./world";
import { simStep, refresh } from "./sim";
import { resolveBreed } from "./spawn";
import { defeatReasons, emperorLetter } from "./defeat";
import { RESIDENT_SPECIES, HOTEL_SPECIES } from "./economy";
import { buyUnlock, toolLock, isUnlocked, UNLOCKS, canResearch, lodgingUnlocked } from "./research";
import { updateSeen } from "./advisor";
import { resolveEncounter } from "./encounters";
import * as audio from "./audio";
import { saveWorld, loadWorld, deleteSave, serializeWorld, parseSave } from "./persistence";
import { canPlace, isAreaTool, dragCells, solarFootprint, footprintCells, bayFootprint } from "./placement";
import { storageBlocksBuild } from "./storage";
import { Renderer, resetTextures } from "./renderer";
import { Starfield } from "./starfield";
import { Wormhole, beaconAnchor } from "./wormhole";
import { beaconIntensity } from "./beacon";
import { autogameStep, autogameOn, setAutogame } from "./autogame";
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
  showArchive,
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
  showDefeat,
  TOOL_KEYS,
  UIHandlers,
} from "./ui";
import { TILE, COLORS, SIM_HZ } from "./config";
import { STRUCTURES, costOf, isDock } from "./structures";
import { SPECIES } from "./species";
import { HoverTarget, OverlayMode, Phase, Selection, Species, Speed, StructureKind, UIState } from "./types";

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

// Cap the WebGL backing store to a pixel budget so a big/4K display (or a weak GPU)
// doesn't allocate a framebuffer it can't sustain — the cause of the
// webglcontextlost→restore loop that whites out the canvas. `resolution` shrinks
// the backing store WITHOUT touching the logical (CSS-pixel) coordinate space, so
// camera + input math are unaffected. `degrade` drops it further each time the
// context is lost, so an unstable GPU settles into a lighter footprint.
const RES_BUDGET = 2_200_000; // ~1920×1146 backing pixels
function capResolution(degrade: number): number {
  const w = window.innerWidth || 1280, h = window.innerHeight || 800;
  const fit = Math.sqrt(RES_BUDGET / Math.max(1, w * h));
  return Math.max(0.4, Math.min(1, fit) * degrade);
}

async function boot(): Promise<void> {
  const app = new Application();
  let resDegrade = 1; // multiplier lowered on each context loss (recovery)
  // Force WebGL: dynamic CanvasSource texture re-uploads (the lighting buffer,
  // updated every frame via source.update()) don't reliably refresh on the WebGPU
  // backend, which left the multiply-lightmap blank → a black screen. WebGL is
  // plenty for 2D. (The benign "Failed to create WebGPU Context Provider" probe
  // log is cosmetic — see notes; do NOT hide navigator.gpu, it can break init.)
  // Cap the framebuffer: pixel art is drawn nearest-neighbour, so antialiasing
  // buys nothing but multisample memory, and full device-pixel-ratio on a big/4K
  // display makes a huge framebuffer that GPUs under pressure drop — which shows
  // up as a webglcontextlost→restore loop ending in a blank field. resolution 1 +
  // no AA keeps it light and stable across machines.
  // Smoothing WITHOUT hardware MSAA: a full-size multisample framebuffer balloons
  // on big/4K displays and drops the WebGL context (white-screen webglcontextlost),
  // so antialias stays OFF. Instead we soften the look cheaply: textures use linear
  // filtering (set per-texture in the renderer) and the wormhole gets a small
  // BlurFilter (a tiny render-texture, not a screen-size multisample buffer).
  await app.init({ preference: "webgl", background: COLORS.space, resizeTo: window, antialias: false, resolution: capResolution(resDegrade), autoDensity: true });
  audio.initAudio(); // loads SFX + unlocks audio on the first user gesture
  const mount = document.getElementById("app");
  if (!mount) throw new Error("#app mount missing");
  mount.appendChild(app.canvas);

  // Far parallax backdrop — sits behind the world container (screen-space, never
  // zooms), scrolled by the camera each frame for a sense of deep space.
  const starfield = new Starfield(window.innerWidth, window.innerHeight);
  app.stage.addChild(starfield.container);

  const worldContainer = new Container();
  app.stage.addChild(worldContainer);

  const world = createWorld();
  seedSolarSystem(world); // populate the star system with unknown orbital bodies
  const cam = createCamera();
  const renderer = new Renderer(worldContainer, app.renderer);
  renderer.drawGrid(world.w, world.h);

  // The Beacon, visualized: a Bajoran-wormhole vortex at the very BACK of the world
  // (behind the station), blooming as the five beacon nodes charge. Centred on the map.
  const wormhole = new Wormhole();
  worldContainer.addChildAt(wormhole.container, 0);
  const wormholeR = Math.max(world.w, world.h) * TILE * 0.5;

  // WebGL context-loss recovery. The browser only restores a lost context if we
  // preventDefault the loss; on restore we rebuild textures + force every cached
  // (draw-on-change) layer to repaint, so the static tiles/shadows/lightmap come
  // back too — not just the per-frame crew. Without this, ~60% of the scene (the
  // baked layers) stays blank after a context blip.
  app.canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    resDegrade = Math.max(0.4, resDegrade * 0.8); // shrink the framebuffer so it can be sustained
    console.warn(`WebGL context lost — awaiting restore (resolution → ${capResolution(resDegrade).toFixed(2)})`);
  }, false);
  app.canvas.addEventListener("webglcontextrestored", () => {
    console.warn("WebGL context restored — rebuilding scene");
    try {
      app.renderer.resolution = capResolution(resDegrade); // lighter footprint on restore
      app.renderer.resize(window.innerWidth, window.innerHeight);
    } catch (err) { console.error(err); }
    try { renderer.restoreContext(); } catch (err) { console.error(err); }
    try { starfield.rebuild(window.innerWidth, window.innerHeight); } catch (err) { console.error(err); }
    needRedraw = true;
  }, false);

  // Autogame: the hardcoded test agent (no UI button). Trigger it from the devtools
  // console with `autogame()` / `autogame(false)` — it builds a winning station and
  // fast-forwards the game to victory. Logic lives in src/autogame.ts.
  (window as unknown as { autogame?: (on?: boolean) => void }).autogame = (on = true) => {
    setAutogame(on);
    if (on) setSpeed(world, 3);
  };

  const state: UIState = { tool: "floor" };
  let sel: Selection = null;
  let overlay: OverlayMode = "none";
  let needRedraw = true;
  let domAcc = 0; // throttle the DOM panel re-renders (innerHTML rebuilds) to ~6 Hz
  let domSig = ""; // force a DOM refresh immediately when selection/tool/overlay changes
  let clock = 0; // running seconds, drives starfield drift/twinkle
  const canvas = app.canvas;
  const STRUCTURE_TOOLS = Object.keys(STRUCTURES) as StructureKind[];
  const known = new Map<number, boolean>();

  const applyCam = (): void => {
    worldContainer.position.set(cam.x, cam.y);
    worldContainer.scale.set(cam.scale);
    starfield.update(cam, clock);
  };

  window.addEventListener("resize", () => {
    try { app.renderer.resolution = capResolution(resDegrade); } catch { /* ignore */ }
    starfield.resize(window.innerWidth, window.innerHeight);
  });

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
    // Wipe any leftover UI from the previous station: close every open modal/dialog
    // and reset the camera zoom so the fresh scene starts from a clean slate.
    for (const m of ["god", "encounter", "breed", "romance", "defeat", "starchart", "saves", "endbanner", "firstcontact"])
      document.getElementById(m)?.classList.remove("show");
    cam.scale = createCamera().scale;
    setSpeed(world, 1);
    recenter();
    renderer.clearCursor();
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
    onExportSave: () => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const blob = new Blob([serializeWorld(world)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `exostation-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      pushAlert("Save exported to file ✓", "info");
    },
    onImportSave: (text) => {
      const loaded = parseSave(text);
      if (!loaded) {
        pushAlert("Not a valid EXOSTATION save file.", "bad");
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
      pushAlert("Station imported from file.", "info");
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
    onToggleGrid: () => { const on = renderer.toggleGrid(); needRedraw = true; return on; },
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
        let assigned = false;
        if (bayId >= 0) {
          for (const id in world.drones) {
            const d = world.drones[id];
            if (d.bayId !== bayId) continue;
            d.siteId = siteId; // applies now if docked; otherwise on its next return
            assigned = true;
            break;
          }
        }
        if (!assigned) {
          // negative confirmation: nothing to send out
          pushAlert(
            bayId < 0
              ? "No drone available — build a Bot Bay (it comes with a mining drone)."
              : "No drone available — it was lost; the bay is rebuilding one.",
            "warn",
          );
          return;
        }
        needRedraw = true;
      });
    },
    onArchive: () => showArchive(world), // the Grand Library's mad archivist recites the saga
  };
  const cycleIx: Record<string, number> = {};

  setupUI(state, world, handlers);
  // top-right Solar System button — opens the Star Chart (uses the first Bot Bay
  // for dispatch, or just shows the system map + discovered properties if none).
  document.getElementById("starbtn")?.addEventListener("click", () => {
    const bay = Object.values(world.structures).find((s) => s.kind === "bay");
    handlers.onStarChart(bay ? bay.id : -1);
  });
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
    // Advanced (2+ Lab) modules need warehouse capacity — gate them on storage.
    if (storageBlocksBuild(world, tool as StructureKind)) {
      audio.play("build-invalid");
      pushAlert("Advanced modules need warehouse space — lay more Storage Floor or build a Silo first.", "warn");
      return;
    }
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
    } else if (tool === "storage") {
      const c = world.cells[idx(world, tx, ty)];
      if (c.type !== "storage" && c.structureId < 0) {
        setCell(world, tx, ty, "storage");
        ok = true;
      }
    } else if (tool === "conduit") {
      ok = addConduit(world, tx, ty); // power cabling on a deck cell
    } else if (tool === "lamp") {
      // the one module allowed on an airless storage tile (also placeable on floor)
      const c = world.cells[idx(world, tx, ty)];
      if ((c.type === "floor" || c.type === "storage") && c.structureId < 0)
        ok = addStructureMulti(world, "lamp", [idx(world, tx, ty)]);
    } else if (tool === "solar") {
      const fp = solarFootprint(world, tx, ty);
      if (fp) ok = addStructureMulti(world, "solar", fp);
    } else if (tool === "bay") {
      ok = addBay(world, tx, ty); // hull-mounted, like a dock
    } else if (isDock(tool as StructureKind)) {
      ok = addDock(world, tx, ty, tool as StructureKind);
    } else if (tool === "pod" || tool === "hotel") {
      // lodging is prepped per species; block races you can't host yet
      const sp = state.lodgingSpecies;
      if (sp && !lodgingUnlocked(world, sp)) { audio.play("build-invalid"); return; }
      const fp = footprintCells(world, tool as StructureKind, tx, ty);
      if (fp) {
        ok = addStructureMulti(world, tool as StructureKind, fp);
        if (ok && sp) {
          const sid = world.cells[fp[0]].structureId;
          if (sid >= 0 && world.structures[sid]) world.structures[sid].recipe = sp;
        }
      }
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
    if (valid && storageBlocksBuild(world, tool as StructureKind)) valid = false; // not enough warehouse
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
    } else if (k === "h" && e.shiftKey) {
      const on = renderer.toggleHeight();
      pushAlert(on ? "Height field: ON (occluder map)" : "Height field: OFF", "info");
      needRedraw = true;
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
        resetTextures(); // drop the shared texture cache so the next boot rebuilds on the fresh context
      } catch {
        /* ignore */
      }
    });
  }

  let acc = 0;
  app.ticker.add((ticker: Ticker) => {
    clock += ticker.deltaMS / 1000;
    starfield.update(cam, clock); // parallax + drift/twinkle, every frame
    // Anchored to a FIXED point behind the station (see beaconAnchor) so it never
    // drifts as you build; faint & ~1/3 size early, blooms to full. `mouth` spikes
    // while a ship is emerging (in, low prog) or vanishing (out, high prog) → blast.
    const wa = beaconAnchor(world);
    let mouth = 0;
    for (const id in world.ships) {
      const sh = world.ships[id];
      const p = sh.prog ?? 0;
      if (sh.phase === "in" && p < 0.25) mouth += 1 - p / 0.25;
      else if (sh.phase === "out" && p > 0.75) mouth += (p - 0.75) / 0.25;
    }
    wormhole.update(ticker.deltaMS / 1000, beaconIntensity(world), wa.x, wa.y, wormholeR, mouth);

    domAcc += ticker.deltaMS; // DOM-panel throttle accumulator
    if (world.speed > 0) {
      acc += (ticker.deltaMS / 1000) * world.speed;
      let steps = 0;
      while (acc >= STEP && steps < 120) {
        if (autogameOn()) autogameStep(world); // the hardcoded test agent builds + plays
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
      setAutogame(false); // any end state disengages the test agent
      if (world.phase === "won") {
        setSpeed(world, 0);
        audio.play("victory");
        showEndBanner("won", "Keep building", () => setSpeed(world, 1));
      } else if (world.phase === "lost") {
        setSpeed(world, 0);
        audio.play("defeat");
        showDefeat(defeatReasons(world), emperorLetter(world), restart);
      } else {
        hideEndBanner();
      }
      needRedraw = true;
    }

    // Render every frame so motion is smooth at the display refresh rate: the
    // sim runs at 10 Hz, but entity positions are interpolated per frame (see
    // Renderer.follow) so ships/crew/drones glide instead of stepping at 10/20fps.
    // The heavy DOM/dialog work below stays gated to actual sim changes.
    const sc = selCell();
    renderer.draw(world, sc, overlay, ticker.deltaMS / 1000);

    if (needRedraw) {
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
        }, gv.weird);
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
      // The DOM panels (HUD, info, tech, palette, requests, advisor, …) are heavy
      // innerHTML rebuilds that don't need 10 Hz — throttle to ~6 Hz, but refresh
      // instantly when the selection / tool / overlay changes so input feels snappy.
      const ds = `${sc}|${state.tool}|${overlay}|${world.objectiveIx}|${world.phase}`;
      if (domAcc >= 150 || ds !== domSig) {
        domAcc = 0;
        domSig = ds;
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
      }
      needRedraw = false;
    }
  });
}

boot().catch((err) => {
  console.error(err);
  const el = document.getElementById("status");
  if (el) el.textContent = "boot error — see console";
});
