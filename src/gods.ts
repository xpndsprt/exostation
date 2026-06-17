import { God, Species, World } from "./types";
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
  // drift + judge + despawn existing gods
  for (let i = w.gods.length - 1; i >= 0; i--) {
    const g = w.gods[i];
    g.t += dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    if (!g.judged && g.t >= JUDGE_T) { judge(w, g); g.judged = true; }
    if (g.x < -8 || g.y < -8 || g.x > w.w + 8 || g.y > w.h + 8) w.gods.splice(i, 1);
  }

  // spawn — rare, one at a time, only for a race that's aboard
  w.godTimer += dt;
  const due = w.godTimer >= (w.tick < FIRST * 10 ? FIRST : INTERVAL);
  if (!due || w.gods.length > 0) return;
  const here = presentSpecies(w);
  if (here.length === 0) { w.godTimer = 0; return; }
  w.godTimer = 0;
  const sp = here[Math.floor((w.tick * 40503) >>> 0) % here.length];
  // enter from the left or right edge, drift horizontally across the station band
  const fromLeft = ((w.tick >>> 3) & 1) === 0;
  w.gods.push({
    species: sp,
    x: fromLeft ? -4 : w.w + 4,
    y: w.h / 2 + (((w.tick * 13) % 20) - 10),
    vx: fromLeft ? DRIFT : -DRIFT,
    vy: 0,
    t: 0,
    judged: false,
    verdict: "none",
  });
}
