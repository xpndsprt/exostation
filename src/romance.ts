import { Couple, RomancePopup, Species, World } from "./types";
import { SPECIES } from "./species";
import { isUnlocked } from "./research";

// ---- Love & romance -----------------------------------------------------------
// Very rarely, when two crew of different species bond, they fall in love. A
// couple keeps a "calendar": love grows each day, but on days 5/15/25/35 they hit
// turbulence — a dice-roll (weighted by how in-love they are) decides whether they
// weather it or split. A thriving couple thaws relations between their two species
// (the whole station grows more cooperative) and the pair work 50% harder. If they
// breathe different gases, the midgame Implants tech lets them finally cohabit.

export const ROMANCE_DAY = 6; // seconds per relationship "day"
export const LOVE_START = 22; // love when a couple first forms
export const LOVE_PER_DAY = 6; // love gained each calm day
export const TRULY = 70; // love at/above which they are "truly in love"
export const FALL_CHANCE = 0.05; // base chance a bond becomes love (×2 if encouraged)
export const THAW_COUPLE = 12; // relation lift between the couple's own two species (×love)
export const THAW_GLOBAL = 3; // gentle lift to ALL species pairs while a couple thrives
export const WORK_BOOST = 1.5; // truly-in-love crew work +50%
export const TURBULENCE_DAYS = [5, 15, 25, 35];
const BREAKUP_MOOD = 16; // mood lost by each partner on a breakup

const SPLIST = Object.keys(SPECIES) as Species[];

