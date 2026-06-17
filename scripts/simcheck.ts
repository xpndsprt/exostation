// Headless sanity check for the M2/M3 systems. Run: npx tsx scripts/simcheck.ts
import { createWorld, setCell, addStructure, addStructureMulti, addDock, canDock, addBody, seedSolarSystem, addAgent, eraseAt, idx } from "../src/world";
import { solarFootprint, footprintCells, canPlace, rectCells, dragCells } from "../src/placement";
import { costOf, DOCK_TIER } from "../src/structures";
import { SPECIES } from "../src/species";
import { RELATIONS } from "../src/relations";
import { recomputeRooms } from "../src/rooms";
import { findPath } from "../src/pathfind";
import { powerSystem } from "../src/power";
import { maintenanceSystem } from "../src/maintenance";
import { miningSystem, transitSeconds } from "../src/mining";
import { foodSystem } from "../src/food";
import { fuelSystem } from "../src/fuel";
import { overflowSystem } from "../src/overflow";
import { atmosphereSystem } from "../src/atmosphere";
import { hazardSystem } from "../src/hazards";
import { harmonySystem } from "../src/harmony";
import { agentSystem } from "../src/agents";
import { moodSystem, moodBreakdown } from "../src/mood";
import { combatSystem } from "../src/combat";
import { medicalSystem, injure } from "../src/medical";
import { resolveEncounter, encounterText } from "../src/encounters";
import { spawnSystem, resolveBreed, BREED_REWARD, PEST_HEALTH } from "../src/spawn";
import { romanceSystem, maybeFallInLove, coupleOf, loveBoost, isTrulyInLove, ROMANCE_DAY, LOVE_START, LOVE_PER_DAY } from "../src/romance";
import { effRelation } from "../src/relations";
import { economySystem } from "../src/economy";
import { requestsSystem, getRep } from "../src/requests";
import { beaconSystem, beaconActive, beaconCharged } from "../src/beacon";
import { objectivesSystem, currentObjective } from "../src/objectives";
import { toolLock, buyUnlock, canResearch, activeDoctrine, industryBoost, isUnlocked, UNLOCKS, highTierModule, lodgingUnlocked } from "../src/research";
import { eventsSystem, forceEvent, raiderDps } from "../src/events";
import { godsSystem, GODS } from "../src/gods";
import { storySystem, currentYear } from "../src/story";
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
  fuelSystem(w, DT);
  overflowSystem(w, DT);
  atmosphereSystem(w);
  hazardSystem(w, DT);
  harmonySystem(w);
  agentSystem(w, DT);
  moodSystem(w, DT);
  combatSystem(w, DT);
  spawnSystem(w, DT);
  medicalSystem(w, DT);
  economySystem(w, DT);
  romanceSystem(w, DT);
  godsSystem(w, DT);
  requestsSystem(w, DT);
  beaconSystem(w, DT);
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

// --- M5: drone dispatch loop (off-map orbital bodies) ---
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
const bodyId = addBody(w3, "asteroid", { angle: 0, dist: 0.1, yield: 15, richness: 300 });
w3.stock.minerals = 0;

const bay = Object.values(w3.structures).find((s) => s.kind === "bay")!;
const drone = Object.values(w3.drones)[0];
check("M5 bay spawned a docked drone", !!drone && drone.state === "docked");
check("M5 an undiscovered body starts hidden", w3.sites[bodyId].discovered === false);

