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

  // --- wall autotile set: thin directional bulkheads (d = recessed hull,
  // k edge, m body, h highlight). The renderer picks one by neighbour mask. ---
  const WROW = D(5) + "khmmmk" + D(5); // vertical strut segment
  const WALL_STRAIGHT = [
    ...Array(5).fill(D(16)),
    "k".repeat(16), "h".repeat(16), "m".repeat(16), "m".repeat(16), "m".repeat(16), "k".repeat(16),
    ...Array(5).fill(D(16)),
  ];
  // Connects N + E as a TRUE quarter-circle arc: an annulus band centred on the
  // top-right corner (16,0), radii 5..11, so its top/right openings land on
  // cols/rows 5-10 and meet the straight struts cleanly. (k edges, h highlight, m body.)
  const arcCorner = (cx, cy) => {
    const rows = [];
    for (let y = 0; y < 16; y++) {
      let s = "";
      for (let x = 0; x < 16; x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
        const r = Math.sqrt(dx * dx + dy * dy);
        s += r < 5 || r > 11 ? "d" : r < 6 ? "k" : r < 7 ? "h" : r < 10 ? "m" : "k";
      }
      rows.push(s);
    }
    return rows;
  };
  const WALL_CORNER = arcCorner(16, 0); // base = N + E (renderer rotates for the others)
  const WALL_T = [ // connects N + E + S
    WROW, WROW, WROW, WROW, WROW,
    D(5) + "k".repeat(11), D(5) + "h".repeat(11), D(5) + "m".repeat(11),
    D(5) + "m".repeat(11), D(5) + "m".repeat(11), D(5) + "k".repeat(11),
    WROW, WROW, WROW, WROW, WROW,
  ];
  const WALL_CROSS = [
    WROW, WROW, WROW, WROW, WROW,
    "k".repeat(16), "h".repeat(16), "m".repeat(16), "m".repeat(16), "m".repeat(16), "k".repeat(16),
    WROW, WROW, WROW, WROW, WROW,
  ];
  const WALL_END = [ // a capped stub pointing N
    WROW, WROW, WROW, WROW, WROW, WROW, WROW, WROW, WROW,
    D(5) + "khhhhk" + D(5), D(5) + "kkkkkk" + D(5),
    ...Array(5).fill(D(16)),
  ];
  const WALL_NODE = [ // isolated post
    ...Array(5).fill(D(16)),
    D(5) + "kkkkkk" + D(5), D(5) + "khhhhk" + D(5), D(5) + "khmmhk" + D(5),
    D(5) + "khmmhk" + D(5), D(5) + "khhhhk" + D(5), D(5) + "kkkkkk" + D(5),
    ...Array(5).fill(D(16)),
  ];
  const WALL_PAL = { d: "#1b212b", k: "#3a4250", m: "#8a93a6", h: "#b4bcca" };
  const box2 = (rows) => [
    "................................",
    ".." + "k".repeat(28) + "..",
    ...rows.map((r) => ".." + "k" + r + "k" + ".."),
    ".." + "k".repeat(28) + "..",
    "................................",
    "................................",
  ];
  // build the repeating 1x3 solar array (16 wide, 48 tall)
  function solarRows() {
    const r = [
      "......kkkk......",
      "......kffk......",
      "....ffffffff....",
      "..ffffffffffff..",
    ];
    for (let y = 4; y < 47; y++) {
      r.push((y - 4) % 4 === 3 ? "fkkkkkkkkkkkkkkf" : "fccckccckccckccf");
    }
    r.push("ffffffffffffffff");
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
      palette: { d: "#222a36", m: "#2b3645", r: "#3a4658" },
      states: { default: [
        "dddddddddddddddd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dmmrmmmmmmmmrmmd",
        "dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd",
        "dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd",
        "dmmrmmmmmmmmrmmd","dmmmmmmmmmmmmmmd","dmmmmmmmmmmmmmmd","dddddddddddddddd",
      ] },
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
      states: {
        closed: [
          "kkkkkkkkkkkkkkkk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk",
          "kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kyyyyyyggyyyyyyk",
          "kyyyyyyggyyyyyyk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk",
          "kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kbbbbbbggbbbbbbk","kkkkkkkkkkkkkkkk",
        ],
        open: [
          "kkkkkkkkkkkkkkkk","kbbg........gbbk","kbbg........gbbk","kbbg........gbbk",
          "kbbg........gbbk","kbbg........gbbk","kbbg........gbbk","kyyg........gyyk",
          "kyyg........gyyk","kbbg........gbbk","kbbg........gbbk","kbbg........gbbk",
          "kbbg........gbbk","kbbg........gbbk","kbbg........gbbk","kkkkkkkkkkkkkkkk",
        ],
      },
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
})();
