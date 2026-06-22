// Audio layer: loads the generated SFX (assets/sfx/*.wav) and plays them by id.
// Web Audio with a master gain + per-category buses (ui / world / music) and a
// mute toggle. Nothing here touches the simulation — main.ts calls play() at the
// event sites, so the sim stays headless/deterministic.

type Bus = "ui" | "world" | "music";
const BUS_VOL: Record<Bus, number> = { ui: 0.6, world: 0.9, music: 0.45 };
const MASTER_VOL = 0.8;
const MUSIC_VOL = 0.135; // soundtrack at 15% of the SFX (world-bus 0.9) level
const TAPE = true; // run the soundtrack through an "old Aiwa tape deck" coloring
const MUTE_KEY = "exo.muted";

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
// tape-head playback character (no added noise): a treble cutoff that drifts like
// head azimuth, plus occasional brief level dropouts (oxide/contact loss).
let musicGain: GainNode | null = null;
let radioFilter: BiquadFilterNode | null = null;
let musicPos = 0;
let muted = (() => {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
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
    for (const b of ["ui", "world", "music"] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = BUS_VOL[b];
      g.connect(master);
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
function tapeChain(c: AudioContext, src: AudioNode, out: AudioNode): void {
  const hp = c.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 70;
  const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 8500;
  const mid = c.createBiquadFilter(); mid.type = "peaking"; mid.frequency.value = 1600; mid.Q.value = 0.8; mid.gain.value = 3;
  const shaper = c.createWaveShaper(); shaper.curve = tapeSaturationCurve(1.7); shaper.oversample = "2x";
  const delay = c.createDelay(0.1); delay.delayTime.value = 0.02; // base; the LFOs wobble it
  const wow = c.createOscillator(); wow.frequency.value = 0.6;
  const wowAmt = c.createGain(); wowAmt.gain.value = 0.0035; wow.connect(wowAmt).connect(delay.delayTime);
  const flutter = c.createOscillator(); flutter.frequency.value = 7.5;
  const flutAmt = c.createGain(); flutAmt.gain.value = 0.0009; flutter.connect(flutAmt).connect(delay.delayTime);
  wow.start(); flutter.start();
  src.connect(hp); hp.connect(lp); lp.connect(mid); mid.connect(shaper); shaper.connect(delay); delay.connect(out);
  // (no hiss bed — white noise read as "broken"; the tape feel comes from the
  // wow/flutter warble, saturation, band-limiting, head-bump + the tape-head
  // dropouts/azimuth drift in startTapeHead().)
}

function startMusic(): void {
  if (!ctx || !master) return;
  const mods = import.meta.glob("../assets/music/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
  tracks = Object.values(mods);
  if (tracks.length === 0) return;
  const gain = ctx.createGain();
  gain.gain.value = MUSIC_VOL;
  // tape-head stage: music → a treble lowpass (drifts like head azimuth) → master.
  const radioLP = ctx.createBiquadFilter();
  radioLP.type = "lowpass";
  radioLP.frequency.value = 14000;
  gain.connect(radioLP).connect(master);
  musicGain = gain;
  radioFilter = radioLP;
  startTapeHead();
  musicEl = new Audio();
  musicEl.preload = "auto";
  const src = ctx.createMediaElementSource(musicEl); // route through the mixer
  if (TAPE) tapeChain(ctx, src, gain);
  else src.connect(gain);
  musicEl.addEventListener("ended", () => {
    musicPos++;
    if (musicPos >= order.length) reshuffle();
    playTrack();
  });
  order = tracks.map((_, i) => i);
  reshuffle();
  if (!muted) playTrack();
}
function playTrack(): void {
  if (!musicEl || tracks.length === 0) return;
  musicEl.src = tracks[order[musicPos]];
  musicEl.play().catch(() => {
    /* autoplay/availability — ignore */
  });
}
// Tape-head reading character — NO added noise, just mechanical artifacts:
//  · treble cutoff drifts (head azimuth wander) — stays mostly bright so it never
//    sounds "broken", just analog;
//  · occasional brief level dropouts (oxide shedding / momentary contact loss).
function startTapeHead(): void {
  setInterval(() => {
    if (!ctx || !musicGain || !radioFilter) return;
    const t = ctx.currentTime;
    radioFilter.frequency.setTargetAtTime(7000 + Math.random() * 9000, t, 0.6); // azimuth drift
    if (Math.random() < 0.12) {
      // a quick dropout, then it recovers — like the head losing the tape for a beat
      musicGain.gain.cancelScheduledValues(t);
      musicGain.gain.setTargetAtTime(MUSIC_VOL * (0.2 + Math.random() * 0.2), t, 0.04);
      musicGain.gain.setTargetAtTime(MUSIC_VOL, t + 0.1 + Math.random() * 0.18, 0.08);
    } else {
      musicGain.gain.setTargetAtTime(MUSIC_VOL, t, 0.3);
    }
  }, 500);
}

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
    if (m) musicEl.pause();
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
