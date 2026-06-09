# EXOSTATION — One Page Design

> A top-down space station management sim in the spirit of *Prison Architect* and *RimWorld*. Build a station module by module, keep the lights on, and run the busiest, most volatile crossroads in the sector.

## Core Thesis — Station Architecture *is* Politics
**How you build is how you govern.** Every species has needs (the right air, the right food, the right neighbors). If your station **serves those needs** — segregated atmospheres, parallel food chains, friends placed together, rivals kept apart — the species **collaborate**: moods rise, trade flows, the station thrives on its own. If it **fails to** — shared corridors between enemies, food shortages, leaking wings — tension festers, mood collapses, and grievances harden into **armed skirmishes**. Left unchecked, a powerful faction can **seize control of your station.** You never directly command anyone; you author the environment, and the politics emerge from your blueprint.

## The Pitch
You are the operator of a deep-space station that is three businesses in one: a **trading post**, a **hotel**, and a **fuel depot**. Ships dock, crews disembark, deals are struck, tanks are filled. Your job is to grow the station to meet demand while keeping a roster of wildly different alien species alive, fed, breathing, and — ideally — not at each other's throats.

## Core Loop
1. **Build** modules (habitation, life support, docking, storage, refinery, market, recreation) by snapping rooms onto the station grid.
2. **Power & supply** the station — deploy **solar panels** for energy and dispatch **mining bots** that fly out to asteroids/wrecks to gather ore, ice, and gas.
3. **Receive** arriving species; assign them quarters, atmosphere, and food they can actually survive on.
4. **Profit** from trade, lodging fees, and fuel sales — then reinvest in more modules, more bots, more capacity.
5. **Manage** the social and logistical fallout as incompatible guests pile up under one hull.

## Building & Infrastructure
- **Grid-based construction**: walls, doors, airlocks, corridors. Rooms gain function from the equipment placed inside them.
- **Equipment**: O₂/atmosphere generators, gas scrubbers, food synthesizers, hydroponics, beds/pods, refinery units, market stalls, fuel pumps, defense turrets.
- **Power network**: solar panels (output scales with sun exposure / distance from star), batteries for the dark side, and cable/conduit routing. Brownouts cascade — lose power, lose life support.
- **Logistics**: mining bots have flight range, cargo capacity, and need charging/repair bays. Resources flow from docks → storage → fabrication → sale.

## Species & Compatibility (the heart of the game)
Species arrive over time. The further the game progresses, the stranger and harder-to-host the visitors become. Three tiers:

| Tier | Compatibility | Example demands |
|------|---------------|-----------------|
| **Tier 1 — Kindred** | Share humanity's air & food (start: **Humans**). | One shared habitat works for all of them. Easy money. |
| **Tier 2 — Divergent** | Different breathing gas **or** different diet. | Need segregated atmosphere zones or dedicated food chains. |
| **Tier 3 — Alien** | Completely incompatible — exotic gases, hostile temperatures, inedible-to-others food. | Sealed, isolated wings. A leak is lethal to everyone nearby. |

### Atmosphere as a hazard
Because species breathe different gases, **atmosphere is a resource you zone and contain**. Airlocks separate incompatible wings; a breach or a wrong door means one species' air poisons another. Designing safe adjacency and traffic flow is the central spatial puzzle.

### Relations web
Every species holds **opinions** of every other species — some pairs **love** being neighbors (mood/trade bonuses), others **hate** it (mood penalties, refusal to dock, brawls). Room placement becomes diplomacy: who you put next to whom, who shares a corridor, who shares a bar. Mixing the wrong guests turns a profitable hotel into a riot.

## Economy
- **Trade**: buy low / sell high on commodities flowing through the post; refine raw ore into goods.
- **Hotel**: lodging fees scale with comfort, safety, and species-appropriate amenities.
- **Fuel**: refine mined ice/gas into fuel; sell to docked ships. Demand spikes create rush hours.
- **Costs**: power, bot maintenance, food production, and the overhead of keeping mutually hostile atmospheres apart.

## Failure & Tension
- Life-support failure, atmospheric cross-contamination, power collapse, food shortage, bot loss, and inter-species violence.
- Difficulty ramps naturally: each new species tier adds an incompatible system you must physically wall off while still routing trade through a shared core.

## Why It's Fun
The satisfying tension of *Prison Architect*'s spatial logistics meets *RimWorld*'s emergent social drama — but the "inmates" are alien guests who literally cannot breathe the same air, and your station's blueprint is the difference between a thriving hub and a vented, smoking wreck.

