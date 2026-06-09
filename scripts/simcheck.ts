// Headless sanity check for the M2/M3 systems. Run: npx tsx scripts/simcheck.ts
import { createWorld, setCell, addStructure, addSite, addAgent, eraseAt, idx } from "../src/world";
import { recomputeRooms } from "../src/rooms";
import { findPath } from "../src/pathfind";
import { powerSystem } from "../src/power";
import { miningSystem } from "../src/mining";
import { foodSystem } from "../src/food";
import { atmosphereSystem } from "../src/atmosphere";
import { agentSystem } from "../src/agents";
import { moodSystem } from "../src/mood";
import { combatSystem } from "../src/combat";
import { economySystem } from "../src/economy";
import { saveWorld, loadWorld } from "../src/persistence";
import { World } from "../src/types";

// Minimal localStorage shim so persistence works under tsx/node.
(globalThis as unknown as { localStorage: Storage }).localStorage = (() => {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
  } as unknown as Storage;
})();

const DT = 0.1;
function step(w: World) {
  if (w.dirtyRooms) recomputeRooms(w);
  powerSystem(w, DT);
  miningSystem(w, DT);
  foodSystem(w, DT);
  atmosphereSystem(w);
  agentSystem(w, DT);
  moodSystem(w, DT);
  combatSystem(w, DT);
  economySystem(w, DT);
}

let failures = 0;
function check(name: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) failures++;
}

const w = createWorld();
// Carve a sealed 4x4 block at (10,10): border walls, interior floor.
for (let y = 10; y <= 13; y++) {
  for (let x = 10; x <= 13; x++) {
    const border = x === 10 || x === 13 || y === 10 || y === 13;
    setCell(w, x, y, border ? "wall" : "floor");
  }
}
recomputeRooms(w);
const interior = idx(w, 11, 11);
check("interior floor is enclosed", w.cells[interior].enclosed === true);

addStructure(w, "o2gen", 11, 11);
addStructure(w, "solar", 12, 12); // +10 supply
addAgent(w, 12, 11);

for (let i = 0; i < 20; i++) step(w); // 2s
const agent = Object.values(w.agents)[0];
check("solar covers o2gen (no brownout)", w.power.brownout === false);
check("o2gen powered", Object.values(w.structures).find((s) => s.kind === "o2gen")!.powered);
check("room breathable", Object.values(w.rooms).some((r) => r.gas === "o2"));
check("agent O2 stays full in air", agent.o2 === 100 && agent.alive);

// Cut power: remove the solar panel. o2gen has no supply and no battery.
eraseAt(w, 12, 12);
for (let i = 0; i < 5; i++) step(w);
check("brownout after losing solar", w.power.brownout === true);
check("o2gen unpowered", Object.values(w.structures).find((s) => s.kind === "o2gen")!.powered === false);
check("room no longer breathable", Object.values(w.rooms).every((r) => r.gas !== "o2"));

for (let i = 0; i < 200; i++) step(w); // 20s without air
check("agent suffocates", agent.alive === false && agent.o2 === 0);

// --- M4: needs + pathfinding (eat & sleep) ---
const w2 = createWorld();
// Carve a sealed 1-row corridor room: walls around y 5..7, floor row y=6, x=6..13.
for (let y = 5; y <= 7; y++) {
  for (let x = 5; x <= 14; x++) {
    const border = x === 5 || x === 14 || y === 5 || y === 7;
    setCell(w2, x, y, border ? "wall" : "floor");
  }
}
recomputeRooms(w2);
addStructure(w2, "o2gen", 6, 6);
addStructure(w2, "solar", 7, 6);
addStructure(w2, "synth", 9, 6);
addStructure(w2, "pod", 13, 6);
addAgent(w2, 8, 6);
const h = Object.values(w2.agents)[0];

for (let i = 0; i < 30; i++) step(w2); // settle: breathable, alive
check("M4 room breathable", Object.values(w2.rooms).some((r) => r.gas === "o2"));
check("M4 agent alive in air", h.alive && h.o2 === 100);

