// The campaign spine — the station's story told in dialog boxes, fired once at
// milestones from empty vacuum to the woken Sector Beacon. The Emperor ("COMMAND")
// narrates the throughline in cold, grandiose imperial prose; the five Beacon
// signatures are spoken by the species that raise them (their portrait shows in the
// dialog). Pure narration — each beat is dismissed with one button and changes
// nothing in the sim. Fired ids persist on the World so the arc never repeats.
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
function speciesAboard(w: World): number {
  const s = new Set<string>();
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive && !a.guest) s.add(a.species); }
  return s.size;
}
function anyGuest(w: World): boolean {
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive && a.guest) return true; }
  return false;
}
function breathable(w: World): boolean {
  return Object.values(w.rooms).some((r) => r.enclosed && r.gas !== "none" && r.gas !== "mixed");
}
function hasKind(w: World, ...kinds: string[]): boolean {
  for (const id in w.structures) if (kinds.includes(w.structures[id].kind)) return true;
  return false;
}
function anyMeal(w: World): boolean {
  const m = w.stock.meals;
  return m.rations + m.fungal + m.protein + m.exotic > 0;
}

// Voice lines for each Beacon signature, spoken by the species that raises it.
const SIGNATURE: Record<string, string> = {
  cmdhub:
    "The Command Hub stands, and humanity lends the Beacon its voice. We were the ones who kept the maps when the empire " +
    "burned them — let the scattered hear an ordered signal in the dark and remember, at last, the way home.",
  tradenexus:
    "The Trade Nexus opens for business. We Drenn will sell the whole shattered sector its passage home — and yes, we will " +
    "take our margin, because a road that pays for itself is a road that stays open. Consider it a gift. With an invoice.",
  autoforge:
    "The Auto-Forge breathes. We Thol give the Beacon what soft flesh cannot — hands that never tire, never grieve, never " +
    "sleep. While the others rest, our work continues. The signal will not falter on our account.",
  bloomgarden:
    "The Bloom Garden flowers, and the Beacon learns to smell of something living. We Vry'l send more than a signal into the " +
    "void — we send the promise of soil, of green, of a world worth crossing the dark to reach.",
  orerefinery:
    "The Ore Refinery roars awake. We Korro tear strength from the deep rock and pour it into the Beacon's bones. Let the " +
    "others sing — we will make certain there is something solid for the song to stand upon.",
};

