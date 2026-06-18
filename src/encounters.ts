import { Encounter, Species, World } from "./types";
import { effRelation } from "./relations";
import { SPECIES } from "./species";
import { STRUCTURES } from "./structures";
import { injure } from "./medical";
import { maybeFallInLove } from "./romance";

// ---- "deal" scenarios: two friendly crew bring you a proposal about real station
// life. `c` = net credits if you back it (negative = it costs you; positive = it
// pays). Backing it lifts both their moods + reputation; refusing sours them. ----
interface Deal { title: string; body: string; c: number; }
const DEALS: Deal[] = [
  { title: "Lounge upgrade", body: "A {A} and a {B} want to chip in for a proper sound system in the Lounge — they'll cover half if you cover the rest.", c: -70 },
  { title: "Import a delicacy", body: "The {A} and the {B} miss home cooking and ask you to fund a one-off delicacy shipment on the next trader.", c: -90 },
  { title: "Side hustle", body: "A {A} and a {B} have been carving trinkets on their off-hours and want to sell them to docking crews — they'll cut you in.", c: 110 },
  { title: "Salvage tip", body: "The {A} and the {B} know coordinates for a drifting cargo pod and want a drone run to grab it — could pay off.", c: 90 },
  { title: "Card night", body: "A {A} and a {B} want to run a station card night in the Lounge — a small float for prizes, big morale.", c: -45 },
  { title: "Supply contract", body: "The {A} and the {B} brokered a little supply contract with a passing freighter — sign off and it pays out.", c: 130 },
  { title: "Corridor garden", body: "A {A} and a {B} want to turn a dead-end corridor into a planted nook — needs materials.", c: -60 },
  { title: "Brew operation", body: "The {A} and the {B} propose a (totally above-board) fermenting setup off a spare Bio Vat — sells well to guests.", c: 100 },
  { title: "Feast day", body: "A {A} and a {B} want to throw a feast for the whole crew — costly, but everyone would love it.", c: -120 },
  { title: "Barter market", body: "The {A} and the {B} want to run a weekly barter market by the docks — takes a little seed money.", c: -50 },
  { title: "Favor for a trader", body: "A {A} and a {B} can do a quick favor for a docking captain who's offering a tidy tip.", c: 80 },
  { title: "Commission a mural", body: "The {A} and the {B} want to commission a mural for the mess — pure morale, costs a bit.", c: -55 },
  { title: "Tournament", body: "A {A} and a {B} want to organize a low-grav tournament in the Lounge — buy-in for prizes.", c: -65 },
  { title: "Resale flip", body: "The {A} and the {B} spotted underpriced ore at the last dock and want a small float to flip it.", c: 95 },
  { title: "Cultural exchange", body: "A {A} and a {B} want to host a cultural exchange evening — costs a little, warms relations.", c: -40 },
  { title: "Repair side-gig", body: "The {A} and the {B} want to offer repairs to passing ships for cash — approve it and it pays.", c: 120 },
];

// ---- "complaint" scenarios: one crew member gripes that a specific module ({M})
// is acting up. Authorizing the fix costs `fix` credits and services the module;
// brushing it off sours them and risks the module actually breaking. ----
interface Complaint { title: string; body: string; fix: number; }
const COMPLAINTS: Complaint[] = [
  { title: "Rattling module", body: "A {A} says the {M} has rattled all shift and it's setting their teeth on edge. Fix it?", fix: 50 },
  { title: "Burnt-wiring smell", body: "A {A} swears the {M} smells of burnt wiring and won't go near it until it's checked.", fix: 60 },
  { title: "Tripping breaker", body: "A {A} reports the {M} keeps tripping the breaker — it'll fail if it isn't serviced.", fix: 55 },
  { title: "Running hot", body: "A {A} complains the {M} runs far too hot and the whole wing is sweltering.", fix: 50 },
  { title: "Leaky seal", body: "A {A} found a seep around the {M} and wants it sealed before it gets worse.", fix: 65 },
  { title: "Filthy module", body: "A {A} refuses to work the {M} until someone cleans the grime caked into it.", fix: 40 },
  { title: "Too loud to sleep", body: "A {A} can't sleep for the noise the {M} throws off all night. Service it?", fix: 45 },
  { title: "Jamming up", body: "A {A} says the {M} jams every other cycle and they're done fighting it.", fix: 55 },
  { title: "Sparking", body: "A {A} saw the {M} throw sparks and backed away — wants it looked at now.", fix: 70 },
  { title: "Maddening hum", body: "A {A} is at their wit's end over the pitch the {M} hums at. Tune it?", fix: 45 },
  { title: "Shaking the deck", body: "A {A} says the {M} vibrates the whole deck plate and bolts are working loose.", fix: 60 },
  { title: "Glitching out", body: "A {A} reports the {M} keeps glitching mid-task and ruining their work.", fix: 55 },
  { title: "Overdue service", body: "A {A} points out the {M} is long overdue for service and it shows.", fix: 50 },
  { title: "Flickering the lights", body: "A {A} says the {M} flickers the lights every time it kicks in.", fix: 50 },
  { title: "Cramped around it", body: "A {A} grumbles the {M} is jammed into too tight a space to work safely.", fix: 40 },
  { title: "Coolant stink", body: "A {A} says the {M} reeks of coolant and gives them a headache by shift's end.", fix: 60 },
];

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
        // a friendly pair sometimes brings a proposal (a "deal") instead of a chat
        const k: Encounter["kind"] = kind === "bond" && Math.random() < 0.45 ? "deal" : kind;
        pairs.push({ kind: k, aId: a.id, bId: b.id, aSpecies: a.species, bSpecies: b.species, cell });
      }
  }
  // a lone crew member can also gripe that a specific module is acting up
  const complaint = findComplaint(w);
  const opts = complaint ? [...pairs, complaint] : pairs;
  if (opts.length === 0) return null;
  const pick = opts[Math.floor(Math.random() * opts.length)];
  pick.variant = poolSize(pick) ? Math.floor(Math.random() * poolSize(pick)) : 0; // stable text
  return pick;
}