drone.siteId = bodyId; // the player assigns a target from the Star Chart
const site = w3.sites[bodyId];
const richBefore = site.richness;
let sawTransit = false;
for (let i = 0; i < 400; i++) {
  step(w3);
  if (drone.state === "transit") sawTransit = true;
}
check("M5 bay is powered", bay.powered);
check("M5 drone flew a transit leg off-map", sawTransit);
check("M5 the body was discovered on arrival", site.discovered === true);
check("M5 body richness dropped", site.richness < richBefore);
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
addDock(w4, 12, 8); // hull-wall airlock facing space (a shuttle can fly in)
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
check("Fresh world has no orbital bodies", Object.keys(wa2.sites).length === 0);
seedSolarSystem(wa2, 8, 2);
check("seedSolarSystem populates the star system", Object.keys(wa2.sites).length === 10);
check("Seeded bodies start undiscovered", Object.values(wa2.sites).every((s) => !s.discovered));

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
  // lodging is prepped per species now: one bunk for each, and Korro lodging unlocked
  w.unlocked.robotics = true;
  Object.values(w.structures).filter((s) => s.kind === "pod").forEach((p, i) => (p.recipe = i === 0 ? "human" : "korro"));
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
    const id = addBody(w, "asteroid", { angle: 0, dist: 0.1, yield: 15, richness: 5000 }); // deep target — won't deplete
    Object.values(w.drones)[0].siteId = id;
    if (withKorro) addAgent(w, 8, 7, "korro");
    for (let i = 0; i < 2500; i++) step(w);
    return w.stock.minerals;
  }
  check("Korro Hauler trait boosts mining throughput", mineRun(true) > mineRun(false));
}
{
  // a target depletes and the drone idles (un-targets itself) when it runs dry
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "bay", 7, 6);
  const id = addBody(w, "asteroid", { angle: 0, dist: 0.05, yield: 20, richness: 40 }); // tiny — empties in ~2 trips
  const dr = Object.values(w.drones)[0];
  dr.siteId = id;
  w.stock.minerals = 0;
  for (let i = 0; i < 1200; i++) step(w);
  check("A target depletes to zero", w.sites[id].richness === 0);
  check("Depleted target's drone goes idle", dr.siteId === -1 && dr.state === "docked");
  check("Delivered minerals equal the body's richness", w.stock.minerals === 40);
}
{
  // planets (far) take much longer per trip than asteroids (near)
  check("Far planets take longer per trip than near asteroids", transitSeconds(0.9) > transitSeconds(0.1) * 2);
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
  check("Hosting 4 species advances to the Beacon finale", currentObjective(w)?.id === "beacon");
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
  check("Four resident species clears the species goal", currentObjective(w)?.id === "beacon");
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
  addStructure(w, "solar", 6, 7);
  addStructure(w, "lab", 7, 6);
  powerSystem(w, 0.1);
  w.credits = 1000;
  check("One Lab can't research a 2-Lab tech", buyUnlock(w, "methane") === false);
  addStructure(w, "lab", 8, 6); // 2nd lab
  powerSystem(w, 0.1);
  check("Research succeeds with enough Labs + credits", buyUnlock(w, "methane") === true);
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
  // M41: production never exceeds the cap, but a near-full store now spoils, so
  // it churns just under the cap instead of pinning exactly at it.
  check("Biomass plateaus near the storage cap (capped, spoils)", w.stock.biomass <= BASE_CAPS.biomass && w.stock.biomass >= BASE_CAPS.biomass * 0.9);
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

// --- Sector Beacon: per-species signature modules + the win finale ---
{
  // A signature module only charges/activates while its species is in its room.
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "orerefinery", 7, 6); // Korro module
  const m = Object.values(w.structures).find((s) => s.kind === "orerefinery")!;
  powerSystem(w, 0.1);
  beaconSystem(w, 0.5);
  check("Beacon module idle without its species", m.timer === 0 && !beaconActive(w, "orerefinery"));
  addAgent(w, 8, 7, "korro"); // a Korro in the room
  beaconSystem(w, 0.5);
  check("Beacon module charges with its species present", m.timer > 0 && beaconActive(w, "orerefinery"));
}
{
  // Charging all five wins the scenario via the final objective.
  const w = createWorld();
  carve(w, 5, 5, 14, 12);
  recomputeRooms(w);
  w.objectiveIx = 3; // the beacon objective
  const kinds: [string, string][] = [
    ["cmdhub", "human"], ["tradenexus", "drenn"], ["autoforge", "thol"],
    ["bloomgarden", "vryl"], ["orerefinery", "korro"],
  ];
  kinds.forEach(([kind], i) => addStructure(w, kind as never, 6 + i, 6));
  // pre-charge them all (simulating each species having operated its module)
  for (const id in w.structures) if (w.structures[id].kind in { cmdhub: 1, tradenexus: 1, autoforge: 1, bloomgarden: 1, orerefinery: 1 }) w.structures[id].timer = 100;
  check("All five modules charged = beacon complete", beaconCharged(w) === 5);
  objectivesSystem(w, 0.1);
  check("Bringing the Beacon online wins the scenario", w.phase === "won");
}

// --- M42: deeper relations — LOVE/HATE tiers bite harder ---
{
  const mk = (other: "korro" | "thol") => {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "o2gen", 6, 7);
    addAgent(w, 7, 6, "human");
    addAgent(w, 8, 6, other);
    step(w);
    const h = Object.values(w.agents).find((a) => a.species === "human")!;
    return moodBreakdown(w, h);
  };
  const hate = mk("korro"); // human HATES korro (−15)
  const dis = mk("thol"); // human DISLIKES thol (−8)
  check("M42 a HATE neighbour hits social harder than a DISLIKE one", hate.social < dis.social);
  check("M42 a HATE room turns more tense than a DISLIKE room", hate.harmony < dis.harmony);
  check("M42 neighbours now rival needs in weight (±8 / ±15)", Math.abs(dis.social) >= 8 && Math.abs(hate.social) >= 15);
}

// --- M41: overflow consequences — full stores spoil and drag morale ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  const cap = storageCaps(w).minerals;
  w.stock.minerals = cap;
  overflowSystem(w, 1);
  check("M41 a resource at cap spoils (loses units)", w.stock.minerals < cap);
  check("M41 overflowing flags the morale drag", w.overflow === true);

  const w2 = createWorld();
  carve(w2, 5, 5, 9, 8);
  recomputeRooms(w2);
  w2.stock.minerals = cap * 0.5;
  overflowSystem(w2, 1);
  check("M41 a resource under cap does not spoil", w2.stock.minerals === cap * 0.5 && w2.overflow === false);

  const w3 = createWorld();
  carve(w3, 5, 5, 9, 8);
  recomputeRooms(w3);
  addStructure(w3, "solar", 6, 6);
  addStructure(w3, "o2gen", 6, 7);
  addAgent(w3, 7, 6, "human");
  w3.stock.minerals = storageCaps(w3).minerals;
  step(w3);
  const hm = Object.values(w3.agents).find((a) => a.species === "human")!;
  check("M41 overflow waste drags mood", moodBreakdown(w3, hm).overflow < 0 && w3.overflow === true);
}