// ~100 turbulence flavours — the spark of each day-5/15/25/35 crisis. {A}/{B} are
// the two partners' names. The dice (not the reason) decide the outcome; the
// reason is why the night got hard.
const REASONS: string[] = [
  "{A} forgot {B}'s hatching-day.",
  "{B} overheard {A} mocking their accent.",
  "A jealous ex of {A} docked on a passing freighter.",
  "{A} and {B} can't agree on whose quarters to share.",
  "{B}'s family sent a furious message about the match.",
  "{A} spent the whole rotation working and missed their evening.",
  "A rival started flirting with {B} at the Lounge.",
  "{A} let slip a secret {B} had told them in confidence.",
  "{B} thinks {A} is hiding something.",
  "{A} and {B} fought over a trivial ration swap.",
  "{B} caught {A} staring at someone else.",
  "{A}'s god is said to frown on cross-species unions.",
  "{B} wants to leave the station; {A} wants to stay.",
  "A cruel rumour about {A} reached {B}.",
  "{A} and {B} realised they want very different futures.",
  "{B} felt ignored during the last crisis.",
  "{A} made a promise they couldn't keep.",
  "Old prejudice between their peoples flared up in the mess hall.",
  "{B}'s pride was wounded by {A}'s offhand joke.",
  "{A} drank too much of the Vorn's methane brandy.",
  "{B} accused {A} of caring more about work than them.",
  "A long, exhausting double-shift left them snapping at each other.",
  "{A} wouldn't apologise; {B} wouldn't let it go.",
  "{B} found out {A} had been writing to someone back home.",
  "Their friends keep insisting it will never last.",
  "{A} got a transfer offer to a richer station.",
  "{B} can't stand {A}'s messy bunk.",
  "{A} embarrassed {B} in front of the whole crew.",
  "A misunderstanding over a gift cut deep.",
  "{B} wants commitment; {A} wants to take it slow.",
  "{A} kept score of every little slight.",
  "{B}'s health scare made everything feel fragile.",
  "{A} and {B} argued about money — again.",
  "Someone whispered that {A} is only using {B}.",
  "{B} missed the anniversary {A} had planned.",
  "{A} retreated into silence for days.",
  "{B} flirted back, just to make {A} jealous.",
  "Their species' diplomats publicly disapproved of the match.",
  "{A} compared {B} unfavourably to an old flame.",
  "{B} felt {A} was ashamed to be seen with them.",
  "A cramped, tense wing wore their patience to nothing.",
  "{A} broke a thing {B} treasured.",
  "{B} kept bringing up the past.",
  "{A} wanted space; {B} took it as rejection.",
  "They both said things they didn't mean.",
  "{B} suspects {A} has cold feet.",
  "{A}'s work friends don't approve of {B}.",
  "A clumsy joke about {B}'s diet landed badly.",
  "{B} caught {A} in a small, pointless lie.",
  "{A} and {B} can't decide whose customs to follow.",
  "The distance of opposite shifts is pulling them apart.",
  "{B} felt taken for granted.",
  "{A} grew jealous of {B}'s easy charm with the guests.",
  "An old debt of {A}'s came due at the worst time.",
  "{B} wanted to meet {A}'s family; {A} refused.",
  "They argued about whether to have a clutch.",
  "{A} forgot an important promise mid-crisis.",
  "{B} thinks {A} has been distant since the last god-visit.",
  "A spiteful coworker tried to drive a wedge between them.",
  "{A} and {B} disagree about everything lately.",
  "{B}'s nerves frayed under a brownout night.",
  "{A} said their love was 'complicated'.",
  "{B} overheard {A} venting to a friend.",
  "Their peoples' ancient feud reared its head.",
  "{A} got cold and withdrawn under stress.",
  "{B} wanted reassurance {A} couldn't give.",
  "A near-death repair shook {A} badly.",
  "{B} felt second to {A}'s ambitions.",
  "{A} kept comparing their station to a better one.",
  "A jealous fit over nothing spiralled out of control.",
  "{B} accused {A} of changing.",
  "{A} and {B} both forgot to make time for each other.",
  "{B} found {A}'s constant teasing cruel today.",
  "{A} won't talk about the future.",
  "An ill-timed visit from {B}'s old partner stirred things up.",
  "{A} felt smothered; {B} felt abandoned.",
  "They clashed over how to spend their shared credits.",
  "{B} thinks {A} flirts too much at the docks.",
  "{A} let the romance go stale and {B} noticed.",
  "A petty argument about chores turned into a war.",
  "{B} wants to settle; {A} dreams of moving on.",
  "{A} hurt {B}'s feelings without even noticing.",
  "Gossip in the methane wing reached {B}.",
  "{A} and {B} are both too proud to make the first move.",
  "{B} felt like an afterthought during the festival.",
  "{A} kept a secret 'for {B}'s own good'.",
  "Exhaustion turned a small talk into a shouting match.",
  "{B} doubts {A} truly means it.",
  "{A}'s wandering eye finally got noticed.",
  "A culture clash over a meal turned bitter.",
  "{B} needed support; {A} wasn't there.",
  "{A} froze up when {B} asked where this was going.",
  "They realised they barely talk anymore.",
  "{B}'s family threatened to disown them over {A}.",
  "{A} grew jealous of how the crew adores {B}.",
  "An old letter resurfaced and reopened a wound.",
  "{A} and {B} let one bad day poison a good month.",
  "{B} wonders if {A} settled rather than chose.",
  "{A} took {B} for granted one time too many.",
];

// ---- couple lookups ----
export function coupleOf(w: World, agentId: number): Couple | undefined {
  return w.couples.find((c) => c.aId === agentId || c.bId === agentId);
}
export function mateOf(w: World, agentId: number): number {
  const c = coupleOf(w, agentId);
  if (!c) return -1;
  return c.aId === agentId ? c.bId : c.aId;
}
export function isTrulyInLove(w: World, agentId: number): boolean {
  const c = coupleOf(w, agentId);
  return !!c && c.love >= TRULY;
}
// Work multiplier for an agent (1.5 once truly in love, else 1).
export function loveBoost(w: World, agentId: number): number {
  return isTrulyInLove(w, agentId) ? WORK_BOOST : 1;
}

