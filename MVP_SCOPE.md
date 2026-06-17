# EXOSTATION — MVP Scope & Milestone History

> **STATUS — the MVP is complete; the game is now well beyond it (~M42).**
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

### M26–M36 — the "Reviewer's Epic" (harden the first hour) *(shipped ✓)*
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
- **M31 — Audio pass:** *shipped* — 56 procedurally-generated SFX (`npm run gen:sfx`)
  + a Web-Audio layer (`src/audio.ts`, master/ui/world/music buses, mute) wired to UI,
  build, research, encounters, arrivals, incidents, objectives and end states. See
  [`AUDIO_PLAN.md`](AUDIO_PLAN.md).
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

### M38 + M40 + M41 + M42 — the "Depth Epic" second wave *(shipped ✓)*
The rest of the Depth Epic except replayability (M43):
- **M38 — Incidents with teeth:** incidents now punish a lack of redundancy instead of
  being walled off. A power surge can knock out a **lone, battery-less life-support
  generator**; **raider damage scales with station size** and can reach **life support on
  an undefended** (no-Turret, 2+-room) station. The counters are cheap — a Battery, a
  backup generator, a Turret, or the Garrison doctrine — and a beginner's single room
  stays safe.
- **M40 — Branching tech tree:** unlocks gained **prerequisites** (Fusion←Robotics,
  Bulk Trade←Commerce, Cybernetics←Cargo Logistics) and a **mutually-exclusive doctrine
  fork** — pick **one** of Industrialist / Hospitality / Garrison and the other two lock
  for the run. The tech panel shows prereq/exclusivity state.
- **M41 — Overflow consequences:** a resource sitting near its cap **spoils** (~2%/s) and
  the visible waste is a **station-wide morale drag** — overproduction now costs you, so
  right-sizing production and trade capacity is a live decision rather than free idling.
- **M42 — Deeper relations:** the political web uses the full **LOVE/HATE (±15)** tiers
  with pointed rivalries (Human⇄Korro, Vry'l⇄Korro) and alliances (Thol⇄Vry'l,
  Human⇄Drenn), and neighbor weight was raised to **rival needs** — layout politics now
  drive real decisions (the same-air Korro needs its own wing).

### Society wave *(shipped ✓)*
- **Reproduction (`spawn.ts`):** a thriving species (≥2 residents, avg mood ≥70) offers —
  via a paused dialog — to lay a **clutch of eggs** for **¢1000**. Eggs incubate, then hatch
  into a mix of **new resident younglings** and **"spiders"**: hostile vermin that bite crew
  and gnaw modules until the **crew hunt them down** (the parent species hunting its own
  spawn hardest). New world state `eggs`/`pests`/`breedOffer`; new `#breed` dialog + egg &
  spider sprites; renderer `drawCritters`.
- **Love & romance (`romance.ts` + `names.ts`):** every crew member has an individual
  **name**; a bond encounter can **rarely** make two different-species crew **fall in love**.
  A couple **thaws the hatred** between their species (and lifts the whole station's
  cooperation via a per-world relation modifier), and once **truly in love** they **work
  +50%** and **spend time together**. Love runs on a **calendar** — it grows daily but hits
  **turbulence on days 5/15/25/35** (a dice-roll over ~100 reasons decides stay/split).
  **Breathing Implants** (new Tier-2 tech) let a cross-gas couple cohabit. New world state
  `couples`/`relThaw`/`romance`; `#romance` dialog; dynamic `effRelation` feeding combat,
  harmony, mood and encounters.
- **Eyesight & vision cones (`agents.ts`):** every crew member has a personal **sight
  range** (2–5 tiles) and a **facing vision cone**; they only spot and service module
  faults that are **within sight and in front of them**. With an unseen fault somewhere
  they **patrol** their wing until it comes into view; with nothing wrong they stand idle.
  Renderer draws each agent's cone.

### Content & polish wave *(shipped ✓)*
- **Lighting & shadows:** the interior is dim by default; powered emitters (a
  **Light Fixture** + generators/lounge/etc.) light their rooms via **grid
  shadowcasting** so walls and large modules **cast real shadows** (baked, free per
  frame), and **every character carries a moving ~3-cell lamp** whose shadow sweeps
  as they traverse (RimWorld-style). CPU per-cell light buffer → 1px/cell canvas,
  bilinear-upscaled + multiply. See [`LIGHTING_PLAN.md`](LIGHTING_PLAN.md).
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
- **Fuel economy & docking tiers:** a **Fuel Refinery** (root-tech `Fuel Refining`) cracks
  mined minerals into **fuel**; every ship **buys fuel on landing** for credits — a third
  income stream alongside lodging and trade. **Large Dock** and **Spaceport Dock** tiers
  (research-gated) land progressively bigger ships that disembark more guests (3 → 6 → 10),
  a wider species mix, and buy more fuel (6 → 18 → 40), with 5×5 / 7×7 landing pads.
- **A trader class per gas (Vorn):** guests are now **gas-matched** to hotels, and each
  breathing gas has its own visitor species — **Vorn** is the methane (CH₄) counterpart of
  the Drenn. A methane wing with a CH₄ Hotel Room earns its own lodging stream, and a Vorn
  aboard makes ships pay +50% for fuel (*Fuel Baron*). Roster is now six species.
- **Species backstories + first-contact dialog:** each species has a written backstory
  (`lore` in `src/species.ts`); the first time one ever appears the game **pauses and shows
  a pixel portrait + paragraph** (queued for simultaneous arrivals), then resumes.
