import { Container, Graphics } from "pixi.js";
import { World } from "./types";
import { TILE, COLORS } from "./config";
import { STRUCTURES } from "./structures";

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
  private agents = new Graphics();

  constructor(world: Container) {
    world.addChild(this.cells);
    world.addChild(this.atmo);
    world.addChild(this.grid);
    world.addChild(this.structs);
    world.addChild(this.agents);
  }

  drawGrid(w: number, h: number): void {
    this.grid.clear();
    for (let x = 0; x <= w; x++) this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h * TILE);
    for (let y = 0; y <= h; y++) this.grid.moveTo(0, y * TILE).lineTo(w * TILE, y * TILE);
    this.grid.stroke({ width: 1, color: COLORS.grid, alpha: 0.6 });
  }

  draw(world: World): void {
    this.drawCells(world);
    this.drawAtmosphere(world);
    this.drawStructures(world);
    this.drawAgents(world);
  }

  private drawCells(world: World): void {
    const g = this.cells;
    g.clear();
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        let color: number;
        if (c.type === "wall") color = COLORS.wall;
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
        if (room && room.breathable) {
          g.rect(x * TILE, y * TILE, TILE, TILE).fill({ color: COLORS.atmosphere, alpha: 0.18 });
        }
      }
    }
  }

  private drawStructures(world: World): void {
    const g = this.structs;
    g.clear();
    for (const id in world.structures) {
      const s = world.structures[id];
      const def = STRUCTURES[s.kind];
      const x = (s.cell % world.w) * TILE;
      const y = ((s.cell / world.w) | 0) * TILE;
      g.roundRect(x + 3, y + 3, TILE - 6, TILE - 6, 4).fill(def.color);
      if (def.draw > 0 && !s.powered) {
        // unpowered consumer — flag it
        g.roundRect(x + 3, y + 3, TILE - 6, TILE - 6, 4).stroke({ width: 2, color: COLORS.unpowered });
      }
    }
  }

  private drawAgents(world: World): void {
    const g = this.agents;
    g.clear();
    for (const id in world.agents) {
      const a = world.agents[id];
      const cx = (a.cell % world.w) * TILE + TILE / 2;
      const cy = ((a.cell / world.w) | 0) * TILE + TILE / 2;
      const r = TILE * 0.3;
      if (!a.alive) {
        g.circle(cx, cy, r).fill(COLORS.agentDead);
        g.moveTo(cx - r * 0.5, cy - r * 0.5).lineTo(cx + r * 0.5, cy + r * 0.5);
        g.moveTo(cx + r * 0.5, cy - r * 0.5).lineTo(cx - r * 0.5, cy + r * 0.5);
        g.stroke({ width: 2, color: 0x1a1e26 });
      } else {
        const color = lerpColor(COLORS.agentLow, COLORS.agentOk, a.o2 / 100);
        g.circle(cx, cy, r).fill(color);
        g.circle(cx, cy, r).stroke({ width: 1.5, color: 0x0d1016, alpha: 0.6 });
      }
    }
  }
}
