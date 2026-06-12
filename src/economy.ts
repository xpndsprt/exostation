import { Species, Structure, World } from "./types";
import { addAgent, accessCell, exteriorCell } from "./world";
import { SPECIES, TRAITS } from "./species";
import { getRep } from "./requests";
import { STRUCTURES } from "./structures";

const MODULE_UPKEEP = 0.15; // credits/s per powered, operating module
const WAGE = 0.2; // credits/s per resident crew member

const SPAWN_INTERVAL = 20; // seconds between guest arrivals per dock
const LODGING_RATE = 1.5; // credits per second per living guest
const SHIP_TIME = 14; // seconds a ship stays parked at the dock
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

  // ships depart over time
  for (let i = w.ships.length - 1; i >= 0; i--) {
    w.ships[i].t -= dt;
    if (w.ships[i].t <= 0) w.ships.splice(i, 1);
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
  }

  // recurring upkeep — the credit sink: crew wages + operating-module cost. An
  // idle station bleeds; only an active economy (trade/lodging) stays in the black.
  const upkeep = residents * WAGE + operating * MODULE_UPKEEP;
  w.credits = Math.max(0, w.credits - upkeep * dt);

  // guest arrivals (need a free hotel room AND a powered dock). Drenn reputation
  // shortens the interval — well-liked stations get more visitors.
  const interval = SPAWN_INTERVAL * Math.max(0.5, Math.min(1.5, 1 + (50 - getRep(w, "drenn")) / 100));
  for (const dock of docks) {
    if (!dock.powered) continue;
    dock.timer += dt;
    if (dock.timer >= interval) {
      dock.timer -= interval;
      if (guests < hotels) {
        const access = accessCell(w, dock);
        if (access < 0) continue;
        if (addAgent(w, access % w.w, (access / w.w) | 0, "drenn", true)) {
          guests++;
          const ex = exteriorCell(w, dock);
          if (ex >= 0) w.ships.push({ cell: ex, t: SHIP_TIME });
        }
      }
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

  // traders buy minerals — but only if you run a powered Trade Hub (your
  // trading station). A ship visibly parks at a dock if you have one.
  w.tradeTimer += dt;
  if (w.tradeTimer >= TRADE_INTERVAL) {
    w.tradeTimer -= TRADE_INTERVAL;
    if (hasTradeHub && w.stock.minerals > 0) {
      const amount = Math.min(w.stock.minerals, TRADE_BATCH);
      w.stock.minerals -= amount;
      w.credits += amount * MINERAL_PRICE * w.priceMult * (hasDrenn ? TRAITS.drennTrade : 1);
      const dock = docks.find((d) => d.powered);
      if (dock) {
        const ex = exteriorCell(w, dock);
        if (ex >= 0) w.ships.push({ cell: ex, t: SHIP_TIME, trader: true });
      }
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
  const dock = docks.find((d) => d.powered);
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
  const ex = exteriorCell(w, dock);
  if (ex >= 0) w.ships.push({ cell: ex, t: SHIP_TIME });
  return true;
}
