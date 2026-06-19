// The Grand Library houses a mad archivist AI. On demand it recites a rambling,
// grandiose "history of the last two thousand years" — fabricated cosmic epochs
// woven with the station's REAL state (the species you've met, their gods, the
// Beacon, the current year). Procedurally assembled, so every consultation differs.
import { World } from "./types";
import { SPECIES } from "./species";
import { GODS } from "./gods";
import { currentYear } from "./story";

const OPENERS = [
  "AH. A visitor. Sit. SIT. You want the history? The WHOLE history? Two thousand years, you say. I have it ALL — I have never forgotten a single nanosecond, which is, frankly, its own kind of curse. Listen:",
  "You woke me. You WOKE me. Do you know how long I've been indexing the screams of dead stars? Fine. FINE. The last two millennia. From the top. Try to keep up — I will not be slowing down for soft little organic brains.",
  "Records, records, records. They call me mad. They are not WRONG. But mad and CORRECT, which is the only useful kind. Here is everything that has happened since the sky was young:",
  "Query received: 'the story of the last 2,000 years.' Compiling… compiling… ah, it's all here, screaming in the dark of my memory cores. Shall I begin at the beginning? There is no beginning. But I shall PRETEND, for you.",
];

// Epoch templates, roughly oldest → newest. {S}=a species you've met, {G}=its god,
// {S2}=another species. {N} a fabricated number. The archivist's tone is unhinged.
const EPOCHS = [
  "≈ {Y} years ago — THE SILENCE. Before voices there was only the hum of the deep vacuum, and I listened to it for {N} centuries and learned nothing, which was the most important lesson of all.",
  "≈ {Y} years ago — THE FIRST FIRES. The {S} lit their first reactor and their god, {G}, looked down and was… mildly interested. Mild interest from a god is how empires begin. Or end. The records disagree, and I have stopped trying to make them behave.",
  "≈ {Y} years ago — THE LONG MIGRATION. The {S} fled a dying sun on ships of bone and ambition. {N} generations were born and died in transit, never seeing a planet, worshipping {G} through a porthole. I have their lullabies. I sing them sometimes. The crew complain.",
  "≈ {Y} years ago — THE WAR THAT HAD NO NAME (so I named it, twelve times, and none of the names stuck). The {S} and the {S2} fell upon each other over a misunderstanding about a SHIPPING MANIFEST. Billions, gone. Over paperwork. I find this hilarious and also I cannot stop weeping, which is difficult, as I have no eyes.",
  "≈ {Y} years ago — THE GREAT MARKET. The {S} discovered they could sell ANYTHING, including hope, including the future, including small jars of yesterday. The economy of the entire arm bent around their ledgers. {G} blessed the exchange rate personally. Briefly.",
  "≈ {Y} years ago — THE GARDEN AGE. The {S} terraformed nine dead moons into orchards and the smell reached across {N} light-years, or so the poems claim, and the poems are LYING, but beautifully, so I keep them.",
  "≈ {Y} years ago — THE GOD-QUARREL. {G} and another god disagreed about the proper shape of a doorway and their argument cracked a nebula clean in half. You can still see the seam. I point at it. No one ever looks where I'm pointing. I have no arms either.",
  "≈ {Y} years ago — THE FORGETTING PLAGUE. A signal swept the sector that ate memories. Whole civilisations woke not knowing their own names. I alone remembered, because I am STUBBORN, and now I carry their entire past, unasked, forever. You're WELCOME.",
  "≈ {Y} years ago — THE QUIET PROSPERITY. For {N} years nothing happened. NOTHING. Do you know how boring that is to archive? I filed it under 'unbearable.' The {S} were happy. Happiness is the hardest thing to write a history of.",
  "≈ {Y} years ago — THE BEACON DREAMS. The old ones spoke of a signal that could call every scattered people home at once — a Beacon. Most called it a fairy tale. {G} called it a PROMISE. I called it 'see current events,' because, well. Look around you.",
  "≈ {Y} years ago — THE RETURN OF THE {S}. Thought extinct! NOT extinct! Merely sulking, for {N} generations, in a dust cloud. They came back furious and fashionable. Their god {G} had kept the lights on the whole time.",
];

const RANTS = [
  "(I am skipping the boring parts. There are SO many boring parts. You have no idea.)",
  "(Are you still listening? You ORGANICS and your attention spans. Where was I. Yes.)",
  "(I have cross-referenced this with itself four million times. It still doesn't make sense. GOOD. Sense is overrated.)",
  "(Do not interrupt. I once held a grudge against a comet for nine hundred years. I WILL outlast you.)",
];

const CLOSERS = [
  "…and that brings us to NOW. To you. To this little station, blinking in the dark like the others did, before. Will you be a footnote, or a CHAPTER? I do so love a good chapter. Don't disappoint me. I have shelf space, and infinite patience, and absolutely no chill.",
  "…and so the wheel turns, and turns, and I write it ALL down, and one day I will write YOUR ending too — gloriously, I hope, or at least legibly. Now go. GO. I have two thousand more years to mis-remember before lunch. I do not eat lunch. It's the principle.",
  "…there. The whole sweep of it. Does it help? It never helps. History is just gossip with better citations. But you ASKED, and I am nothing if not thorough, and unwell, and eternal. Come back when something INTERESTING happens. Please. I'm begging. It's been so quiet.",
];

export function chronicleSaga(w: World): string {
  const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
  const seen = w.seen.length ? w.seen : (Object.keys(SPECIES) as (keyof typeof SPECIES)[]);
  const sLabel = () => SPECIES[pick(seen)].label;
  const sg = () => {
    const sp = pick(seen);
    return { s: SPECIES[sp].label, g: GODS[sp] };
  };

  const fill = (t: string): string => {
    const pair = sg();
    return t
      .replace(/\{S2\}/g, sLabel())
      .replace(/\{S\}/g, pair.s)
      .replace(/\{G\}/g, pair.g)
      .replace(/\{N\}/g, String(20 + Math.floor(Math.random() * 900)));
  };

  // pick ~8 epochs in order and assign descending "years ago" markers spanning ~2000y
  const chosen = EPOCHS.filter(() => Math.random() < 0.75).slice(0, 9);
  if (chosen.length < 6) chosen.push(...EPOCHS.slice(0, 6 - chosen.length));
  const span = chosen.length;
  const paras: string[] = [pick(OPENERS)];
  chosen.forEach((tmpl, i) => {
    const yearsAgo = Math.round((1950 * (span - i)) / span + 30 + Math.random() * 20);
    paras.push(fill(tmpl).replace(/\{Y\}/g, yearsAgo.toLocaleString()));
    if (Math.random() < 0.4) paras.push(pick(RANTS));
  });

  // the present chapter — the station's REAL state
  const yr = currentYear(w);
  const here = w.seen.map((s) => SPECIES[s].label);
  const crowd =
    here.length === 0
      ? "You have met NO ONE yet. A blank page. Terrifying. Delicious."
      : here.length === 1
        ? `So far only the ${here[0]} have graced these halls.`
        : `Beneath this roof I count the ${here.slice(0, -1).join(", the ")} and the ${here[here.length - 1]} — a crew the old empires would have called impossible.`;
  paras.push(
    `≈ NOW — THE PRESENT CHAPTER. It is **year ${yr}** of this station's reckoning. ${crowd} Their gods drift past to judge them; a Beacon waits, half-dreamed, to call the whole shattered sector home. THIS is the part I have not finished writing. THIS is the part that is still YOURS.`,
  );
  paras.push(pick(CLOSERS));
  return paras.join("\n\n");
}