## Tech / Presentation
- **Top-down 2D**, rendered in the **browser** (HTML5 canvas / WebGL).
- Tile/grid station, sprite-based crew and bots, colored atmosphere overlays for gas zones.
- Mouse-driven build menus, drag-to-place rooms, simulation runs in real time with pause/speed controls.

## Design Decisions (locked)
- **Control model: Autonomy (RimWorld-style).** You do not directly puppet guests or bots. They act on their own needs (breathe, eat, rest, trade, socialize) and pathfind through the station you designed. You shape behavior **indirectly** by building the right rooms, zoning atmospheres, setting bot priorities, and controlling adjacency. Emergent drama is the point.
- **Structure: Endless sandbox.** No win condition. The challenge is self-escalating — each new species tier introduces an incompatible system (gas, food line, temperature, feud) you must physically integrate without breaking the profitable shared core. Optional self-set goals (reputation milestones, hosting all 9 species at once) act as soft objectives.

---

# FOOD SYSTEM

Food is a parallel strategic layer to atmosphere. **Synthesizers convert base resources (gathered by mining bots) into a food line.** Different species eat different food lines, which means different base resources, different synthesizer modules, and different supply chains running in parallel.

### Rules
- **Shared food lines = shared supply chains.** Several species eat *Standard Rations*; one synthesizer farm feeds them all. Cheap and efficient — a key reason early-game (Tier 1) is forgiving.
- **Divergent diets = parallel chains.** A species on *Fungal Mash* needs Spores mined and a fungal synthesizer — a whole separate logistics branch just for them.
- **Food quality upgrades are species-specific.** Synthesizers upgrade Basic → Refined → Gourmet. Upgrades raise mood **only for species with a palate**; "calorie-only" species ignore quality entirely, so investing in their food is wasted money. Knowing *who* to spoil is part of the optimization.
- **Exotic feed is dangerous & costly.** Tier 3 food lines consume the same exotic/volatile resources as their atmospheres (ammonia, exotic ice, refined hydrogen), tying food production to the most hazardous parts of the station.

### Base resources (mined by bots)
| Resource | Source | Feeds |
|----------|--------|-------|
| **Biomass** | Organic comets, derelict hydroponics | Standard Rations, Live Protein |
| **Water/Ice** | Ice asteroids | Standard Rations, Fungal Mash |
| **Spores** | Fungal drifts, infected wrecks | Fungal Mash |
| **Silicates/Ore** | Rocky asteroids | Mineral Slurry |
| **Exotic Ice** | Cold outer-belt bodies | Cryo-Gel Feed |
| **Gas (CH₄/Cl₂/NH₃/H₂)** | Gas clouds & nebulae | Atmospheres + Plasma Feed |

### Food lines
| Food line | Base resources | Palate (cares about quality?) |
|-----------|----------------|-------------------------------|
| **Standard Rations** | Biomass + Water | Mixed (see species) |
| **Live Protein** | Biomass (high) + Water | Yes — gourmet carnivores |
| **Fungal Mash** | Spores + Water | No — calorie-only |
| **Mineral Slurry** | Silicates + Water | No — calorie-only |
| **Cryo-Gel Feed** | Exotic Ice + Ammonia | Yes — refined tastes |
| **Plasma Feed** | Refined Hydrogen + Power | N/A — energy-fed |

---

# SPECIES ROSTER

Nine species across three compatibility tiers. You start with **Humans** and unlock the rest as the station grows and reputation spreads.

### Tier 1 — Kindred  (Gas: Oxygen · Food: Standard Rations · easy to co-house)
| Species | Breathes | Eats | Palate | Flavor |
|---------|----------|------|--------|--------|
| **Humans** | Oxygen (O₂) | Standard Rations | Medium | Baseline jack-of-all-trades. Your starting species. |
| **Drenn** | Oxygen (O₂) | Standard Rations | High (gourmets) | Gregarious merchant culture; spend big when comfortable. |
| **Korro** | Oxygen (O₂) | Standard Rations | None (calorie-only) | Stoic heavy-labor species; happy with bunks and bulk food. |

### Tier 2 — Divergent  (one axis differs — gas **or** food — needs segregation)
| Species | Breathes | Eats | Palate | What makes them hard |
|---------|----------|------|--------|----------------------|
| **Vry'l** | Oxygen (O₂) | **Fungal Mash** | None | Same air as humans, but need a whole separate Spore→Fungal food chain. |
| **Thol** | **Methane (CH₄)** | Standard Rations | Medium | Eat the shared food line, but need a sealed methane wing — and CH₄ is flammable. |
| **Sszra** | Oxygen (O₂) | **Live Protein** | High | Carnivores; share air but demand a high-biomass gourmet protein chain. |

