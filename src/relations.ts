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
export const RELATIONS: Record<Species, Record<Species, number>> = {
  human: { human: KIN, drenn: LOVE, thol: DISLIKE, vryl: NEUTRAL, korro: HATE },
  drenn: { human: LOVE, drenn: KIN, thol: LIKE, vryl: LIKE, korro: LIKE },
  thol: { human: NEUTRAL, drenn: LIKE, thol: KIN, vryl: LOVE, korro: DISLIKE },
  vryl: { human: NEUTRAL, drenn: LIKE, thol: LOVE, vryl: KIN, korro: HATE },
  korro: { human: HATE, drenn: NEUTRAL, thol: DISLIKE, vryl: HATE, korro: KIN },
};
