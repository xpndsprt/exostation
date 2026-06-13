# EXOSTATION — Buildable & Interactive Items Catalog

> **Status:** This file is split into two parts. **§ Implemented modules** is authoritative for the current build — it mirrors `src/structures.ts` (the `STRUCTURES` table + `TILE_COST`) and the prices in [`COSTS.md`](COSTS.md); **code is the source of truth**. **§ Design backlog** preserves the original aspirational catalog as a north-star — those items are **NOT in the current build**. Behaviour is documented in [`STRATEGY.md`](STRATEGY.md); tune values against [`BALANCE.md`](BALANCE.md). Credits = ¢. Power measured in **PU (power units)**.

## Power economy convention
- **Generators** show power as **`+N`** (supply). **Consumers** show **`N`** (draw when powered).
- Net power is station-wide: `net = supply − draw`. Surplus charges the battery; deficit drains it.
- **Brownout:** when the battery is empty and draw still exceeds supply, modules are **shed by priority** (higher `priority` is shed last). Life support (O₂/CH₄ gen, priority 10) is shed last; pods/docks/bays/turrets go dark first. Losing power to life support is how a brownout becomes a body count.
- See the **[State glossary](#state-glossary)** at the bottom for what each runtime state means.

---

# Implemented modules (current build)

Exactly the 15 modules in `STRUCTURES` plus the three structural tiles. Footprint is `w×h` from the code; cost mirrors [`COSTS.md`](COSTS.md). Deconstructing a module refunds **50%** of its cost.

## Structural tiles
Defined by `TILE_COST` in `src/structures.ts`. The skeleton: defines rooms, atmosphere boundaries, and the traversal graph.

| Tile | Achieves | Power | Footprint | Cost ¢ | States |
|------|----------|:-----:|:---------:|:------:|--------|
| Floor | Buildable deck; defines a room's extent. Drag-rectangle fill. | 0 | 1×1 | 2 | built |
| Wall | Blocks movement & gas; structural hull. Drag-rectangle fill. | 0 | 1×1 | 3 | intact / breached |
| Door | Walkable passage that **blocks gas** — links wings without mixing their atmospheres; crew cross on suit. Single click. | 0 | 1×1 | 25 | walkable airlock |

## Modules
| Module | Kind | Achieves | Power | Footprint | Cost ¢ | Tech gate | States |
|--------|------|----------|:-----:|:---------:|:------:|-----------|--------|
| Solar Panel | `solar` | Generates power from starlight. **Mounts on a space-facing wall and extends 3 tiles out into space.** | +10 | 1×3 (wall) | 60 | — | placed (lit) |
| Battery | `battery` | Stores **50 PU** of surplus for when draw exceeds supply. | 0 | 1×1 | 80 | — | charging / discharging |
| O₂ Generator | `o2gen` | Emits **oxygen** life support into its room (O₂ species). Top brownout priority (10). | 6 | 2×2 | 90 | — | on / off / unpowered |
| Methane Gen | `ch4gen` | Emits **methane (CH₄)** life support — a sealed CH₄ wing to host **Thol**. Top brownout priority (10). | 9 | 2×2 | 140 | **Methane Life-Support** (¢350) | on / off / unpowered |
| Rations Synth | `synth` | Converts a base resource → a food line: **Rations** (from biomass) or **Fungal Mash** (from spores). Recipe: 2 base → 4 meals / 10s (`SYNTH`). | 5 | 2×1 | 70 | — (Fungal recipe needs **Fungal Synthesis**, ¢300) | producing / idle / input-short |
| Bio Vat | `vat` | Grows a food base from power: **Biomass** or **Spores** (recipe). +3 / 8s (`VAT`). | 6 | 2×2 | 90 | — (Spores recipe needs **Fungal Synthesis**, ¢300) | growing / unpowered |
| Crew Quarters | `pod` | Where **resident crew** sleep. | 1 | 1×1 | 40 | — | assigned / vacant |
| Bot Bay | `bay` | Launches / docks / recharges a **mining drone** that gathers minerals. | 4 | 2×2 | 120 | — | cycling / occupied / free |
| Docking Port | `dock` | **Hull airlock placed on a space-facing wall.** Ships park outside and bring guests; the berth for arrivals. | 5 | 1×1 (wall) | 150 | — | guests arrive / free |
| Lounge | `rec` | Entertainment: crew **and** visitors path here to relax (restore **Fun**) and socialize when fun runs low. | 4 | 2×2 | 80 | — | busy / empty |
| Hotel Room | `hotel` | Where **visitors** lodge; total Hotel Rooms set guest capacity and drive lodging income. | 2 | 2×1 | 60 | — | assigned / vacant |
| Trade Hub | `tradehub` | Lets **traders dock and buy your minerals** for credits — the trade-income engine. | 5 | 2×2 | 120 | — | active / unpowered |
| Research Lab | `lab` | Enables the **TECH** panel: spend credits to research unlocks. Must stay powered to research. | 6 | 2×1 | 150 | — | powered / unpowered |
| Storage Silo | `silo` | Raises **every** resource cap by **+250**. Unpowered (no draw). | 0 | 1×1 | 70 | **Cargo Logistics** (¢250) | placed |
| Turret | `turret` | Auto-fires on a **raider** ship parked at the dock, shooting it down before it wrecks modules. | 4 | 1×1 | 200 | **Station Security** (¢500) | idle / firing / unpowered |
| Light Fixture | `lamp` | Emits a warm **light pool**; modules cast soft shadows away from the nearest light (visual fidelity layer). | 1 | 1×1 | 30 | — | on / off |
| Fusion Reactor | `fusion` | **+150 PU** generator — but **burns ~0.6 minerals/s** as fuel; out of fuel it produces nothing (needs a Bot Bay mining). | +150 | 2×2 | 2000 | **Fusion Power** (¢600) | fuelled / out-of-fuel |
| Cargo Exchange | `cargoex` | Upgraded trade: **60 ore / 20 s at ×1.5 price** + **+500 mineral cap**. Works standalone. | 6 | 2×2 | 1500 | **Bulk Trade** (¢600) | active / unpowered |
| AI Core | `aicore` | Station-wide **×1.25** to food production, mining and repair while powered. | 10 | 2×2 | 2500 | **Cybernetics** (¢800) | active / unpowered |
| Command Hub | `cmdhub` | **Beacon (Human):** +8 station-wide mood while a Human is in its room. Charges the Beacon. | 6 | 2×2 | 800 | **Command Hub** (¢700, 3 Labs) | charging / idle |
| Trade Nexus | `tradenexus` | **Beacon (Drenn):** ×1.5 trade income while a Drenn is aboard. Charges the Beacon. | 6 | 2×2 | 800 | **Trade Nexus** (¢700, 3 Labs) | charging / idle |
| Auto-Forge | `autoforge` | **Beacon (Thol):** repairs every module station-wide while a Thol is in its room. Charges the Beacon. | 6 | 2×2 | 800 | **Auto-Forge** (¢700, 3 Labs) | charging / idle |
| Bloom Garden | `bloomgarden` | **Beacon (Vry'l):** ×1.5 food production while a Vry'l is in its room. Charges the Beacon. | 6 | 2×2 | 800 | **Bloom Garden** (¢700, 3 Labs) | charging / idle |
| Ore Refinery | `orerefinery` | **Beacon (Korro):** ×1.5 mining yield while a Korro is in its room. Charges the Beacon. | 6 | 2×2 | 800 | **Ore Refinery** (¢700, 3 Labs) | charging / idle |

**The Sector Beacon (win):** each signature module only operates while powered *and* its species is present in its room; it charges 0→100% at 2%/s. Charging all five completes the final objective. (See `src/beacon.ts`.)

### Recipe / cap constants (from `src/structures.ts`)
- **Bio Vat** (`VAT`): produces **+3** base every **8s**.
- **Rations Synth** (`SYNTH`): consumes **2** base → **4** meals every **10s**.
- Resource caps (see `STRATEGY.md`): biomass 400 · spores 250 · meals 50/line · minerals 200. Each **Storage Silo** adds **+250** to all caps; each **Cargo Exchange** adds **+500** to the mineral cap.

### Tech unlocks (researched at powered Labs — higher tiers need more Labs; from `src/research.ts`)
| Unlock | Cost ¢ | Labs | Enables |
|--------|:------:|:----:|---------|
| Energy Storage | 100 | 1 | **Battery Bank** |
| Recreation | 120 | 1 | **Lounge** |
| Robotics | 150 | 1 | **Bot Bay** |
| Commerce | 150 | 1 | **Trade Hub** |
| Cargo Logistics | 250 | 2 | **Storage Silo** |
| Fungal Synthesis | 300 | 2 | **Spores**/**Fungal Mash** recipes (feed Vry'l) |
| Methane Life-Support | 350 | 2 | **Methane Gen** (host Thol) |
| Station Security | 500 | 2 | **Turret** |
| Fusion Power | 600 | 3 | **Fusion Reactor** |
| Bulk Trade | 600 | 3 | **Cargo Exchange** |
| Cybernetics | 800 | 3 | **AI Core** |
| Command Hub · Trade Nexus · Auto-Forge · Bloom Garden · Ore Refinery | 700 ea | 3 | the 5 **Beacon** signature modules (the win) |

Only the survival core is free from the start: floor/wall/door, Solar Panel, O₂ Generator, Rations Synth, Bio Vat, Crew Quarters, Docking Port, Hotel Room, Research Lab, Light Fixture. Everything else is researched.

---

# Design backlog (planned, not yet built)

> Everything below is the original **design vision** — the north-star catalog. **None of it is in the current build** except where it overlaps a shipped module above (which is the authoritative version). Prices/sizes here are first-pass aspirational values, not the shipped numbers.

## 1 · Structure & Connectivity
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Deck Tile | Buildable floor; defines a room's extent | 0 | 1 | 5 | built / damaged |
| Wall | Blocks movement & gas; structural | 0 | 1 | 10 | intact / breached |
| Door | Passage; holds atmosphere when closed | 1 | 1 | 40 | open / closed / locked |
| Airlock (internal) | Passage **between different atmospheres** without mixing | 2 | 1 | 120 | cycling / sealed / open |
| Space-facing Airlock | EVA egress to vacuum; spacewalk point | 2 | 1 | 150 | cycling / sealed / suited-transit |
| Corridor | Traversal + atmosphere conduit (deck + walls) | 0 | n | 5/tile | pressurized / vented |
| Tunnel (connector) | Re-links severed station sections (traversal only) | 0 | n | 60/seg | pressurized / vented / severed |
| Blast Door | Auto-seals a breach front (needs Security III) | 3 | 1 | 300 | open / auto-sealed / manual-lock |

## 2 · Power
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Solar Panel I | Generates power from starlight | +10 | 2×1 | 200 | lit / shaded / damaged |
| Solar Panel II | Higher-yield array | +18 | 2×1 | 450 | lit / shaded / damaged |
| Solar Panel III | Top-tier array | +30 | 2×2 | 900 | lit / shaded / damaged |
| Battery Bank | Stores surplus power (50 PU) for dark side | 0 | 1×1 | 250 | charging / discharging / full / empty |
| Power Conduit | Routes power between modules | 0 | n | 3/tile | connected / severed |
| Fusion Reactor *(late)* | Large steady supply; **burns Hydrogen fuel** | +120 | 3×3 | 6,000 | fueled / unfueled / overheating |

## 3 · Life Support & Atmosphere
Top brownout priority. One Atmosphere Generator per gas type; each species' wing needs the matching gas.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| O₂ Generator | Maintains Oxygen in a zone (Tier 1–2 species) | 6 | 1×1 | 300 | on / off / supply-short |
| Methane (CH₄) Generator | Methane atmosphere (Thol) — **flammable** | 9 | 1×1 | 700 | on / off / supply-short |
| Ammonia (NH₃) Generator | Ammonia atmosphere (Naaz) | 11 | 1×1 | 1,100 | on / off / supply-short |
| Chlorine (Cl₂) Generator | Chlorine atmosphere (Chlorithe) — **corrosive** | 12 | 1×1 | 1,300 | on / off / supply-short |
| Hydrogen (H₂) Generator | Hydrogen atmosphere (Voltaar) — **explosive** | 14 | 1×1 | 1,600 | on / off / supply-short |
| Gas Scrubber | Removes contamination / cross-mixed gas | 4 | 1×1 | 250 | scrubbing / idle / saturated |
| Atmosphere Pump | Moves / balances gas between rooms | 2 | 1×1 | 180 | pumping / idle |
| Thermal Regulator | Holds a zone's temperature | 5 | 1×1 | 350 | heating / cooling / off |
| Cryo Cooler | Deep-cold zone (Naaz) — exotic | 12 | 2×1 | 1,400 | cooling / off / fault |
| Leak Sensor | Detects breaches; triggers alerts & auto-seal | 1 | 1×1 | 120 | armed / tripped |

## 4 · Food, Water & Storage
One Synthesizer per food line. Quality tier (Basic/Refined/Gourmet) raises draw and mood — but only for species with a palate.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Standard Rations Synthesizer | Food for Humans/Drenn/Korro/Thol | 5 | 2×1 | 400 | producing / idle / input-short · quality:B/R/G |
| Live Protein Synthesizer | Food for Sszra (carnivore) | 7 | 2×1 | 600 | producing / idle / input-short · quality:B/R/G |
| Fungal Mash Synthesizer | Food for Vry'l | 5 | 2×1 | 550 | producing / idle / input-short |
| Mineral Slurry Synthesizer | Food for Chlorithe (silicon) | 6 | 2×1 | 900 | producing / idle / input-short |
| Cryo-Gel Feed Synthesizer | Food for Naaz | 8 | 2×1 | 1,200 | producing / idle / input-short · quality:B/R/G |
| Plasma Feed Emitter | "Food" (energy) for Voltaar | 10 | 2×1 | 1,500 | producing / idle / power-starved |
| Hydroponics Bay | Grows Biomass/Spores on-station (less mining) | 6 | 3×2 | 700 | growing / harvest-ready / unlit |
| Water Reclaimer | Recovers Water from waste | 3 | 1×1 | 300 | reclaiming / idle |
| Resource Silo | Stores raw resources & food | 0 | 2×2 | 200 | stocked / full / empty |

## 5 · Habitation & Comfort
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Sleeping Pod | Rest (species-appropriate); restores mood | 1 | 1×1 | 150 | assigned / vacant / comfort:tier |
| Quarters (suite) | Higher-comfort lodging; premium fees | 2 | 2×2 | 500 | assigned / vacant / comfort:tier |
| Recreation Module | Social space — **where relations play out** | 4 | 3×2 | 600 | busy / empty |
| Sanitation Unit | Hygiene need; prevents mood penalty | 2 | 1×1 | 200 | available / occupied / dirty |
| Decor / Fixture | Ambient mood boost | 0–1 | 1×1 | 50+ | placed |

## 6 · Commerce & Hospitality
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Market Stall | Per-transaction trade income | 2 | 1×1 | 300 | staffed / unstaffed · stocked / empty |
| Trade Hub (bulk) | Bulk trade, better prices (unlock: Commerce) | 6 | 3×2 | 1,500 | open / closed |
| Exotic Exchange | Trades rare Tier 3 goods (×3.5–×5) | 8 | 3×2 | 3,500 | open / closed |
| Reception / Concierge | Raises lodging throughput & guest quality | 3 | 2×1 | 500 | staffed / unstaffed |

## 7 · Docking & Fuel
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Docking Port (large) | Ships arrive (guests, trade, fuel demand) | 5 | 3×3 | 1,200 | occupied / free / reserved |
| Fuel Pump | Sells refined fuel to docked ships | 4 | 1×1 | 400 | pumping / idle / dry |
| Refinery Unit | Converts Ice/Gas → fuel | 10 | 3×2 | 1,800 | running / idle / input-short |

## 8 · Mining, Sensors & Drones
The space-ops fleet (see *Resource Gathering* in [`GAME_DESIGN.md`](GAME_DESIGN.md)). Drones are mobile **units** charged/repaired at bays; their power is drawn at the bay.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Repair Bay | Restores drone integrity (hazard sites) | 6 | 2×2 | 1,100 | repairing / idle |
| Sensor Array I | Radar detect range 1 ring | 3 | 1×1 | 500 | scanning / off |
| Sensor Array II | Detect 2 rings, auto-ID common resources | 5 | 1×1 | 1,200 | scanning / off |
| Sensor Array III | Detect 3 rings + deep scan (richness/hazard) | 8 | 2×1 | 2,800 | scanning / off |
| Mining Bot I / II / III *(unit)* | Gathers resources from sites | (at bay) | — | 400/900/1,800 | docked / transit / mining / charging / damaged |
| Survey Drone *(unit)* | Identifies blips into known sites | (at bay) | — | 350 | docked / surveying / charging |
| Charging Relay *(beacon)* | Forward refuel/charge node in space; +1 ring reach | self | — | 1,000 | online / offline / under-attack |

## 9 · Security & Defense
Backstop for when politics break down (see *The Escalation Ladder*). Adds defensive Combat Power; doesn't replace good architecture.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Guard Post | Stations guards; +defensive CP (Security I) | 2 | 1×1 | 1,500 | staffed / unstaffed |
| Turret (tiered) | Auto-fires on skirmish combatants (Security II) | 3 | 1×1 | 1,200 | idle / firing / disabled |
| Holding Cell | Detains instigators after a skirmish | 1 | 1×1 | 800 | empty / occupied |
| Riot Control Station | Suppression + breach containment (Security III) | 5 | 2×2 | 4,000 | ready / deployed |

---

## State glossary
Common runtime states an item can be in. Most powered items implicitly also have **Powered / Unpowered** (brownout) and **Operational / Damaged / Destroyed** (integrity) on top of those listed.

- **Powered / Unpowered** — receiving enough PU to function, or dropped in a brownout.
- **On / Off** — player toggle (e.g. shut a gas generator for an empty wing to save power).
- **Operational / Damaged / Destroyed** — integrity; damaged = reduced output, destroyed = gone (may sever connectivity / vent atmosphere).
- **Pressurized / Vented** — a room/corridor holds its gas, or is open to vacuum.
- **Open / Closed / Sealed / Cycling** — door & airlock passage states; cycling = mid-transfer.
- **Lit / Shaded** — solar exposure; shaded panels produce ~0.
- **Charging / Discharging / Full / Empty** — battery & drone charge.
- **Producing / Idle / Input-short** — synthesizers & refineries; input-short = missing a base resource.
- **Stocked / Full / Empty** — storage and stall inventory.
- **Staffed / Unstaffed** — has an assigned worker; some commerce/security items only function staffed.
- **Assigned / Vacant** — lodging occupancy.
- **Docked / Transit / Mining / Surveying / Charging / Damaged** — drone unit lifecycle.
- **Online / Offline / Under-attack** — deployed space beacons.
- **Armed / Tripped** — sensors.