### Tier 3 — Alien  (gas + food + temperature all exotic — fully sealed wings)
| Species | Breathes | Eats | Palate | Hazard |
|---------|----------|------|--------|--------|
| **Chlorithe** | **Chlorine (Cl₂)** | Mineral Slurry (silicon-based) | None | Cl₂ atmosphere lethal to every other species; corrosive leaks. |
| **Naaz** | **Ammonia (NH₃)**, cryogenic | Cryo-Gel Feed | High | Need cold + ammonia; their food chain shares those hazardous inputs. |
| **Voltaar** | **Hydrogen (H₂)** | Plasma Feed (energy) | N/A | Energy-based; H₂ + any O₂ leak = explosion. Power-hungry. |

---

# THE POLITICAL WEB

Every species holds an opinion of every other. Co-housing or routing rivals through shared corridors/bars applies mood and trade effects; pairing friends gives bonuses. **Adjacency is diplomacy.**

**Relations are asymmetric** — A's feeling about B is not always B's feeling about A. **Read the table by row:** each row is *how that species feels about the species in each column.*

**Legend:** ♥ Love · `+` Like · `·` Neutral · `–` Dislike · ✖ Hate

| feels about → | Hum | Drn | Kor | Vry | Thl | Ssz | Chl | Naz | Vol |
|---------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Humans**    | —  | +  | +  | ·  | –  | ·  | –  | ·  | ·  |
| **Drenn**     | +  | —  | +  | ♥  | +  | –  | +  | +  | +  |
| **Korro**     | +  | +  | —  | ·  | ✖  | +  | ·  | –  | ·  |
| **Vry'l**     | ·  | ♥  | ·  | —  | ·  | ✖  | –  | ♥  | ·  |
| **Thol**      | ·  | +  | ✖  | ·  | —  | ·  | +  | +  | –  |
| **Sszra**     | ·  | –  | +  | ✖  | ·  | —  | ·  | –  | ✖  |
| **Chlorithe** | ·  | ·  | ·  | –  | +  | ·  | —  | ♥  | –  |
| **Naaz**      | ·  | +  | ·  | ♥  | +  | ·  | ♥  | —  | ·  |
| **Voltaar**   | ·  | ·  | ·  | ·  | –  | ✖  | –  | ·  | —  |

### Notable relationships (lore hooks)
- **Drenn ♥ Vry'l** (mutual) — Drenn merchants prize Vry'l fungal-art; quarter them together for a strong mood + trade bonus.
- **Korro ✖ Thol** (mutual) — an ancient war. Never share a corridor; brawls are near-guaranteed.
- **Vry'l ✖ Sszra** (mutual, different reasons) — Sszra view Vry'l as prey with contempt; the timid Vry'l view Sszra with terror. Both negative, both volatile.
- **Sszra ✖ Voltaar** (mutual) — predators enraged by beings they can't comprehend or hunt.
- **Chlorithe ♥ Naaz** and **Vry'l ♥ Naaz** (mutual) — the exotic outcasts and the gentle find kinship; the **Naaz are the station's social glue** (they hold no dislikes at all).
- **One-sided grudges (asymmetric):**
  - *Humans → Thol* `–`, but *Thol → Humans* `·` — humans carry the resentment; Thol shrugged it off.
  - *Humans → Chlorithe* `–`, but *Chlorithe → Humans* `·` — human fear vs. cold alien indifference.
  - *Korro → Naaz* `–` and *Sszra → Naaz* `–`, but Naaz return only `·` — the Naaz are disliked by some yet bear no grudge back.
- **One-sided courtship (asymmetric):** *Drenn* like nearly everyone they can sell to — *Drenn → Chlorithe/Voltaar* `+`, but both return only `·`. Great for trade revenue, not for genuine alliance.

---

# PROGRESSION & UNLOCKS

There is **no win condition** (endless sandbox). Growth is gated by two things working together:

1. **Wealth** — credits from lodging, trade, and fuel. Each new species has a wealth threshold before they'll consider the station worth visiting.
2. **Ability to support them (research)** — you must research and physically build the **life-support** (their gas) and **food line** (their diet) before they can survive aboard. Tier 3 species also require **containment & safety** research.

