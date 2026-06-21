import { Container, Graphics, Sprite, Texture, Renderer as PixiRenderer } from "pixi.js";
import { World, Structure, StructureKind, Species, Ship } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES, isDock, DOCK_TIER, DockKind } from "./structures";
import { exteriorCell, isOpaque } from "./world";
import { SPECIES } from "./species";
import { SERVICE_THRESHOLD } from "./maintenance";

// Sprite art is authored at a native resolution (px per tile) that can vary per
// sprite (32px for the current set; older art may be 16). The renderer reads each
// sprite's native res at build time and scales its texture by TILE/res so it always
// covers exactly tileW×tileH cells. SCALE is the default for the 32px set.
const DEFAULT_RES = 32;
const SCALE = TILE / DEFAULT_RES;
const TEXRES = new Map<string, number>(); // sprite name -> native px/tile
// World scale factor for a sprite, from its native authoring resolution.
function scaleOf(name: string): number {
  return TILE / (TEXRES.get(name) ?? DEFAULT_RES);
}

// --- lighting / shadows (2D grid shadowcasting; see LIGHTING_PLAN.md) ---
// The per-cell light buffer is painted as a SMOOTH (bilinear) multiply lightmap,
// so pools and shadow edges feather like RimWorld rather than reading as squares.
// Interior baseline brightness when unlit (a multiply tint); space stays white.
// Tuned dark + cool (our station's blue cast) so warm light pools really pop.
const AMBIENT_RGB: [number, number, number] = [0.5, 0.52, 0.58];
// Each room's unlit ambient is multiplied by its gas's tint, so a wing's whole
// interior reads in that gas's mood (subtle — warm light pools still cut through):
// O₂ a bit blue, CH₄ reddish, Cl₂ green, NH₃ indigo, H₂ magenta, mixed danger-red.
const GAS_TINT: Record<string, [number, number, number]> = {
  none: [1, 1, 1],
  o2: [0.88, 0.98, 1.14],
  ch4: [1.16, 0.88, 0.8],
  cl2: [0.9, 1.14, 0.86],
  nh3: [0.92, 0.9, 1.16],
  h2: [1.14, 0.88, 1.08],
  mixed: [1.22, 0.8, 0.8],
};
const GAS_CODE: Record<string, number> = { none: 0, o2: 1, ch4: 2, cl2: 3, nh3: 4, h2: 5, mixed: 6 };
// Character lamp: a warm pool that raycasts a few cells and casts a MOVING shadow
// as the agent traverses (the RimWorld pawn-lamp look).
const LAMP_RADIUS = 5.5; // cells — a touch wider so the pool fades over more cells
const LAMP_COLOR: [number, number, number] = [1.0, 0.9, 0.7];
const LAMP_INTENSITY = 0.95;
// Light mount heights for the height-field shadow march (cells of elevation).
// A taller occluder between a cell and the light shadows that cell; the higher
// the light sits, the shorter the shadows it throws.
const LIGHT_MOUNT = 1.4; // module/lamp fixtures ride high on the bulkheads
const LAMP_MOUNT = 1.05; // a handheld crew lamp is lower → longer ground shadows
// modules that emit light while powered: [radius in CELLS, color, intensity]
const GLOW: Partial<Record<StructureKind, [number, number, number]>> = {
  lamp: [4.2, 0xfff0cf, 1.0],
  o2gen: [2.4, 0xcfe6ff, 0.45],
  ch4gen: [2.4, 0xffcf9a, 0.5],
  cl2gen: [2.4, 0xd6f0a0, 0.5],
  nh3gen: [2.4, 0xbcd0f0, 0.5],
  h2gen: [2.4, 0xf0bcd6, 0.5],
  heater: [2.6, 0xffb38a, 0.55],
  cooler: [2.6, 0xa8e0ff, 0.45],
  rec: [2.8, 0xffd9f2, 0.5],
  lab: [2.4, 0xc9b8ff, 0.5],
  tradehub: [2.2, 0xcfeecf, 0.4],
  vat: [2.0, 0xbfeccb, 0.35],
  bay: [2.0, 0xbfe3e3, 0.35],
  fusion: [2.6, 0xcdfbff, 0.55],
  cargoex: [2.0, 0xcfeecf, 0.4],
  aicore: [2.4, 0xc9b8ff, 0.5],
  fuelrefinery: [2.2, 0xffd9a0, 0.45],
};

// A "solid" module (2×2 machine, or a Silo) blocks light and casts a shadow;
// thin furniture (pods, hotels, synth, lamp, docks, solar) does not.
// Bright per-species tints for lodging, so a cabin/hotel reads as its prepped
// species at a glance (matches the UI species colours).
const DWELL_TINT: Partial<Record<Species, number>> = {
  human: 0x8fb8ff, drenn: 0xe8c349, thol: 0xe09a4a, vryl: 0x9fe06a, korro: 0xe06a5e,
  vorn: 0xc06ad8, chlorithe: 0xb6e85a, naaz: 0x7fa8e8, voltaar: 0xe07fb0, sszra: 0x6fd6bc,
};

function blocksLight(kind: StructureKind): boolean {
  const d = STRUCTURES[kind];
  return d.w * d.h >= 4 || kind === "silo";
}

function rgbf(c: number): [number, number, number] {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
function falloff(d: number, r: number): number {
  const f = 1 - d / r;
  return f <= 0 ? 0 : f * f; // smooth-ish edge
}
// A gentler curve for the character headlamp: a fuller core that eases to zero
// with a flat tail at the rim (cubic smoothstep), so the pool fades gracefully
// into the dark instead of ending in a visible disc.
function softFalloff(d: number, r: number): number {
  const t = 1 - d / r;
  if (t <= 0) return 0;
  return t * t * (3 - 2 * t); // smoothstep: flat at centre, flat (→0) at the edge
}

// Wall autotile: map a 4-bit neighbour mask (N=1,E=2,S=4,W=8) to a sprite name
// and a clockwise quarter-turn rotation. Base sprites: straight = E+W, corner =
// N+E, T = N+E+S, end stub = N.
function wallTile(mask: number): [string, number] {
  switch (mask) {
    case 0: return ["wallnode", 0];
    case 1: return ["wallend", 0]; // N
    case 2: return ["wallend", 1]; // E
    case 4: return ["wallend", 2]; // S
    case 8: return ["wallend", 3]; // W
    case 10: return ["wall", 0]; // E+W
    case 5: return ["wall", 1]; // N+S
    case 3: return ["wallcorner", 0]; // N+E
    case 6: return ["wallcorner", 1]; // E+S
    case 12: return ["wallcorner", 2]; // S+W
    case 9: return ["wallcorner", 3]; // W+N
    case 7: return ["wallt", 0]; // N+E+S
    case 14: return ["wallt", 1]; // E+S+W
    case 13: return ["wallt", 2]; // S+W+N
    case 11: return ["wallt", 3]; // W+N+E
    default: return ["wallcross", 0]; // 15
  }
}

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

// ---- sprite textures (built once from window.SPRITES) ----
type Px = (string | null)[];
const TEX = new Map<string, Texture>();

function asciiPixels(rows: string[], palette: Record<string, string>, w: number, h: number): Px {
  const p: Px = new Array(w * h).fill(null);
  for (let y = 0; y < h; y++) {
    const row = rows[y] || "";
    for (let x = 0; x < w; x++) {
      const ch = row[x] || ".";
      if (ch !== "." && palette[ch]) p[y * w + x] = palette[ch];
    }
  }
  return p;
}
function makeTexture(px: Px, w: number, h: number): Texture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const o = c.getContext("2d") as CanvasRenderingContext2D;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = px[y * w + x];
      if (col) {
        o.fillStyle = col;
        o.fillRect(x, y, 1, 1);
      }
    }
  const t = Texture.from(c);
  (t.source as unknown as { scaleMode: string }).scaleMode = "nearest";
  return t;
}

