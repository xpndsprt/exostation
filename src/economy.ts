import { Ship, Species, Structure, World } from "./types";
import { addAgent, accessCell, exteriorCell, GUEST_STAY } from "./world";
import { SPECIES, TRAITS } from "./species";
import { getRep } from "./requests";
import { STRUCTURES } from "./structures";
import { beaconActive } from "./beacon";

const MODULE_UPKEEP = 0.15; // credits/s per powered, operating module
const WAGE = 0.2; // credits/s per resident crew member

const SPAWN_INTERVAL = 20; // seconds between guest arrivals per dock
const LODGING_RATE = 1.5; // credits per second per living guest
const SHIP_TIME = 14; // seconds a trader/crew shuttle stays parked
const IN_TIME = 4.5; // seconds for the cinematic approach
const OUT_TIME = 3; // seconds for the cinematic departure
const MAX_GUESTS = 3; // most passengers a shuttle brings at once
const TRADE_INTERVAL = 30; // seconds between trader visits
const TRADE_BATCH = 25; // max minerals sold per trade
const MINERAL_PRICE = 3; // credits per mineral
const CREW_INTERVAL = 12; // seconds between resident-crew shuttle arrivals

// Species that live aboard as resident crew (Drenn only ever visit as guests).
const RESIDENT_SPECIES: Species[] = ["human", "thol", "vryl", "korro"];

export function economySystem(w: World, dt: number): void {
  // smoothed net ¢/s for the HUD: an exponential filter with a ~20s time
  // constant so lumpy trade/request payouts average into a steady trend rather
  // than spiking the readout each time a trader visits.
  const instant = (w.credits - w.prevCredits) / dt;
  w.creditRate += (instant - w.creditRate) * (dt / 20);
  w.prevCredits = w.credits;

  // ship lifecycle — cinematic flight for shuttles/traders (approach → land →
  // wait → depart); raiders and any legacy phase-less ship use the simple timer.
  for (let i = w.ships.length - 1; i >= 0; i--) {
    const sh = w.ships[i];
    if (sh.hostile || sh.phase === undefined) {
      sh.t -= dt;
      if (sh.t <= 0) w.ships.splice(i, 1);
      continue;
    }
    if (sh.phase === "in") {
      sh.prog = Math.min(1, (sh.prog ?? 0) + dt / IN_TIME);
      if (sh.prog >= 1) {
        sh.phase = "wait";
        // a passenger shuttle stays docked for the whole guest visit; trader and
        // crew shuttles just unload and go.
        sh.t = !sh.trader && sh.guests ? GUEST_STAY : SHIP_TIME;
        if (!sh.trader && sh.guests) dropGuests(w, sh); // passengers disembark
      }
    } else if (sh.phase === "wait") {
      sh.t -= dt;
      if (sh.t <= 0) {
        sh.phase = "out";
        sh.prog = 0;
      }
    } else {
      sh.prog = Math.min(1, (sh.prog ?? 0) + dt / OUT_TIME);
      if (sh.prog >= 1) w.ships.splice(i, 1);
    }
  }

  let guests = 0;
  let residents = 0;
  let hasDrenn = false; // Drenn merchant trait raises mineral prices
  const resCount: Partial<Record<Species, number>> = {};
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    if (a.guest) {
      guests++;
    } else {
      residents++;
      resCount[a.species] = (resCount[a.species] || 0) + 1;
    }
    if (a.species === "drenn") hasDrenn = true;
  }
  w.credits += guests * LODGING_RATE * dt;

  let hotels = 0; // guest capacity = Hotel Rooms
  let pods = 0; // crew capacity = Crew Quarters
  let hasTradeHub = false; // a powered Trade Hub lets traders buy minerals
  let hasCargoEx = false; // a Cargo Exchange: bigger/faster/better trades
  const podGases = new Set<string>(); // gases of rooms that contain a bunk
  const docks = [];
  let operating = 0; // powered, running modules — they cost upkeep
  for (const id in w.structures) {
    const s = w.structures[id];
    if (STRUCTURES[s.kind].draw > 0 && s.powered) operating++;
    if (s.kind === "hotel") hotels++;
    else if (s.kind === "pod") {
      pods++;
      const rid = w.cells[s.cell].roomId;
      const gas = rid >= 0 ? w.rooms[rid]?.gas : undefined;
      if (gas) podGases.add(gas);
    } else if (s.kind === "dock") docks.push(s);
    else if (s.kind === "tradehub" && s.powered) hasTradeHub = true;
    else if (s.kind === "cargoex" && s.powered) hasCargoEx = true;
  }

  // recurring upkeep — the credit sink: crew wages + operating-module cost. An
  // idle station bleeds; only an active economy (trade/lodging) stays in the black.
  const upkeep = residents * WAGE + operating * MODULE_UPKEEP;
  w.credits = Math.max(0, w.credits - upkeep * dt);

  // guest arrivals (need free hotel rooms AND a powered dock). A shuttle carries
  // up to MAX_GUESTS, who disembark only once it lands; free capacity therefore
  // discounts guests already inbound on a shuttle. Drenn reputation shortens the
  // interval — well-liked stations get more visitors.
  let inbound = 0;
  for (const sh of w.ships) if (!sh.trader && !sh.hostile && sh.phase === "in") inbound += sh.guests ?? 0;
  let freeCap = hotels - guests - inbound;
  const interval = SPAWN_INTERVAL * Math.max(0.5, Math.min(1.5, 1 + (50 - getRep(w, "drenn")) / 100));
  for (const dock of docks) {
    if (!dock.powered) continue;
    dock.timer += dt;
    if (dock.timer < interval) continue;
    if (dockBusy(w, dock)) continue; // pad still occupied — hold ready, don't reset
    dock.timer -= interval;
    if (freeCap >= 1 && exteriorCell(w, dock) >= 0) {
      const k = Math.min(MAX_GUESTS, freeCap);
      spawnShip(w, dock, { guests: k });
      freeCap -= k;
    }
  }

  // resident immigration — a shuttle brings new crew when there is a free bunk
  // (Crew Quarters capacity), a powered dock, a bunk sitting in their breathable
  // air, and food they can eat already stocked. One arrival per interval; if a
  // slot opens later the shuttle comes as soon as the next interval ticks.
  w.crewTimer += dt;
  if (w.crewTimer >= CREW_INTERVAL) {
    const arrived = tryCrewArrival(w, docks, residents, pods, podGases, resCount);
    w.crewTimer = arrived ? 0 : CREW_INTERVAL; // hold ready until a slot frees
  }

  // traders buy minerals — needs a powered Trade Hub, or a Cargo Exchange which
  // trades bigger batches, more often, at a better price. A ship parks at a dock.
  const tradeEvery = hasCargoEx ? 20 : TRADE_INTERVAL;
  w.tradeTimer += dt;
  if (w.tradeTimer >= tradeEvery) {
    w.tradeTimer -= tradeEvery;
    if ((hasTradeHub || hasCargoEx) && w.stock.minerals > 0) {
      const batch = hasCargoEx ? 60 : TRADE_BATCH;
      const exBonus = hasCargoEx ? 1.5 : 1;
      const nexus = beaconActive(w, "tradenexus") ? 1.5 : 1; // Drenn Trade Nexus
      const amount = Math.min(w.stock.minerals, batch);
      w.stock.minerals -= amount;
      w.credits += amount * MINERAL_PRICE * exBonus * nexus * w.priceMult * (hasDrenn ? TRAITS.drennTrade : 1);
      const dock = docks.find((d) => d.powered && exteriorCell(w, d) >= 0 && !dockBusy(w, d));
      if (dock) spawnShip(w, dock, { trader: true });
    }
  }
}