So a species only arrives when you can *both afford the reputation* **and** *keep them alive*. You unlock outward from the easy, system-sharing Tier 1 into the exotic, high-maintenance Tier 3 — each step adding a new parallel system you must integrate without breaking the profitable shared core. (Full thresholds in the Balance Sheet below.)

---

# TECHNOLOGY → PROFIT → DANGER

Each species has a **Tech Level (TL 1–6)** that rises with tier. Tech cuts both ways:

- **More advanced = more profitable.** High-TL species trade rarer goods (trade multipliers up to ×5) and pay premium lodging — they're why you reach for the dangerous tiers at all.
- **More advanced = more dangerous in a fight.** Tech Level feeds **Combat Power**. When relations break down into a skirmish, high-TL combatants win decisively and cause heavy **collateral** — damaged modules and, worst of all, **breached atmospheres** that cross-contaminate and can vent a wing. A feud between two Tier 3 species is a station-ending event if you're unprepared.
- *(Tech ≠ pure muscle: e.g. low-tech **Korro** are stubborn brawlers with high Combat Power. Most species follow the curve; a few subvert it.)*

## The Escalation Ladder (when architecture fails)
1. **Discontent** — wrong food/air, bad neighbors, or shortages push mood down.
2. **Tension** — each hostile species-pair accrues Tension while forced together; deaths and grievances spike it.
3. **Skirmish** — at the tension threshold, fighting erupts. Outcome = Combat Power × numbers − **Security**.
4. **Collateral & breach** — high-TL winners wreck modules and may breach atmosphere, triggering cascading disasters.
5. **Takeover** — if a powerful faction wins repeatedly and Security can't hold, they **seize control of the station** — the soft "you've lost the station" state. Defuse earlier through good architecture, or hold the line with **Security I–III** (guards, turrets, riot response, auto-sealing blast doors).

**The lesson:** Security is a backstop, not a strategy. The real defense is a station built so everyone's needs are met — then the politics stay peaceful on their own.

---

# RESOURCE GATHERING: RADAR, SITES & DRONE FLEET

Resources live **out in space**, often far from the station, so gathering is its own layer of play with its own view. You toggle between the **Build View** (station interior) and the **Radar View** (the space around you), and the gathering loop is: **scan → identify → assign drones → shuttle → deplete → move on.**

## The Radar View
A top-down tactical map centered on the station, with **concentric range rings** marking how far your drones can currently reach.
- **Fog of space:** unscanned space is dark. A **Sensor Array** module sweeps outward; its tier sets detection range and resolution.
- **Blips:** detected sites appear as color-coded blips (color = resource, size = richness, icon = hazard). Until surveyed they read as *unidentified contacts* — you know something's there, not what.
- **Survey:** a **Survey Drone** (or a higher-tier passive scan) identifies a blip's composition, richness, hazard, and recommended bot tier.
- **Live traffic:** mining drones in transit show as moving dots along their routes, so you can read congestion and range at a glance. Filters let you show/hide by resource, hazard, or depletion.

## Sites
Each site has: **position** (distance ring + bearing), **resource type(s)**, **richness** (a depleting pool), **yield rate**, **hazard**, and whether it **replenishes**. Lifecycle: *Discover → Survey → Exploit → Deplete → Abandon.*
- **Finite** (asteroids) drain to nothing; **replenishing** (gas clouds, fungal drifts) slowly regenerate.
- **Moving / time-limited** sites — passing comets, drifting derelicts — create urgency and reward opportunistic dispatch.
- **Event sites** — a rich salvage wreck or a comet stream — spawn temporarily and may carry **pirates** or instability.
- Distance is the core trade-off: a **near-poor** site vs a **far-rich** site is time, fuel, and risk weighed against need.

## The Drone Fleet & Assignment
Mining bots are a managed fleet (tiers I–III differing in **range, cargo, speed, integrity**). Assignment works on two layers:

1. **Per-site assignment (base mechanic).** Click a surveyed site → set how many drones to commit. They auto-run the shuttle loop (fly out → mine → return → unload → repeat) until the site depletes or you reassign them. Direct, legible, hands-on — the early game.
2. **Per-resource standing orders (unlockable automation).** Set a station-wide target ("keep ≥200 Water," "maximize Exotic Ice") and idle drones **auto-dispatch to the best known site** for that resource, re-routing as sites deplete or new ones are found. This is how you scale once you're juggling many sites and species demands at once.

