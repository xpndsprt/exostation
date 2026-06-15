// EXOSTATION — sound-effect generator.
//   node scripts/gensfx.mjs   (or: npm run gen:sfx)
//
// Synthesizes every sound in AUDIO_PLAN.md to a 16-bit mono WAV in assets/sfx/,
// plus a manifest.json. Zero dependencies, zero network, zero licensing — pure
// math (oscillators + noise + envelopes), so it's reproducible and CC0-clean.
// To use a real/AI sample for one cue instead, drop your wav in assets/sfx/ with
// the same id filename and remove it from the table here (or just let it override).
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sfx");

// ---- tiny synth ---------------------------------------------------------------
// A "voice" is (buf) => void that adds itself into the float sample buffer.
function osc(o) {
  const { wave = "sine", f0, f1 = f0, dur, vol = 0.5, delay = 0, attack = 0.004, decay = 0.15, vib = 0, vibHz = 6 } = o;
  return (buf) => {
    const start = (delay * SR) | 0, n = (dur * SR) | 0;
    let phase = 0;
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      if (idx >= buf.length) break;
      const t = i / SR, frac = t / dur;
      let f = f0 * Math.pow(f1 / f0, frac); // exponential glide f0→f1
      if (vib) f *= 1 + vib * Math.sin(2 * Math.PI * vibHz * t);
      phase += (2 * Math.PI * f) / SR;
      const ph = phase / (2 * Math.PI);
      let s;
      if (wave === "sine") s = Math.sin(phase);
      else if (wave === "square") s = Math.sin(phase) >= 0 ? 1 : -1;
      else if (wave === "saw") s = 2 * (ph - Math.floor(ph)) - 1;
      else if (wave === "tri") s = 2 * Math.abs(2 * (ph - Math.floor(ph)) - 1) - 1;
      else s = Math.random() * 2 - 1; // noise
      const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
      buf[idx] += s * vol * env;
    }
  };
}
function noise(o) {
  const { dur, vol = 0.5, delay = 0, attack = 0.001, decay = 0.1, lp = 1 } = o;
  return (buf) => {
    const start = (delay * SR) | 0, n = (dur * SR) | 0;
    let last = 0;
    for (let i = 0; i < n; i++) {
      const idx = start + i;
      if (idx >= buf.length) break;
      const t = i / SR;
      last += lp * (Math.random() * 2 - 1 - last); // one-pole low-pass
      const env = t < attack ? t / attack : Math.exp(-(t - attack) / decay);
      buf[idx] += last * vol * env;
    }
  };
}
// an arpeggio/jingle: notes played at a step interval
function arp(freqs, { step = 0.08, dur = 0.18, wave = "sine", vol = 0.5, decay = 0.16, delay = 0 } = {}) {
  return freqs.map((f, i) => osc({ wave, f0: f, dur, vol, decay, delay: delay + i * step }));
}
function render(durSec, voices) {
  const N = (durSec * SR) | 0;
  const buf = new Float32Array(N);
  for (const v of voices) v(buf);
  let peak = 1e-6;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(buf[i]));
  const g = peak > 1 ? 1 / peak : 1; // normalize only if clipping
  for (let i = 0; i < N; i++) buf[i] *= g * 0.92; // a touch of headroom
  return buf;
}
function wav(samples) {
  const N = samples.length, b = Buffer.alloc(44 + N * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + N * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    b.writeInt16LE((s < 0 ? s * 32768 : s * 32767) | 0, 44 + i * 2);
  }
  return b;
}

