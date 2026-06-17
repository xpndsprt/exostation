# EXOSTATION — Balance & Tuning Sheet

> Starting numbers for prototyping. All values are first-pass and meant to be tuned. Credits = ¢. Time in real-time seconds at 1× speed.

## Species master table
TL = Tech Level (1 lowest → 6 highest). Higher TL → richer trade & higher fees, **and** higher Combat Power. Note Korro: low tech but brawlers (CP high relative to TL).

| Species | Tier | TL | Gas | Food line | Palate | Lodging ¢/day | Trade mult | Combat Power | Unlock: wealth + research |
|---------|:----:|:--:|-----|-----------|:------:|:-------------:|:----------:|:------------:|---------------------------|
| **Humans**    | 1 | 2 | O₂  | Standard Rations | Med  | 10 | ×1.0 | 20 | Start |
| **Drenn**     | 1 | 2 | O₂  | Standard Rations | High | 14 | ×1.5 | 18 | 2k + Trade Hub |
| **Korro**     | 1 | 1 | O₂  | Standard Rations | None | 8  | ×0.8 | 25 | 3k + Habitation II |
| **Vry'l**     | 2 | 3 | O₂  | Fungal Mash      | None | 18 | ×1.8 | 22 | 8k + Fungal Synthesis |
| **Thol**      | 2 | 3 | CH₄ | Standard Rations | Med  | 20 | ×2.0 | 35 | 12k + Methane Life-Support |
| **Sszra**     | 2 | 4 | O₂  | Live Protein     | High | 24 | ×2.2 | 50 | 18k + Protein Synthesis + Security II |
| **Chlorithe** | 3 | 5 | Cl₂ | Mineral Slurry   | None | 40 | ×3.5 | 70 | 35k + Chlorine Containment + Corrosion Plating |
| **Naaz**      | 3 | 5 | NH₃ (cryo) | Cryo-Gel Feed | High | 38 | ×3.2 | 55 | 40k + Ammonia/Cryo Life-Support |
| **Voltaar**   | 3 | 6 | H₂  | Plasma Feed      | N/A  | 60 | ×5.0 | 95 | 60k + Hydrogen Containment + Plasma Feed + Blast Shielding |

## Mining bot yields
Base trip = 60s round-trip at TL1 bot. Mining Bot II: +50% cargo, −25% trip time. Bot III: +100% cargo, −40% trip time.

| Resource | Yield / trip | Source bodies |
|----------|:------------:|---------------|
| Biomass | 10 | Organic comets, derelicts |
| Water/Ice | 12 | Ice asteroids |
| Spores | 8 | Fungal drifts |
| Silicates | 15 | Rocky asteroids |
| Exotic Ice | 5 | Outer-belt bodies |
| Gas (per type) | 6 | Gas clouds / nebulae |

## Radar & drone fleet
| Element | Value | Notes |
|---------|-------|-------|
| Sensor Array I | detect 1 ring (~2 sectors) | reveals unidentified blips |
| Sensor Array II | detect 2 rings | auto-identifies common resources |
| Sensor Array III | detect 3 rings + deep scan | reveals richness/hazard, finds rare/exotic sites |
| Survey Drone | 20s / blip | identifies type, richness, hazard |
| Mining Bot I | range 1 ring, cargo 10, speed 1× | base |
| Mining Bot II | range 2 rings, cargo +50%, speed +25% | |
| Mining Bot III | range 3 rings, cargo +100%, speed +40% | |
| Charging Relay (beacon) | +1 ring effective range | forward refuel/charge node placed in space |
| Bot Bay throughput | 1 launch/dock per 6s | more bays = more concurrent drones out |
| Repair Bay | restores drone integrity | required to work hazard sites sustainably |
| Standing-order automation | unlock: Robotics II | enables per-resource auto-dispatch |

> The Radar/fleet table above is the design vision. **What ships today** is the
> simpler Star-Chart dispatch below.

