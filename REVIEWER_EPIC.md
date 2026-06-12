# 🎙️ The Reviewer's Epic — a detour to harden the first hour

> **This is a deliberate detour from the main game roadmap.** Instead of adding
> new species/systems (Security, Research-as-content, more roster), we pause to
> act on a critical one-hour playtest review. The goal of this epic is to take
> the verdict from **6.5/10 → 8/10**: make the smart systems core *teach itself*,
> *give feedback*, and *earn the second hour*.

## Who reviewed it

**Mara Voss** — 12-year management-sim critic (RimWorld, Prison Architect, Oxygen
Not Included, Factorio). Plays cold, no manual. Verdict on the current build:

> *"A genuinely smart systems core wrapped in almost no game. The
> architecture-is-politics thesis is real and the Korro friction proves it. But
> the first hour is all tutorial-by-Advisor and no stakes: nothing threatens you,
> nothing pulls you forward, and the most original mechanics (shuttle
> immigration, harmony) are under-communicated."*

Her three headline problems:
1. **No goal** — no objective, no win/lose, a total crew wipe just leaves an empty husk running.
2. **Core mechanics are invisible** — crew arrival has no fanfare; mood/harmony are qualitative.
3. **The mid-game runs itself** — no threat, no credit sink, abundance kills decisions.

---

## The hitlist (all 11 suggestions → milestones M26–M36)

Priority mirrors the review: **P0** = the game feels unfinished without it · **P1**
= turns "runs itself" into "can't stop" · **P2** = noticeable polish.

| # | Milestone | Suggestion | Pri | Effort |
|---|-----------|------------|:---:|:------:|
| 1 | **M26 — Arrival & capacity legibility** | Make crew arrival visible (toast, shuttle, "why none") + Crew/Hotel capacity HUD chips | P0 | M |
| 2 | **M27 — Goals & game-over** | Scenario objective(s) + proper defeat/victory + restart | P0 | M |
| 3 | **M28 — Numbers behind mood/harmony** | Hover breakdown of mood terms + room productivity multiplier | P0 | S |
| 4 | **M29 — Pressure source** | Recurring threat events (surges, micro-breaches, raiders, price shocks) | P1 | L |
| 5 | **M30 — Credit sink / tech tree** | Tiered unlocks or a research tree so expansion has a spine | P1 | L |
| 6 | **M31 — Audio pass** | Build click, brownout alarm, arrival chime, skirmish sting, ambient hum | P1 | M |
| 7 | **M32 — Curb abundance** | Spoilage / storage caps / scaling demand so food stays a decision | P1 | M |
| 8 | **M33 — Guided opening** | 20-second "seal → power → air" first-build overlay (beyond Advisor text) | P2 | M |
| 9 | **M34 — Save slots & feedback** | Named save slots + "Saved ✓" confirmation | P2 | S |
| 10 | **M35 — Camera / QoL** | Find/cycle a module type · live build-cost total while dragging · solar rotate confirm | P2 | M |
| 11 | **M36 — Actionable Alienpedia** | Click a species to locate them + show live mood/count | P2 | S |

**Suggested execution order:** M26 → M28 → M27 (the P0 legibility-then-goal spine),
then M31 (audio is the cheapest juice-per-hour) → M32 → M30 → M29, then the P2
polish (M33–M36) as time allows. Audio (M31) can slot in anywhere.

---

## Milestone specs

Each milestone is independently shippable: code + `npm run build` + `npm test`
(add headless checks) + `STRATEGY.md`/`BALANCE.md` sync + local commit.

### M26 — Arrival & capacity legibility  · P0 · M
**Why (Mara):** *"A core, novel mechanic is nearly invisible. No chime, no toast,
the shuttle is a tiny grey sprite I didn't notice. And I had no idea why crew took
so long."*

**Scope**
- HUD chips: **Crew N/Quarters** and **Guests N/Hotel** (capacity always visible), next to the existing credits/power/mood chips.
- **Arrival toast + flash** when a resident or guest docks (e.g. "A Korro is docking"), reusing the existing `pushAlert` toast channel.
- Make the shuttle obvious: larger sprite and/or a short approach trail and an arrival pulse at the dock.
- **"Why no crew" surfacing:** when quarters are free but nobody comes, the Advisor states the missing gate ("Waiting: no meals in stock" / "dock unpowered" / "no bunk in their air").

**Acceptance**
- Capacity chips update live as pods/hotels/residents/guests change.
- A toast fires exactly once per arrival; no spam.
- Headless test: with all gates but no meals, the "waiting on food" reason is produced; once meals exist, a crew arrives.

