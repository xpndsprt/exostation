// Headless sanity check for the M2/M3 systems. Run: npx tsx scripts/simcheck.ts
import { createWorld, setCell, addStructure, addStructureMulti, addDock, canDock, addSite, seedAsteroids, addAgent, eraseAt, idx } from "../src/world";
import { solarFootprint, footprintCells, canPlace } from "../src/placement";
import { costOf } from "../src/structures";
import { recomputeRooms } from "../src/rooms";
import { findPath } from "../src/pathfind";
import { powerSystem } from "../src/power";
import { maintenanceSystem } from "../src/maintenance";
import { miningSystem } from "../src/mining";
import { foodSystem } from "../src/food";
import { atmosphereSystem } from "../src/atmosphere";
import { harmonySystem } from "../src/harmony";
import { agentSystem } from "../src/agents";
import { moodSystem, moodBreakdown } from "../src/mood";
import { combatSystem } from "../src/combat";
import { economySystem } from "../src/economy";
import { requestsSystem, getRep } from "../src/requests";
import { objectivesSystem, currentObjective } from "../src/objectives";
import { toolLock, buyUnlock } from "../src/research";
import { eventsSystem, forceEvent } from "../src/events";
import { storageCaps, BASE_CAPS, SILO_BONUS } from "../src/storage";
import { advise, updateSeen } from "../src/advisor";
import { saveWorld, loadWorld, deleteSave, listSaves } from "../src/persistence";
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
  maintenanceSystem(w, DT);
  miningSystem(w, DT);
  foodSystem(w, DT);
  atmosphereSystem(w);
  harmonySystem(w);
  agentSystem(w, DT);
  moodSystem(w, DT);
  combatSystem(w, DT);
  economySystem(w, DT);
  requestsSystem(w, DT);
  objectivesSystem(w, DT);
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
w2.stock.meals.rations = 5;
const mealsBefore = w2.stock.meals.rations;
for (let i = 0; i < 25; i++) step(w2); // ~2.5s: time to reach synth (1 cell) and eat
check("M4 agent walked to synth & ate (food restored)", h.food > 90);
check("M4 a meal was consumed", w2.stock.meals.rations === mealsBefore - 1);

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
w3.stock.minerals = 0;

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
check("M5 drone delivered minerals to stock", w3.stock.minerals > 0);

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
addStructure(w4, "hotel", 8, 6);
addStructure(w4, "hotel", 9, 6); // guest capacity 2 (hotel rooms)

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
check("M6 guest count capped by hotel rooms", maxGuests <= 2);
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
w5.stock.meals.rations = 7;

