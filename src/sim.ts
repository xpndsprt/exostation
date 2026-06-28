// The deterministic simulation step — every system, in order, once per tick.
// Extracted from main.ts so both the 2D game and the 3D view drive the *same*
// headless sim. Pure logic: no rendering, no DOM. (See TECH_DESIGN.md.)

import { World } from "./types";
import { TICK_STEP } from "./config";
import { recomputeRooms } from "./rooms";
import { powerSystem } from "./power";
import { maintenanceSystem } from "./maintenance";
import { miningSystem } from "./mining";
import { foodSystem } from "./food";
import { fuelSystem } from "./fuel";
import { overflowSystem } from "./overflow";
import { atmosphereSystem } from "./atmosphere";
import { hazardSystem } from "./hazards";
import { harmonySystem } from "./harmony";
import { agentSystem } from "./agents";
import { moodSystem } from "./mood";
import { combatSystem } from "./combat";
import { medicalSystem } from "./medical";
import { spawnSystem } from "./spawn";
import { boardingSystem } from "./boarding";
import { economySystem } from "./economy";
import { eventsSystem } from "./events";
import { godsSystem } from "./gods";
import { storySystem } from "./story";
import { requestsSystem } from "./requests";
import { encountersSystem } from "./encounters";
import { barSystem } from "./bar";
import { romanceSystem } from "./romance";
import { beaconSystem } from "./beacon";
import { objectivesSystem } from "./objectives";

export function simStep(world: World, dt: number): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, dt);
  maintenanceSystem(world, dt);
  miningSystem(world, dt);
  foodSystem(world, dt);
  fuelSystem(world, dt);
  overflowSystem(world, dt);
  atmosphereSystem(world);
  hazardSystem(world, dt);
  harmonySystem(world);
  agentSystem(world, dt);
  moodSystem(world, dt);
  combatSystem(world, dt);
  medicalSystem(world, dt);
  spawnSystem(world, dt);
  boardingSystem(world, dt);
  economySystem(world, dt);
  eventsSystem(world, dt);
  godsSystem(world, dt);
  storySystem(world, dt);
  requestsSystem(world, dt);
  encountersSystem(world, dt);
  barSystem(world, dt);
  romanceSystem(world, dt);
  beaconSystem(world, dt);
  objectivesSystem(world, dt);
  world.tick += TICK_STEP; // tick = deciseconds (real-time), independent of SIM_HZ
}

// A no-step refresh (paused): re-seal rooms and recompute power/atmosphere so the
// view reflects edits without advancing time.
export function refresh(world: World): void {
  if (world.dirtyRooms) recomputeRooms(world);
  powerSystem(world, 0);
  atmosphereSystem(world);
}