**Files:** `ui.ts` (chips, toast wiring), `renderer.ts` (shuttle/flash), `advisor.ts` (waiting reason), `main.ts` (arrival hook), `simcheck.ts`.

---

### M27 — Goals & game-over  · P0 · M
**Why (Mara):** *"There is no win/lose/objective layer at all. A total wipe just
leaves an empty husk running."*

**Scope**
- A small **objective system**: one active scenario goal with progress (e.g. "Reach ¢10,000", "Host all 5 species at once", "Keep ≥6 crew alive for 10 minutes"). Shown in the topbar with a progress bar.
- **Victory** state on completion (banner + offer next goal / free-play).
- **Defeat** state when the station is non-viable: zero living residents *and* no means to recover (no powered dock, or sustained for N seconds). Banner + **Restart**.
- **Restart/new-game** path that resets `World` cleanly (and clears/keeps save by choice).

**Acceptance**
- Objective progress is serializable (save/load mid-goal works).
- Reaching the target triggers victory exactly once; a wipe triggers defeat, not an empty running sim.
- Headless tests: objective completes when its metric is met; defeat fires on a crewless, dock-less station.

**Files:** `types.ts` (Objective/GameState), new `objectives.ts`, `world.ts` (reset), `ui.ts` (topbar + banners), `persistence.ts` (migrate), `main.ts`, `simcheck.ts`.

---

### M28 — Numbers behind mood & harmony  · P0 · S
**Why (Mara):** *"'Tense' and the red ring are qualitative. Players can't optimize
what they can't see."*

**Scope**
- Agent hover tooltip shows the **mood breakdown**: base 50, needs (+/−), neighbor opinions (+/−), room harmony (+/−) → resulting mood.
- Cell/room hover shows the room's **harmony value and productivity multiplier** (e.g. "Tense −0.53 → ×0.6 production").
- Reuse existing `showTooltip`; no new panels.

**Acceptance**
- Numbers in the tooltip match what `moodSystem`/`harmony.ts` actually compute (single source of truth — export the term calc).
- Headless test: a known human+korro room reports the expected harmony/productivity.

**Files:** `mood.ts`/`harmony.ts` (export a breakdown helper), `ui.ts` (tooltip), `simcheck.ts`.

---

### M29 — Pressure source  · P1 · L
**Why (Mara):** *"The mid-game is frictionless. Give me something that makes
batteries, security, and layout matter under duress."*

**Scope (pick a starter set, expandable)**
- A lightweight **event scheduler** that fires periodic, escalating incidents:
  - **Power surge / generator fault** — a module trips offline for a while (battery headroom matters).
  - **Hull micro-breach** — a random hull wall springs a slow leak (a room vents unless repaired/sealed).
  - **Raider dock event** — a hostile ship; ties directly into a later **Security** module (guard post / turret) as the counter.
  - **Market shock** — mineral price spikes/crashes for a window.
- Telegraphed by toast + (M31) sound; severity scales with station size / time.

**Acceptance**
- Events are deterministic from `tick` (replay/test-friendly), serializable, and never unrecoverable on turn one (grace period before the first event).
- Headless tests: a breach vents a room; a surge sheds a module; recovery restores normal.

**Files:** new `events.ts`, `types.ts`, `world.ts`, `renderer.ts`/`ui.ts` (telegraph), `simcheck.ts`. *(Security counter may be its own sub-milestone.)*

---

### M30 — Credit sink / tech tree  · P1 · L
**Why (Mara):** *"Money accrues with nothing meaningful to buy."*

