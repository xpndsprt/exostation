import { Container, Graphics, Sprite, Texture, Renderer as PixiRenderer } from "pixi.js";
import { World, Structure, StructureKind } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES, isDock, DOCK_TIER, DockKind } from "./structures";
import { exteriorCell } from "./world";
import { SPECIES } from "./species";
import { SERVICE_THRESHOLD } from "./maintenance";

const SCALE = TILE / 16; // sprites are authored at 16px/tile

// --- lighting / shadows (2D grid shadowcasting; see LIGHTING_PLAN.md) ---
// Interior baseline brightness when unlit (a multiply tint); space stays white.
const AMBIENT_RGB: [number, number, number] = [0.5, 0.52, 0.58];
// Character lamp: a small warm pool that raycasts ~3 cells and casts a MOVING
// shadow as the agent traverses (the RimWorld pawn-lamp look).
const LAMP_RADIUS = 3; // cells
const LAMP_COLOR: [number, number, number] = [1.0, 0.92, 0.74];
const LAMP_INTENSITY = 0.95;
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

// Symmetric recursive shadowcasting (the roguelike FOV algorithm): visit() fires
// for every cell the light reaches; an opaque cell is itself lit but blocks light
// beyond it — so walls/modules throw real wedge shadows. O(cells in radius).
const OCT = [
  [1, 0, 0, 1], [0, 1, 1, 0], [0, -1, 1, 0], [-1, 0, 0, 1],
  [-1, 0, 0, -1], [0, -1, -1, 0], [0, 1, -1, 0], [1, 0, 0, -1],
];
type Opaque = (x: number, y: number) => boolean;
type Visit = (x: number, y: number, d: number) => void;
function shadowcast(cx: number, cy: number, radius: number, opaque: Opaque, visit: Visit): void {
  visit(cx, cy, 0);
  for (const m of OCT) castOctant(cx, cy, 1, 1, 0, radius, m[0], m[1], m[2], m[3], opaque, visit);
}
function castOctant(cx: number, cy: number, row: number, start: number, end: number, radius: number, xx: number, xy: number, yx: number, yy: number, opaque: Opaque, visit: Visit): void {
  if (start < end) return;
  const r2 = radius * radius;
  let newStart = 0;
  for (let i = row; i <= radius; i++) {
    let dx = -i - 1;
    const dy = -i;
    let blocked = false;
    while (dx <= 0) {
      dx++;
      const X = cx + dx * xx + dy * xy;
      const Y = cy + dx * yx + dy * yy;
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);
      if (start < rSlope) continue;
      if (end > lSlope) break;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) visit(X, Y, Math.sqrt(d2));
      const opq = opaque(X, Y);
      if (blocked) {
        if (opq) {
          newStart = rSlope;
          continue;
        }
        blocked = false;
        start = newStart;
      } else if (opq && i < radius) {
        blocked = true;
        castOctant(cx, cy, i + 1, start, lSlope, radius, xx, xy, yx, yy, opaque, visit);
        newStart = rSlope;
      }
    }
    if (blocked) break;
  }
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
function buildTextures(): void {
  if (TEX.size) return;
  const list = (window as unknown as { SPRITES?: any[] }).SPRITES || [];
  for (const s of list) {
    const w = s.tileW * 16;
    const h = s.tileH * 16;
    for (const st of Object.keys(s.states)) {
      TEX.set(`${s.name}:${st}`, makeTexture(asciiPixels(s.states[st], s.palette, w, h), w, h));
    }
  }
}
function tex(name: string, state: string): Texture | null {
  const key = `${name}:${state}`;
  if (TEX.has(key)) return TEX.get(key) as Texture;
  for (const k of TEX.keys()) if (k.startsWith(name + ":")) return TEX.get(k) as Texture; // fallback state
  return null;
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
  private agentsC = new Container();
  private agentFx = new Graphics();
  private dronesFx = new Graphics(); // route lines
  private dronesC = new Container();
  private shipsFx = new Graphics(); // arrival pulse around parked ships
  private shipsC = new Container();
  private lighting = new Graphics(); // lightmap: per-cell multiply rects over the interior
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
  private bakeSig = "";

  // Briefly ring all members of a species (Alienpedia "locate").
  flashSpecies(sp: string): void {
    this.speciesFlash = { sp, t: 45 };
  }

  constructor(world: Container, _pixi: PixiRenderer) {
    buildTextures();
    this.lighting.blendMode = "multiply";
    for (const layer of [
      this.cellsC, this.atmo, this.grid, this.sitesC, this.shadowsC, this.structsC, this.structFx,
      this.agentsC, this.agentFx, this.dronesFx, this.dronesC, this.shipsFx, this.shipsC,
      this.lighting, this.overlay, this.selection, this.cursor,
    ])
      world.addChild(layer);
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
    this.drawAgents(world);
    this.drawDrones(world);
    this.drawShips(world);
    this.bakeStatic(world); // placed-light shadows — recomputed only on change
    this.updateHeadlights(world); // moving per-character lamps — every frame
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
    if (this.occ.length !== world.cells.length) this.occ = new Uint8Array(world.cells.length);
    this.occ.fill(0);
    for (let i = 0; i < world.cells.length; i++) if (world.cells[i].type === "wall") this.occ[i] = 1;
    for (const id in world.structures) {
      const s = world.structures[id];
      if (blocksLight(s.kind)) for (const c of s.cells) this.occ[c] = 1;
    }
  }

  // BAKE: ambient fill + every placed light's shadowcast contribution. Recomputed
  // only when the geometry / structures / powered-light states change.
  private bakeStatic(world: World): void {
    this.ensureLightTargets(world);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < world.cells.length; i++) {
      const t = world.cells[i].type;
      h = Math.imul(h ^ (t === "space" ? 0 : t === "wall" ? 1 : t === "door" ? 2 : 3), 16777619) >>> 0;
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
        buf[o] = buf[o + 1] = buf[o + 2] = 1; // space: no dimming (multiply by white)
      } else {
        buf[o] = AMBIENT_RGB[0];
        buf[o + 1] = AMBIENT_RGB[1];
        buf[o + 2] = AMBIENT_RGB[2];
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
      const intensity = g[2];
      const ignore = new Set(s.cells);
      const opaque: Opaque = (x, y) => {
        if (x < 0 || y < 0 || x >= world.w || y >= world.h) return true;
        const i = y * world.w + x;
        return this.occ[i] === 1 && !ignore.has(i);
      };
      this.accumulate(world, buf, ox, oy, radius, lr, lg, lb, intensity, opaque);
    }
  }

  // Per-frame: static light + a small moving lamp around every character (the lamp
  // re-casts from each agent's current cell, so its shadow sweeps as it walks),
  // then paint the buffer as multiply-blended rects — interior only, so open space
  // stays at full brightness.
  private updateHeadlights(world: World): void {
    this.workBuf.set(this.staticBuf);
    const buf = this.workBuf;
    const opaque: Opaque = (x, y) => {
      if (x < 0 || y < 0 || x >= world.w || y >= world.h) return true;
      return this.occ[y * world.w + x] === 1;
    };
    for (const id in world.agents) {
      const a = world.agents[id];
      if (!a.alive) continue;
      const ox = a.cell % world.w, oy = (a.cell / world.w) | 0;
      this.accumulate(world, buf, ox, oy, LAMP_RADIUS, LAMP_COLOR[0], LAMP_COLOR[1], LAMP_COLOR[2], LAMP_INTENSITY, opaque);
    }
    const g = this.lighting;
    g.clear();
    const W = world.w;
    for (let i = 0; i < world.cells.length; i++) {
      if (world.cells[i].type === "space") continue; // leave vacuum at full brightness
      const o = i * 3;
      const r = Math.min(255, buf[o] * 255) | 0;
      const gg = Math.min(255, buf[o + 1] * 255) | 0;
      const b = Math.min(255, buf[o + 2] * 255) | 0;
      g.rect((i % W) * TILE, ((i / W) | 0) * TILE, TILE, TILE).fill(((r << 16) | (gg << 8) | b) >>> 0);
    }
  }

  // shadowcast a light into `buf`, adding colour×intensity×falloff to lit cells.
  private accumulate(world: World, buf: Float32Array, ox: number, oy: number, radius: number, lr: number, lg: number, lb: number, intensity: number, opaque: Opaque): void {
    shadowcast(ox, oy, radius, opaque, (x, y, dist) => {
      if (x < 0 || y < 0 || x >= world.w || y >= world.h) return;
      const i = y * world.w + x;
      if (world.cells[i].type === "space") return; // don't light open vacuum
      const f = falloff(dist, radius) * intensity;
      if (f <= 0) return;
      const o = i * 3;
      buf[o] += lr * f;
      buf[o + 1] += lg * f;
      buf[o + 2] += lb * f;
    });
  }

  // Tiles are drawn as sprites, rebuilt only when the grid actually changes
  // (cheap FNV hash of cell types + floor-seal state).
  private drawTiles(world: World): void {
    let h = 2166136261;
    for (let i = 0; i < world.cells.length; i++) {
      const c = world.cells[i];
      const code = c.type === "space" ? 0 : c.type === "floor" ? (c.enclosed ? 2 : 1) : c.type === "wall" ? 3 : 4;
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
          sp.scale.set(SCALE);
          sp.anchor.set(0.5);
          sp.x = x * TILE + TILE / 2;
          sp.y = y * TILE + TILE / 2;
          sp.rotation = (quarters * Math.PI) / 2;
          this.cellsC.addChild(sp);
          continue;
        }
        const t = c.type === "floor" ? tex("floor", "default") : tex("door", "closed");
        if (!t) continue;
        const sp = new Sprite(t);
        sp.scale.set(SCALE);
        sp.x = x * TILE;
        sp.y = y * TILE;
        if (c.type === "floor" && !c.enclosed) sp.tint = 0xff9a9a; // open-to-space cue
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
          sp.scale.set(SCALE);
          sp.anchor.set(0.5);
          sp.x = ((minx + maxx + 1) / 2) * TILE;
          sp.y = ((miny + maxy + 1) / 2) * TILE;
          const d = (s.cells[1] ?? s.cells[0]) - s.cells[0]; // outward delta
          sp.rotation = d === 1 ? -Math.PI / 2 : d === -1 ? Math.PI / 2 : d === -world.w ? Math.PI : 0;
          this.structsC.addChild(sp);
        }
        continue;
      }

      const state = def.draw > 0 ? (s.powered ? "enabled" : "disabled") : "default";
      const t = tex(s.kind, state);
      const x = (s.cell % world.w) * TILE;
      const y = ((s.cell / world.w) | 0) * TILE;
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(SCALE);
        sp.x = x;
        sp.y = y;
        if (s.kind === "fusion" && !s.powered) sp.tint = 0x55617a; // out of fuel — dimmed
        this.structsC.addChild(sp);
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
        sp.scale.set(SCALE);
        sp.anchor.set(0.5);
        sp.x = cx;
        sp.y = cy;
        this.agentsC.addChild(sp);
      }
      if (!a.alive) continue;
      const r = TILE * 0.32;
      if (a.guest) g.circle(cx, cy, r).stroke({ width: 2, color: COLORS.guest, alpha: 0.9 });
      if (suited) g.circle(cx, cy, r + 1.5).stroke({ width: 2, color: COLORS.suit, alpha: 0.85 });
      if (a.food < 40 || a.rest < 40) g.circle(cx, cy, r + 3).stroke({ width: 2, color: COLORS.needLow });
      // mood dot
      const moodColor = a.mood >= 60 ? 0x49d17a : a.mood >= 35 ? 0xe8c349 : 0xe24b4b;
      g.circle(cx, cy - r - 5, 2.6).fill(moodColor);
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
    const easeIn = (t: number) => t * t;
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
    const EXIT = 7; // tiles beyond the pad where the drone leaves the screen
    for (const id in world.drones) {
      const d = world.drones[id];
      if (d.state === "transit") continue; // off-map — invisible
      const bay = world.structures[d.bayId];
      if (!bay) continue;
      const pc = padCell.get(bay.id) ?? bay.cell;
      const [px, py] = center(pc);
      // outward normal = pad cell minus bay anchor (one of ±1 / ±w)
      const dxn = (pc % world.w) - (bay.cell % world.w);
      const dyn = ((pc / world.w) | 0) - ((bay.cell / world.w) | 0);
      const ux = Math.sign(dxn) || 0;
      const uy = Math.sign(dyn) || (ux === 0 ? -1 : 0); // default: straight up
      const ex = px + ux * EXIT * TILE;
      const ey = py + uy * EXIT * TILE;
      const te = d.state === "outbound" ? easeIn(d.t) : d.state === "inbound" ? easeOut(1 - d.t) : 0; // docked = on the pad
      const x = px + (ex - px) * te;
      const y = py + (ey - py) * te;
      const fade = 1 - te;
      if (d.state !== "docked")
        g.moveTo(px, py).lineTo(ex, ey).stroke({ width: 1, color: COLORS.route, alpha: 0.35 });
      const t = tex("drone", d.cargo > 0 ? "laden" : "empty");
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(SCALE * (0.5 + 0.5 * fade)); // shrink as it climbs away
        sp.anchor.set(0.5);
        sp.alpha = 0.35 + 0.65 * fade;
        sp.x = x;
        sp.y = y;
        this.dronesC.addChild(sp);
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

    // ship positions: shuttles fly along the dock's outward axis. "in" eases out
    // toward the pad from off-screen, "out" eases away; legacy/raiders just sit.
    const ease = (p: number) => 1 - Math.pow(1 - p, 3); // decelerate
    const FAR = TILE * 16; // off-screen approach distance
    const sprites: { t: Texture | null; x: number; y: number; c: boolean; tint?: number; rot?: number; scale?: number }[] = [];
    for (const ship of world.ships) {
      const padX = (ship.cell % world.w) * TILE + TILE / 2 + (ship.dx ?? 0) * TILE;
      const padY = ((ship.cell / world.w) | 0) * TILE + TILE / 2 + (ship.dy ?? 0) * TILE;
      let dist = 0;
      if (ship.phase === "in") dist = FAR * (1 - ease(ship.prog ?? 0));
      else if (ship.phase === "out") dist = FAR * (1 - ease(1 - (ship.prog ?? 0)));
      const x = padX + (ship.dx ?? 0) * dist;
      const y = padY + (ship.dy ?? 0) * dist;
      // nose points inward (toward the hull): -dir. Sprite art faces up (-y).
      const rot = ship.dx || ship.dy ? Math.atan2(-(ship.dy ?? 0), -(ship.dx ?? 0)) + Math.PI / 2 : 0;
      // arrival ring around a parked shuttle
      if (ship.phase === "wait" || ship.phase === undefined) {
        const r = TILE * (0.55 + 0.22 * Math.sin(phase * Math.PI * 2));
        const col = ship.hostile ? 0xff4040 : ship.trader ? 0x6fcf97 : 0x9fd8ff;
        g.circle(x, y, r).stroke({ width: ship.hostile ? 2.5 : 2, color: col, alpha: ship.hostile ? 0.8 : 0.55 });
      }
      // raider attack beam — a pulsing red bolt to the module it's wrecking
      if (ship.hostile && (world.raidTarget ?? -1) >= 0) {
        const tx = (world.raidTarget! % world.w) * TILE + TILE / 2;
        const ty = ((world.raidTarget! / world.w) | 0) * TILE + TILE / 2;
        g.moveTo(x, y).lineTo(tx, ty).stroke({ width: 2.5, color: 0xff5a3a, alpha: 0.5 + 0.4 * Math.abs(Math.sin(phase * Math.PI * 2)) });
        g.circle(tx, ty, TILE * (0.3 + 0.12 * Math.sin(phase * Math.PI * 2))).stroke({ width: 2, color: 0xff3b2a, alpha: 0.85 });
      }
      // raiders fly the pirate craft; bigger berths land bigger shuttles
      const sizeMul = ship.size === 3 ? 2 : ship.size === 2 ? 1.5 : 1;
      sprites.push({
        t: tex(ship.hostile ? "raider" : ship.trader ? "trader" : "shuttle", "default"),
        x, y, c: true, rot, scale: SCALE * sizeMul,
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
