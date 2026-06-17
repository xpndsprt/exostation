import { Encounter, Species, World } from "./types";
import { effRelation } from "./relations";
import { SPECIES } from "./species";
import { injure } from "./medical";
import { maybeFallInLove } from "./romance";

// Flavor library for the encounter dialog. {A}/{B} are filled with species names.
// A line applies to a pair when: it names both species (unordered), names one
// species (any partner), or names neither (generic). Pair/single lines are
// oriented so {A} is the keyed species. ~50 lines so encounters stay fresh and
// each species pairing reads distinctly. (Mechanics/choices are separate.)
interface Flavor {
  kind: "conflict" | "bond";
  title: string;
  body: string;
  a?: Species;
  b?: Species;
}
const FLAVORS: Flavor[] = [
  // ---- conflict: generic (any rival pair) ----
  { kind: "conflict", title: "Sparks fly", body: "A {A} and a {B} are nose-to-nose in the same compartment, voices rising." },
  { kind: "conflict", title: "Bad blood", body: "The {A} shoved past the {B} one time too many. It's about to boil over." },
  { kind: "conflict", title: "Words exchanged", body: "A {A} muttered something the {B} wasn't meant to hear — now they're squaring up." },
  { kind: "conflict", title: "Turf war", body: "A {A} and a {B} both want the same workspace, and neither will back down." },
  { kind: "conflict", title: "Short fuse", body: "Tempers are fraying — the {A} and the {B} have been stuck together too long." },
  { kind: "conflict", title: "Old grudge", body: "The {A} hasn't forgotten something the {B} did. This could turn physical." },
  { kind: "conflict", title: "Standoff", body: "A {A} and a {B} are locked in a glare across the deck." },
  { kind: "conflict", title: "Pushing it", body: "The {B} keeps needling the {A}. One more jab and fists fly." },
  { kind: "conflict", title: "Cabin fever", body: "Cooped up together, a {A} and a {B} are spoiling for a fight." },
  { kind: "conflict", title: "Cold shoulder", body: "Frosty silence between a {A} and a {B} just cracked into open hostility." },
  { kind: "conflict", title: "Last straw", body: "A spilled ration, a sharp word — the {A} and the {B} are done being polite." },
  { kind: "conflict", title: "Friction", body: "A {A} and a {B} keep getting in each other's way, and patience has run out." },
  { kind: "conflict", title: "Bristling", body: "A {A} and a {B} circle each other, daring the other to start something." },
  // ---- conflict: pair-specific ----
  { kind: "conflict", a: "human", b: "korro", title: "Ancient resentment", body: "The {A} eyes the {B} with open contempt — old prejudice runs deep, and the {B}'s fists are clenching." },
  { kind: "conflict", a: "human", b: "korro", title: "Same air, no peace", body: "Forced to share oxygen, the {A} and the {B} can barely stand the sight of each other." },
  { kind: "conflict", a: "korro", b: "human", title: "Heavy hands", body: "The {A} 'accidentally' knocked the {B} aside. Nobody thinks it was an accident." },
  { kind: "conflict", a: "human", b: "korro", title: "No ground given", body: "The {B} looms over the {A}, who refuses to step back. A bad mix in a small room." },
  { kind: "conflict", a: "vryl", b: "korro", title: "Trampled garden", body: "The {B} crushed something the {A} had carefully grown. The {A} is shaking — with rage, this time." },
  { kind: "conflict", a: "vryl", b: "korro", title: "Gentle no more", body: "Even the soft-spoken {A} has a limit, and the {B} just found it." },
  { kind: "conflict", a: "korro", b: "vryl", title: "Looming threat", body: "The {A}'s heavy presence terrifies and infuriates the {B} in equal measure." },
  { kind: "conflict", a: "korro", b: "thol", title: "Wary giants", body: "The {A} and the {B} size each other up — two strong bodies, no love lost." },
  { kind: "conflict", a: "korro", b: "thol", title: "No respect", body: "The {A} dismissed the {B}'s work with a sneer. The {B} does not take that lightly." },
  { kind: "conflict", a: "human", b: "thol", title: "Shallow grave", body: "The {A} can't quite let the old war go, and the {B}'s patience is thinning." },
  { kind: "conflict", a: "human", b: "thol", title: "Suspicion", body: "The {A} watches the {B} a little too closely. The {B} has noticed." },

  // ---- bond: generic (any friendly pair) ----
  { kind: "bond", title: "Easy company", body: "A {A} and a {B} are swapping stories and laughing in the same compartment." },
  { kind: "bond", title: "Kindred spirits", body: "A {A} and a {B} have found unexpected common ground." },
  { kind: "bond", title: "Shared shift", body: "Working side by side, a {A} and a {B} have built a quiet rapport." },
  { kind: "bond", title: "Good crew", body: "A {A} and a {B} are covering for each other like old hands." },
  { kind: "bond", title: "Morale boost", body: "Laughter from a {A} and a {B} is lifting the whole compartment." },
  { kind: "bond", title: "Fast friends", body: "A {A} and a {B} clicked instantly. Nice to see." },
  { kind: "bond", title: "Down time", body: "A {A} and a {B} are unwinding together after a long rotation." },
  { kind: "bond", title: "Earned trust", body: "A {A} trusts a {B} with the tricky jobs now — a good sign." },
  { kind: "bond", title: "Camaraderie", body: "A {A} and a {B} have each other's backs." },
  { kind: "bond", title: "Small kindness", body: "The {B} did the {A} a quiet favor, and it's warmed them both." },
  { kind: "bond", title: "Two of a kind", body: "A {A} and a {B} can't stop talking — they've a lot in common." },
  { kind: "bond", title: "Good rhythm", body: "A {A} and a {B} have fallen into an easy working rhythm." },
  { kind: "bond", title: "Shared meal", body: "A {A} and a {B} are sharing rations and trading jokes." },
  // ---- bond: pair-specific ----
  { kind: "bond", a: "human", b: "drenn", title: "Old partners", body: "The {A} and the {B} go way back — the easy banter of a long alliance." },
  { kind: "bond", a: "human", b: "drenn", title: "Best of friends", body: "The {B} has the {A} in stitches. These two are inseparable." },
  { kind: "bond", a: "human", b: "drenn", title: "Cooking a deal", body: "The {A} and the {B} are scheming up some scheme, grinning ear to ear." },
  { kind: "bond", a: "thol", b: "vryl", title: "Engineer & grower", body: "The {A} and the {B} are deep in a project — a rare, productive friendship." },
  { kind: "bond", a: "thol", b: "vryl", title: "Quiet understanding", body: "The stoic {A} and the gentle {B} share a wordless, easy bond." },
  { kind: "bond", a: "vryl", b: "thol", title: "Kin in spirit", body: "The {B} treats the {A} like family, shielding their work from harm." },
  // ---- bond: single-species (the universal traders) ----
  { kind: "bond", a: "drenn", title: "The diplomat", body: "The {A} is working the room, charming the {B} with effortless warmth." },
  { kind: "bond", a: "drenn", title: "Everybody's friend", body: "Within minutes the {A} has the {B} laughing and at ease." },
  { kind: "bond", a: "drenn", title: "Smooth talker", body: "The {A} flatters the {B} shamelessly — and it's working." },
  { kind: "bond", a: "drenn", title: "Glue of the crew", body: "Wherever the {A} goes, tension melts; the {B} is clearly won over." },
  { kind: "bond", a: "vorn", title: "Fuel & favors", body: "The {A} is talking shop with the {B}, all warmth and opportunity." },
  { kind: "bond", a: "vorn", title: "Merchant's charm", body: "The {A} has a deal, a smile, and the {B}'s full attention." },
  { kind: "bond", a: "vorn", title: "Methane handshake", body: "The {A} and the {B} seal a friendly little bargain." },
  { kind: "bond", a: "vorn", title: "Good for business", body: "The {A} cultivates the {B} like a prized contact — and genuinely likes them." },
];

