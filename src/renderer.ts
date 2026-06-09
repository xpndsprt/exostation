import { Container, Graphics } from "pixi.js";
import { World } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES } from "./structures";
import { SPECIES } from "./species";

function hslToHex(h: number, s: number, l: number): number {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return (r << 16) | (g << 8) | b;
}

// Lerp between two 0xRRGGBB colors (t in 0..1).
function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (g << 8) | bl;
}

// Draws the world. Layers are redrawn only when the world changes (or a sim
// step ran), not every frame.
export class Renderer {
  private cells = new Graphics();
  private atmo = new Graphics();
  private grid = new Graphics();
  private structs = new Graphics();
  private sites = new Graphics();
  private agents = new Graphics();
  private drones = new Graphics();
  private overlay = new Graphics();
  private selection = new Graphics();
  private cursor = new Graphics();

  constructor(world: Container) {
    world.addChild(this.cells);
    world.addChild(this.atmo);
    world.addChild(this.grid);
    world.addChild(this.structs);
    world.addChild(this.sites);
    world.addChild(this.agents);
    world.addChild(this.drones);
    world.addChild(this.overlay);
    world.addChild(this.selection);
    world.addChild(this.cursor);
  }

  // Ghost preview + hover outline, drawn on its own layer so it can update on
  // mouse-move without a full world redraw.
  drawCursor(world: World, ghostCells: number[], valid: boolean, hover: number): void {
    const g = this.cursor;
    g.clear();
    const tint = valid ? 0x49d17a : 0xe24b4b;
    for (const cell of ghostCells) {
      const x = (cell % world.w) * TILE;
      const y = ((cell / world.w) | 0) * TILE;
      g.rect(x, y, TILE, TILE).fill({ color: tint, alpha: 0.28 });
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

  drawGrid(w: number, h: number): void {
    this.grid.clear();
    for (let x = 0; x <= w; x++) this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h * TILE);
    for (let y = 0; y <= h; y++) this.grid.moveTo(0, y * TILE).lineTo(w * TILE, y * TILE);
    this.grid.stroke({ width: 1, color: COLORS.grid, alpha: 0.6 });
  }

  draw(world: World, selCell = -1, overlay: "none" | "power" | "rooms" = "none"): void {
    this.drawCells(world);
    this.drawAtmosphere(world);
    this.drawStructures(world);
    this.drawSites(world);
    this.drawAgents(world);
    this.drawDrones(world);
    this.drawOverlay(world, overlay);
    this.drawSelection(world, selCell);
  }

  private drawOverlay(world: World, mode: "none" | "power" | "rooms"): void {
    const g = this.overlay;
    g.clear();
    if (mode === "none") return;
    if (mode === "rooms") {
      for (let i = 0; i < world.cells.length; i++) {
        const c = world.cells[i];
        if (c.type !== "floor" || c.roomId < 0) continue;
        // distinct hue per room id
        const hue = (c.roomId * 47) % 360;
        const color = hslToHex(hue, 55, 50);
        const x = (i % world.w) * TILE;
        const y = ((i / world.w) | 0) * TILE;
        g.rect(x, y, TILE, TILE).fill({ color, alpha: 0.3 });
      }
      return;
    }
    // power: highlight consumers green (powered) / red (unpowered)
    for (const id in world.structures) {
      const s = world.structures[id];
      const x = (s.cell % world.w) * TILE;
      const y = ((s.cell / world.w) | 0) * TILE;
      const def = STRUCTURES[s.kind];
      let color: number;
      if (def.gen > 0) color = 0x3a7bd5;
      else if (def.draw > 0) color = s.powered ? 0x49d17a : 0xe24b4b;
      else color = 0xd5b13a;
      g.rect(x, y, TILE, TILE).fill({ color, alpha: 0.45 });
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

  private drawSites(world: World): void {
    const g = this.sites;
    g.clear();
    for (const id in world.sites) {
      const s = world.sites[id];
      const cx = (s.cell % world.w) * TILE + TILE / 2;
      const cy = ((s.cell / world.w) | 0) * TILE + TILE / 2;
      const color = s.richness > 0 ? COLORS.site : COLORS.siteEmpty;
      g.circle(cx, cy, TILE * 0.42).fill(color);
      g.circle(cx, cy, TILE * 0.42).stroke({ width: 1.5, color: 0x000000, alpha: 0.35 });
    }
  }

  private drawDrones(world: World): void {
    const g = this.drones;
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
        if (d.state !== "docked") {
          g.moveTo(bx, by).lineTo(sx, sy).stroke({ width: 1, color: COLORS.route, alpha: 0.5 });
        }
      }
      // tint by state so the loop is readable at a glance
      const tint =
        d.state === "outbound"
          ? 0xffd27a
          : d.state === "mining"
            ? 0x9be29b
            : d.state === "inbound"
              ? 0x7ab8ff
              : COLORS.drone;
      g.circle(x, y, TILE * 0.16).fill(tint);
      if (d.cargo > 0) g.circle(x, y, TILE * 0.07).fill(0x8a7a5c); // cargo pip
    }
  }

  private drawCells(world: World): void {
    const g = this.cells;
    g.clear();
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        let color: number;
        if (c.type === "wall") color = COLORS.wall;
        else if (c.type === "door") color = COLORS.door;
        else if (c.type === "floor") color = c.enclosed ? COLORS.floorSealed : COLORS.floorOpen;
        else continue; // space — show app background
        g.rect(x * TILE, y * TILE, TILE, TILE).fill(color);
      }
    }
  }

  private drawAtmosphere(world: World): void {
    const g = this.atmo;
    g.clear();
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        if (c.type !== "floor" || c.roomId < 0) continue;
        const room = world.rooms[c.roomId];
        if (!room || room.gas === "none") continue;
        let color: number = COLORS.atmosphere; // o2
        let alpha = 0.18;
        if (room.gas === "ch4") color = 0xc98a3a;
        else if (room.gas === "mixed") {
          color = 0xe24b4b; // hazardous mix
          alpha = 0.3;
        }
        g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color, alpha });
      }
    }
  }

  private drawStructures(world: World): void {
    const g = this.structs;
    g.clear();
    for (const id in world.structures) {
      const s = world.structures[id];
      const def = STRUCTURES[s.kind];
      for (const cell of s.cells ?? [s.cell]) {
        const x = (cell % world.w) * TILE;
        const y = ((cell / world.w) | 0) * TILE;
        g.roundRect(x + 3, y + 3, TILE - 6, TILE - 6, 4).fill(def.color);
        if (def.draw > 0 && !s.powered) {
          g.roundRect(x + 3, y + 3, TILE - 6, TILE - 6, 4).stroke({ width: 2, color: COLORS.unpowered });
        }
      }
    }
  }

  private drawAgents(world: World): void {
    const g = this.agents;
    g.clear();
    const center = (i: number): [number, number] => [
      (i % world.w) * TILE + TILE / 2,
      ((i / world.w) | 0) * TILE + TILE / 2,
    ];
    for (const id in world.agents) {
      const a = world.agents[id];
      let [cx, cy] = center(a.cell);
      if (a.path.length > 0) {
        const [nx, ny] = center(a.path[0]);
        cx = cx + (nx - cx) * a.moveAcc;
        cy = cy + (ny - cy) * a.moveAcc;
      }
      const r = TILE * 0.3;
      if (!a.alive) {
        g.circle(cx, cy, r).fill(COLORS.agentDead);
        g.moveTo(cx - r * 0.5, cy - r * 0.5).lineTo(cx + r * 0.5, cy + r * 0.5);
        g.moveTo(cx + r * 0.5, cy - r * 0.5).lineTo(cx - r * 0.5, cy + r * 0.5);
        g.stroke({ width: 2, color: 0x1a1e26 });
        continue;
      }
      const color = lerpColor(COLORS.agentLow, COLORS.agentOk, a.o2 / 100);
      g.circle(cx, cy, r).fill(color);
      // outline: species accent (guests still get the gold ring)
      const outline = a.guest ? COLORS.guest : SPECIES[a.species].accent;
      const ringed = a.guest || a.species !== "human";
      g.circle(cx, cy, r).stroke({ width: ringed ? 2 : 1.5, color: outline, alpha: ringed ? 0.9 : 0.6 });
      // suited: in a non-native zone (uses suit reserve)
      const rm = world.cells[a.cell].roomId;
      const native = rm >= 0 && world.rooms[rm]?.gas === SPECIES[a.species].gas;
      if (!native) {
        g.circle(cx, cy, r + 1.5).stroke({ width: 2, color: COLORS.suit, alpha: 0.85 });
      }
      // low-needs indicator
      if (a.food < 40 || a.rest < 40) {
        g.circle(cx, cy, r + 2.5).stroke({ width: 2, color: COLORS.needLow });
      }
      // mood dot above the head
      const moodColor = a.mood >= 60 ? 0x49d17a : a.mood >= 35 ? 0xe8c349 : 0xe24b4b;
      g.circle(cx, cy - r - 4, 2.6).fill(moodColor);
      // combat: red ring while fighting, orange when tension is building
      if (a.fighting) g.circle(cx, cy, r + 4).stroke({ width: 2.5, color: 0xff3b3b });
      else if (a.tension > 50) g.circle(cx, cy, r + 4).stroke({ width: 1.5, color: 0xe8a33d, alpha: 0.8 });
    }
  }
}