## Star Chart & drone dispatch (implemented)
No on-grid asteroids: bodies live **off-map** in the star system, dispatched from a
Bot Bay's **Star Chart** dialog (`src/mining.ts`, `ui.ts` star-chart canvas).
- **Bodies** (`seedSolarSystem`): **14 asteroids** (dist 0.08–0.6, yield **8–20**, richness **120–320**) + **4 planets** (dist 0.62–0.98, yield **40–80**, richness **600–1400**). All start **undiscovered**.
- **Trip time** = `TRIP_BASE 18 + dist × TRIP_SPAN 55` seconds of off-map transit, bracketed by **1.5s** lift-off + **1.5s** descent. So ~**23s** (near asteroid) → ~**67s** (far planet) per round trip.
- **Loop:** `docked → outbound → transit (off-map) → inbound → unload`. A drone only flies when its bay is **powered** and it has a target with richness left; it auto-repeats trips until the body **depletes (finite)**, then un-targets and idles.
- **First arrival reveals** the body (yield + richness) **and** delivers that haul — discovery and mining are the same trip.
- **Haul/trip** = body `yield` × **Korro Hauler 1.5** (if aboard) × **AI Core 1.25** × **Industrialist 1.15** × **Ore Refinery beacon 1.5**, capped by remaining richness, capped into the minerals storage cap on unload.
- One drone per Bot Bay; more bays = more concurrent drones. Targets are global/shared knowledge; each bay dispatches its own drone from the chart.

## Site types (radar blips)
| Site | Resource(s) | Richness | Replenish | Hazard |
|------|-------------|:--------:|:---------:|--------|
| Ice Asteroid | Water/Ice | Med | none (finite) | low |
| Rocky Asteroid | Silicates | High | none | low |
| Organic Comet | Biomass (+Water) | Med, moving | passes (time-limited) | micrometeorite |
| Fungal Drift | Spores | Low | slow regrow | bio |
| Gas Cloud / Nebula | CH₄ / Cl₂ / NH₃ / H₂ | High | slow regen | corrosive / volatile |
| Outer-Belt Body | Exotic Ice | Low, far | none | radiation, cold |
| Derelict / Wreck | mixed salvage | one-time | event spawn | pirates, unstable |

## Food synthesis
Quality: Basic (×1 cost), Refined (×1.15 cost), Gourmet (×1.4 cost). Quality only affects mood for **palate** species.

| Food line | Inputs | Output | Synth time |
|-----------|--------|:------:|:----------:|
| Standard Rations | 2 Biomass + 1 Water | 4 meals | 10s |
| Live Protein | 4 Biomass + 1 Water | 3 meals | 15s |
| Fungal Mash | 2 Spores + 1 Water | 4 meals | 10s |
| Mineral Slurry | 3 Silicates + 1 Water | 4 meals | 12s |
| Cryo-Gel Feed | 2 Exotic Ice + 1 Ammonia | 3 meals | 18s |
| Plasma Feed | 1 Refined H₂ + 5 Power | 3 charges | 12s |

## Mood modifiers
| Source | Effect |
|--------|:------:|
| Loved neighbor (in zone/corridor) | +15 |
| Liked neighbor | +8 |
| Disliked neighbor | −8 |
| Hated neighbor | −15 |
| Fed (basic) | +0 |
| Fed gourmet, has palate | +10 |
| Hungry | −10 |
| Correct atmosphere | 0 (baseline) |
| Contaminated / wrong atmosphere | −30 + damage/death risk |
| Crowding (over capacity) | −5 per overflow |
| No recreation access | −6 |
| Resource overflow / waste at cap (M41) | −5 (station-wide while any store is full) |

**Implemented social weight (M42):** the summed neighbor opinion is clamped at **±45** (was ±30), so neighbors now rival needs (food/rest/fun ≈ ±22 total). Room harmony scales relation sums by /15, so a **LOVE/HATE** pair drives a room to ±1.0 harmony (vs ±0.53 for like/dislike).

## Tension & skirmishes
- Each **species-pair present on the station** accrues a Tension value (0–100).
- Tension rises from: shared zones/corridors between Disliked (+2/min) or Hated (+5/min) pairs; deaths/grievances (+25 instant); resource shortages station-wide (+1/min to all hostile pairs).
- Tension falls when rivals are kept apart (−3/min) and when overall mood is high.
- **Live skirmishes (M39):** in the implemented model tension rises **fast (12/s)** when an agent's mood < 30 near a disliked species, **or slow (4/s)** whenever it shares a chronically tense room (harmony < −0.3) **regardless of mood** — so cohabiting rivals erupt even when fed. Tension falls 15/s otherwise. Separation (own wings + Door) fully prevents it.
- **Skirmish triggers at Tension 100.** Outcome scales with each side's Combat Power × headcount, minus Security.

