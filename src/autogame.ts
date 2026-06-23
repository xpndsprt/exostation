// Autogame — a hardcoded, deterministic agent that builds a winning station and
// drives it to victory (all five Beacon nodes charged). It is a TEST harness: it
// subsidizes credits so the economy can never deadlock, then lays a fixed
// blueprint of five sealed beacon chambers (one species each, so no in-room
// fighting), wires power, researches the beacon tech, and seeds the right species
// into each chamber. beaconSystem then charges the nodes to 100% → the game wins.
//
// State is module-level (not serialized) — this is a debugging tool, not sim state.
import { World, Species, StructureKind, GasKind } from "./types";
import { setCell, addStructureMulti, addConduit, addAgent, idx, inBounds } from "./world";
import { solarFootprint, footprintCells } from "./placement";
import { buyUnlock, isUnlocked } from "./research";
import { beaconCharged } from "./beacon";

type Chamber = { x: number; gas: GasKind; gen: StructureKind; beacon: StructureKind; sp: Species; unlock: string };
const Y0 = 12; // interior top row of every chamber
const IW = 8, IH = 8; // interior size
const CHAMBERS: Chamber[] = [
  { x: 6, gas: "o2", gen: "o2gen", beacon: "cmdhub", sp: "human", unlock: "cmdhub" },
  { x: 20, gas: "o2", gen: "o2gen", beacon: "tradenexus", sp: "drenn", unlock: "tradenexus" },
  { x: 34, gas: "ch4", gen: "ch4gen", beacon: "autoforge", sp: "thol", unlock: "autoforge" },
  { x: 48, gas: "o2", gen: "o2gen", beacon: "bloomgarden", sp: "vryl", unlock: "bloomgarden" },
  { x: 62, gas: "o2", gen: "o2gen", beacon: "orerefinery", sp: "korro", unlock: "korro" },
];
const LAB = { x: 6, y: 30, iw: 12, ih: 4 }; // a small powered platform of 3 Research Labs

const AG = { on: false, phase: 0, t: 0 };

export function autogameOn(): boolean { return AG.on; }
export function setAutogame(v: boolean): void {
  AG.on = v;
  if (v) { AG.phase = 0; AG.t = 0; }
}

// ---- blueprint helpers ----
function box(w: World, x0: number, y0: number, iw: number, ih: number): void {
  for (let y = y0 - 1; y <= y0 + ih; y++)
    for (let x = x0 - 1; x <= x0 + iw; x++) {
      if (!inBounds(w, x, y)) continue;
      const border = x === x0 - 1 || x === x0 + iw || y === y0 - 1 || y === y0 + ih;
      setCell(w, x, y, border ? "wall" : "floor");
    }
}
function fillConduit(w: World, x0: number, y0: number, iw: number, ih: number): void {
  for (let y = y0; y < y0 + ih; y++) for (let x = x0; x < x0 + iw; x++) addConduit(w, x, y);
}
// mount a solar above a room's top wall (extends up into space). `interiorTopY` is
// the room's top interior row; the wall is one above it, the panel one above that.
function solarTop(w: World, sx: number, interiorTopY: number): boolean {
  const fp = solarFootprint(w, sx, interiorTopY - 2); // the space cell just above the top wall
  if (!fp) return false;
  return addStructureMulti(w, "solar", fp);
}
function place(w: World, kind: StructureKind, x: number, y: number): boolean {
  const fp = footprintCells(w, kind, x, y);
  if (!fp) return false;
  return addStructureMulti(w, kind, fp);
}
function hasKind(w: World, kind: StructureKind): number {
  let n = 0;
  for (const id in w.structures) if (w.structures[id].kind === kind) n++;
  return n;
}
// roomId of a chamber (sampled at its free agent cell)
function chamberRoom(w: World, c: Chamber): number {
  const i = idx(w, c.x + 3, Y0 + IH - 1);
  return inBounds(w, c.x + 3, Y0 + IH - 1) ? w.cells[i].roomId : -1;
}

// Build the whole blueprint once (idempotent: skips a chamber that already has its
// generator). Called at phase 0.
function buildAll(w: World): void {
  // lab platform
  if (hasKind(w, "lab") < 3) {
    box(w, LAB.x, LAB.y, LAB.iw, LAB.ih);
    solarTop(w, LAB.x + 1, LAB.y);
    solarTop(w, LAB.x + LAB.iw - 2, LAB.y);
    fillConduit(w, LAB.x, LAB.y, LAB.iw, LAB.ih);
    place(w, "lab", LAB.x, LAB.y);
    place(w, "lab", LAB.x + 4, LAB.y);
    place(w, "lab", LAB.x + 8, LAB.y);
  }
  for (const c of CHAMBERS) {
    box(w, c.x, Y0, IW, IH);
    solarTop(w, c.x + 1, Y0);
    solarTop(w, c.x + IW - 2, Y0);
    fillConduit(w, c.x, Y0, IW, IH);
    place(w, c.gen, c.x, Y0); // 2×2 generator, top-left
    place(w, c.beacon, c.x + 4, Y0); // 2×2 beacon, top-right
  }
}

// Try to research everything the beacons need (subsidized). Non-blocking: placement
// works regardless, but this exercises the real research path.
function doResearch(w: World): void {
  w.credits = Math.max(w.credits, 6000); // test subsidy
  for (const id of ["powerstorage", "robotics", "commerce", "logistics", "methane", "fungal", "cmdhub", "tradenexus", "autoforge", "bloomgarden", "orerefinery"]) {
    if (!isUnlocked(w, id)) buyUnlock(w, id);
  }
}

// Seed each chamber's species when its room is sealed + holds the right gas; if a
// resident already lives there it's left alone. Returns how many chambers are
// staffed (self-healing — re-seeds a chamber whose resident died).
function populate(w: World): number {
  let staffed = 0;
  for (const c of CHAMBERS) {
    const rid = chamberRoom(w, c);
    if (rid < 0) continue;
    let here = false;
    for (const id in w.agents) {
      const a = w.agents[id];
      if (a.alive && a.species === c.sp && w.cells[a.cell].roomId === rid) { here = true; break; }
    }
    if (here) { staffed++; continue; }
    if (w.rooms[rid] && w.rooms[rid].gas === c.gas) { if (addAgent(w, c.x + 3, Y0 + IH - 1, c.sp, false)) staffed++; }
  }
  return staffed;
}

// Called every sim tick from main while autogame is on.
export function autogameStep(w: World): void {
  if (!AG.on) return;
  if (w.phase === "won" || w.phase === "lost") { AG.on = false; return; } // done
  AG.t++;
  if (AG.phase === 0) {
    w.credits = Math.max(w.credits, 6000);
    buildAll(w);
    AG.phase = 1; AG.t = 0;
  } else if (AG.phase === 1) {
    // let rooms recompute + atmosphere fill + power settle, researching meanwhile
    doResearch(w);
    if (AG.t > 15) { AG.phase = 2; AG.t = 0; }
  } else if (AG.phase === 2) {
    doResearch(w);
    if (populate(w) >= CHAMBERS.length) { AG.phase = 3; AG.t = 0; }
    if (AG.t > 300) { AG.phase = 3; AG.t = 0; } // give up waiting; charge what we have
  } else {
    // phase 3: idle while the beacons charge; keep crew solvent + re-seed if a
    // chamber lost its resident (suffocation/edge cases).
    w.credits = Math.max(w.credits, 6000);
    populate(w);
    if (beaconCharged(w) >= 5) AG.on = false; // done — main flips phase to "won"
  }
}
