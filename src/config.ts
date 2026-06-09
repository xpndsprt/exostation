// Tuning + visual constants for the scaffold.

export const TILE = 24; // world pixels per cell
export const GRID_W = 80;
export const GRID_H = 60;

export const COLORS = {
  space: 0x0a0e16, // app background (vacuum)
  grid: 0x1b2230,
  wall: 0x8a93a6,
  floorOpen: 0x7a3b3b, // floor exposed to space — NOT sealed (warning hue)
  floorSealed: 0x2f6d4f, // enclosed room floor — holds atmosphere (good hue)
} as const;

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 4;
