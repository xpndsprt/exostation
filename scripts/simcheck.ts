// Headless sanity check for the M2/M3 systems. Run: npx tsx scripts/simcheck.ts
import { createWorld, setCell, addStructure, addAgent, eraseAt, idx } from "../src/world";
import { recomputeRooms } from "../src/rooms";
import { powerSystem } from "../src/power";
import { foodSystem } from "../src/food";
import { atmosphereSystem } from "../src/atmosphere";
import { agentSystem } from "../src/agents";
import { World } from "../src/types";

const DT = 0.1;
function step(w: World) {
  if (w.dirtyRooms) recomputeRooms(w);
  powerSystem(w, DT);
  foodSystem(w, DT);
  atmosphereSystem(w);
  agentSystem(w, DT);
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
check("room breathable", Object.values(w.rooms).some((r) => r.breathable));
check("agent O2 stays full in air", agent.o2 === 100 && agent.alive);

// Cut power: remove the solar panel. o2gen has no supply and no battery.
eraseAt(w, 12, 12);
for (let i = 0; i < 5; i++) step(w);
check("brownout after losing solar", w.power.brownout === true);
check("o2gen unpowered", Object.values(w.structures).find((s) => s.kind === "o2gen")!.powered === false);
check("room no longer breathable", Object.values(w.rooms).every((r) => !r.breathable));

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
check("M4 room breathable", Object.values(w2.rooms).some((r) => r.breathable));
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

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
