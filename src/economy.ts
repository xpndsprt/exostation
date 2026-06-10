import { World } from "./types";
import { addAgent, accessCell, exteriorCell } from "./world";
import { TRAITS } from "./species";

const SPAWN_INTERVAL = 20; // seconds between guest arrivals per dock
const LODGING_RATE = 1.5; // credits per second per living guest
const SHIP_TIME = 14; // seconds a ship stays parked at the dock
const TRADE_INTERVAL = 30; // seconds between trader visits
const TRADE_BATCH = 25; // max minerals sold per trade
const MINERAL_PRICE = 3; // credits per mineral

export function economySystem(w: World, dt: number): void {
  // ships depart over time
  for (let i = w.ships.length - 1; i >= 0; i--) {
    w.ships[i].t -= dt;
    if (w.ships[i].t <= 0) w.ships.splice(i, 1);
  }

  let guests = 0;
  let hasDrenn = false; // Drenn merchant trait raises mineral prices
  for (const id in w.agents) {
    const a = w.agents[id];
    if (!a.alive) continue;
    if (a.guest) guests++;
    if (a.species === "drenn") hasDrenn = true;
  }
  w.credits += guests * LODGING_RATE * dt;

  let hotels = 0; // guest capacity = Hotel Rooms
  let hasTradeHub = false; // a powered Trade Hub lets traders buy minerals
  const docks = [];
  for (const id in w.structures) {
    const s = w.structures[id];
    if (s.kind === "hotel") hotels++;
    else if (s.kind === "dock") docks.push(s);
    else if (s.kind === "tradehub" && s.powered) hasTradeHub = true;
  }

  // guest arrivals (need a free hotel room AND a powered dock)
  for (const dock of docks) {
    if (!dock.powered) continue;
    dock.timer += dt;
    if (dock.timer >= SPAWN_INTERVAL) {
      dock.timer -= SPAWN_INTERVAL;
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

  // traders buy minerals — but only if you run a powered Trade Hub (your
  // trading station). A ship visibly parks at a dock if you have one.
  w.tradeTimer += dt;
  if (w.tradeTimer >= TRADE_INTERVAL) {
    w.tradeTimer -= TRADE_INTERVAL;
    if (hasTradeHub && w.stock.minerals > 0) {
      const amount = Math.min(w.stock.minerals, TRADE_BATCH);
      w.stock.minerals -= amount;
      w.credits += amount * MINERAL_PRICE * (hasDrenn ? TRAITS.drennTrade : 1);
      const dock = docks.find((d) => d.powered);
      if (dock) {
        const ex = exteriorCell(w, dock);
        if (ex >= 0) w.ships.push({ cell: ex, t: SHIP_TIME, trader: true });
      }
    }
  }
}
