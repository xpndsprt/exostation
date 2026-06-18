# EXOSTATION — Build Costs

> **Source of truth for prices.** These mirror the `cost` values in `src/structures.ts` (`STRUCTURES[*].cost` and `TILE_COST`). Code is authoritative; this file is kept in sync as the game is designed. Credits = ¢.

You start a new game with **¢1000**. Building deducts the cost up front; you can't place something you can't afford (its ghost turns red). **Deconstructing** a module refunds **50%** of its cost. Crew aren't bought — they **immigrate by shuttle** once you've built their living conditions. Income comes from **lodging** (guests in Hotel Rooms) and **trade** (a Trade Hub selling minerals); spend it at a **Research Lab** on tech unlocks.

## Structural tiles
| Tile | Cost ¢ |
|------|:------:|
| Floor | 2 |
| Wall | 3 |
| Door (airlock) | 25 |
| Storage Floor (airless; lamp-only; raises caps) | 3 |

## Modules
| Module | Cost ¢ | Footprint | Notes |
|--------|:------:|:---------:|-------|
| Solar Panel | 60 | 1×3 (wall) | Mounts on a space-facing wall |
| Battery | 80 | 1×1 | Stores 50 PU |
| O₂ Generator | 90 | 2×2 | Oxygen life support |
| Methane Gen | 140 | 2×2 | CH₄ life support (Thol) |
| Chlorine Gen | 170 | 2×2 | Cl₂ life support (Chlorithe). Unlock: Chlorine Life-Support |
| Ammonia Gen | 180 | 2×2 | NH₃ life support (Naaz). Unlock: Ammonia Life-Support |
| Hydrogen Gen | 190 | 2×2 | H₂ life support (Voltaar). Unlock: Hydrogen Life-Support |
| Rations Synth | 70 | 2×1 | Biomass → meals |
| Bio Vat | 90 | 2×2 | Grows biomass (food base) |
| Crew Quarters | 40 | 1×1 | Resident sleeping |
| Hotel Room | 60 | 2×1 | Visitor lodging (= guest capacity) |
| Lounge | 80 | 2×2 | Entertainment / recreation |
| Bot Bay | 120 | 1×2 (wall) | Mining drone; hull-mounted on a space-facing wall |
| Docking Port | 150 | wall | Hull airlock; guests + ship berth (3×3 pad) |
| Large Dock | 400 | wall | Bigger berth (5×5 pad): more guests + fuel sold. Unlock: Expanded Docking |
| Spaceport Dock | 900 | wall | Largest berth (7×7 pad): huge ships, most guests + fuel. Unlock: Spaceport |
| Fuel Refinery | 220 | 2×2 | Cracks minerals → ship fuel (needs a Bot Bay). Unlock: Fuel Refining |
| Med Bay | 240 | 2×2 | Heals wounded crew; without one the injured bleed out. Unlock: Medicine |
| Heater | 130 | 2×2 | Warms a wing to **hot** (keeps Voltaar happy). Unlock: Climate Control |
| Cryo Unit | 170 | 2×2 | Chills a wing to **cold** (keeps Naaz happy). Unlock: Climate Control |
| Trade Hub | 120 | 2×2 | Lets traders buy your minerals |
| Research Lab | 150 | 2×1 | Enables the Tech panel (spend credits to research unlocks) |
| Storage Silo | 70 | 1×1 | Raises every resource cap (+250). Unlock: Cargo Logistics |
| Turret | 200 | 1×1 | Shoots down raiders. Unlock: Station Security |
| Light Fixture | 30 | 1×1 | Emits a light pool (visual lighting/shadows); cheap ambiance |
| Mess Table | 50 | 3×3 | A spot for crew to gather and eat (no research) |
| Fusion Reactor | 2000 | 2×2 | +150 PU — but **burns minerals as fuel** (needs a Bot Bay mining). Unlock: Fusion Power |
| Cargo Exchange | 1500 | 2×2 | Bigger/faster/better mineral trade + raises mineral cap. Unlock: Bulk Trade |
| AI Core | 2500 | 2×2 | +25% to all production, repair & mining. Unlock: Cybernetics |
| Command Hub | 800 | 2×2 | Beacon module (Human): station-wide mood lift. Unlock: Command Hub |
| Trade Nexus | 800 | 2×2 | Beacon module (Drenn): +50% trade income. Unlock: Trade Nexus |
| Auto-Forge | 800 | 2×2 | Beacon module (Thol): repairs every module station-wide. Unlock: Auto-Forge |
| Bloom Garden | 800 | 2×2 | Beacon module (Vry'l): +50% food production. Unlock: Bloom Garden |
| Ore Refinery | 800 | 2×2 | Beacon module (Korro): +50% mining yield. Unlock: Ore Refinery |

## Tech unlocks (researched at powered Labs; higher tiers need more Labs)
| Unlock | Cost ¢ | Labs | Enables |
|--------|:------:|:----:|---------|
| Energy Storage | 100 | 1 | Battery Bank |
| Recreation | 120 | 1 | Lounge |
| Robotics | 150 | 1 | Bot Bay |
| Commerce | 150 | 1 | Trade Hub |
| Fuel Refining | 150 | 1 | Fuel Refinery (root node) |
| Medicine | 200 | 1 | Med Bay |
| Cargo Logistics | 250 | 2 | Storage Silo |
| Climate Control | 300 | 2 | Heater + Cryo Unit |
| Exobiology | 350 | 2 | Microbes / Live-Protein / Exo-Culture recipes (feed Sszra + exotic crews) |
| Expanded Docking | 350 | 2 | Large Dock (needs Fuel Refining) |
| Breathing Implants | 400 | 2 | Cross-gas love-couples can cohabit (needs Medicine) |
| Spaceport | 700 | 3 | Spaceport Dock (needs Expanded Docking) |
| Fungal Synthesis | 300 | 2 | Spores/Fungal recipes (feed Vry'l) |
| Methane Life-Support | 350 | 2 | Methane Gen (host Thol) |
| Chlorine Life-Support | 400 | 2 | Chlorine Gen (host Chlorithe) |
| Ammonia Life-Support | 450 | 2 | Ammonia Gen (host Naaz) |
| Hydrogen Life-Support | 500 | 2 | Hydrogen Gen (host Voltaar) |
| Station Security | 500 | 2 | Turret |
| Fusion Power | 600 | 3 | Fusion Reactor |
| Bulk Trade | 600 | 3 | Cargo Exchange |
| Cybernetics | 800 | 3 | AI Core |
| Command Hub / Trade Nexus / Auto-Forge / Bloom Garden / Ore Refinery | 700 ea | 3 | the 5 Beacon signature modules (the win) |

*(Battery, Lounge, Bot Bay and Trade Hub are research-gated — build a Lab first. The unlock cost is separate from the build cost above.)*

## Income (for reference)
| Source | Rate |
|--------|------|
| Lodging | ~1.5¢/s per guest (needs Hotel Rooms) |
| Mineral trade | ~25 minerals × 3¢ every ~30s (needs a powered Trade Hub) |
| Fuel sales | every docking ship buys fuel at 4¢/unit on landing — 6 / 18 / 40 units for a standard / large / spaceport dock (needs Fuel Refineries stocked) |

*Deconstruct refund: 50% of build cost.*