// --- M38: incidents with teeth ---
{
  // no battery + lone O2 gen → a surge CAN take life support
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "o2gen", 7, 6);
  powerSystem(w, 0.1);
  const o2 = Object.values(w.structures).find((s) => s.kind === "o2gen")!;
  forceEvent(w, "surge");
  check("M38 a surge can fault a lone, battery-less life-support gen", o2.faultT > 0);
}
{
  // a Battery soaks the spike → the surge hits the Synth, never life support
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "battery", 8, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "synth", 7, 7);
  powerSystem(w, 0.1);
  const o2 = Object.values(w.structures).find((s) => s.kind === "o2gen")!;
  forceEvent(w, "surge");
  check("M38 a Battery shields life support from a surge", o2.faultT === 0);
}
{
  // a redundant second O2 gen also shields life support (no battery needed)
  const w = createWorld();
  carve(w, 5, 5, 11, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "solar", 7, 7);
  addStructure(w, "o2gen", 7, 6);
  addStructure(w, "o2gen", 9, 6);
  powerSystem(w, 0.1);
  forceEvent(w, "surge");
  const hit = Object.values(w.structures).filter((s) => s.kind === "o2gen" && s.faultT > 0).length;
  check("M38 a backup generator shields life support from a surge", hit === 0);
}
{
  // raider damage scales with station value
  const dps = (extra: number): number => {
    const w = createWorld();
    carve(w, 5, 5, 20, 12);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 6, 7);
    addStructure(w, "solar", 7, 7);
    addStructure(w, "solar", 8, 7);
    addStructure(w, "o2gen", 7, 6);
    for (let i = 0; i < extra; i++) addStructure(w, "synth", 9 + i, 6);
    powerSystem(w, 0.1);
    return raiderDps(w);
  };
  check("M38 raider damage rises with station size", dps(6) > dps(0));
}
{
  // an undefended raider actually DESTROYS a module (not just chips condition)
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 6, 8);
  addStructure(w, "solar", 7, 8); // ample power so the dock stays lit
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "synth", 8, 7);
  addStructure(w, "vat", 9, 7);
  addDock(w, 12, 7);
  powerSystem(w, 0.1);
  const before = Object.keys(w.structures).length;
  const raidStarted = forceEvent(w, "raid");
  let destroyed = false;
  for (let i = 0; i < 300 && !destroyed; i++) {
    eventsSystem(w, 0.1);
    if (Object.keys(w.structures).length < before) destroyed = true;
  }
  check("Undefended raiders destroy a module", raidStarted && destroyed);
}
{
  // a powered Turret shoots the raider down before it can wreck anything
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "synth", 8, 7);
  addStructure(w, "turret", 9, 7);
  addDock(w, 12, 7);
  powerSystem(w, 0.1);
  const before = Object.keys(w.structures).length;
  forceEvent(w, "raid");
  for (let i = 0; i < 40; i++) eventsSystem(w, 0.1);
  check("A powered Turret stops raiders with no losses", Object.keys(w.structures).length === before && !w.ships.some((s) => s.hostile));
}

// --- M40: branching tech tree — prerequisites + a mutually-exclusive fork ---
{
  const w = createWorld();
  carve(w, 5, 5, 14, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "solar", 7, 7);
  addStructure(w, "lab", 8, 6);
  addStructure(w, "lab", 10, 6);
  w.credits = 5000;
  powerSystem(w, 0.1);
  const indu = UNLOCKS.find((x) => x.id === "doc_industry")!;
  check("M40 a doctrine is blocked without its prerequisite", buyUnlock(w, "doc_industry") === false);
  check("M40 the block names the missing prerequisite", (canResearch(w, indu).reason ?? "").includes("Robotics"));
  buyUnlock(w, "robotics");
  check("M40 prerequisite met → the doctrine becomes researchable", canResearch(w, indu).ok === true);
  check("M40 doctrine purchase succeeds", buyUnlock(w, "doc_industry") === true);
  check("M40 the chosen doctrine is active", activeDoctrine(w) === "industry");
  check("M40 Industrialist boost = ×1.15", industryBoost(w) === 1.15);
  buyUnlock(w, "commerce"); // the Hospitality prerequisite
  check("M40 choosing one doctrine permanently locks the others", buyUnlock(w, "doc_hospitality") === false);
  const hosp = UNLOCKS.find((x) => x.id === "doc_hospitality")!;
  check("M40 the locked sibling explains the exclusivity", (canResearch(w, hosp).reason ?? "").toLowerCase().includes("chose"));
}
{
  // a Tier-3 node is unbuyable until its Tier-1 prerequisite is owned
  const w = createWorld();
  carve(w, 5, 5, 14, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "lab", 8, 6);
  addStructure(w, "lab", 10, 6);
  addStructure(w, "lab", 12, 6);
  w.credits = 5000;
  powerSystem(w, 0.1);
  check("M40 Fusion needs Robotics first", buyUnlock(w, "fusion") === false);
  buyUnlock(w, "robotics");
  check("M40 Fusion unlocks once Robotics is owned", buyUnlock(w, "fusion") === true && isUnlocked(w, "fusion"));
}

