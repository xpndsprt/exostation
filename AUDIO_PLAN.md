# EXOSTATION — Sound Effects & Audio Plan (M31)

> **Status: 🔭 planned (catalog only — no audio implemented yet).** This is the
> full wish-list of sound effects (gameplay + UI) plus ambient/music beds, to
> decide scope from. Nothing here is wired up; once we pick the subset, we'll add a
> tiny Web-Audio layer and trigger hooks. Keep this in sync as sounds land (tick
> them off / flip the status).

Each entry is **`name` — when it fires (code hook) — character**. "Loop" marks a
sustained/ambient sound; everything else is a one-shot. Most one-shots can be
driven off the existing **`world.notify`** toast queue and the system events we
already emit; a few need new tiny hooks (noted).

---

## Sourcing & generation
- **⚙️ Generator (shipped):** `npm run gen:sfx` (`scripts/gensfx.mjs`) synthesizes
  **every** id below to `assets/sfx/<id>.wav` + a `manifest.json` — dependency-free
  pure-math synthesis (oscillators + noise + envelopes), so it's reproducible and
  **CC0-clean** (no downloads, no API keys, no licensing). 56 cues, ~2.4 MB.
- **Swap in a better sample any time:** drop a `assets/sfx/<id>.wav` of your own
  (an AI-generated or downloaded CC0 sound) — same filename wins; the audio layer
  just loads by id. Good sources: **ElevenLabs / Stable Audio** (text-to-SFX),
  **Kenney.nl** (CC0 UI/sci-fi packs), **Sonniss GDC bundle**, **freesound.org**
  (filter CC0). Keep music beds (`music-*`) as the area most worth a real sample.
- **Alternative (no files at all):** a runtime generator like **ZzFX** can play
  these from tiny param arrays instead of wavs — swap-in later if bundle size matters.

## 0 · How it will hook in (for later)
- A small **`src/audio.ts`**: a Web-Audio mixer with **master volume + per-category
  buses** (UI / world / alerts / ambient / music), a **mute toggle**, and a play(id,
  {volume, rate, pan?}) call. Sounds are short generated tones/noise or tiny sample
  files; pitch-vary one-shots slightly so repeats don't grate.
- **Triggers:** most map to events we already detect — toast pushes (`pushAlert`),
  `world.notify` strings, phase/objective transitions, `needRedraw` edits, ship
  lifecycle phases, encounter open/resolve, injury/heal. A handful need a one-line
  emit (marked **[new hook]**).
- **Respect speed/pause:** suppress ambient loops at pause; rate-limit repetitive
  one-shots (footsteps, build-drag) so they don't spam at 3× speed.
- **Positional (optional later):** pan/volume by camera distance for world sounds
  (raider beam, shuttle landing, breach).

---

## 1 · UI & build
- **ui-click** — any HUD/panel button press — soft tactile tick.
- **ui-tool-select** — choosing a palette tool — light selector blip.
- **ui-tab** — collapse/expand a right-column panel (tech/requests/alienpedia) — short swish.
- **ui-toggle** — speed change / overlay toggle / module on-off — two-tone click (up vs down).
- **build-floor** — lay a Deck Tile (per drag-cell, rate-limited) — soft mechanical clink.
- **build-wall** — place a Wall — heavier metal clank.
- **build-door** — place a Door/airlock — pneumatic hiss-clunk.
- **build-module** — place any powered module — solid "thunk + power-on chirp".
- **build-deconstruct** — erase/deconstruct — reverse disassembly clatter.
- **build-invalid** — can't afford / invalid placement (ghost red) — dull error buzz.
- **drag-tick** — while drag-sizing a rectangle, per added cell — very soft tick (rate-limited).
- **modal-open / modal-close** — any dialog (saves, end banner) opens/closes — subtle whoosh.

## 2 · Economy & research
- **credits-trade** — a trader buys minerals (trade payout) — bright cash chime.
- **credits-fuel** — a docking ship buys fuel — softer coin/refuel chime (lower than trade).
- **lodging-tick** — *optional, probably skip:* guests paying lodging — too frequent; better as a periodic soft cue or none.
- **research-buy** — an unlock is purchased — ascending confirmation arpeggio.
- **research-denied** — clicking a locked/too-expensive node — short "nope" tone (pairs with the toast).
- **doctrine-pick** — choosing a mutually-exclusive doctrine — weightier, "committed" chord. **[new hook]**
- **overflow-warn** — a store hits its cap and starts spoiling — low warble (once on entering overflow).

## 3 · Crew, needs & life support
- **crew-arrive** — a resident shuttle drops new crew — friendly "welcome" tone (pairs with arrival toast).
- **guest-arrive** — a guest disembarks — lighter chime variant.
- **crew-depart** — a guest leaves — soft outro blip.
- **need-eat / need-sleep / need-relax** — *optional, subtle:* an agent starts eating/sleeping/relaxing — quiet one-shots; likely skip or very low volume to avoid clutter.
- **mood-low** — station average mood crosses below the warning line — soft worried tone.
- **o2-hum** *(loop)* — ambient O₂ life-support hum in breathable O₂ rooms.
- **ch4-hum** *(loop)* — ambient methane-wing hum (deeper/eerier than O₂).
- **suffocation-warn** — a crew member's air drops critical — rising distress tone (pairs with "can't breathe" toast).
- **crew-death** — any crew/guest dies — somber low knell.