check("M7 save succeeds", saveWorld(w5));
const w6 = loadWorld();
check("M7 load returns a world", !!w6);
if (w6) {
  check("M7 credits preserved", w6.credits === 123);
  check("M7 meals preserved", w6.stock.meals.rations === 7);
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
humanR.fun = 0;

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

// --- Advisor board ---
const wa = createWorld();
recomputeRooms(wa);
check("Advisor suggests sealing a room on an empty station", advise(wa).some((a) => /seal a room/i.test(a.text)));
carve(wa, 5, 5, 9, 8);
recomputeRooms(wa);
addAgent(wa, 7, 7, "human");
addAgent(wa, 8, 7, "thol");
updateSeen(wa);
check("Advisor records every species seen", wa.seen.includes("human") && wa.seen.includes("thol"));
addStructure(wa, "o2gen", 6, 7); // draw, but no solar -> brownout
for (let i = 0; i < 10; i++) step(wa);
check("Advisor raises a critical on power shortfall", advise(wa).some((a) => a.sev === "critical" && /power/i.test(a.text)));

// --- Food loop: Vat grows biomass, Synth cooks meals (no mining needed) ---
const wf = createWorld();
carve(wf, 40, 5, 44, 8);
recomputeRooms(wf);
addStructure(wf, "solar", 41, 6);
addStructure(wf, "solar", 42, 6); // 20 PU >= 11 draw
addStructure(wf, "vat", 41, 7);
addStructure(wf, "synth", 42, 7);
wf.stock.biomass = 0;
wf.stock.meals.rations = 0;
wf.stock.minerals = 0;
let bioGrew = false;
for (let i = 0; i < 300; i++) {
  step(wf);
  if (wf.stock.biomass > 0) bioGrew = true;
}
check("Vat grows biomass from power", bioGrew);
check("Synth turns biomass into meals", wf.stock.meals.rations > 0);
check("No mining means minerals stay 0", wf.stock.minerals === 0);

// --- Solar panels: wall-mounted, 3 tiles normal to a space-facing wall ---
const ws = createWorld();
setCell(ws, 10, 10, "wall");
recomputeRooms(ws);
const fp = solarFootprint(ws, 11, 10); // space east of the wall
check("Solar footprint is 3 tiles", fp !== null && fp.length === 3);
check(
  "Solar extends normal to the wall, into space",
  fp !== null && fp[0] === idx(ws, 11, 10) && fp[1] === idx(ws, 12, 10) && fp[2] === idx(ws, 13, 10),
);
check("Solar requires a space-facing wall", solarFootprint(ws, 30, 30) === null);
addStructureMulti(ws, "solar", fp!);
for (let i = 0; i < 3; i++) step(ws);
check("Placed solar generates power", ws.power.supply >= 10);
check("Solar occupies all 3 cells", fp!.every((c) => ws.cells[c].structureId >= 0));
eraseAt(ws, 12, 10);
check("Erasing any solar cell removes the whole array", fp!.every((c) => ws.cells[c].structureId === -1));

// --- M13: jobs — crew maintain machinery; visitors don't work ---
const wm = createWorld();
carve(wm, 5, 5, 9, 8);
recomputeRooms(wm);
addStructure(wm, "solar", 6, 6);
addStructure(wm, "o2gen", 6, 7);
const gen = Object.values(wm.structures).find((s) => s.kind === "o2gen")!;
for (let i = 0; i < 50; i++) step(wm); // 5s, no crew
check("Machinery wears down while running", gen.condition < 100);
gen.condition = 0.3;
for (let i = 0; i < 10; i++) step(wm);
check("Worn-out machine breaks (unpowered)", gen.powered === false && gen.condition === 0);
check("Broken O2 generator stops making air", Object.values(wm.rooms).every((r) => r.gas !== "o2"));

const wc = createWorld();
carve(wc, 5, 5, 9, 8);
recomputeRooms(wc);
addStructure(wc, "solar", 6, 6);
addStructure(wc, "o2gen", 6, 7);
addAgent(wc, 7, 7, "human"); // resident
const g2 = Object.values(wc.structures).find((s) => s.kind === "o2gen")!;
g2.condition = 50;
let serviced = false;
for (let i = 0; i < 200; i++) {
  step(wc);
  if (g2.servicedBy >= 0) serviced = true;
}
check("Resident crew services worn machinery", serviced && g2.condition > 50);

const wg = createWorld();
carve(wg, 5, 5, 9, 8);
recomputeRooms(wg);
addStructure(wg, "solar", 6, 6);
addStructure(wg, "o2gen", 6, 7);
addAgent(wg, 7, 7, "drenn", true); // a visitor
const g3 = Object.values(wg.structures).find((s) => s.kind === "o2gen")!;
g3.condition = 40;
let guestServiced = false;
for (let i = 0; i < 150; i++) {
  step(wg);
  if (g3.servicedBy >= 0) guestServiced = true;
}
check("Visitors never take service jobs", guestServiced === false);

// --- M14: wall-mounted Docking Port (airlock) + ships ---
const wd = createWorld();
carve(wd, 5, 5, 9, 8);
recomputeRooms(wd);
addStructure(wd, "solar", 6, 6);
addStructure(wd, "solar", 7, 6);
addStructure(wd, "o2gen", 8, 7);
check("Dock valid on a hull wall", canDock(wd, 5, 6));
check("Dock invalid on interior floor", !canDock(wd, 7, 7));
addDock(wd, 5, 6);
const dock = Object.values(wd.structures).find((s) => s.kind === "dock")!;
check("Dock placed and stays a wall (airlock)", !!dock && wd.cells[idx(wd, 5, 6)].type === "wall");
addStructure(wd, "hotel", 7, 7); // guest capacity
addAgent(wd, 7, 6, "human"); // resident crew (services + keeps life support up)
dock.condition = 50;
let shipSeen = false;
let dockServiced = false;
let guestSeen = false;
for (let i = 0; i < 300; i++) {
  step(wd);
  if (wd.ships.length > 0) shipSeen = true;
  if (dock.servicedBy >= 0) dockServiced = true;
  if (Object.values(wd.agents).some((a) => a.guest && a.alive)) guestSeen = true;
}
check("Crew service the wall-mounted dock from inside", dockServiced || dock.condition > 50);
check("A guest arrived through the dock", guestSeen);
check("A ship parked at the dock", shipSeen);

// --- M15: entertainment (Lounge) + recreation need ---
const wreq = createWorld();
carve(wreq, 5, 5, 9, 8);
recomputeRooms(wreq);
addStructure(wreq, "solar", 6, 6);
addStructure(wreq, "o2gen", 6, 7);
addAgent(wreq, 7, 7, "human");
const hq = Object.values(wreq.agents)[0];
for (let i = 0; i < 50; i++) step(wreq);
check("Fun decays over time", hq.fun < 100);

const wr = createWorld();
carve(wr, 5, 5, 9, 8);
recomputeRooms(wr);
addStructure(wr, "solar", 6, 6);
addStructure(wr, "o2gen", 6, 7);
addStructure(wr, "rec", 8, 7); // Lounge
addAgent(wr, 7, 7, "human");
const hr = Object.values(wr.agents)[0];
hr.fun = 10;
let maxFun = 0;
for (let i = 0; i < 150; i++) {
  step(wr);
  maxFun = Math.max(maxFun, hr.fun);
}
check("Crew relax at a Lounge to restore fun", maxFun > 60);

// --- M16: trader ships, hotel vs quarters ---
const wt = createWorld();
carve(wt, 5, 5, 9, 8);
recomputeRooms(wt);
addStructure(wt, "solar", 6, 6);
addStructure(wt, "solar", 7, 6);
addStructure(wt, "o2gen", 8, 7);
addDock(wt, 5, 6); // hull airlock
addStructure(wt, "tradehub", 8, 6); // trading station (enables mineral sales)
addAgent(wt, 7, 7, "human"); // resident keeps things serviced
wt.stock.minerals = 100;
let traderSeen = false;
for (let i = 0; i < 400; i++) {
  step(wt);
  if (wt.ships.some((s) => s.trader)) traderSeen = true;
}
check("Trader buys minerals for credits", wt.credits > 0 && wt.stock.minerals < 100);
check("A trader ship visited the dock", traderSeen);

const wh = createWorld();
carve(wh, 5, 5, 11, 9);
recomputeRooms(wh);
addStructure(wh, "solar", 6, 6);
addStructure(wh, "solar", 7, 6);
addStructure(wh, "solar", 8, 6);
addStructure(wh, "o2gen", 9, 7);
addDock(wh, 5, 7);
addAgent(wh, 7, 7, "human");
for (let i = 0; i < 300; i++) step(wh);
check("No hotel rooms means no guests", Object.values(wh.agents).every((a) => !a.guest));
addStructure(wh, "hotel", 8, 7);
for (let i = 0; i < 300; i++) step(wh);
check("A Hotel Room enables guest arrival", Object.values(wh.agents).some((a) => a.guest && a.alive));

const wb = createWorld();
carve(wb, 5, 5, 9, 8);
recomputeRooms(wb);
addStructure(wb, "solar", 6, 6);
addStructure(wb, "o2gen", 6, 7);
addStructure(wb, "pod", 8, 6); // crew quarters
addStructure(wb, "hotel", 8, 7); // hotel room
addAgent(wb, 7, 7, "human");
const res = Object.values(wb.agents)[0];
res.rest = 10;
const podS = Object.values(wb.structures).find((s) => s.kind === "pod")!;
const hotelS = Object.values(wb.structures).find((s) => s.kind === "hotel")!;
let usedPod = false;
let crewUsedHotel = false;
for (let i = 0; i < 120; i++) {
  step(wb);
  if (podS.occupantId === res.id) usedPod = true;
  if (hotelS.occupantId === res.id) crewUsedHotel = true;
}
check("Crew sleep in Crew Quarters", usedPod);
check("Crew never use Hotel Rooms", !crewUsedHotel);

// --- M17: sized module footprints ---
const wf2 = createWorld();
for (let y = 5; y <= 7; y++) for (let x = 5; x <= 7; x++) setCell(wf2, x, y, "floor");
recomputeRooms(wf2);
const fpc = footprintCells(wf2, "o2gen", 5, 5); // 2x2
check("2x2 module footprint has 4 cells", fpc !== null && fpc.length === 4);
addStructureMulti(wf2, "o2gen", fpc!);
check("Sized module occupies all its cells", fpc!.every((c) => wf2.cells[c].structureId >= 0));
check("Footprint over an occupied tile is rejected", footprintCells(wf2, "vat", 5, 6) === null);

// --- M18: natural asteroids ---
const wa2 = createWorld();
check("Fresh world has no asteroids", Object.keys(wa2.sites).length === 0);
seedAsteroids(wa2, 8);
check("seedAsteroids scatters asteroids into space", Object.keys(wa2.sites).length > 0);

// --- Door crossing: agents transit a door without oscillating (suit covers it) ---
const wdoor = createWorld();
carve(wdoor, 5, 5, 9, 8); // room A
carve(wdoor, 9, 5, 13, 8); // room B (shares wall x9)
setCell(wdoor, 9, 7, "door");
recomputeRooms(wdoor);
addStructure(wdoor, "solar", 6, 6);
addStructure(wdoor, "solar", 7, 6);
addStructure(wdoor, "o2gen", 8, 6); // room A O2
addStructure(wdoor, "solar", 12, 6);
addStructure(wdoor, "o2gen", 11, 6); // room B O2
addStructure(wdoor, "rec", 10, 7); // Lounge in room B
addAgent(wdoor, 6, 7, "human");
const hd = Object.values(wdoor.agents)[0];
hd.fun = 10; // wants the lounge, which is across the door in room B
let reachedB = false;
let maxFunD = 0;
for (let i = 0; i < 250; i++) {
  step(wdoor);
  if (hd.cell % wdoor.w >= 10) reachedB = true;
  maxFunD = Math.max(maxFunD, hd.fun);
}
check("Agent crosses a door without getting stuck (reaches far room)", reachedB);
check("Agent completes its goal across the door (relaxed)", maxFunD > 60);

// --- M19: build costs + Trade Hub gating ---
check("Modules and tiles have costs", costOf("o2gen") === 90 && costOf("floor") === 2 && costOf("door") === 25);
const wcost = createWorld();
for (let y = 5; y <= 7; y++) for (let x = 5; x <= 7; x++) setCell(wcost, x, y, "floor");
recomputeRooms(wcost);
wcost.credits = 1000;
check("Can place a module when affordable", canPlace(wcost, "o2gen", 5, 5));
wcost.credits = 10;
check("Cannot place a module you can't afford", !canPlace(wcost, "o2gen", 5, 5));

// trade requires a powered Trade Hub
const wnohub = createWorld();
carve(wnohub, 5, 5, 9, 8);
recomputeRooms(wnohub);
addStructure(wnohub, "solar", 6, 6);
addStructure(wnohub, "o2gen", 8, 7);
addDock(wnohub, 5, 6);
wnohub.stock.minerals = 100;
wnohub.credits = 0;
for (let i = 0; i < 400; i++) step(wnohub);
check("No Trade Hub means minerals aren't sold", wnohub.credits === 0 && wnohub.stock.minerals === 100);

// --- Suit / venturing: no bounce into hostile rooms; quick venture is allowed ---
const wb1 = createWorld();
carve(wb1, 5, 5, 9, 8); // room A (O2)
carve(wb1, 9, 5, 13, 8); // room B (no generator => hostile)
setCell(wb1, 9, 7, "door");
recomputeRooms(wb1);
addStructure(wb1, "solar", 6, 6);
addStructure(wb1, "o2gen", 8, 6);
addStructure(wb1, "rec", 11, 7); // a Lounge in the hostile room
addAgent(wb1, 6, 7, "human");
const hb = Object.values(wb1.agents)[0];
hb.fun = 10;
const homeRoom = wb1.cells[idx(wb1, 6, 7)].roomId;
let strayed = false;
for (let i = 0; i < 200; i++) { step(wb1); if (wb1.cells[hb.cell].roomId !== homeRoom) strayed = true; }
check("Crew don't bounce into a hostile room for a lounge", !strayed && hb.alive);

const wv = createWorld();
carve(wv, 5, 5, 9, 8); // room A (O2)
carve(wv, 9, 5, 13, 8); // room B (hostile)
setCell(wv, 9, 7, "door");
recomputeRooms(wv);
addStructure(wv, "solar", 6, 6);
addStructure(wv, "o2gen", 8, 6);
addStructure(wv, "synth", 11, 7); // synth across the door in hostile air
addAgent(wv, 6, 7, "human");
const hv = Object.values(wv.agents)[0];
hv.food = 10; wv.stock.meals.rations = 5;
let ate = false;
for (let i = 0; i < 200; i++) { step(wv); if (hv.food > 90) ate = true; }
check("Crew venture (suited) into hostile air for a quick task and survive", ate && hv.alive);

// --- M20: Vry'l + Fungal Mash via selectable Vat/Synth recipes ---
const w20 = createWorld();
carve(w20, 5, 5, 11, 9);
recomputeRooms(w20);
addStructure(w20, "solar", 6, 6);
addStructure(w20, "solar", 7, 6);
addStructure(w20, "o2gen", 6, 8);
addStructure(w20, "vat", 8, 8);
addStructure(w20, "synth", 8, 6);
const vat = Object.values(w20.structures).find((s) => s.kind === "vat")!;
const syn = Object.values(w20.structures).find((s) => s.kind === "synth")!;
vat.recipe = "spores";
syn.recipe = "fungal";
w20.stock.biomass = 0;
w20.stock.spores = 0;
let sawSpores = false;
for (let i = 0; i < 400; i++) {
  step(w20);
  if (w20.stock.spores > 0) sawSpores = true;
}
check("Vat (spores) grows spores", sawSpores);
check("Synth (fungal) produces Fungal Mash", w20.stock.meals.fungal > 0);

addAgent(w20, 9, 7, "vryl");
addAgent(w20, 10, 7, "human");
const vry = Object.values(w20.agents).find((a) => a.species === "vryl")!;
const hum = Object.values(w20.agents).find((a) => a.species === "human")!;
vry.food = 10;
hum.food = 10;
w20.stock.meals.rations = 0; // only fungal available
for (let i = 0; i < 80; i++) step(w20);
check("Vry'l eat Fungal Mash", vry.food > 80);
check("Humans won't eat Fungal Mash (no rations)", hum.food < 60);

// --- M21: species traits ---
function vatBiomass(botanist: boolean): number {
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "vat", 8, 7);
  addAgent(w, 7, 7, botanist ? "vryl" : "human");
  w.stock.biomass = 0;
  for (let i = 0; i < 200; i++) step(w);
  return w.stock.biomass;
}
check("Vry'l botanist boosts Vat output", vatBiomass(true) > vatBiomass(false));

