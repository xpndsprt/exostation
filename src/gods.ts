import { God, Species, WeirdGod, World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";
import { storageCaps } from "./storage";
import { eraseAt } from "./world";

// Each race has a Q-like god — omnipotent, ship-sized, indifferent to your
// permission. Once a race is aboard, its god drifts past now and then and judges
// how content that species is: pleased → gifts credits + minerals; wrathful →
// unmakes one of your modules; in between → it simply watches.
export const GODS: Record<Species, string> = {
  human: "The Mantis", // a colossal shrimp
  drenn: "The Vault", // a floating metal safe
  thol: "The Cinder-Anvil",
  vryl: "The Bloom",
  korro: "The Fist",
  vorn: "The Ingot",
  chlorithe: "The Lattice",
  naaz: "The Veil",
  voltaar: "The Spark",
  sszra: "The Eye",
};

const FIRST = 180; // s — first god won't appear before this
const INTERVAL = 150; // s — between visits thereafter
const DRIFT = 3; // cells/s — crosses the map in ~25s
const JUDGE_T = 12; // s after appearing — by now it's drifted in over the station
const GOOD = 60; // species avg mood ≥ this → pleased
const BAD = 40; // species avg mood ≤ this → wrathful
const GIFT_CREDITS = 250;
const GIFT_MINERALS = 60;

// --- the four weird gods: wild cards, indifferent to mood, that warp the
// station outright. They roll in on the same cadence as the race-gods. ---
export const WEIRD_GODS: Record<WeirdGod, string> = {
  blackout: "The Hollow", // swallows the lights
  surge: "The Dynamo", // floods the grid with free power
  famine: "The Maw", // devours the larder
  feast: "The Glut", // gorges the larder full
};
const WEIRD_KEYS: WeirdGod[] = ["blackout", "surge", "famine", "feast"];
const WEIRD_CHANCE = 0.35; // share of god visits that are a weird god
const BLACKOUT_S = 25; // s — all power dead
const SURGE_S = 45; // s — free surplus power

// Apply a weird god's effect the moment it judges. Returns a notify line.
function applyWeird(w: World, kind: WeirdGod): string {
  const name = WEIRD_GODS[kind];
  if (kind === "blackout") {
    w.blackoutT = Math.max(w.blackoutT, BLACKOUT_S);
    return `${name} swallows the lights — the grid goes dark for ${BLACKOUT_S}s.`;
  }
  if (kind === "surge") {
    w.surgeT = Math.max(w.surgeT, SURGE_S);
    return `${name} floods the grid — free power for ${SURGE_S}s, everything runs.`;
  }
  if (kind === "famine") {
    w.stock.meals = { rations: 0, fungal: 0, protein: 0, exotic: 0 };
    return `${name} devours your larder — every meal is gone.`;
  }
  // feast — gorge each meal store to its cap
  const caps = storageCaps(w);
  w.stock.meals = { rations: caps.rations, fungal: caps.fungal, protein: caps.protein, exotic: caps.exotic };
  return `${name} gorges your larder — every meal store is brimming.`;
}

// Average mood of a species' living members aboard (-1 if none present).
function speciesMood(w: World, sp: Species): number {
  let sum = 0, n = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === sp) { sum += a.mood; n++; }
  }
  return n === 0 ? -1 : sum / n;
}

// Species that currently have at least one living member aboard.
function presentSpecies(w: World): Species[] {
  const set = new Set<Species>();
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive) set.add(a.species); }
  return [...set];
}

