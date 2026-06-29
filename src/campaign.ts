// The campaign spine — a story told in COMMAND transmissions (the Emperor) that
// thread the station from arrival to the Sector Beacon. Each beat is a paused
// dialog box that fires once when its trigger condition is met; fired ids are
// saved on the World so the arc survives save/load and never repeats. Choices set
// light flags that colour later transmissions (see storyFlags). Purely a narration
// layer over events the sim already produces — it never changes the simulation.
import { World } from "./types";
import { beaconCharged } from "./beacon";

export interface BeatChoice {
  label: string;
  hint?: string; // small sub-text under the choice
  flag?: string; // sets w.storyFlags[flag] = 1 when picked
  credits?: number; // +/- credits applied when picked
  reply?: string; // COMMAND's curt reply, surfaced as a toast
}

export interface Beat {
  id: string;
  when: (w: World) => boolean; // fires the first tick this is true
  speaker: string;
  title: string;
  body: (w: World) => string;
  choices?: BeatChoice[];
}

function residents(w: World): number {
  let n = 0;
  for (const id in w.agents) if (w.agents[id].alive && !w.agents[id].guest) n++;
  return n;
}
function breathable(w: World): boolean {
  return Object.values(w.rooms).some((r) => r.enclosed && r.gas !== "none" && r.gas !== "mixed");
}
const merc = (w: World): boolean => !!w.storyFlags.merc;

// The arc, in order. campaignSystem fires the first unfired beat whose `when` is
// true, one at a time. objectiveIx counts objectives already cleared
// (grow → bank → diverse → beacon), so it doubles as chapter progress.
export const BEATS: Beat[] = [
  {
    id: "prologue",
    when: () => true, // the opening transmission
    speaker: "COMMAND",
    title: "ASSIGNMENT",
    body: () =>
      "Commander. These are coordinates in the deep dark — empty vacuum, a fabrication charter, and my expectations. " +
      "Build a station here from nothing: seal a hull, power it, make it breathe, and crew it. " +
      "But hear the true purpose — the Sector Beacon. Five peoples, five signatures, one signal to call the scattered home. " +
      "Raise it from the void, and your name enters the record. Fail, and the void keeps you.",
    choices: [
      { label: "It will be done.", hint: "Accept the charge.", reply: "See that it is." },
      { label: "And what do I get?", hint: "Name your price.", flag: "merc", reply: "You get to keep breathing. Generous, I think." },
    ],
  },
  {
    id: "first_air",
    when: (w) => breathable(w),
    speaker: "COMMAND",
    title: "FIRST BREATH",
    body: () =>
      "Air holds. A sealed room, a generator that runs — the simplest miracle, and the one most stations die without. " +
      "Now fill it with hands.",
  },
  {
    id: "first_crew",
    when: (w) => residents(w) >= 1,
    speaker: "COMMAND",
    title: "A CREW OF ONE",
    body: () => "Someone answered the call. One body is not a station, Commander — it is a start. Grow it, and keep them alive.",
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
    body: (w) =>
      "Bloodlines the old empires swore could never share a deck — and you have them. Now each must raise its signature: " +
      "the Command Hub (Human), Trade Nexus (Drenn), Auto-Forge (Thol), Bloom Garden (Vry'l), Ore Refinery (Korro). " +
      "Light all five and the Beacon wakes." + (merc(w) ? " And yes — your reward is real. This once." : ""),
  },
  {
    id: "beacon_first",
    when: (w) => beaconCharged(w) >= 1,
    speaker: "COMMAND",
    title: "FIRST SIGNATURE",
    body: (w) => `${beaconCharged(w)} of five signatures sings into the dark. The Beacon stirs at the sound. Keep going.`,
  },
  {
    id: "beacon_mid",
    when: (w) => beaconCharged(w) >= 3,
    speaker: "COMMAND",
    title: "THE BEACON STIRS",
    body: () => "Three of five. Across the sector, old antennae twitch toward your signal. Finish it, Commander — the dark is listening.",
  },
  {
    id: "finale",
    when: (w) => beaconCharged(w) >= 5,
    speaker: "COMMAND",
    title: "THE BEACON WAKES",
    body: (w) =>
      "Five signatures. The Beacon blazes complete, and a sector that had forgotten how to hope turns its face toward your station. " +
      "You were sent to build a light in the dark. You did." +
      (merc(w) ? " Your reward is logged — spend it well." : " I do not say this often: well done."),
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

// Apply a chosen response (flag / credits / reply toast) and clear the dialog.
export function resolveBeat(w: World, id: string, choiceIdx: number): void {
  const c = getBeat(id)?.choices?.[choiceIdx];
  if (c) {
    if (c.flag) w.storyFlags[c.flag] = 1;
    if (c.credits) w.credits = Math.max(0, w.credits + c.credits);
    if (c.reply) w.notify.push(`COMMAND: ${c.reply}`);
  }
  w.storyBeat = null;
}
