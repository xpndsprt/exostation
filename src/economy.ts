import { GasKind, Ship, Species, Structure, World } from "./types";
import { addAgent, accessCell, exteriorCell, GUEST_STAY } from "./world";
import { SPECIES, TRAITS } from "./species";
import { getRep } from "./requests";
import { STRUCTURES, isDock, DOCK_TIER, DockKind } from "./structures";
import { beaconActive } from "./beacon";
import { activeDoctrine } from "./research";

const MODULE_UPKEEP = 0.15; // credits/s per powered, operating module
const WAGE = 0.2; // credits/s per resident crew member

const SPAWN_INTERVAL = 20; // seconds between guest arrivals per dock
const LODGING_RATE = 1.5; // credits per second per living guest
const SHIP_TIME = 14; // seconds a trader/crew shuttle stays parked
const IN_TIME = 13; // seconds for the cinematic approach — a slow, graceful glide in
const OUT_TIME = 10; // seconds for the cinematic departure
const SHIP_GAP = 1; // quiet seconds between ship arrivals (cooldown on the wormhole)
const TRADE_INTERVAL = 30; // seconds between trader visits
const TRADE_BATCH = 25; // max minerals sold per trade
const MINERAL_PRICE = 3; // credits per mineral
const FUEL_PRICE = 4; // credits per fuel unit a docking ship buys
const CREW_INTERVAL = 12; // seconds between resident-crew shuttle arrivals