function flavorMatches(f: Flavor, x: Species, y: Species): boolean {
  if (f.a && f.b) return (f.a === x && f.b === y) || (f.a === y && f.b === x);
  if (f.a) return f.a === x || f.a === y;
  return true;
}
function flavorPool(kind: "conflict" | "bond", x: Species, y: Species): Flavor[] {
  return FLAVORS.filter((f) => f.kind === kind && flavorMatches(f, x, y));
}

// Random social encounters: now and then two crew/guests sharing a cell have a
// moment — a clash (if they dislike each other) or a bond (if they get on). The
// game pauses and the player picks a response; a bad call can start a fight and
// leave someone wounded (→ Med Bay or they bleed out). See ui.ts for the dialog.
const FIRST = 55; // seconds before the first possible encounter
const INTERVAL = 55; // seconds between encounter rolls
const RETRY = 8; // if no eligible pair, try again sooner

export function encountersSystem(w: World, dt: number): void {
  if (w.encounter) return; // one at a time — wait for the player's choice
  if (w.tick < FIRST * 10) return;
  w.encounterTimer += dt;
  if (w.encounterTimer < INTERVAL) return;

  const enc = findEncounter(w);
  if (enc) {
    w.encounter = enc;
    w.encounterTimer = 0;
  } else {
    w.encounterTimer = INTERVAL - RETRY; // nobody co-located yet; check again soon
  }
}