// ---- per-sprite heightmaps (for dynamic, across-tile cast shadows) ----
// Each sprite gets an approximate height field: a base elevation by material
// category (floor ≈ ground, bulkheads/machines tall, crew short) plus fine relief
// from the pixel's own luminance (the art shades highlights up / recesses down).
// Stored as a grayscale texture (height in RGB, coverage in A) so the lighting
// pass can composite a world height field and march shadows through it.
const HTEX = new Map<string, Texture>();
// Tall things that stand on the station floor and should cast across tiles.
const HEIGHT_TALL = new Set(["fusion", "aicore", "cmdhub", "tradenexus", "autoforge", "orerefinery", "fuelrefinery", "silo", "o2gen", "ch4gen", "cl2gen", "nh3gen", "h2gen", "heater", "cooler", "vat", "bloomgarden", "cargoex", "medbay", "rec", "tradehub", "lab", "synth"]);
const HEIGHT_MID = new Set(["pod", "hotel", "battery", "lamp", "turret", "dock", "docklarge", "docksuper", "bay"]);
function baseHeight(name: string): number {
  if (name === "floor" || name === "space") return 0.02;
  if (name.startsWith("wall")) return 1.0; // bulkheads — the tallest occluders
  if (name === "door") return 0.4;
  if (HEIGHT_TALL.has(name)) return 0.8;
  if (HEIGHT_MID.has(name)) return 0.5;
  if (name in SPECIES) return 0.22; // crew — short, soft shadows
  if (["egg", "spider", "drone", "asteroid"].includes(name)) return 0.12;
  return 0.6; // sensible default for any other on-floor module
}
function makeHeightTexture(px: Px, w: number, h: number, base: number): Texture {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const o = c.getContext("2d") as CanvasRenderingContext2D;
  const img = o.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const col = px[i];
    const p = i * 4;
    if (!col || col[0] !== "#") {
      d[p + 3] = 0; // transparent → no occluder here (floor shows through)
      continue;
    }
    const [r, g, b] = hx2rgb(col);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const hgt = Math.max(0, Math.min(1, base + 0.25 * lum)); // base + fine relief
    const v = (hgt * 255) | 0;
    d[p] = d[p + 1] = d[p + 2] = v;
    d[p + 3] = 255;
  }
  o.putImageData(img, 0, 0);
  const t = Texture.from(c);
  (t.source as unknown as { scaleMode: string }).scaleMode = "nearest";
  return t;
}
// ---- cohesive tone-mapping pass (the editor's duotone-blend, applied to every
// module/ship sprite at build time so the station reads as one designed set).
// Grouped by feel; species creatures, lamps and the species-tinted bunks are
// left untouched so identity/colour cues survive. TONE_STR=0 fully disables it.
// Biomechanical duotone (Giger × Mœbius): a unified skin pulled toward bone-on-
// charcoal hull, oxidized bronze industry, sinew greens and biolum plasma. Bumped
// strength so the whole station reads as one designed biomech organism.
const TONE_STR = 0.62;
const TONE_DUO: Record<string, [string, string]> = {
  steel: ["#0c1018", "#cfc6b4"], // hull, walls, floor, generators, docks, silo, ships — bone on charcoal
  rust: ["#160a06", "#c2823f"], // doors, fuel/forge/ore industry, raider — oxidized bronze
  bio: ["#091610", "#86c66f"], // life: vats, synth, bloom garden, trader — sinew green
  plasma: ["#130a1e", "#b06ad8"], // weapons + research/AI energy — biolum violet
};
// Outside the station is "void" — that's the space background (COLORS.space), not
// a sprite, so it's left as-is. Creatures, lamps, the species-tinted bunks and the
// clean Med Bay keep their own colours.
function toneCatOf(name: string): keyof typeof TONE_DUO | null {
  // untoned: creatures, lamps, species-tinted bunks, the clean Med Bay, and the
  // hero ships (their authored palettes carry intentional engine glow / colour).
  if (name in SPECIES || name.startsWith("god_") || ["pod", "hotel", "lamp", "asteroid", "medbay", "shuttle", "trader", "raider"].includes(name)) return null;
  if (name === "door" || ["fuelrefinery", "autoforge", "orerefinery", "heater"].includes(name)) return "rust";
  if (["vat", "synth", "bloomgarden", "tradehub", "cargoex"].includes(name)) return "bio";
  if (["turret", "lab", "aicore", "fusion", "cmdhub", "tradenexus"].includes(name)) return "plasma";
  return "steel";
}
function hx2rgb(h: string): [number, number, number] { const s = h.replace("#", ""); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; }
function rgb2hx(r: number, g: number, b: number): string { const f = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0"); return "#" + f(r) + f(g) + f(b); }
function tonePalette(name: string, palette: Record<string, string>): Record<string, string> {
  const cat = toneCatOf(name);
  if (!cat || TONE_STR <= 0) return palette;
  const [lo, hi] = TONE_DUO[cat], [lr, lg, lb] = hx2rgb(lo), [hr, hg, hb] = hx2rgb(hi);
  const out: Record<string, string> = {};
  for (const k in palette) {
    const c = palette[k];
    if (typeof c !== "string" || c[0] !== "#") { out[k] = c; continue; }
    const [r, g, b] = hx2rgb(c), L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const tr = lr + (hr - lr) * L, tg = lg + (hg - lg) * L, tb = lb + (hb - lb) * L;
    out[k] = rgb2hx(r + (tr - r) * TONE_STR, g + (tg - g) * TONE_STR, b + (tb - b) * TONE_STR);
  }
  return out;
}

// Drop the module-level texture caches (the old GPU textures are dead after a lost
// context / dev HMR teardown) so the next build re-uploads on a fresh context.
export function resetTextures(): void {
  for (const t of TEX.values()) { try { t.destroy(true); } catch { /* ignore */ } }
  for (const t of HTEX.values()) { try { t.destroy(true); } catch { /* ignore */ } }
  TEX.clear();
  HTEX.clear();
}
// Clear + immediately rebuild — used on WebGL context restore.
function rebuildTextures(): void {
  resetTextures();
  buildTextures();
}

function buildTextures(): void {
  if (TEX.size) return;
  const list = (window as unknown as { SPRITES?: any[] }).SPRITES || [];
  for (const s of list) {
    // Native resolution: explicit `res`, else derived from the first row's length
    // (chars per row / tiles wide), matching the editor's derivation. Falls back to
    // the default 32px set.
    const firstRow = (Object.values(s.states)[0] as string[] | undefined)?.[0] ?? "";
    // floor (not round) so a stray +1 raggedness in the first row can't bump a
    // 16px sprite to a phantom "17". Art is validated rectangular by simcheck.
    const res = s.res || Math.floor(firstRow.length / s.tileW) || DEFAULT_RES;
    TEXRES.set(s.name, res);
    const w = s.tileW * res;
    const h = s.tileH * res;
    const pal = tonePalette(s.name, s.palette);
    const base = baseHeight(s.name);
    for (const st of Object.keys(s.states)) {
      const colorPx = asciiPixels(s.states[st], pal, w, h);
      TEX.set(`${s.name}:${st}`, makeTexture(colorPx, w, h));
      // height from the ORIGINAL (untoned) palette luminance — shape, not tint
      HTEX.set(`${s.name}:${st}`, makeHeightTexture(asciiPixels(s.states[st], s.palette, w, h), w, h, base));
    }
  }
}
function texH(name: string, state: string): Texture | null {
  const key = `${name}:${state}`;
  if (HTEX.has(key)) return HTEX.get(key) as Texture;
  for (const k of HTEX.keys()) if (k.startsWith(name + ":")) return HTEX.get(k) as Texture; // fallback state
  return null;
}
function tex(name: string, state: string): Texture | null {
  const key = `${name}:${state}`;
  if (TEX.has(key)) return TEX.get(key) as Texture;
  for (const k of TEX.keys()) if (k.startsWith(name + ":")) return TEX.get(k) as Texture; // fallback state
  return null;
}

// Ray-trace from a world-space point along a unit direction; return the distance
// to the first opaque cell (wall or module) or `maxD` if nothing blocks. Grid DDA
// so the hit lands exactly on the cell edge → crisp vision-cone shadows.
function castRay(world: World, ox: number, oy: number, dx: number, dy: number, maxD: number): number {
  let mapX = Math.floor(ox / TILE), mapY = Math.floor(oy / TILE);
  const stepX = dx >= 0 ? 1 : -1, stepY = dy >= 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(TILE / dy) : Infinity;
  const nextX = dx > 0 ? (mapX + 1) * TILE - ox : ox - mapX * TILE;
  const nextY = dy > 0 ? (mapY + 1) * TILE - oy : oy - mapY * TILE;
  let tMaxX = dx !== 0 ? Math.abs(nextX / dx) : Infinity;
  let tMaxY = dy !== 0 ? Math.abs(nextY / dy) : Infinity;
  for (let guard = 0; guard < 512; guard++) {
    let t: number;
    if (tMaxX < tMaxY) { t = tMaxX; mapX += stepX; tMaxX += tDeltaX; }
    else { t = tMaxY; mapY += stepY; tMaxY += tDeltaY; }
    if (t >= maxD) return maxD;
    if (mapX < 0 || mapY < 0 || mapX >= world.w || mapY >= world.h) return t;
    if (isOpaque(world, mapY * world.w + mapX)) return t; // hit — shadow begins here
  }
  return maxD;
}

export class Renderer {
  private cellsC = new Container();
  private lastTileSig = -1;
  private atmo = new Graphics();
  private grid = new Graphics();
  private sitesC = new Container();
  private shadowsC = new Container(); // module drop-shadows (below structures)
  private structsC = new Container();
  private structFx = new Graphics();
  private critterC = new Container(); // eggs + spiders (below crew)
  private critterFx = new Graphics();
  private agentsC = new Container();
  private agentFx = new Graphics();
  private dronesFx = new Graphics(); // route lines
  private dronesC = new Container();
  private shipsFx = new Graphics(); // arrival pulse around parked ships
  private shipsC = new Container();
  private godsFx = new Graphics(); // race-god auras
  private godsC = new Container(); // race-god creature sprites
  // height field: a parallel scene drawn with each sprite's heightmap (grayscale),
  // the source for dynamic, across-tile cast shadows. Toggle on to inspect it.
  private heightC = new Container();
  private showHeight = false;
  private heightSig = -1;
  private lightFailed = false; // set once if the lighting pass throws (then it's skipped)
  // lightmap: per-cell light buffer painted as multiply-blended Graphics rects over
  // the interior. (We deliberately do NOT use a re-uploaded CanvasSource texture —
  // that's the documented "one frame, then black" failure on some GPU backends.)
  private lightG = new Graphics();
  private overlay = new Graphics();
  private selection = new Graphics();
  private cursor = new Graphics();
  private speciesFlash: { sp: string; t: number } | null = null;
  // lighting: a per-cell RGB light buffer (ambient + shadowcast light pools) drawn
  // as multiply-blended rects. Static (baked) light + dynamic per-agent lamps
  // accumulate into the buffer. See LIGHTING_PLAN.md.
  private staticBuf = new Float32Array(0); // baked: ambient + placed-light shadows
  private workBuf = new Float32Array(0); // per-frame: static + character lamps
  private occ = new Uint8Array(0); // 1 = blocks light (walls + solid modules)
  private heightField = new Float32Array(0); // per-cell elevation for shadow marching
  private bakeSig = "";

  // Briefly ring all members of a species (Alienpedia "locate").
  flashSpecies(sp: string): void {
    this.speciesFlash = { sp, t: 45 };
  }

  constructor(world: Container, _pixi: PixiRenderer) {
    buildTextures();
    this.lightG.blendMode = "multiply";
    for (const layer of [
      this.cellsC, this.atmo, this.grid, this.sitesC, this.shadowsC, this.structsC, this.structFx,
      this.critterC, this.critterFx, this.agentsC, this.agentFx, this.dronesFx, this.dronesC, this.shipsFx, this.shipsC, this.godsFx, this.godsC,
      this.lightG, this.heightC, this.overlay, this.selection, this.cursor,
    ])
      world.addChild(layer);
    this.heightC.visible = false;
  }

  // Recover from a lost-then-restored WebGL context: rebuild the sprite textures on
  // the fresh context and invalidate every "draw only on change" cache so the static
  // layers (tiles, structure shadows, lightmap, height field) repaint — otherwise
  // they'd stay blank while only the per-frame layers (crew) come back.
  restoreContext(): void {
    rebuildTextures();
    this.lastTileSig = -1;
    this.heightSig = -1;
    this.bakeSig = "";
  }

  // Toggle the height-field inspector (the grayscale occluder map the shadow pass
  // marches). Returns the new state so the caller can surface it.
  toggleHeight(): boolean {
    this.showHeight = !this.showHeight;
    this.heightC.visible = this.showHeight;
    this.heightSig = -1; // force a rebuild on next draw
    return this.showHeight;
  }

  // Rebuild the parallel height scene (walls/floor/doors + structure footprints,
  // each painted with its heightmap texture). Cheap FNV signature so it only
  // rebuilds when the layout changes. Crew/ships are omitted — they don't cast.
  private buildHeightField(world: World): void {
    let sig = 2166136261 >>> 0;
    for (let i = 0; i < world.cells.length; i++)
      sig = Math.imul(sig ^ (i * 7 + (world.cells[i].type === "space" ? 0 : world.cells[i].type === "wall" ? 1 : world.cells[i].type === "door" ? 2 : 3)), 16777619) >>> 0;
    for (const id in world.structures) { const s = world.structures[id]; sig = Math.imul(sig ^ s.cell ^ (s.powered ? 0x8000 : 0), 16777619) >>> 0; }
    if (sig === this.heightSig) return;
    this.heightSig = sig;
    this.heightC.removeChildren();

    const isLink = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
      const t = world.cells[y * world.w + x].type;
      return t === "wall" || t === "door";
    };
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        if (c.type === "space") continue;
        if (c.type === "wall") {
          const mask = (isLink(x, y - 1) ? 1 : 0) | (isLink(x + 1, y) ? 2 : 0) | (isLink(x, y + 1) ? 4 : 0) | (isLink(x - 1, y) ? 8 : 0);
          const [name, quarters] = wallTile(mask);
          const t = texH(name, "default");
          if (!t) continue;
          const sp = new Sprite(t);
          sp.scale.set(scaleOf(name));
          sp.anchor.set(0.5);
          sp.x = x * TILE + TILE / 2;
          sp.y = y * TILE + TILE / 2;
          sp.rotation = (quarters * Math.PI) / 2;
          this.heightC.addChild(sp);
          continue;
        }
        const t = c.type === "door" ? texH("door", "closed") : texH("floor", "default");
        if (!t) continue;
        const sp = new Sprite(t);
        sp.scale.set(scaleOf(c.type === "door" ? "door" : "floor"));
        sp.x = x * TILE;
        sp.y = y * TILE;
        this.heightC.addChild(sp);
      }

    for (const id in world.structures) {
      const s = world.structures[id];
      const def = STRUCTURES[s.kind];
      if (s.kind === "table") continue; // graphics-only, low — skip
      // footprint bounds (for the rotated solar/bay placements)
      let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
      for (const cc of s.cells) { const cx = cc % world.w, cy = (cc / world.w) | 0; minx = Math.min(minx, cx); maxx = Math.max(maxx, cx); miny = Math.min(miny, cy); maxy = Math.max(maxy, cy); }
      if (s.kind === "solar" || s.kind === "bay") {
        const t = texH(s.kind, s.kind === "bay" ? (s.powered ? "enabled" : "disabled") : "default");
        if (!t) continue;
        const sp = new Sprite(t);
        sp.scale.set(scaleOf(s.kind));
        sp.anchor.set(0.5);
        sp.x = ((minx + maxx + 1) / 2) * TILE;
        sp.y = ((miny + maxy + 1) / 2) * TILE;
        const d = s.kind === "bay" ? s.cells[0] - s.cells[1] : (s.cells[1] ?? s.cells[0]) - s.cells[0];
        sp.rotation = d === 1 ? (s.kind === "bay" ? Math.PI / 2 : -Math.PI / 2) : d === -1 ? (s.kind === "bay" ? -Math.PI / 2 : Math.PI / 2) : Math.abs(d) > 1 ? Math.PI : 0;
        this.heightC.addChild(sp);
        continue;
      }
      const state = def.draw > 0 ? (s.powered ? "enabled" : "disabled") : "default";
      const t = texH(s.kind, state);
      if (!t) continue;
      const sp = new Sprite(t);
      sp.scale.set(scaleOf(s.kind));
      sp.x = (s.cell % world.w) * TILE;
      sp.y = ((s.cell / world.w) | 0) * TILE;
      this.heightC.addChild(sp);
    }
  }

  drawGrid(w: number, h: number): void {
    this.grid.clear();
    for (let x = 0; x <= w; x++) this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h * TILE);
    for (let y = 0; y <= h; y++) this.grid.moveTo(0, y * TILE).lineTo(w * TILE, y * TILE);
    this.grid.stroke({ width: 1, color: COLORS.grid, alpha: 0.6 });
  }

  drawCursor(world: World, ghostCells: number[], valid: boolean, hover: number, anchor = -1): void {
    const g = this.cursor;
    g.clear();
    const tint = valid ? 0x49d17a : 0xe24b4b;
    for (const cell of ghostCells) {
      g.rect((cell % world.w) * TILE, ((cell / world.w) | 0) * TILE, TILE, TILE).fill({ color: tint, alpha: 0.28 });
    }
    // facing marker (e.g. a solar panel's wall-mounted base) so orientation is clear
    if (anchor >= 0) {
      const ax = (anchor % world.w) * TILE;
      const ay = ((anchor / world.w) | 0) * TILE;
      g.rect(ax + TILE * 0.3, ay + TILE * 0.3, TILE * 0.4, TILE * 0.4).fill({ color: 0xffffff, alpha: 0.7 });
    }
    if (hover >= 0 && ghostCells.length === 0) {
      const x = (hover % world.w) * TILE;
      const y = ((hover / world.w) | 0) * TILE;
      g.rect(x + 0.5, y + 0.5, TILE - 1, TILE - 1).stroke({ width: 1.5, color: 0xffffff, alpha: 0.5 });
    }
  }
  clearCursor(): void {
    this.cursor.clear();
  }

  draw(world: World, selCell = -1, overlay: "none" | "power" | "rooms" = "none"): void {
    this.drawTiles(world);
    this.drawAtmosphere(world);
    // Asteroids/planets live off-map in the Star Chart now — nothing on the grid.
    this.drawStructures(world);
    this.drawCritters(world);
    this.drawAgents(world);
    this.drawDrones(world);
    this.drawShips(world);
    this.drawGods(world);
    // Lighting is fail-safe: a failure here must never black out the whole scene,
    // so it's wrapped and the multiply layer is cleared (→ full-bright) on error.
    if (!this.lightFailed) {
      try {
        this.bakeStatic(world); // placed-light shadows — recomputed only on change
        this.updateHeadlights(world); // moving per-character lamps — every frame
      } catch (e) {
        console.error("Lighting pass failed — disabling lightmap:", e);
        this.lightFailed = true;
        this.lightG.clear(); // no overlay → scene renders at full brightness
      }
    }
    if (this.showHeight) this.buildHeightField(world); // height-field inspector
    this.drawOverlay(world, overlay);
    this.drawSelection(world, selCell);
  }

  // (Re)allocate the per-cell light buffers for this grid size.
  private ensureLightTargets(world: World): void {
    const n = world.w * world.h * 3;
    if (this.staticBuf.length === n) return;
    this.staticBuf = new Float32Array(n);
    this.workBuf = new Float32Array(n);
    this.bakeSig = ""; // force a rebake
  }

  // The integer origin cell of a structure's footprint (nearest cell to centroid).
  private originCell(world: World, s: Structure): number {
    let sx = 0, sy = 0;
    for (const c of s.cells) {
      sx += c % world.w;
      sy += (c / world.w) | 0;
    }
    const n = s.cells.length;
    const cx = Math.round(sx / n), cy = Math.round(sy / n);
    let best = s.cells[0], bd = Infinity;
    for (const c of s.cells) {
      const dx = (c % world.w) - cx, dy = ((c / world.w) | 0) - cy;
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = c; }
    }
    return best;
  }

  // walls + solid modules block light; doors pass it (lit doorways). Rebuilt with
  // the static bake (geometry changes are rare).
  private buildOccluders(world: World): void {
    const n = world.cells.length;
    if (this.occ.length !== n) this.occ = new Uint8Array(n);
    if (this.heightField.length !== n) this.heightField = new Float32Array(n);
    this.occ.fill(0);
    this.heightField.fill(0);
    for (let i = 0; i < n; i++) {
      const t = world.cells[i].type;
      if (t === "wall") { this.occ[i] = 1; this.heightField[i] = 2.0; } // bulkheads: tallest, always block
      else if (t === "door") this.heightField[i] = 0.05; // doorways stay lit
      else if (t !== "space") this.heightField[i] = 0.02; // floor
    }
    for (const id in world.structures) {
      const s = world.structures[id];
      const hgt = baseHeight(s.kind); // reuse the per-kind heights the sprite height-maps use
      for (const c of s.cells) {
        if (this.heightField[c] < hgt) this.heightField[c] = hgt;
        if (blocksLight(s.kind)) this.occ[c] = 1;
      }
    }
  }

  // BAKE: ambient fill + every placed light's shadowcast contribution. Recomputed
  // only when the geometry / structures / powered-light states change.
  private bakeStatic(world: World): void {
    this.ensureLightTargets(world);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < world.cells.length; i++) {
      const c = world.cells[i];
      h = Math.imul(h ^ (c.type === "space" ? 0 : c.type === "wall" ? 1 : c.type === "door" ? 2 : 3), 16777619) >>> 0;
      // include room gas so the per-gas ambient tint re-bakes when a room's gas changes
      const rid = c.roomId;
      const gas = rid >= 0 && world.rooms[rid] ? world.rooms[rid].gas : "none";
      h = Math.imul(h ^ (GAS_CODE[gas] ?? 0), 16777619) >>> 0;
    }
    for (const id in world.structures) {
      const s = world.structures[id];
      h = Math.imul(h ^ s.cell ^ (s.powered ? 0x40000 : 0), 16777619) >>> 0;
    }
    const sig = String(h);
    if (sig === this.bakeSig) return;
    this.bakeSig = sig;
    this.buildOccluders(world);

    const buf = this.staticBuf;
    for (let i = 0; i < world.cells.length; i++) {
      const o = i * 3;
      if (world.cells[i].type === "space") {
        buf[o] = buf[o + 1] = buf[o + 2] = 1; // outside: untouched (multiply by white)
      } else {
        const rid = world.cells[i].roomId;
        const gas = rid >= 0 && world.rooms[rid] ? world.rooms[rid].gas : "none";
        const t = GAS_TINT[gas] ?? GAS_TINT.none;
        buf[o] = AMBIENT_RGB[0] * t[0];
        buf[o + 1] = AMBIENT_RGB[1] * t[1];
        buf[o + 2] = AMBIENT_RGB[2] * t[2];
      }
    }
    // accumulate each powered emitter, occluded by walls/modules (its own
    // footprint treated as transparent so it doesn't self-shadow).
    for (const id in world.structures) {
      const s = world.structures[id];
      const g = GLOW[s.kind];
      if (!g || !s.powered) continue;
      const o = this.originCell(world, s);
      const ox = o % world.w, oy = (o / world.w) | 0;
      const radius = Math.max(1, Math.round(g[0]));
      const [lr, lg, lb] = rgbf(g[1]);
      // march the height field toward the light; the emitter's own footprint is
      // ignored so it never shadows itself.
      this.accumulateH(world, buf, ox, oy, radius, lr, lg, lb, g[2], LIGHT_MOUNT, new Set(s.cells), falloff);
    }
  }

  // Per-frame: static light + a small moving lamp around every character (the lamp
  // re-casts from each agent's current cell, so its shadow sweeps as it walks),
  // then paint the buffer as multiply-blended rects — interior only, so open space
  // stays at full brightness.
  private updateHeadlights(world: World): void {
    this.workBuf.set(this.staticBuf);
    const buf = this.workBuf;
    for (const id in world.agents) {
      const a = world.agents[id];
      if (!a.alive) continue;
      const ox = a.cell % world.w, oy = (a.cell / world.w) | 0;
      // the lamp rides low, so nearby modules throw long shadows that sweep as the
      // crew walk (the height field is shared with the baked static lights).
      this.accumulateH(world, buf, ox, oy, LAMP_RADIUS, LAMP_COLOR[0], LAMP_COLOR[1], LAMP_COLOR[2], LAMP_INTENSITY, LAMP_MOUNT, null, softFalloff);
    }
    // Paint the light buffer as multiply-blended rects (reliable on every backend,
    // unlike a re-uploaded canvas texture). Open space is left unpainted = full
    // bright (multiply by nothing); interior cells carry their dimming/shadows.
    const g = this.lightG;
    g.clear();
    const clamp1 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    for (let i = 0; i < world.cells.length; i++) {
      if (world.cells[i].type === "space") continue;
      const o = i * 3;
      const col =
        (Math.round(clamp1(buf[o]) * 255) << 16) |
        (Math.round(clamp1(buf[o + 1]) * 255) << 8) |
        Math.round(clamp1(buf[o + 2]) * 255);
      g.rect((i % world.w) * TILE, ((i / world.w) | 0) * TILE, TILE, TILE).fill({ color: col });
    }
  }

  // Height-aware light accumulation. Like accumulate(), but instead of a binary
  // wall mask it marches the per-cell HEIGHT FIELD along the sight line to the
  // light: a cell is shadowed when a taller cell sits between it and the light,
  // below the line that rises from the floor to the light's mount height. So tall
  // modules cast longer shadows than short ones, and the shadow swings with the
  // light's position. `ignore` skips the light's own footprint (no self-shadow).
  private accumulateH(world: World, buf: Float32Array, ox: number, oy: number, radius: number, lr: number, lg: number, lb: number, intensity: number, lightH: number, ignore: Set<number> | null, fall: (d: number, r: number) => number): void {
    const w = world.w, h = world.h, hf = this.heightField;
    const R = Math.ceil(radius);
    const x0 = Math.max(0, ox - R), x1 = Math.min(w - 1, ox + R);
    const y0 = Math.max(0, oy - R), y1 = Math.min(h - 1, oy + R);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ci = y * w + x;
        if (world.cells[ci].type === "space") continue; // don't light open vacuum
        const dx = ox - x, dy = oy - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > radius) continue;
        const f = fall(dist, radius) * intensity;
        if (f <= 0) continue;
        // step the sight line cell-by-cell toward the light; the ray's elevation
        // climbs linearly from the floor (at this cell) to lightH (at the light).
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        let lit = true;
        if (steps > 1) {
          const sx = dx / steps, sy = dy / steps;
          for (let k = 1; k < steps; k++) {
            const ix = Math.round(x + sx * k), iy = Math.round(y + sy * k);
            const ii = iy * w + ix;
            if (ignore && ignore.has(ii)) continue;
            if (hf[ii] > lightH * (k / steps) + 0.03) { lit = false; break; } // a taller cell blocks
          }
        }
        if (!lit) continue;
        const o = ci * 3;
        buf[o] += lr * f;
        buf[o + 1] += lg * f;
        buf[o + 2] += lb * f;
      }
    }
  }

  // Tiles are drawn as sprites, rebuilt only when the grid actually changes
  // (cheap FNV hash of cell types + floor-seal state).
  private drawTiles(world: World): void {
    let h = 2166136261;
    for (let i = 0; i < world.cells.length; i++) {
      const c = world.cells[i];
      const code = c.type === "space" ? 0 : c.type === "floor" ? (c.enclosed ? 2 : 1) : c.type === "wall" ? 3 : c.type === "storage" ? 5 : 4;
      h = Math.imul(h ^ (i * 5 + code), 16777619);
    }
    if (h === this.lastTileSig) return;
    this.lastTileSig = h;
    this.cellsC.removeChildren();
    const isLink = (x: number, y: number): boolean => {
      if (x < 0 || y < 0 || x >= world.w || y >= world.h) return false;
      const t = world.cells[y * world.w + x].type;
      return t === "wall" || t === "door"; // walls connect to walls and doors
    };
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        if (c.type === "space") continue;
        if (c.type === "wall") {
          // autotile: pick a sprite + rotation from the N/E/S/W neighbour mask
          const mask = (isLink(x, y - 1) ? 1 : 0) | (isLink(x + 1, y) ? 2 : 0) | (isLink(x, y + 1) ? 4 : 0) | (isLink(x - 1, y) ? 8 : 0);
          const [name, quarters] = wallTile(mask);
          const wt = tex(name, "default");
          if (!wt) continue;
          const sp = new Sprite(wt);
          sp.scale.set(scaleOf(name));
          sp.anchor.set(0.5);
          sp.x = x * TILE + TILE / 2;
          sp.y = y * TILE + TILE / 2;
          sp.rotation = (quarters * Math.PI) / 2;
          this.cellsC.addChild(sp);
          continue;
        }
        const t = c.type === "door" ? tex("door", "closed") : tex("floor", "default");
        if (!t) continue;
        const sp = new Sprite(t);
        sp.scale.set(scaleOf(c.type === "door" ? "door" : "floor"));
        sp.x = x * TILE;
        sp.y = y * TILE;
        if (c.type === "storage") sp.tint = 0x5b6675; // airless storage deck — a distinct cool grey
        else if (c.type === "floor" && !c.enclosed) sp.tint = 0xff9a9a; // open-to-space cue
        this.cellsC.addChild(sp);
      }
  }

  private drawAtmosphere(world: World): void {
    const g = this.atmo;
    g.clear();
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        if (c.type !== "floor" || c.roomId < 0) continue;
        const room = world.rooms[c.roomId];
        if (!room || room.gas === "none") continue;
        let color: number = COLORS.atmosphere; // o2 default
        let alpha = 0.16;
        if (room.gas === "ch4") color = 0xc98a3a;
        else if (room.gas === "cl2") color = 0x9bd14a;
        else if (room.gas === "nh3") color = 0x6a8fd1;
        else if (room.gas === "h2") color = 0xd16a9b;
        else if (room.gas === "mixed") {
          color = 0xe24b4b;
          alpha = 0.28;
        }
        g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color, alpha });
      }
  }

  private drawStructures(world: World): void {
    this.structsC.removeChildren();
    this.structFx.clear();
    for (const id in world.structures) {
      const s = world.structures[id];
      const def = STRUCTURES[s.kind];

      // Solar arrays rotate to match their placement direction (away from the wall).
      if (s.kind === "solar") {
        const t = tex("solar", "default");
        if (t) {
          let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
          for (const cc of s.cells) {
            const cx = cc % world.w, cy = (cc / world.w) | 0;
            minx = Math.min(minx, cx); maxx = Math.max(maxx, cx);
            miny = Math.min(miny, cy); maxy = Math.max(maxy, cy);
          }
          const sp = new Sprite(t);
          sp.scale.set(scaleOf("solar"));
          sp.anchor.set(0.5);
          sp.x = ((minx + maxx + 1) / 2) * TILE;
          sp.y = ((miny + maxy + 1) / 2) * TILE;
          const d = (s.cells[1] ?? s.cells[0]) - s.cells[0]; // outward delta
          sp.rotation = d === 1 ? -Math.PI / 2 : d === -1 ? Math.PI / 2 : d === -world.w ? Math.PI : 0;
          this.structsC.addChild(sp);
        }
        continue;
      }

      // Bot Bay: a hull-mounted 1×2 hangar — rotate the sprite so its opening
      // faces space (cells = [wall, interior]; wall − interior points outward).
      if (s.kind === "bay") {
        let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
        for (const cc of s.cells) {
          const cx = cc % world.w, cy = (cc / world.w) | 0;
          minx = Math.min(minx, cx); maxx = Math.max(maxx, cx);
          miny = Math.min(miny, cy); maxy = Math.max(maxy, cy);
        }
        const t = tex("bay", s.powered ? "enabled" : "disabled");
        if (t) {
          const sp = new Sprite(t);
          sp.scale.set(scaleOf("bay"));
          sp.anchor.set(0.5);
          sp.x = ((minx + maxx + 1) / 2) * TILE;
          sp.y = ((miny + maxy + 1) / 2) * TILE;
          const d = s.cells[0] - s.cells[1]; // wall − interior = toward space
          sp.rotation = d === 1 ? Math.PI / 2 : d === -1 ? -Math.PI / 2 : d === world.w ? Math.PI : 0;
          this.structsC.addChild(sp);
        }
        if (s.condition > 0 && s.condition < SERVICE_THRESHOLD)
          this.structFx.rect(minx * TILE + 3, (maxy + 1) * TILE - 5, ((maxx - minx + 1) * TILE - 6) * (s.condition / 100), 3).fill(0xe8a33d);
        continue;
      }

      // Mess Table: a 3×3 wooden block (crew eat from the surrounding seat-ring).
      if (s.kind === "table") {
        let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
        for (const cc of s.cells) {
          const cx = cc % world.w, cy = (cc / world.w) | 0;
          minx = Math.min(minx, cx); maxx = Math.max(maxx, cx);
          miny = Math.min(miny, cy); maxy = Math.max(maxy, cy);
        }
        const px = minx * TILE, py = miny * TILE;
        const wpx = (maxx - minx + 1) * TILE, hpx = (maxy - miny + 1) * TILE;
        this.structFx.rect(px + 3, py + 3, wpx - 6, hpx - 6).fill({ color: 0x6a4f34 }).stroke({ width: 1.5, color: 0x3a2c1c });
        this.structFx.rect(px + TILE * 0.6, py + TILE * 0.6, wpx - TILE * 1.2, hpx - TILE * 1.2).fill({ color: 0x8a6a48 });
        continue;
      }

      const state = def.draw > 0 ? (s.powered ? "enabled" : "disabled") : "default";
      const t = tex(s.kind, state);
      const x = (s.cell % world.w) * TILE;
      const y = ((s.cell / world.w) | 0) * TILE;
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(scaleOf(s.kind));
        sp.x = x;
        sp.y = y;
        if (s.kind === "fusion" && !s.powered) sp.tint = 0x55617a; // out of fuel — dimmed
        if (s.kind === "pod" || s.kind === "hotel") sp.tint = DWELL_TINT[s.recipe as Species] ?? 0xffffff;
        this.structsC.addChild(sp);
      }
      // lodging: a small chip in the prepped species' colour
      if (s.kind === "pod" || s.kind === "hotel") {
        const acc = SPECIES[s.recipe as Species]?.accent;
        if (acc !== undefined)
          this.structFx.rect(x + 2, y + 2, 6, 6).fill(acc).stroke({ width: 1, color: 0xe6edf3, alpha: 0.5 });
      }
      // wear bar on worn-but-running machinery
      if (def.draw > 0 && s.condition > 0 && s.condition < SERVICE_THRESHOLD) {
        this.structFx.rect(x + 3, y + TILE * def.h - 5, (TILE * def.w - 6) * (s.condition / 100), 3).fill(0xe8a33d);
      }
    }
  }

  private agentCenter(world: World, a: World["agents"][number]): [number, number] {
    const center = (i: number): [number, number] => [
      (i % world.w) * TILE + TILE / 2,
      ((i / world.w) | 0) * TILE + TILE / 2,
    ];
    let [cx, cy] = center(a.cell);
    if (a.path.length > 0) {
      const [nx, ny] = center(a.path[0]);
      cx += (nx - cx) * a.moveAcc;
      cy += (ny - cy) * a.moveAcc;
    }
    return [cx, cy];
  }

  // Eggs (incubating clutches) and spiders (hatched vermin the crew hunt).
  private drawCritters(world: World): void {
    this.critterC.removeChildren();
    const g = this.critterFx;
    g.clear();
    const pulse = 0.5 + 0.5 * Math.sin(((world.tick % 18) / 18) * Math.PI * 2);
    const center = (cell: number): [number, number] => [
      (cell % world.w) * TILE + TILE / 2,
      ((cell / world.w) | 0) * TILE + TILE / 2,
    ];
    for (const e of world.eggs ?? []) {
      const [cx, cy] = center(e.cell);
      const ready = e.t < 8; // about to hatch — glow brighter
      g.circle(cx, cy, TILE * 0.42).fill({ color: ready ? 0xe24b4b : 0xe8c349, alpha: (ready ? 0.16 : 0.08) + 0.08 * pulse });
      const t = tex("egg", "default");
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(scaleOf("egg"));
        sp.anchor.set(0.5);
        sp.x = cx;
        sp.y = cy;
        this.critterC.addChild(sp);
      }
    }
    for (const p of world.pests ?? []) {
      const [cx, cy] = center(p.cell);
      g.circle(cx, cy, TILE * 0.4).fill({ color: 0xff3b3b, alpha: 0.05 + 0.05 * pulse });
      const t = tex("spider", "default");
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(scaleOf("spider"));
        sp.anchor.set(0.5);
        sp.x = cx;
        sp.y = cy;
        this.critterC.addChild(sp);
      }
      // health bar while wounded
      if (p.health < 40) {
        const r = TILE * 0.32;
        g.rect(cx - r, cy - r - 6, r * 2, 2).fill(0x11151c);
        g.rect(cx - r, cy - r - 6, r * 2 * (p.health / 40), 2).fill(0xe24b4b);
      }
    }
  }

  private drawAgents(world: World): void {
    this.agentsC.removeChildren();
    const g = this.agentFx;
    g.clear();
    for (const id in world.agents) {
      const a = world.agents[id];
      const [cx, cy] = this.agentCenter(world, a);
      const rm = world.cells[a.cell].roomId;
      const native = rm >= 0 && world.rooms[rm]?.gas === SPECIES[a.species].gas;
      // Off native air a suit auto-dons — show the suited graphic (helmet on).
      const suited = a.alive && !native;
      const moving = a.path.length > 0;
      const state = !a.alive ? "dead" : suited ? (moving ? "suitwalk" : "suitidle") : moving ? "walk" : "idle";
      const t = tex(a.species, state);
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(scaleOf(a.species));
        sp.anchor.set(0.5);
        sp.x = cx;
        sp.y = cy;
        this.agentsC.addChild(sp);
      }
      if (!a.alive) continue;
      const r = TILE * 0.32;
      // personal vision cone — full ray-traced shadows: each ray DDA-marches the
      // grid and stops exactly at the first wall/module, so everything behind an
      // object is excluded from view (crisp shadow edges).
      if (a.faceX || a.faceY) {
        const ang = Math.atan2(a.faceY, a.faceX);
        const half = 0.6;
        const rad = (a.sight ?? 3) * TILE;
        const RAYS = 40;
        const pts: number[] = [cx, cy];
        for (let k = 0; k <= RAYS; k++) {
          const a2 = ang - half + (2 * half) * (k / RAYS);
          const dxr = Math.cos(a2), dyr = Math.sin(a2);
          const dist = castRay(world, cx, cy, dxr, dyr, rad);
          pts.push(cx + dxr * dist, cy + dyr * dist);
        }
        g.poly(pts).fill({ color: 0xfff0c0, alpha: 0.06 });
      }
      if (a.guest) g.circle(cx, cy, r).stroke({ width: 2, color: COLORS.guest, alpha: 0.9 });
      if (suited) g.circle(cx, cy, r + 1.5).stroke({ width: 2, color: COLORS.suit, alpha: 0.85 });
      if (a.food < 40 || a.rest < 40) g.circle(cx, cy, r + 3).stroke({ width: 2, color: COLORS.needLow });
      // a hauled crate rides above the carrier (colour by good)
      if (a.task && a.task.type === "haul") {
        const good = (a.task as { good?: string }).good;
        const col = good === "spores" ? 0x9fd14f : good === "microbes" ? 0xd98ad9 : good === "minerals" ? 0x9a8a64 : 0xcaa06a;
        g.rect(cx - 3.5, cy - r - 12, 7, 7).fill(col).stroke({ width: 1, color: 0x0c0e12, alpha: 0.85 });
      }
      // mood dot
      const moodColor = a.mood >= 60 ? 0x49d17a : a.mood >= 35 ? 0xe8c349 : 0xe24b4b;
      g.circle(cx, cy - r - 5, 2.6).fill(moodColor);
      // in-love marker: a little pink heart beside the mood dot
      if (a.mateId >= 0) {
        const hx = cx + r - 1, hy = cy - r - 5;
        g.circle(hx - 1.3, hy - 0.6, 1.4).fill(0xff6fae);
        g.circle(hx + 1.3, hy - 0.6, 1.4).fill(0xff6fae);
        g.poly([hx - 2.6, hy, hx + 2.6, hy, hx, hy + 2.8]).fill(0xff6fae);
      }
      // suit bar
      if (a.suit < 100) {
        const bw = r * 2;
        g.rect(cx - r, cy - r - 10, bw, 2).fill(0x11151c);
        g.rect(cx - r, cy - r - 10, bw * (a.suit / 100), 2).fill(a.suit > 30 ? COLORS.suit : 0xe24b4b);
      }
      if (a.fighting) g.circle(cx, cy, r + 5).stroke({ width: 2.5, color: 0xff3b3b });
      else if (a.tension > 50) g.circle(cx, cy, r + 5).stroke({ width: 1.5, color: 0xe8a33d, alpha: 0.8 });
      // Alienpedia locate: pulse a ring around the chosen species
      if (this.speciesFlash && a.species === this.speciesFlash.sp) {
        const k = this.speciesFlash.t / 45;
        g.circle(cx, cy, r + 6 + (1 - k) * 6).stroke({ width: 2.5, color: 0xffffff, alpha: 0.3 + 0.6 * k });
      }
    }
    if (this.speciesFlash) {
      this.speciesFlash.t -= 1;
      if (this.speciesFlash.t <= 0) this.speciesFlash = null;
    }
  }

  private drawDrones(world: World): void {
    this.dronesC.removeChildren();
    const g = this.dronesFx;
    g.clear();
    const phase = (world.tick % 12) / 12;
    const center = (i: number): [number, number] => [
      (i % world.w) * TILE + TILE / 2,
      ((i / world.w) | 0) * TILE + TILE / 2,
    ];
    // each Bot Bay gets a 1x1 launch pad on the hull exterior, with a blink light
    const padCell = new Map<number, number>();
    for (const id in world.structures) {
      const s = world.structures[id];
      if (s.kind !== "bay") continue;
      const ex = exteriorCell(world, s);
      const pc = ex >= 0 ? ex : s.cell;
      padCell.set(s.id, pc);
      if (!s.powered) continue;
      const [px, py] = center(pc);
      g.rect(px - TILE * 0.42, py - TILE * 0.42, TILE * 0.84, TILE * 0.84).fill({ color: 0x141a24, alpha: 0.5 }).stroke({ width: 1, color: 0x3a4a63, alpha: 0.7 });
      const on = phase < 0.5;
      g.circle(px, py - TILE * 0.28, 1.6).fill({ color: on ? 0xffd27a : 0x4a3a1e, alpha: on ? 0.95 : 0.6 });
    }
    // Drone flight is now just the on/off-map legs: lift off the pad out toward
    // space (outbound), vanish off-map (transit), descend back onto the pad
    // (inbound). The exit point is several tiles beyond the pad along its outward
    // normal, so the drone climbs away into the void and shrinks as it goes.
    // Cinematic launch/return:
    //   outbound — engines ignite, a slow lift off the pad, a turn toward the exit
    //   heading, then a thrusting zoom off-map (shrinks + fades).
    //   inbound  — the reverse: streak in, decelerate, turn upright, settle on the pad.
    const easeIn = (t: number) => t * t;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const smooth = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    for (const id in world.drones) {
      const d = world.drones[id];
      if (d.state === "transit" || d.state === "lost") continue; // off-map / destroyed — invisible
      const bay = world.structures[d.bayId];
      if (!bay) continue;
      const pc = padCell.get(bay.id) ?? bay.cell;
      const [px, py] = center(pc);
      // outward normal = pad cell minus bay anchor (one of ±1 / ±w)
      const dxn = (pc % world.w) - (bay.cell % world.w);
      const dyn = ((pc / world.w) | 0) - ((bay.cell / world.w) | 0);
      const ux = Math.sign(dxn) || 0;
      const uy = Math.sign(dyn) || (ux === 0 ? -1 : 0); // default: straight up
      // EXIT = tiles to the actual map edge along the heading (+margin), so the
      // drone keeps accelerating visibly off the map instead of vanishing at the hull.
      const cx = pc % world.w, cy = (pc / world.w) | 0;
      const edge = ux > 0 ? world.w - cx : ux < 0 ? cx + 1 : uy > 0 ? world.h - cy : cy + 1;
      const EXIT = edge + 4;
      const ex = px + ux * EXIT * TILE, ey = py + uy * EXIT * TILE;
      const hx = px + ux * 0.7 * TILE, hy = py + uy * 0.7 * TILE; // hover just off the pad
      const heading = Math.atan2(ux, -uy); // drone art faces "up" at rotation 0

      let x = px, y = py, rot = 0, glow = 0, trail = 0, vis = 1, alpha = 1;
      if (d.state === "outbound") {
        const lift = smooth(clamp01(d.t / 0.4)); // slow lift + turn over the first 40%
        const zoom = easeIn(clamp01((d.t - 0.4) / 0.6)); // accelerate away after
        if (zoom <= 0) { x = lerp(px, hx, lift); y = lerp(py, hy, lift); }
        else { x = lerp(hx, ex, zoom); y = lerp(hy, ey, zoom); }
        rot = lerp(0, heading, lift);
        glow = clamp01(d.t / 0.22); // engines ignite
        trail = 0.3 + 2.2 * zoom; // long plume at full burn
        vis = 1 - 0.3 * zoom;
        alpha = 1 - 0.35 * zoom;
      } else if (d.state === "inbound") {
        // d.t: 0 at the exit point → 1 on the pad
        const land = smooth(clamp01((d.t - 0.6) / 0.4)); // settle + turn upright at the end
        const approach = easeOut(clamp01(d.t / 0.6)); // streak in, decelerating
        if (land <= 0) { x = lerp(ex, hx, approach); y = lerp(ey, hy, approach); }
        else { x = lerp(hx, px, land); y = lerp(hy, py, land); }
        rot = lerp(heading, 0, land);
        glow = 1 - 0.85 * land;
        trail = 0.3 + 2.2 * (1 - approach);
        vis = 0.7 + 0.3 * approach;
        alpha = 0.65 + 0.35 * approach;
      }

      if (d.state !== "docked")
        g.moveTo(px, py).lineTo(ex, ey).stroke({ width: 1, color: COLORS.route, alpha: 0.22 });

      // thruster plume behind the drone (opposite the heading) + engine glow
      if (glow > 0.02) {
        for (let k = 1; k <= 5; k++) {
          const f = k / 5;
          const tx = x - ux * trail * TILE * f, ty = y - uy * trail * TILE * f;
          g.circle(tx, ty, (1 - f) * 5 * vis + 1).fill({ color: f < 0.4 ? 0xfff0c0 : 0xff8a3a, alpha: glow * (1 - f) * 0.6 });
        }
        g.circle(x - ux * 3, y - uy * 3, 3 * vis + 1.5).fill({ color: 0xffd27a, alpha: glow * 0.5 });
      }

      const t = tex("drone", d.cargo > 0 ? "laden" : "empty");
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(scaleOf("drone") * vis);
        sp.anchor.set(0.5);
        sp.rotation = rot;
        sp.alpha = alpha;
        sp.x = x;
        sp.y = y;
        this.dronesC.addChild(sp);
      }
    }
  }

  // Race-gods drift through space, ship-sized and glowing, each a distinct form.
  // Race-gods drift through space, ship-sized: a creature sprite + glowing aura.
  private drawGods(world: World): void {
    const g = this.godsFx;
    g.clear();
    this.godsC.removeChildren();
    const pulse = 0.5 + 0.5 * Math.sin(((world.tick % 30) / 30) * Math.PI * 2);
    const WEIRD_TINT: Record<string, number> = { blackout: 0x20242e, surge: 0xffd84a, famine: 0xe24b4b, feast: 0x49d17a };
    for (const god of world.gods) {
      const cx = god.x * TILE, cy = god.y * TILE, R = TILE * 3.2;
      const col = god.weird ? (WEIRD_TINT[god.weird] ?? 0xffffff) : (DWELL_TINT[god.species] ?? 0xffffff);
      // weird gods burn brighter — they have no creature sprite, only a roiling orb
      const aMul = god.weird ? 2.4 : 1;
      g.circle(cx, cy, R).fill({ color: col, alpha: (0.05 + 0.04 * pulse) * aMul });
      g.circle(cx, cy, R * 0.7).fill({ color: col, alpha: (0.08 + 0.05 * pulse) * aMul });
      if (god.weird) { g.circle(cx, cy, R * 0.4).fill({ color: col, alpha: 0.18 + 0.12 * pulse }); continue; }
      const t = tex("god_" + god.species, "default");
      if (t) {
        const sp = new Sprite(t);
        sp.anchor.set(0.5);
        sp.scale.set(scaleOf("god_" + god.species) * 2.6); // ship-sized (~120px)
        sp.x = cx;
        sp.y = cy;
        this.godsC.addChild(sp);
      }
      if (god.judged && god.verdict !== "none") {
        const vc = god.verdict === "pleased" ? 0x49d17a : god.verdict === "wrathful" ? 0xe24b4b : 0x8b93a6;
        g.circle(cx, cy, R * 0.8).stroke({ width: 2, color: vc, alpha: 0.6 });
      }
    }
  }

  private drawShips(world: World): void {
    const g = this.shipsFx;
    g.clear();
    const phase = (world.tick % 12) / 12; // 0..1 loop at 10Hz ≈ 1.2s
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(phase * Math.PI * 2));

    // landing pads: a 3x3 deck extending outward from every powered Docking Port,
    // with blinking guide lights at the corners (occupied while a shuttle sits).
    const padOf = (s: Structure): { cx: number; cy: number; dx: number; dy: number } | null => {
      const ex = exteriorCell(world, s);
      if (ex < 0) return null;
      const d = ex - s.cell;
      const dx = d === 1 ? 1 : d === -1 ? -1 : 0;
      const dy = d === world.w ? 1 : d === -world.w ? -1 : 0;
      const pc = ex + d; // pad centre = one tile further out than the access cell
      return { cx: (pc % world.w) * TILE + TILE / 2, cy: ((pc / world.w) | 0) * TILE + TILE / 2, dx, dy };
    };
    for (const id in world.structures) {
      const s = world.structures[id];
      if (!isDock(s.kind) || !s.powered) continue;
      const p = padOf(s);
      if (!p) continue;
      const half = TILE * DOCK_TIER[s.kind as DockKind].padHalf; // 3×3 / 5×5 / 7×7 by tier
      g.rect(p.cx - half, p.cy - half, half * 2, half * 2).fill({ color: 0x11161f, alpha: 0.55 }).stroke({ width: 1.5, color: 0x3a4a63, alpha: 0.8 });
      g.rect(p.cx - half * 0.55, p.cy - half * 0.55, half * 1.1, half * 1.1).stroke({ width: 1, color: 0x2d3a50, alpha: 0.7 });
      // corner guide lights — alternate the diagonals so the pad appears to chase
      for (let i = 0; i < 4; i++) {
        const ox = i & 1 ? half - 3 : -(half - 3);
        const oy = i & 2 ? half - 3 : -(half - 3);
        const on = (i % 2 === 0) === phase < 0.5;
        g.circle(p.cx + ox, p.cy + oy, 2).fill({ color: on ? 0x7fffa0 : 0x244a2e, alpha: on ? 0.95 : 0.6 });
      }
    }

    // Star-Trek-style flight: a shuttle banks in along a wide orbital ARC around
    // the station (engines lit), lines up on the dock's outward axis, then CUTS
    // thrust and coasts — drifting slowly straight onto the pad. Departure mirrors
    // it: drift off the pad, ignite, then bank away into the arc. Raiders/legacy
    // ships just sit on the pad.
    const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const smooth = (t: number) => { const c = clamp01(t); return c * c * (3 - 2 * c); };
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
    const FAR = TILE * 18; // arc entry radius (off-screen)
    const STANDOFF = TILE * 9; // where the arc ends and the engine-off coast begins
    const ORBIT = TILE * 5; // arc-centre offset inside the hull (pad radius)
    const ARC = 2.4; // radians swept while circling the station
    // Position (and thrust 0..1) of a ship at flight progress `prog`.
    const flightPos = (ship: Ship, prog: number): { x: number; y: number; thrust: number } => {
      const padX = (ship.cell % world.w) * TILE + TILE / 2 + (ship.dx ?? 0) * TILE;
      const padY = ((ship.cell / world.w) | 0) * TILE + TILE / 2 + (ship.dy ?? 0) * TILE;
      if (ship.phase !== "in" && ship.phase !== "out") return { x: padX, y: padY, thrust: 0 };
      const axis = Math.atan2(ship.dy ?? 0, ship.dx ?? 0); // outward (away from hull)
      const ox = padX - (ship.dx ?? 0) * ORBIT, oy = padY - (ship.dy ?? 0) * ORBIT; // arc centre
      const dir = ship.cell % 2 === 0 ? 1 : -1; // bank left or right, stable per pad
      let ang = axis, rad = ORBIT, thrust = 0;
      const p = clamp01(prog);
      if (ship.phase === "in") {
        if (p < 0.6) { const u = easeOut(p / 0.6); ang = axis + dir * ARC * (1 - u); rad = lerp(FAR, STANDOFF, u); thrust = 1; }
        else { const v = smooth((p - 0.6) / 0.4); ang = axis; rad = lerp(STANDOFF, ORBIT, v); thrust = 0; } // engines off — drift in
      } else {
        if (p < 0.35) { const v = smooth(p / 0.35); ang = axis; rad = lerp(ORBIT, STANDOFF, v); thrust = p / 0.35; } // ignite, lift off
        else { const u = (p - 0.35) / 0.65; ang = axis + dir * ARC * u; rad = lerp(STANDOFF, FAR, easeOut(u)); thrust = 1; } // bank away
      }
      return { x: ox + Math.cos(ang) * rad, y: oy + Math.sin(ang) * rad, thrust };
    };
    const sprites: { t: Texture | null; x: number; y: number; c: boolean; tint?: number; rot?: number; scale?: number }[] = [];
    for (const ship of world.ships) {
      const here = flightPos(ship, ship.prog ?? 0);
      const ahead = flightPos(ship, clamp01((ship.prog ?? 0) + 0.02));
      const x = here.x, y = here.y;
      // nose points along the direction of travel (banking); fall back to facing
      // the hull when stationary. Sprite art faces up (-y).
      let hx = ahead.x - x, hy = ahead.y - y;
      if (Math.hypot(hx, hy) < 0.01) { hx = -(ship.dx ?? 0); hy = -(ship.dy ?? 0); }
      const rot = hx || hy ? Math.atan2(hy, hx) + Math.PI / 2 : 0;
      const sizeMul = ship.size === 3 ? 2 : ship.size === 2 ? 1.5 : 1;
      // arrival ring around a parked shuttle
      if (ship.phase === "wait" || ship.phase === undefined) {
        const r = TILE * (0.55 + 0.22 * Math.sin(phase * Math.PI * 2));
        const col = ship.hostile ? 0xff4040 : ship.trader ? 0x6fcf97 : 0x9fd8ff;
        g.circle(x, y, r).stroke({ width: ship.hostile ? 2.5 : 2, color: col, alpha: ship.hostile ? 0.8 : 0.55 });
      }
      // engine plume behind the nose while thrusting (off during the coast → drift)
      if (here.thrust > 0.03 && !ship.hostile) {
        const len = Math.hypot(hx, hy) || 1;
        const fxu = hx / len, fyu = hy / len;
        for (let k = 1; k <= 4; k++) {
          const f = k / 4;
          const tx = x - fxu * TILE * 1.1 * f * sizeMul, ty = y - fyu * TILE * 1.1 * f * sizeMul;
          g.circle(tx, ty, (1 - f) * 4.5 * sizeMul + 1).fill({ color: f < 0.4 ? 0xfff0c0 : 0xff8a3a, alpha: here.thrust * (1 - f) * 0.55 });
        }
      }
      // raider attack beam — a pulsing red bolt to the module it's wrecking
      if (ship.hostile && (world.raidTarget ?? -1) >= 0) {
        const tx = (world.raidTarget! % world.w) * TILE + TILE / 2;
        const ty = ((world.raidTarget! / world.w) | 0) * TILE + TILE / 2;
        g.moveTo(x, y).lineTo(tx, ty).stroke({ width: 2.5, color: 0xff5a3a, alpha: 0.5 + 0.4 * Math.abs(Math.sin(phase * Math.PI * 2)) });
        g.circle(tx, ty, TILE * (0.3 + 0.12 * Math.sin(phase * Math.PI * 2))).stroke({ width: 2, color: 0xff3b2a, alpha: 0.85 });
      }
      sprites.push({
        t: tex(ship.hostile ? "raider" : ship.trader ? "trader" : "shuttle", "default"),
        x, y, c: true, rot, scale: scaleOf(ship.hostile ? "raider" : ship.trader ? "trader" : "shuttle") * sizeMul,
      });
    }

    // hull breaches — a blinking red marker so the emergency is easy to spot
    for (const b of world.breaches) {
      const bx = (b.cell % world.w) * TILE + TILE / 2;
      const by = ((b.cell / world.w) | 0) * TILE + TILE / 2;
      g.rect(bx - TILE * 0.4, by - TILE * 0.4, TILE * 0.8, TILE * 0.8).stroke({ width: 2.5, color: 0xff3b3b, alpha: blink });
      g.circle(bx, by, TILE * 0.18).fill({ color: 0xff3b3b, alpha: 0.7 });
    }

    this.shipsC.removeChildren();
    for (const it of sprites) {
      if (!it.t) continue;
      const sp = new Sprite(it.t);
      sp.scale.set(it.scale ?? SCALE);
      sp.anchor.set(0.5);
      if (it.rot) sp.rotation = it.rot;
      if (it.tint !== undefined) sp.tint = it.tint;
      sp.x = it.x;
      sp.y = it.y;
      this.shipsC.addChild(sp);
    }
  }

  private drawOverlay(world: World, mode: "none" | "power" | "rooms"): void {
    const g = this.overlay;
    g.clear();
    if (mode === "none") return;
    if (mode === "rooms") {
      for (let i = 0; i < world.cells.length; i++) {
        const c = world.cells[i];
        if (c.type !== "floor" || c.roomId < 0) continue;
        g.rect((i % world.w) * TILE, ((i / world.w) | 0) * TILE, TILE, TILE).fill({ color: hslToHex((c.roomId * 47) % 360, 55, 50), alpha: 0.3 });
      }
      return;
    }
    for (const id in world.structures) {
      const s = world.structures[id];
      const def = STRUCTURES[s.kind];
      const color = def.gen > 0 ? 0x3a7bd5 : def.draw > 0 ? (s.powered ? 0x49d17a : 0xe24b4b) : 0xd5b13a;
      for (const cell of s.cells ?? [s.cell])
        g.rect((cell % world.w) * TILE, ((cell / world.w) | 0) * TILE, TILE, TILE).fill({ color, alpha: 0.45 });
    }
  }

  private drawSelection(world: World, selCell: number): void {
    const g = this.selection;
    g.clear();
    if (selCell < 0) return;
    const x = (selCell % world.w) * TILE;
    const y = ((selCell / world.w) | 0) * TILE;
    g.rect(x - 1, y - 1, TILE + 2, TILE + 2).stroke({ width: 2, color: 0xffffff, alpha: 0.9 });
  }
}
