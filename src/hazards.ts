import { GasKind, World } from "./types";
import { STRUCTURES } from "./structures";
import { eraseAt } from "./world";
import { injure } from "./medical";

// Tier-3 atmosphere hazards. Runs right after atmosphere (which sets room gases):
//  - Chlorine (Cl₂) is CORROSIVE: machinery in a Cl₂ room wears out far faster,
//    so a Chlorithe wing demands constant upkeep. Life-support generators are
//    spared so the wing can't silently death-spiral itself airless.
//  - Hydrogen (H₂) is EXPLOSIVE: mix it with oxygen in ONE room and it detonates —
//    the blast wrecks the modules there, wounds everyone present, blows a hull
//    breach, and destroys the offending generators (so the mix can't persist).
const CORRODE_RATE = 0.5; // extra condition/s lost by active machinery in a Cl₂ room
const BLAST_DAMAGE = 70; // condition torn off each (non-generator) module in an ignition
const BLAST_INJURY = 55; // wound severity inflicted on agents caught in the blast

const ADJ = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export function hazardSystem(w: World, dt: number): void {
  // Per-room: which gases the powered generators emit, and which modules sit there.
  const gases: Record<number, Set<GasKind>> = {};
  const modules: Record<number, number[]> = {};
  for (const id in w.structures) {
    const s = w.structures[id];
    const rid = w.cells[s.cell].roomId;
    if (rid < 0) continue;
    (modules[rid] ??= []).push(s.id);
    if (s.powered) {
      const gas = STRUCTURES[s.kind].gas;
      if (gas) (gases[rid] ??= new Set<GasKind>()).add(gas);
    }
  }

  // --- corrosion: Cl₂ eats its room's active machinery (not life support) ---
  if (dt > 0) {
    for (const id in w.structures) {
      const s = w.structures[id];
      const rid = w.cells[s.cell].roomId;
      const room = rid >= 0 ? w.rooms[rid] : undefined;
      if (!room || room.gas !== "cl2") continue;
      if (STRUCTURES[s.kind].gas) continue; // spare life-support generators
      if (STRUCTURES[s.kind].draw <= 0) continue; // only powered machinery corrodes
      s.condition = Math.max(0, s.condition - CORRODE_RATE * dt);
    }
  }

  // --- explosion: H₂ + O₂ in one room ignites (deterministic — a layout error) ---
  for (const rid in gases) {
    const set = gases[rid];
    if (set.has("h2") && set.has("o2")) detonate(w, Number(rid), modules[rid] ?? []);
  }
}

function detonate(w: World, rid: number, moduleIds: number[]): void {
  // wound everyone in the room
  for (const id in w.agents) {
    const a = w.agents[id];
    if (a.alive && w.cells[a.cell].roomId === rid) injure(w, a.id, BLAST_INJURY);
  }
  // wreck the modules; destroy the offending generators so the mix can't reform
  for (const sid of moduleIds) {
    const s = w.structures[sid];
    if (!s) continue;
    if (STRUCTURES[s.kind].gas) eraseAt(w, s.cell % w.w, (s.cell / w.w) | 0);
    else s.condition = Math.max(0, s.condition - BLAST_DAMAGE);
  }
  breachRoom(w, rid);
  w.notify.push("💥 Hydrogen ignition! Never mix H₂ and O₂ in one room.");
}

// Blow one wall bordering the room out to space (an open breach crew must reseal).
function breachRoom(w: World, rid: number): void {
  for (let i = 0; i < w.cells.length; i++) {
    if (w.cells[i].type !== "wall" || w.cells[i].structureId >= 0) continue; // skip docks etc.
    const x = i % w.w;
    const y = (i / w.w) | 0;
    let touchesRoom = false;
    let touchesSpace = false;
    for (const [dx, dy] of ADJ) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w.w || ny >= w.h) continue;
      const n = w.cells[ny * w.w + nx];
      if (n.type === "floor" && n.roomId === rid) touchesRoom = true;
      if (n.type === "space") touchesSpace = true;
    }
    if (touchesRoom && touchesSpace) {
      w.cells[i].type = "space";
      w.dirtyRooms = true;
      w.breaches.push({ cell: i, sealer: -1, progress: 0 });
      return;
    }
  }
}