// --- Fuel Refinery: minerals -> fuel; ships buy fuel for credits ---
{
  // a powered Fuel Refinery with mineral stock produces fuel
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 6, 7);
  addStructure(w, "fuelrefinery", 7, 6);
  w.stock.minerals = 100;
  w.stock.fuel = 0;
  for (let i = 0; i < 200; i++) step(w);
  check("Fuel Refinery cracks minerals into fuel", w.stock.fuel > 0 && w.stock.minerals < 100);
}
{
  // no minerals → no fuel (needs a Bot Bay feeding it)
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "fuelrefinery", 7, 6);
  w.stock.minerals = 0;
  for (let i = 0; i < 100; i++) step(w);
  check("Fuel Refinery produces nothing without minerals", w.stock.fuel === 0);
}
{
  // a docking ship buys fuel on landing → credits up, fuel down
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 8, 7);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "synth", 7, 7);
  addDock(w, 9, 6);
  addStructure(w, "hotel", 7, 6);
  w.stock.fuel = 100;
  w.stock.meals.rations = 50;
  const fuel0 = w.stock.fuel;
  let bought = false;
  for (let i = 0; i < 1500 && !bought; i++) {
    step(w);
    if (w.stock.fuel < fuel0) bought = true;
  }
  check("A docking ship buys fuel (fuel falls)", bought);
}

// --- Dock tiers: larger berths land bigger ships with more guests ---
{
  check("Large dock lands more guests than standard", DOCK_TIER.docklarge.guests > DOCK_TIER.dock.guests);
  check("Spaceport lands the most guests + biggest fuel buy", DOCK_TIER.docksuper.guests > DOCK_TIER.docklarge.guests && DOCK_TIER.docksuper.fuelNeed > DOCK_TIER.docklarge.fuelNeed);
  // a Large Dock places as a hull-wall airlock just like a standard dock
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  const ok = addDock(w, 9, 6, "docklarge");
  check("Large Dock places on a hull wall (airlock)", ok && w.cells[idx(w, 9, 6)].type === "wall");
}

// --- A methane wing draws its own visitor class (Vorn = the CH₄ Drenn) ---
{
  const w = createWorld();
  carve(w, 5, 5, 11, 9); // interior x6-10, y6-8
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 6);
  addStructure(w, "ch4gen", 6, 7); // methane wing
  addStructure(w, "hotel", 8, 8); // a CH₄ hotel room
  addDock(w, 11, 7);
  // prep the hotel for Vorn (their lodging unlocks with Methane Life-Support)
  w.unlocked.methane = true;
  Object.values(w.structures).find((s) => s.kind === "hotel")!.recipe = "vorn";
  w.stock.meals.rations = 50;
  let vorn = 0;
  for (let i = 0; i < 2000 && vorn === 0; i++) {
    step(w);
    vorn = Object.values(w.agents).filter((a) => a.alive && a.species === "vorn").length;
  }
  check("Vorn breathe methane and only ever visit", SPECIES.vorn.gas === "ch4" && SPECIES.vorn.role.includes("Visitor"));
  check("A methane wing + CH₄ hotel draws Vorn visitors", vorn >= 1);
}

// --- Fuel/dock research gating (Fuel Refining is a Tier-1 root node) ---
{
  const w = createWorld();
  check("Fuel Refinery is gated behind Fuel Refining", toolLock(w, "fuelrefinery")?.id === "fuelrefining");
  check("Large Dock is gated behind Expanded Docking", toolLock(w, "docklarge")?.id === "largedock");
  check("Spaceport Dock is gated behind Spaceport", toolLock(w, "docksuper")?.id === "superdock");
  const fuel = UNLOCKS.find((u) => u.id === "fuelrefining")!;
  check("Fuel Refining is a 1-Lab root node (no prerequisite)", fuel.labs === 1 && !fuel.requires);
  const largeDock = UNLOCKS.find((u) => u.id === "largedock")!;
  check("Expanded Docking requires Fuel Refining", (largeDock.requires ?? []).includes("fuelrefining"));
}

// --- Wall drag traces the perimeter; floor fills the rectangle ---
{
  const w = createWorld();
  const a = idx(w, 5, 5);
  const b = idx(w, 8, 7); // a 4×3 rectangle
  check("Floor drag fills the whole rectangle", dragCells(w, a, b, "floor").length === 12);
  check("Wall drag traces only the perimeter (hollow box)", dragCells(w, a, b, "wall").length === 10);
  check("Erase drag fills the whole rectangle", dragCells(w, a, b, "erase").length === rectCells(w, a, b).length);
  // a 1-wide drag is all perimeter (a straight wall line)
  check("A 1-wide wall drag is a solid line", dragCells(w, idx(w, 5, 5), idx(w, 5, 9), "wall").length === 5);
}

