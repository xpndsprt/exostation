import { Encounter, World } from "./types";
import { RELATIONS } from "./relations";
import { SPECIES } from "./species";
import { injure } from "./medical";

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
        const avg = (RELATIONS[a.species][b.species] + RELATIONS[b.species][a.species]) / 2;
        const kind = avg <= -7 ? "conflict" : avg >= 7 ? "bond" : null;
        if (!kind) continue;
        pairs.push({ kind, aId: a.id, bId: b.id, aSpecies: a.species, bSpecies: b.species, cell });
      }
  }
  if (pairs.length === 0) return null;
  return pairs[Math.floor(Math.random() * pairs.length)];
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
  const A = SPECIES[enc.aSpecies].label, B = SPECIES[enc.bSpecies].label;
  if (enc.kind === "conflict") {
    return {
      title: `Clash: ${A} vs ${B}`,
      body: `A ${A} and a ${B} are squared off in the same compartment, tempers flaring. How do you handle it?`,
    };
  }
  return {
    title: `Bonding: ${A} & ${B}`,
    body: `A ${A} and a ${B} are hitting it off in the same compartment. Do you lean into the good mood?`,
  };
}

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
}
