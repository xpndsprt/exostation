import { Container, Graphics, Sprite, Texture, RenderTexture, Renderer as PixiRenderer } from "pixi.js";
import { World, Structure, StructureKind } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES } from "./structures";
import { SPECIES } from "./species";
import { SERVICE_THRESHOLD } from "./maintenance";

const SCALE = TILE / 16; // sprites are authored at 16px/tile

// --- lighting / shadows ---
const AMBIENT = 0xbfc4cf; // interior multiply tint when unlit (subtle dim, ~25%)
// per-kind "height" → drop-shadow length (a pragmatic stand-in for a height map)
const HEIGHT: Partial<Record<StructureKind, number>> = {
  o2gen: 1, ch4gen: 1, vat: 1, silo: 1, bay: 0.9, tradehub: 0.9, lab: 0.9,
  rec: 0.8, turret: 0.8, battery: 0.8, pod: 0.7, hotel: 0.6, synth: 0.6, lamp: 0.35,
};
// modules that emit light while powered: [radius in tiles, color, intensity]
const GLOW: Partial<Record<StructureKind, [number, number, number]>> = {
  lamp: [4.2, 0xfff0cf, 1.0],
  o2gen: [2.4, 0xcfe6ff, 0.45],
  ch4gen: [2.4, 0xffcf9a, 0.5],
  rec: [2.8, 0xffd9f2, 0.5],
  lab: [2.4, 0xc9b8ff, 0.5],
  tradehub: [2.2, 0xcfeecf, 0.4],
  vat: [2.0, 0xbfeccb, 0.35],
  bay: [2.0, 0xbfe3e3, 0.35],
};

function makeRadialTex(): Texture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return Texture.from(c);
}

interface Light {
  x: number;
  y: number;
  r: number;
  color: number;
  a: number;
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
  private lighting = new Sprite(); // lightmap, multiply-blended over the interior
  private overlay = new Graphics();
  private selection = new Graphics();
  private cursor = new Graphics();
  private speciesFlash: { sp: string; t: number } | null = null;
  // lighting/shadow build cache
  private pixi: PixiRenderer;
  private lightRT: RenderTexture | null = null;
  private lightScene = new Container(); // scratch, rendered into lightRT
  private gradTex = makeRadialTex();
  private lightSig = "";

  // Briefly ring all members of a species (Alienpedia "locate").
  flashSpecies(sp: string): void {
    this.speciesFlash = { sp, t: 45 };
  }

  constructor(world: Container, pixi: PixiRenderer) {
    buildTextures();
    this.pixi = pixi;
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
    this.drawSprites(this.sitesC, Object.values(world.sites).map((s) => ({
      t: tex("asteroid", "default"), x: (s.cell % world.w) * TILE, y: ((s.cell / world.w) | 0) * TILE, c: false,
    })));
    this.drawStructures(world);
    this.drawAgents(world);
    this.drawDrones(world);
    this.drawShips(world);
    this.updateLighting(world);
    this.drawOverlay(world, overlay);
    this.drawSelection(world, selCell);
  }

  // Center of a structure's footprint, in world pixels.
  private structCenter(world: World, s: Structure): [number, number] {
    let minx = 1e9, miny = 1e9, maxx = -1, maxy = -1;
    for (const cc of s.cells) {
      const cx = cc % world.w, cy = (cc / world.w) | 0;
      minx = Math.min(minx, cx); maxx = Math.max(maxx, cx);
      miny = Math.min(miny, cy); maxy = Math.max(maxy, cy);
    }
    return [((minx + maxx + 1) / 2) * TILE, ((miny + maxy + 1) / 2) * TILE];
  }

  private gatherLights(world: World): Light[] {
    const out: Light[] = [];
    for (const id in world.structures) {
      const s = world.structures[id];
      const g = GLOW[s.kind];
      if (!g || !s.powered) continue; // only powered emitters glow
      const [cx, cy] = this.structCenter(world, s);
      out.push({ x: cx, y: cy, r: g[0] * TILE, color: g[1], a: g[2] });
    }
    return out;
  }

  // Lightmap (multiply) + module drop-shadows. Rebuilt only when the interior
  // shape, structures, or powered-light states change — cheap to keep static.
  private updateLighting(world: World): void {
    const lights = this.gatherLights(world);
    // signature: interior cells + structures + light states
    let h = 2166136261 >>> 0;
    for (let i = 0; i < world.cells.length; i++) {
      const t = world.cells[i].type;
      h = (Math.imul(h ^ (t === "space" ? 0 : t === "wall" ? 1 : t === "door" ? 2 : 3), 16777619)) >>> 0;
    }
    for (const id in world.structures) {
      const s = world.structures[id];
      h = (Math.imul(h ^ s.cell ^ (s.powered ? 0x40000 : 0), 16777619)) >>> 0;
    }
    const sig = String(h);
    if (sig === this.lightSig && this.lightRT) return;
    this.lightSig = sig;

    if (!this.lightRT) {
      this.lightRT = RenderTexture.create({ width: world.w * TILE, height: world.h * TILE });
      this.lighting.texture = this.lightRT;
    }

    // --- build the lightmap scene ---
    this.lightScene.removeChildren();
    const base = new Graphics();
    for (let i = 0; i < world.cells.length; i++) {
      if (world.cells[i].type === "space") continue; // only the built interior is lit/dimmed
      base.rect((i % world.w) * TILE, ((i / world.w) | 0) * TILE, TILE, TILE);
    }
    base.fill({ color: AMBIENT });
    this.lightScene.addChild(base);
    for (const L of lights) {
      const sp = new Sprite(this.gradTex);
      sp.anchor.set(0.5);
      sp.x = L.x;
      sp.y = L.y;
      sp.width = sp.height = L.r * 2;
      sp.tint = L.color;
      sp.alpha = L.a;
      sp.blendMode = "add";
      this.lightScene.addChild(sp);
    }
    this.pixi.render({ container: this.lightScene, target: this.lightRT, clear: true });

    // --- module drop-shadows, cast away from the nearest light ---
    this.shadowsC.removeChildren();
    for (const id in world.structures) {
      const s = world.structures[id];
      if (s.kind === "solar" || s.kind === "dock") continue; // wall-mounted; skip
      const def = STRUCTURES[s.kind];
      const state = def.draw > 0 ? (s.powered ? "enabled" : "disabled") : "default";
      const t = tex(s.kind, state);
      if (!t) continue;
      const [cx, cy] = this.structCenter(world, s);
      let dx = 0.6, dy = 0.6; // default grounding direction when unlit
      let best = Infinity;
      for (const L of lights) {
        const d = Math.hypot(cx - L.x, cy - L.y);
        if (d < best && d > 0.001) {
          best = d;
          dx = (cx - L.x) / d;
          dy = (cy - L.y) / d;
        }
      }
      const len = TILE * (0.16 + (HEIGHT[s.kind] ?? 0.7) * 0.22);
      const sp = new Sprite(t);
      sp.scale.set(SCALE);
      sp.tint = 0x05070a;
      sp.alpha = 0.34;
      sp.x = (s.cell % world.w) * TILE + dx * len;
      sp.y = ((s.cell / world.w) | 0) * TILE + dy * len;
      this.shadowsC.addChild(sp);
    }
  }

