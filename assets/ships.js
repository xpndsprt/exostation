// Per-race starship designs (TOP-DOWN, nose up) — the single source of truth shared
// by the Ship Editor (as the starter/seed) and the GAME (default in-world ships).
// Exposes window.SHIPS (a built design per race) and window.buildShip(id).
// Each design: { res, pixels:[hex|null], lights:[{x,y,c}], thrusters:[{x,y}], legs:[{x,y}] }.
(function () {
  const RES = 48;
  const RED = "#ff5a5a", GRN = "#7fffa0";
  const RACES = ["human", "drenn", "thol", "vryl", "korro", "chlorithe", "naaz", "voltaar", "vorn", "sszra"];

  function buildShip(id) {
    const sp = { res: RES, pixels: new Array(RES * RES).fill(null), lights: [], thrusters: [], legs: [] };
    const P = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < RES && y < RES) sp.pixels[y * RES + x] = c; };
    const disc = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) P(cx + x, cy + y, c); };
    const ell = (cx, cy, rx, ry, c) => { for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx || 1) + (y * y) / (ry * ry || 1) <= 1) P(cx + x, cy + y, c); };
    const rct = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) P(x, y, c); };
    const line = (x0, y0, x1, y1, c, th = 0) => { x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0; const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx - dy, x = x0, y = y0; for (let g = 0; g < 300; g++) { th > 0 ? disc(x, y, th, c) : P(x, y, c); if (x === x1 && y === y1) break; const e2 = 2 * e; if (e2 > -dy) { e -= dy; x += sx; } if (e2 < dx) { e += dx; y += sy; } } };
    const outline = (c) => { const add = []; for (let y = 0; y < RES; y++) for (let x = 0; x < RES; x++) { if (sp.pixels[y * RES + x]) continue; let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < RES && yy < RES && sp.pixels[yy * RES + xx]) { n = true; break; } } if (n) add.push(y * RES + x); } for (const i of add) sp.pixels[i] = c; };
    const cx = 24;
    const D = {
      human: { k: "#10141c", h: "#cdd6e2", l: "#eef3f8", d: "#7e8a97", g: "#7fd0ff" },
      drenn: { k: "#1c1606", h: "#e8c349", l: "#fff0b0", d: "#9a7d22", g: "#fff6c8" },
      thol: { k: "#0e1014", h: "#5c6775", l: "#8a96a4", d: "#2a3240", g: "#ffb060" },
      vryl: { k: "#0c1a0e", h: "#6fae4a", l: "#aee87a", d: "#3a6a28", g: "#d6ff9a" },
      korro: { k: "#180808", h: "#b0463a", l: "#e07a5a", d: "#5a1d18", g: "#ff8a5a" },
      chlorithe: { k: "#0e160a", h: "#8fbf3a", l: "#d6ff7a", d: "#4a6a18", g: "#eaffb0" },
      naaz: { k: "#0a1018", h: "#6a8fd1", l: "#bcd6ff", d: "#33507e", g: "#cfe6ff" },
      voltaar: { k: "#1a0a14", h: "#d16a9b", l: "#ffb0d8", d: "#7a2f55", g: "#ffd0ec" },
      vorn: { k: "#120818", h: "#9a52b0", l: "#caa0e0", d: "#5a2f70", g: "#e0c0f0" },
      sszra: { k: "#08161a", h: "#3fae96", l: "#8fe8d0", d: "#1d5a4a", g: "#bff0e4" },
    };
    const c = D[id] || D.human;
    if (id === "drenn") { // opulent wide gold trade barge with a domed bridge
      ell(cx, 24, 11, 15, c.h); disc(cx, 19, 6, c.l); ell(cx, 31, 8, 5, c.d);
      for (const wy of [16, 22, 28]) { rct(13, wy, 15, wy + 1, c.d); rct(33, wy, 35, wy + 1, c.d); }
      disc(cx, 18, 2, c.g); outline(c.k);
      sp.lights = [{ x: 11, y: 24, c: "#ffd86a" }, { x: 36, y: 24, c: "#ffd86a" }, { x: cx, y: 11, c: c.g }];
      sp.thrusters = [{ x: cx - 5, y: 38 }, { x: cx + 5, y: 38 }];
      sp.legs = [{ x: 14, y: 30 }, { x: 33, y: 30 }, { x: 18, y: 36 }, { x: 29, y: 36 }];
    } else if (id === "thol") { // heavy boxy methane hauler, armoured, twin engines
      rct(cx - 9, 12, cx + 9, 38, c.h); rct(cx - 9, 12, cx + 9, 14, c.d); rct(cx - 9, 36, cx + 9, 38, c.d);
      rct(cx - 7, 17, cx - 4, 24, c.d); rct(cx + 4, 17, cx + 7, 24, c.d);
      rct(cx - 6, 18, cx - 5, 23, c.g); rct(cx + 5, 18, cx + 6, 23, c.g);
      rct(cx - 3, 8, cx + 3, 12, c.l); rct(cx - 7, 38, cx - 3, 44, c.d); rct(cx + 3, 38, cx + 7, 44, c.d);
      outline(c.k);
      sp.lights = [{ x: cx - 9, y: 28, c: "#ffb060" }, { x: cx + 9, y: 28, c: "#ffb060" }, { x: cx, y: 9, c: c.l }];
      sp.thrusters = [{ x: cx - 5, y: 44 }, { x: cx + 5, y: 44 }];
      sp.legs = [{ x: cx - 8, y: 16 }, { x: cx + 8, y: 16 }, { x: cx - 8, y: 34 }, { x: cx + 8, y: 34 }];
    } else if (id === "vryl") { // organic botanical pod-ship with spore bulbs
      ell(cx, 24, 8, 15, c.h); disc(15, 20, 4, c.h); disc(33, 20, 4, c.h); disc(16, 30, 3, c.h); disc(32, 30, 3, c.h);
      ell(cx, 14, 3, 5, c.l); ell(cx, 14, 2, 3, c.g); disc(cx, 30, 4, c.d); disc(15, 20, 1, c.g); disc(33, 20, 1, c.g);
      outline(c.k);
      sp.lights = [{ x: 12, y: 26, c: c.g }, { x: 35, y: 26, c: c.g }, { x: cx, y: 11, c: "#eaffd0" }];
      sp.thrusters = [{ x: cx - 4, y: 38 }, { x: cx + 4, y: 38 }];
      sp.legs = [{ x: 14, y: 30 }, { x: 33, y: 30 }, { x: 19, y: 36 }, { x: 28, y: 36 }];
    } else if (id === "korro") { // brutalist heavy hauler, blunt, one huge engine block
      rct(cx - 8, 14, cx + 8, 36, c.h); rct(cx - 8, 14, cx + 8, 16, c.l); rct(cx - 6, 20, cx + 6, 30, c.d);
      rct(cx - 10, 22, cx - 8, 32, c.h); rct(cx + 8, 22, cx + 10, 32, c.h); rct(cx - 6, 36, cx + 6, 44, c.d);
      rct(cx - 4, 38, cx + 4, 42, c.g); outline(c.k);
      sp.lights = [{ x: cx - 10, y: 26, c: RED }, { x: cx + 10, y: 26, c: GRN }, { x: cx, y: 15, c: c.g }];
      sp.thrusters = [{ x: cx - 3, y: 44 }, { x: cx + 3, y: 44 }];
      sp.legs = [{ x: cx - 9, y: 20 }, { x: cx + 9, y: 20 }, { x: cx - 9, y: 32 }, { x: cx + 9, y: 32 }];
    } else if (id === "chlorithe") { // crystalline diamond hull with faceted ridges
      for (let y = 8; y <= 40; y++) { const hw = Math.round(14 - Math.abs(y - 24) * 0.62); for (let x = -hw; x <= hw; x++) P(cx + x, y, Math.abs(x) >= hw - 1 ? c.d : c.h); }
      line(cx, 8, cx, 40, c.l); line(10, 24, cx, 8, c.l); line(38, 24, cx, 8, c.l); line(10, 24, cx, 40, c.d); line(38, 24, cx, 40, c.d);
      disc(cx, 24, 3, c.g); outline(c.k);
      sp.lights = [{ x: 11, y: 24, c: c.g }, { x: 36, y: 24, c: c.g }, { x: cx, y: 9, c: "#eaffb0" }];
      sp.thrusters = [{ x: cx - 3, y: 38 }, { x: cx + 3, y: 38 }];
      sp.legs = [{ x: 14, y: 24 }, { x: 33, y: 24 }, { x: 18, y: 34 }, { x: 29, y: 34 }];
    } else if (id === "naaz") { // serene long sleek diplomatic needle
      ell(cx, 24, 4, 18, c.h); ell(cx, 11, 2, 6, c.l); ell(12, 28, 4, 7, c.h); ell(36, 28, 4, 7, c.h);
      ell(cx, 16, 2, 3, c.g); rct(cx - 2, 40, cx + 2, 43, c.d); outline(c.k);
      sp.lights = [{ x: 9, y: 30, c: RED }, { x: 38, y: 30, c: GRN }, { x: cx, y: 8, c: c.g }];
      sp.thrusters = [{ x: cx - 2, y: 43 }, { x: cx + 2, y: 43 }];
      sp.legs = [{ x: 14, y: 28 }, { x: 33, y: 28 }, { x: cx - 3, y: 38 }, { x: cx + 3, y: 38 }];
    } else if (id === "voltaar") { // glowing plasma dart with a bright energy core
      for (let y = 8; y <= 42; y++) { const hw = Math.round(2 + (1 - Math.abs(y - 26) / 18) * 4); for (let x = -hw; x <= hw; x++) P(cx + x, y, c.h); }
      line(18, 38, cx, 18, c.h, 1); line(30, 38, cx, 18, c.h, 1); disc(cx, 26, 4, c.g); disc(cx, 26, 2, c.l); line(cx, 40, cx, 44, c.g, 1);
      outline(c.k);
      sp.lights = [{ x: 17, y: 38, c: c.g }, { x: 30, y: 38, c: c.g }, { x: cx, y: 26, c: "#ffffff" }];
      sp.thrusters = [{ x: cx, y: 44 }];
      sp.legs = [{ x: 19, y: 36 }, { x: 28, y: 36 }, { x: cx - 2, y: 20 }, { x: cx + 2, y: 20 }];
    } else if (id === "vorn") { // methane fuel tanker — rows of round tanks on a spine
      rct(cx - 5, 10, cx + 5, 40, c.h); line(15, 18, cx, 18, c.d, 1); line(33, 18, cx, 18, c.d, 1); line(15, 28, cx, 28, c.d, 1); line(33, 28, cx, 28, c.d, 1);
      disc(15, 18, 4, c.h); disc(33, 18, 4, c.h); disc(15, 28, 4, c.h); disc(33, 28, 4, c.h);
      disc(15, 18, 1, c.g); disc(33, 28, 1, c.g); ell(cx, 12, 3, 4, c.l);
      rct(cx - 5, 40, cx - 2, 44, c.d); rct(cx + 2, 40, cx + 5, 44, c.d); outline(c.k);
      sp.lights = [{ x: 11, y: 18, c: c.g }, { x: 37, y: 28, c: c.g }, { x: cx, y: 9, c: "#e0c0f0" }];
      sp.thrusters = [{ x: cx - 4, y: 44 }, { x: cx + 4, y: 44 }];
      sp.legs = [{ x: 13, y: 18 }, { x: 35, y: 18 }, { x: 13, y: 28 }, { x: 35, y: 28 }];
    } else if (id === "sszra") { // predatory swept arrowhead warship
      for (let y = 8; y <= 38; y++) { const hw = Math.round((y - 8) * 0.42); for (let x = -hw; x <= hw; x++) P(cx + x, y, Math.abs(x) >= hw - 1 ? c.d : c.h); }
      line(cx - 4, 32, 11, 42, c.h, 1); line(cx + 4, 32, 37, 42, c.h, 1); line(cx, 8, cx, 38, c.l);
      ell(cx, 20, 2, 3, c.g); rct(cx - 4, 36, cx - 1, 42, c.d); rct(cx + 1, 36, cx + 4, 42, c.d); outline(c.k);
      sp.lights = [{ x: 12, y: 40, c: RED }, { x: 35, y: 40, c: GRN }, { x: cx, y: 10, c: c.g }];
      sp.thrusters = [{ x: cx - 3, y: 42 }, { x: cx + 3, y: 42 }];
      sp.legs = [{ x: cx - 6, y: 30 }, { x: cx + 6, y: 30 }, { x: 14, y: 40 }, { x: 33, y: 40 }];
    } else { // human — a Star Trek / Star Wars starship: saucer + engineering hull + twin warp nacelles
      ell(cx, 14, 10, 8, c.h);               // saucer section (front)
      disc(cx, 14, 4, c.l); disc(cx, 14, 2, c.d); disc(cx, 13, 1, c.g); // bridge + dome light
      rct(cx - 1, 21, cx, 27, c.d);          // dorsal neck
      ell(cx, 33, 4, 9, c.h);                // engineering (secondary) hull
      disc(cx, 41, 2, c.g);                  // deflector dish
      line(cx - 4, 31, cx - 9, 31, c.d, 1); line(cx + 4, 31, cx + 9, 31, c.d, 1); // nacelle struts
      ell(cx - 10, 33, 2, 10, c.h); ell(cx + 10, 33, 2, 10, c.h);   // warp nacelles
      disc(cx - 10, 24, 2, c.g); disc(cx + 10, 24, 2, c.g);         // bussard collectors (blue glow, front)
      outline(c.k);
      sp.lights = [{ x: cx - 10, y: 24, c: RED }, { x: cx + 10, y: 24, c: GRN }, { x: cx, y: 7, c: c.g }];
      sp.thrusters = [{ x: cx - 10, y: 42 }, { x: cx + 10, y: 42 }, { x: cx, y: 41 }];
      sp.legs = [{ x: cx - 7, y: 14 }, { x: cx + 7, y: 14 }, { x: cx - 4, y: 38 }, { x: cx + 4, y: 38 }];
    }
    return sp;
  }

  const SHIPS = {};
  for (const id of RACES) SHIPS[id] = buildShip(id);
  window.SHIPS = SHIPS;
  window.buildShip = buildShip;
})();
