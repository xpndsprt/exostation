# EXOSTATION — Build Costs

> **Source of truth for prices.** These mirror the `cost` values in `src/structures.ts` (`STRUCTURES[*].cost` and `TILE_COST`). Code is authoritative; this file is kept in sync as the game is designed. Credits = ¢.

You start a new game with **¢1000**. Building deducts the cost up front; you can't place something you can't afford (its ghost turns red). **Deconstructing** a module refunds **50%** of its cost. Crew (Human/Thol) are free to add. Income comes from **lodging** (guests in Hotel Rooms) and **trade** (a Trade Hub selling minerals).

## Structural tiles
| Tile | Cost ¢ |
|------|:------:|
| Floor | 2 |
| Wall | 3 |
| Door (airlock) | 25 |

## Modules
| Module | Cost ¢ | Footprint | Notes |
|--------|:------:|:---------:|-------|
| Solar Panel | 60 | 1×3 (wall) | Mounts on a space-facing wall |
| Battery | 80 | 1×1 | Stores 50 PU |
| O₂ Generator | 90 | 2×2 | Oxygen life support |
| Methane Gen | 140 | 2×2 | CH₄ life support (Thol) |
| Rations Synth | 70 | 2×1 | Biomass → meals |
| Bio Vat | 90 | 2×2 | Grows biomass (food base) |
| Crew Quarters | 40 | 1×1 | Resident sleeping |
| Hotel Room | 60 | 2×1 | Visitor lodging (= guest capacity) |
| Lounge | 80 | 2×2 | Entertainment / recreation |
| Bot Bay | 120 | 2×2 | Mining drone (minerals) |
| Docking Port | 150 | wall | Hull airlock; guests + ship berth |
| Trade Hub | 120 | 2×2 | Lets traders buy your minerals |

## Income (for reference)
| Source | Rate |
|--------|------|
| Lodging | ~1.5¢/s per guest (needs Hotel Rooms) |
| Mineral trade | ~25 minerals × 3¢ every ~30s (needs a powered Trade Hub) |

*Deconstruct refund: 50% of build cost.*