// ---- the catalog: id -> [durationSeconds, voices] (mirrors AUDIO_PLAN.md) -----
const N = (...v) => v; // tiny helper to read nicely
const SFX = {
  // 1 · UI & build
  "ui-click": [0.06, [osc({ f0: 1200, dur: 0.05, vol: 0.4, decay: 0.025 }), noise({ dur: 0.02, vol: 0.15, lp: 0.5 })]],
  "ui-tool-select": [0.09, [osc({ wave: "tri", f0: 760, f1: 1180, dur: 0.08, vol: 0.4, decay: 0.05 })]],
  "ui-tab": [0.12, [noise({ dur: 0.11, vol: 0.25, lp: 0.25, decay: 0.06 })]],
  "ui-toggle": [0.08, [osc({ wave: "square", f0: 520, f1: 700, dur: 0.06, vol: 0.3, decay: 0.04 })]],
  "build-floor": [0.09, [osc({ wave: "square", f0: 380, dur: 0.05, vol: 0.3, decay: 0.03 }), noise({ dur: 0.05, vol: 0.2, lp: 0.4 })]],
  "build-wall": [0.16, [osc({ wave: "square", f0: 200, dur: 0.12, vol: 0.4, decay: 0.06 }), noise({ dur: 0.08, vol: 0.3, lp: 0.3 })]],
  "build-door": [0.3, [noise({ dur: 0.26, vol: 0.32, lp: 0.12, attack: 0.04, decay: 0.12 }), osc({ wave: "square", f0: 170, dur: 0.08, vol: 0.35, delay: 0.2, decay: 0.05 })]],
  "build-module": [0.22, [osc({ wave: "square", f0: 130, dur: 0.12, vol: 0.4, decay: 0.07 }), osc({ f0: 900, f1: 1500, dur: 0.1, vol: 0.3, delay: 0.06, decay: 0.06 })]],
  "build-deconstruct": [0.26, [osc({ wave: "saw", f0: 420, f1: 110, dur: 0.22, vol: 0.32, decay: 0.12 }), noise({ dur: 0.22, vol: 0.22, lp: 0.3 })]],
  "build-invalid": [0.18, [osc({ wave: "square", f0: 150, dur: 0.07, vol: 0.4, decay: 0.05 }), osc({ wave: "square", f0: 120, dur: 0.07, vol: 0.4, delay: 0.09, decay: 0.05 })]],
  "drag-tick": [0.03, [osc({ f0: 1500, dur: 0.02, vol: 0.22, decay: 0.012 })]],
  "modal-open": [0.18, [osc({ wave: "tri", f0: 300, f1: 720, dur: 0.16, vol: 0.3, decay: 0.1 })]],
  "modal-close": [0.16, [osc({ wave: "tri", f0: 720, f1: 280, dur: 0.14, vol: 0.3, decay: 0.09 })]],

  // 2 · Economy & research
  "credits-trade": [0.4, arp([880, 1320, 1760], { step: 0.07, dur: 0.3, vol: 0.36, decay: 0.18 })],
  "credits-fuel": [0.34, arp([660, 990], { step: 0.07, dur: 0.26, vol: 0.34, decay: 0.16 })],
  "research-buy": [0.5, arp([523, 659, 784, 1047], { step: 0.09, dur: 0.34, vol: 0.34, decay: 0.2 })],
  "research-denied": [0.22, [osc({ wave: "square", f0: 200, f1: 150, dur: 0.18, vol: 0.36, decay: 0.1 })]],
  "doctrine-pick": [0.55, [...arp([392, 494, 587], { step: 0.06, dur: 0.4, wave: "tri", vol: 0.3, decay: 0.26 }), osc({ f0: 196, dur: 0.45, vol: 0.25, decay: 0.3 })]],
  "overflow-warn": [0.4, [osc({ wave: "tri", f0: 300, dur: 0.36, vol: 0.3, decay: 0.2, vib: 0.06, vibHz: 7 })]],

  // 3 · Crew, needs & life support
  "crew-arrive": [0.34, arp([660, 880, 990], { step: 0.07, dur: 0.26, vol: 0.34, decay: 0.16 })],
  "guest-arrive": [0.3, arp([784, 988], { step: 0.07, dur: 0.24, vol: 0.3, decay: 0.15 })],
  "crew-depart": [0.26, [osc({ wave: "tri", f0: 700, f1: 440, dur: 0.22, vol: 0.3, decay: 0.13 })]],
  "mood-low": [0.5, [osc({ wave: "sine", f0: 360, f1: 280, dur: 0.46, vol: 0.3, decay: 0.3, vib: 0.05, vibHz: 5 })]],
  "suffocation-warn": [0.6, [osc({ wave: "sine", f0: 420, f1: 700, dur: 0.55, vol: 0.34, decay: 0.4, vib: 0.08, vibHz: 9 })]],
  "crew-death": [0.7, [osc({ wave: "tri", f0: 220, f1: 110, dur: 0.66, vol: 0.4, decay: 0.4 }), osc({ wave: "sine", f0: 165, dur: 0.66, vol: 0.25, decay: 0.4 })]],

  // 4 · Ships, docking & mining
  "shuttle-land": [0.6, [noise({ dur: 0.5, vol: 0.32, lp: 0.1, attack: 0.05, decay: 0.3 }), osc({ wave: "square", f0: 120, dur: 0.1, vol: 0.4, delay: 0.45, decay: 0.06 })]],
  "shuttle-takeoff": [0.6, [noise({ dur: 0.55, vol: 0.34, lp: 0.12, attack: 0.2, decay: 0.3 }), osc({ wave: "saw", f0: 90, f1: 200, dur: 0.5, vol: 0.22, decay: 0.35 })]],
  "drone-launch": [0.22, [osc({ wave: "saw", f0: 300, f1: 760, dur: 0.18, vol: 0.3, decay: 0.1 })]],
  "drone-return": [0.24, [osc({ wave: "square", f0: 300, dur: 0.08, vol: 0.3, decay: 0.05 }), noise({ dur: 0.18, vol: 0.26, lp: 0.35, delay: 0.05 })]],

  // 5 · Combat & incidents
  "alert-incident": [0.4, [osc({ wave: "square", f0: 760, dur: 0.16, vol: 0.36, decay: 0.1 }), osc({ wave: "square", f0: 600, dur: 0.16, vol: 0.36, delay: 0.18, decay: 0.1 })]],
  "power-surge": [0.4, [osc({ wave: "saw", f0: 1400, f1: 200, dur: 0.3, vol: 0.34, decay: 0.16 }), noise({ dur: 0.12, vol: 0.3, lp: 0.7 })]],
  "brownout": [0.6, [osc({ wave: "saw", f0: 620, f1: 120, dur: 0.55, vol: 0.34, decay: 0.4 })]],
  "power-restored": [0.45, [osc({ wave: "tri", f0: 200, f1: 720, dur: 0.4, vol: 0.32, decay: 0.25 })]],
  "breach-klaxon": [0.7, [osc({ wave: "square", f0: 720, dur: 0.18, vol: 0.4, decay: 0.12 }), osc({ wave: "square", f0: 520, dur: 0.18, vol: 0.4, delay: 0.22, decay: 0.12 }), osc({ wave: "square", f0: 720, dur: 0.18, vol: 0.4, delay: 0.44, decay: 0.12 })]],
  "breach-sealed": [0.4, arp([523, 784], { step: 0.1, dur: 0.3, wave: "tri", vol: 0.32, decay: 0.18 })],
  "market-shock": [0.45, arp([700, 1050, 1400], { step: 0.06, dur: 0.34, vol: 0.32, decay: 0.18 })],
  "raider-inbound": [0.7, [osc({ wave: "square", f0: 110, dur: 0.6, vol: 0.4, decay: 0.4 }), osc({ wave: "square", f0: 165, dur: 0.6, vol: 0.3, decay: 0.4 }), osc({ wave: "saw", f0: 220, f1: 180, dur: 0.6, vol: 0.18, decay: 0.4 })]],
  "module-destroyed": [0.6, [noise({ dur: 0.5, vol: 0.5, lp: 0.5, attack: 0.002, decay: 0.28 }), osc({ wave: "square", f0: 140, f1: 60, dur: 0.4, vol: 0.4, decay: 0.25 })]],
  "turret-fire": [0.22, [osc({ wave: "saw", f0: 1300, f1: 200, dur: 0.12, vol: 0.36, decay: 0.06 }), noise({ dur: 0.14, vol: 0.3, lp: 0.6, delay: 0.06 })]],
  "skirmish-start": [0.4, [osc({ wave: "square", f0: 300, dur: 0.36, vol: 0.34, decay: 0.22 }), osc({ wave: "square", f0: 318, dur: 0.36, vol: 0.3, decay: 0.22 })]],
  "hit-blow": [0.14, [noise({ dur: 0.1, vol: 0.4, lp: 0.4, decay: 0.05 }), osc({ wave: "square", f0: 160, dur: 0.06, vol: 0.34, decay: 0.04 })]],

  // 6 · Social encounters & medical
  "encounter-conflict": [0.5, [osc({ wave: "square", f0: 300, f1: 460, dur: 0.45, vol: 0.32, decay: 0.3 }), osc({ wave: "square", f0: 318, dur: 0.45, vol: 0.2, decay: 0.3 })]],
  "encounter-bond": [0.5, arp([523, 659, 784], { step: 0.08, dur: 0.38, wave: "tri", vol: 0.32, decay: 0.24 })],
  "encounter-choice": [0.07, [osc({ f0: 900, dur: 0.05, vol: 0.34, decay: 0.03 })]],
  "outcome-good": [0.55, arp([523, 659, 784, 1047], { step: 0.05, dur: 0.42, wave: "tri", vol: 0.34, decay: 0.28 })],
  "outcome-bad": [0.5, [osc({ wave: "square", f0: 233, dur: 0.45, vol: 0.34, decay: 0.3 }), osc({ wave: "square", f0: 247, dur: 0.45, vol: 0.3, decay: 0.3 })]],
  "injury": [0.2, [noise({ dur: 0.12, vol: 0.42, lp: 0.45, decay: 0.06 }), osc({ wave: "tri", f0: 320, f1: 180, dur: 0.16, vol: 0.32, decay: 0.1 })]],
  "medbay-heal": [0.5, arp([784, 988, 1319], { step: 0.08, dur: 0.4, vol: 0.3, decay: 0.24 })],
  "wound-death": [0.8, [osc({ wave: "tri", f0: 200, f1: 98, dur: 0.76, vol: 0.4, decay: 0.5 }), osc({ wave: "sine", f0: 147, dur: 0.76, vol: 0.22, decay: 0.5 })]],

  // 7 · Objectives, beacon & end states
  "objective-complete": [0.6, arp([659, 784, 988, 1319], { step: 0.08, dur: 0.44, vol: 0.36, decay: 0.26 })],
  "beacon-module-online": [0.5, [...arp([440, 554, 659], { step: 0.06, dur: 0.4, vol: 0.3, decay: 0.26 }), osc({ f0: 880, dur: 0.4, vol: 0.18, delay: 0.18, decay: 0.26 })]],
  "victory": [1.4, arp([523, 659, 784, 1047, 1319, 1047, 1319, 1568], { step: 0.13, dur: 0.6, wave: "tri", vol: 0.36, decay: 0.4 })],
  "defeat": [1.2, [osc({ wave: "tri", f0: 392, f1: 130, dur: 1.1, vol: 0.4, decay: 0.7 }), osc({ wave: "sine", f0: 196, f1: 98, dur: 1.1, vol: 0.24, decay: 0.7 })]],

  // 8 · First contact
  "first-contact": [0.9, [osc({ wave: "sine", f0: 440, dur: 0.85, vol: 0.3, decay: 0.6, vib: 0.02, vibHz: 4 }), osc({ wave: "sine", f0: 466, dur: 0.85, vol: 0.22, decay: 0.6 }), osc({ wave: "tri", f0: 880, f1: 1320, dur: 0.5, vol: 0.16, delay: 0.2, decay: 0.3 })]],

  // 9 · Ambient beds (short loopable drones — seams aren't perfect; fine as stems)
  "ambient-station": [2.0, [osc({ wave: "sine", f0: 60, dur: 2, vol: 0.3, attack: 0.4, decay: 4 }), osc({ wave: "sine", f0: 90, dur: 2, vol: 0.16, attack: 0.4, decay: 4 }), noise({ dur: 2, vol: 0.05, lp: 0.04, attack: 0.4, decay: 4 })]],
  "music-tension": [2.0, [osc({ wave: "tri", f0: 110, dur: 2, vol: 0.22, attack: 0.3, decay: 4 }), osc({ wave: "tri", f0: 116.5, dur: 2, vol: 0.16, attack: 0.3, decay: 4 })]],
};

mkdirSync(OUT, { recursive: true });
const ids = Object.keys(SFX);
let bytes = 0;
for (const id of ids) {
  const [dur, voices] = SFX[id];
  const data = wav(render(dur, voices));
  writeFileSync(join(OUT, `${id}.wav`), data);
  bytes += data.length;
}
writeFileSync(join(OUT, "manifest.json"), JSON.stringify({ format: "wav", sampleRate: SR, ids }, null, 2));
console.log(`Generated ${ids.length} SFX (${(bytes / 1024).toFixed(0)} KB) → assets/sfx/`);
void N;