function tradeCredits(drenn: boolean): number {
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 8, 7);
  addDock(w, 5, 6);
  addStructure(w, "tradehub", 8, 6);
  addAgent(w, 7, 7, drenn ? "drenn" : "human");
  w.stock.minerals = 100;
  w.credits = 0;
  for (let i = 0; i < 400; i++) step(w);
  return w.credits;
}
check("Drenn merchant raises mineral trade revenue", tradeCredits(true) > tradeCredits(false));

function repairGain(species: "thol" | "human", gas: "ch4" | "o2"): number {
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, gas === "ch4" ? "ch4gen" : "o2gen", 8, 6);
  const gen = Object.values(w.structures).find((s) => s.kind !== "solar")!;
  gen.condition = 50;
  addAgent(w, 7, 7, species);
  for (let i = 0; i < 25; i++) step(w);
  return gen.condition;
}
check("Thol engineer repairs faster than a human", repairGain("thol", "ch4") > repairGain("human", "o2"));

// --- M22: room harmony (synergy/friction) ---
const whar = createWorld();
carve(whar, 5, 5, 9, 8);
recomputeRooms(whar);
addStructure(whar, "solar", 6, 6);
addStructure(whar, "o2gen", 6, 7);
addAgent(whar, 7, 7, "human");
addAgent(whar, 8, 7, "drenn");
for (let i = 0; i < 5; i++) step(whar);
const hrid = whar.cells[idx(whar, 7, 7)].roomId;
check("Friends sharing a room are harmonious", whar.rooms[hrid].harmony > 0.2);

