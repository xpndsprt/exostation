# EXOSTATION — Dynamic Lighting & Shadows Plan

> **Status: ⚙️ SHIPPED (core + height shadows).** Implemented in `src/renderer.ts`:
> **baked** shadows for player-placed lights (Light Fixtures + glowing modules) and a
> **dynamic per-character lamp** that **casts a moving shadow** as the agent traverses.
> **Update:** the binary grid-shadowcast has been replaced by a **per-cell height-field
> march** (`buildOccluders` fills `heightField` from `baseHeight` per kind, walls
> tallest; `accumulateH` walks the sight line to each light and shadows a cell when a
> taller cell blocks the ray rising from the floor to the light's mount height). So
> **taller modules throw longer shadows** and **shadow length/direction follow each
> light** — the per-sprite height maps (`makeHeightTexture`, visible via the editor's
> height-map panel and the in-game **Shift+H** inspector) now actually drive lighting.
> Phase 5 (true per-texel relighting / sharp polygon shadows) remains 🔭 optional.

---

## 1 · Goal (what the player should see)

1. **Player-placed lights cast real, BAKED shadows.** A Light Fixture (or glowing
   module) throws light that is **occluded by walls and modules** — a crate/generator
   between the lamp and a corner leaves a genuine dark wedge behind it, not a uniform
   glow. Because these sources don't move, their shadows are **baked once** (recomputed
   only when geometry or lights change) so they cost **nothing per frame**.
2. **Every character carries a moving lamp.** Each crew member / guest emits a small
   personal light pool (~**2–3 cells** radius) that **raycasts around them** — blocked
   by walls, spilling through doorways. Crucially it is **dynamic**: as the character
   walks past a wall or a module, its **shadow sweeps and stretches** in real time
   (the RimWorld "pawn carrying a lamp" look). A lone crew member lights its own patch
   of a dark corridor and throws a shadow ahead of itself.
3. **It stays efficient** at 80×80 with dozens of agents at 3× speed — no per-pixel
   CPU raymarching, no per-frame full rebakes; only the tiny moving lamps update live.

The visual target is Prison Architect / RimWorld-grade readability: a dim hull,
warm baked pools around fixtures, and small **moving** light+shadow around each
character as it traverses.

---

## 2 · Where we are today (current lighting)

`src/renderer.ts` already has the compositing skeleton we'll build on:

- A **world-space lightmap** (`lightRT`, a `RenderTexture`) is filled with an
  **ambient dark tint** over interior cells, then **additive radial light pools**
  (`gradTex`, a soft radial gradient sprite) are drawn at each powered emitter
  (`GLOW` table: lamp, generators, lounge…). The lightmap is composited over the
  scene with **`multiply`** blend.
- The lightmap only rebuilds when a **signature** (`lightSig`) changes (lights /
  rooms / power), so it's already frame-cheap.
- **Shadows are faked:** each module draws a soft drop-shadow **offset away from
  the nearest light** by a per-kind `HEIGHT`. There is **no occlusion** — light
  passes through walls and modules.

**What's missing:** occlusion. Light bleeds across walls; the drop-shadows are a
cosmetic offset, not a cast shape. And nothing lights moving characters locally.

We keep the **RT + multiply composite** and the **radial gradient** approach; we
replace "draw a glow blob" with "draw a glow blob **masked by a visibility shape**."

---

## 3 · Core technique — grid shadowcasting (not per-pixel raymarch)

> **As built:** instead of stamping a gradient sprite per visible cell into an RT,
> the implementation accumulates each light's `colour × intensity × falloff` into a
> **CPU per-cell light buffer** (`Float32Array`, RGB), writes it to a **1px-per-cell
> canvas**, and draws that canvas over the world as a single **bilinear-upscaled,
> multiply-blended** sprite. Same result, simpler overlap handling, and the bilinear
> upscale *is* the soft-shadow blur. Static lights bake into one buffer; the dynamic
> pass copies it and adds character lamps each frame. (`src/renderer.ts`:
> `bakeStatic` / `updateHeadlights` / `accumulate` / `shadowcast`.)

The station is a grid, so the cheapest correct occlusion is **symmetric recursive
shadowcasting** (the classic roguelike FOV algorithm) run per light:

- Input: a light origin cell, a radius, and a **per-cell opacity grid** ("does this
  cell block light?"). Output: the set of cells the light **reaches** (a visibility
  field), with a 0..1 falloff by distance.
- It's integer, branch-light, processes each cell in radius **once**, and is
  symmetric (no asymmetry artifacts). Cost ≈ O(cells within radius).

