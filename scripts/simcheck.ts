// Headless sanity check for the M2/M3 systems. Run: npx tsx scripts/simcheck.ts
import { createWorld, setCell, addStructure, addAgent, eraseAt, idx } from "../src/world";
import { recomputeRooms } from "../src/rooms";
import { powerSystem } from "../src/power";
import { atmosphereSystem } from "../src/atmosphere";
import { agentSystem } from "../src/agents";
import { World } from "../src/types";

const DT = 0.1;
function step(w: World) {
  if (w.dirtyRooms) recomputeRooms(w);
  powerSystem(w, DT);
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

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