function synthMeals(twoFriends: boolean): number {
  const w = createWorld();
  carve(w, 5, 5, 11, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "synth", 9, 7);
  addAgent(w, 8, 6, "human");
  if (twoFriends) addAgent(w, 9, 6, "drenn");
  w.stock.biomass = 200;
  w.stock.meals.rations = 0;
  for (let i = 0; i < 300; i++) step(w);
  return w.stock.meals.rations;
}
check("Harmonious room boosts production", synthMeals(true) > synthMeals(false));

// --- M23: species requests + reputation ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 7, "human");
  addAgent(w, 8, 7, "human");
  w.seen = ["human"];
  w.requests.push({ id: 9001, species: "human", kind: "host", target: 2, t: 100, reward: 150, rep: 12, penalty: 8 });
  const cr0 = w.credits;
  step(w); // fulfils (2 humans present)
  check("Fulfilling a request pays credits", w.credits >= cr0 + 149); // ~150 reward minus a tick of upkeep
  check("Fulfilling a request raises reputation", getRep(w, "human") > 50);
  check("Fulfilled request is cleared", w.requests.length === 0);

  w.requests.push({ id: 9002, species: "human", kind: "host", target: 9, t: 0.05, reward: 100, rep: 10, penalty: 8 });
  const repA = getRep(w, "human");
  step(w); // unmet + expires
  check("Expired request lowers reputation", getRep(w, "human") < repA);
}

