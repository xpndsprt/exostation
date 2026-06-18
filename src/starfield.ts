// Far parallax backdrop: a deep starfield with wisps of the Milky Way and soft
// nebula clouds, scrolling behind the station. It lives on its own screen-space
// container (NOT inside the world container), so it never zooms with the camera;
// instead each depth layer scrolls by a small fraction of the camera offset, so
// nearer star layers slide faster than the far nebula — the parallax depth cue.
//
// Every texture is authored TOROIDAL (features that cross an edge are redrawn on
// the opposite side), so the TilingSprites repeat seamlessly across any viewport.
import { Container, Texture, TilingSprite } from "pixi.js";
import type { Camera } from "./camera";

// deterministic PRNG so the sky is stable run-to-run (mulberry32).
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  return [c, ctx];
}

// A soft round dot (radial gradient), drawn wrapped so it tiles seamlessly.
function dot(ctx: CanvasRenderingContext2D, size: number, x: number, y: number, r: number, a: number, rgb: string): void {
  const m = r + 1;
  const xs = x < m ? [x, x + size] : x > size - m ? [x, x - size] : [x];
  const ys = y < m ? [y, y + size] : y > size - m ? [y, y - size] : [y];
  for (const px of xs)
    for (const py of ys) {
      const g = ctx.createRadialGradient(px, py, 0, px, py, r);
      g.addColorStop(0, `rgba(${rgb},${a})`);
      g.addColorStop(0.5, `rgba(${rgb},${a * 0.5})`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
}

// One star layer: scattered points of light over transparent. `tint` lets a few
// stars read faintly blue/amber so the field isn't a flat white.
function starTexture(size: number, count: number, maxR: number, baseAlpha: number, seed: number): Texture {
  const [c, ctx] = canvas(size);
  const rand = rng(seed);
  const tints = ["255,255,255", "255,255,255", "200,220,255", "255,236,210", "210,255,245"];
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = (0.4 + rand() * rand() * maxR) | 0 || 0.6; // mostly small, a few larger
    const a = baseAlpha * (0.35 + rand() * 0.65);
    dot(ctx, size, x, y, r + 0.6, a, tints[(rand() * tints.length) | 0]);
  }
  return Texture.from(c);
}

// The far layer: soft nebula blobs + a luminous Milky Way band laid along the
// 45° diagonal (which wraps perfectly on a square torus → seamless), strewn with
// extra faint stars. Colours stay in the game's cool, optimistic sci-fi register.
function nebulaTexture(size: number, seed: number): Texture {
  const [c, ctx] = canvas(size);
  const rand = rng(seed);
  ctx.globalCompositeOperation = "lighter"; // clouds accumulate light

  // nebula clouds — large, low-alpha gaussian blobs in a few hues
  const hues = ["46,86,150", "120,60,150", "40,130,140", "150,70,110", "60,90,160"];
  const blobs = 26;
  for (let i = 0; i < blobs; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const R = size * (0.06 + rand() * 0.16);
    const a = 0.05 + rand() * 0.08;
    dot(ctx, size, x, y, R, a, hues[(rand() * hues.length) | 0]);
  }

  // Milky Way band: a brighter ridge along the wrapped diagonal y ≈ x + phase,
  // with a soft glow and a dense dusting of tiny stars (gaussian across the band).
  const phase = rand() * size;
  const gauss = () => (rand() + rand() + rand() - 1.5) * 2; // ~N(0,1)*~
  for (let i = 0; i < 220; i++) {
    const t = rand() * size;
    const off = gauss() * size * 0.06; // perpendicular spread → band thickness
    const x = (t + off + size) % size;
    const y = (t + phase - off + size) % size;
    dot(ctx, size, x, y, size * 0.05 * (0.4 + rand()), 0.025 + rand() * 0.03, "150,170,210");
  }
  for (let i = 0; i < 900; i++) {
    const t = rand() * size;
    const off = gauss() * size * 0.045;
    const x = (t + off + size) % size;
    const y = (t + phase - off + size) % size;
    dot(ctx, size, x, y, 0.6 + rand() * 0.8, 0.25 + rand() * 0.45, "235,240,255");
  }

  // a faint all-over dusting so the far field never reads empty
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 500; i++)
    dot(ctx, size, rand() * size, rand() * size, 0.5 + rand() * 0.6, 0.12 + rand() * 0.25, "220,228,245");

  return Texture.from(c);
}

interface Layer {
  sprite: TilingSprite;
  factor: number; // parallax: fraction of camera offset this layer scrolls by
  drift: number; // slow autonomous drift (px/sec) so the sky breathes when still
  twinkle: number; // alpha oscillation amplitude
  base: number; // base alpha
}

export class Starfield {
  readonly container = new Container();
  private layers: Layer[] = [];

  constructor(w: number, h: number) {
    // far → near. Smaller factor = more distant (scrolls slower).
    const defs: Array<{ tex: Texture; factor: number; drift: number; twinkle: number; alpha: number }> = [
      { tex: nebulaTexture(1024, 1337), factor: 0.04, drift: 0.8, twinkle: 0.0, alpha: 0.9 },
      { tex: starTexture(512, 260, 1.2, 0.5, 2025), factor: 0.09, drift: 0.4, twinkle: 0.0, alpha: 0.85 },
      { tex: starTexture(512, 200, 1.6, 0.7, 7), factor: 0.16, drift: 0.0, twinkle: 0.05, alpha: 0.95 },
      { tex: starTexture(384, 120, 2.2, 0.9, 99), factor: 0.26, drift: 0.0, twinkle: 0.12, alpha: 1.0 },
    ];
    for (const d of defs) {
      const sprite = new TilingSprite({ texture: d.tex, width: w, height: h });
      sprite.alpha = d.alpha;
      this.container.addChild(sprite);
      this.layers.push({ sprite, factor: d.factor, drift: d.drift, twinkle: d.twinkle, base: d.alpha });
    }
  }

  resize(w: number, h: number): void {
    for (const l of this.layers) {
      l.sprite.width = w;
      l.sprite.height = h;
    }
  }

  // Re-scroll every layer from the current camera (call on any camera change) plus
  // the running clock `t` (seconds) for drift/twinkle (call each frame).
  update(cam: Camera, t: number): void {
    for (const l of this.layers) {
      l.sprite.tilePosition.set(cam.x * l.factor + t * l.drift, cam.y * l.factor);
      if (l.twinkle) l.sprite.alpha = l.base * (1 - l.twinkle * 0.5 + l.twinkle * 0.5 * Math.sin(t * 1.7 + l.factor * 40));
    }
  }
}
