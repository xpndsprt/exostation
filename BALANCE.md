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
| Cargo Logistics | 250 | 2 | Storage Silo |
| Fungal Synthesis | 300 | 2 | Vry'l food recipes |
| Methane Life-Support | 350 | 2 | Methane Gen (Thol) |
| Station Security | 500 | 2 | Turret |
| Fusion Power | 600 | 3 | Fusion Reactor |
| Bulk Trade | 600 | 3 | Cargo Exchange |
| Cybernetics | 800 | 3 | AI Core |
| Command Hub / Trade Nexus / Auto-Forge / Bloom Garden / Ore Refinery | 700 ea | 3 | the 5 Beacon modules |
Only the survival core (floor/wall/door, solar, O₂ gen, synth, vat, crew quarters, dock, hotel, lab, light) is unlocked from the start.

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
| Cargo Logistics | 250 | `silo` (storage) |
| Station Security | 500 | `turret` (raider defense) |
- Starter tools (floor/wall/door, solar, battery, o2gen, synth, pod, dock, vat, bay, rec, hotel, tradehub, lab) are never locked — onboarding is unchanged.
- Locked tools are disabled in the palette; `applyTool` and the recipe toggle also refuse them.

## Storage caps (M32)
Base caps: biomass **400**, spores **250**, rations **50**, fungal **50**, minerals **200**. Each **Storage Silo** (¢70, draw 0) adds **+250** to all. Production (vat/synth/mining unload) clamps at the cap and idles when full — no infinite stockpiles, so food/minerals stay a sizing-and-trading decision.

## Station incidents (M29)
First incident at **120 s**, then every **90 s** (shrinks 5 s per 10 min, floor **60 s**); type chosen by a deterministic tick hash.
| Incident | Effect |
|----------|--------|
| Power surge | a random non-life-support module offline for **20 s** |
| Hull breach | vents one hull wall of a sealed room (**only with ≥2 enclosed rooms**); a resident rushes to reseal it as an emergency (0.4/s ≈ 2.5s) at a cost of **¢120**. Player can also wall it manually (¢3) |
| Market shock | mineral price ×2 or ×0.5 for **40 s** |
| Raider | hostile ship parks at a dock, **8 condition/s** to a random non-life-support module for **18 s**; a powered **Turret** destroys it instantly |
- **Life support (O₂/CH₄ gens) is never targeted** — incidents threaten economy/production/defense, not a guaranteed suffocation. Suffocation only comes from the player's own power/zoning failures.

## Korro — same-air rival (M25)
The first implemented rival that breathes **O₂** (the rest of the roster splits by gas), so room-harmony/tension finally engages for co-habiting species.
- **Profile:** O₂ · Rations · Combat Power **25** · resident crew (immigrates like Humans/Thol/Vry'l).
- **Trait — Hauler:** mining drone cargo ×**1.5** (10 → 15) while any Korro is aboard.
- **Relations:** Korro→Human **−8**, Korro→Vry'l **−8**, Human→Korro **−8** (mutual), Korro↔Drenn/Thol 0, Korro→Korro +4. Drenn→Korro +8 (Drenn like everyone).
- **Net effect:** a mixed Human/Korro O₂ room sits at harmony ≈ **−0.53** → −40% productivity and a mood drag (observed ~45 vs ~70). Survivable indefinitely if needs are met; only crosses into a skirmish when mood < 30. Fix = give Korro their own O₂ wing (separate room + Door).

## Crew immigration (M24)
Residents are **not hand-placed** — they arrive by shuttle through a Docking Port.
- **Gates (all required):** a powered Docking Port · a free Crew Quarters (capacity = pods) · a bunk located in a room of the species' gas · `stock.meals[diet] > 0`.
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