// --- M24: crew immigrate by shuttle (no hand-placing) ---
{
  // full station with a dock: a human should arrive on its own.
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "synth", 7, 7);
  addStructure(w, "pod", 8, 7); // one bunk in breathable air
  const docked = addDock(w, 9, 6); // hull-wall airlock, interior access (8,6)
  check("Crew test: dock placed on hull wall", docked);
  let res = 0;
  for (let i = 0; i < 600; i++) {
    step(w);
    res = Object.values(w.agents).filter((a) => a.alive && !a.guest).length;
    if (res > 0) break;
  }
  check("Crew arrive by shuttle when env+food+bunk+dock are ready", res >= 1);
  const crew = Object.values(w.agents).filter((a) => a.alive && !a.guest);
  check("Shuttled crew match the room's air + food (human)", crew.every((a) => a.species === "human"));
  // capacity is one bunk — running longer must not exceed it
  for (let i = 0; i < 600; i++) step(w);
  const resCount = Object.values(w.agents).filter((a) => a.alive && !a.guest).length;
  check("Crew count capped by Crew Quarters", resCount <= 1);
}
{
  // same station but NO dock: nobody can arrive.
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "synth", 7, 7);
  addStructure(w, "pod", 8, 7);
  for (let i = 0; i < 600; i++) step(w);
  const res = Object.values(w.agents).filter((a) => a.alive && !a.guest).length;
  check("No dock ⇒ no crew arrive", res === 0);
}

// --- M25: Korro — the first same-air (O₂) rival ---
{
  // Korro immigrate as residents; with a human already aboard the diversity
  // rule (fewest first) brings a Korro into the free bunk.
  const w = createWorld();
  carve(w, 5, 5, 11, 8); // interior x6-10
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 8, 6);
  addStructure(w, "synth", 8, 7);
  addStructure(w, "pod", 9, 7);
  addStructure(w, "pod", 10, 7); // capacity 2
  addDock(w, 11, 6);
  addAgent(w, 6, 7, "human"); // one human already aboard
  let korro = 0;
  for (let i = 0; i < 1000; i++) {
    step(w);
    korro = Object.values(w.agents).filter((a) => a.alive && a.species === "korro").length;
    if (korro > 0) break;
  }
  check("Korro immigrate as O₂ residents (fewest-aboard pick)", korro >= 1);
}
{
  // The headline: a Human + Korro sharing an O₂ room makes harmony go negative,
  // so the room-harmony / tension systems finally bite for same-air species.
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human");
  addAgent(w, 8, 6, "korro");
  step(w);
  const rid = w.cells[idx(w, 7, 6)].roomId;
  check("Human + Korro share O₂ → room turns tense (harmony < 0)", rid >= 0 && w.rooms[rid].harmony < 0);
}
{
  // Korro's Hauler trait lets mining drones carry more, so a station with a
  // Korro out-mines an identical one without (more uptime per trip).
  function mineRun(withKorro: boolean): number {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 7, 6); // power for o2gen + bay
    addStructure(w, "o2gen", 6, 7);
    addStructure(w, "bay", 8, 6); // one drone
    addSite(w, 40, 30); // a distant asteroid so trip count matters
    if (withKorro) addAgent(w, 8, 7, "korro");
    for (let i = 0; i < 2500; i++) step(w);
    return w.stock.minerals;
  }
  check("Korro Hauler trait boosts mining throughput", mineRun(true) > mineRun(false));
}