// Pick a living resident and a real module they can complain about (a worn one if
// any, else any powered machine). Returns a "complaint" encounter or null.
function findComplaint(w: World): Encounter | null {
  const crew = Object.values(w.agents).filter((a) => a.alive && !a.guest);
  if (crew.length === 0) return null;
  const mods = Object.values(w.structures).filter((s) => STRUCTURES[s.kind].draw > 0);
  if (mods.length === 0) return null;
  const worn = mods.filter((s) => s.condition < 60);
  const m = (worn.length ? worn : mods)[Math.floor(Math.random() * (worn.length ? worn.length : mods.length))];
  const a = crew[Math.floor(Math.random() * crew.length)];
  return { kind: "complaint", aId: a.id, bId: a.id, aSpecies: a.species, bSpecies: a.species, cell: a.cell, subjectId: m.id, subjectKind: m.kind };
}

// How many variants the encounter's text pool has (for picking a stable variant).
function poolSize(e: Encounter): number {
  if (e.kind === "deal") return DEALS.length;
  if (e.kind === "complaint") return COMPLAINTS.length;
  return flavorPool(e.kind, e.aSpecies, e.bSpecies).length;
}

export interface EncounterChoice {
  label: string;
  hint: string; // a short risk/reward tell shown under the button
}

// The player-facing choices for the dialog (labels filled with the species names).
export function encounterChoices(enc: Encounter): EncounterChoice[] {
  if (enc.kind === "deal") {
    const d = DEALS[(enc.variant ?? 0) % DEALS.length];
    return [
      d.c < 0
        ? { label: `Back it (−¢${-d.c})`, hint: "Both cheer up and reputation rises." }
        : { label: `Approve it (earns ¢${d.c})`, hint: "Both happy — and it pays out." },
      { label: "Turn them down", hint: "They're let down — morale & reputation dip." },
    ];
  }
  if (enc.kind === "complaint") {
    const c = COMPLAINTS[(enc.variant ?? 0) % COMPLAINTS.length];
    return [
      { label: `Authorize repair (−¢${c.fix})`, hint: "Services the module; they're relieved." },
      { label: "Brush it off", hint: "Saves the credits, but they sour — and it may break." },
    ];
  }
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
  if (enc.kind === "deal") {
    const d = DEALS[(enc.variant ?? 0) % DEALS.length];
    const A = SPECIES[enc.aSpecies].label, B = SPECIES[enc.bSpecies].label;
    return { title: d.title, body: d.body.replace(/\{A\}/g, A).replace(/\{B\}/g, B) };
  }
  if (enc.kind === "complaint") {
    const c = COMPLAINTS[(enc.variant ?? 0) % COMPLAINTS.length];
    const A = SPECIES[enc.aSpecies].label;
    const M = enc.subjectKind ? STRUCTURES[enc.subjectKind].label : "module";
    return { title: c.title, body: c.body.replace(/\{A\}/g, A).replace(/\{M\}/g, M) };
  }
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

  if (enc.kind === "deal") {
    const d = DEALS[(enc.variant ?? 0) % DEALS.length];
    if (choice === 0) {
      if (d.c < 0 && w.credits < -d.c) {
        bump(w, enc.aId, -3); bump(w, enc.bId, -3);
        return `You couldn't fund the ${A} & ${B} venture — they're deflated.`;
      }
      w.credits += d.c;
      bump(w, enc.aId, 8); bump(w, enc.bId, 8);
      bumpRep(w, enc.aSpecies, 3); bumpRep(w, enc.bSpecies, 3);
      return d.c < 0
        ? `You backed the ${A} & ${B} (−¢${-d.c}). Morale and goodwill rise.`
        : `The ${A} & ${B} venture pays out (+¢${d.c}). Everyone's pleased.`;
    }
    bump(w, enc.aId, -6); bump(w, enc.bId, -6);
    bumpRep(w, enc.aSpecies, -3); bumpRep(w, enc.bSpecies, -3);
    return `You turned the ${A} and ${B} down. They're disheartened.`;
  }

  if (enc.kind === "complaint") {
    const c = COMPLAINTS[(enc.variant ?? 0) % COMPLAINTS.length];
    const m = enc.subjectId != null ? w.structures[enc.subjectId] : undefined;
    const M = enc.subjectKind ? STRUCTURES[enc.subjectKind].label : "module";
    if (choice === 0) {
      if (w.credits < c.fix) { bump(w, enc.aId, -4); return `No credits to service the ${M} — the ${A} is unimpressed.`; }
      w.credits -= c.fix;
      if (m) { m.condition = 100; m.faultT = 0; }
      bump(w, enc.aId, 6);
      return `You had the ${M} serviced (−¢${c.fix}). The ${A} is satisfied.`;
    }
    bump(w, enc.aId, -6);
    if (m && Math.random() < 0.4) { m.condition = 0; return `You brushed off the ${A} — and the ${M} broke down.`; }
    return `You brushed the ${A} off. They're sullen about the ${M}.`;
  }

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