// Find two alive agents of different species in the same cell with a clearly
// positive or negative relationship.
function findEncounter(w: World): Encounter | null {
  const byCell = new Map<number, number[]>();
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    (byCell.get(a.cell) ?? byCell.set(a.cell, []).get(a.cell)!).push(+id);
  }
  const pairs: Encounter[] = [];
  for (const [cell, ids] of byCell) {
    for (let i = 0; i < ids.length; i++)
      for (let j = i + 1; j < ids.length; j++) {
        const a = w.agents[ids[i]], b = w.agents[ids[j]];
        if (a.species === b.species) continue;
        const avg = (effRelation(w, a.species, b.species) + effRelation(w, b.species, a.species)) / 2;
        const kind = avg <= -7 ? "conflict" : avg >= 7 ? "bond" : null;
        if (!kind) continue;
        pairs.push({ kind, aId: a.id, bId: b.id, aSpecies: a.species, bSpecies: b.species, cell });
      }
  }
  if (pairs.length === 0) return null;
  const pick = pairs[Math.floor(Math.random() * pairs.length)];
  const pool = flavorPool(pick.kind, pick.aSpecies, pick.bSpecies);
  pick.variant = pool.length ? Math.floor(Math.random() * pool.length) : 0; // chosen once, stable text
  return pick;
}

export interface EncounterChoice {
  label: string;
  hint: string; // a short risk/reward tell shown under the button
}

// The player-facing choices for the dialog (labels filled with the species names).
export function encounterChoices(enc: Encounter): EncounterChoice[] {
  if (enc.kind === "conflict") {
    return [
      { label: "Defuse it calmly", hint: "Usually works — small morale lift. Slight risk it fails." },
      { label: "Discipline them both", hint: "No fight, but both resent it (morale −)." },
      { label: "Let them settle it", hint: "Gamble: they may brawl and get hurt — or earn mutual respect." },
    ];
  }
  return [
    { label: "Encourage the friendship", hint: "Both cheer up; reputation rises." },
    { label: "Put them on a job together", hint: "A modest morale lift and a little extra income." },
    { label: "Throw a small party (¢60)", hint: "Lifts the WHOLE crew's morale if you can afford it." },
  ];
}