// --- M28: mood breakdown is the single source of truth ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human");
  addAgent(w, 8, 6, "korro");
  step(w);
  const h = Object.values(w.agents).find((a) => a.species === "human")!;
  const b = moodBreakdown(w, h);
  check("Mood breakdown: a nearby rival gives negative social + room terms", b.social < 0 && b.harmony < 0);
  check("Mood breakdown: the rival drags target below the needs-only level", b.target < b.base + b.needs);
  check("Mood breakdown: base is 50", b.base === 50);
}

// --- M27: scenario objectives + victory / defeat ---
{
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  check("First objective is grow-crew", currentObjective(w)?.id === "grow");
  addAgent(w, 6, 6, "human");
  addAgent(w, 7, 6, "human");
  addAgent(w, 8, 6, "human");
  objectivesSystem(w, 0.1);
  check("Reaching 3 crew advances to the credit goal", currentObjective(w)?.id === "bank");
  w.credits = 3000;
  objectivesSystem(w, 0.1);
  check("Banking the target advances to the diversity goal", currentObjective(w)?.id === "diverse");
  addAgent(w, 9, 6, "drenn");
  addAgent(w, 10, 6, "korro");
  addAgent(w, 11, 6, "thol"); // species aboard: human, drenn, korro, thol = 4
  objectivesSystem(w, 0.1);
  check("Clearing all objectives wins the scenario", w.phase === "won");
}
{
  // the species objective counts RESIDENTS only — a guest must not complete it
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  w.objectiveIx = 2; // the "diverse" objective (4 species)
  addAgent(w, 6, 6, "human");
  addAgent(w, 7, 6, "korro");
  addAgent(w, 8, 6, "vryl");
  addAgent(w, 9, 6, "drenn", true); // a GUEST — must not count
  objectivesSystem(w, 0.1);
  check("Guests don't count toward the species objective", w.phase === "playing");
  addAgent(w, 10, 6, "thol"); // a 4th RESIDENT species
  objectivesSystem(w, 0.1);
  check("Four resident species clears it", w.phase === "won");
}
{
  // a dead, unrecoverable station (no dock/pod/meals) is declared lost
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 6, 6, "human");
  Object.values(w.agents)[0].alive = false;
  for (let i = 0; i < 220; i++) objectivesSystem(w, 0.1); // > 20s grace
  check("A dead, unrecoverable station is declared lost", w.phase === "lost");
}
{
  // a fresh station that has never had a death must never auto-lose
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  for (let i = 0; i < 260; i++) objectivesSystem(w, 0.1);
  check("Fresh station with no deaths is never auto-lost", w.phase === "playing");
}

// --- M30: tech tree (credit-funded unlocks gated by a powered Lab) ---
{
  const w = createWorld();
  check("ch4gen is locked at the start", toolLock(w, "ch4gen")?.id === "methane");
  check("o2gen is never locked", toolLock(w, "o2gen") === null);
  check("Cannot research without a powered Lab", buyUnlock(w, "methane") === false);
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "lab", 7, 6);
  powerSystem(w, 0.1);
  w.credits = 1000;
  check("Research succeeds with a powered Lab + credits", buyUnlock(w, "methane") === true);
  check("Methane Life-Support unlocks ch4gen", toolLock(w, "ch4gen") === null);
  check("Researching spent the credits", w.credits === 650);
}

// --- M32: storage caps curb abundance ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "vat", 7, 6); // grows biomass, no synth consuming
  w.stock.biomass = 395;
  for (let i = 0; i < 600; i++) step(w);
  check("Biomass plateaus at the storage cap", w.stock.biomass === BASE_CAPS.biomass);
  const before = storageCaps(w).biomass;
  addStructure(w, "silo", 8, 7);
  check("A Storage Silo raises the cap", storageCaps(w).biomass === before + SILO_BONUS);
}

