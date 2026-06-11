import { Species, StationRequest, World } from "./types";
import { SPECIES } from "./species";

const REQ_INTERVAL = 50; // seconds between new requests
const MAX_ACTIVE = 2;
const REQ_TIME = 120; // seconds to fulfil

export function getRep(w: World, sp: Species): number {
  return w.reputation[sp] ?? 50;
}
function setRep(w: World, sp: Species, v: number): void {
  w.reputation[sp] = Math.max(0, Math.min(100, v));
}

function present(w: World, sp: Species): number {
  let n = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === sp) n++;
  }
  return n;
}
function avgMood(w: World, sp: Species): number {
  let s = 0;
  let n = 0;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === sp) {
      s += a.mood;
      n++;
    }
  }
  return n ? s / n : 0;
}
function hasKind(w: World, kind: string): boolean {
  for (const id in w.structures) if (w.structures[id].kind === kind) return true;
  return false;
}

export function requestText(r: StationRequest): string {
  const l = SPECIES[r.species].label;
  if (r.kind === "host") return `${l} — host ${r.target} of us aboard`;
  if (r.kind === "happy") return `${l} — keep us content (mood ≥ 60)`;
  return `${l} — build us a Lounge`;
}

function fulfilled(w: World, r: StationRequest): boolean {
  if (r.kind === "host") return present(w, r.species) >= r.target;
  if (r.kind === "happy") return present(w, r.species) > 0 && avgMood(w, r.species) >= 60;
  return hasKind(w, "rec");
}

// Species post requests (goals). Fulfilling pays credits + reputation; letting
// one expire costs reputation. Reputation drives how warmly that species (and
// its guests/traders) engage with the station.
export function requestsSystem(w: World, dt: number): void {
  for (const sp of w.seen) if (w.reputation[sp] == null) w.reputation[sp] = 50;

  for (let i = w.requests.length - 1; i >= 0; i--) {
    const r = w.requests[i];
    if (fulfilled(w, r)) {
      w.credits += r.reward;
      setRep(w, r.species, getRep(w, r.species) + r.rep);
      w.requests.splice(i, 1);
      continue;
    }
    r.t -= dt;
    if (r.t <= 0) {
      setRep(w, r.species, getRep(w, r.species) - r.penalty);
      w.requests.splice(i, 1);
    }
  }

  w.reqTimer += dt;
  if (w.reqTimer >= REQ_INTERVAL && w.requests.length < MAX_ACTIVE && w.seen.length > 0) {
    w.reqTimer = 0;
    const h = (w.tick * 2654435761) >>> 0;
    const sp = w.seen[h % w.seen.length];
    let kind = (["host", "happy", "amenity"] as const)[(h >>> 8) % 3];
    if (kind === "happy" && present(w, sp) === 0) kind = "host";
    if (kind === "amenity" && hasKind(w, "rec")) kind = "host"; // don't gift an already-met one
    const target = kind === "host" ? 1 + ((h >>> 16) % 2) : 1;
    const reward = kind === "host" ? 150 * target : kind === "happy" ? 200 : 120;
    const rep = kind === "happy" ? 15 : kind === "host" ? 12 : 10;
    const penalty = kind === "happy" ? 10 : kind === "host" ? 8 : 6;
    w.requests.push({ id: w.nextId++, species: sp, kind, target, t: REQ_TIME, reward, rep, penalty });
  }
}