// Roll the rare "fall in love" chance for a just-bonded pair. Returns true (and
// queues the dialog) if they became a couple. Residents only — a guest would
// leave and orphan the couple at once.
export function maybeFallInLove(w: World, aId: number, bId: number, encouraged: boolean): boolean {
  const a = w.agents[aId], b = w.agents[bId];
  if (!a || !b || !a.alive || !b.alive) return false;
  if (a.guest || b.guest) return false;
  if (a.species === b.species) return false; // cross-species romance only
  if (a.mateId >= 0 || b.mateId >= 0) return false; // already spoken for
  if (Math.random() >= FALL_CHANCE * (encouraged ? 2 : 1)) return false;

  const c: Couple = {
    id: w.nextId++,
    aId, bId,
    aSpecies: a.species, bSpecies: b.species,
    love: LOVE_START, day: 0, dayAcc: 0, implanted: false,
  };
  w.couples.push(c);
  a.mateId = bId;
  b.mateId = aId;
  a.mood = Math.min(100, a.mood + 12);
  b.mood = Math.min(100, b.mood + 12);
  recomputeThaw(w);
  if (!w.romance) {
    w.romance = {
      kind: "fell", good: true, aSpecies: a.species, bSpecies: b.species,
      title: "Two hearts, against the odds",
      body: `${a.name} the ${SPECIES[a.species].label} and ${b.name} the ${SPECIES[b.species].label} have fallen for each other. ` +
        `Across the whole station, old hatreds soften — if their kinds can love, perhaps anyone can get along.`,
    };
  }
  return true;
}

export function romanceSystem(w: World, dt: number): void {
  if (!w.couples.length) {
    if (w.relThaw && Object.keys(w.relThaw).length) w.relThaw = {};
    return;
  }
  const remove: number[] = [];
  for (const c of w.couples) {
    const a = w.agents[c.aId], b = w.agents[c.bId];
    // a partner died or left → the romance ends
    if (!a || !b || !a.alive || !b.alive) {
      widow(w, a && a.alive ? a.id : -1, b && b.alive ? b.id : -1, c);
      remove.push(c.id);
      continue;
    }
    c.dayAcc += dt;
    let broke = false;
    while (c.dayAcc >= ROMANCE_DAY) {
      const nextDay = c.day + 1;
      if (TURBULENCE_DAYS.includes(nextDay)) {
        if (w.romance) { c.dayAcc = ROMANCE_DAY; break; } // wait for a free dialog slot
        c.day = nextDay;
        c.dayAcc -= ROMANCE_DAY;
        if (turbulence(w, c)) { broke = true; remove.push(c.id); break; }
      } else {
        c.day = nextDay;
        c.dayAcc -= ROMANCE_DAY;
        c.love = Math.min(100, c.love + LOVE_PER_DAY);
      }
    }
    if (broke) continue;
    // cross-gas lovers cohabit once Implants are researched and love is strong
    if (!c.implanted && c.love >= TRULY && !w.romance && crossGas(c) && isUnlocked(w, "implants")) {
      grantImplants(w, c, a.id, b.id);
    }
  }
  if (remove.length) w.couples = w.couples.filter((c) => !remove.includes(c.id));
  recomputeThaw(w);
}

const crossGas = (c: Couple): boolean => SPECIES[c.aSpecies].gas !== SPECIES[c.bSpecies].gas;