// Returns true if a resident was brought aboard this call.
function tryCrewArrival(
  w: World,
  docks: Structure[],
  residents: number,
  pods: number,
  podGases: Set<string>,
  resCount: Partial<Record<Species, number>>,
): boolean {
  if (residents >= pods) return false; // no free bunk
  // need a powered dock whose landing pad is free right now (one ship per pad)
  const dock = docks.find((d) => d.powered && exteriorCell(w, d) >= 0 && !dockBusy(w, d));
  if (!dock) return false;
  const access = accessCell(w, dock);
  if (access < 0) return false;

  // Who can we host right now: a bunk in their gas + food of their line stocked.
  const eligible = RESIDENT_SPECIES.filter(
    (sp) => podGases.has(SPECIES[sp].gas) && w.stock.meals[SPECIES[sp].diet] > 0,
  );
  if (eligible.length === 0) return false;
  // Favour diversity: bring whichever eligible species has the fewest aboard.
  eligible.sort((a, b) => (resCount[a] || 0) - (resCount[b] || 0));
  const sp = eligible[0];

  if (!addAgent(w, access % w.w, (access / w.w) | 0, sp, false)) return false;
  if (exteriorCell(w, dock) >= 0) spawnShip(w, dock, {});
  return true;
}

// A dock's landing pad is occupied while any ship sits on its exterior cell —
// from approach through departure — so only one ship uses a pad at a time.
function dockBusy(w: World, dock: Structure): boolean {
  const ex = exteriorCell(w, dock);
  if (ex < 0) return false;
  return w.ships.some((s) => s.cell === ex);
}

// Push a cinematic ship onto a dock's landing pad: it flies in along the dock's
// outward axis (dx,dy), parks, then departs the same way.
function spawnShip(w: World, dock: Structure, opts: Partial<Ship>): void {
  const ex = exteriorCell(w, dock);
  if (ex < 0) return;
  const d = ex - dock.cell;
  const dx = d === 1 ? 1 : d === -1 ? -1 : 0;
  const dy = d === w.w ? 1 : d === -w.w ? -1 : 0;
  w.ships.push({ cell: ex, t: 0, dx, dy, prog: 0, phase: "in", ...opts });
}

// A landed passenger shuttle disgorges its guests at the dock's interior access
// cell, capped by hotel rooms actually free right now (in case one was removed).
function dropGuests(w: World, sh: Ship): void {
  let dock: Structure | undefined;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "dock" && exteriorCell(w, s) === sh.cell) {
      dock = s;
      break;
    }
  }
  if (!dock) return;
  const access = accessCell(w, dock);
  if (access < 0) return;
  let hotels = 0;
  let guests = 0;
  for (const id in w.structures) if (w.structures[id].kind === "hotel") hotels++;
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.guest) guests++;
  }
  const room = Math.max(0, hotels - guests);
  const n = Math.min(sh.guests ?? 0, room);
  for (let i = 0; i < n; i++) addAgent(w, access % w.w, (access / w.w) | 0, "drenn", true);
}
