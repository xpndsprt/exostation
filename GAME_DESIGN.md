# EXOSTATION — One Page Design

> A top-down space station management sim in the spirit of *Prison Architect* and *RimWorld*. Build a station module by module, keep the lights on, and run the busiest, most volatile crossroads in the sector.

## Implementation status

**EXOSTATION is well past MVP (~M39 shipped).** This document is the original **north-star vision**: it holds the full design intent, including systems and species not yet built. It is *not* the live numbers reference.

- **`STRATEGY.md` / `BALANCE.md` / `COSTS.md` are the kept-in-sync source of truth** for everything that actually ships — live tuning numbers, costs, and player-facing mechanics. When they disagree with this doc, **they win**.
- Throughout this document, mechanics are tagged **⚙️ shipped** (in the game today) or **🔭 planned** (vision, not yet implemented). Where a shipped system is *simpler* than the vision below, the tag notes the difference.

The vision is deliberately preserved in full — the ⚙️/🔭 tags keep it honest about where the build stands without discarding where it's headed.

## Core Thesis — Station Architecture *is* Politics
**How you build is how you govern.** Every species has needs (the right air, the right food, the right neighbors). If your station **serves those needs** — segregated atmospheres, parallel food chains, friends placed together, rivals kept apart — the species **collaborate**: moods rise, trade flows, the station thrives on its own. If it **fails to** — shared corridors between enemies, food shortages, leaking wings — tension festers, mood collapses, and grievances harden into **armed skirmishes**. Left unchecked, a powerful faction can **seize control of your station.** You never directly command anyone; you author the environment, and the politics emerge from your blueprint.

## The Pitch
You are the operator of a deep-space station that is three businesses in one: a **trading post**, a **hotel**, and a **fuel depot**. Ships dock, crews disembark, deals are struck, tanks are filled. Your job is to grow the station to meet demand while keeping a roster of wildly different alien species alive, fed, breathing, and — ideally — not at each other's throats.

## Core Loop
> ⚙️ **Shipped** — the build → power/supply → receive → profit → manage loop runs in the game today (with per-room atmosphere zoning, food lines, the political chain, and the economy below). The **refinery / fuel-depot** strand is 🔭 planned (no fuel resource or refinery module yet; income today is lodging + mineral trade).

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

