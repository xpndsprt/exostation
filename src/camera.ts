export interface Camera {
  x: number; // world container offset (screen px)
  y: number;
  scale: number;
}

// Discrete zoom stops: 25% / 50% / 100% / 200% / 300%. All are whole-integer
// down/up ratios (¼, ½, 1×, 2×, 3×), so nearest-neighbour pixel art stays crisp at
// every stop (uniform sampling — no aliasing).
export const ZOOM_STEPS = [0.25, 0.5, 1, 2, 3];

export function createCamera(): Camera {
  return { x: 60, y: 60, scale: 0.5 }; // start at 50% — the whole station in view, crisp
}

function nearestStep(scale: number): number {
  let bi = 0, bd = Infinity;
  for (let i = 0; i < ZOOM_STEPS.length; i++) {
    const d = Math.abs(ZOOM_STEPS[i] - scale);
    if (d < bd) { bd = d; bi = i; }
  }
  return bi;
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

// Zoom toward a screen point so the world under the cursor stays put. Discrete:
// each wheel notch steps one stop on ZOOM_STEPS (crisp at every level).
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): void {
  const wx = (sx - cam.x) / cam.scale;
  const wy = (sy - cam.y) / cam.scale;
  let i = nearestStep(cam.scale);
  i = factor > 1 ? Math.min(ZOOM_STEPS.length - 1, i + 1) : Math.max(0, i - 1);
  cam.scale = ZOOM_STEPS[i];
  cam.x = sx - wx * cam.scale;
  cam.y = sy - wy * cam.scale;
}
