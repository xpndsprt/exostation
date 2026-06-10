/* EXOSTATION — sprite library.
 * Consumed by editor.html. Each sprite: shared `palette` (char->hex, '.' =
 * transparent) and named `states` (state -> array of pixel rows).
 * Sizes match in-game footprints: solar 1x3, generators/vat/bay/lounge/tradehub
 * 2x2, synth/hotel 2x1, tiles+crew+ships 1x1.
 * Creatures: idle/walk/dead.  Active modules: enabled/disabled (disabled just
 * switches the status light off — derived from enabled with off()).
 */
(function () {
  // disabled = enabled with the green status light (L) turned to off (o)
  const off = (rows) => rows.map((r) => r.split("L").join("o"));
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
  const BAY = [
    "................................",
    "..kkkkkkkkkkkkkkkkkkkkkkkk.kkk..",
    "..khhhhhhhhhhhhhhhhhhhhhhk.kLk..",
    "..khyybbyybbyybbyybbyybyhk.kkk..",
    "..khbyybbyybbyybbyybbyybhk......",
    "..khggggggggggggggggggggdk......",
    "..khggggggggggggggggggggdk......",
    "..khgggggggggddggggggggggk......",
    "..khggggggggddddgggggggggk......",
    "..khgggggggdwwwwdggggggggk......",
    "..khggggggdwwddwwdgggggggk......",
    "..khgggggggwwddwwggggggggk......",
    "..khggggggggdwwwwdggggggggk.....",
    "..khgggggggcdddddcggggggggk.....",
    "..khggggggcgggggggcgggggggk.....",
    "..khgggggggggggggggggggggk......",
    "..khggggggggggggggggggggdk......",
    "..khggggggggggggggggggggdk......",
    "..khhhhhhhhhhhhhhhhhhhhhhk......",
    "..khbbbbbbbbbbbbbbbbbbbbhk......",
    "..khbbbbbbbbbbbbbbbbbbbbhk......",
    "..khbyybbyybbyybbyybbyybhk......",
    "..khyybbyybbyybbyybbyybyhk......",
    "..khbbbbbbbbbbbbbbbbbbbbhk......",
    "..kddddddddddddddddddddddk......",
    "..kkkkkkkkkkkkkkkkkkkkkkkk......",
    "...kbbk..............kbbk.......",
    "...kbbk..............kbbk.......",
    "...kkkk..............kkkk.......",
    "................................",
    "................................",
    "................................",
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
      name: "wall", tileW: 1, tileH: 1,
      palette: { h: "#aab3c2", m: "#8a93a6", e: "#5b6373" },
      states: { default: [
        "hhhhhhhhhhhhhhhh","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme",
        "hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme",
        "hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme",
        "hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","hmmmmmmmmmmmmmme","eeeeeeeeeeeeeeee",
      ] },
    },
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
      name: "vat", tileW: 2, tileH: 2,
      palette: { k: "#11151c", d: "#23492c", b: "#2e5e38", h: "#4f9d5b", g: "#4f9d5b", l: "#7fd08f", q: "#bfeccb", L: "#49d17a", o: "#3a4350" },
      states: { enabled: VAT, disabled: off(VAT) },
    },
    {
      name: "bay", tileW: 2, tileH: 2,
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
      palette: { k: "#11151c", b: "#9b6caf", h: "#c99bd5", w: "#f0dcf5", p: "#e8c349", q: "#caa6da", g: "#c0b0cc", y: "#ffe9a8" },
      states: { default: HOTEL },
    },
    {
      name: "dock", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#2a4a78", h: "#3a5f9a", a: "#7fb0e8", y: "#e8c349", L: "#49d17a", o: "#3a4350" },
      states: { enabled: DOCK, disabled: off(DOCK) },
    },

    /* ---------- habitation (1x1) ---------- */
    {
      name: "pod", tileW: 1, tileH: 1,
      palette: { k: "#11151c", b: "#6e4f9b", h: "#9b6cd5", p: "#cdb6ee", s: "#1a2230" },
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

    /* ---------- space objects (1x1) ---------- */
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
      name: "shuttle", tileW: 1, tileH: 1,
      palette: { k: "#11151c", h: "#b9c2d0", d: "#8a93a6", g: "#6ea8ff", f: "#e8a33d" },
      states: { default: [
        "................","................","......kk........",".....khhk.......",
        ".....khhk.......","....khhhhk......","...khhhhhhk.....","..khhhhgghhk....",
        "..khhhhgghhk....","..khddddddhk....",".kfk.kdd.kfk....",".kfk.kkk.kfk....",
        "................","................","................","................",
      ] },
    },
    {
      name: "trader", tileW: 1, tileH: 1,
      palette: { k: "#11151c", h: "#6fcf97", d: "#3f8a64", g: "#bdf0d2", y: "#e8c349" },
      states: { default: [
        "................","................","...kk....kk.....","..khhk..khhk....",
        "..khhkkkkhhk....","..khhhhhhhhk....",".khhhggghhhhk...",".khhhggghhhhk...",
        ".khhhhhhhhhhk...",".khddddddddhk...",".kyk.kddk.kyk...",".kyk.kkkk.kyk...",
        "................","................","................","................",
      ] },
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
})();
