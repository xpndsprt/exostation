import { Agent, World } from "./types";
import { effRelation } from "./relations";
import { SPECIES } from "./species";
import { beaconActive } from "./beacon";

const PROXIMITY = 4; // Manhattan tiles — "living next to each other"
const SOCIAL_CLAMP = 45; // M42: neighbors now matter as much as needs (±~22)
const RATE = 0.5; // mood easing per second toward its target
const BASE = 50;

export interface MoodBreakdown {
  base: number; // the 50 baseline
  needs: number; // contribution from food/rest/fun
  social: number; // summed neighbor opinions (clamped)
  harmony: number; // contribution from the room's harmony
  command: number; // station-wide lift from an active Command Hub
  overflow: number; // morale hit from resources visibly going to waste at cap
  temp: number; // comfort/discomfort from the room's climate band vs species pref
  filth: number; // morale hit from floor messes nearby (no Lavatory)
  target: number; // resulting target mood (0..100)
}

const COMMAND_LIFT = 8; // mood bonus while a Human-staffed Command Hub runs
const OVERFLOW_HIT = -5; // morale drag while a resource is wasting at its cap (M41)
const TEMP_HIT = -10; // morale drag while in a room of the wrong climate band
const FILTH_PER = -4; // morale per floor mess within PROXIMITY (gross)
const FILTH_CLAMP = -20; // worst the stench can drag mood

// Single source of truth for what an agent's mood is pulled toward. The system
// eases actual mood toward this; the UI reads the same breakdown for tooltips.
export function moodBreakdown(w: World, a: Agent): MoodBreakdown {
  const ax = a.cell % w.w;
  const ay = (a.cell / w.w) | 0;
  let social = 0;
  for (const id in w.agents) {
    const o = w.agents[id];
    if (o === a || !o.alive) continue;
    const ox = o.cell % w.w;
    const oy = (o.cell / w.w) | 0;
    if (Math.abs(ax - ox) + Math.abs(ay - oy) <= PROXIMITY) {
      social += effRelation(w, a.species, o.species);
    }
  }
  social = Math.max(-SOCIAL_CLAMP, Math.min(SOCIAL_CLAMP, social));
  const needs = (a.food - 50) * 0.15 + (a.rest - 50) * 0.15 + (a.fun - 50) * 0.15;
  const rid = w.cells[a.cell].roomId;
  const room = rid >= 0 ? w.rooms[rid] : undefined;
  const harmony = room ? room.harmony * 10 : 0;
  const command = beaconActive(w, "cmdhub") ? COMMAND_LIFT : 0;
  const overflow = w.overflow ? OVERFLOW_HIT : 0;
  // Climate comfort: only a species in a room whose band differs from what it
  // likes is unhappy. Most crews want "temperate" (the default), so this only
  // bites the exotic crews — Voltaar (hot), Naaz (cold) — until you climate-control.
  const temp = room && room.gas !== "none" && room.temp !== SPECIES[a.species].temp ? TEMP_HIT : 0;
  let near = 0;
  for (const m of w.messes ?? []) {
    if (Math.abs(ax - (m.cell % w.w)) + Math.abs(ay - ((m.cell / w.w) | 0)) <= PROXIMITY) near++;
  }
  const filth = Math.max(FILTH_CLAMP, near * FILTH_PER);
  const target = Math.max(0, Math.min(100, BASE + needs + social + harmony + command + overflow + temp + filth));
  return { base: BASE, needs, social, harmony, command, overflow, temp, filth, target };
}

// Mood blends need-satisfaction with how an agent feels about nearby neighbors
// (the political web). Drives the tension/skirmish system in M11.
export function moodSystem(w: World, dt: number): void {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    const { target } = moodBreakdown(w, a);
    a.mood += (target - a.mood) * Math.min(1, RATE * dt);
  }
}
