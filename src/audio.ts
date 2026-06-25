// Audio layer: loads the generated SFX (assets/sfx/*.wav) and plays them by id.
// Web Audio with a master gain + per-category buses (ui / world / music) and a
// mute toggle. Nothing here touches the simulation — main.ts calls play() at the
// event sites, so the sim stays headless/deterministic.

type Bus = "ui" | "world" | "music";
const BUS_VOL: Record<Bus, number> = { ui: 0.6, world: 0.9, music: 0.45 };
const MASTER_VOL = 0.8;
const MUSIC_VOL = 0.135; // soundtrack at 15% of the SFX (world-bus 0.9) level
const MUTE_KEY = "exo.muted";
const MUSIC_MUTE_KEY = "exo.musicMuted"; // music-only toggle (separate from the master mute)

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const buses = {} as Record<Bus, GainNode>;
const buffers = new Map<string, AudioBuffer>();
const lastAt = new Map<string, number>();
let ready = false;

// background soundtrack (streamed): shuffle the assets/music folder, play through
// without repeats, then reshuffle and continue.
let musicEl: HTMLAudioElement | null = null;
let tracks: string[] = [];
let order: number[] = [];
let musicPos = 0;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();
let musicMuted = (() => {
  try {
    return localStorage.getItem(MUSIC_MUTE_KEY) === "1";
  } catch {
    return false;
  }
})();

function busOf(id: string): Bus {
  if (id.startsWith("ui-") || id.startsWith("build-") || id.startsWith("drag-") || id.startsWith("modal-")) return "ui";
  if (id.startsWith("ambient-") || id.startsWith("music-")) return "music";
  return "world";
}

// Wait for the first user gesture (browsers block audio until then), then boot.
export function initAudio(): void {
  const start = (): void => {
    window.removeEventListener("pointerdown", start);
    window.removeEventListener("keydown", start);
    void boot();
  };
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("keydown", start, { once: true });
  // a quiet click on any button → ui feedback (specific cues layer on top)
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("button") && !t.closest("#encounter") && !t.closest("#firstcontact")) play("ui-click");
  });
}

async function boot(): Promise<void> {
  try {
    ctx = new AudioContext();
    void ctx.resume(); // some browsers create it suspended even inside a gesture
    master = ctx.createGain();
    master.gain.value = muted ? 0 : MASTER_VOL;
    master.connect(ctx.destination);
    // 80s tape-deck coloring on the SFX/ambient path: a worn-cassette band-limit
    // (dull highs), a boxy mid bump, soft saturation and a gentle wow/flutter
    // warble — so the whole game reads like it's coming off a tape deck. (The
    // streamed soundtrack has its own tape chain and bypasses this.)
    const sfxTape = ctx.createGain();
    tapeChain(ctx, sfxTape, master, { lpF: 5200, hpF: 90, midF: 1400, midG: 4, sat: 2.1, wowHz: 0.7, wowAmt: 0.0022, flutHz: 8.5, flutAmt: 0.0013 });
    for (const b of ["ui", "world", "music"] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = BUS_VOL[b];
      g.connect(sfxTape); // through the cassette stage
      buses[b] = g;
    }
    const mods = import.meta.glob("../assets/sfx/*.wav", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
    await Promise.all(
      Object.entries(mods).map(async ([path, url]) => {
        const id = path.split("/").pop()!.replace(".wav", "");
        try {
          const ab = await (await fetch(url)).arrayBuffer();
          buffers.set(id, await ctx!.decodeAudioData(ab));
        } catch {
          /* skip a bad file */
        }
      }),
    );
    ready = true;
    loop("ambient-station");
    startMusic();
  } catch {
    /* no audio available — stay silent */
  }
}

// ---- soundtrack -------------------------------------------------------------
function shuffle(a: number[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}
function reshuffle(): void {
  const last = order.length ? order[order.length - 1] : -1;
  do {
    shuffle(order);
  } while (order.length > 1 && order[0] === last); // don't repeat across the seam
  musicPos = 0;
}
// Soft-clip curve for tape saturation (gentle tanh — warm, slightly compressed).
function tapeSaturationCurve(amount = 1.7) {
  const n = 1024, c = new Float32Array(new ArrayBuffer(n * 4));
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amount); }
  return c;
}

