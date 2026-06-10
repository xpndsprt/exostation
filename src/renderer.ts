import { Container, Graphics, Sprite, Texture } from "pixi.js";
import { World } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES } from "./structures";
import { SPECIES } from "./species";
import { SERVICE_THRESHOLD } from "./maintenance";

const SCALE = TILE / 16; // sprites are authored at 16px/tile

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
  private cells = new Graphics();
  private atmo = new Graphics();
  private grid = new Graphics();
  private sitesC = new Container();
  private structsC = new Container();
  private structFx = new Graphics();
  private agentsC = new Container();
  private agentFx = new Graphics();
  private dronesFx = new Graphics(); // route lines
  private dronesC = new Container();
  private shipsC = new Container();
  private overlay = new Graphics();
  private selection = new Graphics();
  private cursor = new Graphics();

  constructor(world: Container) {
    buildTextures();
    for (const layer of [
      this.cells, this.atmo, this.grid, this.sitesC, this.structsC, this.structFx,
      this.agentsC, this.agentFx, this.dronesFx, this.dronesC, this.shipsC,
      this.overlay, this.selection, this.cursor,
    ])
      world.addChild(layer);
  }

  drawGrid(w: number, h: number): void {
    this.grid.clear();
    for (let x = 0; x <= w; x++) this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h * TILE);
    for (let y = 0; y <= h; y++) this.grid.moveTo(0, y * TILE).lineTo(w * TILE, y * TILE);
    this.grid.stroke({ width: 1, color: COLORS.grid, alpha: 0.6 });
  }

  drawCursor(world: World, ghostCells: number[], valid: boolean, hover: number): void {
    const g = this.cursor;
    g.clear();
    const tint = valid ? 0x49d17a : 0xe24b4b;
    for (const cell of ghostCells) {
      g.rect((cell % world.w) * TILE, ((cell / world.w) | 0) * TILE, TILE, TILE).fill({ color: tint, alpha: 0.28 });
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
    this.drawCells(world);
    this.drawAtmosphere(world);
    this.drawSprites(this.sitesC, Object.values(world.sites).map((s) => ({
      t: tex("asteroid", "default"), x: (s.cell % world.w) * TILE, y: ((s.cell / world.w) | 0) * TILE, c: false,
    })));
    this.drawStructures(world);
    this.drawAgents(world);
    this.drawDrones(world);
    this.drawShips(world);
    this.drawOverlay(world, overlay);
    this.drawSelection(world, selCell);
  }

  // simple sprite-list helper: place fresh Sprites in a container (textures cached)
  private drawSprites(box: Container, items: { t: Texture | null; x: number; y: number; c: boolean }[]): void {
    box.removeChildren();
    for (const it of items) {
      if (!it.t) continue;
      const sp = new Sprite(it.t);
      sp.scale.set(SCALE);
      if (it.c) sp.anchor.set(0.5);
      sp.x = it.x;
      sp.y = it.y;
      box.addChild(sp);
    }
  }

  private drawCells(world: World): void {
    const g = this.cells;
    g.clear();
    for (let y = 0; y < world.h; y++)
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        let color: number;
        if (c.type === "wall") color = COLORS.wall;
        else if (c.type === "door") color = COLORS.door;
        else if (c.type === "floor") color = c.enclosed ? COLORS.floorSealed : COLORS.floorOpen;
        else continue;
        g.rect(x * TILE, y * TILE, TILE, TILE).fill(color);
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
      const state = !a.alive ? "dead" : a.path.length > 0 ? "walk" : "idle";
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
      const rm = world.cells[a.cell].roomId;
      const native = rm >= 0 && world.rooms[rm]?.gas === SPECIES[a.species].gas;
      if (!native) g.circle(cx, cy, r + 1.5).stroke({ width: 2, color: COLORS.suit, alpha: 0.85 });
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
    this.drawSprites(
      this.shipsC,
      world.ships.map((ship) => ({
        t: tex(ship.trader ? "trader" : "shuttle", "default"),
        x: (ship.cell % world.w) * TILE + TILE / 2,
        y: ((ship.cell / world.w) | 0) * TILE + TILE / 2,
        c: true,
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
