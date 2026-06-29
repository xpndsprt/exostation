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
- **Right-drag** = pan · **mouse wheel** = zoom (snaps to discrete stops: **25 / 50 / 100 / 200 / 300%**, so pixel art stays crisp) · **Recenter** button snaps back to your station.
- **Overlay** buttons (top bar): **Power** (powered/unpowered modules) and **Rooms** (per-room tint). Atmosphere is always shown as a colored fill.
- **▦ grid toggle** (top bar, next to the speed buttons) shows/hides the cell grid — it's **off by default**.
- **🔊 / 🔇** (top bar) toggles **sound** (state is remembered). Audio starts on your first click/keypress. A **shuffled soundtrack** (from `assets/music/`) plays under the SFX at ~30% volume. A separate **🎵** button next to it toggles the **music only** (keeps SFX), also remembered.

**Your objective & the HUD**
- The **top bar** shows a 🎯 **scenario objective** with a progress bar — your current goal (e.g. *grow your crew → bank credits → host different species*). Clear them all to **win**; you can then keep building in free play.
- **Capacity chips:** 👥 **crew / Crew Quarters** and 🏨 **guests / Hotel Rooms** show population vs capacity at a glance (the crew chip turns red if you somehow exceed it). 🙂 is station-average mood.
- If your **whole crew dies and the station can no longer attract anyone** (no powered dock / no bunk in air / no food), you **lose** after a short grace period — a banner offers a fresh start.

**The left dock (tabbed)**
- The whole left panel has three tabs — **🔧 Build · 🔬 Research · 👽 Species** — click one to switch the view. Picking any build tool (incl. via hotkey) snaps you back to **Build**.