// Force hunger; meals available -> should walk to synth and eat.
h.food = 8;
w2.stock.meals = 5;
const mealsBefore = w2.stock.meals;
for (let i = 0; i < 25; i++) step(w2); // ~2.5s: time to reach synth (1 cell) and eat
check("M4 agent walked to synth & ate (food restored)", h.food > 90);
check("M4 a meal was consumed", w2.stock.meals === mealsBefore - 1);

// Force tiredness -> should claim a pod, walk there, and sleep to full.
h.rest = 8;
let sleptFull = false;
const pod = Object.values(w2.structures).find((s) => s.kind === "pod")!;
for (let i = 0; i < 140; i++) {
  step(w2);
  if (h.rest >= 100) sleptFull = true; // capture the peak before it decays again
}
check("M4 agent reached pod", h.cell === idx(w2, 13, 6));
check("M4 agent slept to full at some point", sleptFull);
check("M4 pod released after sleeping", pod.occupantId === -1);

// --- M5: mining drone loop ---
const w3 = createWorld();
// Small powered room so the Bot Bay has power.
for (let y = 5; y <= 7; y++) {
  for (let x = 5; x <= 8; x++) {
    const border = x === 5 || x === 8 || y === 5 || y === 7;
    setCell(w3, x, y, border ? "wall" : "floor");
  }
}
recomputeRooms(w3);
addStructure(w3, "solar", 6, 6); // +10 supply covers bay's 4 draw
addStructure(w3, "bay", 7, 6); // spawns one drone
addSite(w3, 20, 6); // asteroid out in space
w3.stock.biomass = 0;
w3.stock.water = 0;

const bay = Object.values(w3.structures).find((s) => s.kind === "bay")!;
const drone = Object.values(w3.drones)[0];
check("M5 bay spawned a docked drone", !!drone && drone.state === "docked");

const site = Object.values(w3.sites)[0];
const richBefore = site.richness;
let sawOutbound = false;
let sawMining = false;
for (let i = 0; i < 200; i++) {
  step(w3);
  if (drone.state === "outbound") sawOutbound = true;
  if (drone.state === "mining") sawMining = true;
}
check("M5 bay is powered", bay.powered);
check("M5 drone flew outbound", sawOutbound);
check("M5 drone mined the site", sawMining);
check("M5 site richness dropped", site.richness < richBefore);
check("M5 drone delivered biomass+water to stock", w3.stock.biomass > 0 && w3.stock.water > 0);

// --- M6: docking port spawns Drenn guests + lodging income ---
const w4 = createWorld();
// Breathable room with power, a dock, and pods (capacity to host).
for (let y = 5; y <= 9; y++) {
  for (let x = 5; x <= 12; x++) {
    const border = x === 5 || x === 12 || y === 5 || y === 9;
    setCell(w4, x, y, border ? "wall" : "floor");
  }
}
recomputeRooms(w4);
addStructure(w4, "solar", 6, 6);
addStructure(w4, "solar", 7, 6); // plenty of power
addStructure(w4, "o2gen", 6, 7);
addStructure(w4, "synth", 7, 7);
addStructure(w4, "dock", 11, 8);
addStructure(w4, "pod", 8, 6);
addStructure(w4, "pod", 9, 6); // capacity 2

let maxGuests = 0;
const seenGuestIds = new Set<number>();
for (let i = 0; i < 1500; i++) {
  step(w4);
  const live = Object.values(w4.agents).filter((a) => a.alive && a.guest);
  for (const g of live) seenGuestIds.add(g.id);
  if (live.length > maxGuests) maxGuests = live.length;
}
const aliveGuests = Object.values(w4.agents).filter((a) => a.alive && a.guest).length;
check("M6 drenn guests arrived via dock", maxGuests >= 1);
check("M6 guest count capped by pods", maxGuests <= 2);
check("M6 lodging earned credits", w4.credits > 0);
check("M6 guests are the drenn species", Object.values(w4.agents).every((a) => !a.guest || a.species === "drenn"));
check("M6 guests depart after their stay", seenGuestIds.size > aliveGuests);

// --- M7: save / load round-trip ---
const w5 = createWorld();
setCell(w5, 3, 3, "floor");
setCell(w5, 4, 3, "floor");
recomputeRooms(w5);
addAgent(w5, 3, 3); // resident (stay = Infinity)
addAgent(w5, 4, 3, "drenn", true); // guest (finite stay)
w5.credits = 123;
w5.stock.meals = 7;