  // simple sprite-list helper: place fresh Sprites in a container (textures cached)
  private drawSprites(box: Container, items: { t: Texture | null; x: number; y: number; c: boolean; tint?: number }[]): void {
    box.removeChildren();
    for (const it of items) {
      if (!it.t) continue;
      const sp = new Sprite(it.t);
      sp.scale.set(SCALE);
      if (it.c) sp.anchor.set(0.5);
      if (it.tint !== undefined) sp.tint = it.tint;
      sp.x = it.x;
      sp.y = it.y;
      box.addChild(sp);
    }
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
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        if (c.type === "space") continue;
        const t = c.type === "floor" ? tex("floor", "default") : c.type === "wall" ? tex("wall", "default") : tex("door", "closed");
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
        let color: number = COLORS.atmosphere;
        let alpha = 0.16;
        if (room.gas === "ch4") color = 0xc98a3a;
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
    const center = (i: number): [number, number] => [
      (i % world.w) * TILE + TILE / 2,
      ((i / world.w) | 0) * TILE + TILE / 2,
    ];
    for (const id in world.drones) {
      const d = world.drones[id];
      const bay = world.structures[d.bayId];
      if (!bay) continue;
      const [bx, by] = center(bay.cell);
      const site = world.sites[d.siteId];
      let x = bx;
      let y = by;
      if (site) {
        const [sx, sy] = center(site.cell);
        if (d.state === "outbound") {
          x = bx + (sx - bx) * d.t;
          y = by + (sy - by) * d.t;
        } else if (d.state === "mining") {
          x = sx;
          y = sy;
        } else if (d.state === "inbound") {
          x = sx + (bx - sx) * d.t;
          y = sy + (by - sy) * d.t;
        }
        if (d.state !== "docked")
          g.moveTo(bx, by).lineTo(sx, sy).stroke({ width: 1, color: COLORS.route, alpha: 0.5 });
      }
      const t = tex("drone", d.cargo > 0 ? "laden" : "empty");
      if (t) {
        const sp = new Sprite(t);
        sp.scale.set(SCALE);
        sp.anchor.set(0.5);
        sp.x = x;
        sp.y = y;
        this.dronesC.addChild(sp);
      }
    }
  }

  private drawShips(world: World): void {
    // pulsing ring so an arriving/parked shuttle is easy to spot
    const g = this.shipsFx;
    g.clear();
    const phase = (world.tick % 12) / 12; // 0..1 loop at 10Hz ≈ 1.2s
    const r = TILE * (0.55 + 0.22 * Math.sin(phase * Math.PI * 2));
    for (const ship of world.ships) {
      const cx = (ship.cell % world.w) * TILE + TILE / 2;
      const cy = ((ship.cell / world.w) | 0) * TILE + TILE / 2;
      const col = ship.hostile ? 0xff4040 : ship.trader ? 0x6fcf97 : 0x9fd8ff;
      g.circle(cx, cy, r).stroke({ width: ship.hostile ? 2.5 : 2, color: col, alpha: ship.hostile ? 0.8 : 0.55 });
    }
    // hull breaches — a blinking red marker so the emergency is easy to spot
    for (const b of world.breaches) {
      const bx = (b.cell % world.w) * TILE + TILE / 2;
      const by = ((b.cell / world.w) | 0) * TILE + TILE / 2;
      g.rect(bx - TILE * 0.4, by - TILE * 0.4, TILE * 0.8, TILE * 0.8).stroke({ width: 2.5, color: 0xff3b3b, alpha: 0.4 + 0.5 * Math.abs(Math.sin(phase * Math.PI * 2)) });
      g.circle(bx, by, TILE * 0.18).fill({ color: 0xff3b3b, alpha: 0.7 });
    }
    this.drawSprites(
      this.shipsC,
      world.ships.map((ship) => ({
        t: tex(ship.hostile ? "trader" : ship.trader ? "trader" : "shuttle", "default"),
        x: (ship.cell % world.w) * TILE + TILE / 2,
        y: ((ship.cell / world.w) | 0) * TILE + TILE / 2,
        c: true,
        tint: ship.hostile ? 0xff5555 : undefined,
      })),
    );
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
