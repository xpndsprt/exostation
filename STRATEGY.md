# EXOSTATION — Strategy Guide

> A complete guide to every mechanic in the current build (milestones M0–M39), ordered by **importance** and by **when you first meet it**. All numbers are the live first-pass values and may be tuned.

## The one thing to understand first
**Station architecture *is* politics.** You never directly command anyone. You build the environment — rooms, power, atmospheres, food, neighbors — and the crew act on their own needs. Build a station that serves everyone and they collaborate; build a bad one and mood collapses, tension rises, and it ends in skirmishes and vented rooms.

**The survival chain, in dependency order:**
`Solar → Power → O₂ Generator → sealed Room → breathable air → living crew`, with `Mining → Food` keeping them fed. Break any earlier link and everything after it fails. Learn it in that order.

---

## Priority ladder (what to fix first, always)
1. **Air** — crew suffocate in ~12 seconds without their gas. Life support is top priority.
2. **Power** — no power means no air. Keep supply ≥ draw, with battery headroom.
3. **Food** — slow but fatal to mood; feed the loop before guests arrive.
4. **Mood & neighbors** — unhappy, badly-placed crew breed tension.
5. **Tension/skirmishes** — the failure state; prevent it upstream, don't fight it.

If you're ever overwhelmed: **pause (Space)**, fix air and power, then unpause.

---

## 1 · The interface (you need this immediately)
**Views & camera**
- **Right-drag** = pan · **mouse wheel** = zoom · **Recenter** button snaps back to your station.
- **Overlay** buttons (top bar): **Power** (powered/unpowered modules) and **Rooms** (per-room tint). Atmosphere is always shown as a colored fill.

**Your objective & the HUD**
- The **top bar** shows a 🎯 **scenario objective** with a progress bar — your current goal (e.g. *grow your crew → bank credits → host different species*). Clear them all to **win**; you can then keep building in free play.
- **Capacity chips:** 👥 **crew / Crew Quarters** and 🏨 **guests / Hotel Rooms** show population vs capacity at a glance (the crew chip turns red if you somehow exceed it). 🙂 is station-average mood.
- If your **whole crew dies and the station can no longer attract anyone** (no powered dock / no bunk in air / no food), you **lose** after a short grace period — a banner offers a fresh start.