// Species that live aboard as resident crew (Drenn/Vorn only ever visit as guests).
export const RESIDENT_SPECIES: Species[] = ["human", "thol", "vryl", "korro", "chlorithe", "naaz", "voltaar", "sszra"];
// Visitor species you can prep a Hotel Room for (the union of the gas guest pools).
export const HOTEL_SPECIES: Species[] = ["drenn", "human", "vryl", "vorn", "thol"];
// Visitor species per breathing gas — every gas gets its own "trader class" so a
// methane wing draws paying guests too. The first entry is the standard-dock
// visitor; larger berths cycle the whole list for a species mix. All entries
// breathe the keyed gas, so they're safe in a hotel of that gas.
const GUEST_POOL: Record<GasKind, Species[]> = {
  o2: ["drenn", "human", "vryl"],
  ch4: ["vorn", "thol"],
  cl2: [], // exotic Tier-3 gases have no visiting trader class (residents only)
  nh3: [],
  h2: [],
};

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
        // every docking ship buys fuel (if we have any) — the point of bigger
        // docks: a huge ship buys a lot of fuel. A Vorn fuel-baron aboard raises
        // the price paid. Fuel → credits.
        const sold = Math.min(w.stock.fuel, sh.fuelNeed ?? 0);
        if (sold > 0) {
          w.stock.fuel -= sold;
          w.credits += sold * FUEL_PRICE * (vornAboard(w) ? TRAITS.vornFuel : 1);
        }
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
  const guestsByGas: Record<string, number> = {}; // guests already aboard, per gas
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    if (a.guest) {
      guests++;
      const g = SPECIES[a.species].gas;
      guestsByGas[g] = (guestsByGas[g] || 0) + 1;
    } else {
      residents++;
      resCount[a.species] = (resCount[a.species] || 0) + 1;
    }
    if (a.species === "drenn") hasDrenn = true;
  }
  const hospitality = activeDoctrine(w) === "hospitality";
  w.credits += guests * LODGING_RATE * (hospitality ? 1.5 : 1) * dt; // Hospitality doctrine

  let hasTradeHub = false; // a powered Trade Hub lets traders buy minerals
  let hasCargoEx = false; // a Cargo Exchange: bigger/faster/better trades
  // Lodging is prepped per species (the room's `recipe`). A bunk only counts if it
  // sits in that species' breathable gas. Capacity is therefore per species.
  const podCap: Partial<Record<Species, number>> = {}; // Crew Quarters by prepped species
  const hotelCap: Partial<Record<Species, number>> = {}; // Hotel Rooms by prepped species
  const docks: Structure[] = [];
  let operating = 0; // powered, running modules — they cost upkeep
  for (const id in w.structures) {
    const s = w.structures[id];
    if (STRUCTURES[s.kind].draw > 0 && s.powered) operating++;
    if (s.kind === "pod" || s.kind === "hotel") {
      const sp = s.recipe as Species;
      if (!SPECIES[sp]) continue;
      const rid = w.cells[s.cell].roomId;
      const gas = rid >= 0 ? w.rooms[rid]?.gas : undefined;
      if (gas !== SPECIES[sp].gas) continue; // prepped, but not breathable here
      const cap = s.kind === "pod" ? podCap : hotelCap;
      cap[sp] = (cap[sp] || 0) + 1;
    } else if (isDock(s.kind)) docks.push(s);
    else if (s.kind === "tradehub" && s.powered) hasTradeHub = true;
    else if (s.kind === "cargoex" && s.powered) hasCargoEx = true;
  }

  // recurring upkeep — the credit sink: crew wages + operating-module cost. An
  // idle station bleeds; only an active economy (trade/lodging) stays in the black.
  const upkeep = residents * WAGE + operating * MODULE_UPKEEP;
  w.credits = Math.max(0, w.credits - upkeep * dt);

  // guest arrivals — gas-aware (need a free hotel IN THE GUESTS' GAS + a powered
  // dock). Each breathing gas draws its own visitor class: O₂ → Drenn (et al),
  // CH₄ → Vorn — so a methane wing earns lodging too. Free capacity discounts
  // guests already inbound. Drenn reputation shortens the interval.
  // wormhole cooldown: only one arrival can begin per SHIP_GAP window
  w.shipCooldown = Math.max(0, (w.shipCooldown ?? 0) - dt);
  const GASES: GasKind[] = ["o2", "ch4"];
  const inboundByGas: Record<string, number> = {};
  for (const sh of w.ships) {
    if (sh.trader || sh.hostile || sh.phase !== "in") continue;
    const g = sh.gas ?? "o2";
    inboundByGas[g] = (inboundByGas[g] || 0) + (sh.guests ?? 0);
  }
  const freeByGas: Record<string, number> = {};
  for (const g of GASES) {
    let cap = 0; // sum of prepped-hotel capacity across species breathing this gas
    for (const k in hotelCap) if (SPECIES[k as Species].gas === g) cap += hotelCap[k as Species] || 0;
    freeByGas[g] = cap - (guestsByGas[g] || 0) - (inboundByGas[g] || 0);
  }
  const interval = SPAWN_INTERVAL * (hospitality ? 0.7 : 1) * Math.max(0.5, Math.min(1.5, 1 + (50 - getRep(w, "drenn")) / 100));
  for (const dock of docks) {
    if (!dock.powered) continue;
    dock.timer += dt;
    if (dock.timer < interval) continue;
    if (dockBusy(w, dock)) continue; // pad still occupied — hold ready, don't reset
    if ((w.shipCooldown ?? 0) > 0) continue; // wormhole cooling down — retry next tick
    const g = GASES.find((x) => freeByGas[x] >= 1); // a gas we can house guests for
    if (!g || exteriorCell(w, dock) < 0) {
      dock.timer = interval; // hold ready until a room frees / a dock faces space
      continue;
    }
    dock.timer -= interval;
    const k = Math.min(DOCK_TIER[dock.kind as DockKind].guests, freeByGas[g]);
    spawnShip(w, dock, { guests: k, gas: g, race: g === "ch4" ? "vorn" : "drenn" }); // guest shuttle = the gas's visitor class
    freeByGas[g] -= k;
  }

  // resident immigration — a shuttle brings new crew when there is a free bunk
  // (Crew Quarters capacity), a powered dock, a bunk sitting in their breathable
  // air, and food they can eat already stocked. One arrival per interval; if a
  // slot opens later the shuttle comes as soon as the next interval ticks.
  w.crewTimer += dt;
  if (w.crewTimer >= CREW_INTERVAL && (w.shipCooldown ?? 0) <= 0) {
    const arrived = tryCrewArrival(w, docks, podCap, resCount);
    w.crewTimer = arrived ? 0 : CREW_INTERVAL; // hold ready until a slot frees
  }

  // traders buy minerals — needs a powered Trade Hub, or a Cargo Exchange which
  // trades bigger batches, more often, at a better price. A ship parks at a dock.
  const tradeEvery = hasCargoEx ? 20 : TRADE_INTERVAL;
  w.tradeTimer += dt;
  if (w.tradeTimer >= tradeEvery && (w.shipCooldown ?? 0) <= 0) {
    w.tradeTimer -= tradeEvery;
    // minerals crew have physically delivered to a hub sell first; the rest comes
    // straight from the warehouse so trade still works without haulers.
    const hubs = Object.values(w.structures).filter((s) => (s.kind === "tradehub" || s.kind === "cargoex") && s.powered);
    const staged = hubs.reduce((n, h) => n + h.inBuf, 0);
    const available = w.stock.minerals + staged;
    if ((hasTradeHub || hasCargoEx) && available > 0) {
      const batch = hasCargoEx ? 60 : TRADE_BATCH;
      const exBonus = hasCargoEx ? 1.5 : 1;
      const nexus = beaconActive(w, "tradenexus") ? 1.5 : 1; // Drenn Trade Nexus
      const amount = Math.min(available, batch);
      let rem = amount;
      for (const h of hubs) { const take = Math.min(rem, h.inBuf); h.inBuf -= take; rem -= take; if (rem <= 0) break; }
      if (rem > 0) w.stock.minerals -= rem; // remainder from the warehouse
      w.credits += amount * MINERAL_PRICE * exBonus * nexus * w.priceMult * (hasDrenn ? TRAITS.drennTrade : 1);
      const dock = docks.find((d) => d.powered && exteriorCell(w, d) >= 0 && !dockBusy(w, d));
      if (dock) spawnShip(w, dock, { trader: true, race: "drenn" }); // the Drenn merchant class
    }
  }
}

