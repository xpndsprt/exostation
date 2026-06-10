# EXOSTATION — Buildable & Interactive Items Catalog

> Master list of everything the player can place or interact with, what it achieves, its **power draw**, footprint, cost, and runtime **states**. First-pass values for prototyping — tune against [`BALANCE.md`](BALANCE.md). Credits = ¢. Power measured in **PU (power units)**.

## Power economy convention
- **Generators** show power as **`+N`** (supply). **Consumers** show **`N`** (draw when operating; most draw ~0 when toggled off or idle).
- Net power = Σ generation − Σ draw. Batteries buffer the surplus for the dark side of an orbit.
- **Brownout:** when draw exceeds supply + battery, modules drop offline by **priority** (Life Support > Security > Food > Commerce > everything else). Losing power to life support is how a brownout becomes a body count.
- See the **[State glossary](#state-glossary)** at the bottom for what each runtime state means.

---

## 1 · Structure & Connectivity
The skeleton. Mostly unpowered; defines rooms, atmosphere boundaries, and the traversal graph.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Deck Tile | Buildable floor; defines a room's extent | 0 | 1 | 5 | built / damaged |
| Wall | Blocks movement & gas; structural | 0 | 1 | 10 | intact / breached |
| Door | Passage; holds atmosphere when closed | 1 | 1 | 40 | open / closed / locked |
| Door *(implemented, M12)* | Walkable but **blocks gas** — links wings without mixing atmospheres; crew cross on suit | 0 | 1 | — | walkable airlock |
| Airlock (internal) | Passage **between different atmospheres** without mixing | 2 | 1 | 120 | cycling / sealed / open |
| Space-facing Airlock | EVA egress to vacuum; spacewalk point | 2 | 1 | 150 | cycling / sealed / suited-transit |
| Corridor | Traversal + atmosphere conduit (deck + walls) | 0 | n | 5/tile | pressurized / vented |
| Tunnel (connector) | Re-links severed station sections (traversal only) | 0 | n | 60/seg | pressurized / vented / severed |
| Blast Door | Auto-seals a breach front (needs Security III) | 3 | 1 | 300 | open / auto-sealed / manual-lock |

## 2 · Power
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Solar Panel I | Generates power from starlight | +10 | 2×1 | 200 | lit / shaded / damaged |
| Solar Panel *(implemented)* | +10 PU; **mounts on a space-facing wall, extends 3 tiles into space** | +10 | 1×3 | — | placed on hull exterior |
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
| Bio Vat *(implemented)* | Grows a base from power: **Biomass or Spores** (recipe), +3 / 8s | 6 | 2×2 | — | growing / unpowered |
| Rations Synth *(implemented)* | Converts base → food line: **Rations (biomass) or Fungal Mash (spores)**, 2→4 / 10s | 5 | 2×1 | — | producing / idle |
| Water Reclaimer | Recovers Water from waste | 3 | 1×1 | 300 | reclaiming / idle |
| Resource Silo | Stores raw resources & food | 0 | 2×2 | 200 | stocked / full / empty |

## 5 · Habitation & Comfort
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Sleeping Pod | Rest (species-appropriate); restores mood | 1 | 1×1 | 150 | assigned / vacant / comfort:tier |
| Quarters (suite) | Higher-comfort lodging; premium fees | 2 | 2×2 | 500 | assigned / vacant / comfort:tier |
| Recreation Module | Social space — **where relations play out** | 4 | 3×2 | 600 | busy / empty |
| Lounge *(implemented)* | Entertainment: crew & visitors relax (restore Fun) and socialize | 4 | 1×1 | — | busy / empty |
| Crew Quarters *(implemented)* | Where **resident crew** sleep | 1 | 1×1 | — | assigned / vacant |
| Hotel Room *(implemented)* | Where **visitors** lodge; sets guest capacity | 2 | 1×1 | — | assigned / vacant |
| Trade Hub *(implemented)* | Trading station — lets **traders buy your minerals** for credits | 5 | 2×2 | 120 | active / unpowered |
| Trader ship *(implemented)* | Docks periodically (needs a Trade Hub) and **buys minerals** for credits | — | — | — | trading / departed |
| Sanitation Unit | Hygiene need; prevents mood penalty | 2 | 1×1 | 200 | available / occupied / dirty |
| Decor / Fixture | Ambient mood boost | 0–1 | 1×1 | 50+ | placed |

## 6 · Commerce & Hospitality
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Market Stall | Per-transaction trade income | 2 | 1×1 | 300 | staffed / unstaffed · stocked / empty |
| Trade Hub | Bulk trade, better prices (unlock: Commerce) | 6 | 3×2 | 1,500 | open / closed |
| Exotic Exchange | Trades rare Tier 3 goods (×3.5–×5) | 8 | 3×2 | 3,500 | open / closed |
| Reception / Concierge | Raises lodging throughput & guest quality | 3 | 2×1 | 500 | staffed / unstaffed |

## 7 · Docking & Fuel
| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Docking Port | Ships arrive (guests, trade, fuel demand) | 5 | 3×3 | 1,200 | occupied / free / reserved |
| Docking Port *(implemented)* | **Hull airlock — placed on a space-facing wall**; ships park outside and bring Drenn guests | 5 | wall | — | guests arrive by ship |
| Fuel Pump | Sells refined fuel to docked ships | 4 | 1×1 | 400 | pumping / idle / dry |
| Refinery Unit | Converts Ice/Gas → fuel | 10 | 3×2 | 1,800 | running / idle / input-short |

## 8 · Mining, Sensors & Drones
The space-ops fleet (see *Resource Gathering* in [`GAME_DESIGN.md`](GAME_DESIGN.md)). Drones are mobile **units** charged/repaired at bays; their power is drawn at the bay.

| Item | Achieves | Power | Size | Cost ¢ | Key states |
|------|----------|:-----:|:----:|:------:|------------|
| Bot Bay | Launch / dock / recharge mining drones | 4 | 2×2 | 800 | cycling / occupied / free |
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
| Turret | Auto-fires on skirmish combatants (Security II) | 3 | 1×1 | 1,200 | idle / firing / disabled |
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
