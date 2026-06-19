// The Bar: a social module. Now and then it throws a round — most nights lift the
// whole room's spirits (and can even spark romance), but roughly 1 in 5 turns into
// a brawl that spikes tension and leaves someone hurt. Patrons are simply whoever
// is near a powered Bar; crew also choose to relax there (see agents.ts).
import { World } from "./types";
import { injure } from "./medical";
import { maybeFallInLove } from "./romance";
import { SPECIES } from "./species";

const FIRST = 35; // s before the first round
const INTERVAL = 28; // s between rounds
const RETRY = 6; // recheck sooner when a bar has no patrons
const RANGE = 3; // tiles around the bar that count as "at the bar"
const BRAWL_CHANCE = 0.2; // 1 in 5 rounds goes bad
const MOOD_LIFT = 9; // morale a good round gives each patron

function manh(w: World, a: number, b: number): number {
  return Math.abs((a % w.w) - (b % w.w)) + Math.abs(((a / w.w) | 0) - ((b / w.w) | 0));
}

export function barSystem(w: World, dt: number): void {
  w.barTimer += dt;
  if (w.barTimer < (w.tick < FIRST * 10 ? FIRST : INTERVAL)) return;

  const bars = Object.values(w.structures).filter((s) => s.kind === "bar" && s.powered);
  if (bars.length === 0) { w.barTimer = 0; return; }

  for (const bar of bars) {
    const patrons = Object.values(w.agents).filter((a) => a.alive && manh(w, a.cell, bar.cell) <= RANGE);
    if (patrons.length < 2) continue;
    w.barTimer = 0;

    if (Math.random() < BRAWL_CHANCE) {
      // a brawl — pick two patrons (prefer two different species), spike tension, hurt one
      const a = patrons[Math.floor(Math.random() * patrons.length)];
      let b = patrons[Math.floor(Math.random() * patrons.length)];
      const diff = patrons.find((p) => p.species !== a.species);
      if (diff) b = diff;
      if (a === b) continue;
      a.tension = 100; b.tension = 100;
      injure(w, Math.random() < 0.5 ? a.id : b.id);
      w.notify.push("🍺 A brawl broke out at the Bar — someone's hurt!");
    } else {
      for (const p of patrons) p.mood = Math.min(100, p.mood + MOOD_LIFT);
      // a good round can spark romance between two different-species patrons
      const a = patrons[Math.floor(Math.random() * patrons.length)];
      const partner = patrons.find((p) => p.species !== a.species);
      let spark = false;
      if (partner) spark = maybeFallInLove(w, a.id, partner.id, true);
      const n = patrons.length;
      w.notify.push(spark ? `🍺 A warm night at the Bar — and a spark between a ${SPECIES[a.species].label} and a ${SPECIES[partner!.species].label}.` : `🍺 A good round at the Bar lifts ${n} spirits.`);
    }
    return; // one bar round per interval
  }
  w.barTimer = INTERVAL - RETRY; // no bar had a crowd — try again soon
}