check("M7 save succeeds", saveWorld(w5));
const w6 = loadWorld();
check("M7 load returns a world", !!w6);
if (w6) {
  check("M7 credits preserved", w6.credits === 123);
  check("M7 meals preserved", w6.stock.meals === 7);
  check("M7 agent count preserved", Object.keys(w6.agents).length === 2);
  const agents = Object.values(w6.agents);
  const resident = agents.find((a) => !a.guest)!;
  const guest = agents.find((a) => a.guest)!;
  check("M7 resident stay restored to Infinity", resident.stay === Infinity);
  check("M7 guest stay finite", isFinite(guest.stay) && guest.stay > 0);
  check("M7 rooms marked dirty for recompute", w6.dirtyRooms === true);
}

// --- M9: multi-gas atmospheres + gas-incompatible species ---
function carve(w: World, x0: number, y0: number, x1: number, y1: number) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const border = x === x0 || x === x1 || y === y0 || y === y1;
      setCell(w, x, y, border ? "wall" : "floor");
    }
}

const w7 = createWorld();
carve(w7, 5, 5, 9, 8); // Room A (interior x6-8, y6-7)
carve(w7, 11, 5, 15, 8); // Room B
carve(w7, 17, 5, 21, 8); // Room C
recomputeRooms(w7);
addStructure(w7, "solar", 6, 6);
addStructure(w7, "solar", 7, 6);
addStructure(w7, "solar", 8, 6); // 30 PU == 30 PU draw
addStructure(w7, "o2gen", 6, 7); // Room A: O2
addAgent(w7, 7, 7, "human"); // breathes O2 -> ok
addAgent(w7, 8, 7, "thol"); // needs CH4 in an O2 room -> dies
addStructure(w7, "ch4gen", 12, 6); // Room B: methane
addAgent(w7, 13, 6, "thol"); // breathes CH4 -> ok
addStructure(w7, "o2gen", 18, 6); // Room C: O2 + CH4 = mixed
addStructure(w7, "ch4gen", 19, 6);
addAgent(w7, 20, 6, "human"); // mixed gas -> dies

const gasOf = (cx: number, cy: number) => {
  const rid = w7.cells[idx(w7, cx, cy)].roomId;
  return rid >= 0 ? w7.rooms[rid].gas : "none";
};
const byCell = (cx: number, cy: number) =>
  Object.values(w7.agents).find((a) => a.cell === idx(w7, cx, cy));

for (let i = 0; i < 20; i++) step(w7);
check("M9 O2 room reads o2", gasOf(7, 7) === "o2");
check("M9 methane room reads ch4", gasOf(13, 6) === "ch4");
check("M9 two gases = mixed (lethal)", gasOf(20, 6) === "mixed");

for (let i = 0; i < 200; i++) step(w7);
check("M9 human breathes O2", byCell(7, 7)!.alive === true);
check("M9 thol breathes methane", byCell(13, 6)!.alive === true);
check("M9 thol dies in an O2 room", byCell(8, 7)!.alive === false);
check("M9 human dies in mixed gas", byCell(20, 6)!.alive === false);

// --- M10: political web (relations -> mood) ---
const w9 = createWorld();
carve(w9, 5, 5, 9, 8); // Room A (O2): human + drenn (human LIKES drenn)
carve(w9, 11, 5, 15, 8); // Room B (CH4): thol
carve(w9, 16, 5, 20, 8); // Room C (O2): human near the thol next door
recomputeRooms(w9);
addStructure(w9, "solar", 6, 6);
addStructure(w9, "solar", 7, 6);
addStructure(w9, "solar", 8, 6);
addStructure(w9, "o2gen", 6, 7);
addAgent(w9, 7, 7, "human"); // humanA, neighbor = drenn
addAgent(w9, 8, 7, "drenn");
addStructure(w9, "ch4gen", 12, 6);
addAgent(w9, 13, 6, "thol");
addStructure(w9, "o2gen", 19, 6);
addAgent(w9, 17, 6, "human"); // humanB, within 4 tiles of the thol -> DISLIKE

