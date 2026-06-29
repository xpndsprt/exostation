// The campaign spine — the station's story told in dialog boxes, fired once at
// milestones from empty vacuum to the woken Sector Beacon. The Emperor ("COMMAND")
// narrates the throughline in cold, grandiose imperial prose; the five Beacon
// signatures are spoken by the species that raise them (their portrait shows in the
// dialog). Pure narration — each beat is dismissed with one button and changes
// nothing in the sim. Fired ids persist on the World so the arc never repeats.
import { Species, World } from "./types";
import { SPECIES } from "./species";
import { beaconCharged, BEACON_SPECIES } from "./beacon";
import { activeDoctrine } from "./research";

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
function anyDead(w: World): boolean {
  for (const id in w.agents) if (!w.agents[id].alive) return true;
  return false;
}
function anyRomance(w: World): boolean {
  for (const id in w.agents) { const a = w.agents[id]; if (a.alive && a.mateId >= 0) return true; }
  return false;
}
function enclosedRoom(w: World): boolean {
  return Object.values(w.rooms).some((r) => r.enclosed);
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

const cmd = (id: string, when: (w: World) => boolean, title: string, body: string): Beat =>
  ({ id, when, speaker: "COMMAND", title, body: () => body });

// The arc, in order. campaignSystem fires the first unfired beat whose `when` is
// true, one at a time (the game pauses on each, so they queue and show in sequence).
export const BEATS: Beat[] = [
  cmd("prologue", () => true, "ASSIGNMENT",
    "Commander. You read this in the dark because that is all there is out here — coordinates, vacuum, and the weight of my " +
    "expectation. There is no station yet. There is the idea of one, and a fabrication charter with your name burned into it. " +
    "Build it: seal a hull against the void, light it, teach it to breathe, and fill it with the living.\n\n" +
    "But understand the true charge — the Sector Beacon. Five peoples, five signatures, one signal old enough to call the " +
    "scattered children of a dead empire home. Raise it from nothing, and history will carve your name beside it. Fail, and " +
    "the dark simply closes over you, as it has over a thousand before you. Begin."),

  cmd("first_seal", (w) => enclosedRoom(w), "INSIDE",
    "You have drawn walls around a piece of nothing and named it 'inside.' That, Commander, is the whole of civilization — a " +
    "line scratched in the dark with the living on one side of it. Now make the air on your side worth breathing."),

  cmd("first_power", (w) => hasKind(w, "solar", "fusion"), "FIRST LIGHT",
    "Light, where a moment ago there was only the long dark. Power is the first promise a station makes to the void — that it " +
    "intends to stay. Mind the current well: every door, lamp, and machine you raise will drink from it, and a station gone " +
    "dark is, in my experience, a station gone."),

  cmd("first_air", (w) => breathable(w), "FIRST BREATH",
    "Air holds. A room sealed, a generator turning, pressure where there was none — the plainest miracle in the whole " +
    "catalogue, and the one that buries most claims before they earn a name. Savor it for exactly as long as it takes to draw " +
    "a single breath. Then fill these corridors with hands. Walls do not raise a Beacon."),

  cmd("first_crew", (w) => residents(w) >= 1, "A CREW OF ONE",
    "Someone crossed the black and answered your light. One soul is not a crew — it is a wager that there will be a second. " +
    "Keep them breathing, fed, and unbroken; out here a single death is not a tragedy, it is a trend. Grow your number, " +
    "Commander. The mission is heavier than any one back can carry."),

  cmd("first_meal", (w) => anyMeal(w), "BREAD IN THE DARK",
    "Food in the stores at last. A crew that eats is a crew that stays, works, and — eventually — forgives you for dragging " +
    "them out here. Hunger is the quietest mutiny; it never announces itself until the airlock is already cycling. Keep the " +
    "larder full and the vats turning."),

  cmd("first_vat", (w) => hasKind(w, "vat"), "SEED AND SOIL",
    "A Bio Vat, growing. You have chosen to make your own future rather than ration the past — wise. A station that lives on " +
    "only what it carried in is not surviving, Commander; it is dying slowly, on a schedule, with good manners."),

  cmd("act_grow", (w) => w.objectiveIx >= 1, "IT LIVES",
    "A working crew, and the lights still burning. The sector keeps a short list of stations that outlast their first season; " +
    "you are, improbably, on it. Do not mistake survival for success. I did not pour a charter into the void to fund a quiet " +
    "little life-support experiment. Make this place earn."),

  cmd("first_dock", (w) => hasKind(w, "dock", "docklarge", "docksuper"), "AN OPEN DOOR",
    "An airlock to the wider dark. Ships may come now — crew, custom, and trouble, usually in that order and frequently in the " +
    "same hull. A station with a door is a station in the world again. Mind very carefully who you let through it."),

  cmd("first_guest", (w) => anyGuest(w), "OUTSIDERS",
    "A ship that is not mine has put down at your ring — and left coin behind. Good. Every outsider who sleeps under your hull " +
    "and pays for the privilege is a thread tying this station into the living sector. Treat them well enough to return, and " +
    "poorly enough to remember who holds the airlock."),

  cmd("first_mining", (w) => hasKind(w, "bay"), "INTO THE DEEP",
    "A Bot Bay, and drones away into the black. The asteroids will not mine themselves, and the Beacon is hungry for metal — " +
    "it always was. Strip the rocks, Commander. Leave nothing soft for the next claimant to find."),

  cmd("first_market", (w) => hasKind(w, "tradehub", "cargoex"), "COMMERCE",
    "A Trade Hub. Now the station has a pulse the sector can feel — ore out, credits in, the oldest music there is. Wealth is " +
    "not the mission, Commander, but it is the means: Beacons are not built on good intentions and recycled air. Earn, and " +
    "pour every spare credit into the work."),

  cmd("crew_5", (w) => residents(w) >= 5, "A PLACE, NOT A TOMB",
    "Five souls and climbing. Somewhere around this number a station stops being a tomb that has not finished filling and " +
    "becomes a place — with quarrels and routine and a name its people say without spitting. Hold onto that. It is rarer than " +
    "metal out here."),

  cmd("second_species", (w) => speciesAboard(w) >= 2, "STRANGE COMPANY",
    "Two peoples under one hull, breathing the same recycled air without breathing it at one another's throats. The old " +
    "empires would have called this impossible, then a heresy, then — quietly, in their last days — a dream. Keep them apart " +
    "where they hate and together where they don't. Every bloodline you can hold is one more voice the Beacon will need."),

  cmd("first_research", (w) => hasKind(w, "lab"), "KNOWLEDGE",
    "A laboratory, lit and staffed. Now the station can learn — and learning is the only weapon that compounds. Everything the " +
    "Beacon will demand of you lies on the far side of research you have not yet bought. Spend it wisely; the void does not " +
    "grade on effort."),

  cmd("act_bank", (w) => w.objectiveIx >= 2, "SOLVENT",
    "Coin enough to matter. A station that earns is a station that lasts, and a Commander who can balance a ledger is one I can " +
    "almost trust. Almost. But credits were never the point — the Beacon answers to peoples, not purses. Go and gather them: " +
    "bloodlines that have not shared a roof since the empire fell."),

  cmd("first_brownout", (w) => w.power.brownout, "THE LIGHTS GUTTER",
    "The lights gutter, and the crew go quiet in the sudden dark. You have asked more of your reactor than it can give, " +
    "Commander — a beginner's hunger. Build power ahead of need, not behind it, or you will learn this same lesson again, and " +
    "the next time it will cost you more than nerve."),

  cmd("first_overflow", (w) => w.overflow, "WASTE",
    "Your stores spill their surplus into the void — waste, which is merely theft with extra steps and worse manners. Every " +
    "unit lost is something a crewman mined or grew for nothing. Size your appetite to your throat, Commander, or sell the " +
    "excess before it rots in front of them."),

  cmd("first_raid", (w) => w.raidCount >= 1, "WOLVES",
    "Raiders. Of course there are raiders — wealth in the dark draws teeth the way an open wound draws the cold. This first " +
    "pack came light, almost courteous; consider it a lesson with the edge filed off. The next will not be filed. Build a " +
    "Turret, Commander, before the sector decides your ring is easier to take than to trade with."),

  cmd("first_turret", (w) => hasKind(w, "turret"), "TEETH",
    "Guns on the ring at last. The sector understands exactly one argument with any reliability, and you have just learned to " +
    "make it. Let the next wolves break their teeth on your hull and carry the story home."),

  cmd("first_death", (w) => anyDead(w), "THE LEDGER",
    "A death. The first — never, in my long and bitter experience, the last. The void keeps a ledger too, and it does not " +
    "forgive an overdraft. Grieve quickly, Commander, then find what killed them and kill it back, before it acquires a taste."),

  cmd("first_romance", (w) => anyRomance(w), "SOMETHING TO LIVE FOR",
    "Two of your crew have found something to live for besides my orders. Love, out here, in a tin can held against the cold — " +
    "absurd, and I find I will allow it. Content hands work harder, and the dead, whatever else may be said for them, build " +
    "nothing."),

  cmd("first_birth", (w) => (w.eggs?.length ?? 0) > 0, "MORE OF US",
    "A clutch, laid in open defiance of every reasonable odds. Life insisting upon more of itself, even here, even now. See " +
    "them fed and safe — today's brood is tomorrow's crew, and the Beacon is a long, long work."),

  cmd("first_doctrine", (w) => !!activeDoctrine(w), "A PATH CHOSEN",
    "You have committed to a doctrine and shut the other doors behind you. Good — a Commander who will not choose is only a " +
    "slower species of failure. Now go and become genuinely unbearable at the one thing you picked."),

  cmd("third_species", (w) => speciesAboard(w) >= 3, "AN IMPOSSIBLE HOUSEHOLD",
    "Three peoples now, each privately certain the others smell wrong and chew too loudly. Hold them together regardless. The " +
    "Beacon was forged for precisely this impossible household — the empire never managed it, and you have seen where the " +
    "empire is."),

  cmd("wealth_10k", (w) => w.credits >= 10000, "A FORTUNE",
    "A fortune, by the standards of a place that began as vacuum and spite. Do not hoard it like a frightened clerk. Coin is " +
    "only potential until it is poured into something that outlasts the hand that earned it. You know where to pour it."),

  cmd("act_diverse", (w) => w.objectiveIx >= 3, "THE GATHERING",
    "Look at what you have assembled — a court of bloodlines the chronicles swore could never share a deck. This is the " +
    "threshold, Commander. Each people must now raise its signature into the Beacon: the Command Hub, the Trade Nexus, the " +
    "Auto-Forge, the Bloom Garden, the Ore Refinery — five voices, five hands upon the same ancient instrument. Build them. " +
    "Light all five, and the thing wakes."),

  // The five signatures — each spoken by the species that raises it (portrait shown).
  ...Object.keys(BEACON_SPECIES).map((kind): Beat => ({
    id: `sig_${kind}`,
    when: (w) => hasKind(w, kind),
    speaker: SPECIES[BEACON_SPECIES[kind] as Species].label.toUpperCase(),
    species: BEACON_SPECIES[kind] as Species,
    title: "A SIGNATURE RISES",
    body: () => SIGNATURE[kind] ?? "Another signature joins the Beacon's song.",
  })),

  cmd("beacon_first", (w) => beaconCharged(w) >= 1, "A SIGNAL IN THE DARK",
    "One signature, live and singing. After an age of silence the Beacon has a voice again — thin, alone, but real. Somewhere " +
    "out in the deep an old receiver just woke and refused to believe its own dials. Four more, Commander. Do not stop now."),

  cmd("beacon_mid", (w) => beaconCharged(w) >= 3, "THE BEACON STIRS",
    "Three of five. The signal has grown from a whisper into a chord, and across the sector dead antennae are turning toward " +
    "you like flowers toward a sun they had long forgotten. The scattered are beginning to hope. Do not make liars of us " +
    "both — finish it."),

  cmd("beacon_four", (w) => beaconCharged(w) >= 4, "ONE VOICE SHORT",
    "Four of five. One voice short of a chord that could shake the sector awake. The silence out there is holding its breath, " +
    "Commander — and I find, to my own irritation, that I am holding mine. The last signature. Raise it."),

  cmd("finale", (w) => beaconCharged(w) >= 5, "THE BEACON WAKES",
    "Five signatures. The Beacon blazes whole, and a sector that had forgotten the very shape of hope turns its face toward a " +
    "light you raised out of empty vacuum. Ships that have drifted lost for generations are, even now, coming about.\n\n" +
    "You were sent to build a candle against the dark, Commander. You built a sun. I do not say this twice, so hear it once: " +
    "well done."),
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