// --- Injuries, Med Bay healing, and social encounters ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 6, "human");
  const a = Object.values(w.agents)[0];
  injure(w, a.id, 60);
  check("Injuring sets the wounded flag + drops health", a.injured && a.health <= 40);
  for (let i = 0; i < 2000 && a.alive; i++) medicalSystem(w, 0.1);
  check("Untreated wounds are eventually fatal (no Med Bay)", !a.alive);
}
{
  const w = createWorld();
  carve(w, 5, 5, 11, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "medbay", 8, 7);
  powerSystem(w, 0.1);
  addAgent(w, 9, 7, "human");
  const a = Object.values(w.agents)[0];
  injure(w, a.id, 60);
  for (let i = 0; i < 300; i++) {
    powerSystem(w, 0.1);
    medicalSystem(w, 0.1);
  }
  check("A powered Med Bay heals the wounded", a.alive && !a.injured && a.health >= 99);
  check("Med Bay is gated behind Medicine research", toolLock(createWorld(), "medbay")?.id === "medicine");
}
{
  // high-tier (2+ Lab) modules are injury-risky to service; basic ones aren't
  check("High-tier modules flagged risky to repair", highTierModule("turret") && highTierModule("fusion"));
  check("Basic modules are safe to repair", !highTierModule("o2gen") && !highTierModule("medbay"));
}
{
  // encounter resolution: disciplining a clash never wounds and clears the encounter
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 6, "human");
  addAgent(w, 7, 6, "korro");
  const ids = Object.keys(w.agents).map(Number);
  w.encounter = { kind: "conflict", aId: ids[0], bId: ids[1], aSpecies: "human", bSpecies: "korro", cell: idx(w, 7, 6) };
  resolveEncounter(w, 1);
  check("Resolving an encounter clears it", w.encounter === null);
  check("Disciplining a clash wounds nobody", Object.values(w.agents).every((x) => !x.injured));
}
{
  // a bond, encouraged, lifts mood
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 6, "drenn", true);
  addAgent(w, 7, 6, "human");
  const ids = Object.keys(w.agents).map(Number);
  w.agents[ids[1]].mood = 50;
  w.encounter = { kind: "bond", aId: ids[0], bId: ids[1], aSpecies: "drenn", bSpecies: "human", cell: idx(w, 7, 6) };
  resolveEncounter(w, 0);
  check("Encouraging a bond raises mood", w.agents[ids[1]].mood > 50);
}
{
  // encounter flavor text varies per pair (the matrix of ~50 variations)
  const titles = new Set<string>();
  for (let v = 0; v < 16; v++) titles.add(encounterText({ kind: "conflict", aId: 0, bId: 1, aSpecies: "human", bSpecies: "korro", cell: 0, variant: v }).title);
  check("Encounters have many text variations per pair", titles.size >= 10);
  const c0 = encounterText({ kind: "conflict", aId: 0, bId: 1, aSpecies: "human", bSpecies: "korro", cell: 0, variant: 0 });
  check("Encounter text fills in the species names", c0.body.includes("Human") && c0.body.includes("Korro"));
}

// --- Tier-3 exotic gases + species ---
{
  const o2After = (gen: "cl2gen" | "o2gen"): number => {
    const w = createWorld();
    carve(w, 5, 5, 9, 8);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 7, 6);
    addStructure(w, gen, 6, 7);
    addAgent(w, 8, 6, "chlorithe");
    for (let i = 0; i < 160; i++) step(w);
    return Object.values(w.agents)[0].o2;
  };
  check("Chlorithe breathes in a sealed Cl₂ wing", o2After("cl2gen") > 80);
  check("Chlorithe suffocates in an O₂ wing", o2After("o2gen") < 60);
  const w = createWorld();
  check("Chlorine/Ammonia/Hydrogen gens are research-gated", toolLock(w, "cl2gen")?.id === "chlorine" && toolLock(w, "nh3gen")?.id === "ammonia" && toolLock(w, "h2gen")?.id === "hydrogen");
  check("Roster now has 10 species", Object.keys(SPECIES).length === 10);
  check("Naaz are the peacemakers (no dislikes)", Object.values(RELATIONS.naaz).every((v) => v >= 0));
}

// --- Exotic food chain: Microbes → Live-Protein / Exo-Culture ---
{
  const w = createWorld();
  carve(w, 5, 5, 11, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 8);
  addStructure(w, "vat", 8, 8);
  addStructure(w, "synth", 9, 6);
  const vat = Object.values(w.structures).find((s) => s.kind === "vat")!;
  const syn = Object.values(w.structures).find((s) => s.kind === "synth")!;
  vat.recipe = "microbes";
  syn.recipe = "protein";
  w.stock.biomass = 0;
  w.stock.microbes = 0;
  let sawMicrobes = false;
  for (let i = 0; i < 400; i++) {
    step(w);
    if (w.stock.microbes > 0) sawMicrobes = true;
  }
  check("Vat (microbes) grows microbes", sawMicrobes);
  check("Synth (protein) produces Live-Protein", w.stock.meals.protein > 0);
  syn.recipe = "exotic";
  for (let i = 0; i < 400; i++) step(w);
  check("Synth (exotic) produces Exo-Culture", w.stock.meals.exotic > 0);
}

// --- Sszra: O₂ carnivore that eats only Live-Protein ---
{
  const w = createWorld();
  carve(w, 5, 5, 11, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 8);
  addStructure(w, "synth", 9, 6);
  addAgent(w, 8, 7, "sszra");
  const s = Object.values(w.agents)[0];
  s.food = 10;
  w.stock.meals.rations = 5;
  w.stock.meals.protein = 0;
  for (let i = 0; i < 100; i++) step(w);
  check("Sszra refuse rations (obligate carnivore)", s.food < 60 && s.alive);
  w.stock.meals.protein = 5;
  for (let i = 0; i < 100; i++) step(w);
  check("Sszra eat Live-Protein", s.food > 80);
}