const find = (w: World, cx: number, cy: number) =>
  Object.values(w.agents).find((a) => a.cell === idx(w, cx, cy))!;
for (let i = 0; i < 120; i++) step(w9);
const humanA = find(w9, 7, 7);
const humanB = find(w9, 17, 6);
check("M10 all parties alive (gas-correct rooms)", humanA.alive && humanB.alive && find(w9, 13, 6).alive);
check("M10 human near liked Drenn is happier than human near disliked Thol", humanA.mood > humanB.mood);
check("M10 relation gap is meaningful (>8)", humanA.mood - humanB.mood > 8);

// --- M11: tension -> skirmish -> casualty ---
const w11 = createWorld();
carve(w11, 5, 5, 9, 8); // Room A (O2): human at the border
carve(w11, 9, 5, 13, 8); // Room B (CH4): thol, sharing wall at x9
recomputeRooms(w11);
addStructure(w11, "solar", 6, 6);
addStructure(w11, "solar", 7, 6); // 20 PU >= 15 draw
addStructure(w11, "o2gen", 8, 6);
addAgent(w11, 8, 7, "human"); // resentful human (dislikes thol)
addStructure(w11, "ch4gen", 11, 6);
addAgent(w11, 10, 7, "thol"); // 2 tiles away, breathing its own methane
const humanR = Object.values(w11.agents).find((a) => a.species === "human")!;
const tholV = Object.values(w11.agents).find((a) => a.species === "thol")!;
humanR.food = 0; // keep mood below the anger threshold
humanR.rest = 0;

let sawFight = false;
let tholMinHealth = 100;
for (let i = 0; i < 500; i++) {
  step(w11);
  if (humanR.fighting) sawFight = true;
  tholMinHealth = Math.min(tholMinHealth, tholV.health);
}
check("M11 tension produced a skirmish", sawFight);
check("M11 thol took combat damage", tholMinHealth < 100);
check("M11 resentful human survives (one-sided)", humanR.alive === true);
check("M11 the disliked thol is killed", tholV.alive === false);

// --- M12a: doors connect rooms for traffic but keep atmospheres separate ---
const w12 = createWorld();
carve(w12, 5, 5, 9, 8); // Room A, interior x6-8 y6-7
carve(w12, 9, 5, 13, 8); // Room B, shares wall col x9
setCell(w12, 9, 7, "door"); // airlock between A and B
recomputeRooms(w12);
addStructure(w12, "solar", 6, 6);
addStructure(w12, "solar", 7, 6); // 20 PU >= 12 draw
addStructure(w12, "o2gen", 6, 7);
addStructure(w12, "o2gen", 12, 6);
for (let i = 0; i < 10; i++) step(w12);
const roomA = w12.cells[idx(w12, 7, 7)].roomId;
const roomB = w12.cells[idx(w12, 11, 7)].roomId;
check("M12 door keeps rooms as separate atmospheres", roomA !== roomB && roomA >= 0 && roomB >= 0);
check("M12 both rooms still hold their own O2", w12.rooms[roomA].gas === "o2" && w12.rooms[roomB].gas === "o2");
check("M12 door is not part of any room", w12.cells[idx(w12, 9, 7)].roomId === -1);
check("M12 crew can path through the door A->B", findPath(w12, idx(w12, 7, 7), idx(w12, 11, 7)) !== null);

// --- M12b: space suit grants limited venture into a hostile zone, then death ---
const w13 = createWorld();
carve(w13, 5, 5, 9, 8); // isolated methane room (no O2 room to flee to)
recomputeRooms(w13);
addStructure(w13, "solar", 6, 6);
addStructure(w13, "ch4gen", 6, 7);
addAgent(w13, 7, 7, "human"); // human in methane -> suit protects, then fails
const venturer = Object.values(w13.agents)[0];
for (let i = 0; i < 20; i++) step(w13); // ~2s
check("M12 suit protects briefly (alive, O2 full, suit draining)", venturer.alive && venturer.o2 === 100 && venturer.suit < 100);
for (let i = 0; i < 220; i++) step(w13); // ~22s total -> suit then O2 exhausted
check("M12 venturer dies once suit and O2 run out", venturer.alive === false);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