export function encounterText(enc: Encounter): { title: string; body: string } {
  const x = enc.aSpecies, y = enc.bSpecies;
  const pool = flavorPool(enc.kind, x, y);
  const f = pool.length ? pool[(enc.variant ?? 0) % pool.length] : undefined;
  // orient {A}/{B}: a pair/single-species line keys {A} to its named species
  let aSp = x, bSp = y;
  if (f?.a && f.b) {
    aSp = f.a;
    bSp = f.b;
  } else if (f?.a) {
    aSp = f.a;
    bSp = f.a === x ? y : x;
  }
  const A = SPECIES[aSp].label, B = SPECIES[bSp].label;
  const fill = (s: string) => s.replace(/\{A\}/g, A).replace(/\{B\}/g, B);
  if (!f) {
    return enc.kind === "conflict"
      ? { title: `Clash: ${A} vs ${B}`, body: `A ${A} and a ${B} are squared off, tempers flaring.` }
      : { title: `Bonding: ${A} & ${B}`, body: `A ${A} and a ${B} are hitting it off.` };
  }
  return { title: fill(f.title), body: fill(f.body) };
}

// (encounter pair-finding + flavor selection above; outcome resolution below)
function bump(w: World, id: number, d: number): void {
  const a = w.agents[id];
  if (a && a.alive) a.mood = Math.max(0, Math.min(100, a.mood + d));
}
function bumpRep(w: World, sp: keyof World["reputation"], d: number): void {
  const cur = w.reputation[sp] ?? 50;
  w.reputation[sp] = Math.max(0, Math.min(100, cur + d));
}
function allCrewMood(w: World, d: number): void {
  for (const id in w.agents) bump(w, +id, d);
}

// Apply the chosen response, then clear the pending encounter. Returns a short
// outcome line for the toast/dialog. Resolution is player-driven (off the sim
// tick), so Math.random for variety is fine — nothing here is persisted.
export function resolveEncounter(w: World, choice: number): string {
  const enc = w.encounter;
  w.encounter = null;
  if (!enc) return "";
  const A = SPECIES[enc.aSpecies].label, B = SPECIES[enc.bSpecies].label;

  if (enc.kind === "conflict") {
    if (choice === 0) {
      // defuse: usually works, small chance it goes wrong
      if (Math.random() < 0.8) {
        bump(w, enc.aId, 6);
        bump(w, enc.bId, 6);
        return `You talked the ${A} and ${B} down. Morale lifts.`;
      }
      injure(w, Math.random() < 0.5 ? enc.aId : enc.bId);
      return `It went sideways — a shove landed and someone's hurt. Get them to a Med Bay.`;
    }
    if (choice === 1) {
      // discipline: no fight, both lose morale, tension drained
      bump(w, enc.aId, -7);
      bump(w, enc.bId, -7);
      const a = w.agents[enc.aId], b = w.agents[enc.bId];
      if (a) a.tension = 0;
      if (b) b.tension = 0;
      return `You came down hard on both. No blood — but they're sullen.`;
    }
    // let them settle it: high brawl risk
    if (Math.random() < 0.55) {
      injure(w, enc.aId);
      injure(w, enc.bId);
      return `It turned into a brawl — both the ${A} and ${B} are wounded!`;
    }
    bump(w, enc.aId, 9);
    bump(w, enc.bId, 9);
    return `They squared up, then backed down with new respect. Morale up.`;
  }

  // bond
  const bondMsg = (() => {
    if (choice === 0) {
      bump(w, enc.aId, 10);
      bump(w, enc.bId, 10);
      bumpRep(w, enc.aSpecies, 4);
      bumpRep(w, enc.bSpecies, 4);
      return `The ${A} and ${B} are firm friends now — reputation rises.`;
    }
    if (choice === 1) {
      bump(w, enc.aId, 5);
      bump(w, enc.bId, 5);
      w.credits += 40;
      return `They knuckled down together — a tidy ¢40 of extra work.`;
    }
    // party
    if (w.credits >= 60) {
      w.credits -= 60;
      allCrewMood(w, 8);
      return `The whole station unwinds — morale up across the board.`;
    }
    bump(w, enc.aId, 5);
    bump(w, enc.bId, 5);
    return `Couldn't fund a party, but the ${A} and ${B} enjoy the moment.`;
  })();
  // very rarely, a bond becomes something more — encouraging it helps the odds
  const sparks = maybeFallInLove(w, enc.aId, enc.bId, choice === 0);
  return sparks ? `${bondMsg} And something deeper kindles between them…` : bondMsg;
}
