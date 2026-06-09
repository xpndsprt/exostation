# EXOSTATION — Strategy Guide

> A complete guide to every mechanic in the current build (milestones M0–M11), ordered by **importance** and by **when you first meet it**. All numbers are the live first-pass values and may be tuned.

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

**Building**
- Pick a tool from the left **palette** (each shows its **hotkey**). The **ghost preview** tints **green = placeable, red = blocked**; the cursor becomes **⊘** where you can't build.
- **Floor / Wall / Erase** support **drag-rectangle** fill — drag out a room and read the live size label.
- **Door**, structures, **Asteroid**, and crew place on a single click.

**Inspecting**
- **Hover** anything for a quick tooltip (no click).
- The **Select** tool (S) opens the right-hand **info panel** with live stats and **Deconstruct** / **toggle on-off** buttons.

**Time & saving**
- **Pause / 1× / 2× / 3×** (`Space` pause, `[` / `]` slower/faster).
- **Save / Load** (top bar) persist to your browser; the game also **autosaves every 30s**.

**Advisor board (lower-right)**
- Lists **every species that has visited** the station, and an **AI advisor** that watches the sim and shows your **next logical steps**, most urgent first (red = critical danger, amber = should-do, green = tip). When in doubt, do what the top red/amber item says.

---

## 2 · Sealing a room (first build)
- The grid starts as empty **space** (vacuum). Lay **Floor**, then enclose it with **Wall**.
- The sim constantly detects rooms. A floor area that can't reach open space is **sealed** (it can hold atmosphere); a floor exposed to space stays **open** (it never will).
- **Doors are airlocks:** a **Door** tile is **walkable but blocks gas**, so it connects two rooms for traffic **while keeping their atmospheres separate**. Put a door in the shared wall between wings — each side keeps its own gas, and crew can still pass through (on suit for the moment they're in the doorway).
- To **merge** two rooms into one shared atmosphere instead, leave a plain **floor** gap (no door) in the wall.
- **Erasing a wall that exposes a sealed room vents it** — everyone inside loses air.

---

## 3 · Power (M2) — nothing runs without it
- **Solar Panel** generates **+10 PU** (power units). **Battery Bank** stores **50 PU** of surplus for later.
- Consumers draw power: **O₂ Generator −6**, **Methane Gen −9**, **Rations Synth −5**, **Bot Bay −4**, **Docking Port −5**, **Sleeping Pod −1**.
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
- Off native air, the **suit reserve drains (~20%/s → about 5 seconds)** while keeping breath topped up. That's roughly **20 tiles of travel** — enough to cross a wing or a vented corridor.
- When the suit hits 0, **breath then drops ~8%/s and they die at 0** (~12.5s more).
- Back in native air the **suit recharges fast (~40%/s)**. A suited crew member shows a **light-blue ring**.
- **Implication:** doors + suits let you run one shared corridor past several differently-gassed wings; just keep the hostile stretch short enough that nobody's suit empties before they reach their own air.

---

## 5 · Crew & needs (M3–M4) — keeping people alive and functional
Each crew member tracks four meters (see them in the info panel; a mood dot floats over their head):
- **O₂ / breath** — from atmosphere (above).
- **Food** — decays ~**1.5%/s**; when **< 40** they path to a **Rations Synth** and eat a meal (refills to full).
- **Rest** — decays ~**1%/s**; when **< 35** they claim a free **Sleeping Pod**, sleep (recover ~**12%/s**) to full, then release it.
- **Mood** — see the political web below.
- Crew **pathfind (A\*)** at ~**4 tiles/s** along connected floor. If they can't reach food/a pod, the need stays unmet — an **orange ring** warns you.

**Build for autonomy:** put pods and a synth inside the breathable wing so crew can satisfy needs without crossing a vacuum or the wrong gas.

---

## 6 · Food production — grown on-station
Food is a two-step, **power-driven** loop that runs entirely inside the station:
- A **Bio Vat** grows **food base (biomass)** from power alone — **+3 biomass every 8s** while powered (the 🌱 chip).
- A **Rations Synth** converts **2 biomass → 4 meals every 10s** (the 🍱 chip); crew eat meals.
- The station seeds a little biomass so the synth works before your first vat.
- **Takeaway:** build **at least one Bio Vat per Rations Synth**. If meals stall, check both are powered (mid-priority — a brownout can shed them) and add more vats.

---

## 7 · Mining (minerals) — the materials economy
- Place an **Asteroid** out in **space** (the Space tool), and a **Bot Bay** inside the station. Each bay comes with **one mining drone**.
- The drone auto-runs the loop: **dock → fly out → mine → fly back → unload**, delivering **minerals** to stock (the ⛏ chip; cargo 10/trip). Drone color shows its state (outbound/mining/inbound); a pip shows it's carrying cargo.
- A site has **richness** (starts at 1000) that **depletes** as it's mined.
- **Takeaway:** mining is **not tied to food** — it builds your **minerals** stockpile (for trade/construction as those systems land). Food comes from Vats; minerals come from asteroids. Place the asteroid close to cut round-trip time.

---

## 8 · Guests & economy (M6) — the hotel
- A **Docking Port** periodically (every ~20s) brings a **Drenn** guest — **but only if you have a free Sleeping Pod**. Pods are your hosting capacity.
- Each living guest pays **lodging (~1.5 credits/s)**; watch the **¢** chip climb.
- Guests behave like residents (eat, sleep) and **depart after ~90s**, freeing the pod. Guests have a **gold ring** to distinguish them.
- **Takeaway:** more pods = more guests = more income — provided you can feed and air them. Income is your only credit source right now.

---

## 9 · The species (who you're hosting)
| Species | Breathes | Likes / Dislikes | Combat power | Notes |
|---------|----------|------------------|:-----------:|-------|
| **Human** | O₂ | likes Drenn · **dislikes Thol** | 20 | Your starting crew. |
| **Drenn** | O₂ | likes everyone | 18 | Easy guests; share air & food with humans. |
| **Thol** | **CH₄ (methane)** | likes Drenn · neutral to humans | **35** | Need a sealed methane wing; strong in a fight. |

Humans and Drenn co-house freely (same gas). **Thol must be kept in their own methane wing** — and humans resent them, which matters next.

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
- When a crew member's **mood is low (< ~30)** *and* a **disliked species is nearby**, their **tension** climbs (orange ring). Fix the cause (feed them, separate them) and it falls.
- At **100 tension** a **skirmish** erupts (red ring): they attack the nearest resented neighbor within ~2 tiles. Attacks are **one-sided by who resents whom** (e.g., a furious Human strikes a Thol; the Thol doesn't strike back unless *it* resents *them*).
- Damage scales with **combat power**, so high-power species (Thol = 35) are dangerous if *they* ever turn hostile.
- **A death wrecks a module in that room — which can vent it**, cascading into suffocation. One feud can gut a wing.
- **How to prevent it (in order):** keep mood up (food, rest, good neighbors) → never force disliked species into proximity → keep tension from ever starting. Combat is a symptom; the cure is upstream architecture.

---

## Recommended build order (a clean opening)
1. **Floor** a small box and **Wall** it shut (watch it turn "sealed").
2. **Solar Panel** ×2 → **O₂ Generator** inside the room (air goes cyan).
3. Add a **Human** — confirm breath holds at 100%.
4. **Bio Vat** + **Rations Synth** + a **Sleeping Pod** in the room (crew can now grow food, eat & sleep).
5. **Battery** for power headroom.
6. **Bot Bay** + an **Asteroid** nearby → drone mines **minerals** (materials stockpile).
7. **Docking Port** + extra **Pods** → Drenn guests + lodging income.
8. Want Thol money later? Build a **separate methane wing** (its own walls + Methane Gen), **linked to the rest by a Door** so traffic flows but the gases never mix.

---

## Common ways to die (and the fix)
- **Crew suffocate.** No power → O₂ gen off, or room not sealed, or wrong/mixed gas. Fix power/seal/zoning.
- **Brownout chain reaction.** Draw crept above supply; battery drained. Add solar/batteries; the Power overlay shows what's shedding.
- **Starvation / stalled synth.** Out of biomass — your **Bio Vats** can't keep up (or are unpowered). Add more vats, or check power.
- **No guests arriving.** You have no free pods (capacity), or the dock is unpowered.
- **Skirmish vents a wing.** You crowded a disliked pair or let mood crater. Separate them, raise mood; rebuild and reseal what was vented.

---

## Quick reference
| System | Key numbers |
|--------|-------------|
| Sim tick | 10 steps/s at 1× |
| Doors | walkable but block gas (airlock); connect wings without mixing atmospheres |
| Breath | suit protects first; once suit empty, −8%/s in wrong air; +15%/s in right air; death at 0 |
| Space suit | drains ~20%/s off native air (~5s ≈ 20 tiles), recharges ~40%/s in native air |
| Food / Rest | −1.5%/s, −1%/s; seek at <40 / <35; rest recovers +12%/s |
| Crew speed | ~4 tiles/s (A* on floor) |
| Power | Solar +10, Battery 50; draws O₂ 6 / CH₄ 9 / Vat 6 / Synth 5 / Bay 4 / Dock 5 / Pod 1 |
| Food | Bio Vat: +3 biomass / 8s · Rations Synth: 2 biomass → 4 meals / 10s |
| Mining | minerals only; drone cargo 10, speed ~6 tiles/s, site richness 1000 |
| Guests | arrive ~20s (≤ pod count), pay ~1.5¢/s, stay ~90s |
| Relations | like +8 / dislike −8 / kin +4; proximity 4 tiles |
| Skirmish | tension rises when mood <30 near a disliked species; fights at 100 |

*Build for everyone's needs, and the politics take care of themselves.*