**Building**
- On the **Build** tab, pick a tool from the **palette** (each shows its **hotkey**). The **ghost preview** tints **green = placeable, red = blocked**; the cursor becomes **⊘** where you can't build.
- **Floor / Wall / Erase** support **drag-rectangle** — drag out a room and the label shows the size **and running ¢ cost** (red if you can't afford it). **Floor and Erase fill the whole rectangle; Wall traces only the perimeter** (a hollow box) — so you can drag one rectangle to wall a room without filling its interior with walls. Drag **Floor** first to lay the deck, then drag **Wall** around the same area.
- **Door** and modules place on a single click. **Modules have footprints** (e.g. generators/vats/bays/lounges are 2×2, the synth/hotel/lab 2×1, quarters/batteries/silo/turret 1×1) — the ghost shows the full footprint and turns red if it won't fit on clear floor. The **Solar** ghost marks its **wall-mounted base** so you can see which way it faces before placing.
- **Find your modules:** **double-click a build tool** in the palette to pan-cycle the camera through every instance you've placed (and select each).
- **You don't place crew.** There is no "add a Human" tool — residents **immigrate by shuttle** once their living conditions are ready (see *Crew* below). You only ever build the *environment*.
- **Everything costs credits.** Each build button shows its price (¢); the ghost turns red and the cursor blocks if you can't afford it. You start with **¢1000**. **Deconstructing** a module (Select → Deconstruct) refunds **50%**. Full price list: [`COSTS.md`](COSTS.md).

**Inspecting**
- **Hover** anything for a quick tooltip (no click). **Hover a crew member** to see the **mood breakdown** — *base 50 · needs ± · neighbors ± · room ±* → the value their mood is pulled toward. **Hover a room tile** to read its **harmony value and production multiplier** (e.g. *tense −0.53 → ×0.6 production*), so you can see exactly what a bad pairing costs.
- **Click any module or crew member to open its options** — the **info panel** with live stats and **Deconstruct / toggle / Switch recipe / 🛰 Star Chart** buttons. This works with **any tool except Erase** (the cursor turns into a pointer over a clickable module), so you don't have to switch tools to manage things. The **Select** tool (S) still works and clicking empty space with it deselects.
- **Erase is the exception:** with the **Erase** tool, clicking a module **deletes it** (no options panel) — and refunds 50%. Resuming any build/erase also closes the inspector.

**Time & saving**
- **Pause / 1× / 2× / 3×** (`Space` pause, `[` / `]` slower/faster).
- **Saves** (top bar) opens a panel with an **Autosave slot + 3 named slots** — each with **Save / Load / Delete** and a timestamp. The game **autosaves every 30s**; a manual save flashes **Saved ✓**. The same panel has **↻ New Station** to wipe the live station and start over (with a confirm).
- **Portable saves**: the Saves panel also has **⬇ Export to file** (downloads the current station as an `exostation-*.json` file) and **⬆ Import from file** (loads a station from such a file, replacing the live one). Use these to back up, move a station between machines/browsers, or share one. Saves store **only entity data** (crew, modules, drones, credits, story…), never the artwork, so a station keeps working even if the sprites change.
- **Intro briefing:** every time the game starts (and on **New Station**) a pop-up explains the win goal (the **Sector Beacon**), gas zoning, and the species political web. Dismiss with **Begin**.
- **Star Chart shortcut:** press **K** to open the orbital mining chart from anywhere (uses your first Bot Bay; with none, it just shows the system map).

**First run**
- A **Getting Started** checklist appears top-center on a fresh game and ticks off as you *seal → power → add O₂ → synth → quarters → dock*. It disappears once your first crew arrive (or hit **Skip**).

**Species (Alienpedia) + Advisor**
- **First contact:** the very first time a species ever appears on your station, the game **pauses and shows a portrait + backstory card** for them. Dismiss with **Continue** (multiple new arrivals queue up). Afterwards they live in the Alienpedia.
- **The campaign (story transmissions):** a story spine runs through the game as **paused dialog boxes** (dismiss with **Continue**), firing at key milestones — your arrival briefing, first breath, first crew, each objective cleared, the five **Beacon signatures**, and the **Beacon finale**. Each box shows **who's speaking**: the Emperor's **COMMAND** emblem narrates the throughline, and when you raise each Beacon signature the **species that built it speaks**, with its portrait. It threads the whole arc from the empty void to lighting the Sector Beacon. Progress is saved, so the story never repeats.
- The **Alienpedia** lives under the **👽 Species** tab (left dock) — a reference card for **every species that has visited**: what they breathe, eat, their combat power, who they like/dislike, role, and how many are aboard. **Click an entry** (when that species is aboard) to **jump the camera to them and ring them**; it also shows their **live count and average mood**.
- The **Advisor** (bottom-centre) shows your **current goal** (the 🎯 progress bar, at the top of the panel) and your **next logical steps**, most urgent first (red = critical danger, amber = should-do, green = tip). When in doubt, do what the top red/amber item says.

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
- The network's **energy budget** is station-wide: `net = supply − draw`. Surplus charges the battery; deficit drains it.
- When the battery is empty and draw still exceeds supply → **BROWNOUT** (red banner). Modules are **shed by priority, life support last**: pods/docks/bays go dark before generators.
- **Power must be wired (M-conduit).** Supply alone isn't enough — **a module is dark unless it's cabled to a source.** A **Solar Panel** adds a **socket** on the wall it's bolted to (a gold tap on the deck just inside); **Battery** and **Reactor** feed the tiles right at them. From a socket/source you run **Power Conduit** (Build menu, key **U**, **¢1/tile**, drag to lay; it can cross **doorways**) to each module — only modules **touching a source or an energized conduit** get power. Conduits **wear and break** (hp 0 = a red sparking gap that stops conducting); **crew repair** broken runs automatically, so long networks add repair load.
- **Takeaway:** keep solar above your total draw, add batteries for spikes, and **run a conduit line from each solar's socket to every module** — a sealed room with a panel powers nothing until it's wired. Use the **Power overlay** to spot anything unpowered.

---

## 4 · Atmosphere & gases (M3, M9) — the core puzzle
- An **Atmosphere Generator** fills its **enclosed** room with one gas while powered. **Five breathable gases** (each its own sealed wing + species):
  - **O₂ Generator** → oxygen (cyan) — Humans, Drenn, Vry'l, Korro.
  - **Methane Generator** → CH₄ (orange) — Thol, Vorn.
  - **Chlorine / Ammonia / Hydrogen Generators** (research-gated) → Cl₂ (green) / NH₃ (blue) / H₂ (magenta) — the Tier-3 **Chlorithe / Naaz / Voltaar**.
- **A room with two *different* gas generators becomes "mixed" (red) and is lethal to everyone.** Keep each gas in its own room.
- No power or not enclosed → **no air** (vacuum).

#### Tier-3 gas hazards (Cl₂ corrosive · H₂ explosive)
- **Chlorine (Cl₂) is corrosive.** Active machinery sitting in a Cl₂ room **wears out far faster** (−0.5 condition/s on top of normal wear; life-support gens are spared). A Chlorithe wing needs **crew on hand to service it** or modules degrade and break — keep a resident or an Auto-Forge nearby.
- **Hydrogen (H₂) is explosive.** Put an **H₂ and an O₂ generator in the *same* room** and it **detonates**: the blast wrecks the room's modules, **destroys the offending generators**, **wounds everyone present**, and **blows a hull breach**. Never mix hydrogen with oxygen in one room — keep the Voltaar's wing well clear of your O₂ rooms (a door-separated wing is safe; sharing a *room* is not).
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
2. A **Crew Quarters prepped for that species** — lodging is now **split per species** in the Build menu: **Crew Quarters** has a button per **resident** race and **Hotel Rooms** a button per **visitor** race (place the one you want; you can still Select a bunk → **Reassign species**). Note **Drenn & Vorn never reside** — they only ever arrive as **guests**, so they appear under **Hotel Rooms**, not Crew Quarters. The **first four races — Human, Drenn, Thol, Vry'l — are free to prep from the start**; every **later species needs its host research first** (Robotics for Korro, Methane for Vorn, Chlorine for Chlorithe, Ammonia for Naaz, Hydrogen for Voltaar, Exobiology for Sszra) — their lodging buttons show a 🔒 until then.
3. A bunk sitting in **breathable air for that species** (an O₂ room for Humans/Vry'l, a CH₄ room for Thol, etc.).
4. **Food they can eat is in stock** (Rations for Humans/Thol/Korro, Fungal Mash for Vry'l, Exo-Culture/Live-Protein for the exotic crews) — so power a Synth first; the shuttle waits until meals are ready.

A shuttle then drops one resident roughly every **12s** while a bunk is free. **Build another Crew Quarters and a new resident shows up** to fill it. When more than one species qualifies (e.g. you run both an O₂ + Rations chain and an O₂ + Fungal chain), the station favors **whoever has the fewest aboard**, nudging you toward a diverse crew. *Drenn never reside — they only visit as guests (see §8).*

Each crew member tracks four meters (see them in the info panel; a mood dot floats over their head):
- **O₂ / breath** — from atmosphere (above).
- **Food** — decays ~**1.5%/s**; when **< 40** they path to a **Rations Synth** and eat a meal (refills to full).
- **Rest** — decays ~**1%/s**; when **< 35** they sleep (recover ~**12%/s**) to full, then release the bunk. **Crew sleep in Crew Quarters; visitors sleep in Hotel Rooms** — separate accommodations.
- **Fun** — decays ~**0.4%/s**; when **< 40** they head to a **Lounge** to relax (recover ~**20%/s**). Both crew and visitors use lounges — see *Entertainment* below.
- **Relief (bathroom)** — decays ~**0.7%/s**; when **< 35** crew **and** guests path to the nearest **Lavatory** (¢25, 1×1, **no research**, usable by every species in breathable air). If none is reachable and relief hits **0**, they **soil the deck** — a brown **mess** that **drags mood (−4 each nearby, down to −20)** until a resident **scrubs it** (~2s). Each toilet **use dirties the fixture** (−7 condition); like any machine, crew **service** it back up (it shows the amber wear bar). **Takeaway:** lay a Lavatory or two early — cheap, no research, and a station with no toilets quickly turns into a filthy, miserable one.
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
- **Residents (crew) service it — but only faults they can SEE.** Each crew member has a **personal eyesight range** (a 2–5-tile spec; some are short-sighted, some sharp-eyed — shown in their info panel, with a faint **vision cone** on the map). They only take a **service job** for a worn module (condition below 60%) that's **within their sight and roughly in front of them**. If they can't see any fault, they **patrol** — roaming their wing, sweeping that cone around — until one comes into view, then walk to it and repair it (~15%/s) back to full. With nothing wrong, idle crew simply stand. A small **orange bar** shows a module's upkeep; the info panel shows **Condition** and "being serviced".
- **Takeaway:** eyesight matters — a wing full of short-sighted crew is slower to notice a failing machine. Don't sprawl your machinery so far that a fault can fester unseen; keep crew patrolling near what matters.
- **If condition hits 0 the module breaks** — it goes dark (unpowered) and stops working until a crew member repairs it. A broken O₂ generator means a wing starts losing air, so **keep enough crew to cover your machinery** (rough rule: one resident per ~6 modules).
- **Visitors never work.** Guests (traders/Drenn) only use **hotel accommodations** — they eat, sleep in a pod, pay lodging, and leave. All upkeep falls on residents.
- **Hover any module** to see its **Condition** on the rollover tooltip (and full details via the Select tool).
- **Takeaway:** every machine you add is also upkeep. Grow your resident crew alongside your station, or things start breaking down.

## 6 · Food production — grown on-station, four food lines
Food is a two-step, **power-driven** loop, and modules have **selectable recipes** (Select → Switch recipe):
- A **Bio Vat** grows a base resource from power — **Biomass** (default), **Spores**, or **Microbes** — **+3 every 8s** (🌱 shows biomass · spores · microbes).
- A **Rations Synth** converts a base into a food line — **Rations** (biomass), **Fungal Mash** (spores), **Live-Protein** (microbes) or **Exo-Culture** (microbes) — **2 → 4 meals every 10s** (🍱 shows rations/fungal, plus protein/exotic when stocked).
- **Each species eats its own line:**
  - Humans / Drenn / Thol / Korro / Vorn → **Rations** (Biomass).
  - **Vry'l** → **Fungal Mash** (Spores; needs **Fungal Synthesis**).
  - **Sszra** (O₂ carnivore) → **Live-Protein** (Microbes; needs **Exobiology**).
  - **Chlorithe / Naaz / Voltaar** (the exotic-gas crews) → **Exo-Culture** (Microbes; needs **Exobiology**).
- So the exotic crews are a **two-front challenge**: a sealed gas wing *and* a Microbes→Exo-Culture/Live-Protein food chain. Spores/Fungal need **Fungal Synthesis**; Microbes/Live-Protein/Exo-Culture need **Exobiology**.
- The station starts with a **generous biomass reserve (300)**, so a Rations Synth alone feeds your starting crew for a long while — build **Bio Vats** before it runs low.
- **Crew physically haul the goods now.** A Bio Vat's output **piles up in an on-vat buffer** (up to **9**); a **resident carries it to a Storage Floor** (or, until you build one, to any free cell in the vat's room). **If no one hauls it and the buffer fills, the vat stalls** — so growth needs both crew and somewhere to put the harvest. Crew also **fetch feedstock from storage to the Synth** when storage exists (you'll see them carrying a coloured crate). *Bootstrap:* with no resident crew yet, vat **and synth** output trickles straight to the warehouse so the opening still works.
- **Food only stockpiles if you have storage.** A **Rations Synth cooks meals into its own buffer** (up to **9**, like a Vat). What happens next depends on storage:
  - **With a Storage Floor:** crew **haul cooked meals into storage** — you'll see the **meal crates fill** on the floor — building a real food reserve that buffers you through a Synth outage and lets you **attract more crew** (immigration needs banked food).
  - **With no storage:** there's nowhere to bank meals, so crew just **walk to the Synth and eat fresh off the cooker** — hand-to-mouth. You survive, but you can't build a reserve or grow your crew until you lay storage.
  - **With a Mess Table:** crew **carry meals from storage to the table** and eat seated there (guests too). Tables stock **from storage**, so they need a banked supply — no storage, no table service (crew fall back to the Synth).
- **Storage Floor** (¢3/tile, **Build** tab): an **airless** deck — only a **Light Fixture** can sit on it — and it **raises your meal & mineral caps** *and* is what lets food (and ore, and water) actually be stockpiled. **Mess Table** (¢50, 3×3, **Modules**): crew **and guests eat at the seats around it**. Neither needs research. *(If no table is stocked, crew fall back to eating at the Synth, so nobody starves.)*
- **Takeaway:** build **at least one Bio Vat per Synth**, lay some **Storage Floor** (without it food can't be banked and your crew can't grow), and keep enough **crew** to haul. If meals stall, check power, the vat's haul (is its buffer backed up?), and that there's storage to carry to.

---

## 7 · Mining (minerals) — the Star Chart & orbital dispatch
- There are **no asteroids on the station map**. Mining happens **out in the star system**. Build a **Bot Bay** — it's **hull-mounted like a Docking Port**: place it on a **space-facing wall** (it takes **1×2** — the wall cell + the floor behind it) so its drone can launch straight out. Each comes with **one drone**. **Click it** (any tool but Erase) and hit **🛰 Star Chart** to open the orbital map.
- **Drones need somewhere to put the cargo.** A bay's drone **won't launch at all until you have storage** — a **Storage Floor** tile or a **Storage Silo**. With no warehouse the drone just sits docked (the Advisor nags you). Lay a little Storage Floor near the bay and trips start running. *(Stored goods are now visible: ore as grey crates, biomass green, meals amber, water in a blue tank — stacked by how full each store is — and you'll watch crew carry a coloured crate when they haul.)*
- **The Star Chart** shows your **star — sometimes a binary pair —** at the centre, your **station on its orbit** (the green marker), and a system of **planets (some with their own moons), an asteroid belt, and scattered rocks**, all **slowly orbiting** the star. Bodies start as **unknown contacts (`?`)** — you don't know their yield until a drone visits.
- **Click a body, then "Dispatch / Survey"** to send that bay's drone. It **lifts off the pad, flies off-map, and returns some time later** with minerals. **The first trip both surveys it (revealing yield + remaining units) and delivers that first haul** — every trip pays off.
- **Distance = time vs reward.** Near **asteroids** are quick (~25s round trip) with **modest hauls**; far **planets** are slow (~70s) but bring **big hauls**; **moons** ride along with their planet. Bodies hold **various levels of minerals** — the chart labels each **Lean → Moderate → Ore-rich → Mineral-rich** (far planets richest). The drone keeps re-running trips to the assigned target on its own until that body is **depleted** (each has finite richness), then idles — open the chart and pick a fresh target.
- **Every trip risks the drone.** Deep-space hazards (micrometeoroids, flares, pirates) can destroy it mid-run — **~2% near, rising to ~8% on the farthest bodies** (the chart shows each target's loss risk). Lose a drone and its **Bay fabricates a replacement for ¢300**, ready ~18s later **once you can afford the fee** — so push far targets only when your treasury can absorb the occasional loss.
- **Ore is hauled now.** Returning drones drop their ore **at the Bay**; a **resident carries it to storage** (warehouse). And **when a Trade Hub sells, crew carry minerals from storage to the Hub** first — so you'll see ore physically moving. As with food, with no crew yet it trickles through automatically; once crewed, you need haulers (and storage) to keep ore flowing to market.
- **More bays = more drones** working in parallel (each dispatched from its own chart). The **Korro Hauler** trait adds **+50%** to every haul; an **AI Core / Industrialist doctrine / Ore Refinery beacon** stack on top.
- **Takeaway:** mining is **not tied to food** — it builds your **minerals** stockpile (trade, fuel, Fusion). Send a cheap first drone to **survey** nearby asteroids, then commit drones to the richest finds; push out to planets once you can afford the long trips.

---

## 8 · Guests, trade & economy — the hotel and the market
- A **Docking Port** is a **hull airlock**: place it **on a wall that faces space** (interior floor one side, open space the other). The ghost goes red anywhere that isn't a valid hull wall.
- **Two kinds of arrival share the dock:** **resident crew** (gated by **Crew Quarters**, see §5) and **paying guests** (gated by **Hotel Rooms**). A powered dock projects a **3×3 landing pad** out into space (blinking guide lights); a **shuttle flies in from off-screen**, decelerates, settles onto the pad, and **stays docked the whole visit** before lifting off again. Trader ships use the same pad. **Only one ship uses a pad at a time** — while it's occupied, the next arrival simply waits until it lifts off (build a second dock to land two at once).
- **Guests:** the dock periodically (~20s) sends a shuttle of visitors — **up to 3 at a time (more from bigger docks), capped by your free Hotel Rooms prepped for that visitor species** (each Hotel Room is assigned to one species — Select → **Reassign species**; only that species lodges there). **Drenn is free to prep; other visitor species (Human/Vry'l/Vorn/Thol) need their research.** A shuttle carries only as many as you can house, and they disembark when it lands. Guests enter the interior, use the hotel (eat, sleep, relax), **pay lodging (~1.5¢/s)**, and **depart after ~90s** (gold ring; they never work). Higher **Drenn reputation** makes them arrive more often.
- **A trader class per gas:** guests need a hotel **in their own breathable gas**, and each gas has its own visitor species. An **O₂** Hotel Room draws **Drenn** (and a Human/Vry'l mix at bigger docks); a **CH₄** Hotel Room draws **Vorn**, the methane merchants. So building a **methane wing with its own Hotel Room** opens a *second* lodging stream — and a Vorn aboard makes every ship pay **+50% for fuel**. Put a dock near each wing so guests don't trek across the wrong air.
- **Bigger berths (Large & Spaceport Docks):** research **Expanded Docking** then **Spaceport** to build larger docks. They place exactly like a standard dock (one hull-wall airlock) but project a **5×5** / **7×7** pad and land progressively **bigger ships** that disembark **more guests per visit** (3 → 6 → 10) **and a wider species mix** (large/spaceport berths bring Drenn + Human + Vry'l tourists, not just Drenn) — and crucially **buy far more fuel** (see below). Guests are still capped by your free Hotel Rooms.
- **Fuel for sale (refueling income):** research **Fuel Refining** (a cheap **root** tech) and build a **Fuel Refinery** — it **cracks minerals into fuel** (2 minerals → 3 fuel every ~6s; needs a **Bot Bay** mining to feed it). **Every ship that docks buys fuel on landing at ~4¢/unit** — **6 / 18 / 40** units for a standard / large / spaceport dock. So a Spaceport + stocked refineries turns each arrival into a big cash drop (~¢160). Fuel shows on the **⛽ chip**; out of fuel, ships just don't refuel (no income, but they still bring guests).
- **Trade:** build a **Trade Hub** (your trading station) and every ~30s **traders buy your minerals** (up to 25 at ~3¢ each), converting mining output into credits. A green **trader ship** parks at a dock if you have one. No Trade Hub = no mineral sales. So the materials loop closes: dispatch drones → minerals → Trade Hub → credits.
- **Founding charter subsidy (your first income):** before you have any hotels or trade, just **keeping crew alive earns credits**. The crew's home federations pay a small retainer of **~0.5¢/s per certified resident** (alive and **breathing well — O₂ above 50%**), counting up to **5 crew** (≈ **2.5¢/s** at the cap). It's enough to keep a small, well-run starter station **in the black** so you can save toward your first Bot Bay / Hotel / Trade Hub. The cap means it **fades to irrelevance** once you grow — and crew who start to suffocate stop earning it, so it genuinely rewards good life support.
- **Running costs (M37):** the station also has **upkeep** — every operating module costs **~0.15¢/s** and every resident draws a **wage of ~0.2¢/s**. The credit chip shows your **net ¢/s** next to the balance (red when negative). A *tiny* station roughly breaks even on the subsidy alone, but as you add modules upkeep outgrows it and only an active economy (lodging + trade + fuel) stays in the black. Watch the net rate — if it's red, you're shrinking.
- **Takeaway:** Hotel Rooms + a dock drive lodging; mining + a **Trade Hub** drive trade; **minerals → Fuel Refinery → fuel → bigger docks** is a third income stream that rewards scaling your berths. Keep net income positive, then spend the surplus on expansion and **research**; deconstruct for a 50% refund.

### Water — comet ice for your advanced wing (late game)
- **Water only matters once you research Water Reclamation (¢350, 2 Labs)** — until then it doesn't exist. Researching it puts **two ICE comets** in the Star Chart as **drone targets** (kind *comet*, icy-blue).
- **Send a Bot Bay drone to a comet** like any mining trip — it returns **~26–30 water** (piped straight to the tanks, **not** hauled). Comets are far + eccentric, so the trips are long.
- Water shows on the **💧 chip** (turns red at 0). **Storage Floors + Silos** raise the cap (base **80**).
- **What uses it:** only **advanced modules** — anything that needed **2+ research Labs** (exotic gens, Climate units, Turret, Cargo Exchange, Fusion, AI Core, the Beacon modules…). They draw **0.04 water/s** each while running.
  - **With water → they run COOL: ½ the normal wear** (coolant prolongs them — far less servicing).
  - **Out of water → they OVERHEAT: 3× wear** — they break fast and your crew can't keep up.
- **Takeaway:** once you go high-tech, keep a comet drone running so your advanced wing stays cool. Letting the tank hit 0 is worse than never researching it.

---

## 9 · The species (who you're hosting)
| Species | Breathes | Likes / Dislikes | Combat power | Notes |
|---------|----------|------------------|:-----------:|-------|
| **Human** | O₂ | **loves Drenn** · dislikes Thol · **HATES Korro** | 20 | Rations diet. Your first residents — an O₂ room + Rations + a bunk + a dock brings them. |
| **Drenn** | O₂ | **loves Humans** · likes everyone | 18 | Rations diet. The universal diplomat — easy guests, great social glue. |
| **Thol** | **CH₄ (methane)** | **loves Vry'l** · likes Drenn · dislikes Korro · neutral to humans | **35** | Rations diet, but need a sealed methane wing; strong in a fight. A Thol+Vry'l wing is a happy, productive pairing. |
| **Vry'l** | O₂ | **loves Thol** · likes Drenn · **HATES Korro** · neutral to humans | 22 | **Fungal Mash diet** — same air as humans, but need a Spore vat + a Synth set to Fungal. |
| **Korro** | O₂ | **HATED by Humans & Vry'l** (mutual) · disliked by Thol · neutral to Drenn | **25** | Rations diet, **shares humans' air** — the pariah you can't separate by gas alone. Needs its own O₂ wing (+ Door). Strong haulers (see traits). |
| **Vorn** | **CH₄ (methane)** | likes everyone · neutral to Korro | 16 | **Visitor only** (never resides) — the **methane Drenn**. Needs a sealed CH₄ wing with a **CH₄ Hotel Room** to lodge. *Fuel Baron:* docking ships pay **+50% for fuel** while a Vorn is aboard. Give your methane builds their own paying guests. |
| **Chlorithe** | **Cl₂ (chlorine)** | likes Thol & **loves Naaz** · dislikes Vry'l/Voltaar | 28 | **Tier-3 resident.** Crystalline; eats **Exo-Culture**. Needs a fully sealed **Cl₂ wing** (Chlorine Gen) — whose air **corrodes machinery**, so keep crew servicing it. |
| **Naaz** | **NH₃ (ammonia)** | **likes everyone, dislikes no one** (loves Vry'l & Chlorithe) | 12 | **Tier-3 resident** & station peacemaker. Eats **Exo-Culture**. Needs a sealed **NH₃ wing** (Ammonia Gen) kept **cold** (a Cryo Unit). Great social glue across a mixed crew. |
| **Voltaar** | **H₂ (hydrogen)** | aloof · dislikes Thol & Chlorithe | 30 | **Tier-3 resident** energy-being. Eats **Exo-Culture**. Needs a sealed **H₂ wing** (Hydrogen Gen) kept **hot** (a Heater) and **never sharing a room with O₂** (it detonates). Strong but standoffish. |
| **Sszra** | O₂ | respects **Korro** · unnerves Humans & Vry'l (mutual) | **32** | **Resident** reptilian sentinel. **Obligate carnivore — eats only Live-Protein** (Microbes → Synth). Shares humans' air (no gas-zoning them out), so house them apart from those who flinch at them. |

Humans, Drenn, and Vry'l all breathe O₂ and co-house freely, **but Vry'l eat a different food** (Fungal Mash). **Thol must be kept in their own methane wing** — and humans resent them. **Korro are the twist:** they breathe the *same* O₂ as your humans and eat the *same* Rations, so you **can't keep them apart with gas zoning** — you must give them their **own O₂ wing** (separate room, linked by a Door) or the shared room turns tense. **Sszra** are a second same-air case: O₂ breathers who eat only **Live-Protein**, so they need their own wing both for peace *and* a dedicated carnivore food line.

### 9a · Climate — heat & cold (Heater / Cryo Unit)
Every enclosed room has a **climate band**: **temperate** by default, **hot** with a powered **Heater**, **cold** with a powered **Cryo Unit** (a Heater and Cryo in one room cancel back to temperate). A crew member in a room of the **wrong band for their species takes a −10 mood hit** (not lethal — comfort, not survival). It only matters for two crews:
- **Voltaar** want **hot** → put a **Heater** (¢130) in their H₂ wing.
- **Naaz** want **cold** → put a **Cryo Unit** (¢170) in their NH₃ wing.
Everyone else is happy at temperate, so you only build climate once you start hosting Voltaar or Naaz. Both need **Climate Control** research. Hover a crew member to see the **climate** term in their mood breakdown.

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
Every species you've hosted holds a **reputation** of your station (0–100, starts at **50**), shown as a bar in the **Alienpedia**. It rises and falls through **requests** — short goals each species posts in the **📋 REQUESTS** panel (bottom-right):
- **Host *N* of us aboard** — have at least N of that species on the station.
- **Keep us content** — get that species' average mood to **≥ 60**.
- **Build us a Lounge** — have a Lounge (rec module) somewhere on the station.
Each request shows its **reward (credits)**, **rep gain**, and a **countdown** (you have **120 s**). Fulfil it in time → credits + reputation. Let it **expire** → you lose reputation with that species. Up to **2** are active at once, a new one every **~50 s**.
- **Why it matters:** Drenn reputation drives **how often guests arrive** — high Drenn rep means a busier, more profitable hotel; low rep slows arrivals. Build reputation early with the cheap "host"/"Lounge" requests.

---

## 10 · The political web (M10 / M42) — mood from neighbors
- Every species holds an **opinion** of every other (asymmetric). Living within ~**4 tiles** of another crew member applies a mood delta. **Two strength tiers each way (M42):**
  - **Love ≈ +15**, **Like ≈ +8**, same-species ≈ +4, **Dislike ≈ −8**, **Hate ≈ −15**.
- **Mood = needs satisfaction + summed neighbor opinions** (clamped at ±45). Neighbors now matter **as much as needs** — two haters next door can crater a fed crew member. The **mood dot** over each head is green → yellow → red; the 🙂 chip shows station average.
- The relations that drive layout: **Humans ⇄ Korro HATE** and **Vry'l ⇄ Korro HATE** (so the same-air Korro must get its **own O₂ wing**), **Thol ⇄ Vry'l LOVE** and **Humans ⇄ Drenn LOVE** (productive, happy pairings), and **Drenn** like everyone — the perfect glue/buffer.
- **Takeaway:** place lovers together and keep haters apart — even across a wall, proximity counts. Drenn between two rivals soften the blow. A well-laid-out station keeps everyone in the green on its own; a careless one full of haters falls into skirmishes fast.

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

## 11b · Encounters, injuries & the Med Bay
- **Social encounters:** every so often, when two crew/guests of different species share a cell, a moment flares up — a **clash** (if they dislike each other) or a **bond** (if they get on). **The game pauses and you choose how to respond.** The flavor text is drawn from a **library of 50+ species-specific lines** (Human↔Korro, Vry'l↔Korro, Thol↔Vry'l, the Drenn/Vorn diplomats, etc.), so encounters read distinctly rather than repeating.
  - **Clash choices:** *Defuse it* (usually safe, small morale lift — slight chance it still goes wrong), *Discipline both* (no fight but both resent it), or *Let them settle it* (a gamble — they may brawl and get **wounded**, or back down with new respect). A bad/unlucky call **injures** someone.
  - **Bond choices:** *Encourage it* (both cheer, reputation up), *Put them to work* (small morale + a little income), or *Throw a party* (¢60 → lifts the **whole crew's** morale).
  - **Deals (🤝):** a friendly pair sometimes brings a **proposal about real station life** — a Lounge upgrade, a salvage run, a side hustle, a feast. **Backing it either costs or *pays* credits** (the button shows which) and lifts mood + reputation; turning them down sours them. (~16 varieties.)
  - **Complaints (🔧):** a crew member gripes that a **specific module** is acting up (rattling, sparking, overheating…). **Authorize the repair** (−¢, services that module to full) or **brush it off** (they sour, and there's a real chance the module **breaks down**). (~16 varieties, naming the actual module.)
- **Risky repairs:** servicing a **high-tier module** (anything that needed **2+ research Labs** — Turret, Fusion, Cargo Exchange, AI Core, the Beacon modules, etc.) can **injure** the crew member doing it. **Thol engineers** are far safer at it.
- **Injuries:** a wounded crew member (red status) is **bleeding out**. With **no Med Bay they slowly die**; build one and they recover.
- **Med Bay** (¢240, 2×2; research **Medicine** — 1 Lab): while powered it **heals every wounded crew member** on the station (no need to walk there). Build it *before* you start hosting rival species or repairing big modules.
- **Takeaway:** the more species and the bigger your machines, the more you need a Med Bay. Respond to clashes calmly, and keep a doctor in the house.

---

## 12 · Research & tech (M30) — where your credits go
Banked credits aren't just a score — they buy **tech unlocks** that gate most of the catalog. Build a **Research Lab** (¢150, 2×1), keep it **powered**, and the 🔬 **Research** tab (left dock) lets you spend **credits** on upgrades. Locked build tools show **"???"** in the palette (hover for the requirement) and **light up** when you research them. **Higher tiers require more powered Labs** — each tech shows its **🔬×N** Lab requirement, so you build several Labs to climb the tree.
- **Tier 1 — 1 Lab (cheap):** Energy Storage (¢100 → Battery) · Recreation (¢120 → Lounge) · Robotics (¢150 → Bot Bay) · Commerce (¢150 → Trade Hub) · **Fuel Refining (¢150 → Fuel Refinery)** · **Medicine (¢200 → Med Bay)**.
- **Tier 2 — 2 Labs:** Cargo Logistics (¢250 → Silo) · Fungal Synthesis (¢300 → Vry'l food) · **Climate Control (¢300 → Heater + Cryo Unit)** · **Exobiology (¢350 → Microbes/Live-Protein/Exo-Culture recipes for Sszra + exotic crews)** · Methane Life-Support (¢350 → Thol wing) · **Chlorine / Ammonia / Hydrogen Life-Support (¢400/450/500 → Cl₂/NH₃/H₂ wings for Chlorithe/Naaz/Voltaar)** · Station Security (¢500 → Turret) · **Expanded Docking (¢350 → Large Dock; *needs Fuel Refining*)** · **Water Reclamation (¢350 → harvest ice from comets; advanced modules run on water — see *Water* below)**.
- **Tier 3 — 3 Labs (big-ticket):** Fusion Power (¢600 → Fusion Reactor; *needs Robotics*) · Bulk Trade (¢600 → Cargo Exchange; *needs Commerce*) · Cybernetics (¢800 → AI Core; *needs Cargo Logistics*) · **Spaceport (¢700 → Spaceport Dock; *needs Expanded Docking*)**.
- **Tier 4 — 3 Labs (the win):** the five **Beacon** signature modules (¢700 each) — see *The Sector Beacon* below.
- **Doctrine fork — 2 Labs, pick ONE (M40):** a permanent **station specialization** — choosing one **locks the other two for the rest of the run**, so credits can't buy everything. Each needs a Tier-1 prerequisite:
  - **Industrialist Doctrine** (¢400; needs Robotics) — **+15% mining, food & repair** station-wide.
  - **Hospitality Doctrine** (¢400; needs Commerce) — guests pay **+50% lodging** and arrive **~30% faster**.
  - **Garrison Doctrine** (¢400; needs Station Security) — raiders deal **half damage** and **can never reach life support**.
- **Prerequisites & locks** show in the TECH panel: a node greys out with *"Needs …"* until its prerequisite is owned, and a doctrine you didn't pick reads *"Locked — chose …"*.
- **Big modules to spend thousands on:** Fusion Reactor (¢2000) frees you from tiling solar — but it **burns minerals as fuel** (~0.6/s), so you need a Bot Bay mining or it goes dark; Cargo Exchange (¢1500) trades 60 ore every 20s at ×1.5 price; AI Core (¢2500) boosts the whole station.
- **Takeaway:** lodging income funds your first Lab; from there you research the species, economy and power scaling you want. Only the bare survival chain (sealed room → solar → O₂ → synth → bunk → dock) is free from the start.

## 13 · Storage, abundance & overflow (M32 / M41) — production is finite *and* costs you
Every resource has a **storage cap** (shown on the HUD chips as *x / cap*): biomass **400**, spores 250, each meal line **50**, minerals **200**, fuel **120**. Production **idles at the cap** — vats stop growing, synths stop cooking, drones stop hauling, refineries stop cracking once full.
- **Overflow now bites (M41):** a store sitting near its cap (≥95%) **spoils** — it loses **~2%/s** as you jettison the excess, and the visible waste is a **station-wide morale drag (−5 mood)** until you clear it. The chip turns **amber** and a toast warns you. So overproducing isn't free idling any more — it wastes the minerals/biomass you spent making it and annoys the crew.
- This makes sizing a live decision: match production to your population, keep **trade capacity** ahead of mining, and **trade minerals** (or build Silos) to keep room.
- Build a **Storage Silo** (¢70, 1×1; unlock *Cargo Logistics*) to raise **every** cap by **+250**.
- **Storage tiles show their contents:** each Storage Floor zone visibly fills with **ore crates / meal crates / a water tank** in proportion to what you actually hold, and empties as you spend it — so you can read your stockpile straight off the floor.
- **Advanced modules need warehouse space (storage is a prerequisite, not a luxury):** every **tier-2+ module** (anything needing **2+ Labs** — methane/chlorine/ammonia/hydrogen wings, Heater/Cryo, Turret, Large/Spaceport Docks, Fusion, AI Core, signature modules, …) **reserves warehouse capacity** and **can't be built without it**. Each advanced module needs **2 storage "slots"**; a **Storage Floor tile = 1 slot**, a **Silo = 5**, a **Cargo Exchange = 8**. So the first advanced module needs ~2 storage tiles (or a Silo), and a big tier-2+ wing needs a real warehouse. **Storage Floor/Silo/Cargo Exchange themselves are exempt** (otherwise you couldn't build your way out). Tier-1 starter modules (O₂, Synth, Vat, Bot Bay, Trade Hub, Fuel Refinery, Med Bay, Battery, Lounge) are **never** gated. The build ghost turns **red** and the Advisor nudges you when you're out of warehouse room.
- **Takeaway:** an amber *400/400* chip is actively costing you — consume it, sell it, throttle it (toggle a Vat off), or raise the cap with Silos. And **lay storage early** — without it your drones can't unload *and* you can't expand into the advanced tech tiers.

## 14 · Station incidents (M29 / M38) — pressure that tests your layout
After the first couple of minutes, the station faces periodic **incidents** (announced by a toast; they escalate slightly over time). **As of M38 they reward redundancy instead of being harmless** — a fat, single-pointed station can genuinely be hurt:
- **Power surge** — a random module trips offline for ~20s. It normally avoids life support — **but if your O₂/CH₄ supply has *no redundancy*** (no **Battery Bank** to soak the spike **and** only a **single generator** for that gas), a surge **can** knock that generator out and start suffocation. The counter is cheap: build a **Battery** *or* a **backup generator** for each gas and life support is surge-proof again.
- **Hull breach** — a wall blows out (marked by a blinking red ❌) and the room starts venting. **Crew treat it as an emergency**: a resident drops what they're doing, rushes over, and reseals the wall — but the emergency repair **costs ¢120**. You can also wall it yourself for the normal ¢3 if you're faster. *Only happens once you have 2+ rooms*, so a beginner's single room is safe.
- **Market shock** — mineral prices **surge ×2** (sell now!) or **crash ×0.5** (hold) for ~40s.
- **Raider** — a hostile **pirate craft** (its own dark-red ship + a red attack beam to whatever it's hitting) parks at your dock and **wrecks the station**: it **chews through a module's condition and once that hits 0 the module is DESTROYED** (gone, not just broken), **and every ~4s it blasts open a hull wall** so the wing **vents to space** — crew scramble to reseal while air bleeds out. **Module damage scales with station size** (~16/s up to ~48/s), and an **undefended** established station (2+ rooms, **no Turret ever built**) even exposes **life support**. A **powered Turret** (unlock *Station Security*) **fires cyan lasers** at the raider and **burns its hull down (~100 HP at 75 HP/s per turret ≈ 1.3 s)** — the raider still arrives and may chip a module for a moment before it's destroyed, and **more turrets kill it faster** (a swarm of raiders can overwhelm a lone turret); the **Garrison Doctrine** halves raider damage and keeps life support off-limits. **No defense → you lose modules *and* air.**
- **Your first raid is a gentle introduction.** The very first pirate attack is a **lone probe**: it deals only about **a third the module damage** (×0.35), sends **a single boarder**, and **does not breach the hull** — enough to teach you the threat without gutting a young station. **From the second raid on, they come in full force** (full damage, a 2–4 boarding party, and hull breaching). So treat that first visit as your cue to research **Station Security** and build a **Turret** before the real ones arrive.
- **Boarding party** — a raid also **drops a party of 2–4 raiders that storm *inside* the station** (red intruders with health bars) — **just one** on your gentle first raid. They **march on your machinery and smash it** (18 condition/s, destroying modules), **attack any crew they reach** (8 health/s — they can kill), and they tear through whatever room they're in. Your **crew fight them hand-to-hand** (stronger species hit harder) and a **powered Turret lays down covering fire** that shreds the whole party. They **withdraw after ~18s** if they survive. So a raid is now a real boarding action: **keep crew (and a Turret) on hand or the boarders gut a wing from the inside.**
- **Beginner grace stays:** a brand-new single-room station is still safe from breaches and raider life-support hits — the teeth only come out once you've grown enough to be expected to build redundancy and defense.

## 14b · Race-gods — keep the powerful happy
Each race has a **god** — a Q-like, ship-sized being indifferent to your permission. **Once that race is aboard, its god drifts past every ~150s** and **judges how content the species is** (their average mood):
- **Pleased** (avg mood **≥ 60**) → it **gifts ¢250 + 60 minerals**.
- **Wrathful** (avg mood **≤ 40**) → it **unmakes one of your modules** (life support is spared, so it can't instantly doom you).
- **In between** → it just watches, unmoved.
Each god has a distinct form drifting through the void — **The Mantis** (Human, a giant shrimp), **The Vault** (Drenn, a metal safe), The Cinder-Anvil (Thol), The Bloom (Vry'l), The Fist (Korro), The Ingot (Vorn), The Lattice (Chlorithe), The Veil (Naaz), The Spark (Voltaar), The Eye (Sszra). A green/red ring shows its verdict. **Takeaway:** hosting a race is a standing obligation — keep their wing happy (food, climate, good neighbours) or their god takes it out on your station.

### Weird gods — the four wild cards
About **1 in 3** god visits is instead a **weird god**: a wild card that ignores mood and **warps the station outright** (it can appear even with an empty roster). It drifts in as a bright roiling orb — no creature form — and strikes when it reaches the station:
- **The Hollow** 🌑 → **blackout**: cuts **all power for 25s** — every system, including life support, goes dark. Survivable if short, deadly if your air is already thin.
- **The Dynamo** ⚡ → **power surge**: **free surplus power for 45s** — everything runs no matter your grid.
- **The Maw** 🩸 → **famine**: **devours every meal store** (all four diets to 0).
- **The Glut** 🍖 → **feast**: **fills every meal store to its cap**.
**Takeaway:** keep a charged battery and a food buffer so a Hollow or a Maw isn't fatal — and enjoy the Dynamo/Glut when fortune turns your way.

## 14c · Reproduction — clutches, younglings & spiders
A species that is **thriving** (at least **2 resident members aboard** and an **average mood ≥ 70**) will eventually ask, through a **paused dialog**, to **lay a clutch of eggs** in your empty floor space — and **offers you ¢1000** for your blessing.
- **Allow it** → you bank the **¢1000** and a clutch of **4–7 eggs** is laid on empty interior floor near their own kind. (Offers begin ~120s in, then roll ~every 90s; one at a time. You need empty floor for them to nest.)
- **Refuse** → no clutch, but the species is disheartened (**−8 reputation, −10 mood** to its members).
- After an **incubation (~60s, "a few months")** each egg hatches — about **half become new younglings** (free new resident crew of that species) and **the rest hatch as "spiders":** hostile vermin.
- **Spiders** roam the station, **bite crew** (−5 health/s at melee, can kill) and **gnaw machinery** (−10 condition/s) when no one's near. The **crew hunt them down** — anyone within 2 tiles cuts a spider (40 HP) apart, and the **parent species hunts its own spawn hardest** (×1.8). They show a red health bar as they're whittled down.
- **Takeaway:** breeding is **free crew + ¢1000** in exchange for a brief **pest scare** — keep some crew (ideally the parent species) handy to cull the spiders before they wreck a wing, and leave a little empty floor for the nest.

## 14d · Love & romance — when crew fall for each other
Every crew member now has an **individual name**, and **very rarely**, when two crew of **different species** have a **bond encounter** ("talk"), they **fall in love** (encouraging the friendship roughly doubles the odds). Falling in love is announced in a dialog.
- **Global thaw:** while a couple is together, the **hatred between their two species melts** (and the *whole* station grows a little more cooperative) — fights and friction drop, harmony and mood rise. A Human↔Korro romance can make that toxic pairing workable.
- **They work harder & stick together:** once **truly in love (love ≥ 70)** the pair **work +50%** (faster repairs) and **spend their free time together**, drifting to each other's side whenever they've no pressing need. Look for the little **pink heart** over a smitten crew member.
- **The calendar:** love **grows each "day."** But on **days 5, 15, 25 and 35** the couple hits **turbulence** — a **dice-roll** (the more in love, the better their odds) decides whether they **weather it** (love deepens) or **break up** (both take a mood hit and the thaw fades). There are **~100 different reasons** a turbulent night can flare up, each shown in the dialog.
- **Cross-gas lovers → Implants:** if the two breathe **different gases** they normally can't share a wing. Research **Breathing Implants** (¢400, 2 Labs, needs Medicine) and a **truly-in-love cross-gas couple** is fitted with implants so **each can breathe the other's air** — they can finally live and work together.
- **Takeaway:** romance is a **rare, powerful gift** — it turns rivals into cooperators and boosts output — but it's fragile. Keep a happy station so couples form, and don't be shocked if a turbulent night ends one.

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
7. **Bot Bay** → open its **🛰 Star Chart**, survey a nearby asteroid, dispatch the drone → **minerals** (materials stockpile).
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
| Sim tick | 10 steps/s at 1× (render interpolates between steps for smooth motion) |
| Doors | walkable but block gas (airlock); connect wings without mixing atmospheres |
| Breath | suit protects first; once suit empty, −8%/s in wrong air; +15%/s in right air; death at 0 |
| Space suit | drains ~14%/s off native air (full ≈ 7s ≈ 28 tiles; turn back at ~30%), recharges ~40%/s in native air |
| Food / Rest / Fun | −1.5 / −1 / −0.4 %/s; seek at <40 / <35 / <40; recover +12 (rest) / +20 (lounge) %/s |
| Crew speed | ~4 tiles/s (A* on floor) |
| Upkeep | machinery wears ~0.6%/s; crew service below 60%, repair ~15%/s; breaks at 0. Residents only; ~1 crew / 6 modules |
| Eyesight & patrols | each crew has a personal **sight** range (**2–5 tiles**, Sszra +1) and a facing **vision cone**; they only spot/service a fault **in sight & in front**. No visible fault → they **patrol** (wander the wing) to find one; nothing wrong → stand idle |
| Power | Solar +10, **Fusion +150**, Battery 50; draws AI Core 10 / CH₄ 9 / Cl₂ 10 / NH₃ 10 / H₂ 11 / Cryo Unit 7 / O₂ 6 / Vat 6 / Lab 6 / Cargo Exchange 6 / Fuel Refinery 6 / Synth 5 / Dock 5 / Trade Hub 5 / Heater 5 / Bay 4 / Lounge 4 / Turret 4 / Med Bay 4 / Hotel 2 / Crew Quarters 1 / Light Fixture 1 (Silo 0) |
| Lighting | the interior is **dark & moody** (cool ambient); powered **Light Fixtures** (¢30) and glowing modules throw **soft warm pools** that **cast real shadows** (walls/large modules block light). Crew carry a **moving headlamp** (~5–6 cells) whose pool **fades off gracefully** into the dark. Each room's ambient is **tinted by its gas** (O₂ a bit blue · CH₄ reddish · Cl₂ green · NH₃ indigo · H₂ magenta · mixed danger-red); open space outside stays untinted. Modules are **tone-mapped into families** (steel hull/structure · rust doors & industry · bio vats/synth · plasma weapons/research/AI); creatures, lamps and bunks keep their own colours. Visual only — no gameplay effect |
| Encounters | every ~55s two co-located rival/friendly species trigger a **paused choice dialog**: a clash (bad/unlucky pick → injury) or a bond (morale/income/party). Injuries also come from servicing **2+-Lab modules** (Thol much safer) |
| Injuries & Med Bay | wounded crew **bleed ~0.5%/s** and die without care; a powered **Med Bay** (¢240; research Medicine) **heals +6%/s** station-wide. Skirmishes wound too |
| Tech | Research at powered Labs — **higher tiers need MORE Labs**: Tier 1 (1 Lab) Battery/Lounge/Bot Bay/Trade Hub/Fuel Refinery/Med Bay · Tier 2 (2 Labs) Silo/Fungal/**Climate Control**/**Exobiology**/Methane/Chlorine/Ammonia/Hydrogen/Turret/Expanded Docking/**Breathing Implants** · Tier 3 (3 Labs) Fusion/Cargo Exchange/AI Core/Spaceport (each needs a prereq) · Tier 4 (3 Labs) the 5 Beacon modules. Each tech shows its 🔬×N Lab requirement; locked tools show "???" |
| Doctrine fork | 2 Labs, ¢400, **pick ONE** (locks the others): **Industrialist** (+15% mining/food/repair; needs Robotics) · **Hospitality** (+50% lodging, faster guests; needs Commerce) · **Garrison** (½ raider damage, life support shielded; needs Security) |
| Storage caps | biomass 400 · spores 250 · microbes 250 · meals 50/line (rations/fungal/protein/exotic) · minerals 200 · fuel 120; production idles at cap. **Near cap (≥95%) a store spoils ~2%/s and drags mood −5** until cleared. Each Storage Silo +250 to all |
| Storage gate | Tier-2+ (2+-Lab) modules **need warehouse capacity to build**: 2 slots each; Storage Floor tile = 1 slot, Silo = 5, Cargo Exchange = 8. Silo/Cargo Exchange/Storage Floor exempt; tier-1 starters never gated. Storage Floor tiles also **show their actual contents** (ore/meal crates, water tank) |
| Climate | rooms are **temperate** by default; a powered **Heater** (¢130) → **hot**, a **Cryo Unit** (¢170) → **cold** (both in one room cancel). Wrong band for a crew = **−10 mood** (comfort only). Voltaar want hot, Naaz want cold; everyone else temperate. Needs Climate Control |
| Gas hazards | **Cl₂ corrodes** active machinery in its room (−0.5 condition/s extra; life-support gens spared). **H₂ + O₂ in one room DETONATES** — wrecks the room's modules, destroys the gens, wounds everyone, blows a breach. Door-separated wings are safe |
| Fuel | Fuel Refinery: 2 minerals → 3 fuel / 6s (needs a Bot Bay). Docking ships buy fuel at 4¢/unit: 6 / 18 / 40 per standard / large / spaceport dock |
| Dock tiers | Docking Port (3×3 pad, 3 guests) · Large Dock (5×5, 6 guests) · Spaceport Dock (7×7, 10 guests). Bigger berths land bigger ships, a wider guest species mix, and bigger fuel sales |
| Race-gods | once a race is aboard, its **god** (ship-sized, drifts through space) visits ~every 150s. It **judges that species' avg mood**: **≥60 → gift ¢250 + 60 minerals**, **≤40 → it unmakes a non-life-support module**, between → just watches. One per race (Human=The Mantis/shrimp, Drenn=The Vault/safe, …). Keep your crews happy or pay the price |
| Weird gods | ~**1 in 3** visits is a wild-card god (orb, no creature form): **The Hollow** = all power dead **25s**; **The Dynamo** = free surplus power **45s**; **The Maw** = empties all meal stores; **The Glut** = fills all meal stores to cap. Can appear with no crew aboard. Keep a charged battery + food buffer |
| Reproduction | a thriving species (**≥2 residents, avg mood ≥70**) offers a **clutch** (paused dialog) for **¢1000**: allow → 4–7 eggs on empty floor; refuse → −8 rep/−10 mood. Eggs **incubate ~60s**, then ~half hatch as **new crew**, the rest as **spiders** (40 HP) that **bite crew (−5/s) & gnaw modules (−10/s)** until the **crew cull them** (2-tile reach; parent species ×1.8). Offers start ~120s in, ~every 90s, one at a time |
| Love & romance | each crew has a **name**; a bond encounter has a **rare** chance (~5%, ×2 if encouraged) to become a **love-couple** (different species only). A couple **thaws hate** between their species (+ a small global lift), and once **truly in love (love ≥70)** the pair **work +50%** and **spend time together** (pink-heart marker). Love grows each ~6s "day"; **days 5/15/25/35 = turbulence** (a love-weighted **dice-roll** decides stay/split; ~100 reasons). **Breathing Implants** (¢400, 2 Labs, needs Medicine) let a truly-in-love **cross-gas** couple cohabit |
| Incidents | start ~120s in, ~every 75–90s (escalating): surge (module offline 20s; **can hit a lone, battery-less life-support gen**) · breach (vents a room, 2+ rooms only; **crew auto-reseal for ¢120**) · market shock (×2/×0.5 for 40s) · raider (pirate craft; DPS ~8→26 scaling with station size; **destroys a module when its condition hits 0**, breaches the hull if nothing's left, **hits life support if undefended & 2+ rooms**, until a Turret kills it). **The first raid is a gentle probe (×0.35 damage, 1 boarder, no hull breach); full strength from the 2nd on.** Redundancy (Battery / backup gen / Turret / Garrison) is the counter |
| Food | Bio Vat: +3 / 8s (biomass · spores · microbes) · Synth: 2 base → 4 meals / 10s. Lines: Rations (biomass) · Fungal (spores) · **Live-Protein** (microbes → Sszra) · **Exo-Culture** (microbes → Chlorithe/Naaz/Voltaar). Spores/Fungal need Fungal Synthesis; Microbes/Protein/Exo need Exobiology |
| Mining | minerals only, via the Bot Bay **Star Chart**: a system of orbiting bodies around one or two **stars** — planets (some with **moons**), an asteroid belt, scattered rocks. Dispatch a drone (off-map). Round trip ~25s (near asteroid) → ~70s (far planet); haul = body yield (asteroid 5–18, ore-rich 30–55, planet 35–90, moon 10–30), ×1.5 Korro. First trip surveys + delivers; bodies are finite. **Each trip risks the drone (~2% near → ~8% far); a lost drone is rebuilt by its Bay for ¢300 / ~18s.** **Drones won't launch without storage (a Storage Floor tile or a Silo).** Storage idles at the minerals cap |
| Footprints | battery/quarters/silo/turret/light 1×1, synth/hotel/lab 2×1, generators/vat/lounge/trade-hub/fusion/cargo-exchange/ai-core/med-bay/fuel-refinery/heater/cryo-unit 2×2, **Bot Bay 1×2 (hull-mounted, like a dock)**, solar 1×3 (wall), docks 1 wall cell |
| Objectives | grow to 3 crew → bank ¢3000 → host 4 resident species → **bring the Sector Beacon online** (charge all 5 species signature modules). Clear all to win. Defeat if the crew die and the station can't attract anyone (~20s grace) → a **post-mortem** (exactly what killed the station) + a **brutal letter from the Emperor**, then Continue starts a fresh station |
| Sector Beacon | 5 researched signature modules (one per species); each charges 0→100% only while powered + its species is in its room, and grants a unique perk (mood / trade / repair / food / mining). All 5 charged = victory |
| Crew arrival | resident shuttle ~every 12s while a Crew Quarters **prepped for that species** is free (in their air) and their food is stocked; capacity is **per prepped species**. **Human free to prep; others need host research** (Methane/Chlorine/Ammonia/Hydrogen/Fungal/Exobiology/Robotics-for-Korro). Toast + pulsing ring on arrival |
| Guests | arrive by shuttle ~20s, **3 / 6 / 10 per shuttle by dock tier**, capped by **free Hotel Rooms prepped for that visitor species**, pay ~1.5¢/s, stay ~90s; rate scales with Drenn reputation. **Visitor classes:** O₂ → Drenn/Human/Vry'l, CH₄ → Vorn/Thol. **Drenn free to prep; others need research.** Shuttle flies into the dock pad and stays the whole visit |
| Lodging prep | every Crew Quarters / Hotel Room is **assigned to one species** (Select → Reassign species); only that species sleeps there. Lets you keep same-air rivals (Human/Korro) in separate cabins. **Each cabin/hotel is tinted in its species' colour** (plus a corner chip) so wings read at a glance |
| Trade | needs a powered Trade Hub; every ~30s buys ≤25 minerals at ~3¢ each |
| Credits | start ¢1000; builds cost (see COSTS.md); deconstruct refunds 50% |
| Relations | **10 species.** love +15 / like +8 / kin +4 / dislike −8 / hate −15; neighbor sum clamped ±45 (rivals needs); proximity 4 tiles. Human⇄Korro & Vry'l⇄Korro HATE; Thol⇄Vry'l, Human⇄Drenn, Chlorithe⇄Naaz, Vry'l⇄Naaz LOVE; **Korro⇄Sszra** respect (like); Humans/Vry'l dislike Sszra; Drenn & **Naaz** like all (Naaz dislike none) |
| Reputation | per-species 0–100, starts 50; requests give +10–15 / expiry −6–10; ≤2 active, new ~every 50s, 120s to fulfil; Drenn rep scales guest arrival rate |
| Upkeep | operating modules ~0.15¢/s each + resident wages ~0.2¢/s; net ¢/s shown by the credits chip. Idle module-heavy stations bleed |
| Charter subsidy | early income floor: ~0.5¢/s per certified resident (alive, O₂ > 50%), capped at 5 crew (≈2.5¢/s). Keeps a small station solvent before hotels/trade; fades as you grow |
| Skirmish | tension rises fast when mood <30 near a disliked species, **or slow-burn (4/s) when sharing a tense room (harmony <−0.3) even if fed**; fights at 100. Separate rivals to stop it |

*Build for everyone's needs, and the politics take care of themselves.*