// --- Temperature / Cryo: climate bands + comfort mood ---
{
  // a powered Heater makes its room hot; a Cryo Unit makes it cold
  const w = createWorld();
  carve(w, 5, 5, 12, 11);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 6);
  addStructure(w, "o2gen", 6, 9);
  addStructure(w, "heater", 9, 9);
  for (let i = 0; i < 10; i++) step(w);
  const heat = Object.values(w.structures).find((s) => s.kind === "heater")!;
  const rid = w.cells[heat.cell].roomId;
  check("A powered Heater makes the room hot", rid >= 0 && w.rooms[rid].temp === "hot");
  eraseAt(w, heat.cell % w.w, (heat.cell / w.w) | 0);
  addStructure(w, "cooler", 9, 9);
  for (let i = 0; i < 10; i++) step(w);
  const cool = Object.values(w.structures).find((s) => s.kind === "cooler")!;
  check("A powered Cryo Unit makes the room cold", w.rooms[w.cells[cool.cell].roomId].temp === "cold");
  check("Heater & Cryo Unit are gated behind Climate Control", toolLock(createWorld(), "heater")?.id === "climate" && toolLock(createWorld(), "cooler")?.id === "climate");
}
{
  // Voltaar want a HOT wing: an un-heated H₂ room dings mood; a Heater fixes it
  const w = createWorld();
  carve(w, 5, 5, 12, 11);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 6);
  addStructure(w, "solar", 9, 6);
  addStructure(w, "h2gen", 6, 9);
  addAgent(w, 11, 7, "voltaar");
  for (let i = 0; i < 10; i++) step(w);
  const v = Object.values(w.agents).find((a) => a.species === "voltaar")!;
  check("Voltaar in an un-heated wing takes a climate mood hit", v.alive && moodBreakdown(w, v).temp < 0);
  addStructure(w, "heater", 9, 9);
  for (let i = 0; i < 10; i++) step(w);
  check("A Heater removes the Voltaar climate penalty", moodBreakdown(w, v).temp === 0);
}

// --- Hazards: Cl₂ corrosion + H₂/O₂ detonation ---
{
  const wear = (gen: "cl2gen" | "o2gen"): number => {
    const w = createWorld();
    carve(w, 5, 5, 11, 9);
    recomputeRooms(w);
    addStructure(w, "solar", 6, 6);
    addStructure(w, "solar", 7, 6);
    addStructure(w, gen, 6, 7);
    addStructure(w, "synth", 9, 6);
    const syn = Object.values(w.structures).find((s) => s.kind === "synth")!;
    syn.condition = 100;
    for (let i = 0; i < 100; i++) step(w); // no crew to repair
    return syn.condition;
  };
  check("Cl₂ corrodes machinery faster than O₂", wear("cl2gen") < wear("o2gen"));
}
{
  // H₂ + O₂ generators in ONE room detonate: gens destroyed + a hull breach
  const w = createWorld();
  carve(w, 5, 5, 12, 10);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "solar", 8, 6);
  addStructure(w, "o2gen", 6, 8);
  addStructure(w, "h2gen", 9, 8);
  addStructure(w, "synth", 10, 6);
  addAgent(w, 11, 7, "human");
  const before = Object.keys(w.structures).length;
  let breached = false;
  let destroyed = false;
  for (let i = 0; i < 20; i++) {
    step(w);
    if (w.breaches.length > 0) breached = true;
    if (Object.keys(w.structures).length < before) destroyed = true;
  }
  check("H₂ + O₂ in one room detonates (generators destroyed)", destroyed);
  check("A hydrogen ignition blows a hull breach", breached);
}

// --- Species-prepped lodging: a bunk only houses the species it's prepped for ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "pod", 8, 7);
  const pod = Object.values(w.structures).find((s) => s.kind === "pod")!;
  pod.recipe = "human";
  addAgent(w, 7, 7, "korro");
  const korro = Object.values(w.agents)[0];
  let slept = false;
  for (let i = 0; i < 200; i++) {
    korro.rest = 5; // keep it wanting sleep
    step(w);
    if (pod.occupantId === korro.id) slept = true;
  }
  check("A Korro won't use a human-prepped bunk", !slept);
  pod.recipe = "korro";
  for (let i = 0; i < 200; i++) {
    korro.rest = 5;
    step(w);
    if (pod.occupantId === korro.id) slept = true;
  }
  check("A Korro uses a Korro-prepped bunk", slept);
}
{
  // lodging gating: Human & Drenn are free; others need their host research
  const w = createWorld();
  check("Human & Drenn lodging is free", lodgingUnlocked(w, "human") && lodgingUnlocked(w, "drenn"));
  check("Thol lodging is gated until researched", !lodgingUnlocked(w, "thol"));
  w.unlocked.methane = true;
  check("Methane Life-Support unlocks Thol lodging", lodgingUnlocked(w, "thol"));
}

