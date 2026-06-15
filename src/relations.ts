import { Species } from "./types";

// How species A (row) feels about species B (column). Mood deltas applied per
// nearby neighbor. Asymmetric — see the political web in GAME_DESIGN.md.
// Two strength tiers each way (M42): a soft LIKE/DISLIKE and a hard LOVE/HATE
// for the pointed alliances and rivalries that should genuinely drive layout.
const LOVE = 15;
const LIKE = 8;
const NEUTRAL = 0;
const DISLIKE = -8;
const HATE = -15;
const KIN = 4; // mild comfort around one's own kind

// The shape of the web:
// - Drenn are the universal diplomats (liked by all, like everyone) — easy guests.
// - Korro are the pariah: HATED by Human and Vry'l, disliked by Thol — integrating
//   them (they share O₂ air, so you can't gas-zone them out) is the hard problem.
// - Thol ⇄ Vry'l are a strong alliance (LOVE) — a productive mixed wing.
// - Human ⇄ Drenn LOVE — the comfortable starter pairing.
// Tier-3 additions: Chlorithe (Cl₂), Naaz (NH₃, the universal peacemaker — no
// dislikes), Voltaar (H₂, aloof). Chlorithe ⇄ Naaz and Vry'l ⇄ Naaz LOVE;
// Chlorithe ⇄ Vry'l and Thol ⇄ Voltaar and Chlorithe ⇄ Voltaar DISLIKE.
// Sszra (O₂ carnivore sentinel): respected by the Korro (a fellow predator),
// unnerving to Humans and the gentle Vry'l, and — like everyone — adored by the
// universal diplomats (Drenn) and the peacemaking Naaz.
export const RELATIONS: Record<Species, Record<Species, number>> = {
  human: { human: KIN, drenn: LOVE, thol: DISLIKE, vryl: NEUTRAL, korro: HATE, vorn: NEUTRAL, chlorithe: DISLIKE, naaz: NEUTRAL, voltaar: NEUTRAL, sszra: DISLIKE },
  drenn: { human: LOVE, drenn: KIN, thol: LIKE, vryl: LIKE, korro: LIKE, vorn: LIKE, chlorithe: LIKE, naaz: LIKE, voltaar: LIKE, sszra: LIKE },
  thol: { human: NEUTRAL, drenn: LIKE, thol: KIN, vryl: LOVE, korro: DISLIKE, vorn: LIKE, chlorithe: LIKE, naaz: LIKE, voltaar: DISLIKE, sszra: NEUTRAL },
  vryl: { human: NEUTRAL, drenn: LIKE, thol: LOVE, vryl: KIN, korro: HATE, vorn: NEUTRAL, chlorithe: DISLIKE, naaz: LOVE, voltaar: NEUTRAL, sszra: DISLIKE },
  korro: { human: HATE, drenn: NEUTRAL, thol: DISLIKE, vryl: HATE, korro: KIN, vorn: NEUTRAL, chlorithe: NEUTRAL, naaz: NEUTRAL, voltaar: NEUTRAL, sszra: LIKE },
  vorn: { human: LIKE, drenn: LIKE, thol: LIKE, vryl: LIKE, korro: NEUTRAL, vorn: KIN, chlorithe: LIKE, naaz: LIKE, voltaar: LIKE, sszra: LIKE },
  chlorithe: { human: NEUTRAL, drenn: NEUTRAL, thol: LIKE, vryl: DISLIKE, korro: NEUTRAL, vorn: NEUTRAL, chlorithe: KIN, naaz: LOVE, voltaar: DISLIKE, sszra: NEUTRAL },
  naaz: { human: NEUTRAL, drenn: LIKE, thol: LIKE, vryl: LOVE, korro: NEUTRAL, vorn: LIKE, chlorithe: LOVE, naaz: KIN, voltaar: NEUTRAL, sszra: LIKE },
  voltaar: { human: NEUTRAL, drenn: NEUTRAL, thol: DISLIKE, vryl: NEUTRAL, korro: NEUTRAL, vorn: NEUTRAL, chlorithe: DISLIKE, naaz: NEUTRAL, voltaar: KIN, sszra: NEUTRAL },
  sszra: { human: NEUTRAL, drenn: LIKE, thol: NEUTRAL, vryl: DISLIKE, korro: LIKE, vorn: NEUTRAL, chlorithe: NEUTRAL, naaz: LIKE, voltaar: NEUTRAL, sszra: KIN },
};