// The arc, in order. campaignSystem fires the first unfired beat whose `when` is
// true, one at a time (the game pauses on each, so they queue and show in sequence).
export const BEATS: Beat[] = [
  {
    id: "prologue",
    when: () => true,
    speaker: "COMMAND",
    title: "ASSIGNMENT",
    body: () =>
      "Commander. You read this in the dark because that is all there is out here — coordinates, vacuum, and the weight of my " +
      "expectation. There is no station yet. There is the idea of one, and a fabrication charter with your name burned into it. " +
      "Build it: seal a hull against the void, light it, teach it to breathe, and fill it with the living.\n\n" +
      "But understand the true charge — the Sector Beacon. Five peoples, five signatures, one signal old enough to call the " +
      "scattered children of a dead empire home. Raise it from nothing, and history will carve your name beside it. Fail, and " +
      "the dark simply closes over you, as it has over a thousand before you. Begin.",
  },
  {
    id: "first_power",
    when: (w) => hasKind(w, "solar", "fusion"),
    speaker: "COMMAND",
    title: "FIRST LIGHT",
    body: () =>
      "Light, where a moment ago there was only the long dark. Power is the first promise a station makes to the void — that " +
      "it intends to stay. Mind the current well: every door, lamp, and machine you raise will drink from it, and a station " +
      "gone dark is, in my experience, a station gone.",
  },
  {
    id: "first_air",
    when: (w) => breathable(w),
    speaker: "COMMAND",
    title: "FIRST BREATH",
    body: () =>
      "Air holds. A room sealed, a generator turning, pressure where there was none — the plainest miracle in the whole " +
      "catalogue, and the one that buries most claims before they earn a name. Savor it for exactly as long as it takes to " +
      "draw a single breath. Then fill these corridors with hands. Walls do not raise a Beacon.",
  },
  {
    id: "first_crew",
    when: (w) => residents(w) >= 1,
    speaker: "COMMAND",
    title: "A CREW OF ONE",
    body: () =>
      "Someone crossed the black and answered your light. One soul is not a crew — it is a wager that there will be a second. " +
      "Keep them breathing, fed, and unbroken; out here a single death is not a tragedy, it is a trend. Grow your number, " +
      "Commander. The mission is heavier than any one back can carry.",
  },
  {
    id: "first_meal",
    when: (w) => anyMeal(w),
    speaker: "COMMAND",
    title: "BREAD IN THE DARK",
    body: () =>
      "Food in the stores at last. A crew that eats is a crew that stays, works, and — eventually — forgives you for dragging " +
      "them out here. Hunger is the quietest mutiny; it never announces itself until the airlock is already cycling. Keep the " +
      "larder full and the vats turning.",
  },
  {
    id: "act_grow",
    when: (w) => w.objectiveIx >= 1,
    speaker: "COMMAND",
    title: "IT LIVES",
    body: () =>
      "A working crew, and the lights still burning. The sector keeps a short list of stations that outlast their first " +
      "season; you are, improbably, on it. Do not mistake survival for success. I did not pour a charter into the void to fund " +
      "a quiet little life-support experiment. Make this place earn.",
  },
  {
    id: "first_guest",
    when: (w) => anyGuest(w),
    speaker: "COMMAND",
    title: "OUTSIDERS",
    body: () =>
      "A ship that is not mine has put down at your ring — and left coin behind. Good. Every outsider who sleeps under your " +
      "hull and pays for the privilege is a thread tying this station into the living sector. Treat them well enough to " +
      "return, and poorly enough to remember who holds the airlock.",
  },
  {
    id: "first_market",
    when: (w) => hasKind(w, "tradehub", "cargoex"),
    speaker: "COMMAND",
    title: "COMMERCE",
    body: () =>
      "A Trade Hub. Now the station has a pulse the sector can feel — ore out, credits in, the oldest music there is. Wealth " +
      "is not the mission, Commander, but it is the means: Beacons are not built on good intentions and recycled air. Earn, " +
      "and pour every spare credit into the work.",
  },
  {
    id: "act_bank",
    when: (w) => w.objectiveIx >= 2,
    speaker: "COMMAND",
    title: "SOLVENT",
    body: () =>
      "Coin enough to matter. A station that earns is a station that lasts, and a Commander who can balance a ledger is one I " +
      "can almost trust. Almost. But credits were never the point — the Beacon answers to peoples, not purses. Go and gather " +
      "them: bloodlines that have not shared a roof since the empire fell.",
  },
  {
    id: "first_raid",
    when: (w) => w.raidCount >= 1,
    speaker: "COMMAND",
    title: "WOLVES",
    body: () =>
      "Raiders. Of course there are raiders — wealth in the dark draws teeth the way an open wound draws the cold. This first " +
      "pack came light, almost courteous; consider it a lesson with the edge filed off. The next will not be filed. Build a " +
      "Turret, Commander, before the sector decides your ring is easier to take than to trade with.",
  },
  {
    id: "first_research",
    when: (w) => hasKind(w, "lab"),
    speaker: "COMMAND",
    title: "KNOWLEDGE",
    body: () =>
      "A laboratory, lit and staffed. Now the station can learn — and learning is the only weapon that compounds. Everything " +
      "the Beacon will demand of you lies on the far side of research you have not yet bought. Spend it wisely; the void does " +
      "not grade on effort.",
  },
  {
    id: "second_species",
    when: (w) => speciesAboard(w) >= 2,
    speaker: "COMMAND",
    title: "STRANGE COMPANY",
    body: () =>
      "Two peoples under one hull, breathing the same recycled air without breathing it at one another's throats. The old " +
      "empires would have called this impossible, then a heresy, then — quietly, in their last days — a dream. Keep them apart " +
      "where they hate and together where they don't. Every bloodline you can hold is one more voice the Beacon will need.",
  },
  {
    id: "act_diverse",
    when: (w) => w.objectiveIx >= 3,
    speaker: "COMMAND",
    title: "THE GATHERING",
    body: () =>
      "Look at what you have assembled — a court of bloodlines the chronicles swore could never share a deck. This is the " +
      "threshold, Commander. Each people must now raise its signature into the Beacon: the Command Hub, the Trade Nexus, the " +
      "Auto-Forge, the Bloom Garden, the Ore Refinery — five voices, five hands upon the same ancient instrument. Build them. " +
      "Light all five, and the thing wakes.",
  },
  // The five signatures — each spoken by the species that raises it (portrait shown).
  ...Object.keys(BEACON_SPECIES).map((kind): Beat => ({
    id: `sig_${kind}`,
    when: (w) => hasKind(w, kind),
    speaker: SPECIES[BEACON_SPECIES[kind] as Species].label.toUpperCase(),
    species: BEACON_SPECIES[kind] as Species,
    title: "A SIGNATURE RISES",
    body: () => SIGNATURE[kind] ?? "Another signature joins the Beacon's song.",
  })),
  {
    id: "beacon_first",
    when: (w) => beaconCharged(w) >= 1,
    speaker: "COMMAND",
    title: "A SIGNAL IN THE DARK",
    body: () =>
      "One signature, live and singing. After an age of silence the Beacon has a voice again — thin, alone, but real. " +
      "Somewhere out in the deep an old receiver just woke and refused to believe its own dials. Four more, Commander. Do not " +
      "stop now.",
  },
  {
    id: "beacon_mid",
    when: (w) => beaconCharged(w) >= 3,
    speaker: "COMMAND",
    title: "THE BEACON STIRS",
    body: () =>
      "Three of five. The signal has grown from a whisper into a chord, and across the sector dead antennae are turning toward " +
      "you like flowers toward a sun they had forgotten. The scattered are beginning to hope. Do not make liars of us both — " +
      "finish it.",
  },
  {
    id: "finale",
    when: (w) => beaconCharged(w) >= 5,
    speaker: "COMMAND",
    title: "THE BEACON WAKES",
    body: () =>
      "Five signatures. The Beacon blazes whole, and a sector that had forgotten the very shape of hope turns its face toward " +
      "a light you raised out of empty vacuum. Ships that have drifted lost for generations are, even now, coming about.\n\n" +
      "You were sent to build a candle against the dark, Commander. You built a sun. I do not say this twice, so hear it once: " +
      "well done.",
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
