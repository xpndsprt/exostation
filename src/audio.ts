// Audio layer: loads the generated SFX (assets/sfx/*.wav) and plays them by id.
// Web Audio with a master gain + per-category buses (ui / world / music) and a
// mute toggle. Nothing here touches the simulation — main.ts calls play() at the
// event sites, so the sim stays headless/deterministic.

type Bus = "ui" | "world" | "music";
const BUS_VOL: Record<Bus, number> = { ui: 0.6, world: 0.9, music: 0.45 };
const MASTER_VOL = 0.8;
const MUSIC_VOL = 0.27; // soundtrack at ~30% of the SFX (world-bus) level
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
function startMusic(): void {
  if (!ctx || !master) return;
  const mods = import.meta.glob("../assets/music/*.mp3", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
  tracks = Object.values(mods);
  if (tracks.length === 0) return;
  const gain = ctx.createGain();
  gain.gain.value = MUSIC_VOL;
  gain.connect(master);
  musicEl = new Audio();
  musicEl.preload = "auto";
  ctx.createMediaElementSource(musicEl).connect(gain); // route through the mixer
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
  src.playbackRate.value = opts.rate ?? 1;
  const g = ctx.createGain();
  g.gain.value = opts.volume ?? 1;
  src.connect(g).connect(buses[busOf(id)]);
  src.start();
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