### Skirmish resolution (first-pass)
`SideStrength = Σ(Combat Power of participants) × (1 + 0.1 × numbers advantage)`
- Loser takes casualties proportional to strength gap; winner takes lighter losses.
- **Collateral = winner TL × intensity:** high-TL combatants damage modules, and have a chance to **breach atmosphere** → cascading cross-contamination disaster (the real catastrophe — a Tier 3 feud can vent a whole wing).
- **Security** (guards/turrets/riot response) adds defensive Combat Power and a chance to suppress before casualties.

## Objectives & game-over (M27)
Scenario goals completed in order; clearing the list = victory, after which play continues freely.
1. **Grow your crew** — reach **3** resident crew.
2. **Bank credits** — hold **¢3,000**.
3. **Host different resident species** — **4** distinct *resident* species alive at once (**guests don't count**). Requires both a methane wing (Thol) and a fungal chain (Vry'l).
4. **Bring the Sector Beacon online** — charge all **5** species signature modules to 100% (see *The Sector Beacon* above). Victory.
- **Defeat:** a death has occurred **and** no resident crew remain **and** the station can't attract crew (no powered dock / no bunk in breathable air / no matching meals), sustained **20 s** (grace against recoverable wipes). A fresh, never-populated station never auto-loses.

## Tech tree (current unlocks)
Research Labs (¢150, draw 6) gate most of the catalog; unlocks cost credits, and **higher tiers require more powered Labs**.
| Unlock | ¢ | Labs | Enables |
|--------|:--:|:--:|---------|
| Energy Storage | 100 | 1 | Battery Bank |
| Recreation | 120 | 1 | Lounge |
| Robotics | 150 | 1 | Bot Bay |
| Commerce | 150 | 1 | Trade Hub |
| Fuel Refining | 150 | 1 | Fuel Refinery (root node) |
| Medicine | 200 | 1 | Med Bay |
| Cargo Logistics | 250 | 2 | Storage Silo |
| Fungal Synthesis | 300 | 2 | Vry'l food recipes |
| Methane Life-Support | 350 | 2 | Methane Gen (Thol) |
| Chlorine Life-Support | 400 | 2 | Chlorine Gen (Chlorithe) |
| Ammonia Life-Support | 450 | 2 | Ammonia Gen (Naaz) |
| Hydrogen Life-Support | 500 | 2 | Hydrogen Gen (Voltaar) |
| Station Security | 500 | 2 | Turret |
| Expanded Docking | 350 | 2 | Large Dock *(needs Fuel Refining)* |
| Spaceport | 700 | 3 | Spaceport Dock *(needs Expanded Docking)* |
| Fusion Power | 600 | 3 | Fusion Reactor *(needs Robotics)* |
| Bulk Trade | 600 | 3 | Cargo Exchange *(needs Commerce)* |
| Cybernetics | 800 | 3 | AI Core *(needs Cargo Logistics)* |
| Command Hub / Trade Nexus / Auto-Forge / Bloom Garden / Ore Refinery | 700 ea | 3 | the 5 Beacon modules |
Only the survival core (floor/wall/door, solar, O₂ gen, synth, vat, crew quarters, dock, hotel, lab, light) is unlocked from the start.

### Branching & doctrine fork (M40)
The tree is no longer flat: nodes can require a **prerequisite** and a fork can **mutually exclude** its siblings (`requires[]` / `excludes[]` in `src/research.ts`; gated by `canResearch`).
- **Prereqs:** Fusion Power ← Robotics · Bulk Trade ← Commerce · Cybernetics ← Cargo Logistics.
- **Doctrine fork — 2 Labs, ¢400 each, pick exactly one** (each owns `excludes` over the other two, so choosing one permanently locks the rest):

| Doctrine | Prereq | Effect |
|----------|--------|--------|
| **Industrialist** | Robotics | ×**1.15** mining, food & repair (`industryBoost`) |
| **Hospitality** | Commerce | lodging ×**1.5**, guest arrival interval ×**0.7** |
| **Garrison** | Station Security | raider DPS ×**0.5**, life support never raider-targetable |

