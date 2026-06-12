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
3. **Host different species aboard** — **4** distinct species alive at once (forces a methane wing for Thol or a fungal chain for Vry'l beyond the natural human/korro/Drenn three).
- **Defeat:** a death has occurred **and** no resident crew remain **and** the station can't attract crew (no powered dock / no bunk in breathable air / no matching meals), sustained **20 s** (grace against recoverable wipes). A fresh, never-populated station never auto-loses.

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
