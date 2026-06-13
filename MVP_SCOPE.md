# EXOSTATION — MVP Scope & Milestone History

> **STATUS — the MVP is complete; the game is now well beyond it (~M39).**
> This document's original purpose was to define the deliberately small first
> build (M0–M7). That slice **shipped long ago** and every item below it is
> historical. The game has since grown through multi-gas atmospheres, a political
> web, combat, a five-species roster, objectives/win-lose, a tech tree, station
> incidents, an economy with upkeep, and live skirmishes.
>
> **For the live build, the source-of-truth docs are:**
> - [`STRATEGY.md`](STRATEGY.md) — every mechanic, player-facing, kept in sync with the code.
> - [`BALANCE.md`](BALANCE.md) — all tuning numbers (draws, decay/recovery, thresholds, combat).
> - [`COSTS.md`](COSTS.md) — authoritative build prices (mirrors `src/structures.ts`).
>
> This file is now a **milestone history / roadmap log** plus the preserved
> original MVP definition. It does **not** restate tunable numbers — see the docs above.

---

## Milestone history (changelog by wave)

Each milestone is independently runnable; later waves layer on top of the MVP core.
Specifics below are verified against `STRATEGY.md` and the planning docs
([`REVIEWER_EPIC.md`](REVIEWER_EPIC.md), [`DEPTH_EPIC.md`](DEPTH_EPIC.md)).

### M0–M7 — the original MVP slice *(all shipped ✓ — see "Original MVP" below)*
Build/grid + room detection, station-wide power with brownout shedding, per-room O₂
atmosphere, crew needs + A\* pathfinding, the mining→food loop, Drenn guests + lodging
credits, and time controls / save-load / UI polish.

### M8–M11 — multi-gas, politics & combat *(shipped ✓)*
- **M9 — Multi-gas atmospheres + Thol:** methane (CH₄) as a second breathable gas;
  rooms can be O₂, CH₄, mixed (lethal), or vacuum; the **Thol** species needs a sealed
  methane wing. Doors-as-airlocks + space suits for crossing hostile zones.
- **M10 — Political web:** every species holds an asymmetric opinion of every other;
  proximity to liked/disliked neighbors becomes a **mood** term.
- **M11 — Tension → skirmishes:** low mood near a resented species raises tension;
  at the cap a one-sided skirmish erupts, can wreck a module and vent a room.

### M20–M25 — roster, food lines & social depth *(shipped ✓)*
- **Food lines / recipes:** Bio Vat (Biomass *or* Spores) → Rations Synth (Rations *or*
  Fungal Mash); each species eats its own line.
- **Room harmony:** enclosed rooms gain a harmony value from who shares them, coupled to
  a **production multiplier** (harmonious rooms work faster, tense rooms slower).
- **Species traits:** per-species bonuses (Thol Engineer, Vry'l Botanist, Drenn Merchant,
  Korro Hauler) so a mixed station out-produces a uniform one.
- **Requests + reputation:** each species posts timed requests; fulfilling them grants
  credits + reputation, expiry costs reputation. Drenn rep drives guest arrival rate.
- **Crew immigration by shuttle:** residents are never hand-placed — they immigrate once
  air + food + a free bunk + a powered dock are ready; capacity = Crew Quarters.
- **Korro — same-air rival:** an O₂/Rations species that *can't* be separated by gas
  zoning, forcing architectural separation (own O₂ wing + Door) — the first real layout
  dilemma.

### M26–M36 — the "Reviewer's Epic" (harden the first hour) *(shipped ✓; audio still pending)*
From a one-hour playtest review (see [`REVIEWER_EPIC.md`](REVIEWER_EPIC.md)):
- **M26** — Arrival & capacity legibility: crew/guest capacity HUD chips, arrival toast +
  dock pulse, "why no crew" advisor reason.
- **M27** — Objectives + win/lose: a scenario objective ladder with progress, victory on
  completion, defeat (with grace period) on an unrecoverable wipe, clean restart.
- **M28** — Numbers behind mood & harmony: hover tooltips break down the mood terms and
  show a room's harmony → production multiplier.
- **M29** — Station incidents: periodic, escalating events (power surge, hull breach,
  market shock, raider) — never targeting life support.
- **M30** — Tech tree / credit sink: a powered Research Lab unlocks gated content
  (Methane Life-Support, Fungal Synthesis, Cargo Logistics, Station Security).
