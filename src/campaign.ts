// The campaign spine — a story told in dialog boxes, fired once at milestones from
// arrival to the Sector Beacon. The Emperor ("COMMAND") narrates the throughline;
// the five Beacon signatures are spoken by the species that raise them (their
// portrait shows in the dialog). Pure narration: each beat is dismissed with a
// single button and changes nothing in the sim. Fired ids persist on the World so
// the arc survives save/load and never repeats.
import { Species, World } from "./types";
import { SPECIES } from "./species";
import { beaconCharged, BEACON_SPECIES } from "./beacon";

export interface Beat {
  id: string;
  when: (w: World) => boolean; // fires the first tick this is true
  speaker: string; // shown above the line
  species?: Species; // if set, the dialog shows this species' portrait (else a COMMAND emblem)
  title: string;
  body: (w: World) => string;
}

function residents(w: World): number {
  let n = 0;
  for (const id in w.agents) if (w.agents[id].alive && !w.agents[id].guest) n++;
  return n;
}
function breathable(w: World): boolean {
  return Object.values(w.rooms).some((r) => r.enclosed && r.gas !== "none" && r.gas !== "mixed");
}
function built(w: World, kind: string): boolean {
  for (const id in w.structures) if (w.structures[id].kind === kind) return true;
  return false;
}

// Voice lines for each Beacon signature, spoken by the species that raises it.
const SIGNATURE: Record<string, string> = {
  cmdhub: "The Command Hub stands. Humanity lends the Beacon its voice — order carved out of the long silence.",
  tradenexus: "The Trade Nexus opens. We Drenn will sell the whole sector its way home — at a fair margin, naturally.",
  autoforge: "The Auto-Forge breathes. We Thol give the Beacon hands that never tire and never err.",
  bloomgarden: "The Bloom Garden flowers. We Vry'l offer the Beacon life itself — and the scent of a living world.",
  orerefinery: "The Ore Refinery roars to life. We Korro feed the Beacon raw strength, torn from the deep rock.",
};

// The arc, in order. campaignSystem fires the first unfired beat whose `when` is
// true, one at a time. objectiveIx counts objectives already cleared.
export const BEATS: Beat[] = [
  {
    id: "prologue",
    when: () => true,
    speaker: "COMMAND",
    title: "ASSIGNMENT",
    body: () =>
      "Commander. These are coordinates in the deep dark — empty vacuum, a fabrication charter, and my expectations. " +
      "Build a station here from nothing: seal a hull, power it, make it breathe, and crew it. " +
      "But hear the true purpose — the Sector Beacon. Five peoples, five signatures, one signal to call the scattered home. " +
      "Raise it from the void, and your name enters the record. Fail, and the void keeps you.",
  },
  {
    id: "first_air",
    when: (w) => breathable(w),
    speaker: "COMMAND",
    title: "FIRST BREATH",
    body: () =>
      "Air holds. A sealed room, a generator that runs — the simplest miracle, and the one most claims die without. " +
      "Now fill it with hands.",
  },
  {
    id: "first_crew",
    when: (w) => residents(w) >= 1,
    speaker: "COMMAND",
    title: "A CREW OF ONE",
    body: () => "Someone answered the call across all that dark. One body is not a station, Commander — it is a start. Grow it, and keep them alive.",
  },
  {
    id: "act_grow",
    when: (w) => w.objectiveIx >= 1,
    speaker: "COMMAND",
    title: "IT LIVES",
    body: () =>
      "A working crew, and the lights still on. The sector notices stations that outlast their first month. " +
      "Now make it pay — I did not fund a charity.",
  },
  {
    id: "act_bank",
    when: (w) => w.objectiveIx >= 2,
    speaker: "COMMAND",
    title: "SOLVENT",
    body: () =>
      "Coin in the coffers. A station that earns is a station that lasts. But credits are not the mission. " +
      "The Beacon answers to many peoples — go and gather them under one hull.",
  },
  {
    id: "act_diverse",
    when: (w) => w.objectiveIx >= 3,
    speaker: "COMMAND",
    title: "THE GATHERING",
    body: () =>
      "Bloodlines the old empires swore could never share a deck — and you have them. Now each must raise its signature: " +
      "the Command Hub, the Trade Nexus, the Auto-Forge, the Bloom Garden, the Ore Refinery. " +
      "Light all five and the Beacon wakes. Build them, Commander.",
  },
  // The five signatures — each spoken by the species that raises it (portrait shown).
  ...Object.keys(BEACON_SPECIES).map((kind): Beat => ({
    id: `sig_${kind}`,
    when: (w) => built(w, kind),
    speaker: SPECIES[BEACON_SPECIES[kind] as Species].label.toUpperCase(),
    species: BEACON_SPECIES[kind] as Species,
    title: "A SIGNATURE RISES",
    body: () => SIGNATURE[kind] ?? "Another signature joins the Beacon's song.",
  })),
  {
    id: "beacon_mid",
    when: (w) => beaconCharged(w) >= 3,
    speaker: "COMMAND",
    title: "THE BEACON STIRS",
    body: () => "Three of five signatures sing into the dark. Across the sector, old antennae twitch toward your signal. Finish it, Commander.",
  },
  {
    id: "finale",
    when: (w) => beaconCharged(w) >= 5,
    speaker: "COMMAND",
    title: "THE BEACON WAKES",
    body: () =>
      "Five signatures. The Beacon blazes complete, and a sector that had forgotten how to hope turns its face toward your station. " +
      "You were sent to build a light in the dark. You did. I do not say this often: well done, Commander.",
  },
];

const BY_ID = new Map(BEATS.map((b) => [b.id, b]));
export function getBeat(id: string): Beat | undefined {
  return BY_ID.get(id);
}

// Fire the next eligible transmission (one at a time — holds while one is pending).
export function campaignSystem(w: World, _dt: number): void {
  if (w.storyBeat) return; // a transmission is already on screen, awaiting the player
  for (const b of BEATS) {
    if (w.firedBeats.includes(b.id)) continue;
    if (b.when(w)) {
      w.storyBeat = b.id;
      w.firedBeats.push(b.id);
      return;
    }
  }
}

// Dismiss the current transmission.
export function resolveBeat(w: World): void {
  w.storyBeat = null;
}