// --- M29: station incidents ---
{
  // power surge faults a running (non-life-support) module offline, then recovers
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "synth", 8, 6);
  powerSystem(w, 0.1);
  const o2 = Object.values(w.structures).find((s) => s.kind === "o2gen")!;
  const synth = Object.values(w.structures).find((s) => s.kind === "synth")!;
  check("Surge precondition: synth powered", synth.powered);
  forceEvent(w, "surge");
  check("Surge faults a running module", synth.faultT > 0);
  check("Surge never targets life support", o2.faultT === 0);
  powerSystem(w, 0.1);
  check("A faulted module is offline", synth.powered === false);
  for (let i = 0; i < 220; i++) eventsSystem(w, 0.1); // fault decays (20s)
  powerSystem(w, 0.1);
  check("Module recovers after the fault clears", synth.faultT === 0 && synth.powered);
}
{
  // hull breach needs 2+ rooms (so crew can flee) and vents one wall
  const one = createWorld();
  carve(one, 5, 5, 9, 8);
  recomputeRooms(one);
  check("Breach is suppressed on a single-room station", forceEvent(one, "breach") === false);

  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  carve(w, 11, 5, 15, 8);
  recomputeRooms(w);
  const wallsBefore = w.cells.filter((c) => c.type === "wall").length;
  check("Breach fires once there are 2+ rooms", forceEvent(w, "breach"));
  check("Breach vents one wall to space", w.cells.filter((c) => c.type === "wall").length === wallsBefore - 1);
}
{
  // market shock multiplies trade income, then decays
  const w = createWorld();
  forceEvent(w, "shock");
  check("Shock changes the price multiplier", w.priceMult !== 1 && w.priceT > 0);
  w.priceT = 0.05;
  eventsSystem(w, 0.1);
  check("Shock decays back to normal price", w.priceMult === 1 && w.priceT === 0);

  const trade = (mult: number): number => {
    const t = createWorld();
    carve(t, 5, 5, 9, 8);
    recomputeRooms(t);
    addStructure(t, "solar", 6, 6);
    addStructure(t, "tradehub", 7, 6);
    powerSystem(t, 0.1);
    t.stock.minerals = 25;
    t.priceMult = mult;
    t.tradeTimer = 30; // force a trade this tick
    const c0 = t.credits;
    economySystem(t, 0.1);
    return t.credits - c0;
  };
  check("A price surge doubles trade income", Math.round(trade(2)) === Math.round(trade(1) * 2));
}
{
  // a raider damages modules; a powered Turret destroys it
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "bay", 7, 7);
  addDock(w, 9, 6);
  powerSystem(w, 0.1);
  check("Raider spawns at a powered dock", forceEvent(w, "raid") && w.ships.some((s) => s.hostile));
  const o2 = Object.values(w.structures).find((s) => s.kind === "o2gen")!;
  const bay = Object.values(w.structures).find((s) => s.kind === "bay")!;
  for (let i = 0; i < 50; i++) eventsSystem(w, 0.1);
  check("Raider damages modules without a Turret", bay.condition < 100);
  check("Raider never targets life support", o2.condition === 100);
  addStructure(w, "turret", 8, 7);
  powerSystem(w, 0.1);
  eventsSystem(w, 0.1);
  check("A powered Turret destroys the raider", !w.ships.some((s) => s.hostile));
}

// --- M34: independent named save slots ---
{
  const a = createWorld();
  a.credits = 111;
  const b = createWorld();
  b.credits = 222;
  check("Save to slot 1", saveWorld(a, "1"));
  check("Save to slot 2", saveWorld(b, "2"));
  check("Slots load independently", loadWorld("1")!.credits === 111 && loadWorld("2")!.credits === 222);
  check("listSaves reports a filled slot", listSaves().find((s) => s.slot === "1")!.savedAt !== null);
  deleteSave("1");
  check("Deleting a slot clears it", loadWorld("1") === null);
  check("Deleting one slot leaves others intact", loadWorld("2")!.credits === 222);
}

// --- Breach emergency repair: crew reseal a vented wall, for credits ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addAgent(w, 7, 7, "human"); // a resident to do the repair
  for (let i = 0; i < 30; i++) step(w); // settle: room fills with O₂
  // blow a wall that borders the room + space
  const bcell = idx(w, 6, 8);
  setCell(w, 6, 8, "space");
  w.breaches.push({ cell: bcell, sealer: -1, progress: 0 });
  const cr0 = w.credits;
  let sealed = false;
  for (let i = 0; i < 200; i++) {
    step(w);
    if (w.breaches.length === 0 && w.cells[bcell].type === "wall") {
      sealed = true;
      break;
    }
  }
  check("Crew reseal a hull breach (wall restored)", sealed);
  check("Emergency breach repair costs credits", w.credits < cr0);
}

// --- M37: recurring credit sink (wages + module upkeep) ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "synth", 8, 6);
  addAgent(w, 7, 7, "human"); // a wage-earning resident, no trade/lodging income
  const c0 = w.credits;
  for (let i = 0; i < 300; i++) step(w); // 30s of pure upkeep
  check("Upkeep bleeds an idle station", w.credits < c0);
  check("Net-income readout reads negative when idle", w.creditRate < 0);
}

// --- M39: live skirmishes — fed rivals in a shared room still erupt ---
{
  const fight = (separate: boolean): boolean => {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    if (separate) carve(w, 15, 5, 19, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "o2gen", 6, 7);
    if (separate) {
      addStructure(w, "solar", 16, 6);
      addStructure(w, "o2gen", 16, 7);
    }
    addAgent(w, 7, 6, "human");
    addAgent(w, separate ? 17 : 8, 6, "korro");
    let fought = false;
    for (let i = 0; i < 500; i++) {
      for (const id in w.agents) {
        const a = w.agents[id];
        a.food = 100; // keep everyone fed so mood stays well above the anger floor
        a.rest = 100;
        a.fun = 100;
      }
      step(w);
      if (Object.values(w.agents).some((a) => a.fighting)) {
        fought = true;
        break;
      }
    }
    return fought;
  };
  check("Fed rivals sharing a room still erupt (slow-burn friction)", fight(false));
  check("Rivals split into separate rooms never fight", fight(true) === false);
}

