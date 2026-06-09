import { Species } from "./types";

// How species A (row) feels about species B (column). Mood deltas applied per
// nearby neighbor. Asymmetric — see the political web in GAME_DESIGN.md.
const LIKE = 8;
const NEUTRAL = 0;
const DISLIKE = -8;
// Reserved for Tier-3 species when they land: LOVE = +15, HATE = -15.
const KIN = 4; // mild comfort around one's own kind

export const RELATIONS: Record<Species, Record<Species, number>> = {
  human: { human: KIN, drenn: LIKE, thol: DISLIKE },
  drenn: { human: LIKE, drenn: KIN, thol: LIKE },
  thol: { human: NEUTRAL, drenn: LIKE, thol: KIN },
};