## 4 · Ships, docking & mining
- **shuttle-approach** *(loop, fades)* — a shuttle is in its "in" flight phase — distant engine whoosh that grows.
- **shuttle-land** — shuttle settles on the pad (in→wait) — descending thrusters + soft touchdown thud. **[hook: phase transition]**
- **shuttle-takeoff** — shuttle departs (wait→out) — thruster surge.
- **pad-blink** — *probably skip:* the pad guide lights; ambient-only, no sound.
- **drone-launch** — a mining drone lifts off its bay pad (docked→outbound) — small servo whirr. **[hook: drone state]**
- **drone-mine** *(loop)* — drone extracting at an asteroid — gritty drilling/laser hum.
- **drone-return** — drone lands + unloads minerals (inbound→docked) — clunk + ore-dump rattle.

## 5 · Combat & incidents
- **alert-incident** — any station incident fires — attention klaxon (1 short blast; severity-tinted).
- **power-surge** — a module trips offline from a surge — electric zap + power-down whine.
- **brownout** — power shortfall begins shedding load — warning hum drop (pairs with brownout toast).
- **power-restored** — supply recovers / brownout clears — rising power-up tone.
- **breach-klaxon** — a hull breach opens — urgent repeating alarm (the most alarming cue).
- **breach-sealed** — crew finish resealing a breach — relief "all-clear" tone.
- **market-shock** — prices spike/crash — two flavors: bright "surge" vs muted "crash".
- **raider-inbound** — a raider spawns — menacing low brass sting (pairs with "Raider inbound" toast).
- **raider-beam** *(loop)* — raider actively attacking a module — pulsing energy-weapon drone.
- **module-destroyed** — a module is wrecked by a raid — crunchy explosion/debris.
- **turret-fire** — a powered Turret shoots a raider down — sharp zap + small boom.
- **skirmish-start** — tension hits 100 and a fight erupts — tense stinger.
- **hit-blow** — a combat blow lands (rate-limited) — dull impact thwack.

## 6 · Social encounters & medical *(new systems)*
- **encounter-conflict** — a clash encounter dialog opens — tense rising sting (red).
- **encounter-bond** — a bond encounter dialog opens — warm friendly chime (green).
- **encounter-choice** — clicking a response button — firm select click.
- **outcome-good** — encounter resolves well (defused / bonded / party) — pleasant resolve chord.
- **outcome-bad** — encounter resolves badly (a brawl / someone injured) — harsh discordant hit.
- **injury** — a crew member becomes wounded (encounter/skirmish/risky repair) — sharp "ow" impact + wince. **[hook: injure()]**
- **medbay-heal** — a wounded crew member fully recovers in the Med Bay — gentle restorative shimmer.
- **wound-death** — an untreated wounded crew member bleeds out — heavier, sadder knell than a normal death.
- **repair-spark** *(loop, optional)* — crew servicing machinery — intermittent welding/spark; high-tier repairs sound heavier (foreshadowing injury risk).

## 7 · Objectives, beacon & end states
- **objective-complete** — an objective ladder step is cleared — satisfying progression jingle.
- **beacon-charge** *(loop, optional)* — a beacon module is active and charging — subtle building harmonic; intensifies as more modules charge.
- **beacon-module-online** — a signature module first activates (species present + powered) — distinct "system online" tone. **[new hook]**
- **victory** — the scenario is won (all objectives, beacon charged) — full triumphant fanfare.
- **defeat** — the station is lost — descending failure sting + power-down.

## 8 · First contact
- **first-contact** — the first-ever appearance of a species opens its card — mysterious, awe-tinged sting (one signature riff; optionally a faint per-species timbre tint).

## 9 · Ambient beds & music
- **ambient-station** *(loop)* — base hull/space-station room tone under everything (very low volume).
- **ambient-power** *(loop, optional)* — a faint generator/electrical bed that scales with power draw.
- **music-calm** *(loop)* — relaxed exploration/management theme during normal play.
- **music-tension** *(loop)* — layered tension bed that fades in during raids/skirmishes/breaches, out when safe (crossfade with calm).
- **music-victory / music-defeat** *(one-shot)* — end-state stingers over the banner.

---

## Suggested first slice (if we want a minimal, high-impact set first)
A dozen one-shots cover ~80% of the feel: **ui-click, build-module, build-invalid,
research-buy, crew-arrive, shuttle-land, brownout, breach-klaxon, raider-inbound,
injury, objective-complete, victory/defeat** — plus one **ambient-station** loop and
a **mute** toggle. Everything else layers on from there.