You'll typically run a **portfolio of directives** at once, tied directly to live needs — standing up a Naaz wing means pointing drones at Exotic Ice + ammonia gas clouds while your Standard-Rations chain keeps humming.

## Range, Relays & Risk — the gating systems
- **Range/charge:** a site beyond a drone's round-trip range is unreachable until you either field a **higher-tier bot**, or place a **Charging Relay (beacon)** out in space as a forward refuel/charge node that extends effective reach one ring further. Rich, distant sites therefore demand infrastructure investment — a natural expansion curve.
- **Bays:** **Bot Bays** (launch/dock/recharge) cap concurrent traffic via airlock cycling; **Repair Bays** restore integrity. Want more drones out at once? Build more bays.
- **Hazards:** hazardous sites yield more but risk **drone loss** (radiation, micrometeorite, corrosion, pirates). Mitigate with shielding upgrades, Repair Bays, or escorts — or accept attrition for the payout.

---

# STRUCTURAL INTEGRITY, DESTRUCTION & CONNECTIVITY

The station is a physical structure, not just a set of rooms — and **connectivity is fragile.** Rooms and corridors form a traversal graph; lose the wrong node and the station can literally split in two.

## How rooms are lost
- **Player demolition** — you delete a room deliberately (refit, reroute, reclaim space).
- **Combat collateral** — high-Tech-Level skirmishes damage and can destroy modules (see *Technology → Profit → Danger*).
- **Disasters** — fire, explosive decompression, reactor faults, methane/hydrogen ignition, or external hazards (asteroid strike, derelict drift) during events.

## Decompression on loss
Destroying or breaching a **pressurized** room vents its atmosphere. If adjacent doors/airlocks aren't sealed first, the breach propagates: connected rooms explosively decompress, occupants are dragged toward the void, unsuited crew die fast, and incompatible gases cross-contaminate neighboring wings. Player demolition therefore **warns and asks you to seal/evacuate first**; sudden combat or disaster destruction gives no such grace.

## Severed connectivity — the key rule
Because traversal runs through the room graph, **if a destroyed room was the only connection between two parts of the station, the station splits into disconnected sections.** A severed section loses everything that flowed through that link:
- **Movement** — occupants can no longer walk between the sections.
- **Power** — conduits are cut; an isolated section runs only on its own solar/batteries and may brown out.
- **Life support & supply** — shared atmosphere balancing, food delivery, and bot logistics no longer cross the gap. A stranded section can suffocate or starve if it lacks its own generation.

## The only link left: EVA / spacewalk
Until you reconnect, the **only** way across is for occupants to **suit up at a space-facing airlock and spacewalk** to an airlock on the other section. EVA is deliberately a poor substitute for a corridor:
- **Slow & low-throughput** — one or two at a time, long transit, airlock cycling.
- **Risky** — limited suit oxygen, micrometeorite hits, and panic; a botched EVA means a lost occupant drifting away.
- **Species-gated** — only species with compatible suits can EVA at all. Exotic Tier 3 species (e.g. Voltaar, Naaz) may have **no suit option** and become **stranded** until you rebuild — a serious mood/safety crisis.
- **Cargo-poor** — crew can hand-carry only trivial amounts; it does **not** restore power or piped life support.

## Restoring the link
Reconnect by building across the gap:
- a **connecting Tunnel/corridor** (cheapest, fastest — pure traversal), **or**
- **another room of the same footprint** that re-bridges the two sections (restores traversal *and* function).

Once a pressurized, powered link is rebuilt, normal pathing, power, and life-support sharing resume and EVA stops. **Lesson, again: architecture is survival.** Build redundant connections (loops, not single chokepoints) so one lost module never strands a wing — a station planned as a ring or mesh shrugs off a breach that would cripple a single-spine layout.

---

# BALANCE & TUNING SHEET (embedded copy)

> Also maintained as a standalone file: **`BALANCE.md`**. First-pass numbers for prototyping; all meant to be tuned. Credits = ¢. Time in real-time seconds at 1× speed.

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
- **Repeated wins by an unchecked faction → station takeover** (soft loss). Security can suppress, contain, and ultimately prevent this.
- **Security** (guards/turrets/riot response) adds defensive Combat Power and a chance to suppress before casualties.

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
4. Tier 3 species are huge earners (×3.5–×5 trade, 38–60¢/day) but demand sealed exotic wings, the priciest containment research, and strong Security — because a high-TL skirmish among them can breach the hull and, unchecked, end in a takeover.