// --- Race-gods: visit + judge a species' contentment ---
{
  check("Every species has a god", Object.keys(GODS).length === 10 && Object.values(GODS).every(Boolean));
}
{
  // a content species → the god gifts credits + minerals
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human");
  Object.values(w.agents)[0].mood = 90;
  w.gods.push({ species: "human", x: w.w / 2, y: w.h / 2, vx: 0, vy: 0, t: 11.95, judged: false, verdict: "none" });
  const cr0 = w.credits, min0 = w.stock.minerals;
  for (let i = 0; i < 5; i++) godsSystem(w, 0.1); // crosses the judge time
  check("A pleased god gifts credits + minerals", w.credits > cr0 && w.stock.minerals > min0);
  check("Pleased verdict recorded", w.gods[0]?.verdict === "pleased");
}
{
  // a wretched species → the god unmakes a module (but spares life support)
  const w = createWorld();
  carve(w, 5, 5, 11, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addStructure(w, "synth", 9, 7);
  addAgent(w, 7, 6, "human");
  Object.values(w.agents)[0].mood = 8;
  const before = Object.keys(w.structures).length;
  w.gods.push({ species: "human", x: w.w / 2, y: w.h / 2, vx: 0, vy: 0, t: 11.95, judged: false, verdict: "none" });
  for (let i = 0; i < 5; i++) godsSystem(w, 0.1);
  check("A wrathful god unmakes a module", Object.keys(w.structures).length < before);
  check("Wrath spares life support", Object.values(w.structures).some((s) => s.kind === "o2gen"));
}

// --- The Chronicler (storyteller) + year count ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 6, "human");
  storySystem(w, 0.1);
  check("Chronicler welcomes a newly-present race", w.story.includes("Human") && w.welcomed.includes("human"));
  check("Year count starts at 1+", currentYear(w) >= 1);
  w.tick = 1000; // 100 in-world years at 10 ticks/yr
  check("Year count advances with ticks", currentYear(w) === 101);
}

// --- Reproduction: contented species lay clutches that hatch young + spiders ---
{
  // a contented species (2+ residents, high mood) is offered a clutch
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human");
  addAgent(w, 8, 6, "human");
  for (const id in w.agents) w.agents[id].mood = 90;
  w.tick = 2000; // past BREED_FIRST
  w.breedTimer = 10_000; // force a roll this call
  spawnSystem(w, 0.1);
  check("A contented species is offered a clutch", w.breedOffer !== null && w.breedOffer!.species === "human");
}
{
  // accepting lays the clutch and pays credits
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addAgent(w, 7, 6, "human");
  w.breedOffer = { species: "human", eggs: 5, reward: BREED_REWARD };
  const c0 = w.credits;
  resolveBreed(w, true);
  check("Accepting a clutch lays the eggs", w.eggs.length === 5);
  check("Accepting a clutch pays the offered credits", w.credits === c0 + BREED_REWARD);
  check("The clutch offer clears once answered", w.breedOffer === null);
}
{
  // refusing lays nothing and disheartens the species
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 6, "human");
  const a = Object.values(w.agents)[0];
  a.mood = 80;
  w.reputation.human = 50;
  w.breedOffer = { species: "human", eggs: 5, reward: BREED_REWARD };
  resolveBreed(w, false);
  check("Refusing a clutch lays no eggs", w.eggs.length === 0);
  check("Refusing dents the species' reputation", (w.reputation.human ?? 50) < 50);
  check("Refusing dents the species' mood", a.mood < 80);
}
{
  // eggs incubate, then hatch into a mix of young (crew) + spiders
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  for (let i = 0; i < 6; i++) w.eggs.push({ id: w.nextId++, species: "human", cell: idx(w, 6 + i, 6), t: 0.05 });
  const before = Object.values(w.agents).length;
  spawnSystem(w, 0.1); // incubation elapses → all hatch
  const young = Object.values(w.agents).length - before;
  const spiders = w.pests.length;
  check("A clutch hatches (no eggs left)", w.eggs.length === 0);
  check("Hatchlings split into young + spiders summing to the clutch", young + spiders === 6);
}
{
  // crew hunt down and kill a spider (the parent species hunts hardest)
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  w.pests.push({ id: w.nextId++, species: "human", cell: idx(w, 9, 6), health: PEST_HEALTH, moveAcc: 0 });
  addAgent(w, 9, 7, "human");
  addAgent(w, 8, 6, "human");
  let killed = false;
  for (let i = 0; i < 200; i++) {
    spawnSystem(w, 0.1);
    if (w.pests.length === 0) { killed = true; break; }
  }
  check("The crew hunt down and kill a spider", killed);
}
{
  // an un-hunted spider gnaws on machinery
  const w = createWorld();
  carve(w, 5, 5, 14, 12);
  recomputeRooms(w);
  addStructure(w, "synth", 7, 7);
  const syn = Object.values(w.structures).find((s) => s.kind === "synth")!;
  syn.condition = 100;
  w.pests.push({ id: w.nextId++, species: "human", cell: idx(w, 7, 8), health: PEST_HEALTH, moveAcc: 0 });
  for (let i = 0; i < 50; i++) spawnSystem(w, 0.1);
  check("An un-hunted spider gnaws a module's condition", syn.condition < 100);
}