## The Sector Beacon — win finale (one signature module per species)
Each species has a researched signature module (¢800 build, Tier-4 tech). A module is **active** only while **powered AND its species is in the module's room**; while active it grants a unique perk and charges its `timer` 0→100 at **2%/s** (charge persists). Charging all five = the final objective "Bring the Sector Beacon online" → victory.
| Module | Species | Perk while active |
|--------|---------|-------------------|
| Command Hub | Human | +8 station-wide mood (a `command` term in the mood breakdown) |
| Trade Nexus | Drenn | ×1.5 mineral-trade income |
| Auto-Forge | Thol | +6 condition/s to every powered module station-wide |
| Bloom Garden | Vry'l | ×1.5 food production |
| Ore Refinery | Korro | ×1.5 mining yield |
This forces hosting the whole roster (methane Thol wing, fungal Vry'l chain, same-air Korro, Drenn guests) and the full tech tree.

## Big-ticket modules (high-end credit sinks)
For stations earning in the thousands. All 2×2.
| Module | ¢ | Power | Effect |
|--------|:--:|:-----:|--------|
| **Fusion Reactor** | 2000 | **+150** | One reactor powers a whole station (vs +10/solar). **Burns 0.6 minerals/s** while running — out of fuel it produces nothing, so it needs a Bot Bay feeding it |
| **Cargo Exchange** | 1500 | −6 | Trades **60** ore every **20 s** at **×1.5** price (vs 25/30s/×1 for a Trade Hub) and **+500 mineral cap**. Works standalone |
| **AI Core** | 2500 | −10 | **×1.25** to all food production, mining and repair while powered |

## Fuel economy & docking tiers
A third income stream: refine minerals into **fuel** and sell it to docking ships.
- **Fuel Refinery** (¢220, 2×2, draw 6): converts **2 minerals → 3 fuel every 6 s** while powered (scaled by room productivity, AI Core, Industrialist doctrine). Idles with no minerals (needs a **Bot Bay** mining) or at the fuel cap. Research: **Fuel Refining** (Tier-1 root).
- **Fuel storage cap:** base **120**, +250 per Storage Silo. Spoils like other resources past 95% (M41).
- **Refueling income:** every ship (guest/trader/crew) **buys fuel on landing** at **4¢/unit**, up to its dock tier's need; the sale is capped by fuel in stock. No fuel → no refuel income (guests still arrive).

| Dock | ¢ | Draw | Pad | Guests/shuttle | Fuel bought | Research |
|------|:--:|:----:|:---:|:--------------:|:-----------:|----------|
| Docking Port | 150 | 5 | 3×3 | 3 (Drenn) | 6 (~¢24) | — (start) |
| Large Dock | 400 | 8 | 5×5 | 6 (mix) | 18 (~¢72) | Expanded Docking |
| Spaceport Dock | 900 | 12 | 7×7 | 10 (mix) | 40 (~¢160) | Spaceport |

Larger berths land a visually bigger ship (size 2/3) and disembark a wider **O₂ guest mix** (Drenn/Human/Vry'l). Guests are still capped by free Hotel Rooms; one ship per pad at a time.

## Social encounters, injuries & medical
Random **encounters** (`encounters.ts`): first possible at **55 s**, then a roll every **55 s** (retry in **8 s** if nobody's co-located). A roll finds two **alive, different-species** agents in the **same cell** with avg relation **≤ −7** (conflict) or **≥ +7** (bond); it sets `world.encounter` and the game **pauses** for the player's choice (one at a time). The dialog text comes from a **~50-line `FLAVORS` library** — generic + per-species (Drenn/Vorn) + pair-specific (Human/Korro, Vry'l/Korro, Thol/Vry'l, Human/Drenn, …) lines; a `variant` index is chosen at creation so the text is stable and varied.
- **Conflict choices:** *Defuse* (80% both mood +6; 20% one is injured), *Discipline* (both mood −7, tension zeroed, no injury), *Let them settle it* (55% both injured; else both mood +9).
- **Bond choices:** *Encourage* (both mood +10, +4 rep each species), *Work together* (both +5, +¢40), *Party* (−¢60 → **all** crew +8; if unaffordable, the pair +5).

**Injuries** (`medical.ts`): an injured agent has `injured = true` and reduced `health`. With **no powered Med Bay** it bleeds **0.5 health/s** → death at 0 (~80 s from a fresh 40-hp wound). A **powered Med Bay** heals **6 health/s** station-wide (no pathing); at 100 the wound clears. Sources of injury: bad/unlucky encounter outcomes; **skirmishes**; and **servicing high-tier modules** — `agents.ts` rolls **3%/s** (×0.4 for Thol) while a crew member repairs any module whose unlock needs **2+ Labs**. **Med Bay:** ¢240, 2×2, draw 4, priority 6; research **Medicine** (¢200, 1 Lab).

## Operating economy / credit sink (M37)
Recurring costs give the economy an equilibrium instead of a one-way ratchet.
- **Module upkeep:** **0.15¢/s** per *powered, operating* module (draw > 0; passive solar/battery/silo are free).
- **Crew wages:** **0.2¢/s** per resident.
- Credits can't go below 0. A **net ¢/s** readout (≈20s-smoothed) sits on the credits chip, red when negative.
- Result: an idle station (no trade/lodging) **bleeds**; a typical active mid-game station nets roughly **+7–8¢/s**. The player now manages a margin and must keep income running, but competent play still profits.

## Tech tree (M30)
Credits are the sink; a **powered Research Lab** (¢150, draw 6) is the gate.
| Unlock | ¢ | Enables |
|--------|:--:|---------|
| Methane Life-Support | 350 | `ch4gen` (Thol) |
| Fungal Synthesis | 300 | vat *spores* / synth *fungal* recipes (Vry'l) |
| Climate Control | 300 | `heater` + `cooler` (warm/chill a wing) |
| Exobiology | 350 | vat *microbes* / synth *protein* + *exotic* recipes (Sszra + exotic crews) |
| Cargo Logistics | 250 | `silo` (storage) |
| Station Security | 500 | `turret` (raider defense) |
- Starter tools (floor/wall/door, solar, battery, o2gen, synth, pod, dock, vat, bay, rec, hotel, tradehub, lab) are never locked — onboarding is unchanged.
- Locked tools are disabled in the palette; `applyTool` and the recipe toggle also refuse them.

## Storage caps (M32) + overflow (M41)
Base caps: biomass **400**, spores **250**, microbes **250**, rations **50**, fungal **50**, protein **50**, exotic **50**, minerals **200**, fuel **120**. Each **Storage Silo** (¢70, draw 0) adds **+250** to all. Production (vat/synth/mining unload) clamps at the cap and idles when full — no infinite stockpiles, so food/minerals stay a sizing-and-trading decision.
- **Overflow consequences (M41):** a store **≥95% of its cap** spoils at **2%/s** of the held amount (floored at 95% — it churns just under the cap), and any store **≥99%** sets a station-wide `overflow` flag worth **−5 mood** (see modifiers) plus an amber HUD chip + toast. So overproduction wastes the inputs spent on it and annoys the crew — right-sizing production / keeping trade capacity ahead of mining is now a live cost, not free idling. Runs in `overflowSystem` between food and atmosphere.

## Station incidents (M29) + teeth (M38)
First incident at **120 s**, then every **90 s** (shrinks 5 s per 10 min, floor **60 s**); type chosen by a deterministic tick hash.
| Incident | Effect |
|----------|--------|
| Power surge | a module offline for **20 s**. Normally non-life-support — **but a life-support gen becomes eligible when unredundant**: station `batteryMax == 0` **and** only **one** generator of that gas. A Battery (soaks the spike) or a backup gen removes the vulnerability |
| Hull breach | vents one hull wall of a sealed room (**only with ≥2 enclosed rooms**); a resident rushes to reseal it as an emergency (0.4/s ≈ 2.5s) at a cost of **¢120**. Player can also wall it manually (¢3) |
| Market shock | mineral price ×2 or ×0.5 for **40 s** |
| Raider | a pirate ship parks at a dock for **18 s**; DPS = **min(26, 8 + 0.4·poweredModules)** (scales with station value), ×**0.5** under Garrison doctrine. Chews a random non-life-support module's condition; **at 0 condition the module is destroyed (erased)** with a toast + a red attack beam in the renderer. Targets **life support too** when **no Turret has ever been built**, the station has **2+ rooms**, and the doctrine isn't Garrison. With no targetable module left it **breaches a hull wall** instead. A powered **Turret** destroys the raider instantly (before any hit) |
- **Redundancy is the counter (M38), not blanket immunity:** life support can be hurt by a surge or raid *only* when the player skipped the cheap defenses (Battery / backup generator / Turret / Garrison). A beginner's single room is still spared (breach & raider-LS both gated on ≥2 rooms).

## Race-gods (`gods.ts`)
Each species has a Q-like god (`GODS` map). Once that race is aboard, its god
drifts across the map (`godsSystem`): first no sooner than **180 s**, then **every
150 s**, one at a time, entering from a side at **3 cells/s** and judging at
**t = 12 s** (drifted over the station). It reads the **average mood of that
species' living members**: **≥ 60 → gift ¢250 + 60 minerals**; **≤ 40 → erase one
random non-life-support powered module** (life support spared); otherwise nothing.
Verdict shows as a green/red ring; gods are drawn ship-sized with a distinct
per-race form + aura (renderer `drawGods`). Serializable (`world.gods`,
`world.godTimer`).

## Korro — same-air rival (M25)
The first implemented rival that breathes **O₂** (the rest of the roster splits by gas), so room-harmony/tension finally engages for co-habiting species.
- **Profile:** O₂ · Rations · Combat Power **25** · resident crew (immigrates like Humans/Thol/Vry'l).
- **Trait — Hauler:** mining drone cargo ×**1.5** (10 → 15) while any Korro is aboard.
- **Relations (M42 — now HATE):** Korro⇄Human **−15** (mutual HATE), Korro⇄Vry'l **−15** (mutual HATE), Korro→Thol **−8** / Thol→Korro **−8**, Korro↔Drenn **0**, Korro→Korro **+4**.
- **Net effect:** a mixed Human/Korro O₂ room now sits at harmony ≈ **−1.0** → the −40% productivity floor and a heavy mood drag. With M39 friction it reaches a skirmish even when fed (slow-burn 4/s). Fix = give Korro their **own O₂ wing** (separate room + Door).

## Full relations matrix (M42 — implemented)
Tiers each way: **LOVE +15 · LIKE +8 · KIN +4 · NEUTRAL 0 · DISLIKE −8 · HATE −15** (`src/relations.ts`). Row feels about column.
| A \ B | Hum | Drn | Thl | Vry | Kor | Vor | Chl | Naz | Vol | Ssz |
|-------|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Human** | +4 | +15 | −8 | 0 | −15 | 0 | −8 | 0 | 0 | −8 |
| **Drenn** | +15 | +4 | +8 | +8 | +8 | +8 | +8 | +8 | +8 | +8 |
| **Thol** | 0 | +8 | +4 | +15 | −8 | +8 | +8 | +8 | −8 | 0 |
| **Vry'l** | 0 | +8 | +15 | +4 | −15 | 0 | −8 | +15 | 0 | −8 |
| **Korro** | −15 | 0 | −8 | −15 | +4 | 0 | 0 | 0 | 0 | +8 |
| **Vorn** | +8 | +8 | +8 | +8 | 0 | +4 | +8 | +8 | +8 | +8 |
| **Chlorithe** | 0 | 0 | +8 | −8 | 0 | 0 | +4 | +15 | −8 | 0 |
| **Naaz** | 0 | +8 | +8 | +15 | 0 | +8 | +15 | +4 | 0 | +8 |
| **Voltaar** | 0 | 0 | −8 | 0 | 0 | 0 | −8 | 0 | +4 | 0 |
| **Sszra** | 0 | +8 | 0 | −8 | +8 | 0 | 0 | +8 | 0 | +4 |
Strong rivalries (HATE both ways): Human⇄Korro, Vry'l⇄Korro. Strong alliances (LOVE both ways): Human⇄Drenn, Thol⇄Vry'l, **Chlorithe⇄Naaz, Vry'l⇄Naaz**. **Drenn (O₂)** and **Vorn (CH₄)** are the universal-diplomat trader classes; the **Naaz (NH₃)** are the resident peacemaker (dislike no one). **Sszra⇄Korro** like each other (predators' respect); Humans & Vry'l dislike the Sszra.

## Vorn — the methane trader class
A **guest-only** visitor species (like the Drenn, but breathes **CH₄**) so methane wings earn lodging too.
- **Profile:** CH₄ · Rations diet · Combat Power **16** · visitor only (never a resident).
- **Lodging:** a CH₄ shuttle disembarks Vorn only when a **Hotel Room sits in a CH₄ room**; guests are gas-matched to hotels (`GUEST_POOL` in `economy.ts`: O₂ → drenn/human/vry'l, CH₄ → vorn/thol).
- **Trait — Fuel Baron:** docking ships pay **×1.5** for fuel while any Vorn is aboard (`TRAITS.vornFuel`).

## Tier-3 exotic gases & species
Three new breathable gases (`GasKind` cl2/nh3/h2) with a generator each (research Tier-2, 2 Labs): **Chlorine Gen** (¢170, draw 10), **Ammonia Gen** (¢180, draw 10), **Hydrogen Gen** (¢190, draw 11). The atmosphere system is gas-generic, so they zone/breathe/suffocate exactly like O₂/CH₄ (mixing any two gases in a room = lethal `mixed`).
- **Chlorithe** — Cl₂ · **Exo-Culture** · CP **28** · resident. Crystalline; close to Naaz, wary of Vry'l/Voltaar.
- **Naaz** — NH₃ (**cold**) · **Exo-Culture** · CP **12** · resident **peacemaker** (dislikes no one; loves Vry'l & Chlorithe).
- **Voltaar** — H₂ (**hot**) · **Exo-Culture** · CP **30** · resident; aloof, dislikes Thol & Chlorithe.
- All three **immigrate as residents** (in `RESIDENT_SPECIES`) once a sealed wing of their gas has a bunk + **Exo-Culture** stocked. They are now a real two-front challenge: a sealed gas wing **plus** the Microbes→Exo-Culture food chain (and climate for Naaz/Voltaar).

## Temperature / climate (Heater · Cryo Unit)
Each enclosed room gets a **climate band** in `atmosphereSystem` from its powered climate modules: net **Heater>Cryo → hot**, **Cryo>Heater → cold**, else **temperate** (default). Modules: **Heater** (¢130, draw 5, 2×2) and **Cryo Unit** (¢170, draw 7, 2×2), both behind **Climate Control** (¢300, 2 Labs). A crew member in a room whose band ≠ its species' preference takes **−10 mood** (`TEMP_HIT`, comfort not survival; shown as the *climate* term in the mood breakdown). Only **Voltaar** (want hot) and **Naaz** (want cold) differ from temperate, so climate only matters once you host them.

## Atmosphere hazards (Cl₂ corrosive · H₂ explosive) — `hazardSystem`
Runs right after atmosphere.
- **Corrosion:** every powered, non-life-support module in a **Cl₂** room loses an extra **0.5 condition/s** (life-support gens spared so a wing can't go airless on its own). A Chlorithe wing needs crew/Auto-Forge upkeep.
- **Detonation:** if one room holds a powered **H₂** generator **and** a powered **O₂** generator, it **ignites this tick** — every non-gen module there loses **70 condition**, the offending generators are **destroyed**, agents in the room are **wounded (55)**, and one bordering wall is **blown to space as a breach**. Destroying the gens stops it re-firing. Door-separated H₂/O₂ wings are safe; only sharing a room is fatal.

## Sszra — the O₂ carnivore (4th O₂ resident)
- **Profile:** O₂ · **Live-Protein** diet · CP **32** · resident (in `RESIDENT_SPECIES`); generalist (no production trait).
- **The catch:** obligate carnivore — eats **only** Live-Protein (Vat *microbes* → Synth *protein*, behind **Exobiology**), never Rations. Shares humans' O₂, so like the Korro they can't be gas-zoned apart.
- **Relations:** mutual **LIKE** with Korro (predators' respect); **DISLIKE** both ways with Humans and Vry'l; LIKE'd by the universal Drenn/Vorn and the peacemaking Naaz.

## Exotic food lines (Exobiology)
A new base resource **Microbes** (Vat recipe) feeds two new food lines via the Synth: **Live-Protein** (Sszra) and **Exo-Culture** (Chlorithe/Naaz/Voltaar). Same throughput as other recipes (Vat +3/8s; Synth 2 base → 4 meals/10s). Both recipes (and Microbes) gate behind **Exobiology** (¢350, 2 Labs); the recipe cycler only offers researched lines.

## Species-prepped lodging
Crew Quarters and Hotel Rooms each store a **prepped species** in their `recipe`
field — **only that species sleeps/lodges there**, and only if the room sits in
that species' gas. Capacity is therefore **per species**, not a global pool.
- **Reassign** via Select → "Reassign species" (cycles the assignable species).
- **Gating** (`lodgingUnlocked`): **Human & Drenn are free**; every other species
  is gated by the research that lets you host it — Korro `robotics`, Vry'l `fungal`,
  Thol/Vorn `methane`, Chlorithe `chlorine`, Naaz `ammonia`, Voltaar `hydrogen`,
  Sszra `exobiology`.
- Assignable: Crew Quarters → the 8 resident species; Hotel Rooms → the 5 visitor
  classes (Drenn/Human/Vry'l/Vorn/Thol). Defaults: pod→Human, hotel→Drenn.

## Crew immigration (M24)
Residents are **not hand-placed** — they arrive by shuttle through a Docking Port.
- **Gates (all required):** a powered Docking Port · a **free Crew Quarters prepped for that species** (capacity counted per species) · the bunk in a room of the species' gas · `stock.meals[diet] > 0`.
- **Cadence:** one arrival per **12 s** while a slot is open; if no slot/eligible species, the timer holds at the threshold so a new resident appears within a tick of conditions becoming true.
- **Species choice:** among eligible species (gas + food satisfied), the one with the **fewest currently aboard** is brought, nudging toward a diverse crew.
- **Resident species:** Humans, Thol, Vry'l. **Drenn are visitors only** (hotel guests), never residents.
- No credit cost — crew are workforce, not a purchase. Capacity growth is paid for indirectly via Crew Quarters (¢40 each).

## Reputation & requests (M23)
- Each **seen species** holds a station **Reputation** 0–100, initialized at **50**.
- Species post **requests** (goals): *host N aboard*, *keep us content (avg mood ≥60)*, or *build a Lounge*.
- **≤2 active** at once; a new one every **~50 s**; each has **120 s** to fulfil.
- Fulfil → **+credits** (host 150×N, content 200, lounge 120) and **+rep** (12 / 15 / 10). Expire → **−rep** (8 / 10 / 6).
- **Drenn reputation scales guest arrival rate**: interval × clamp(1 + (50 − repDrenn)/100, 0.5, 1.5) — high rep ⇒ guests arrive up to 2× faster, low rep ⇒ up to 2× slower.

## Security
| Tier | Adds | Cost ¢ |
|------|------|:------:|
| Security I | Guard post, stun batons (CP +15 defensive) | 1.5k |
| Security II | Turrets, holding cells (CP +35, suppression chance) | 5k |
| Security III | Riot response, blast doors auto-seal on breach (CP +70, contains breaches) | 14k |

## Structural integrity & EVA
| Value | Number | Notes |
|-------|:------:|-------|
| Decompression spread | 1 room / 2s | Unsealed adjacent rooms vent in sequence until a door/airlock holds |
| Auto-seal (Security III) reaction | 2s | Blast doors seal the breach front automatically |
| EVA suit O₂ | 90s | Time a suited occupant can stay in vacuum before risk |
| EVA transit speed | 0.4× walk | Spacewalk is slow; airlock cycle adds ~6s each end |
| EVA throughput | 1–2 occupants at a time | Per airlock pair |
| EVA mishap chance | 3% / trip (×stress) | Failure = occupant lost to the void |
| Species EVA-capable | Tier 1–2 yes; Tier 3 varies | Voltaar & Naaz: no suit → **stranded** until reconnected |
| Reconnect: Tunnel | cheap, fast | Restores traversal only |
| Reconnect: Room (same footprint) | normal build cost | Restores traversal **and** function |

## Research tree (gates species via life-support + food + safety)
| Branch | Nodes |
|--------|-------|
| **Habitation** | I (start) → II → III (capacity, comfort) |
| **Commerce** | Trade Hub → Market II → Exotic Exchange |
| **Life-Support (gas)** | O₂ (start) → Methane → Ammonia/Cryo → Chlorine → Hydrogen |
| **Food** | Standard (start) → Fungal → Protein → Mineral Slurry → Cryo-Gel → Plasma |
| **Containment & Safety** | Airlock II → Leak Sensors → Corrosion Plating → Blast Shielding |
| **Security** | I → II → III |
| **Robotics** | Mining Bot II → III → Repair Bots → Standing Orders (per-resource auto-dispatch) |
| **Sensors & Survey** | Sensor Array I → II → III → Survey Drone → Charging Relay |

## Progression curve (typical)
1. **Open** with Humans (O₂ + Standard Rations already researched).
2. Earn via lodging + trade + fuel → unlock Drenn/Korro (cheap, same systems).
3. Reinvest into research + wealth to add Tier 2 — each needs a **new life-support or food chain** physically built and walled off.
4. Tier 3 species are huge earners (×3.5–×5 trade, 38–60¢/day) but demand sealed exotic wings, the priciest containment research, and strong Security — because a high-TL skirmish among them can breach the hull.