// --- Pausing a battery-coasting station must not brown out or wipe the battery ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6); // +10 supply
  addStructure(w, "battery", 6, 7); // 50 storage
  addStructure(w, "o2gen", 7, 6); // -6
  addStructure(w, "lab", 8, 6); // -6  → draw 12 > supply 10, coasts on battery
  w.power.battery = 30;
  powerSystem(w, 0.1); // running: coasting on battery
  const lab = Object.values(w.structures).find((s) => s.kind === "lab")!;
  check("Lab is powered while coasting on battery (running)", lab.powered);
  const batBefore = w.power.battery;
  powerSystem(w, 0); // PAUSED / redraw refresh
  check("Pausing keeps the Lab powered (no false brownout)", lab.powered);
  check("Pausing does not drain/zero the battery", w.power.battery === batBefore);
  check("Pausing does not flag a brownout while battery has charge", w.power.brownout === false);
}

// --- Off-air crew drift home to their own gas instead of loitering on suit ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8); // room A (O2), interior x6-8
  carve(w, 9, 5, 13, 8); // room B (CH4), interior x10-12, shares wall x9
  setCell(w, 9, 6, "door"); // connect A <-> B (blocks gas, passes crew)
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 7);
  addStructure(w, "o2gen", 6, 7); // room A → O2
  addStructure(w, "ch4gen", 11, 7); // room B → CH4
  for (let i = 0; i < 20; i++) step(w); // settle atmospheres
  addAgent(w, 8, 6, "thol"); // a Thol standing in the O2 room
  const thol = Object.values(w.agents).find((a) => a.species === "thol")!;
  let home = false;
  for (let i = 0; i < 400; i++) {
    step(w);
    const rid = w.cells[thol.cell].roomId;
    if (rid >= 0 && w.rooms[rid]?.gas === "ch4") {
      home = true;
      break;
    }
  }
  check("Thol idle in O2 heads home to its methane wing", home);
}

// --- Big-ticket modules (Fusion / Cargo Exchange / AI Core) + new tech gates ---
{
  const w = createWorld();
  check("Battery is now researchable", toolLock(w, "battery")?.id === "powerstorage");
  check("Bot Bay is now researchable", toolLock(w, "bay")?.id === "robotics");
  check("Lounge is now researchable", toolLock(w, "rec")?.id === "recreation");
  check("Trade Hub is now researchable", toolLock(w, "tradehub")?.id === "commerce");
  check("Fusion / Cargo Exchange / AI Core are researchable",
    !!toolLock(w, "fusion") && !!toolLock(w, "cargoex") && !!toolLock(w, "aicore"));
  check("Core starter tools stay unlocked",
    toolLock(w, "solar") === null && toolLock(w, "o2gen") === null && toolLock(w, "synth") === null &&
    toolLock(w, "pod") === null && toolLock(w, "dock") === null && toolLock(w, "lab") === null);
}
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "fusion", 6, 6);
  const fus = Object.values(w.structures).find((s) => s.kind === "fusion")!;
  // no minerals → no fuel → no power
  w.stock.minerals = 0;
  powerSystem(w, 0.1);
  check("Fusion Reactor produces nothing without mineral fuel", w.power.supply < 150 && !fus.powered);
  // with minerals → +150 and it burns fuel
  w.stock.minerals = 100;
  powerSystem(w, 0.1);
  check("Fusion Reactor supplies +150 PU when fuelled", w.power.supply >= 150 && fus.powered);
  check("Fusion Reactor burns minerals as fuel", w.stock.minerals < 100);
}
{
  const tradeGain = (mod: "tradehub" | "cargoex"): number => {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 6, 7);
    addStructure(w, mod, 7, 6);
    powerSystem(w, 0.1);
    w.stock.minerals = 200;
    w.tradeTimer = 30;
    const c0 = w.credits;
    economySystem(w, 0.1);
    return w.credits - c0;
  };
  check("Cargo Exchange out-earns a Trade Hub per trade", tradeGain("cargoex") > tradeGain("tradehub") * 1.5);
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  const base = storageCaps(w).minerals;
  addStructure(w, "cargoex", 6, 6);
  check("Cargo Exchange raises the mineral cap", storageCaps(w).minerals === base + 500);
}
{
  const grow = (ai: boolean): number => {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 6, 7);
    addStructure(w, "vat", 7, 6);
    if (ai) {
      addStructure(w, "solar", 8, 6);
      addStructure(w, "aicore", 8, 7);
    }
    w.stock.biomass = 0;
    for (let i = 0; i < 300; i++) step(w);
    return w.stock.biomass;
  };
  check("AI Core speeds production (×1.25)", grow(true) > grow(false));
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