**Building**
- Pick a tool from the left **palette** (each shows its **hotkey**). The **ghost preview** tints **green = placeable, red = blocked**; the cursor becomes **⊘** where you can't build.
- **Floor / Wall / Erase** support **drag-rectangle** fill — drag out a room and the label shows the size **and running ¢ cost** (red if you can't afford it).
- **Door** and modules place on a single click. **Modules have footprints** (e.g. generators/vats/bays/lounges are 2×2, the synth/hotel/lab 2×1, quarters/batteries/silo/turret 1×1) — the ghost shows the full footprint and turns red if it won't fit on clear floor. The **Solar** ghost marks its **wall-mounted base** so you can see which way it faces before placing.
- **Find your modules:** **double-click a build tool** in the palette to pan-cycle the camera through every instance you've placed (and select each).
- **You don't place crew.** There is no "add a Human" tool — residents **immigrate by shuttle** once their living conditions are ready (see *Crew* below). You only ever build the *environment*.
- **Everything costs credits.** Each build button shows its price (¢); the ghost turns red and the cursor blocks if you can't afford it. You start with **¢1000**. **Deconstructing** a module (Select → Deconstruct) refunds **50%**. Full price list: [`COSTS.md`](COSTS.md).

**Inspecting**
- **Hover** anything for a quick tooltip (no click). **Hover a crew member** to see the **mood breakdown** — *base 50 · needs ± · neighbors ± · room ±* → the value their mood is pulled toward. **Hover a room tile** to read its **harmony value and production multiplier** (e.g. *tense −0.53 → ×0.6 production*), so you can see exactly what a bad pairing costs.
- The **Select** tool (S) opens the right-hand **info panel** with live stats and **Deconstruct** / **toggle on-off** buttons.

**Time & saving**
- **Pause / 1× / 2× / 3×** (`Space` pause, `[` / `]` slower/faster).
- **Saves** (top bar) opens a panel with an **Autosave slot + 3 named slots** — each with **Save / Load / Delete** and a timestamp. The game **autosaves every 30s**; a manual save flashes **Saved ✓**.

**First run**
- A **Getting Started** checklist appears top-center on a fresh game and ticks off as you *seal → power → add O₂ → synth → quarters → dock*. It disappears once your first crew arrive (or hit **Skip**).

**Alienpedia + Advisor (lower-right)**
- The **Alienpedia** (top) is a reference card for **every species that has visited**: what they breathe, eat, their combat power, who they like/dislike, role, and how many are aboard. **Click an entry** (when that species is aboard) to **jump the camera to them and ring them**; it also shows their **live count and average mood**.
- The **Advisor** (below) watches the sim and shows your **next logical steps**, most urgent first (red = critical danger, amber = should-do, green = tip). When in doubt, do what the top red/amber item says.

---

## 2 · Sealing a room (first build)
- The grid starts as empty **space** (vacuum). Lay **Floor**, then enclose it with **Wall**.
- The sim constantly detects rooms. A floor area that can't reach open space is **sealed** (it can hold atmosphere); a floor exposed to space stays **open** (it never will).
- **Doors are airlocks:** a **Door** tile is **walkable but blocks gas**, so it connects two rooms for traffic **while keeping their atmospheres separate**. Put a door in the shared wall between wings — each side keeps its own gas, and crew can still pass through (on suit for the moment they're in the doorway).
- To **merge** two rooms into one shared atmosphere instead, leave a plain **floor** gap (no door) in the wall.
- **Erasing a wall that exposes a sealed room vents it** — everyone inside loses air.

---

## 3 · Power (M2) — nothing runs without it
- **Solar Panel** generates **+10 PU** (power units). It mounts on the **outside of a space-facing wall** and extends **3 tiles out into space** (normal to the wall) — so build your hull first, then line panels along its exterior. The ghost shows the 3-tile footprint and turns red if there's no wall to anchor to or no room to extend. **Battery Bank** stores **50 PU** of surplus for later.
- Consumers draw power: **O₂ Generator −6**, **Methane Gen −9**, **Bio Vat −6**, **Rations Synth −5**, **Docking Port −5**, **Trade Hub −5**, **Bot Bay −4**, **Lounge −4**, **Hotel Room −2**, **Crew Quarters −1**.
- The network is **station-wide**: `net = supply − draw`. Surplus charges the battery; deficit drains it.
- When the battery is empty and draw still exceeds supply → **BROWNOUT** (red banner). Modules are **shed by priority, life support last**: pods/docks/bays go dark before generators.
- **Takeaway:** always keep solar above your total draw, and add batteries so a momentary spike (or the dark side of an orbit, later) doesn't kill life support. Use the **Power overlay** to spot anything unpowered.

---

## 4 · Atmosphere & gases (M3, M9) — the core puzzle
- An **Atmosphere Generator** fills its **enclosed** room with one gas while powered:
  - **O₂ Generator** → oxygen (cyan tint) — for Humans & Drenn.
  - **Methane Generator** → CH₄ (orange tint) — for Thol.
- **A room with two *different* gas generators becomes "mixed" (red) and is lethal to everyone.** Never put an O₂ and a Methane generator in the same room.
- No power or not enclosed → **no air** (vacuum).
- **The zoning puzzle:** species that breathe different gases need **separate, sealed wings**, linked by **doors** so crew can still move around without the gases mixing. Plan your floorplan so incompatible atmospheres never share a room.
- Crew breathe their species' gas only. In the right gas they're fine (breath recovers ~15%/s, suit refills). In the wrong gas, a mix, or vacuum, their **space suit auto-dons** and protects them — see below.
- A crew member who ends up off their native air will **try to path to a room with their own gas** (through doors if needed) before the suit runs out.

### Space suits (limited venturing)
Every species can briefly cross hostile zones — a suit dons automatically.
- Off native air, the **suit reserve drains ~14%/s** while keeping breath topped up — a full charge lasts **~7 seconds (about 28 tiles of travel)**. Crew turn back for their own air at ~30% reserve, so plan a practical one-way reach of ~20 tiles.
- When the suit hits 0, **breath then drops ~8%/s and they die at 0** (~12.5s more).
- Back in native air the **suit recharges fast (~40%/s)**. A suited crew member is drawn **wearing their space suit (helmet on)** and shows a **light-blue ring**.
- **Implication:** doors + suits let you run one shared corridor past several differently-gassed wings; just keep the hostile stretch short enough that nobody's suit empties before they reach their own air.

---

## 5 · Crew & needs (M3–M4) — keeping people alive and functional

### How crew arrive (you don't place them)
Residents **immigrate by shuttle through a Docking Port** — you never hand-place a species. A new crew member arrives only when **all four** of these are true:
1. A **powered Docking Port** (the airlock the shuttle uses).
2. A **free Crew Quarters** — each bunk is room for exactly one resident, so **Crew Quarters are your crew capacity** (the way Hotel Rooms are your guest capacity).
3. A bunk sitting in **breathable air for that species** (an O₂ room for Humans/Vry'l, a CH₄ room for Thol).
4. **Food they can eat is in stock** (Rations for Humans/Thol, Fungal Mash for Vry'l) — so power a Synth first; the shuttle waits until meals are ready.

A shuttle then drops one resident roughly every **12s** while a bunk is free. **Build another Crew Quarters and a new resident shows up** to fill it. When more than one species qualifies (e.g. you run both an O₂ + Rations chain and an O₂ + Fungal chain), the station favors **whoever has the fewest aboard**, nudging you toward a diverse crew. *Drenn never reside — they only visit as guests (see §8).*

Each crew member tracks four meters (see them in the info panel; a mood dot floats over their head):
- **O₂ / breath** — from atmosphere (above).
- **Food** — decays ~**1.5%/s**; when **< 40** they path to a **Rations Synth** and eat a meal (refills to full).
- **Rest** — decays ~**1%/s**; when **< 35** they sleep (recover ~**12%/s**) to full, then release the bunk. **Crew sleep in Crew Quarters; visitors sleep in Hotel Rooms** — separate accommodations.
- **Fun** — decays ~**0.4%/s**; when **< 40** they head to a **Lounge** to relax (recover ~**20%/s**). Both crew and visitors use lounges — see *Entertainment* below.
- **Mood** — see the political web below.
- Crew **pathfind (A\*)** at ~**4 tiles/s** along connected floor. If they can't reach food/a pod, the need stays unmet — an **orange ring** warns you.

**Build for autonomy:** put pods and a synth inside the breathable wing so crew can satisfy needs without crossing a vacuum or the wrong gas.

---

## 5a · Entertainment — where everyone unwinds
- A **Lounge** is an entertainment module (mid-priority power). When **Fun** runs low, crew **and** visitors path to the nearest Lounge and relax, restoring fun and giving a small mood lift.
- Lounges are **social hubs**: agents gather there, so the **political web applies** — friends relaxing together get a mood boost; if you let species that dislike each other share a Lounge, the proximity penalty (and tension) bites. Consider separate lounges for incompatible groups.
- **Takeaway:** build at least one Lounge once you have a few residents or regular guests; bored crew slide into low mood (and toward tension). Visitors with somewhere to relax are happier guests.

## 5b · Jobs & upkeep — residents work, visitors lodge
The station now needs a working population.
- **Machinery wears down.** Every powered module (O₂/Methane generators, Synth, Vat, Bot Bay, Docking Port, Pods) loses **condition** while running (~0.6%/s). Solar panels and batteries are passive and never wear.
- **Residents (crew) service it.** When a crew member isn't handling a personal need, they take a **service job**: walk to the nearest worn module (condition below 60%) and repair it (~15%/s) back to full. A small **orange bar** shows a module's upkeep; the info panel shows **Condition** and "being serviced".
- **If condition hits 0 the module breaks** — it goes dark (unpowered) and stops working until a crew member repairs it. A broken O₂ generator means a wing starts losing air, so **keep enough crew to cover your machinery** (rough rule: one resident per ~6 modules).
- **Visitors never work.** Guests (traders/Drenn) only use **hotel accommodations** — they eat, sleep in a pod, pay lodging, and leave. All upkeep falls on residents.
- **Hover any module** to see its **Condition** on the rollover tooltip (and full details via the Select tool).
- **Takeaway:** every machine you add is also upkeep. Grow your resident crew alongside your station, or things start breaking down.

## 6 · Food production — grown on-station, two food lines
Food is a two-step, **power-driven** loop, and modules have **selectable recipes** (Select → Switch recipe):
- A **Bio Vat** grows a base resource from power — **Biomass** (default) or **Spores** — **+3 every 8s** (🌱 shows biomass/spores).
- A **Rations Synth** converts a base into a food line — **Rations** (from biomass) or **Fungal Mash** (from spores) — **2 → 4 meals every 10s** (🍱 shows rations/fungal).
- **Each species eats its own line:** Humans/Drenn/Thol eat **Rations**; **Vry'l eat Fungal Mash**. To host Vry'l, set a Vat to **Spores** and a Synth to **Fungal**.
- The station starts with a **generous biomass reserve (300)**, so a Rations Synth alone feeds your crew for a long while — build **Bio Vats** later, before that reserve runs low, to make food production self-sustaining.
- **Takeaway:** build **at least one Bio Vat per Rations Synth**. If meals stall, check both are powered (mid-priority — a brownout can shed them) and add more vats.

---

## 7 · Mining (minerals) — the materials economy
- **Asteroids occur naturally** — they're scattered around the map in open space at the start (you don't place them). Build a **Bot Bay** inside the station near some, and each bay comes with **one mining drone**.
- The drone auto-runs the loop: **dock → fly out → mine → fly back → unload**, delivering **minerals** to stock (the ⛏ chip; cargo 10/trip). Drone color shows its state (outbound/mining/inbound); a pip shows it's carrying cargo.
- A site has **richness** (starts at 1000) that **depletes** as it's mined.
- **Takeaway:** mining is **not tied to food** — it builds your **minerals** stockpile (for trade/construction as those systems land). Food comes from Vats; minerals come from asteroids. Place the asteroid close to cut round-trip time.

---

## 8 · Guests, trade & economy — the hotel and the market
- A **Docking Port** is a **hull airlock**: place it **on a wall that faces space** (interior floor one side, open space the other). The ghost goes red anywhere that isn't a valid hull wall.
- **Two kinds of arrival share the dock:** **resident crew** (gated by **Crew Quarters**, see §5) and **paying guests** (gated by **Hotel Rooms**). Both ride a grey **shuttle** that parks outside on arrival.
- **Guests:** the dock periodically (~20s) brings a **Drenn** visitor — **but only if you have a free Hotel Room**. **Hotel Rooms are your guest capacity** (separate from Crew Quarters). Guests enter the interior, use the hotel (eat, sleep, relax), **pay lodging (~1.5¢/s)**, and **depart after ~90s** (gold ring; they never work). Higher **Drenn reputation** makes them arrive more often.
- **Trade:** build a **Trade Hub** (your trading station) and every ~30s **traders buy your minerals** (up to 25 at ~3¢ each), converting mining output into credits. A green **trader ship** parks at a dock if you have one. No Trade Hub = no mineral sales. So the materials loop closes: mine asteroids → minerals → Trade Hub → credits.
- **Running costs (M37):** the station has **upkeep** — every operating module costs **~0.15¢/s** and every resident draws a **wage of ~0.2¢/s**. The credit chip shows your **net ¢/s** next to the balance (red when negative). So an *idle* station slowly **bleeds**; only an active economy (lodging + trade) stays in the black. Watch the net rate — if it's red, you're shrinking.
- **Takeaway:** Hotel Rooms + a dock drive lodging income; mining + a **Trade Hub** drive trade income. Keep net income positive, then spend the surplus on expansion and **research** (a Lab); deconstruct for a 50% refund.

---

## 9 · The species (who you're hosting)
| Species | Breathes | Likes / Dislikes | Combat power | Notes |
|---------|----------|------------------|:-----------:|-------|
| **Human** | O₂ | likes Drenn · **dislikes Thol** | 20 | Rations diet. Your first residents — an O₂ room + Rations + a bunk + a dock brings them. |
| **Drenn** | O₂ | likes everyone | 18 | Rations diet. Easy guests; share air & food with humans. |
| **Thol** | **CH₄ (methane)** | likes Drenn · neutral to humans | **35** | Rations diet, but need a sealed methane wing; strong in a fight. |
| **Vry'l** | O₂ | likes Drenn · neutral to others | 22 | **Fungal Mash diet** — same air as humans, but need a Spore vat + a Synth set to Fungal. |
| **Korro** | O₂ | **dislikes Humans & Vry'l** (mutual with Humans) · neutral to Drenn/Thol | **25** | Rations diet, **shares humans' air** — the first rival you can't separate by gas alone. Strong haulers (see traits). |

Humans, Drenn, and Vry'l all breathe O₂ and co-house freely, **but Vry'l eat a different food** (Fungal Mash). **Thol must be kept in their own methane wing** — and humans resent them. **Korro are the twist:** they breathe the *same* O₂ as your humans and eat the *same* Rations, so you **can't keep them apart with gas zoning** — you must give them their **own O₂ wing** (separate room, linked by a Door) or the shared room turns tense.

### Room harmony — who you put together matters
Beyond the proximity mood effect, each enclosed room has a **harmony** from how the species sharing it get along (Select-hover a tile to see *harmonious* / *tense*):
- **Harmonious room** (compatible/friendly species together): up to **+40% work & production** in that room (faster Vats, Synths, repairs) and a **mood lift**.
- **Tense room** (rivals together): down to **−40%** and a mood hit. **This now bites for real:** because **Korro share O₂ and Rations with Humans**, the two immigrate into the same wings and clash — a mixed Human/Korro room runs at a lasting mood penalty (~45 vs ~70) even if nobody fights. Left unmanaged with low mood, it escalates to a skirmish.
- **Takeaway:** group friends (e.g. Drenn with anyone) for a throughput boost, and **split same-air rivals into their own rooms** (Human wing ↔ Korro wing, joined by a Door). The Advisor warns if a room turns tense.

### Species traits — diversity pays off
Each species (except generalist Humans) brings a **bonus**, so a mixed station out‑produces a uniform one:
- **Thol — Engineer:** service/repair machinery **+50% faster**. Park them near your busiest modules.
- **Vry'l — Botanist:** Bio Vats **in their room grow +50% faster**. Keep one beside your vats.
- **Drenn — Merchant:** traders pay **+50% for minerals** while a Drenn is aboard. A docked Drenn pays for itself.
- **Korro — Hauler:** mining drones carry **+50% more** while a Korro is aboard — a real boost to your minerals economy, *if* you can house them without wrecking morale.
- **Human — Generalist:** no bonus, no penalty.
Traits show in the **Alienpedia** (⭐ line). The catch is always the cost: Thol need a methane wing, Vry'l need a fungal food chain, **Korro need their own O₂ wing away from Humans** — weigh the bonus against the infrastructure.

### Reputation & requests (M23) — keep each species happy with you
Every species you've hosted holds a **reputation** of your station (0–100, starts at **50**), shown as a bar in the **Alienpedia**. It rises and falls through **requests** — short goals each species posts in the **📋 REQUESTS** panel (top-right):
- **Host *N* of us aboard** — have at least N of that species on the station.
- **Keep us content** — get that species' average mood to **≥ 60**.
- **Build us a Lounge** — have a Lounge (rec module) somewhere on the station.
Each request shows its **reward (credits)**, **rep gain**, and a **countdown** (you have **120 s**). Fulfil it in time → credits + reputation. Let it **expire** → you lose reputation with that species. Up to **2** are active at once, a new one every **~50 s**.
- **Why it matters:** Drenn reputation drives **how often guests arrive** — high Drenn rep means a busier, more profitable hotel; low rep slows arrivals. Build reputation early with the cheap "host"/"Lounge" requests.

---

## 10 · The political web (M10) — mood from neighbors
- Every species holds an **opinion** of every other (asymmetric). Living within ~**4 tiles** of another crew member applies a mood delta:
  - **Like ≈ +8**, **Dislike ≈ −8**, same-species ≈ +4.
- **Mood = needs satisfaction + summed neighbor opinions** (clamped). The **mood dot** over each head is green (happy) → yellow → red (miserable); the 🙂 chip shows station average.
- Current relations that matter: **Humans dislike Thol** (one-sided — Thol don't mind humans). Drenn are universally liked and make great social glue.
- **Takeaway:** place friends together and keep resented pairs apart — even across a wall, proximity counts. A well-laid-out station keeps everyone in the green on its own.

---

## 11 · Tension & skirmishes (M11) — when architecture fails
This is the failure state the whole game is designed around.
- When a crew member's **mood is low (< ~30)** *and* a **disliked species is nearby**, their **tension** climbs fast (orange ring). Fix the cause (feed them, separate them) and it falls.
- **Even with everyone fed**, forcing rivals to **share a tense room** (harmony below ~−0.3) builds tension on a **slow burn** — a mixed Human/Korro wing left together long enough will eventually erupt no matter how happy they are. Keeping morale high buys time; it doesn't make cohabiting rivals safe. The only real fix is **separate wings**.
- At **100 tension** a **skirmish** erupts (red ring): they attack the nearest resented neighbor within ~2 tiles. Attacks are **one-sided by who resents whom** (e.g., a furious Human strikes a Thol; the Thol doesn't strike back unless *it* resents *them*).
- Damage scales with **combat power**, so high-power species (Thol = 35) are dangerous if *they* ever turn hostile.
- **A death wrecks a module in that room — which can vent it**, cascading into suffocation. One feud can gut a wing.
- **How to prevent it (in order):** keep mood up (food, rest, good neighbors) → never force disliked species into proximity → keep tension from ever starting. Combat is a symptom; the cure is upstream architecture.

---

## 12 · Research & tech (M30) — where your credits go
Banked credits aren't just a score — they buy **tech unlocks** that gate most of the catalog. Build a **Research Lab** (¢150, 2×1), keep it **powered**, and a 🔬 **TECH** panel (top of the right column) lets you spend **credits** on upgrades. Locked build tools show **"???"** in the palette (hover for the requirement) and **light up** when you research them. **Higher tiers require more powered Labs** — each tech shows its **🔬×N** Lab requirement, so you build several Labs to climb the tree.
- **Tier 1 — 1 Lab (cheap):** Energy Storage (¢100 → Battery) · Recreation (¢120 → Lounge) · Robotics (¢150 → Bot Bay) · Commerce (¢150 → Trade Hub).
- **Tier 2 — 2 Labs:** Cargo Logistics (¢250 → Silo) · Fungal Synthesis (¢300 → Vry'l food) · Methane Life-Support (¢350 → Thol wing) · Station Security (¢500 → Turret).
- **Tier 3 — 3 Labs (big-ticket):** Fusion Power (¢600 → Fusion Reactor) · Bulk Trade (¢600 → Cargo Exchange) · Cybernetics (¢800 → AI Core).
- **Tier 4 — 3 Labs (the win):** the five **Beacon** signature modules (¢700 each) — see *The Sector Beacon* below.
- **Big modules to spend thousands on:** Fusion Reactor (¢2000) frees you from tiling solar — but it **burns minerals as fuel** (~0.6/s), so you need a Bot Bay mining or it goes dark; Cargo Exchange (¢1500) trades 60 ore every 20s at ×1.5 price; AI Core (¢2500) boosts the whole station.
- **Takeaway:** lodging income funds your first Lab; from there you research the species, economy and power scaling you want. Only the bare survival chain (sealed room → solar → O₂ → synth → bunk → dock) is free from the start.

## 13 · Storage & abundance (M32) — production is finite
Every resource has a **storage cap** (shown on the HUD chips as *x / cap*): biomass **400**, spores 250, each meal line **50**, minerals **200**. Production **idles at the cap** — vats stop growing, synths stop cooking, drones stop hauling once full.
- This keeps food a live decision: size production to your population, and **trade minerals** to keep room for more.
- Build a **Storage Silo** (¢70, 1×1; unlock *Cargo Logistics*) to raise **every** cap by **+250**.
- **Takeaway:** if a chip reads *400/400*, that production is wasted — consume it, sell it, or build Silos.

## 14 · Station incidents (M29) — pressure that tests your layout
After the first couple of minutes, the station faces periodic **incidents** (announced by a toast; they escalate slightly over time):
- **Power surge** — a random *non-life-support* module trips offline for ~20s. Battery headroom and not over-packing one wing help you ride it out.
- **Hull breach** — a wall blows out (marked by a blinking red ❌) and the room starts venting. **Crew treat it as an emergency**: a resident drops what they're doing, rushes over, and reseals the wall — but the emergency repair **costs ¢120**. You can also wall it yourself for the normal ¢3 if you're faster. *Only happens once you have 2+ rooms*, so a beginner's single room is safe.
- **Market shock** — mineral prices **surge ×2** (sell now!) or **crash ×0.5** (hold) for ~40s.
- **Raider** — a hostile ship (red ring) parks at your dock and **chews through modules** (never life support). A **powered Turret** (unlock *Station Security*) shoots it down on sight; otherwise crew must repair the damage.
- **Life support is never targeted** by incidents — suffocation only ever comes from *your* power/zoning mistakes. Incidents threaten your economy, production and defenses, not a guaranteed wipe.

## 15 · The Sector Beacon — how you win
The finale (the last objective) is **bringing the Sector Beacon online**, which means building and charging **one signature module per species**. Each is **researched** (Tier 4 tech), **only operates while its species is aboard in its room**, gives a **perk no other species provides**, and **charges 0→100%** while running. Charge all five to win.

| Module *(research)* | Species needed | Unique perk while operating | 
|---|---|---|
| **Command Hub** | a **Human** in its room | station-wide **mood lift** (+8) |
| **Trade Nexus** | a **Drenn** aboard | **+50% trade income** |
| **Auto-Forge** | a **Thol** in its room | passively **repairs every module** station-wide |
| **Bloom Garden** | a **Vry'l** in its room | **+50% food production** |
| **Ore Refinery** | a **Korro** in its room | **+50% mining yield** |

- Each module charges at ~2%/s **only when powered and its species is present** — hover/Select it to see its charge and whether it's "charging" or "needs a {species}". Charge persists once gained.
- This forces you to host the **whole roster** — the methane Thol wing, the fungal Vry'l chain, the same-air Korro, and a steady flow of Drenn guests — and to research the full Tier-4 tree. The ultimate "architecture is politics" capstone.
- **Takeaway:** the Beacon is the reason to build everything else. Each species you struggled to host becomes a permanent perk *and* a step toward the win.

## Recommended build order (a clean opening)
1. **Floor** a small box and **Wall** it shut (watch it turn "sealed").
2. **Solar Panel** ×2 along the **outside** of the hull walls (each takes 3 tiles into space) → **O₂ Generator** inside the room (air goes cyan).
3. **Rations Synth** + **Crew Quarters** in the room — the Synth turns your starting biomass into meals; the bunk is a home for one resident.
4. **Docking Port** on a **hull wall** (airlock to space). With air + food + a bunk + a powered dock, a **shuttle brings your first Human** within ~12s. Add more Crew Quarters to grow the crew.
5. **Bio Vat** before the starting biomass runs low, so food stays self-sustaining.
6. **Battery** for power headroom.
7. **Bot Bay** near a natural **asteroid** → drone mines **minerals** (materials stockpile).
8. **Lounge** so crew (and guests) can relax — keeps mood up as the station grows.
9. **Hotel Rooms** (+ the dock you already have) → Drenn guests arrive by shuttle for lodging income; a **Trade Hub** lets **trader ships** buy your minerals for credits.
10. Want Thol money later? Build a **separate methane wing** (its own walls + Methane Gen + a bunk + Rations), **linked to the rest by a Door** so traffic flows but the gases never mix — Thol then immigrate to it.

---

## Common ways to die (and the fix)
- **Crew suffocate.** No power → O₂ gen off, or room not sealed, or wrong/mixed gas. Fix power/seal/zoning.
- **Brownout chain reaction.** Draw crept above supply; battery drained. Add solar/batteries; the Power overlay shows what's shedding.
- **Starvation / stalled synth.** Out of biomass — your **Bio Vats** can't keep up (or are unpowered). Add more vats, or check power.
- **Modules breaking down.** Machinery wore to 0 because you had too few **resident crew** to service it. Add **Crew Quarters** so more residents immigrate (visitors don't work), or build fewer machines per crew.
- **No crew arriving.** Check all four gates: a **powered Docking Port**, a **free Crew Quarters**, that bunk in **their breathable air**, and **meals of their food line in stock** (power a Synth).
- **No guests arriving.** You have no free **Hotel Room** (guest capacity), or the dock is unpowered.
- **Skirmish vents a wing.** You crowded a disliked pair or let mood crater. Separate them, raise mood; rebuild and reseal what was vented.

---

## Quick reference
| System | Key numbers |
|--------|-------------|
| Sim tick | 10 steps/s at 1× |
| Doors | walkable but block gas (airlock); connect wings without mixing atmospheres |
| Breath | suit protects first; once suit empty, −8%/s in wrong air; +15%/s in right air; death at 0 |
| Space suit | drains ~14%/s off native air (full ≈ 7s ≈ 28 tiles; turn back at ~30%), recharges ~40%/s in native air |
| Food / Rest / Fun | −1.5 / −1 / −0.4 %/s; seek at <40 / <35 / <40; recover +12 (rest) / +20 (lounge) %/s |
| Crew speed | ~4 tiles/s (A* on floor) |
| Upkeep | machinery wears ~0.6%/s; crew service below 60%, repair ~15%/s; breaks at 0. Residents only; ~1 crew / 6 modules |
| Power | Solar +10, **Fusion +150**, Battery 50; draws AI Core 10 / CH₄ 9 / O₂ 6 / Vat 6 / Lab 6 / Cargo Exchange 6 / Synth 5 / Dock 5 / Trade Hub 5 / Bay 4 / Lounge 4 / Turret 4 / Hotel 2 / Crew Quarters 1 / Light Fixture 1 (Silo 0) |
| Lighting | the interior is gently dimmed; powered **Light Fixtures** (¢30) and glowing modules cast warm light pools, and modules drop soft shadows away from the nearest light — visual only |
| Tech | Research at powered Labs — **higher tiers need MORE Labs**: Tier 1 (1 Lab) Battery/Lounge/Bot Bay/Trade Hub · Tier 2 (2 Labs) Silo/Fungal/Methane/Turret · Tier 3 (3 Labs) Fusion/Cargo Exchange/AI Core · Tier 4 (3 Labs) the 5 Beacon modules. Each tech shows its 🔬×N Lab requirement; locked tools show "???" |
| Storage caps | biomass 400 · spores 250 · meals 50/line · minerals 200; production idles at cap. Each Storage Silo +250 to all |
| Incidents | start ~120s in, ~every 75–90s (escalating): surge (module offline 20s) · breach (vents a room, 2+ rooms only; **crew auto-reseal for ¢120**) · market shock (×2/×0.5 for 40s) · raider (wrecks modules until a Turret kills it). Never hits life support |
| Food | Bio Vat: +3 biomass / 8s · Rations Synth: 2 biomass → 4 meals / 10s |
| Mining | minerals only; asteroids spawn naturally; drone cargo 10, speed ~6 tiles/s, richness 1000 |
| Footprints | battery/quarters/silo/turret/light 1×1, synth/hotel/lab 2×1, generators/vat/bay/lounge/trade-hub/fusion/cargo-exchange/ai-core 2×2, solar 1×3 (wall) |
| Objectives | grow to 3 crew → bank ¢3000 → host 4 resident species → **bring the Sector Beacon online** (charge all 5 species signature modules). Clear all to win. Defeat if the crew die and the station can't attract anyone (~20s grace) |
| Sector Beacon | 5 researched signature modules (one per species); each charges 0→100% only while powered + its species is in its room, and grants a unique perk (mood / trade / repair / food / mining). All 5 charged = victory |
| Crew arrival | resident shuttle ~every 12s while a Crew Quarters is free, the bunk is in their air, and their food line is stocked; capacity = Crew Quarters. Arrival shows a toast + a pulsing ring at the dock. Not hand-placed |
| Guests | Drenn arrive ~20s (≤ Hotel Room count), pay ~1.5¢/s, stay ~90s; rate scales with Drenn reputation |
| Trade | needs a powered Trade Hub; every ~30s buys ≤25 minerals at ~3¢ each |
| Credits | start ¢1000; builds cost (see COSTS.md); deconstruct refunds 50% |
| Relations | like +8 / dislike −8 / kin +4; proximity 4 tiles |
| Reputation | per-species 0–100, starts 50; requests give +10–15 / expiry −6–10; ≤2 active, new ~every 50s, 120s to fulfil; Drenn rep scales guest arrival rate |
| Upkeep | operating modules ~0.15¢/s each + resident wages ~0.2¢/s; net ¢/s shown by the credits chip. Idle stations bleed |
| Skirmish | tension rises fast when mood <30 near a disliked species, **or slow-burn (4/s) when sharing a tense room (harmony <−0.3) even if fed**; fights at 100. Separate rivals to stop it |

*Build for everyone's needs, and the politics take care of themselves.*
