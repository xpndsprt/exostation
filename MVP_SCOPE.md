# EXOSTATION — MVP Scope

> The deliberately small first build. Everything here ships; everything in **Out of scope** waits. Stack: **TypeScript + Vite + PixiJS**. See [`TECH_DESIGN.md`](TECH_DESIGN.md) for how it's built.

## Goal
A playable vertical slice that proves the core loop end-to-end, then introduces a second compatible species (guests + lodging income) — **without** incompatibility, politics, or combat.

> Build a sealed, powered station; run O₂ life support; send a drone to mine water + biomass; synthesize food; keep a resident **Human** alive; then accept arriving **Drenn** guests who share the same air and food, and earn lodging credits — all with pause/speed and clear failure feedback (suffocation, starvation, brownout).

## In scope
**Build & grid**
- Place/remove: Deck Tile, Wall, Door, (space-facing) Airlock.
- Automatic **room detection** (enclosed-space flood fill) and a sealed/breached state.

**Modules (subset of the catalog)**
- Power: Solar Panel I, Battery Bank.
- Life support: O₂ Generator.
- Food: Standard Rations Synthesizer, Resource Silo.
- Habitation: Sleeping Pod.
- Mining: Bot Bay (+ one Mining Bot unit).
- Docking: Docking Port (guest arrivals).

**Simulation systems**
- **Power**: single station-wide network — Σ generation vs Σ draw + battery buffer; **brownout** sheds load by priority (Life Support first to stay on).
- **Atmosphere (per-room zone)**: an enclosed room with a powered O₂ Generator is breathable; a breach (open to space) or power loss makes it not.
- **Agents (autonomy)**: needs = O₂, Food, Rest, plus a simple Mood. Utility-based action selection; **A\*** pathfinding on the grid.
- **Mining loop**: Mining Bot flies Bot Bay → asteroid site → back, delivering Biomass + Water to the Silo; Synthesizer consumes them to make meals.
- **Species**: **Humans** (start) and **Drenn** (arriving guests) — both O₂ + Standard Rations, fully compatible.
- **Economy (minimal)**: occupied Sleeping Pods earn lodging credits per day; credits spent on construction.
- **Time**: fixed-step tick loop with Pause / 1× / 2× / 3×.

**UI / UX**
- Camera pan + zoom; build palette; selection/info panel (shows an item's state & power); top bar (credits, power balance, time controls); alert toasts (brownout, suffocation, starvation).
- **Save/Load** to localStorage.

## Out of scope (deferred to post-MVP)
- Tier 2 / Tier 3 species; multi-gas atmospheres (CH₄/Cl₂/NH₃/H₂); temperature/cryo.
- The **political web**, relations, mood-from-neighbors.
- **Skirmishes, combat, takeover**, security modules.
- **Radar fog/survey**, multiple/depleting/moving sites, standing-order auto-dispatch, charging relays.
- Trade market depth, refinery/fuel sales, hydroponics, quality tiers, research tree.
- **EVA/spacewalk** and decompression spread (rooms simply mark breached/unbreathable for now).
- Pirates, events, sound, real art (placeholder shapes/sprites only).

## Milestones (each independently runnable)
- **M0** — Boots to a rendered grid; camera pan/zoom.
- **M1** — Build mode: place/remove tiles, walls, doors; live room detection + sealed/breached.
- **M2** — Power network: solar + battery; draw vs supply; brownout shedding.
- **M3** — Atmosphere per room; one Human who breathes and **suffocates** without O₂.
- **M4** — Needs + A\* pathfinding; Sleeping Pod (rest) and eating meals from the Silo.
- **M5** — Mining Bot loop fills the Silo; Synthesizer turns resources into meals.
- **M6** — Docking Port spawns **Drenn** guests; occupied pods earn lodging credits.
- **M7** — Time controls, save/load, alerts, info panel polish.

## Definition of done (MVP)
A fresh load lets the player build a sealed powered room, keep a Human alive indefinitely via the mining→food→O₂ loop, watch Drenn guests dock and lodge for credits, survive a deliberately induced brownout by re-prioritizing power, and reload the saved station — with no crashes at 3× speed on an ~80×80 grid with dozens of agents.
