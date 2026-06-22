/* EXOSTATION — sprite library.
 * Consumed by editor.html. Each sprite: shared `palette` (char->hex, '.' =
 * transparent) and named `states` (state -> array of pixel rows).
 * Sizes match in-game footprints: solar 1x3, generators/vat/bay/lounge/tradehub
 * 2x2, synth/hotel 2x1, tiles+crew+ships 1x1.
 * Creatures: idle/walk/dead (+ auto-generated suitidle/suitwalk worn off-air).
 * Active modules: enabled/disabled (disabled just switches the status light off
 * — derived from enabled with off()).
 */
(function () {
  // disabled = enabled with the green status light (L) turned to off (o)
  const off = (rows) => rows.map((r) => r.split("L").join("o"));
  // suited = a space-suit version of a creature frame: the bare head becomes a
  // glass helmet (G visor + p glint), and the body is recoloured to suit fabric
  // (U/V). The visor keeps a species-coloured tint so you can still tell who is
  // who. Generated from the idle/walk frames after the library is built.
  const suitUp = (rows) =>
    rows.map((r) => r.replace(/s/g, "G").replace(/e/g, "p").replace(/c/g, "U").replace(/b/g, "V"));
  const SUIT_VISOR = { human: "#7fa8e0", drenn: "#e8c349", thol: "#e8995a", vryl: "#8fd14f", korro: "#e0786a", vorn: "#c77fe0", chlorithe: "#b6e87a", naaz: "#9ab6e8", voltaar: "#e89ac4", sszra: "#7fe8d4" };

  // Helpers for new 2x2 modules: wrap 27 content rows (each 26 chars) in a
  // bordered 32x32 box. Using .repeat() guarantees exact widths.
  const B = (n) => "b".repeat(n);
  const D = (n) => "d".repeat(n);

  // --- wall autotile set (32px, BIOMECHANICAL): a ribbed bone spine over a dark
  // recess — Giger vertebrae read through Moebius-clean panel lines. Renderer picks
  // one by neighbour mask. d = recess hull, k = groove/edge, m = body, h = bone. ---
  const VBODY = "khmmmkkmmmhk"; // 12-wide vertical strut: bone flanks, dark spine groove
  const VRIB = "khhhmkkmhhhk"; // a vertebra — brighter bone bulge across the strut
  // a column of strut segments with vertebrae every 5 rows (pairs read as ribs).
  const strutRows = (n) => Array.from({ length: n }, (_, i) => D(10) + ((i % 5 === 2 || i % 5 === 3) ? VRIB : VBODY) + D(10));
  // horizontal bulkhead beam (12 rows × 32): bone ridges top/bottom, a central
  // spine groove, and vertical rib ticks crossing the body.
  const RIBBED = "mmmk".repeat(8); // body row with periodic rib ticks
  const HBEAM = [
    "k".repeat(32), "h".repeat(32), "m".repeat(32), RIBBED, "m".repeat(32),
    "k".repeat(32), "k".repeat(32),
    "m".repeat(32), RIBBED, "m".repeat(32), "h".repeat(32), "k".repeat(32),
  ];
  // Connects N + E as a TRUE quarter-circle arc — a curved rib bridging the struts.
  const arcCorner = (cx, cy) => {
    const rows = [];
    for (let y = 0; y < 32; y++) {
      let s = "";
      for (let x = 0; x < 32; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        // inner/outer recess, k edges, h bone ridge, k spine groove down the middle, m body
        s += r < 10 || r > 22 ? "d" : r < 11.5 ? "k" : r < 13 ? "h" : r < 15.5 || r > 20.5 ? "k" : r < 17 || r > 19 ? "m" : "k";
      }
      rows.push(s);
    }
    return rows;
  };
  const WALL_CORNER = arcCorner(32, 0); // base = N + E (renderer rotates for the others)
  const WALL_T = [ // connects N + E + S (vertical spine + east beam)
    ...strutRows(10),
    ...HBEAM.map((r) => D(10) + r.slice(10)),
    ...strutRows(10),
  ];
  const WALL_STRAIGHT = [ ...Array(10).fill(D(32)), ...HBEAM, ...Array(10).fill(D(32)) ];
  const WALL_CROSS = [ ...strutRows(10), ...HBEAM, ...strutRows(10) ];
  const WALL_END = [ // a capped stub pointing N — a vertebra tipped with a bone cap
    ...strutRows(18),
    D(10) + "k" + "h".repeat(10) + "k" + D(10),
    D(10) + "k".repeat(12) + D(10),
    ...Array(12).fill(D(32)),
  ];
  const WALL_NODE = (function () { // isolated post — a single bone vertebra
    const post = [
      "k".repeat(12),
      "k" + "h".repeat(10) + "k",
      "k" + "h" + "mmmkk".repeat(1) + "mmm" + "h" + "k",
      ...Array(6).fill("k" + "h" + "mmmkkmmm" + "h" + "k"),
      "k" + "h" + "mmmkk".repeat(1) + "mmm" + "h" + "k",
      "k" + "h".repeat(10) + "k",
      "k".repeat(12),
    ];
    return [
      ...Array(10).fill(D(32)),
      ...post.map((r) => D(10) + r + D(10)),
      ...Array(10).fill(D(32)),
    ];
  })();
  // bone-on-charcoal ramp (the duotone steel pass reinforces it across the station)
  const WALL_PAL = { d: "#171c26", k: "#0b0e14", m: "#7f7468", h: "#cfc6b6" };

  // Biomechanical floor plate (32×32): a panel with a beveled inset, a dashed
  // vertebral cross-seam and corner rivets — Moebius-clean, Giger-boned by the tone.
  // Nostromo deck plate (32×32). Authored for HEIGHT: a recessed border seam (low),
  // a raked top-left bevel (high), a cross groove splitting four sunken panels, and
  // four raised bolts each with a lit shoulder + shadow underside. Palette luminance
  // is ordered v<d<m<p<h<b so the renderer's height map casts believable relief.
  function floorTile() {
    // A clean, elegant deck panel — no cross groove / quad bolts. Just a smooth
    // face with a soft top-left bevel, a gentle bottom-right shadow, and a few
    // very subtle surface details so a field of tiles reads as a real surface
    // without looking busy or quadded.
    const R = 32, out = [];
    for (let y = 0; y < R; y++) {
      let s = "";
      for (let x = 0; x < R; x++) {
        let ch = "p";                                  // smooth panel face
        if (x === 0 || y === 0) ch = "m";              // faint top/left seam (soft)
        else if (x === 1 || y === 1) ch = "h";         // a thin lit bevel just inside
        else if (x === R - 1 || y === R - 1) ch = "d"; // soft bottom/right shadow
        s += ch;
      }
      out.push(s);
    }
    const set = (x, y, c) => { out[y] = out[y].slice(0, x) + c + out[y].slice(x + 1); };
    // sparse, asymmetric specks — a touch of grain, never a grid
    for (const [x, y] of [[8, 11], [21, 7], [13, 23], [25, 18], [6, 17], [18, 14]]) set(x, y, "m");
    for (const [x, y] of [[10, 9], [22, 21], [15, 6]]) set(x, y, "h");
    // two flush rivets in opposite corners only (not the old 4-quad pattern)
    set(5, 5, "b"); set(4, 4, "h");
    set(26, 26, "b"); set(27, 27, "d");
    return out;
  }

  function floorWindow() {
    // A glazed viewport set into the deck — the station is weightless, so a port
    // underfoot looks down into open space. Deck frame around a recessed dark void
    // with a scatter of stars and a faint planet limb.
    const R = 32, out = [], inset = 5;
    for (let y = 0; y < R; y++) {
      let s = "";
      for (let x = 0; x < R; x++) {
        let ch = "p";
        if (x === 0 || y === 0) ch = "m";
        else if (x === 1 || y === 1) ch = "h";
        else if (x === R - 1 || y === R - 1) ch = "d";
        if (x >= inset && x < R - inset && y >= inset && y < R - inset) {
          const bx = x === inset || x === R - inset - 1;
          const by = y === inset || y === R - inset - 1;
          if (bx || by) ch = "b";                              // glazing bezel (lit rim)
          else if (x === inset + 1 || y === inset + 1) ch = "h"; // inner bevel highlight
          else ch = "v";                                       // the void
        }
        s += ch;
      }
      out.push(s);
    }
    const set = (x, y, c) => { out[y] = out[y].slice(0, x) + c + out[y].slice(x + 1); };
    for (const [x, y] of [[12, 11], [19, 9], [22, 16], [14, 19], [10, 22], [24, 21], [17, 13], [13, 15]]) set(x, y, "w"); // stars
    for (const [x, y] of [[20, 22], [21, 22], [22, 21], [21, 23], [22, 23], [23, 22]]) set(x, y, "r"); // a planet limb
    return out;
  }

  // Biomechanical door (32×32): twin ribbed leaves meeting on a central seam with
  // hazard bands; opening retracts them to the jambs and bares the dark shaft.
  function doorArt(open) {
    const R = 32, out = [];
    for (let y = 0; y < R; y++) {
      let s = "";
      for (let x = 0; x < R; x++) {
        let ch;
        if (x < 2 || x >= R - 2) ch = "k"; // side jambs
        else if (open) {
          ch = x < 7 || x >= R - 7 ? "b" : "g"; // leaf stubs + open shaft
          if (x === 6 || x === R - 7) ch = "k";
        } else {
          ch = "b"; // leaf body
          if (x === 15 || x === 16) ch = "g"; // central meeting seam
          else if (y % 5 === 0) ch = "g"; // horizontal rib grooves
          if ((y === 14 || y === 17) && x > 5 && x < 26) ch = "y"; // hazard bands
        }
        if (y < 1 || y >= R - 1) ch = "k"; // lintel + sill
        s += ch;
      }
      out.push(s);
    }
    return out;
  }
  const box2 = (rows) => [
    "................................",
    ".." + "k".repeat(28) + "..",
    ...rows.map((r) => ".." + "k" + r + "k" + ".."),
    ".." + "k".repeat(28) + "..",
    "................................",
    "................................",
  ];
  // build the repeating 1x3 solar array (32 wide, 96 tall) — a mast head, then
  // banks of photovoltaic cells (c) gridded by frame struts (k), capped at the base.
  function solarRows() {
    const pad = (s) => { const t = 32 - s.length, l = t >> 1; return ".".repeat(l) + s + ".".repeat(t - l); };
    const cell = "f" + "ccccck".repeat(5) + "f"; // a row of 5 cell columns
    const bar = "f" + "k".repeat(30) + "f";      // a horizontal frame strut
    const r = [
      pad("kkkk"), pad("kffk"), pad("kffk"),
      pad("f".repeat(16)), pad("f".repeat(24)), pad("f".repeat(28)),
    ];
    while (r.length < 95) r.push((r.length - 6) % 6 === 5 ? bar : cell);
    r.push("f".repeat(32));
    return r;
  }

  // A 3x3 (48x48) top-down shuttle, nose pointing UP (-y). Procedurally shaped:
  // a tapered fuselage, swept wings, a glass cockpit and two engine nozzles with
  // an exhaust glow — then a 1px black outline traced around the whole hull. The
  // renderer rotates it to point its nose at the dock and slides it along the
  // approach axis. h=hull, d=hull shadow, g=cockpit glass, f=engine glow, k=edge.
  function shuttle3() {
    const W = 48, H = 48, cx = 23.5;
    const g = Array.from({ length: H }, () => Array(W).fill("."));
    const fill = (x0, x1, y, ch) => { for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
    const rect = (x0, x1, y0, y1, ch) => { for (let y = y0; y <= y1; y++) fill(x0, x1, y, ch); };
    // a heavier dropship (nose UP): blunt fuselage + twin outboard engine nacelles
    for (let y = 4; y <= 45; y++) {
      let half;
      if (y < 13) half = 2 + (y - 4) * 0.8; // rounded nose
      else if (y < 37) half = 9; // wide body
      else half = 9 - (y - 37) * 0.6; // slight taper
      fill(cx - Math.max(1, half), cx + Math.max(1, half), y, "h");
    }
    // outboard engine nacelles (pods) flanking the hull
    rect(cx - 17, cx - 11, 16, 44, "h");
    rect(cx + 11, cx + 17, 16, 44, "h");
    // pylons joining the pods to the fuselage
    rect(cx - 11, cx - 8, 25, 31, "d");
    rect(cx + 8, cx + 11, 25, 31, "d");
    // cockpit canopy near the nose
    for (let y = 12; y <= 20; y++) fill(cx - 4, cx + 4, y, "g");
    // glowing intakes at the front of each nacelle
    rect(cx - 16, cx - 12, 17, 21, "c");
    rect(cx + 12, cx + 16, 17, 21, "c");
    // hull paneling/shadow on the rear
    rect(cx - 8, cx + 8, 33, 43, "d");
    // bright highlight stripe down the spine
    for (let y = 6; y <= 40; y++) fill(cx - 1, cx, y, "w");
    // exhaust: nacelles + central twin
    rect(cx - 16, cx - 12, 44, 47, "f");
    rect(cx + 12, cx + 16, 44, 47, "f");
    rect(cx - 6, cx - 3, 45, 47, "f");
    rect(cx + 3, cx + 6, 45, 47, "f");
    // trace a 1px outline: any empty cell touching the hull becomes an edge
    const isBody = (x, y) => x >= 0 && x < W && y >= 0 && y < H && g[y][x] !== "." && g[y][x] !== "k";
    const out = g.map((row) => row.slice());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (g[y][x] === "." && (isBody(x - 1, y) || isBody(x + 1, y) || isBody(x, y - 1) || isBody(x, y + 1)))
          out[y][x] = "k";
    return out.map((row) => row.join(""));
  }
  const SHUTTLE_ART = shuttle3();

  // A 3x3 raider/pirate craft, nose UP: a dark angular arrowhead (clearly NOT a
  // shuttle) with a red cockpit slit, red wing flashes and twin red engines.
  function raider3() {
    const W = 48, H = 48, cx = 23.5;
    const g = Array.from({ length: H }, () => Array(W).fill("."));
    const fill = (x0, x1, y, ch) => { for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = ch; };
    const rect = (x0, x1, y0, y1, ch) => { for (let y = y0; y <= y1; y++) fill(x0, x1, y, ch); };
    // a mean swept interceptor (nose UP): sharp central spike + broad delta wings
    for (let y = 3; y <= 44; y++) {
      const half = y < 34 ? 1 + (y - 3) * 0.18 : 6.5 - (y - 34) * 0.3;
      fill(cx - Math.max(1, half), cx + Math.max(1, half), y, "h");
    }
    // swept delta wings widening to sharp outboard tips
    for (let y = 16; y <= 40; y++) {
      const t = (y - 16) / 24;
      const outer = 4 + t * 19; // 4 → 23
      const inner = 4 + t * 4;
      fill(cx - outer, cx - inner, y, "h");
      fill(cx + inner, cx + outer, y, "h");
    }
    // rear hull shading
    rect(cx - 7, cx + 7, 26, 38, "d");
    // trailing-edge V notch — jagged predator tail (carve through hull + shading)
    for (let y = 35; y <= 41; y++) { const n = ((y - 35) / 6) * 9; fill(cx - n, cx + n, y, "."); }
    // red glowing cockpit slit near the nose
    for (let y = 8; y <= 16; y++) fill(cx - 1.5, cx + 1.5, y, "c");
    // red wing flashes near the tips
    for (let y = 24; y <= 34; y++) { fill(cx - 21, cx - 16, y, "r"); fill(cx + 16, cx + 21, y, "r"); }
    // outboard engine pods + central twin — red exhaust
    rect(cx - 20, cx - 16, 38, 46, "f");
    rect(cx + 16, cx + 20, 38, 46, "f");
    rect(cx - 5, cx - 2, 42, 47, "f");
    rect(cx + 2, cx + 5, 42, 47, "f");
    const isBody = (x, y) => x >= 0 && x < W && y >= 0 && y < H && g[y][x] !== "." && g[y][x] !== "k";
    const out = g.map((row) => row.slice());
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (g[y][x] === "." && (isBody(x - 1, y) || isBody(x + 1, y) || isBody(x, y - 1) || isBody(x, y + 1)))
          out[y][x] = "k";
    return out.map((row) => row.join(""));
  }
  const RAIDER_ART = raider3();

  /* ===== unique 32x32 module art (enabled) ===== */

  // O2 Generator — cyan twin oxygen tanks, manifold, "O2" gauge, status light
  const O2 = [
    "................................",
    "..........kkk........kkk........",
    ".........kdbdk......kdbdk.......",
    ".......kkkkkkkkkkkkkkkkkkkk.kkk..",
    "......kddddddddddddddddddhk.kLk..",
    "......kdbbbbbbbbbbbbbbbbbhk.kkk..",
    "......kdbbwwwwbbbbbbwwwwbhk......",
    "......kdbbwbbwbbbbbbwbbwbhk......",
    "......kdbbwbbwbbbbbbwbbwbhk......",
    "......kdbbwbbwbbbbbbwbbwbhk......",
    "......kdbbwwwwbbbbbbwbbwbhk......",
    "......kdbbbbbbbbbbbbwbbwbhk......",
    "......kdbbbbbbbbbbbbwwwwbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbhhbbbbbbbbbbbbhhbhk.....",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kdbbbbbbbbbbbbbbbbbhk......",
    "......kddddddddddddddddddhk......",
    ".......kkkkkkkkkkkkkkkkkkk.......",
    ".......kbbk..........kbbk........",
    ".......kbbk..........kbbk........",
    ".......kkkk..........kkkk........",
    "................................",
    "................................",
  ];

  // Methane Generator — orange tank with a burning flare stack on top
  const CH4 = [
    "...............ff...............",
    "..............fyf...............",
    "..............fyff..............",
    ".............ffyyf..............",
    ".............kkkkk.....kkk......",
    "......kkkkkkkkdbdkkkkk.kLk......",
    ".....kddddddddbybddddddkkkk.....",
    ".....kdbbbbbbbbybbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbffbbbbbbbbffbbhk.......",
    ".....kdbbffbbbbbbbbffbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbaaaabbbbbbhk.......",
    ".....kdbbbbbaaaaaabbbbbhk.......",
    ".....kdbbbbaaaaaaaabbbbhk.......",
    ".....kdbbbbbaaaaaabbbbbhk.......",
    ".....kdbbbbbbaaaabbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbhhbbbbbbbbhhbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kdbbbbbbbbbbbbbbbbhk.......",
    ".....kddddddddddddddddddhk......",
    "......kkkkkkkkkkkkkkkkkkk.......",
    "......kbbk..........kbbk........",
    "......kbbk..........kbbk........",
    "......kkkk..........kkkk........",
    "................................",
    "................................",
  ];

  // Bio Vat — green dome with a sprouting plant; bubbling nutrient liquid
  const VAT = [
    "...............gg...............",
    ".............g.gg.g.............",
    "..............ggg..............",
    "..........kkkkkkkkkkkk.....kkk..",
    ".......kkkkhhhhhhhhhhhhkkk.kLk..",
    ".....kkdddddddddddddddddhk.kkk..",
    "....kdgggggggggggggggggggdk.....",
    "....kdgggggggggggggggggggdk.....",
    "....kdglgggggqgggggglggggdk.....",
    "....kdgggggggggggqgggggggdk.....",
    "....kdgqggggggggggggggglgdk.....",
    "....kdgggggglgggggggqggggdk.....",
    "....kdgggqggggggglggggggqdk.....",
    "....kdglggggggqggggggggggdk.....",
    "....kdgggggggggggggqgggggdk.....",
    "....kdgggqgggglgggggggggldk.....",
    "....kdgggggggggggggqggggddk.....",
    "....kdgglggggggqggggggggdk......",
    "....kddddddddddddddddddddk......",
    "....kdbbbbbbbbbbbbbbbbbbdk......",
    "....kdbhbbbbbbbbbbbbbbhbdk......",
    "....kdbbbbbbbbbbbbbbbbbbdk......",
    "....kdbbbbbbbbbbbbbbbbbbdk......",
    "....kdbbbbbbbbbbbbbbbbbbdk......",
    "....kdbbbbbbbbbbbbbbbbbbdk......",
    "....kddddddddddddddddddddk......",
    ".....kkkkkkkkkkkkkkkkkkkk.......",
    ".......kbbk........kbbk.........",
    ".......kbbk........kbbk.........",
    ".......kkkk........kkkk.........",
    "................................",
    "................................",
  ];

  // Bot Bay — open hangar with hazard chevrons and a docked drone inside
  // Bot Bay: a 1×2 hull hangar. Top tile = the launch opening (faces space); the
  // renderer rotates it so the opening points outward. Bottom tile = the body.
  const BAY = [
    "hhhhhhhhhhhhhhhh",
    "hbbbbbbbbbbbbbbh",
    "hbyyggggggggyybh",
    "hbggggggggggggbh",
    "hbggggggggggggbh",
    "hbgggccccgggggbh",
    "hbggccccccggggbh",
    "hbggggccccggggbh",
    "hbggggggggggggbh",
    "hbggggggggggggbh",
    "hbggggggggggggbh",
    "hbyyggggggggyybh",
    "hbbbbbbbbbbbbbbh",
    "hbddddddddddddbh",
    "hbbbbbbbbbbbbbbh",
    "hhhhhhhhhhhhhhhh",
    "hhhhhhhhhhhhhhhh",
    "hddddddddddddddh",
    "hdoooooooooooodh",
    "hdoooooooooooodh",
    "hdoowwwwwwwwoodh",
    "hdoowwddddwwoodh",
    "hdoowwwwwwwwoodh",
    "hdoooooooooooodh",
    "hddddddddddddddh",
    "hdLddddddddddddh",
    "hddddddddddddddh",
    "hbbbbbbbbbbbbbbh",
    "hbbbbbbbbbbbbbbh",
    "hddddddddddddddh",
    "hddddddddddddddh",
    "hhhhhhhhhhhhhhhh",
  ];

  // Lounge — cosy room: neon sign, a round table with two stools, plants
  const REC = [
    "................................",
    "..kkkkkkkkkkkkkkkkkkkkkkkk.kkk..",
    "..kbbbbbbbbbbbbbbbbbbbbbbk.kLk..",
    "..kbbnnnbbbbnnnnbbbbnnnbbk.kkk..",
    "..kbbnbnbbbbnbbbbbbbnbnbbk......",
    "..kbbnnnbbbbnnnbbbbbnnnbbk......",
    "..kbbnbbbbbbnbbbbbbbnbbbbk......",
    "..kbbnbbbbbbnnnnbbbbnnnbbk......",
    "..kssssssssssssssssssssssk......",
    "..ksbbbbbbbbbbbbbbbbbbbbsk......",
    "..ksbbbbbbbttttttbbbbbbbsk......",
    "..ksbbbbbbtaaaaaatbbbbbbsk......",
    "..ksbbbbbbtaaaaaatbbbbbbsk......",
    "..ksbbbbbbbttttttbbbbbbbsk......",
    "..ksbbbbbbbbbttbbbbbbbbbsk......",
    "..ksbbbbbbbbbttbbbbbbbbbsk......",
    "..ksbbgbbhhbbbbbbhhbbgbbsk......",
    "..ksbbgbhaahbbbbhaahbgbbsk......",
    "..ksbgggbhhbbbbbbhhbgggbsk......",
    "..ksbgggbbbbbbbbbbbbgggbsk......",
    "..ksbbbbbbbbbbbbbbbbbbbbsk......",
    "..ksbbbbbbbbbbbbbbbbbbbbsk......",
    "..kssssssssssssssssssssssk......",
    "..kbbbbbbbbbbbbbbbbbbbbbbk......",
    "..kbbbbbbbbbbbbbbbbbbbbbbk......",
    "..kkkkkkkkkkkkkkkkkkkkkkkk......",
    "...kbbk..............kbbk.......",
    "...kbbk..............kbbk.......",
    "...kkkk..............kkkk.......",
    "................................",
    "................................",
    "................................",
  ];

  // Trade Hub — market kiosk: striped awning, a big coin, stacked crates
  const TRADE = [
    "................................",
    "..yYyYyYyYyYyYyYyYyYyYyYyY.kkk..",
    "..kkkkkkkkkkkkkkkkkkkkkkkk.kLk..",
    "..kbbbbbbbbbbbbbbbbbbbbbbk.kkk..",
    "..kbbbbbbbbbyyyyyybbbbbbbk......",
    "..kbbbbbbbyyyyyyyyyybbbbbk......",
    "..kbbbbbbyyyykkkyyyybbbbbk......",
    "..kbbbbbyyyykkkkkyyyybbbbk......",
    "..kbbbbbyyykkyykkyyybbbbbk......",
    "..kbbbbbyyykkyykkyyybbbbbk......",
    "..kbbbbbyyykkyykkyyybbbbbk......",
    "..kbbbbbbyyyykkkyyyybbbbbk......",
    "..kbbbbbbbyyyyyyyyybbbbbbk......",
    "..kbbbbbbbbbyyyyybbbbbbbbk......",
    "..kbbbbbbbbbbbbbbbbbbbbbbk......",
    "..kbbcccccbbbbbbbbcccccbbk......",
    "..kbbcggcgbbbbbbbbcggcgcbk......",
    "..kbbcccccbbbbbbbbccccccck......",
    "..kbbcggcgbbcccccbbcggcgbk......",
    "..kbbcccccbbcggcgbbcccccbk......",
    "..kbbbbbbbbbcccccbbbbbbbbk......",
    "..kbbbbbbbbbcggcgbbbbbbbbk......",
    "..kbbbbbbbbbcccccbbbbbbbbk......",
    "..kbbbbbbbbbbbbbbbbbbbbbbk......",
    "..kddddddddddddddddddddddk......",
    "..kkkkkkkkkkkkkkkkkkkkkkkk......",
    "...kbbk..............kbbk.......",
    "...kbbk..............kbbk.......",
    "...kkkk..............kkkk.......",
    "................................",
    "................................",
    "................................",
  ];

  /* ===== 32x16 (2x1) modules ===== */

  // Rations Synth — counter with a dispenser hopper and a served meal/plate
  const SYNTH = [
    "kkkkkkkkkkkkkkk.kkkkkkkkkkkk.kkk.",
    "kbhhhhhhhhhhhbk.kbhhhhhhhhbk.kLk.",
    "kbhddddddddhhbk.kbhssssshhbk.kkk.",
    "kbhdaaaaaadhhbk.kbhsbbbbshhbk....",
    "kbhdaaaaaadhhbk.kbbbbbbbbbbbbk...",
    "kbhddaaaaddhhbk.kbwwwwwwwwwwbk...",
    "kbhhdaaaadhhhbk.kbwppppppppwbk...",
    "kbhhhdaadhhhhbk.kbwpaaaaaapwbk...",
    "kbhhhhddhhhhhbk.kbwppppppppwbk...",
    "kbhhhhhhhhhhhbk.kbwwwwwwwwwwbk...",
    "kbbbbbbbbbbbbbk.kbbbbbbbbbbbbk...",
    "kbbkbbbbbbbkbbk.kbbkbbbbbbkbbk...",
    "kbbkbbbbbbbkbbk.kbbkbbbbbbkbbk...",
    "kbbbbbbbbbbbbbk.kbbbbbbbbbbbbk...",
    "kkkkkkkkkkkkkkk.kkkkkkkkkkkkkk...",
    "................................",
  ];

  // Docking Port — a hull airlock hatch (1x1) with hazard corners + ring
  const DOCK = [
    "kkkkkkkkkkkkkkkk",
    "kbbyybbbbbbyybLk",
    "kbbyybbbbbbyybLk",
    "kbbbbbaaaabbbbbk",
    "kbbbbaaaaaabbbbk",
    "kbbbaakhhkaabbbk",
    "kbbbahhhhhhabbbk",
    "kbbbahhhhhhabbbk",
    "kbbbahhhhhhabbbk",
    "kbbbaakhhkaabbbk",
    "kbbbbaaaaaabbbbk",
    "kbbbbbaaaabbbbbk",
    "kbbyybbbbbbyybbk",
    "kbbyybbbbbbyybbk",
    "kbbbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkkkk",
  ];

  // Fuel Refinery (2x2) — twin amber fuel tanks with a gauge + status light
  const FR_CAP = D(3) + "hhhhhhhhh" + D(2) + "hhhhhhhhh" + D(3);
  const FR_BODY = D(3) + "hyyyyyyyh" + D(2) + "hyyyyyyyh" + D(3);
  const FR_HIGH = D(3) + "hywwwwwyh" + D(2) + "hywwwwwyh" + D(3);
  const FR_GAUGE = D(3) + "hyaaaaayh" + D(2) + "hyaaaaayh" + D(3);
  const FUELREFINERY = box2([
    D(25) + "L", D(26),
    FR_CAP, FR_BODY, FR_BODY, FR_BODY, FR_BODY, FR_BODY, FR_BODY,
    FR_HIGH, FR_BODY, FR_BODY, FR_BODY, FR_BODY, FR_BODY, FR_BODY,
    FR_BODY, FR_BODY, FR_BODY, FR_BODY, FR_GAUGE, FR_CAP,
    D(26), D(26), D(26), D(26), D(26),
  ]);

  // Med Bay (2x2) — a clean white ward panel with a big red medical cross + a bed
  const MEDBAY = (function () {
    const rows = [];
    for (let y = 0; y < 27; y++) {
      let s = "";
      for (let x = 0; x < 26; x++) {
        const vbar = x >= 11 && x <= 14 && y >= 4 && y <= 22;
        const hbar = y >= 11 && y <= 14 && x >= 5 && x <= 20;
        s += vbar || hbar ? "r" : "w";
      }
      rows.push(s);
    }
    rows[0] = rows[0].slice(0, 25) + "L"; // status light, top-right
    return box2(rows);
  })();

  // Research Lab (2x1) — a console screen with a graph + a bubbling flask
  const LAB = [
    "kkkkkkkkkkkkkkk.kkkkkkkkkkkk.kkk.",
    "kbhhhhhhhhhhhbk.kbhhhhhhhhbk.kLk.",
    "kbhwwwwwwwwwhbk.kbhbbgbbbbhbk.kkk",
    "kbhwgggggggwhbk.kbhbbggbbbhbk....",
    "kbhwgwgwgggwhbk.kbhbbggbbbhbk....",
    "kbhwggggwggwhbk.kbhbgggggbhbk....",
    "kbhwgggggggwhbk.kbhbggwwgggbk....",
    "kbhwwwwwwwwwhbk.kbhbgwwwwggbk....",
    "kbhbbbbbbbbbhbk.kbhbgwwwwggbk....",
    "kbhgbgbgbgbbhbk.kbhbggwwgggbk....",
    "kbbbbbbbbbbbbbk.kbbbggggggbbk....",
    "kbbkbbbbbbbkbbk.kbbkbbbbbbkbbk...",
    "kbbkbbbbbbbkbbk.kbbkbbbbbbkbbk...",
    "kbbbbbbbbbbbbbk.kbbbbbbbbbbbbk...",
    "kkkkkkkkkkkkkkk.kkkkkkkkkkkkkk...",
    "................................",
  ];

  // Storage Silo (1x1) — a banded tank with a hatch
  const SILO = [
    "................",
    "....kkkkkkkk....",
    "...khhhhhhhhk...",
    "...khdddddhhk...",
    "...khddddddhk...",
    "...khhhhhhhhk...",
    "...khddddddhk...",
    "...khddddddhk...",
    "...khhhhhhhhk...",
    "...khddddddhk...",
    "...khddddddhk...",
    "...khhhhhhhhk...",
    "...khdddddhhk...",
    "...kkkkkkkkkk...",
    "....kbbbbbbk....",
    "................",
  ];

  // Turret (1x1) — a swivel base with a twin barrel and a status light
  const TURRET = [
    "................",
    ".......LL.......",
    ".......bb.......",
    ".......bb.......",
    "......kbbk......",
    "....kkbbbbkk....",
    "...khhhhhhhhk...",
    "...khddddddhk...",
    "...khdkbbkdhk...",
    "...khhhhhhhhk...",
    "..kkhhhhhhhhkk..",
    "..khhhhhhhhhhk..",
    "..khdddddddhk...",
    "..kkkkkkkkkkk...",
    "...kbbbbbbbbk...",
    "................",
  ];

  // Fusion Reactor (2x2) — a contained plasma core, cyan glow
  const FUSION = box2([
    B(26), B(26), B(26),
    ...Array(7).fill(B(10) + "chwwhc" + B(10)),
    ...Array(3).fill(B(8) + "cchwwwwhcc" + B(8)),
    ...Array(9).fill(B(10) + "chwwhc" + B(10)),
    B(26), B(26), B(26), B(26), B(26),
  ]);

  // Cargo Exchange (2x2) — stacked crates and a big trade coin
  const CRATE = "b" + "dddh".repeat(6) + "b";
  const CARGOEX = box2([
    B(25) + "L", B(26),
    CRATE, CRATE, B(26), CRATE, CRATE, B(26), B(26),
    B(9) + "yyyyyyyy" + B(9),
    B(9) + "yhwwwwhy" + B(9),
    B(9) + "yhwccwhy" + B(9),
    B(9) + "yhwwwwhy" + B(9),
    B(9) + "yyyyyyyy" + B(9),
    B(26), CRATE, CRATE, B(26),
    B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26),
  ]);

  // AI Core (2x2) — a server/brain core laced with circuitry
  const AICORE = box2([
    B(25) + "L", B(26),
    B(4) + "h".repeat(18) + B(4),
    B(4) + "h" + B(16) + "h" + B(4),
    B(4) + "h" + B(16) + "h" + B(4),
    B(7) + "c".repeat(12) + B(7),
    B(7) + "c" + "h".repeat(10) + "c" + B(7),
    B(7) + "c" + "h".repeat(4) + "ww" + "h".repeat(4) + "c" + B(7),
    B(7) + "c" + "h".repeat(3) + "wwww" + "h".repeat(3) + "c" + B(7),
    B(7) + "c" + "h".repeat(3) + "wwww" + "h".repeat(3) + "c" + B(7),
    B(7) + "c" + "h".repeat(4) + "ww" + "h".repeat(4) + "c" + B(7),
    B(7) + "c" + "h".repeat(10) + "c" + B(7),
    B(7) + "c".repeat(12) + B(7),
    B(4) + "h" + B(16) + "h" + B(4),
    B(4) + "h" + B(16) + "h" + B(4),
    B(4) + "h".repeat(18) + B(4),
    B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26), B(26),
  ]);

  // --- Sector Beacon: one signature module per species (2x2) ---
  // Human — Command Hub: a wide console screen with a data graph
  const CMDHUB = box2([
    B(25) + "L", ...Array(5).fill(B(26)),
    B(2) + "h".repeat(22) + B(2),
    B(2) + "h" + "w".repeat(20) + "h" + B(2),
    B(2) + "h" + "w".repeat(8) + "c".repeat(4) + "w".repeat(8) + "h" + B(2),
    B(2) + "h" + "w".repeat(4) + "c".repeat(4) + "w".repeat(12) + "h" + B(2),
    B(2) + "h" + "w".repeat(20) + "h" + B(2),
    B(2) + "h".repeat(22) + B(2),
    ...Array(15).fill(B(26)),
  ]);
  // Drenn — Trade Nexus: a stamped coin
  const TRADENEXUS = box2([
    B(25) + "L", ...Array(7).fill(B(26)),
    B(8) + "h".repeat(10) + B(8),
    B(8) + "h" + "y".repeat(8) + "h" + B(8),
    B(8) + "h" + "y".repeat(2) + "c".repeat(4) + "y".repeat(2) + "h" + B(8),
    B(8) + "h" + "y".repeat(2) + "c".repeat(4) + "y".repeat(2) + "h" + B(8),
    B(8) + "h" + "y".repeat(8) + "h" + B(8),
    B(8) + "h".repeat(10) + B(8),
    ...Array(13).fill(B(26)),
  ]);
  // Thol — Auto-Forge: a tiered anvil throwing a spark
  const AUTOFORGE = box2([
    B(25) + "L", ...Array(6).fill(B(26)),
    B(11) + "c".repeat(4) + B(11),
    B(11) + "w".repeat(4) + B(11),
    B(5) + "h".repeat(16) + B(5),
    B(7) + "h".repeat(12) + B(7),
    B(9) + "h".repeat(8) + B(9),
    B(6) + "h".repeat(14) + B(6),
    ...Array(14).fill(B(26)),
  ]);
  // Vry'l — Bloom Garden: a sprouting plant
  const BLOOMGARDEN = box2([
    B(25) + "L", ...Array(4).fill(B(26)),
    B(12) + "g".repeat(2) + B(12),
    B(9) + "g".repeat(8) + B(9),
    B(7) + "g".repeat(12) + B(7),
    B(12) + "h".repeat(2) + B(12),
    B(12) + "h".repeat(2) + B(12),
    B(7) + "g".repeat(12) + B(7),
    B(9) + "g".repeat(8) + B(9),
    B(11) + "w".repeat(4) + B(11),
    ...Array(14).fill(B(26)),
  ]);
  // Korro — Ore Refinery: stacked smelting ore
  const OREREFINERY = box2([
    B(25) + "L", ...Array(6).fill(B(26)),
    B(5) + "h".repeat(6) + B(4) + "h".repeat(6) + B(5),
    B(5) + "c".repeat(6) + B(4) + "c".repeat(6) + B(5),
    B(5) + "h".repeat(6) + B(4) + "h".repeat(6) + B(5),
    B(10) + "h".repeat(6) + B(10),
    B(10) + "c".repeat(6) + B(10),
    B(10) + "h".repeat(6) + B(10),
    ...Array(14).fill(B(26)),
  ]);

  // Light Fixture (1x1) — a ceiling lamp glowing warm
  const LAMP = [
    "................",
    "................",
    ".....kkkkkk.....",
    "....kbbbbbbk....",
    "...kbwwwwwwbk...",
    "...kwLLLLLLwk...",
    "...kwLLLLLLwk...",
    "...kbwwwwwwbk...",
    "....kbbbbbbk....",
    ".....kkkkkk.....",
    ".......LL.......",
    "......LLLL......",
    ".......LL.......",
    "................",
    "................",
    "................",
  ];

  // Hotel Room — a made bed with pillow, headboard and a bedside lamp
  const HOTEL = [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...",
    "kbhhhhhhhhhhhhhhhhhhhhhhhhhhbk...",
    "kbhwwwwwwwwwwwwwwwwwwwbbggbbhk...",
    "kbhwwwwwwwwwwwwwwwwwwwbgyygbhk...",
    "kbhpppppwwwwwwwwwwwwwwbggggbhk...",
    "kbhpppppwwwwwwwwwwwwwwbbggbbhk...",
    "kbhpppppwwwwwwwwwwwwwwbbggbbhk...",
    "kbhwwwwwwwwwwwwwwwwwwwbbggbbhk...",
    "kbhqqqqqqqqqqqqqqqqqqqqqqqqqhk...",
    "kbhqqqqqqqqqqqqqqqqqqqqqqqqqhk...",
    "kbhqqqqqqqqqqqqqqqqqqqqqqqqqhk...",
    "kbhqqqqqqqqqqqqqqqqqqqqqqqqqhk...",
    "kbbkbbbbbbbbbbbbbbbbbbbbbbkbbk...",
    "kbbkbbbbbbbbbbbbbbbbbbbbbbkbbk...",
    "kbbbbbbbbbbbbbbbbbbbbbbbbbbbbk...",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk...",
  ];

  window.SPRITES = [
    /* ---------- structural tiles (1x1) ---------- */
    {
      name: "floor", tileW: 1, tileH: 1,
      palette: { v: "#0a0d12", d: "#161b22", m: "#222b34", p: "#2a343f", h: "#46586b", b: "#6a7d8d", r: "#5b3a29", w: "#dfe8f2" },
      states: { default: floorTile(), window: floorWindow() },
    },
    {
      name: "wall", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_STRAIGHT },
    },
    { name: "wallcorner", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_CORNER } },
    { name: "wallt", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_T } },
    { name: "wallcross", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_CROSS } },
    { name: "wallend", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_END } },
    { name: "wallnode", tileW: 1, tileH: 1, palette: WALL_PAL, states: { default: WALL_NODE } },
    {
      name: "door", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#33506e", g: "#1a2230", y: "#e8c349" },
      states: { closed: doorArt(false), open: doorArt(true) },
    },
    {
      name: "battery", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#8a6f24", y: "#d5b13a", g: "#49d17a", t: "#cdd4e2" },
      states: { default: [
        "................",".....tttt.......","....kkkkkk......","...kbbbbbbk.....",
        "...kbyyyyyk....","...kbygggyk.....","...kbygggyk.....","...kbygggyk.....",
        "...kbyyyyyk.....","...kbygggyk.....","...kbygggyk.....","...kbyyyyyk.....",
        "...kbbbbbbk.....","....kkkkkk......","................","................",
      ] },
    },

    /* ---------- power ---------- */
    {
      name: "solar", tileW: 1, tileH: 3,
      palette: { k: "#11151c", f: "#243447", c: "#3a7bd5", h: "#7fb0ee" },
      states: { default: solarRows() },
    },

    /* ---------- life support / production (2x2 & 2x1) ---------- */
    {
      name: "o2gen", tileW: 2, tileH: 2,
      palette: { k: "#11151c", d: "#1d5151", b: "#2f8a8a", h: "#79dada", w: "#e6ffff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "ch4gen", tileW: 2, tileH: 2,
      palette: { k: "#11151c", d: "#5e3c18", b: "#9a6c30", h: "#c08840", a: "#e8a55a", f: "#ef6b3a", y: "#ffd27a", L: "#49d17a", o: "#3a4350" },
      states: { enabled: CH4, disabled: off(CH4) },
    },
    {
      name: "cl2gen", tileW: 2, tileH: 2, // chlorine — green tanks (reuses the O₂ tank art)
      palette: { k: "#11151c", d: "#3a5118", b: "#6f9a30", h: "#9bd14a", w: "#e9ffd0", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "nh3gen", tileW: 2, tileH: 2, // ammonia — cold blue tanks
      palette: { k: "#11151c", d: "#1d2f55", b: "#3a5a9a", h: "#6a8fd1", w: "#dfe8ff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "h2gen", tileW: 2, tileH: 2, // hydrogen — magenta tanks
      palette: { k: "#11151c", d: "#511d3a", b: "#9a3a6c", h: "#d16a9b", w: "#ffd0e9", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "vat", tileW: 2, tileH: 2,
      palette: { k: "#11151c", d: "#23492c", b: "#2e5e38", h: "#4f9d5b", g: "#4f9d5b", l: "#7fd08f", q: "#bfeccb", L: "#49d17a", o: "#3a4350" },
      states: { enabled: VAT, disabled: off(VAT) },
    },
    {
      name: "bay", tileW: 1, tileH: 2,
      palette: { k: "#11151c", d: "#1f4f4f", b: "#2a6b6b", h: "#3a8a8a", g: "#13262e", y: "#e8c349", w: "#dfe6f2", c: "#9fe3e3", L: "#49d17a", o: "#3a4350" },
      states: { enabled: BAY, disabled: off(BAY) },
    },
    {
      name: "rec", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#9c4f86", s: "#7a3d68", t: "#5a2f4e", a: "#f0a9dc", n: "#ff79c6", g: "#6fcf97", h: "#cdd4e2", L: "#49d17a", o: "#3a4350" },
      states: { enabled: REC, disabled: off(REC) },
    },
    {
      name: "tradehub", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#2e6e4f", d: "#22513a", y: "#e8c349", Y: "#f2dd8a", c: "#b9966a", g: "#7a5f3a", L: "#49d17a", o: "#3a4350" },
      states: { enabled: TRADE, disabled: off(TRADE) },
    },
    {
      name: "synth", tileW: 2, tileH: 1,
      palette: { k: "#11151c", b: "#7a4a22", h: "#9a6230", d: "#5e3a1c", a: "#e0a36a", s: "#bfe6ff", w: "#cdd4e2", p: "#e8c9a0", L: "#49d17a", o: "#3a4350" },
      states: { enabled: SYNTH, disabled: off(SYNTH) },
    },
    {
      name: "hotel", tileW: 2, tileH: 1,
      // neutral palette so a hotel can be tinted in its prepped species' colour
      palette: { k: "#11151c", b: "#4a5364", h: "#6a7486", w: "#d8dee8", p: "#aeb8c8", q: "#c2cad6", g: "#8a93a6", y: "#eef2f8" },
      states: { default: HOTEL },
    },
    {
      name: "dock", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#2a4a78", h: "#3a5f9a", a: "#7fb0e8", y: "#e8c349", L: "#49d17a", o: "#3a4350" },
      states: { enabled: DOCK, disabled: off(DOCK) },
    },
    {
      name: "docklarge", tileW: 1, tileH: 1, // bigger berth — teal trim
      palette: { k: "#11151c", b: "#1f5a55", h: "#2f8a80", a: "#7fe8d8", y: "#e8c349", L: "#49d17a", o: "#3a4350" },
      states: { enabled: DOCK, disabled: off(DOCK) },
    },
    {
      name: "docksuper", tileW: 1, tileH: 1, // spaceport — gold trim
      palette: { k: "#11151c", b: "#6a5320", h: "#9a7a2e", a: "#ffe08a", y: "#fff0c0", L: "#49d17a", o: "#3a4350" },
      states: { enabled: DOCK, disabled: off(DOCK) },
    },
    {
      name: "fuelrefinery", tileW: 2, tileH: 2,
      palette: { k: "#11151c", d: "#241c10", h: "#7a6a44", y: "#e8b24a", a: "#ff8a3a", w: "#ffe6a8", L: "#49d17a", o: "#3a4350" },
      states: { enabled: FUELREFINERY, disabled: off(FUELREFINERY) },
    },
    {
      name: "medbay", tileW: 2, tileH: 2,
      palette: { k: "#11151c", w: "#e6ecf2", r: "#e24b4b", L: "#49d17a", o: "#3a4350" },
      states: { enabled: MEDBAY, disabled: off(MEDBAY) },
    },
    {
      name: "heater", tileW: 2, tileH: 2, // warms a wing — orange coils (reuses the O₂ tank art)
      palette: { k: "#11151c", d: "#5e2a18", b: "#9a4a2e", h: "#e8794a", w: "#ffd6b0", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "cooler", tileW: 2, tileH: 2, // chills a wing — icy blue coils (reuses the O₂ tank art)
      palette: { k: "#11151c", d: "#16384e", b: "#2e6a8a", h: "#4ab0e8", w: "#d6f0ff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: O2, disabled: off(O2) },
    },
    {
      name: "lab", tileW: 2, tileH: 1,
      palette: { k: "#11151c", b: "#241d44", h: "#4f3f8f", w: "#bfe9ff", d: "#3a2f6b", g: "#9b7bff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: LAB, disabled: off(LAB) },
    },
    {
      name: "silo", tileW: 1, tileH: 1,
      palette: { k: "#11151c", h: "#7c8596", d: "#4a5160", b: "#3a4150" },
      states: { default: SILO },
    },
    {
      name: "turret", tileW: 1, tileH: 1,
      palette: { k: "#11151c", h: "#c0564a", d: "#7a2f28", b: "#3a2520", L: "#49d17a", o: "#3a4350" },
      states: { enabled: TURRET, disabled: off(TURRET) },
    },
    {
      name: "lamp", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#8a7320", w: "#ffe9a8", L: "#fff6d8", o: "#4a4530" },
      states: { enabled: LAMP, disabled: off(LAMP) },
    },
    {
      name: "fusion", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#123038", h: "#2e7d99", c: "#7fe9ff", w: "#e6ffff" },
      states: { default: FUSION },
    },
    {
      name: "cargoex", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#234a36", d: "#3a6b4a", h: "#5a8f68", y: "#caa23a", c: "#ffd86a", w: "#f2e4a8", L: "#49d17a", o: "#3a4350" },
      states: { enabled: CARGOEX, disabled: off(CARGOEX) },
    },
    {
      name: "aicore", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#241d44", h: "#4a3f7a", c: "#8a6cf0", w: "#cfe8ff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: AICORE, disabled: off(AICORE) },
    },
    {
      name: "cmdhub", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#1a2c4a", h: "#3a5f9a", c: "#6ea8ff", w: "#bfe9ff", L: "#49d17a", o: "#3a4350" },
      states: { enabled: CMDHUB, disabled: off(CMDHUB) },
    },
    {
      name: "tradenexus", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#3a3418", h: "#8a7320", y: "#caa23a", c: "#ffd86a", L: "#49d17a", o: "#3a4350" },
      states: { enabled: TRADENEXUS, disabled: off(TRADENEXUS) },
    },
    {
      name: "autoforge", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#3a2418", h: "#8a5320", w: "#ffd27a", c: "#ef6b3a", L: "#49d17a", o: "#3a4350" },
      states: { enabled: AUTOFORGE, disabled: off(AUTOFORGE) },
    },
    {
      name: "bloomgarden", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#1d3a22", h: "#5a8f68", g: "#7fd08f", w: "#bfeccb", L: "#49d17a", o: "#3a4350" },
      states: { enabled: BLOOMGARDEN, disabled: off(BLOOMGARDEN) },
    },
    {
      name: "orerefinery", tileW: 2, tileH: 2,
      palette: { k: "#11151c", b: "#3a1d1a", h: "#7a3328", c: "#e8a55a", L: "#49d17a", o: "#3a4350" },
      states: { enabled: OREREFINERY, disabled: off(OREREFINERY) },
    },

    /* ---------- habitation (1x1) ---------- */
    {
      name: "pod", tileW: 1, tileH: 1,
      // neutral greys/whites so the renderer can tint a cabin in its prepped
      // species' colour (the dark frame stays dark under any tint).
      palette: { k: "#11151c", b: "#4a5364", h: "#5a6678", p: "#cfd6e2", s: "#222a38" },
      states: { default: [
        "kkkkkkkkkkkkkkkk","kbbbbbbbbbbbbbbk","kbssssssssssssbk","kbssssssssssssbk",
        "kbsppppppppppsbk","kbsppppppppppsbk","kbsppppppppppsbk","kbsppppppppppsbk",
        "kbsppppppppppsbk","kbsppppppppppsbk","kbssssssssssssbk","kbssssssssssssbk",
        "kbbbbbbbbbbbbbbk","khbbbbbbbbbbbbhk","kbbbbbbbbbbbbbbk","kkkkkkkkkkkkkkkk",
      ] },
    },

    /* ---------- creatures (idle / walk / dead) ---------- */
    {
      name: "human", tileW: 1, tileH: 1,
      palette: { k: "#11151c", s: "#d9a066", c: "#3f6fb0", b: "#2a4a78" },
      states: {
        idle: [
          "................","......kkkk......",".....khsssk.....",".....khsssk.....",
          ".....ksssssk....","......kkkk......",".....kccck......","....kccccck.....",
          "...kcccccck.....","....kccccck.....",".....kcccck.....",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....khsssk.....",".....khsssk.....",
          ".....ksssssk....","......kkkk......",".....kccck......","....kcccccck....",
          "...kcccccckk....","....kccccck.....",".....kcccck.....",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..ksssk.kkkkk...",
          ".kkssskcccccck..",".ksssskcccccbk..",".kkkkkkbbbbbbk..","..kkkkkkkkkkk...",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "drenn", tileW: 1, tileH: 1,
      palette: { k: "#11151c", s: "#cbb46a", c: "#e8c349", b: "#9a7d22", e: "#1a2230" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "vorn", tileW: 1, tileH: 1, // methane-breathing merchant — the CH₄ Drenn
      palette: { k: "#11151c", s: "#c79bd0", c: "#b256c9", b: "#7a2f8f", e: "#1a2230" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "thol", tileW: 1, tileH: 1,
      palette: { k: "#11151c", s: "#d98a3a", c: "#a85f1f", b: "#7a4416", e: "#1a2230" },
      states: {
        idle: [
          "................",".....kkkkkk.....","....kssssssk....","....kseesesk....",
          "....kssssssk....","....kkssssk.....","....kccccck.....","...kccccccck....",
          "...kccccccck....","...kccccccck....","...kccccccck....","....kbbbbbk.....",
          "....kbb.bbk.....","....kbb.bbk.....","....kkk.kkk.....","................",
        ],
        walk: [
          "................",".....kkkkkk.....","....kssssssk....","....kseesesk....",
          "....kssssssk....","....kkssssk.....","....kccccck.....","...kccccccckk...",
          "..kcccccccck....","...kccccccck....","...kccccccck....","....kbbbbbk.....",
          "...kbb.bbbk.....","..kbb...kbk.....",".kk......kk.....","................",
        ],
        dead: [
          "................","................","................","................",
          "................","...kkk..........","..kssssk.kkkkk..",".kssseskcccccck.",
          ".ksssssccccccck.",".kkssskcccccbbk.","..kkkkkbbbbbbk..","...kkkkkkkkkk...",
          "................","................","................","................",
        ],
      },
    },

    {
      name: "vryl", tileW: 1, tileH: 1,
      palette: { k: "#11151c", s: "#8fd14f", c: "#5f9e34", b: "#3f6e22", e: "#13201a" },
      states: {
        idle: [
          "................","......kkkk......",".....ksssssk....",".....ksesesk....",
          ".....ksssssk....","......kssk......",".....kccck......","....kcccccck....",
          "...kccccccck....","....kcccccck....",".....kcccck.....",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....ksssssk....",".....ksesesk....",
          ".....ksssssk....","......kssk......",".....kccck......","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kcccck.....",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kkk..........","..ksssssk.kkkk.",
          ".ksseseskccccck.",".ksssssccccccbk.","..kkkkkbbbbbk...","...kkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },

    {
      name: "korro", tileW: 1, tileH: 1,
      palette: { k: "#11151c", s: "#c0453a", c: "#8f2f28", b: "#5e1f1a", e: "#ffd27a" },
      states: {
        idle: [
          "................",".....kkkkkk.....","....kssssssk....","....kseesesk....",
          "....kssssssk....","....kkssssk.....","...kccccccck....","..kcccccccck....",
          "..kcccccccck....","...kccccccck....","...kccccccck....","....kbbbbbk.....",
          "....kbb.bbk.....","....kbb.bbk.....","....kkk.kkk.....","................",
        ],
        walk: [
          "................",".....kkkkkk.....","....kssssssk....","....kseesesk....",
          "....kssssssk....","....kkssssk.....","...kccccccck....","..kccccccckk....",
          ".kcccccccck.....","..kccccccck.....","...kccccccck....","....kbbbbbk.....",
          "...kbb.bbbk.....","..kbb...kbk.....",".kk......kk.....","................",
        ],
        dead: [
          "................","................","................","................",
          "................","...kkk..........","..kssssk.kkkkk..",".kssseskcccccck.",
          ".ksssssccccccck.",".kkssskcccccbbk.","..kkkkkbbbbbbk..","...kkkkkkkkkk...",
          "................","................","................","................",
        ],
      },
    },

    /* ---------- space objects (1x1) ---------- */
    {
      name: "chlorithe", tileW: 1, tileH: 1, // Cl₂ crystalline — green
      palette: { k: "#11151c", s: "#cfe89a", c: "#9bd14a", b: "#5e8a2a", e: "#1a2230" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "naaz", tileW: 1, tileH: 1, // NH₃ ammonia — icy blue
      palette: { k: "#11151c", s: "#bcd0f0", c: "#6a8fd1", b: "#3a5a9a", e: "#1a2230" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "voltaar", tileW: 1, tileH: 1, // H₂ energy-being — magenta, glowing eyes
      palette: { k: "#11151c", s: "#f0bcd6", c: "#d16a9b", b: "#9a3a6c", e: "#fff0c0" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "sszra", tileW: 1, tileH: 1, // O₂ reptilian sentinel — jade scales, slit eyes
      palette: { k: "#11151c", s: "#9fe8d4", c: "#57c2a8", b: "#2e7a68", e: "#e8d24a" },
      states: {
        idle: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "....kcccccck....","....kcccccck....",".....kccck......",".....kbbbk......",
          ".....kb.bk......",".....kb.bk......",".....kk.kk......","................",
        ],
        walk: [
          "................","......kkkk......",".....kssssk.....",".....kseesk.....",
          ".....ksssskk....","......kkkk......",".....kcccck.....","....kcccccck....",
          "...kcccccckk....","....kcccccck....",".....kccck......",".....kbbbk......",
          "....kb.bbk......","...kb..kbk......","..kk....kk......","................",
        ],
        dead: [
          "................","................","................","................",
          "................","................","...kk...........","..kssk.kkkkkk...",
          ".kkssskccccccck.",".ksssskcccccbk..",".kkkkkkbbbbbk...","..kkkkkkkkkk....",
          "................","................","................","................",
        ],
      },
    },
    {
      name: "asteroid", tileW: 1, tileH: 1,
      palette: { k: "#0c0f15", r: "#8a7a5c", d: "#6b5f47", l: "#a89a78", c: "#4a4234" },
      states: { default: [
        "................","....kkkkkk......","...krrrrrrk.....","..krrlrrrrrk....",
        ".krrrrrcrrrrk...",".krlrrrrrrrdk...",".krrrrcrrrrrk...","krrrrrrrrlrrrk..",
        "krrcrrrrrrrrrk..",".krrrrrlrrrdk...",".krdrrrrrrrrk...",".krrrrrcrrrk....",
        "..krrrrrrrk.....","...kkkkkkk......","................","................",
      ] },
    },
    {
      name: "shuttle", tileW: 3, tileH: 3, // steel dropship: canopy, intakes, spine highlight
      palette: { k: "#11151c", h: "#9aa6b8", d: "#586679", g: "#7fc0ff", f: "#ffb347", c: "#86e6ff", w: "#eef4fb" },
      states: { default: SHUTTLE_ART },
    },
    {
      name: "trader", tileW: 3, tileH: 3, // green commerce hauler
      palette: { k: "#11151c", h: "#6fcf97", d: "#3f8a64", g: "#bdf0d2", f: "#ffd27a", c: "#bff0e0", w: "#eafff2" },
      states: { default: SHUTTLE_ART },
    },
    {
      name: "raider", tileW: 3, tileH: 3, // pirate craft — dark hull, red glow
      palette: { k: "#0a0608", h: "#43323a", d: "#2a1d24", c: "#ff4b4b", r: "#c0392b", f: "#ff7a3a" },
      states: { default: RAIDER_ART },
    },
    {
      name: "drone", tileW: 1, tileH: 1,
      palette: { k: "#11151c", h: "#dfe6f2", d: "#8a93a6", g: "#ffd27a", c: "#8a7a5c" },
      states: {
        empty: [
          "................","................","................","......kkkk......",
          ".....khhhhk.....","....khhgghhk....","....khhgghhk....",".kk.khhhhhhk.kk.",
          ".kdk.khhhhk.kdk.",".kk..khddhk..kk.",".....kkkkkk.....","................",
          "................","................","................","................",
        ],
        laden: [
          "................","................","................","......kkkk......",
          ".....khhhhk.....","....khhgghhk....","....khhgghhk....",".kk.khhhhhhk.kk.",
          ".kdk.khhhhk.kdk.",".kk..khddhk..kk.",".....kcccck.....",".....kcccck.....",
          "......kkkk......","................","................","................",
        ],
      },
    },
  ];

  // Give every species a suited graphic (helmet + suit), worn when off-air.
  for (const s of window.SPRITES) {
    if (!SUIT_VISOR[s.name] || !s.states.idle) continue;
    s.palette = { ...s.palette, G: SUIT_VISOR[s.name], p: "#eaffff", U: "#c4d4e6", V: "#7e93ad" };
    s.states.suitidle = suitUp(s.states.idle);
    s.states.suitwalk = suitUp(s.states.walk);
  }

  // ---- race-god creature portraits (alien sea-life) — shown in the god dialog
  // and drifting through space. Built procedurally on a 32×32 grid, auto-outlined.
  function god2(draw) {
    // S=2 scales the 32-unit design space onto a 64×64 grid (2 tiles × 32px), so
    // each god's draw() coords stay as authored while the art renders at full res.
    const S = 2, W = 32 * S, H = 32 * S, g = Array.from({ length: H }, () => Array(W).fill("."));
    const set = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = ch; };
    const px = (x, y, ch) => { for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) set(x * S + dx, y * S + dy, ch); };
    const disc = (cx, cy, r, ch) => { cx *= S; cy *= S; r *= S; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) set(cx + x, cy + y, ch); };
    const ell = (cx, cy, rx, ry, ch) => { cx *= S; cy *= S; rx *= S; ry *= S; for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) set(cx + x, cy + y, ch); };
    const line = (x0, y0, x1, y1, ch) => { x0 *= S; y0 *= S; x1 *= S; y1 *= S; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, ch); };
    draw({ px, disc, ell, line });
    const isB = (x, y) => x >= 0 && y >= 0 && x < W && y < H && g[y][x] !== "." && g[y][x] !== "k";
    const out = g.map((r) => r.slice());
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === "." && (isB(x - 1, y) || isB(x + 1, y) || isB(x, y - 1) || isB(x, y + 1))) out[y][x] = "k";
    return out.map((r) => r.join(""));
  }
  const GOD_ART = {
    human: god2((d) => { for (let k = 0; k < 8; k++) { const a = -1.1 + k * 0.32; d.disc(15 + Math.cos(a) * 7, 15 + Math.sin(a) * 7, 3, "b"); } d.ell(22, 9, 3, 2, "b"); d.px(25, 9, "c"); d.disc(10, 25, 2, "b"); d.disc(12, 27, 2, "b"); d.px(20, 9, "e"); }), // seahorse
    drenn: god2((d) => { d.ell(16, 17, 9, 7, "b"); d.ell(16, 17, 6, 4, "c"); d.ell(16, 7, 3, 2, "a"); d.ell(7, 16, 3, 2, "a"); d.ell(25, 16, 3, 2, "a"); d.ell(10, 25, 2, 2, "a"); d.ell(22, 25, 2, 2, "a"); d.px(16, 6, "e"); }), // turtle
    korro: god2((d) => { d.disc(16, 12, 7, "b"); d.px(13, 11, "e"); d.px(19, 11, "e"); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; d.line(16, 18, 16 + Math.cos(a) * 12, 25 + Math.sin(a) * 6, "b"); } }), // octopus
    thol: god2((d) => { d.ell(16, 17, 8, 5, "b"); d.disc(7, 12, 3, "a"); d.disc(25, 12, 3, "a"); for (let k = -2; k <= 2; k++) { d.line(10, 19, 5, 23 + k, "a"); d.line(22, 19, 27, 23 + k, "a"); } d.px(13, 15, "e"); d.px(19, 15, "e"); }), // crab
    vryl: god2((d) => { d.ell(16, 12, 8, 6, "b"); d.ell(16, 11, 8, 2, "c"); for (let k = -3; k <= 3; k++) d.line(16 + k * 2, 17, 16 + k * 2 + k, 28, "b"); }), // jellyfish
    vorn: god2((d) => { for (let k = 0; k < 18; k++) { const a = k * 0.55, r = 2 + k * 0.85; d.disc(16 + Math.cos(a) * r * 0.55, 16 + Math.sin(a) * r * 0.55, Math.max(1, 3 - k * 0.12), "b"); } }), // nautilus
    chlorithe: god2((d) => { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 - Math.PI / 2; d.line(16, 16, 16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, "b"); d.disc(16 + Math.cos(a) * 13, 16 + Math.sin(a) * 13, 2, "b"); } d.disc(16, 16, 4, "c"); }), // starfish
    naaz: god2((d) => { for (let x = -13; x <= 13; x++) { const span = Math.max(0, 8 - Math.abs(x) * 0.55); for (let y = -span; y <= span; y++) d.px(16 + x, 14 + y, "b"); } d.line(16, 20, 16, 30, "b"); d.px(12, 12, "e"); d.px(20, 12, "e"); }), // manta ray
    voltaar: god2((d) => { d.ell(14, 18, 8, 6, "b"); d.disc(8, 18, 3, "b"); d.line(20, 12, 25, 5, "c"); d.disc(25, 4, 2, "e"); d.px(12, 16, "e"); }), // anglerfish
    sszra: god2((d) => { for (let x = 3; x < 29; x++) { const y = 16 + Math.sin(x * 0.5) * 6; d.disc(x, y, 2, "b"); } d.px(28, Math.round(16 + Math.sin(29 * 0.5) * 6), "e"); }), // eel
  };
  const GOD_PAL = {
    human: { k: "#11151c", b: "#f0a06a", c: "#ffd0a0", a: "#e08a5a", e: "#1a2230" },
    drenn: { k: "#11151c", b: "#6fae6f", c: "#3f7a3f", a: "#cfae7a", e: "#1a2230" },
    korro: { k: "#11151c", b: "#c0564a", c: "#e0786a", a: "#8a2f28", e: "#ffe06a" },
    thol: { k: "#11151c", b: "#d98a3a", c: "#b06a20", a: "#8a5320", e: "#1a2230" },
    vryl: { k: "#11151c", b: "#8fd14f", c: "#cfeccb", a: "#5a8f3a", e: "#1a2230" },
    vorn: { k: "#11151c", b: "#c79bd5", c: "#e0c0ec", a: "#9a6cae", e: "#1a2230" },
    chlorithe: { k: "#11151c", b: "#9bd14a", c: "#e9ffd0", a: "#6f9a30", e: "#1a2230" },
    naaz: { k: "#11151c", b: "#6a8fd1", c: "#a8c0ec", a: "#3a5a9a", e: "#ffe06a" },
    voltaar: { k: "#11151c", b: "#d16a9b", c: "#f0bcd6", a: "#9a3a6c", e: "#ffffff" },
    sszra: { k: "#11151c", b: "#57c2a8", c: "#9fe8d4", a: "#2e7a68", e: "#e8d24a" },
  };
  for (const sp of Object.keys(GOD_ART)) window.SPRITES.push({ name: "god_" + sp, tileW: 2, tileH: 2, palette: GOD_PAL[sp], states: { default: GOD_ART[sp] } });

  // ---- reproduction: an egg clutch, and the spiders that hatch from bad eggs ----
  window.SPRITES.push({
    name: "egg", tileW: 1, tileH: 1,
    palette: { k: "#1a1410", b: "#e8d8b0", h: "#fff6e0" },
    states: { default: [
      "................","................","......hkk.......",".....khbbk......",
      ".....kbbbk......","......kkk.......","...hkk...hkk....","..khbbk.khbbk...",
      "..kbbbk.kbbbk...","...kkk...kkk....","................",".....hkk........",
      "....khbbk.......","....kbbbk.......",".....kkk........","................",
    ] },
  });
  window.SPRITES.push({
    name: "spider", tileW: 1, tileH: 1,
    palette: { k: "#0c0e12", b: "#3a2233", e: "#ff3b3b" },
    states: { default: [
      "................","....k......k....","...k.k....k.k...","....k.kkkk.k....",
      ".....kbbbbk.....","...kkbbbbbbkk...","..k.kbeebebk.k..",".k..kbbbbbbk..k.",
      ".k..kbbbbbbk..k.","..k.kkbbbbkk.k..","...k..kkkk..k...","..k..k....k..k..",
      ".k...k....k...k.",".....k....k.....","................","................",
    ] },
  });

  // ---- normalize the whole set to 32px per tile ----------------------------
  // The art above is authored at 16px/tile; the editor and renderer now work at
  // 32px/tile. Nearest-neighbour-upscale any sprite still at a coarser res so
  // every tile is exactly 32×32 (a multi-tile sprite expands to 32·tileW ×
  // 32·tileH). This is a lossless foundation — the look is unchanged until you
  // refine detail per sprite in the editor.
  const upscaleRows = (rows, factor) => {
    const out = [];
    for (const row of rows) {
      let wide = "";
      for (const ch of row) wide += ch.repeat(factor);
      for (let k = 0; k < factor; k++) out.push(wide);
    }
    return out;
  };
  for (const s of window.SPRITES) {
    const states = Object.keys(s.states);
    const first = (s.states[states[0]] || [])[0] || "";
    // base res matches the renderer's derivation (floor), so a stray ±1 ragged
    // column doesn't skew it; we then square every state to exactly baseW×baseH.
    const res = s.res || Math.floor(first.length / s.tileW) || 16;
    const baseW = s.tileW * res, baseH = s.tileH * res;
    const factor = res >= 32 ? 1 : Math.round(32 / res);
    for (const st of states) {
      let rows = s.states[st].slice(0, baseH);
      while (rows.length < baseH) rows.push("");
      rows = rows.map((r) => (r.length >= baseW ? r.slice(0, baseW) : r + ".".repeat(baseW - r.length)));
      s.states[st] = factor === 1 ? rows : upscaleRows(rows, factor);
    }
    s.res = res >= 32 ? res : 32;
  }
})();