// --- Love & romance: couples, the calendar, thaw, work boost, implants ---
function newCrew(): { w: World; a: number; b: number } {
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human");
  addAgent(w, 8, 6, "korro");
  const ids = Object.values(w.agents).map((x) => x.id);
  return { w, a: ids[0], b: ids[1] };
}
function forceCouple(w: World, a: number, b: number) {
  for (let i = 0; i < 4000 && !coupleOf(w, a); i++) {
    w.romance = null;
    maybeFallInLove(w, a, b, true);
  }
  w.romance = null;
  return coupleOf(w, a);
}
{
  const { w, a, b } = newCrew();
  const c = forceCouple(w, a, b);
  check("A bond can (rarely) become a love-couple", !!c);
  check("Both partners record the mate", w.agents[a].mateId === b && w.agents[b].mateId === a);
}
{
  // a couple thaws hate between their own two species AND lifts every pair a little
  const { w, a, b } = newCrew();
  forceCouple(w, a, b);
  check("A love-couple thaws their own species' hatred", effRelation(w, "human", "korro") > -15);
  check("A love-couple warms the whole station (global thaw)", effRelation(w, "human", "thol") > -8);
}
{
  // calm days grow love; with no couple there's no thaw
  const wnone = createWorld();
  romanceSystem(wnone, 0.1);
  check("No couples ⇒ no relation thaw", effRelation(wnone, "human", "korro") === -15);

  const { w, a, b } = newCrew();
  const c = forceCouple(w, a, b)!;
  c.day = 0; c.dayAcc = 0; c.love = 30;
  for (let d = 0; d < 4; d++) romanceSystem(w, ROMANCE_DAY); // 4 calm days (exact day steps)
  check("Love grows over calm days", c.day === 4 && c.love === 30 + 4 * LOVE_PER_DAY);
}
{
  // day 5 is turbulence — a dialog always fires (dice decides stay/split)
  const { w, a, b } = newCrew();
  const c = forceCouple(w, a, b)!;
  c.day = 4; c.dayAcc = 0; c.love = 95; w.romance = null;
  for (let i = 0; i < ROMANCE_DAY * 10 + 2; i++) romanceSystem(w, 0.1);
  check("A turbulence day raises a romance dialog", w.romance !== null);
  check("Turbulence dialog is a turbulence/breakup card",
    !!w.romance && (w.romance.kind === "turbulence" || w.romance.kind === "breakup"));
}
{
  // truly-in-love (love >= 70) crew work +50%
  const { w, a, b } = newCrew();
  const c = forceCouple(w, a, b)!;
  c.love = 40;
  check("Below the threshold, no work boost", loveBoost(w, a) === 1 && !isTrulyInLove(w, a));
  c.love = 80;
  check("Truly in love ⇒ +50% work boost", loveBoost(w, a) === 1.5 && isTrulyInLove(w, a));
}
{
  // implants: cross-gas lovers get breathing implants once researched + truly in love
  const w = createWorld();
  carve(w, 5, 5, 12, 9);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 6, "human"); // O₂
  addAgent(w, 8, 6, "thol"); // CH₄ — cross-gas couple
  const ids = Object.values(w.agents).map((x) => x.id);
  const c = forceCouple(w, ids[0], ids[1])!;
  c.love = 80; c.implanted = false; c.day = 1; c.dayAcc = 0; w.romance = null;
  romanceSystem(w, 0.1); // no implants tech yet
  check("No Implants tech ⇒ no implants granted", !c.implanted && w.agents[ids[0]].implantGas === null);
  w.unlocked.implants = true;
  w.romance = null;
  romanceSystem(w, 0.1);
  check("Implants tech ⇒ cross-gas lovers get implants", c.implanted);
  check("Each partner can now breathe the other's gas",
    w.agents[ids[0]].implantGas === SPECIES.thol.gas && w.agents[ids[1]].implantGas === SPECIES.human.gas);
  check("Implant grant raises a dialog", !!w.romance && w.romance.kind === "implant");
}
{
  // an implanted off-gas partner survives in the other's wing
  const w = createWorld();
  carve(w, 5, 5, 9, 8); // an O₂ room
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  for (let i = 0; i < 20; i++) step(w); // fill with O₂
  addAgent(w, 7, 7, "thol"); // a Thol stuck in O₂
  const thol = Object.values(w.agents).find((x) => x.species === "thol")!;
  thol.implantGas = "o2"; // implanted to breathe oxygen
  let survived = true;
  for (let i = 0; i < 200; i++) { step(w); if (!thol.alive) survived = false; }
  check("An implanted partner survives in the other's air", survived && thol.o2 > 80);
}

// --- Vision cones: crew spot faults by sight, and patrol to find unseen ones ---
{
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addAgent(w, 7, 7, "human");
  const h = Object.values(w.agents)[0];
  check("Crew have a personal eyesight range", h.sight >= 2 && h.sight <= 6);
}
{
  // idle crew with nothing wrong stand still — no needless wandering
  const w = createWorld();
  carve(w, 5, 5, 9, 8);
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "o2gen", 6, 7);
  addAgent(w, 7, 7, "human");
  const h = Object.values(w.agents)[0];
  for (let i = 0; i < 40; i++) step(w); // settle (air fills)
  const at = h.cell;
  for (let i = 0; i < 60; i++) step(w);
  check("Idle crew with no faults stand still (no needless wandering)", h.cell === at);
}
{
  // a fault out of sight is found by patrolling and then fixed
  const w = createWorld();
  carve(w, 5, 5, 16, 9); // a long hall
  recomputeRooms(w);
  addStructure(w, "solar", 6, 6);
  addStructure(w, "solar", 7, 6);
  addStructure(w, "o2gen", 6, 8);
  addStructure(w, "synth", 14, 6); // far end
  const syn = Object.values(w.structures).find((s) => s.kind === "synth")!;
  for (let i = 0; i < 30; i++) step(w); // fill air
  syn.condition = 30; // break it, far from the crew
  addAgent(w, 7, 8, "human");
  const h = Object.values(w.agents)[0];
  h.sight = 2; // short-sighted: must get close to spot it
  let fixed = false;
  for (let i = 0; i < 3000 && !fixed; i++) {
    step(w);
    if (syn.condition >= 60) fixed = true;
  }
  check("Crew patrol to discover and fix an out-of-sight fault", fixed);
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