| Tier | Compatibility | Example demands | Status |
|------|---------------|-----------------|--------|
| **Tier 1 — Kindred** | Share humanity's air & food (start: **Humans**). | One shared habitat works for all of them. Easy money. | ⚙️ shipped |
| **Tier 2 — Divergent** | Different breathing gas **or** different diet. | Need segregated atmosphere zones or dedicated food chains. | ⚙️ shipped (Vry'l, Thol) |
| **Tier 3 — Alien** | Completely incompatible — exotic gases, hostile temperatures, inedible-to-others food. | Sealed, isolated wings. A leak is lethal to everyone nearby. | 🔭 planned |

### Atmosphere as a hazard  *(⚙️ shipped)*
Because species breathe different gases, **atmosphere is a resource you zone and contain**. Airlocks separate incompatible wings; a breach or a wrong door means one species' air poisons another. Designing safe adjacency and traffic flow is the central spatial puzzle. *(Shipped today as per-room O₂ vs CH₄ zoning — the exotic gases Cl₂/NH₃/H₂ are 🔭 planned alongside their Tier-3 species.)*

### Relations web
Every species holds **opinions** of every other species — some pairs **love** being neighbors (mood/trade bonuses), others **hate** it (mood penalties, refusal to dock, brawls). Room placement becomes diplomacy: who you put next to whom, who shares a corridor, who shares a bar. Mixing the wrong guests turns a profitable hotel into a riot.

## Economy
> ⚙️ **Shipped** — lodging income (hotel guests), mineral **trade** (Trade Hub), and **recurring upkeep** (per-module upkeep + crew wages, with a net-¢/s readout) all run today; an idle station bleeds while an active one profits. 🔭 **Planned:** the **fuel** strand (refine ice/gas into fuel, sell to ships, rush hours) and "buy low / sell high" commodity refining.

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
- **Structure: Endless sandbox.** The challenge is self-escalating — each new species tier introduces an incompatible system (gas, food line, temperature, feud) you must physically integrate without breaking the profitable shared core. *(⚙️ Note: the shipped game now adds **scenario objectives with a win/lose state** on top of the sandbox — clear an ordered goal list to win, after which play continues freely; a sustained crew-wipe with no recovery is a defeat. See `BALANCE.md` "Objectives & game-over". The original "no win condition" stance has shipped as "objectives, then endless".)*

---

# FOOD SYSTEM

> ⚙️ **Shipped:** parallel **food lines** — **Standard Rations** (Bio Vat → biomass → Rations Synth) and **Fungal Mash** (spores → fungal synth, gated behind Fungal Synthesis research) — run today as separate supply chains. 🔭 **Planned:** the **food-quality tiers (Basic → Refined → Gourmet) and per-species palate** mood bonuses, plus the exotic Tier-3 food lines (Live Protein, Mineral Slurry, Cryo-Gel, Plasma Feed) — not yet built.

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

Nine species across three compatibility tiers (vision). You start with **Humans** and unlock the rest as the station grows and reputation spreads.

> **⚙️ Shipped:** five species — **Humans, Drenn, Korro, Vry'l, Thol** (see `src/species.ts`). **🔭 Planned:** **Sszra, Chlorithe, Naaz, Voltaar** — their exotic gases (Cl₂ / NH₃ / H₂) and cryo/temperature mechanics are not implemented, so neither are they.
>
> **Crew are NOT hand-placed.** Residents **immigrate by shuttle** through a powered Docking Port once you've built living conditions for them (their gas + their food + a free bunk). **Drenn are guest-only visitors** (hotel lodging), never residents. The shipped resident roster is Human / Korro / Thol / Vry'l.

### Tier 1 — Kindred  (Gas: Oxygen · Food: Standard Rations · easy to co-house)
| Species | Breathes | Eats | Palate | Status | Flavor |
|---------|----------|------|--------|--------|--------|
| **Humans** | Oxygen (O₂) | Standard Rations | Medium | ⚙️ shipped (resident) | Baseline jack-of-all-trades. Your starting species. |
| **Drenn** | Oxygen (O₂) | Standard Rations | High (gourmets) | ⚙️ shipped (guest-only) | Gregarious merchant culture; spend big when comfortable. Visit as hotel guests, never reside. |
| **Korro** | Oxygen (O₂) | Standard Rations | None (calorie-only) | ⚙️ shipped (resident) | Stoic heavy-labor species; happy with bunks and bulk food. Same-air O₂ rival of Humans/Vry'l. |

### Tier 2 — Divergent  (one axis differs — gas **or** food — needs segregation)
| Species | Breathes | Eats | Palate | Status | What makes them hard |
|---------|----------|------|--------|--------|----------------------|
| **Vry'l** | Oxygen (O₂) | **Fungal Mash** | None | ⚙️ shipped (resident) | Same air as humans, but need a whole separate Spore→Fungal food chain. |
| **Thol** | **Methane (CH₄)** | Standard Rations | Medium | ⚙️ shipped (resident) | Eat the shared food line, but need a sealed methane wing — and CH₄ is flammable. |
| **Sszra** | Oxygen (O₂) | **Live Protein** | High | 🔭 planned | Carnivores; share air but demand a high-biomass gourmet protein chain (not implemented). |

### Tier 3 — Alien  (gas + food + temperature all exotic — fully sealed wings)
> 🔭 **All Tier 3 species are planned, not shipped.** Exotic atmospheres (Cl₂ / NH₃ / H₂), cryogenic temperature, and their exotic food lines do not exist in the build yet.

| Species | Breathes | Eats | Palate | Status | Hazard |
|---------|----------|------|--------|--------|--------|
| **Chlorithe** | **Chlorine (Cl₂)** | Mineral Slurry (silicon-based) | None | 🔭 planned | Cl₂ atmosphere lethal to every other species; corrosive leaks. |
| **Naaz** | **Ammonia (NH₃)**, cryogenic | Cryo-Gel Feed | High | 🔭 planned | Need cold + ammonia; their food chain shares those hazardous inputs. |
| **Voltaar** | **Hydrogen (H₂)** | Plasma Feed (energy) | N/A | 🔭 planned | Energy-based; H₂ + any O₂ leak = explosion. Power-hungry. |

---

# THE POLITICAL WEB

Every species holds an opinion of every other. Co-housing or routing rivals through shared corridors/bars applies mood and trade effects; pairing friends gives bonuses. **Adjacency is diplomacy.**

**Relations are asymmetric** — A's feeling about B is not always B's feeling about A. **Read the table by row:** each row is *how that species feels about the species in each column.*

> **⚙️ Shipped vs 🔭 target.** The full 9×9 table below is the **design target**, not the live matrix. Today the game wires relations only among the **5 shipped species** (Humans, Drenn, Korro, Vry'l, Thol). The shipped weights are **LIKE +8 / DISLIKE −8 / KIN +4 / NEUTRAL 0** (see `src/relations.ts` / `BALANCE.md`). **LOVE / HATE (±15) are reserved for the unshipped Tier-3 species** — so no live pair currently uses ♥ or ✖. The rows/columns for Sszra, Chlorithe, Naaz, and Voltaar are 🔭 planned.

**Legend:** ♥ Love (±15, 🔭 Tier-3 only) · `+` Like (+8) · `·` Neutral (0) · `–` Dislike (−8) · ✖ Hate (−15, 🔭 Tier-3 only)

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

> ⚙️ **Shipped (simpler than below):** a **credit-gated tech tree** — research at a powered Research Lab spending credits unlocks Methane Life-Support, Fungal Synthesis, Cargo Logistics, and Station Security (see `COSTS.md` / `BALANCE.md`). 🔭 The full wealth-**and**-reputation gating per species, and the deep multi-branch research tree (Containment, Robotics, Sensors, etc.) described below, are the planned target.

Growth is gated by two things working together:

1. **Wealth** — credits from lodging, trade, and fuel. Each new species has a wealth threshold before they'll consider the station worth visiting.
2. **Ability to support them (research)** — you must research and physically build the **life-support** (their gas) and **food line** (their diet) before they can survive aboard. Tier 3 species also require **containment & safety** research.

So a species only arrives when you can *both afford the reputation* **and** *keep them alive*. You unlock outward from the easy, system-sharing Tier 1 into the exotic, high-maintenance Tier 3 — each step adding a new parallel system you must integrate without breaking the profitable shared core. (Full thresholds in the Balance Sheet below.)

---

# TECHNOLOGY → PROFIT → DANGER

> ⚙️ **Shipped:** the **political web → mood → tension → skirmish** chain runs in the game (relations drive room harmony and mood; chronic tension between cohabiting rivals erupts into live skirmishes — see `BALANCE.md` "Tension & skirmishes", M39). 🔭 **Planned:** **faction takeover** (a winning faction seizing the station as a soft loss) and the full Security I–III tiers / breach-collateral cascade described below are vision, not yet built.

Each species has a **Tech Level (TL 1–6)** that rises with tier. Tech cuts both ways:

- **More advanced = more profitable.** High-TL species trade rarer goods (trade multipliers up to ×5) and pay premium lodging — they're why you reach for the dangerous tiers at all.
- **More advanced = more dangerous in a fight.** Tech Level feeds **Combat Power**. When relations break down into a skirmish, high-TL combatants win decisively and cause heavy **collateral** — damaged modules and, worst of all, **breached atmospheres** that cross-contaminate and can vent a wing. A feud between two Tier 3 species is a station-ending event if you're unprepared.
- *(Tech ≠ pure muscle: e.g. low-tech **Korro** are stubborn brawlers with high Combat Power. Most species follow the curve; a few subvert it.)*

## The Escalation Ladder (when architecture fails)
1. **Discontent** — wrong food/air, bad neighbors, or shortages push mood down.
2. **Tension** — each hostile species-pair accrues Tension while forced together; deaths and grievances spike it.
3. **Skirmish** — at the tension threshold, fighting erupts. Outcome = Combat Power × numbers − **Security**.
4. **Collateral & breach** — high-TL winners wreck modules and may breach atmosphere, triggering cascading disasters.
5. **Takeover** *(🔭 planned)* — if a powerful faction wins repeatedly and Security can't hold, they **seize control of the station** — the soft "you've lost the station" state. Defuse earlier through good architecture, or hold the line with **Security I–III** (guards, turrets, riot response, auto-sealing blast doors). *(Today's loss condition is a sustained crew-wipe, not a takeover.)*

**The lesson:** Security is a backstop, not a strategy. The real defense is a station built so everyone's needs are met — then the politics stay peaceful on their own.

---

# RESOURCE GATHERING: RADAR, SITES & DRONE FLEET

> 🔭 **Mostly planned.** This whole layer — the **Radar View**, fog-of-space + survey, multi-site/blip management, the managed **drone fleet** (tiers, range rings, integrity), per-resource standing orders, and **Charging Relays** — is design target, not yet built.
>
> ⚙️ **Shipped mining is much simpler:** a **Bot Bay** auto-dispatches a mining drone to the **nearest asteroid**, which hauls **cargo 10** (×1.5 with a Korro aboard) back to storage, repeating automatically. No radar view, no surveying, no fleet management, no relays. Minerals feed trade and Mineral-Slurry-style needs.

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

> 🔭 **Planned.** The full model below — **EVA / spacewalk**, **decompression spread** across unsealed rooms, and **severed-connectivity** (a destroyed chokepoint splitting the station and stranding a wing) — is vision, not yet implemented. ⚙️ What *does* ship: **hull-breach incidents** vent a single wall of a sealed room and crew rush to reseal it (see `BALANCE.md` "Station incidents"); demolition refunds 50%. There is no spacewalk or graph-split mechanic in the build today.

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

# BALANCE & TUNING NUMBERS

> **The live tuning numbers live in [`BALANCE.md`](BALANCE.md)** — the maintained, kept-in-sync source of truth (species table, mining yields, food synthesis, mood modifiers, tension & skirmishes, the credit-gated tech tree, storage caps, station incidents, the operating economy, crew immigration, reputation/requests, objectives & game-over). Build prices live in [`COSTS.md`](COSTS.md); player-facing mechanics in [`STRATEGY.md`](STRATEGY.md). Code (`src/structures.ts`, `src/species.ts`, `src/relations.ts`, `src/config.ts`) is authoritative.
>
> This used to hold an embedded copy of the balance sheet; it was removed because it **drifted** from `BALANCE.md` (stale tension numbers, a phantom "Water" food input, planned-but-unshipped species/values presented as live). **Do not re-embed the numbers here** — one maintained sheet only. Refer to `BALANCE.md` for anything quantitative; this document keeps the *vision and intent*, with ⚙️ shipped / 🔭 planned tags throughout.