function judge(w: World, g: God): void {
  // weird gods don't weigh mood — they just warp the station and announce it
  if (g.weird) {
    const msg = applyWeird(w, g.weird);
    g.verdict = g.weird === "blackout" || g.weird === "famine" ? "wrathful" : "pleased";
    w.godVerdict = { species: g.species, verdict: g.verdict, weird: g.weird };
    w.notify.push(msg);
    return;
  }
  const mood = speciesMood(w, g.species);
  const name = GODS[g.species];
  const label = SPECIES[g.species].label;
  if (mood < 0) { g.verdict = "none"; return; } // species left mid-visit
  const announce = (v: "pleased" | "wrathful" | "neutral") => { w.godVerdict = { species: g.species, verdict: v }; };
  if (mood >= GOOD) {
    w.credits += GIFT_CREDITS;
    w.stock.minerals = Math.min(storageCaps(w).minerals, w.stock.minerals + GIFT_MINERALS);
    g.verdict = "pleased"; announce("pleased");
    w.notify.push(`${name} is pleased with the ${label} — a gift of ¢${GIFT_CREDITS} and ${GIFT_MINERALS} minerals.`);
  } else if (mood <= BAD) {
    const victim = wrathTarget(w);
    if (victim >= 0) {
      const k = w.structures[w.cells[victim]?.structureId]?.kind;
      eraseAt(w, victim % w.w, (victim / w.w) | 0);
      g.verdict = "wrathful"; announce("wrathful");
      w.notify.push(`${name} is wrathful — the ${label} suffer, and it unmakes your ${k ? STRUCTURES[k].label : "module"}.`);
    } else {
      g.verdict = "neutral"; announce("neutral");
      w.notify.push(`${name} glares at the wretched ${label} — but finds nothing to take.`);
    }
  } else {
    g.verdict = "neutral"; announce("neutral");
    w.notify.push(`${name} watches the ${label} in silence, unmoved.`);
  }
}

// A module a wrathful god will unmake: a powered, non-life-support machine
// (life support is spared so a god can't instantly doom the station). -1 if none.
function wrathTarget(w: World): number {
  const pick: number[] = [];
  for (const id in w.structures) {
    const s = w.structures[id];
    if (STRUCTURES[s.kind].gas) continue; // spare life support
    if (STRUCTURES[s.kind].draw <= 0) continue; // only real machinery
    pick.push(s.cell);
  }
  if (pick.length === 0) return -1;
  return pick[Math.floor((w.tick * 2654435761) >>> 0) % pick.length];
}

export function godsSystem(w: World, dt: number): void {
  // weird-god timed effects tick down (power blackout / surge)
  if (w.blackoutT > 0) w.blackoutT = Math.max(0, w.blackoutT - dt);
  if (w.surgeT > 0) w.surgeT = Math.max(0, w.surgeT - dt);

  // drift + judge + despawn existing gods
  for (let i = w.gods.length - 1; i >= 0; i--) {
    const g = w.gods[i];
    g.t += dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    if (!g.judged && g.t >= JUDGE_T) { judge(w, g); g.judged = true; }
    if (g.x < -8 || g.y < -8 || g.x > w.w + 8 || g.y > w.h + 8) w.gods.splice(i, 1);
  }

  // spawn — rare, one at a time. Race-gods need their species aboard; weird gods
  // can roll in regardless (a share of every visit, chosen by WEIRD_CHANCE).
  w.godTimer += dt;
  const due = w.godTimer >= (w.tick < FIRST * 10 ? FIRST : INTERVAL);
  if (!due || w.gods.length > 0) return;
  const here = presentSpecies(w);
  const weird = Math.random() < WEIRD_CHANCE;
  if (!weird && here.length === 0) { w.godTimer = 0; return; }
  w.godTimer = 0;
  // enter from the left or right edge, drift horizontally across the station band
  const fromLeft = ((w.tick >>> 3) & 1) === 0;
  const drift = {
    x: fromLeft ? -4 : w.w + 4,
    y: w.h / 2 + (((w.tick * 13) % 20) - 10),
    vx: fromLeft ? DRIFT : -DRIFT,
    vy: 0,
    t: 0,
    judged: false,
    verdict: "none" as const,
  };
  if (weird) {
    const kind = WEIRD_KEYS[Math.floor(Math.random() * WEIRD_KEYS.length)];
    const tint: Species = here.length ? here[Math.floor(Math.random() * here.length)] : "human";
    w.gods.push({ species: tint, weird: kind, ...drift });
  } else {
    const sp = here[Math.floor((w.tick * 40503) >>> 0) % here.length];
    w.gods.push({ species: sp, ...drift });
  }
}