// Returns true if a resident was brought aboard this call.
function tryCrewArrival(
  w: World,
  docks: Structure[],
  podCap: Partial<Record<Species, number>>,
  resCount: Partial<Record<Species, number>>,
): boolean {
  // need a powered dock whose landing pad is free right now (one ship per pad)
  const dock = docks.find((d) => d.powered && exteriorCell(w, d) >= 0 && !dockBusy(w, d));
  if (!dock) return false;
  const access = accessCell(w, dock);
  if (access < 0) return false;

  // Who can we host: a species with a FREE bunk prepped for it (capacity above the
  // number already aboard) and food of their line stocked.
  const eligible = RESIDENT_SPECIES.filter(
    (sp) => (podCap[sp] || 0) > (resCount[sp] || 0) && w.stock.meals[SPECIES[sp].diet] > 0,
  );
  if (eligible.length === 0) return false;
  // Favour diversity: bring whichever eligible species has the fewest aboard.
  eligible.sort((a, b) => (resCount[a] || 0) - (resCount[b] || 0));
  const sp = eligible[0];

  if (!addAgent(w, access % w.w, (access / w.w) | 0, sp, false)) return false;
  if (exteriorCell(w, dock) >= 0) spawnShip(w, dock, { race: sp }); // crew shuttle = the arriving race
  return true;
}

// Is a (living) Vorn fuel-baron aboard? Raises the price ships pay for fuel.
function vornAboard(w: World): boolean {
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && a.species === "vorn") return true;
  }
  return false;
}

// A dock's landing pad is occupied while any ship sits on its exterior cell —
// from approach through departure — so only one ship uses a pad at a time.
function dockBusy(w: World, dock: Structure): boolean {
  const ex = exteriorCell(w, dock);
  if (ex < 0) return false;
  return w.ships.some((s) => s.cell === ex);
}

// Push a cinematic ship onto a dock's landing pad: it flies in along the dock's
// outward axis (dx,dy), parks, then departs. Ship scale + fuel purchase come from
// the dock tier (a Spaceport lands a size-3 ship that buys a lot of fuel).
function spawnShip(w: World, dock: Structure, opts: Partial<Ship>): void {
  const ex = exteriorCell(w, dock);
  if (ex < 0) return;
  const d = ex - dock.cell;
  const dx = d === 1 ? 1 : d === -1 ? -1 : 0;
  const dy = d === w.w ? 1 : d === -w.w ? -1 : 0;
  const tier = DOCK_TIER[dock.kind as DockKind] ?? DOCK_TIER.dock;
  w.ships.push({ cell: ex, t: 0, dx, dy, prog: 0, phase: "in", size: tier.size, fuelNeed: tier.fuelNeed, ...opts });
  w.shipCooldown = SHIP_GAP; // hold the wormhole quiet for a beat before the next arrival
}

// A landed passenger shuttle disgorges its guests at the dock's interior access
// cell, capped by hotel rooms actually free right now (in case one was removed).
// Standard berths land Drenn; larger berths bring a wider species mix (cosmetic
// variety — all O₂ visitors so they're safe in an O₂ hotel).
function dropGuests(w: World, sh: Ship): void {
  let dock: Structure | undefined;
  for (const id in w.structures) {
    const s = w.structures[id];
    if (isDock(s.kind) && exteriorCell(w, s) === sh.cell) {
      dock = s;
      break;
    }
  }
  if (!dock) return;
  const access = accessCell(w, dock);
  if (access < 0) return;
  const gas: GasKind = sh.gas ?? "o2";
  // Disembark only into hotels PREPPED for each species (in its gas). Walk this
  // gas's visitor classes, filling each species' free prepped hotels in turn.
  let remaining = sh.guests ?? 0;
  for (const sp of GUEST_POOL[gas]) {
    if (remaining <= 0) break;
    if (!SPECIES[sp]) continue;
    let cap = 0;
    for (const id in w.structures) {
      const s = w.structures[id];
      if (s.kind !== "hotel" || s.recipe !== sp) continue;
      const rid = w.cells[s.cell].roomId;
      if ((rid >= 0 ? w.rooms[rid]?.gas : undefined) === SPECIES[sp].gas) cap++;
    }
    let have = 0;
    for (const id in w.agents) {
      const a = w.agents[id];
      if (a.alive && a.guest && a.species === sp) have++;
    }
    const n = Math.min(remaining, Math.max(0, cap - have));
    for (let i = 0; i < n; i++) addAgent(w, access % w.w, (access / w.w) | 0, sp, true);
    remaining -= n;
  }
}
