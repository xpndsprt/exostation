import { Container, Graphics } from "pixi.js";
import { World } from "./types";
import { TILE, COLORS } from "./config";

// Draws the cell grid. Redraws only when the world changes (not per frame).
export class Renderer {
  private cells = new Graphics();
  private grid = new Graphics();

  constructor(world: Container) {
    world.addChild(this.cells);
    world.addChild(this.grid);
  }

  drawGrid(w: number, h: number): void {
    this.grid.clear();
    for (let x = 0; x <= w; x++) {
      this.grid.moveTo(x * TILE, 0).lineTo(x * TILE, h * TILE);
    }
    for (let y = 0; y <= h; y++) {
      this.grid.moveTo(0, y * TILE).lineTo(w * TILE, y * TILE);
    }
    this.grid.stroke({ width: 1, color: COLORS.grid, alpha: 0.6 });
  }

  draw(world: World): void {
    const g = this.cells;
    g.clear();
    for (let y = 0; y < world.h; y++) {
      for (let x = 0; x < world.w; x++) {
        const c = world.cells[y * world.w + x];
        let color: number;
        if (c.type === "wall") color = COLORS.wall;
        else if (c.type === "floor") color = c.enclosed ? COLORS.floorSealed : COLORS.floorOpen;
        else continue; // space — let the app background show through
        g.rect(x * TILE, y * TILE, TILE, TILE).fill(color);
      }
    }
  }
}
