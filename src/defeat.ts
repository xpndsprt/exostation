import { World } from "./types";
import { SPECIES } from "./species";
import { STRUCTURES, isDock } from "./structures";
import { currentDay } from "./story";

// Post-mortem: read the dead station and report, plainly, what killed it. Used by
// the defeat screen so the player learns exactly where it went wrong.
export function defeatReasons(w: World): string[] {
  const reasons: string[] = [];
  let deaths = 0, residents = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) deaths++;
    else if (!a.guest) residents++;
  }
  if (residents === 0)
    reasons.push(deaths > 0
      ? `Every resident is dead — ${deaths} ${deaths === 1 ? "body" : "bodies"} cooling in the dark.`
      : "Not a single resident remained aboard.");

  const breathable = Object.values(w.rooms).filter((r) => r.enclosed && r.gas !== "none" && r.gas !== "mixed").length;
  if (breathable === 0) reasons.push("Not one room still held breathable air — life support had collapsed.");

  if (w.power.brownout || w.power.supply <= 0) reasons.push("The reactor was dark — power had failed across the station.");

  const m = w.stock.meals;
  if (m.rations + m.fungal + m.protein + m.exotic <= 0) reasons.push("The larders were bare — nothing left to eat.");

  const dockPowered = Object.values(w.structures).some((s) => isDock(s.kind) && s.powered);
  if (!dockPowered) reasons.push("No working dock — no relief ship could ever reach you.");

  const fedGases = new Set<string>();
  for (const sp of Object.values(SPECIES)) if (m[sp.diet] > 0) fedGases.add(sp.gas);
  const hasLivableBunk = Object.values(w.structures).some((s) => {
    if (s.kind !== "pod") return false;
    const rid = w.cells[s.cell].roomId;
    const g = rid >= 0 ? w.rooms[rid]?.gas : undefined;
    return !!g && fedGases.has(g);
  });
  if (!hasLivableBunk) reasons.push("No Crew Quarters in breathable air with food on the shelf — nowhere to take anyone in.");

  const broken = Object.values(w.structures).filter((s) => STRUCTURES[s.kind].draw > 0 && s.condition <= 0).length;
  if (broken > 0) reasons.push(`${broken} module${broken === 1 ? "" : "s"} lay broken and unmanned.`);

  if (w.breaches.length) reasons.push(`${w.breaches.length} hull breach${w.breaches.length === 1 ? "" : "es"} gaped open to the void.`);

  if (Math.floor(w.credits) <= 0) reasons.push("The treasury was empty — not a single credit to your name.");

  if (reasons.length === 0) reasons.push("The station simply withered — neglected into ruin while you looked away.");
  return reasons;
}

// How far they got, for the Emperor to sneer at — keyed to the objective they
// died on (w.objectiveIx = objectives already cleared).
function progressJab(w: World): string {
  switch (w.objectiveIx) {
    case 0:
      return "You could not raise a working crew of three. Three. I have seen ration-clerks manage more.";
    case 1:
      return "You scraped a few bodies together, then let the coffers — and them — bleed out.";
    case 2:
      return "A little money passed through your hands and you mistook the draught for competence.";
    case 3:
      return "You gathered a court of strange species and still could not light one node of the Beacon.";
    default:
      return "You had the Sector Beacon within your grasp and let the station die beneath it.";
  }
}

const SIGNOFFS = [
  "Try again. Try harder. Or do not — the void is patient.",
  "Do not write back. Your numbers have already explained you to me.",
  "The sector will go to someone who can count power against mouths.",
  "You will be remembered, briefly, in a junior logistics seminar — as the warning.",
  "Pray the next station forgets your name faster than I will.",
];

// A brutal letter from the Emperor on the loss of the colony. Deterministic
// (sign-off picked from the tick) so a reload of the same defeat reads the same.
export function emperorLetter(w: World): string {
  const days = currentDay(w);
  let dead = 0;
  for (const id in w.agents) if (!w.agents[id].alive) dead++;
  const signoff = SIGNOFFS[(w.tick >>> 4) % SIGNOFFS.length];
  const span = days <= 1 ? "barely a single day" : `${days} days`;

  return [
    "Commander,",
    "I will not insult us both by pretending to grieve.",
    `I handed you a sound station, a full treasury, and a sector crowded with willing hands — and in ${span} you handed me back a tomb. ${dead > 0 ? `${dead} dead.` : "Empty."} The lights out. A docking ring no captain will go near again.`,
    progressJab(w),
    "Other governors have built wonders from far less than you squandered. You could not keep the air breathable or the reactor lit. The fault was not the sector's, nor the void's, nor your crew's. It was yours, and it was total.",
    signoff,
    "— By My Hand, the Emperor",
  ].join("\n\n");
}