- **M31 — Audio pass:** *still pending* — the lone unshipped Reviewer's-Epic item.
- **M32** — Storage caps: per-resource caps; production idles at the cap; Storage Silo
  raises every cap.
- **M33** — Guided onboarding: a dismissible first-build checklist that ticks off from
  real world state.
- **M34** — Save slots & feedback: autosave slot + 3 named slots with timestamps + a
  "Saved ✓" confirmation.
- **M35** — Camera / QoL: find/cycle module instances, live build-cost total while
  dragging, clearer solar facing.
- **M36** — Actionable Alienpedia: click a species to pan to / ring its members and read
  live count + average mood.

### M37 + M39 — the "Depth Epic" first wave *(shipped ✓)*
From a hardcore-systems review (see [`DEPTH_EPIC.md`](DEPTH_EPIC.md)):
- **M37 — Recurring credit sink:** operating **upkeep** (per powered module + per-resident
  wage) plus a live **net ¢/s** readout, so an idle station bleeds and only an active
  economy stays in the black.
- **M39 — Live skirmishes:** tension can now also accrue from a **sustained tense room**
  (low harmony) regardless of mood — so well-fed rivals left together long enough still
  erupt, and the cure stays *architecture* (separate wings + Door). Previously the combat
  system effectively never fired.

### Content & polish wave *(shipped ✓)*
- **Lighting & shadows:** a world-space lightmap dims the interior; powered emitters
  (a new **Light Fixture** + generators/lounge/etc.) cast warm light pools, and modules
  drop soft shadows away from the nearest light.
- **Big-ticket modules** (thousands-credit sinks): **Fusion Reactor** (+150 PU, burns
  minerals — needs a Bot Bay), **Cargo Exchange** (far better trade), **AI Core** (×1.25
  to all production/mining/repair).
- **Multi-Lab tech tree:** Battery/Lounge/Bot Bay/Trade Hub are now research-gated, and
  higher tiers require **more powered Labs** (1 → 2 → 3); locked tools show "???".
- **The Sector Beacon (win finale):** one researched **signature module per species**
  (Command Hub/Trade Nexus/Auto-Forge/Bloom Garden/Ore Refinery), each active only while
  its species is aboard, granting a unique perk and charging the Beacon — charge all five
  to win. See [`src/beacon.ts`].
- **UI:** compact 2-column build palette; Advisor moved to a prominent bottom-centre bar;
  collapsible right-column panels; stabilized Alienpedia.

---

## Out of scope / planned (not yet shipped)

The current roster is **Human, Drenn, Thol, Vry'l, Korro** with **O₂** and **CH₄** gases.
Still deferred or planned:

- **Tier-3 species** — Sszra, Chlorithe, Naaz, Voltaar — and the **exotic gases** they'd
  need (Cl₂, NH₃, H₂), plus **cryo / temperature** as a system.
- **Sensing & logistics** — radar / fog-of-war / survey, **drone-fleet management**, and
  **charging relays** for the power grid.
- **EVA / spacewalk** — crew working in vacuum, **decompression spread** between rooms,
  and **severed connectivity** when a wing is cut off.
- **Standing-order automation** — auto-dispatch / production orders beyond the current
  autonomous behavior.
- **Food quality tiers / palate** — meals as more than a single satisfaction value.
- **Refinery / fuel** — processing minerals into fuel and selling it.
- **Faction takeover** — hostile factions seizing the station.
- **Branching research** (M40) — prerequisites, tiers, and a mutually-exclusive
  specialization fork (the current tech tree is flat).
- **Audio** (M31) — the remaining Reviewer's-Epic item.

> Later Depth-Epic milestones (M38 incidents-with-teeth, M40 branching tech, M41 overflow
> consequences, M42 deeper relations, M43 replayability/seeds/scenarios) are specced in
> [`DEPTH_EPIC.md`](DEPTH_EPIC.md) but not all shipped — treat that doc as the live roadmap.

---

# Original MVP (historical record — the original slice, all shipped ✓)

> Preserved verbatim as the original M0–M7 build target. Stack: **TypeScript + Vite +
> PixiJS**. See [`TECH_DESIGN.md`](TECH_DESIGN.md) for how it's built. The "Out of scope"
> notes below were accurate *at the time*; most have since shipped — see the milestone
> history above for the current state.

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

## Out of scope (deferred to post-MVP — *most have since shipped; see milestone history*)
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