// A turbulence night: dice for each partner, weighted by their love. Returns true
// if the couple breaks up. Always queues a dialog.
function turbulence(w: World, c: Couple): boolean {
  const a = w.agents[c.aId], b = w.agents[c.bId];
  const reason = fill(REASONS[Math.floor(Math.random() * REASONS.length)], a?.name ?? "One", b?.name ?? "the other");
  const stayP = Math.max(0.35, Math.min(0.95, 0.45 + c.love / 160));
  const r1 = Math.random() < stayP;
  const r2 = Math.random() < stayP;
  const names = `${a?.name ?? "?"} & ${b?.name ?? "?"}`;
  if (r1 && r2) {
    c.love = Math.min(100, c.love + 10);
    queue(w, c, "turbulence", true, `Rough night for ${names}`,
      `${reason} They argued into the night — but came through it closer than before. (Day ${c.day}; love is strong.)`);
    return false;
  }
  if (!r1 && !r2) {
    breakupMood(w, c);
    queue(w, c, "breakup", false, `${names} have parted`,
      `${reason} This time it was too much. They've called it off — and the goodwill their love had spread begins to cool.`);
    clearMates(w, c);
    return true;
  }
  c.love = Math.max(0, c.love - 18);
  if (c.love <= 0) {
    breakupMood(w, c);
    queue(w, c, "breakup", false, `${names} have parted`,
      `${reason} The love had already worn thin, and tonight it finally gave out.`);
    clearMates(w, c);
    return true;
  }
  queue(w, c, "turbulence", false, `Rough night for ${names}`,
    `${reason} They didn't split — but it left a mark. (Day ${c.day}; their love took a hit.)`);
  return false;
}

function grantImplants(w: World, c: Couple, aId: number, bId: number): void {
  const a = w.agents[aId], b = w.agents[bId];
  if (!a || !b) return;
  a.implantGas = SPECIES[b.species].gas;
  b.implantGas = SPECIES[a.species].gas;
  c.implanted = true;
  queue(w, c, "implant", true, `${a.name} & ${b.name} can finally share a home`,
    `Your Implant program fits ${a.name} (${SPECIES[a.species].label}) and ${b.name} (${SPECIES[b.species].label}) with breathing implants — ` +
    `each can now survive in the other's air. The cross-gas lovers can live and work side by side at last.`);
}

// One partner died/left: end the couple, dent the survivor, queue a note.
function widow(w: World, survivorId: number, otherId: number, c: Couple): void {
  const s = w.agents[survivorId] ?? w.agents[otherId];
  clearMates(w, c);
  if (s && s.alive) s.mood = Math.max(0, s.mood - BREAKUP_MOOD);
  queue(w, c, "breakup", false, "A love lost",
    `${SPECIES[c.aSpecies].label} and ${SPECIES[c.bSpecies].label} hearts that had beaten together are parted — one of the pair is gone.`);
}

function breakupMood(w: World, c: Couple): void {
  for (const id of [c.aId, c.bId]) {
    const a = w.agents[id];
    if (a && a.alive) a.mood = Math.max(0, a.mood - BREAKUP_MOOD);
  }
}
function clearMates(w: World, c: Couple): void {
  for (const id of [c.aId, c.bId]) {
    const a = w.agents[id];
    if (a && a.mateId === (id === c.aId ? c.bId : c.aId)) a.mateId = -1;
    // implants are theirs to keep — clearing implantGas would suffocate them
  }
}

// Set a romance dialog if the slot is free (one at a time).
function queue(w: World, c: Couple, kind: RomancePopup["kind"], good: boolean, title: string, body: string): void {
  if (w.romance) return;
  w.romance = { kind, good, title, body, aSpecies: c.aSpecies, bSpecies: c.bSpecies };
}

const fill = (s: string, a: string, b: string): string => s.replace(/\{A\}/g, a).replace(/\{B\}/g, b);

// Rebuild the per-world relation thaw from active couples: a big lift between each
// couple's own two species (scaled by love) plus a gentle lift to every pair while
// any love thrives aboard.
function recomputeThaw(w: World): void {
  const t: Partial<Record<Species, Partial<Record<Species, number>>>> = {};
  const add = (x: Species, y: Species, v: number) => {
    (t[x] ??= {})[y] = (t[x]![y] ?? 0) + v;
  };
  if (w.couples.length) {
    for (const x of SPLIST) for (const y of SPLIST) if (x !== y) add(x, y, THAW_GLOBAL);
    for (const c of w.couples) {
      const v = THAW_COUPLE * (c.love / 100);
      add(c.aSpecies, c.bSpecies, v);
      add(c.bSpecies, c.aSpecies, v);
    }
  }
  w.relThaw = t;
}