**Scope**
- A **Research/Lab module** generating research points, **or** wealth+research **tiered unlocks** (start locked: advanced generators, Security, new species life-support, larger storage).
- A small **tech panel** showing what's unlocked / next, with credit (and/or research) costs — the destination Mara wanted.
- Gates some existing content (e.g. Thol methane wing, Vry'l fungal chain, Korro) behind unlocks so the roster becomes a *progression*, matching the original design doc's "wealth + research" intent.

**Acceptance**
- Unlock state serializes; locked tools are visibly disabled with their requirement shown.
- Headless tests: a tool is unbuildable until its unlock condition is met, buildable after.

**Files:** `types.ts`, new `research.ts`, `structures.ts` (unlock flags), `ui.ts` (tech panel + disabled tools), `persistence.ts`, `simcheck.ts`. Update `BALANCE.md` unlock table (already drafted there).

---

### M31 — Audio pass  · P1 · M
**Why (Mara):** *"Zero sound. The cheapest juice-per-hour on this list."*

**Scope**
- A tiny audio module (WebAudio or a tested lib) with: build click, place/deny blip, **brownout alarm**, **arrival chime**, **skirmish sting**, low **ambient hum**, UI clicks.
- A **mute toggle** + volume in the topbar; respect it in save/localStorage.
- Keep assets small; generate simple tones if needed to avoid binary bloat.

**Acceptance**
- No audio plays before first user gesture (browser autoplay policy).
- Mute persists; no errors in the headless build (audio guarded behind `window`).

**Files:** new `audio.ts`, `main.ts` (event hooks), `ui.ts` (mute), `config.ts`.

---

### M32 — Curb abundance  · P1 · M
**Why (Mara):** *"Meals piled to 200+ and biomass kept climbing — food becomes a
non-decision after minute 15."*

**Scope**
- Pick a lever (or combine, lightly): **storage caps** per resource (a Storage/Silo module raises the cap), **spoilage** (meals/biomass decay slowly above a threshold), and/or **scaling demand** (more crew eat proportionally more).
- Production idles or slows when at cap (no infinite stockpiles), nudging the player to size production to population.

**Acceptance**
- Stockpiles plateau at the cap instead of climbing forever; food stays a periodic decision in a 30-min sim.
- Headless test: with default storage, biomass/meals stop growing at the cap.

**Files:** `types.ts` (caps), `food.ts`, `structures.ts` (Storage module), `ui.ts` (chip shows X/cap), `BALANCE.md`, `simcheck.ts`.

---

### M33 — Guided opening  · P2 · M
**Why (Mara):** *"A 20-second guided first-build would onboard without a wiki."*

**Scope**
- A dismissible **first-run overlay** that highlights the literal steps: *seal a room → solar → O₂ gen → synth + bunk + dock*, advancing as each is satisfied (reads real world state, not a script).
- Only shows on a fresh game; skippable; never blocks input.

**Acceptance**
- Steps tick off from actual state changes; overlay self-dismisses when the first crew arrives.
- Doesn't reappear after completion (flag in save).

**Files:** `ui.ts` (overlay), `main.ts` (state checks), `persistence.ts` (seen flag).

---

### M34 — Save slots & feedback  · P2 · S
**Why (Mara):** *"One unnamed slot feels fragile for a sim."*

**Scope**
- **Named save slots** (e.g. 3 slots) with timestamp; load/delete per slot.
- **"Saved ✓"** toast on manual save; autosave indicator.

**Acceptance**
- Multiple independent saves round-trip; deleting one leaves others intact.
- Headless test: two slots store distinct worlds.

**Files:** `persistence.ts` (keyed slots), `ui.ts` (slot UI + toast).

---

### M35 — Camera / QoL  · P2 · M
**Why (Mara):** *"Small frictions: finding modules, cost while dragging, rotation."*

**Scope**
- **Find/cycle a module type** (double-click a palette entry to pan-cycle instances).
- **Live build-cost total** while drag-placing floor/wall (extend the existing drag-size label).
- **Solar rotation confirmation** in the ghost (clear facing indicator).

**Acceptance**
- Drag label shows running ¢ cost and turns red when unaffordable.
- Cycle visits each instance of the chosen kind.

**Files:** `main.ts` (input), `ui.ts`/`renderer.ts` (labels/ghost).

---

### M36 — Actionable Alienpedia  · P2 · S
**Why (Mara):** *"Turn the reference card into a management tool."*

**Scope**
- Click a species entry to **pan to / highlight** its members and show **live average mood + count**.
- Optional: a per-species mood sparkline.

**Acceptance**
- Clicking an entry centers the camera on a member and rings that species briefly.

**Files:** `ui.ts` (click handler), `renderer.ts` (highlight), `main.ts` (camera).

---

## Definition of done (the epic)

A cold player, no manual, in their first hour:
- **Always knows the goal** and can win or lose it (M27).
- **Sees crew arrive** and reads capacity at a glance (M26).
- **Understands why** a room is tense and what it costs (M28).
- **Faces at least one real threat** and has a reason to expand (M29, M30).
- **Hears the station** react (M31), and **food stays a decision** (M32).
- Onboards smoothly, saves safely, and isn't nagged by small frictions (M33–M36).

**Re-review target:** Mara replays for a second hour and scores it **≥ 8/10**.

---

*Detour owner: the EXOSTATION team. When this epic lands, we return to the main
roadmap (Security as content, Research-gated species, the wider roster).*