We **do not** raymarch pixels on the CPU. We compute **per-cell** visibility, then
let the GPU smooth it:

- For each lit cell, stamp the **radial gradient sprite** (or a per-light gradient)
  **only where the cell is visible**, additively, into the light RT. Equivalent:
  build a small per-light coverage mask and multiply the gradient by it.
- Smoothing/soft edges come from (a) the gradient falloff and (b) an optional
  **downscale-blur** of the whole light RT (render at ½ res, let bilinear upscale
  feather the shadow edges). This gives "soft enough" shadows for free.

> Alternative considered: **visibility-polygon raycasting to wall corners** (cast
> rays to occluder vertices, build a light polygon, draw it as a masked gradient).
> It yields sharper, resolution-independent shadows but needs an occluder-segment
> list, robust polygon construction, and a stencil/mask pass. **Decision:** start
> with grid shadowcasting (simpler, fast, matches the tile aesthetic). Keep the
> polygon method as a future "sharp shadows" upgrade behind the same RT interface.

### Occluder model (the opacity grid)

A `Uint8` grid, one byte per cell, rebuilt only when geometry changes:

- **Walls / closed structure cells** → fully opaque (block light).
- **Doors** → opaque when "shut" for gas, but **we treat them as light-passing**
  (a lit doorway reads better); tunable.
- **Modules** → occlude based on a **height tier** (reuse the existing `HEIGHT`
  idea): tall modules (generators, vats, silos) block; low ones (pods, lamps,
  floor pads) don't. This is the "heightmap per module" the brief asked for, but
  reduced to the only thing a top-down 2D cast needs: a **per-cell block flag**
  derived from module height. (True per-texel height isn't needed for grid casts;
  we revisit it only if we adopt normal-mapped relighting later.)
- **Characters never occlude** (so crew don't shadow each other — avoids flicker
  and keeps headlights stable).

A light's own origin cell and immediate ring are always lit (no self-shadow pop).

---

## 4 · Two light layers

### 4a · Baked static layer (fixtures + glowing modules)

- Compute **once** whenever the bake signature changes — same gating as today's
  `lightSig`, extended to include the occluder grid's hash. Inputs: ambient level,
  occluder grid, list of static emitters `[cell, radius, color, intensity]`.
- For each emitter: run shadowcasting → accumulate its falloff-weighted gradient
  into a **static light RT** (additive).
- Result is a texture that already contains **fixture light + cast shadows**. Per
  frame it costs **one textured quad** (composite), exactly like now.
- Rebake triggers: build/erase a wall/module, toggle/repower an emitter, room
  re-detect, light fixture added/removed. None of these happen per frame.

### 4b · Dynamic character-lamp layer (moving lights + moving shadows)

- A separate **dynamic light RT** (or the same RT drawn after the static one),
  cleared and rebuilt **each frame** — but only from cheap inputs:
  - For each **on-screen, alive** agent: a small shadowcast at **radius 2–3** (a
    ≤7×7 window) against the same occluder grid, stamped as a small gradient. Because
    the cast is re-run from the agent's **current cell each frame**, the dark wedge
    behind any nearby wall/module **moves and stretches as the agent walks** — that's
    the "pawn carrying a lamp" shadow, not a static blob.
  - Tint the lamp slightly by species or keep a neutral warm white; the pool slides
    with `agentCenter` (sub-cell position) for smoothness between cells.
- Budget: radius-3 shadowcast ≈ ~25 cell visits; 40 agents ≈ ~1k ops/frame — trivial.
  Cap to on-screen agents; optionally re-cast only when an agent **changes cell** (and
  just slide the stamp between casts) for extra headroom.
- Compositing: `staticLightRT + dynamicLightRT` (additive) → the combined light,
  then **multiply** over the scene (one extra blend vs today).

### Final composite per frame

```
scene (tiles, modules, agents, ships)
  ×  ( ambient  +  bakedStaticLight  +  dynamicHeadlights )   // multiply
```

`ambient` is the existing dim interior fill (vacuum/space stays black). Anything
unlit reads as the ambient floor, lit areas brighten toward the emitter color.

---

## 5 · Efficiency summary

| Layer | Recompute when | Per-frame cost |
|-------|----------------|----------------|
| Occluder grid | geometry changes (rare) | none |
| Static bake (fixtures) | bake signature changes (rare) | 1 composite quad |
| Headlights | every frame (cheap) | ~N_onscreen small shadowcasts + N stamps |
| Composite | every frame | 1–2 multiply blends |

