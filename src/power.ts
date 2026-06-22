import { Structure, World } from "./types";
import { STRUCTURES } from "./structures";

const FUSION_FUEL = 0.6; // minerals/s burned by a running Fusion Reactor

// Power network with conduit routing. Supply vs draw with a battery buffer and
// priority brownout, PLUS spatial reach: power radiates a few tiles from every
// generator/battery, and a non-broken conduit relays it onward (refreshing the
// reach), so distant modules need cabling. A consumer the grid can't reach is dark.
const SURGE_BONUS = 9999; // free supply a weird-god power surge adds to the grid
const SOURCE_REACH = 6; // tiles a generator/battery radiates power (Chebyshev)
const CONDUIT_REACH = 6; // tiles a conduit relays onward (resets the budget)

// Returns a per-cell flag: is this cell within the energized power grid? Power
// spreads from source cells (generators/batteries) up to SOURCE_REACH through any
// cell; stepping onto a non-broken conduit resets the budget to CONDUIT_REACH, so
// chains of conduit carry power across the whole station.
function gridReach(w: World): Int8Array {
  const N = w.w * w.h;
  const best = new Int8Array(N).fill(-1); // best remaining budget reaching each cell
  const conduit = new Uint8Array(N); // non-broken conduit cells
  for (const c of w.conduits) if (c.hp > 0) conduit[c.cell] = 1;
  const q: number[] = [];
  for (const id in w.structures) {
    const s = w.structures[id];
    const def = STRUCTURES[s.kind];
    if (def.gen <= 0 && def.battery <= 0) continue; // only generators/batteries anchor the grid
    for (const cell of s.cells ?? [s.cell]) {
      if (best[cell] < SOURCE_REACH) { best[cell] = SOURCE_REACH; q.push(cell); }
    }
  }
  let head = 0;
  while (head < q.length) {
    const c = q[head++];
    const b = best[c];
    if (b <= 0) continue; // reached but out of budget — can't radiate further
    const cx = c % w.w, cy = (c / w.w) | 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
        const n = ny * w.w + nx;
        const nb = conduit[n] ? CONDUIT_REACH : b - 1; // conduits relay (refresh reach)
        if (nb > best[n]) { best[n] = nb; q.push(n); }
      }
  }
  return best;
}

// Is any footprint cell of a structure within the energized grid?
function onGrid(reach: Int8Array, s: Structure): boolean {
  for (const cell of s.cells ?? [s.cell]) if (reach[cell] >= 0) return true;
  return false;
}

export function powerSystem(w: World, dt: number): void {
  // A weird-god blackout ("The Hollow") kills the whole grid for its duration —
  // every consumer goes dark and the battery can't coast it. Generators idle.
  if (w.blackoutT > 0) {
    for (const id in w.structures) w.structures[id].powered = false; // nothing is powered

    w.power.supply = 0;
    w.power.draw = 0;
    w.power.brownout = true;
    return;
  }

  let supply = w.surgeT > 0 ? SURGE_BONUS : 0; // a power surge ("The Dynamo") floods the grid
  let batteryMax = 0;
  let draw = 0;
  const consumers: Structure[] = [];
  const reach = gridReach(w); // which cells the cabling/generators energize
  // Only gate on grid-reach when a generator/battery actually exists. With none at
  // all it's a total blackout — let the normal supply/brownout path handle that, so
  // an off-grid module reads as "unwired", not the whole station as a brownout.
  let hasSource = false;
  for (const id in w.structures) { const d = STRUCTURES[w.structures[id].kind]; if (d.gen > 0 || d.battery > 0) { hasSource = true; break; } }

  for (const id in w.structures) {
    const s = w.structures[id];
    const def = STRUCTURES[s.kind];
    // broken machinery (worn to 0) is dead: no draw, no function
    if (def.draw > 0 && s.condition <= 0) {
      s.powered = false;
      continue;
    }
    // a consumer the power grid can't reach (no nearby generator/battery and no
    // conduit run to it) stays dark — wire it up to bring it online
    if (hasSource && def.draw > 0 && def.gen <= 0 && def.battery <= 0 && !onGrid(reach, s)) {
      s.powered = false;
      continue;
    }
    // a power-surge fault takes a module fully offline (no gen, no draw)
    if (s.faultT > 0) {
      s.powered = false;
      continue;
    }
    // Fusion Reactor burns minerals — out of fuel, it produces nothing, so you
    // need a Bot Bay mining to keep it lit.
    if (s.kind === "fusion") {
      if (w.stock.minerals > 0) {
        supply += def.gen;
        s.powered = true;
        if (dt > 0) w.stock.minerals = Math.max(0, w.stock.minerals - FUSION_FUEL * dt);
      } else {
        s.powered = false;
      }
      continue;
    }
    supply += def.gen;
    batteryMax += def.battery;
    if (def.draw > 0 && s.on) {
      consumers.push(s);
      draw += def.draw;
    } else {
      // generators/batteries always "powered"; a switched-off consumer is not
      s.powered = def.draw === 0;
    }
  }

  w.power.batteryMax = batteryMax;
  if (w.power.battery > batteryMax) w.power.battery = batteryMax;

  let brownout = false;

  if (supply >= draw) {
    for (const s of consumers) s.powered = true;
    w.power.battery = Math.min(batteryMax, w.power.battery + (supply - draw) * dt);
  } else {
    const need = (draw - supply) * dt;
    // Coast on the battery. At dt=0 (paused / a refresh redraw) `need` is 0, so
    // a charged battery sustains the station without draining — without this the
    // pause path would force a brownout and zero the battery every redraw.
    const coast = dt > 0 ? w.power.battery >= need : w.power.battery > 0;
    if (coast) {
      for (const s of consumers) s.powered = true;
      w.power.battery -= need;
    } else {
      // Brownout: shed lowest-priority consumers until draw <= supply.
      brownout = true;
      w.power.battery = 0;
      const asc = [...consumers].sort(
        (a, b) => STRUCTURES[a.kind].priority - STRUCTURES[b.kind].priority,
      );
      for (const s of asc) s.powered = true;
      let running = draw;
      for (const s of asc) {
        if (running <= supply) break;
        s.powered = false;
        running -= STRUCTURES[s.kind].draw;
      }
    }
  }

  let activeDraw = 0;
  for (const s of consumers) if (s.powered) activeDraw += STRUCTURES[s.kind].draw;

  w.power.supply = supply;
  w.power.draw = activeDraw;
  w.power.brownout = brownout;
}
