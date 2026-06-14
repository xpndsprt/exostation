# ⚙️ The Depth Epic — making the second hour earn itself

> **Follow-up to the [Reviewer's Epic](REVIEWER_EPIC.md).** That epic hardened the
> *first* hour (legibility, goals, onboarding, pressure, a tech tree). This one
> answers the **hardcore-systems critique**: the mid-game still *solves itself*.
> Goal: turn "watch the numbers tick up" into "manage a margin, court a real
> failure, and have a reason to start a different run."

## Where it came from

A systems-strategy reviewer (Factorio/ONI/DF/RimWorld veteran) played an hour,
read the source, did the math, and scored it **5/10**:

> *"An elegant atmosphere/zoning core wrapped in a runaway economy that solves
> itself in under an hour and a failure-state that can't fire if you remember to
> feed people."*

Praised (keep these intact): **atmosphere zoning + doors + suits**, the
**harmony → productivity** coupling, and **power priority-shedding**.

The verified findings:
1. **No recurring credit sink** — sources (trade ~2.5–7.5¢/s/hub, lodging 1.5¢/s/guest, requests 150–400¢) dwarf the only sinks (one-time builds + a finite **¢1,400 tech tree bought out in ~2 min**). The station becomes pure profit by minute ten.
2. **The skirmish failure-state can't fire under competent play** — combat needs mood < 30, but the needs term alone holds mood ≈ 45–72. Feed your crew and the entire tension→skirmish→breach→cascade catastrophe is dead code.
3. **Incidents are ignorable by construction** — life support immune, raider focus-fires one module at 8/s vs 15/s repair, breach reseal costs ¢3, market shock is free EV.
4. **The tech tree is a shopping list** — four flat nodes, no prerequisites, no opportunity cost; you buy all of it and you're done forever.
5. **Storage caps create idle, not pressure** — overproduce and you just… stop, with zero penalty.
6. **No replay hook** — no seed variety, no asymmetric scenarios, no scaling threat, no mutually-exclusive choices. Mastery = memorize one 8-step opening.

*(Already fixed before this epic: the "host 4 species" objective counted guests — now counts residents only, so the capstone requires a methane wing + fungal chain.)*

---

## The hitlist (M37–M43)

Priority: **P0** = the two cardinal sins (runaway economy, dead failure-state) ·
**P1** = make the existing systems bite · **P2** = depth & replayability.

| # | Milestone | Fixes finding | Pri | Effort | Status |
|---|-----------|---------------|:---:|:------:|:------:|
| 1 | **M37 — Recurring credit sink** | #1 runaway economy | P0 | M | ✅ shipped |
| 2 | **M39 — Live skirmishes** | #2 dead failure-state | P0 | M | ✅ shipped |
| 3 | **M38 — Incidents with teeth** | #3 ignorable incidents | P1 | M | ✅ shipped |
| 4 | **M40 — Branching tech tree** | #4 shopping-list tech | P1 | L | ✅ shipped |
| 5 | **M41 — Overflow consequences** | #5 caps = idle | P1 | S | ✅ shipped |
| 6 | **M42 — Deeper relations** | (coarse political web) | P2 | M | ✅ shipped |
| 7 | **M43 — Replayability layer** | #6 one-and-done | P2 | L | 🔭 planned |

> **Status:** every Depth-Epic milestone except **M43 (replayability/seeds/scenarios)** has
> shipped. M38/M40/M41/M42 landed together — see the per-spec notes below and
> `STRATEGY.md`/`BALANCE.md` for the live numbers.

**Execution order:** M37 → M39 (the two that change the *core loop*), then M38 →
M41 → M40 (make pressure & progression real), then M42 → M43 (depth & longevity).

---

## Milestone specs

Each is independently shippable: code + `npm run build` + `npm test` (add
headless checks) + `STRATEGY.md`/`BALANCE.md`/`COSTS.md` sync + local commit.

### M37 — Recurring credit sink · P0 · M
**Why:** *"A runaway economy with no sink is the cardinal sin. Give me a burn rate I must out-earn."*

**Scope**
- **Operating upkeep in credits**, scaling with station size: e.g. a small per-second cost per **powered module** (~0.1–0.3¢/s) and/or **per resident wage** (~0.2¢/s). Deducted in `economySystem`.
- A **net-income readout** on the HUD (`+/−¢/s`), so the margin is legible — the player should always see whether they're in the black.
- Early-game grace so a bootstrapping station isn't strangled (e.g. upkeep starts after objective 1, or only applies above N modules), tuned so a *well-run* station profits and a *bloated/idle* one bleeds.

**Acceptance**
- A passive station (no trade/lodging) trends **negative**; an active one stays positive.
- HUD shows live net ¢/s. Headless test: upkeep scales with module/crew count; credits fall when income is removed.

**Files:** `economy.ts`, `ui.ts` (net chip), `BALANCE.md`, `COSTS.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M39 — Live skirmishes · P0 · M
**Why:** *"Feed your crew and the entire tension→skirmish catastrophe is dead code. The combat system is fully built and currently never fires."*

**Scope**
- **Decouple tension ignition from the mood floor.** Add a tension source from **sustained tense-room harmony** (room harmony < ~−0.3) that accrues **regardless of mood** — forcing rivals to share a room long enough should eventually erupt even if everyone is fed.
- And/or: chronic strong friction **slowly erodes mood** so it can actually cross 30 over time.
- Keep the existing mood-based path; separation (own wings + Door) must still fully prevent it — the cure stays *architecture*.

**Acceptance**
- A well-fed Human+Korro room left together long enough **produces a skirmish**; separating them prevents it. (Today it never fires.)
- Headless test: fed rivals in one room → tension reaches 100 and a fight starts within a bounded time; the same crew split into two rooms never fight.

**Files:** `combat.ts` (tension sources), possibly `mood.ts`, `BALANCE.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M38 — Incidents with teeth · P1 · M ✅ SHIPPED
**Why:** *"Incidents are ignorable by construction… the one thing that could kill me is walled off by design."*

**Scope**
- Make incidents **punish a lack of redundancy** rather than be globally neutered:
  - A power surge **may** hit life support **only if** there's no battery buffer / no second generator covering that gas — so the counter is *building redundancy*, not the blanket immunity.
  - **Raider damage scales with station value** (module count or credits), and/or can target life support when undefended — so a fat, unturreted station is genuinely at risk.
- Telegraph clearly (existing toasts) and keep a grace period so a beginner's single room stays safe.

**Acceptance**
- An **unredundant** station can be meaningfully hurt (a module breaks / a wing browns out); a **redundant** one (battery + backup gen + Turret) shrugs it off.
- Headless tests: surge browns out life support without a battery, but not with one; raider damage rises with station size.

**Files:** `events.ts`, `power.ts`, `BALANCE.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M40 — Branching tech tree · P1 · L ✅ SHIPPED
**Why:** *"Four nodes, no prerequisites, no opportunity cost. You buy all four and you're done forever."*

**Scope**
- Add **prerequisites**, **tiers**, and at least one **mutually-exclusive fork** (e.g. a station *specialization*: Industry vs Hospitality vs Security) so ¢ can't buy everything in one run.
- Gate **Tier-2 species/modules** behind Tier-1 nodes; make the methane economy vs fungal economy vs security build a real **choice**, not a checklist.
- Tech panel UI shows the graph (locked/available/owned, prereq lines, exclusivity).

**Acceptance**
- Not everything is unlockable in a single run; picking one fork **locks** its exclusive sibling.
- Headless tests: a node is unbuyable until its prereq is owned; buying one exclusive node disables the other.

**Files:** `research.ts` (graph + prereqs + exclusivity), `ui.ts` (tech tree panel), `BALANCE.md`, `COSTS.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M41 — Overflow consequences · P1 · S ✅ SHIPPED
**Why:** *"Caps that idle production are not economic pressure; they're a screensaver."*

**Scope**
- Overproduction past a cap should **cost** something instead of silently idling: e.g. **spoilage** (meals/biomass decay faster while near cap), a small **morale/efficiency hit** from visible waste, or **back-pressure** that stalls upstream — so *right-sizing* production is a live trade-off.
- Pair with the M37 economy so dumping minerals at cap (no trade capacity) actually hurts.

**Acceptance**
- Overproducing has a measurable downside; sizing production to demand avoids it.
- Headless test: holding a resource at cap incurs the chosen penalty; staying under it does not.

**Files:** `food.ts`/`mining.ts`/`storage.ts`, `ui.ts` (cap warning), `BALANCE.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M42 — Deeper relations · P2 · M ✅ SHIPPED
**Why:** *"Five species, a single ±8 matrix, social clamped at ±30 vs needs worth ±22 — the political web is a minority shareholder in mood."*

**Scope**
- Use the reserved **LOVE/HATE tiers (±15)** for stronger pairings, and/or **raise the social weight** relative to needs so neighbors matter more.
- Add a few **pointed rivalries/alliances** across the roster so layout politics drive more decisions (not just the one Human/Korro pair).

**Acceptance**
- Neighbor relations move mood comparably to needs; at least one new strong rivalry creates a real zoning dilemma.
- Headless test: a HATE pair drives mood/tension materially harder than a DISLIKE pair.

**Files:** `relations.ts`, `mood.ts`, `BALANCE.md`, `STRATEGY.md`, `simcheck.ts`.

---

### M43 — Replayability layer · P2 · L
**Why:** *"There is zero reason to press 'new game.' Mastery = learn the 8-step opening once."*

**Scope**
- **Seeded starts:** vary asteroid placement/richness (and optionally starting stock) from a seed, so the opening isn't identical every time.
- **Asymmetric scenarios:** a small menu — e.g. *Methane Colony* (Thol-only, no O₂ start), *No-Trade Survival* (lodging only), *Derelict* (start with a breach + low power) — each with its own objective ladder.
- **Post-win escalation:** after the scenario is cleared, an endless mode where the raider tier and incident frequency rise, giving the late game an actual threat.

**Acceptance**
- Two new games with different seeds/scenarios play differently from the opening.
- Headless test: the same seed reproduces a layout; different seeds differ; a scenario applies its distinct starting state.

**Files:** `world.ts` (seeded `seedAsteroids`), new `scenarios.ts`, `main.ts` (start menu), `events.ts` (escalation), `persistence.ts` (seed/scenario in save), `BALANCE.md`, `STRATEGY.md`, `simcheck.ts`.

---

## Definition of done (the epic)

A veteran replaying for a second hour finds:
- **A margin to manage** (M37) — income vs upkeep is a live decision, not a one-way ratchet.
- **A reachable failure** (M39, M38) — neglect or under-investment genuinely loses the station; the combat system actually fires.
- **Choices, not checklists** (M40) — tech and overflow force trade-offs (M41).
- **Politics that bite** (M42) and **a reason to start a different run** (M43).

**Re-review target:** the systems reviewer replays and scores it **≥ 7/10** — depth and balance, not just polish.

---

*Epic owner: the EXOSTATION team. Sequenced after the Reviewer's Epic; the lone
remaining Reviewer's-Epic item (M31 audio) is independent and can land any time.*
