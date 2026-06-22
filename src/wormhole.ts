// The Beacon, visualized — a Bajoran-wormhole-style vortex (DS9) that lives at the
// BACK of the world (behind the station) and on the star chart. It starts as a
// faint, small swirl (~1/3 size) and, as the five beacon nodes charge, blooms into
// a bright, cloudy blue flower of light with particles streaming from the core.
// Purely cosmetic; driven by beaconIntensity() (0..1).
import { Container, Graphics } from "pixi.js";

const U = 100; // author radius in local space; the container is scaled in update()
const FULL = 0.35; // full-bloom radius as a fraction of baseR (the size at 5/5)

type P = { x: number; y: number; vx: number; vy: number; age: number; life: number };

export class Wormhole {
  readonly container = new Container();
  private glow = new Graphics();
  private clouds = new Container();
  private petals = new Container();
  private petals2 = new Container();
  private swirl = new Container();
  private core = new Graphics();
  private particleG = new Graphics();
  private parts: P[] = [];
  private spawnAcc = 0;
  private t = 0;

  constructor() {
    this.container.eventMode = "none";

    // outer nebulous glow — faint concentric blue/violet rings (additive)
    for (let i = 6; i >= 1; i--) {
      const r = U * (0.5 + i * 0.3);
      this.glow.circle(0, 0, r).fill({ color: i % 2 ? 0x2a6bd8 : 0x6a3ad8, alpha: 0.05 * (i / 6) });
    }
    this.glow.blendMode = "add";

    // cloudy nebula: many soft offset puffs of blue/violet/cyan (rotates slowly)
    for (let i = 0; i < 16; i++) {
      const g = new Graphics();
      const a = (i / 16) * Math.PI * 2 + (i % 3) * 0.5;
      const rr = U * (0.35 + (i % 5) * 0.2);
      const cr = U * (0.28 + (i % 4) * 0.12);
      const col = i % 3 === 0 ? 0x3a6ad0 : i % 3 === 1 ? 0x7a3ad0 : 0x2a9ad8;
      g.circle(Math.cos(a) * rr, Math.sin(a) * rr, cr).fill({ color: col, alpha: 0.055 });
      g.blendMode = "add";
      this.clouds.addChild(g);
    }

    // the iconic flare "flower": long thin ellipses radiating from the centre
    const petalRing = (cont: Container, n: number, len: number, wide: number, color: number, alpha: number): void => {
      for (let i = 0; i < n; i++) {
        const g = new Graphics();
        g.ellipse(0, -len * 0.5, wide, len * 0.5).fill({ color, alpha });
        g.rotation = (i / n) * Math.PI * 2;
        g.blendMode = "add";
        cont.addChild(g);
      }
    };
    petalRing(this.petals, 12, U * 1.7, U * 0.018, 0x9fd8ff, 0.5);
    petalRing(this.petals2, 8, U * 2.3, U * 0.013, 0xb39cff, 0.34);

    // swirling spiral arms
    for (let i = 0; i < 4; i++) {
      const g = new Graphics();
      const a0 = (i / 4) * Math.PI * 2;
      g.moveTo(Math.cos(a0) * U * 0.3, Math.sin(a0) * U * 0.3);
      for (let k = 1; k <= 24; k++) {
        const a = a0 + k * 0.22;
        const r = U * 0.3 + k * U * 0.05;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.stroke({ width: U * 0.05, color: 0x7fbaff, alpha: 0.24 });
      g.blendMode = "add";
      this.swirl.addChild(g);
    }

    // bright pulsing core
    for (let i = 5; i >= 1; i--) {
      this.core.circle(0, 0, U * 0.1 * i).fill({ color: i <= 2 ? 0xeaf6ff : 0x7fc8ff, alpha: 0.28 });
    }
    this.core.blendMode = "add";
    this.particleG.blendMode = "add";

    this.container.addChild(this.glow, this.clouds, this.swirl, this.petals2, this.petals, this.particleG, this.core);
  }

  // cx,cy in WORLD pixels; baseR sets the full-bloom radius; intensity 0..1.
  update(dt: number, intensity: number, cx: number, cy: number, baseR: number): void {
    this.t += dt;
    const ramp = Math.min(1, Math.max(0, intensity));
    const grow = 1 / 3 + ramp * (2 / 3); // ~1/3 size at the start → full at 5/5
    this.container.position.set(cx, cy);
    this.container.scale.set((baseR / U) * FULL * grow);
    this.container.alpha = 0.16 + ramp * 0.82; // faint → vivid
    this.petals.rotation = this.t * 0.12;
    this.petals2.rotation = -this.t * 0.08;
    this.swirl.rotation = this.t * 0.3;
    this.clouds.rotation = this.t * 0.05;
    this.core.scale.set(1 + Math.sin(this.t * 1.6) * (0.05 + ramp * 0.06));
    this.glow.scale.set(1 + Math.sin(this.t * 0.5) * 0.04);

    // particles streaming out of the core, spiralling as they go (more when bright)
    this.spawnAcc += (4 + ramp * 30) * dt;
    while (this.spawnAcc >= 1 && this.parts.length < 70) {
      this.spawnAcc -= 1;
      const a = Math.random() * Math.PI * 2;
      const sp = U * (0.25 + Math.random() * 0.55);
      this.parts.push({ x: 0, y: 0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0, life: 1.8 + Math.random() * 2.2 });
    }
    this.particleG.clear();
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.parts.splice(i, 1);
        continue;
      }
      const ang = Math.atan2(p.vy, p.vx) + dt * 0.9; // swirl the drift
      const spd = Math.hypot(p.vx, p.vy);
      p.vx = Math.cos(ang) * spd;
      p.vy = Math.sin(ang) * spd;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.age / p.life;
      this.particleG.circle(p.x, p.y, U * 0.018 + U * 0.022 * k).fill({ color: 0xddf4ff, alpha: 0.5 * k * (0.25 + ramp) });
    }
  }
}