// Color the music path like a worn cassette deck: band-limit (dull highs, thin
// lows) + a mid "boxy" bump, soft-saturate, then warble the pitch with a delay
// modulated by a slow WOW and a faster FLUTTER LFO, and lay a faint hiss bed
// underneath (routed to master so Mute kills it too). src → … → out.
type TapeOpts = { lpF?: number; hpF?: number; midF?: number; midG?: number; sat?: number; wowHz?: number; wowAmt?: number; flutHz?: number; flutAmt?: number };
function tapeChain(c: AudioContext, src: AudioNode, out: AudioNode, o: TapeOpts = {}): void {
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = o.hpF ?? 70;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = o.lpF ?? 8500;
  const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = o.midF ?? 1600; mid.Q.value = 0.8; mid.gain.value = o.midG ?? 3;
  const shaper = c.createWaveShaper(); shaper.curve = tapeSaturationCurve(o.sat ?? 1.7); shaper.oversample = "2x";
  const delay = c.createDelay(0.1); delay.delayTime.value = 0.02; // base; the LFOs wobble it
  const wow = c.createOscillator(); wow.frequency.value = o.wowHz ?? 0.6;
  const wowAmt = c.createGain(); wowAmt.gain.value = o.wowAmt ?? 0.0035; wow.connect(wowAmt).connect(delay.delayTime);
  const flutter = c.createOscillator(); flutter.frequency.value = o.flutHz ?? 7.5;
  const flutAmt = c.createGain(); flutAmt.gain.value = o.flutAmt ?? 0.0009; flutter.connect(flutAmt).connect(delay.delayTime);
  wow.start(); flutter.start();
  src.connect(hp); hp.connect(lp); lp.connect(mid); mid.connect(shaper); shaper.connect(delay); delay.connect(out);
  // (no hiss bed — white noise read as "broken"; the tape feel comes from the
  // wow/flutter warble, saturation, band-limiting + the boxy mid head-bump.)
}

function startMusic(): void {
  if (!ctx || !master) return;
  const mods = import.meta.glob("../assets/music/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
  tracks = Object.values(mods);
  if (tracks.length === 0) return;
  const gain = ctx.createGain();
  gain.gain.value = MUSIC_VOL; // constant level
  gain.connect(master); // straight to master — NO effects on music
  musicEl = new Audio();
  musicEl.preload = "auto";
  const src = ctx.createMediaElementSource(musicEl);
  src.connect(gain); // raw, unprocessed music
  musicEl.addEventListener("ended", () => {
    musicPos++;
    if (musicPos >= order.length) reshuffle();
    playTrack();
  });
  // Fresh shuffle on every game load, AND a random starting position so even the
  // first track differs each time the page loads.
  order = tracks.map((_, i) => i);
  reshuffle();
  musicPos = order.length ? Math.floor(Math.random() * order.length) : 0;
  if (!muted && !musicMuted) playTrack();
}
function playTrack(): void {
  if (!musicEl || tracks.length === 0 || musicMuted) return;
  musicEl.src = tracks[order[musicPos]];
  musicEl.play().catch(() => {
    /* autoplay/availability — ignore */
  });
}
// (Volume ducking / azimuth-drift removed — music plays at a steady level. The
// only "walkman" character left is the wow/flutter pitch wobble in tapeChain.)

// Per-play variation so a repeated event never sounds identical: every one-shot
// gets a small random pitch + loudness wobble (and a hair of timing). One sound,
// many "takes" — keeps the SFX from feeling like a loop. (rand in [-1,1].)
const VARY_PITCH = 0.06; // ±6% playback rate ≈ ±1 semitone
const VARY_VOL = 0.14; // ±14% loudness
const VARY_DELAY = 0.012; // up to 12 ms of attack jitter
const wob = () => Math.random() * 2 - 1;

// Play a one-shot. Same-id calls are throttled so rapid events don't machine-gun.
export function play(id: string, opts: { volume?: number; rate?: number } = {}): void {
  if (!ready || muted || !ctx) return;
  const buf = buffers.get(id);
  if (!buf) return;
  const now = ctx.currentTime;
  if (now - (lastAt.get(id) ?? -1) < 0.04) return;
  lastAt.set(id, now);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = (opts.rate ?? 1) * (1 + wob() * VARY_PITCH);
  const g = ctx.createGain();
  g.gain.value = Math.max(0, (opts.volume ?? 1) * (1 + wob() * VARY_VOL));
  src.connect(g).connect(buses[busOf(id)]);
  src.start(now + Math.random() * VARY_DELAY);
}

function loop(id: string): void {
  if (!ready || !ctx) return;
  const buf = buffers.get(id);
  if (!buf) return;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.connect(buses[busOf(id)]);
  src.start();
}

export function setMuted(m: boolean): void {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : MASTER_VOL, ctx.currentTime, 0.02);
  if (musicEl) {
    if (m || musicMuted) musicEl.pause();
    else if (ready) {
      if (!musicEl.src) playTrack();
      else void musicEl.play().catch(() => {});
    }
  }
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
}
export function isMuted(): boolean {
  return muted;
}

// Music-only toggle (independent of the master sound mute): silences the
// soundtrack but leaves SFX playing.
export function setMusicMuted(m: boolean): void {
  musicMuted = m;
  if (musicEl) {
    if (m) musicEl.pause();
    else if (ready && !muted) {
      if (!musicEl.src) playTrack();
      else void musicEl.play().catch(() => {});
    }
  }
  try {
    localStorage.setItem(MUSIC_MUTE_KEY, m ? "1" : "0");
  } catch {
    /* ignore */
  }
}
export function isMusicMuted(): boolean {
  return musicMuted;
}
