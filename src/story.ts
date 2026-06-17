import { Species, World } from "./types";
import { SPECIES } from "./species";
import { RELATIONS } from "./relations";
import { GODS } from "./gods";
import { beaconCharged } from "./beacon";

// The Chronicler — a deep storyteller that narrates the station's long history:
// welcomes each race as it arrives, comments on relationships, each race's
// standing with its god, and the Sector Beacon. Thousands of combinations from
// templated lines × species × pairs × moods. Cosmetic, so it may use Math.random.
const YEAR_TICKS = 10; // sim ticks per in-world year (≈ 1 year / second at 1×)
const STORY_INTERVAL = 100; // seconds between chronicle entries (≈ every 100 years)

export function currentYear(w: World): number {
  return 1 + Math.floor(w.tick / YEAR_TICKS);
}

const rng = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function present(w: World): Species[] {
  const set = new Set<Species>();
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive) set.add(a.species); }
  return [...set];
}
function moodOf(w: World, sp: Species): number {
  let s = 0, n = 0;
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive && a.species === sp) { s += a.mood; n++; } }
  return n === 0 ? -1 : s / n;
}

function welcome(w: World, sp: Species): string {
  const L = SPECIES[sp].label, g = GODS[sp];
  return `Year ${currentYear(w)} — ` + rng([
    `Word travels the dark: the ${L} have come to dwell on this station.`,
    `A ${L} crosses the threshold for the first time. The chronicle grows a chapter.`,
    `The ${L} arrive — and far beyond the hull, ${g} turns its attention here.`,
    `New air, new faces: the ${L} make their home among us. ${g} is watching now.`,
    `History notes the day the ${L} first walked these corridors.`,
    `The ${L} take root on the station; their god ${g} marks the moment.`,
  ]);
}

function relationLine(here: Species[]): string | null {
  if (here.length < 2) return null;
  const a = rng(here);
  const others = here.filter((x) => x !== a);
  const b = rng(others);
  const A = SPECIES[a].label, B = SPECIES[b].label, r = RELATIONS[a][b];
  if (r >= 15) return rng([`The ${A} and the ${B} have grown inseparable — a bond that steadies the whole station.`, `Where the ${A} share a wing with the ${B}, there is warmth; old kinship holds against the cold.`]);
  if (r >= 4) return rng([`The ${A} speak warmly of the ${B}; the corridors run easier for it.`, `A quiet harmony settles between the ${A} and the ${B}.`]);
  if (r <= -15) return rng([`The ${A} and the ${B} despise one another — keep them apart, or there will be blood on the deck.`, `Old hatred simmers between the ${A} and the ${B}; the station holds its breath.`]);
  if (r <= -8) return rng([`The ${A} mistrust the ${B}; tempers fray whenever they cross paths.`, `The ${A} have no love for the ${B}, and make little secret of it.`]);
  return rng([`The ${A} regard the ${B} with cool indifference.`, `Between the ${A} and the ${B}, nothing yet stirs.`]);
}

function godLine(w: World, here: Species[]): string | null {
  if (!here.length) return null;
  const sp = rng(here), m = moodOf(w, sp), L = SPECIES[sp].label, g = GODS[sp];
  if (m < 0) return null;
  const stance = m >= 60 ? `is pleased, and its gifts may yet follow` : m <= 40 ? `grows wrathful; a reckoning draws near` : `watches in silence, unmoved`;
  const feel = m >= 60 ? `content` : m <= 40 ? `wretched and restless` : `uneasy`;
  return `${g} drifts beyond the hull. The ${L} are ${feel}; their god ${stance}.`;
}

function beaconLine(w: World): string {
  const n = beaconCharged(w);
  if (n >= 5) return `The Sector Beacon blazes complete — the galaxy itself will remember this station.`;
  if (n > 0) return rng([`The Sector Beacon hums at ${n} of 5; each charged module is a promise kept.`, `${n} of the five signatures sing into the dark. The Beacon stirs toward waking.`]);
  return rng([`The Sector Beacon stands silent — no race has yet lit its signature module.`, `The dark presses close, and the Beacon waits, unlit.`]);
}

function ambient(): string {
  return rng([
    `A century turns. The station endures — a candle held against a vast cold.`,
    `Out past the lights, the void keeps its long, patient silence.`,
    `Generations come and go; the hull groans, the lamps hold, the work goes on.`,
    `Another hundred years are etched into the station's bones.`,
    `The chronicle lengthens. So few stations last this long.`,
  ]);
}

function chronicle(w: World): string {
  const here = present(w);
  const kind = rng(["rel", "god", "beacon", "god", "rel", "ambient"]); // weight god + rel
  let line: string | null = null;
  if (kind === "rel") line = relationLine(here);
  else if (kind === "god") line = godLine(w, here);
  else if (kind === "beacon") line = beaconLine(w);
  if (!line) line = ambient();
  return `Year ${currentYear(w)} — ${line}`;
}

export function storySystem(w: World, dt: number): void {
  // welcome any newly-present race first (one per call, immediate)
  for (const sp of present(w)) {
    if (!w.welcomed.includes(sp)) { w.welcomed.push(sp); w.story = welcome(w, sp); return; }
  }
  // then a periodic chronicle entry (~every 100 years)
  w.storyTimer += dt;
  if (w.storyTimer >= STORY_INTERVAL) { w.storyTimer -= STORY_INTERVAL; w.story = chronicle(w); }
}