- **Social encounters + injuries + Med Bay:** co-located rival/friendly species periodically
  trigger a **paused choice dialog** (a clash or a bond); a bad/unlucky clash response — and
  servicing **2+-Lab "high-tier" modules** — **wounds** crew, who **bleed out without a
  powered Med Bay** (new module, research **Medicine**) and heal with one. Dynamic lighting
  (grid shadowcast bake + moving character lamps) and the distinct **raider** pirate craft
  that now actually **destroys** modules also landed in this wave.
- **UI:** the current-goal bar moved from the top bar into the **Advisor** panel.
- **Tier-3 gases & species:** three new breathable gases — **Cl₂ / NH₃ / H₂** — each with a
  research-gated generator, plus their resident species **Chlorithe / Naaz / Voltaar** (sprites,
  lore, first-contact cards, a full 9×9 relations web). The atmosphere system is gas-generic, so
  they zone/breathe/suffocate like O₂/CH₄. Roster → 9 species, 5 gases.
- **Tier-3 depth layers + Sszra:** the deferred exotic layers now ship. A **temperature/climate**
  axis (room band hot/temperate/cold via **Heater** + **Cryo Unit**, behind **Climate Control**;
  −10 mood for the wrong band — Voltaar want hot, Naaz cold). **Atmosphere hazards** (`hazardSystem`):
  **Cl₂ corrodes** machinery in its room, and **H₂ + O₂ in one room detonates** (wrecks modules,
  destroys the gens, wounds everyone, blows a breach). **Exotic food lines** — a new **Microbes**
  Vat base feeds **Live-Protein** (Sszra) and **Exo-Culture** (Chlorithe/Naaz/Voltaar) via the Synth,
  behind **Exobiology**; the exotic crews no longer eat Rations. And the 10th species, the **Sszra**
  (O₂ obligate-carnivore sentinel; sprite, lore, first-contact, 10×10 relations). Roster → **10
  species, 5 gases**.
- **Bot Bay redesign — the Star Chart:** removed all on-grid asteroids. A Bot Bay now opens an
  **orbital map** (the star, your station's orbit, and the system's asteroids & planets as
  **unknown contacts**). You **select a body and dispatch** the bay's drone; it flies **off-map**
  and returns with minerals after a distance-scaled round trip (~25s near asteroid → ~70s far
  planet). The **first trip surveys + delivers** (discovery reveals yield/richness and pays out);
  bodies are **finite** and deplete; **planets** are far/slow/rich, **asteroids** near/fast/modest;
  every body gives the same resource (minerals), only the amount differs (`seedSolarSystem`,
  `mining.ts` `docked→outbound→transit→inbound`, star-chart canvas in `ui.ts`).
- **Race-gods:** each species has a Q-like, ship-sized **god** (`gods.ts`) that drifts
  through space and visits once its race is aboard (~every 150s). It judges that species'
  average mood — **pleased (≥60) gifts ¢250 + 60 minerals**, **wrathful (≤40) unmakes a
  non-life-support module**, else watches. Distinct per-race forms (Human=shrimp, Drenn=safe,
  …) drawn with auras + a verdict ring. Hosting a race becomes a standing obligation.
- **Audio:** generated SFX layer (M31) + a shuffled `assets/music/` soundtrack at ~30% volume.
- **Cinematic arrivals:** powered Docking Ports project a **3×3 landing pad** (blinking
  guide lights) into space; a 3×3 shuttle flies in from off-screen, decelerates onto the
  pad, stays docked the whole visit, then lifts off — and now carries **up to 3 guests**
  at once (capped by free Hotel Rooms). Mining drones get the same treatment on a **1×1
  bay pad** (ease-in lift-off → mine → ease-out landing). Traders reuse the dock pad.

---

## Out of scope / planned (not yet shipped)

The current roster is **10 species** — Human, Drenn, Thol, Vry'l, Korro, Vorn, **Chlorithe,
Naaz, Voltaar, Sszra** — across **5 gases** (O₂, CH₄, **Cl₂, NH₃, H₂**). Still deferred or planned:

- **Deeper exotic content** — **food-quality / palate** mood tiers, and per-gas *bespoke* exotic
  recipes beyond the unified Exo-Culture line. (The temperature, hazard, exotic-food and Sszra
  layers that were deferred here have now shipped — see the changelog above.)
- **Sensing & logistics** — the **Star Chart** shipped a first cut (orbital map, survey-on-visit,
  per-bay dispatch, finite asteroids/planets). Still planned: multi-resource site types, the tiered
  **drone fleet** (range/cargo/speed tiers, integrity + Repair Bays), **Sensor Array** scan tiers,
  per-resource **standing orders**, replenishing sites, and **charging relays**.
- **EVA / spacewalk** — crew working in vacuum, **decompression spread** between rooms,
  and **severed connectivity** when a wing is cut off.
- **Standing-order automation** — auto-dispatch / production orders beyond the current
  autonomous behavior.
- **Food quality tiers / palate** — meals as more than a single satisfaction value.
- ~~**Refinery / fuel**~~ — *shipped:* Fuel Refinery (minerals → fuel) + fuel sold to docking ships, with Large/Spaceport dock tiers. (Commodity buy-low/sell-high refining is still future.)
- **Faction takeover** — hostile factions seizing the station.
- ~~**Audio** (M31)~~ — *shipped:* generated SFX + a Web-Audio layer (see [`AUDIO_PLAN.md`](AUDIO_PLAN.md)). Richer/AI samples + music beds are an optional upgrade.
- **Replayability** (M43) — seeded starts, asymmetric scenarios, post-win escalation.

> The Depth-Epic roadmap (see [`DEPTH_EPIC.md`](DEPTH_EPIC.md)) is now **complete except
> M43** (replayability/seeds/scenarios): M37/M39 shipped in the first wave, M38/M40/M41/M42
> in the second. Treat that doc as the live roadmap for what remains.

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