Key efficiency rules:
- **No per-pixel CPU work.** Visibility is per-cell; the GPU does the smoothing.
- **Bake the expensive stuff** (fixtures with full-room radius) and never touch it
  per frame; only the small, local headlights are dynamic.
- **Render lights at ½ resolution** into the RT and upscale — halves fill cost and
  softens shadow edges for free.
- **Cull** dynamic lights to the camera viewport; skip dead/suited-irrelevant cases.
- Reuse one **gradient texture** scaled per radius instead of per-light textures.

---

## 6 · Data & module touch-points

- `src/renderer.ts` — the home of all of this. Add: `occluderGrid` (Uint8 + hash),
  `staticLightRT`, `dynamicLightRT`, a `shadowcast(origin, radius, opacity) → cells`
  helper, a `stampLight(rt, cell, radius, color, falloffMask)` helper, and a
  `buildOccluders(world)`. Extend the existing `updateLighting`/`lightSig` flow into
  `bakeStaticLights()` (gated) + `updateHeadlights()` (per frame).
- `src/structures.ts` — formalize the **height/occlusion tier** per `StructureKind`
  (promote the renderer's `HEIGHT` map to data: `{ blocksLight: boolean, height }`).
  Light emitters stay in the renderer's `GLOW` table (add per-emitter radius there).
- `src/config.ts` — lighting tunables (ambient level, headlight radius/intensity,
  RT downscale factor, door-blocks-light flag).
- No **simulation/state** changes: lighting is pure render. `World` stays
  serializable; save/load is unaffected. Headlights derive from agent positions
  already in `World`.
- `assets/sprites.js` — unaffected (no new art needed; Light Fixture already exists).

---

## 7 · Phased implementation

1. **Occluder grid + shadowcast helper.** Build the opacity grid from walls +
   module height tiers; implement symmetric shadowcasting; unit-test reachability
   in `scripts/simcheck.ts` (pure-function: a wall blocks the cell behind it; an
   open doorway passes; radius is respected). *No visual change yet.*
2. **Bake fixture shadows.** Replace the unmasked glow blobs with shadowcast-masked
   gradients in the static RT (gated rebake). Walls now stop light. Remove/retire
   the fake drop-shadow offset (or keep a faint contact shadow under tall modules).
3. **Character lamps.** Add the per-agent dynamic light layer (radius 2–3, viewport-
   culled, re-cast on cell change), composite static + dynamic. Verify the shadow
   sweeps as an agent walks past a wall/module. Tune ambient so the lamps matter.
4. **Polish & perf.** ½-res light RT + bilinear soften; optional light color per
   emitter/species; verify 3× speed with 40+ agents stays smooth; expose tunables.
5. **(Optional later)** Swap grid shadowcast for **visibility-polygon** raycasting
   behind the same RT interface for sharper shadows; or add normal-mapped module
   relighting if we want directional highlights (this is where a true per-texel
   heightmap would come in).

---

## 8 · Acceptance criteria

- A Light Fixture with a wall/large module between it and a corner leaves a visible
  **dark wedge** (occlusion), not a uniform glow.
- A crew member in an unlit corridor is surrounded by a **2–3 cell** light pool that
  is **clipped by walls** and **spills through an open door**, and **its shadow visibly
  sweeps** as the character walks past a wall or module.
- Building/erasing a wall updates the baked shadows; **no per-frame rebake** of the
  static layer (verify via a rebuild-count/log).
- Frame time at 80×80, 40 agents, 3× speed is within budget (no measurable drop vs
  today's lightmap-only path beyond the one extra dynamic composite).
- `World` remains plain-JSON-serializable; save/load and `npm test` unaffected.

---

## 9 · Risks & notes

- **PixiJS 8 RT churn:** clearing/redrawing the dynamic RT each frame is fine, but
  allocate the RTs once and reuse; avoid per-frame `RenderTexture` creation.
- **Shadow acne / popping at light origins:** always light the origin cell and its
  first ring; use symmetric shadowcasting (asymmetric variants flicker as agents move).
- **Door semantics:** light-passing doors look best but can leak gas-zone reading
  cues — keep it a single tunable so we can flip it.
- **Over-darkening:** headlights must not make an unlit but *powered* room feel
  broken; ambient floor + fixture bake should keep built rooms readable, with
  headlights as an accent, not the only light.
- **Scope discipline:** grid shadowcasting first. Polygon/normal-map upgrades are
  explicitly deferred to Phase 5 so the first version ships.
