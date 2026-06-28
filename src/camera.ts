import { ZOOM_MIN, ZOOM_MAX, TILE } from "./config";

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

// Zoom toward a screen point so the world under the cursor stays put. The scale is
// snapped so a tile always spans a WHOLE number of pixels — pixel art stays crisp
// with no texel crawl when zooming (a tiny nudge keeps each wheel tick moving even
// when rounding would otherwise stall).
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): void {
  const wx = (sx - cam.x) / cam.scale;
  const wy = (sy - cam.y) / cam.scale;
  const cur = Math.round(cam.scale * TILE);
  let nk = Math.round(cam.scale * factor * TILE);
  if (nk === cur) nk += factor > 1 ? 1 : -1; // ensure the zoom actually changes
  cam.scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nk / TILE));
  cam.x = sx - wx * cam.scale;
  cam.y = sy - wy * cam.scale;
}
