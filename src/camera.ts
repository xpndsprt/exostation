import { ZOOM_MIN, ZOOM_MAX } from "./config";

export interface Camera {
  x: number; // world container offset (screen px)
  y: number;
  scale: number;
}

export function createCamera(): Camera {
  // TILE grew 24→32 (×1.33); start a touch zoomed out so the opening view frames a
  // similar area as before.
  return { x: 60, y: 60, scale: 0.75 };
}

export function screenToTile(
  cam: Camera,
  sx: number,
  sy: number,
  tile: number,
): { tx: number; ty: number } {
  const wx = (sx - cam.x) / cam.scale;
  const wy = (sy - cam.y) / cam.scale;
  return { tx: Math.floor(wx / tile), ty: Math.floor(wy / tile) };
}

// Zoom toward a screen point so the world under the cursor stays put.
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): void {
  const ns = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, cam.scale * factor));
  const wx = (sx - cam.x) / cam.scale;
  const wy = (sy - cam.y) / cam.scale;
  cam.scale = ns;
  cam.x = sx - wx * ns;
  cam.y = sy - wy * ns;
}
