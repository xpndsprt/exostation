import { Structure, World } from "./types";
import { STRUCTURES } from "./structures";

// Station-wide single power network (MVP simplification — no conduit routing).
// Supply vs draw; battery buffers surplus; brownouts shed consumers by
// ascending priority so Life Support (high priority) stays on the longest.
export function powerSystem(w: World, dt: number): void {
  let supply = 0;
  let batteryMax = 0;
  let draw = 0;
  const consumers: Structure[] = [];

  for (const id in w.structures) {
    const s = w.structures[id];
    const def = STRUCTURES[s.kind];
    // broken machinery (worn to 0) is dead: no draw, no function
    if (def.draw > 0 && s.condition <= 0) {
      s.powered = false;
      continue;
    }
    // a power-surge fault takes a module fully offline (no gen, no draw)
    if (s.faultT > 0) {
      s.powered = false;
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
    if (dt > 0 && w.power.battery >= need) {
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
