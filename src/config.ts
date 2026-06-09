// Tuning + visual constants for the scaffold.

export const TILE = 24; // world pixels per cell
export const GRID_W = 80;
export const GRID_H = 60;

export const COLORS = {
  space: 0x0a0e16, // app background (vacuum)
  grid: 0x1b2230,
  wall: 0x8a93a6,
  door: 0x4a6a8a, // airlock: walkable, holds pressure
  suit: 0x9fd8ff, // ring shown when an agent is suited (off native air)
  floorOpen: 0x7a3b3b, // floor exposed to space — NOT sealed (warning hue)
  floorSealed: 0x244a39, // enclosed room floor, no air yet
  atmosphere: 0x35c2c2, // translucent overlay on breathable rooms
  agentOk: 0x49d17a, // healthy O₂
  agentLow: 0xe24b4b, // low O₂
  agentDead: 0x555a66,
  needLow: 0xe8a33d, // ring when food/rest is low
  unpowered: 0xff5555, // outline for an unpowered consumer
  site: 0x8a7a5c, // asteroid / mining site
  siteEmpty: 0x3a3730, // depleted site
  drone: 0xdfe6f2,
  route: 0x33506e, // faint drone flight path
  guest: 0xe8c349, // Drenn guest outline
} as const;

export const SIM_HZ = 10; // simulation steps per second at 1× speed

export const ZOOM_MIN = 0.3;
export const ZOOM_MAX = 4;
