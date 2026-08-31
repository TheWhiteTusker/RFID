// The catalogue as geometry, sized from the published dimensions on latticelane.com.

import { cm, box, cyl, ball, ring, ttGrid, plate } from "./lib/parts.js";

const PRODUCTS = {};

// 1. Game Box — W 17.2 x L 12.6 x H 3.7 cm, tic tac toe up top, brainvita beneath
{
  const W = cm(17.2), D = cm(12.6), H = cm(3.7), top = H / 2, bot = -H / 2;
  const parts = [box("wood", [0, 0, 0], [W, H, D])];
  parts.push(box("woodAlt", [0, top - cm(0.15), 0], [cm(9.4), cm(0.3), cm(9.4)])); // recessed play area
  parts.push(...ttGrid(top - cm(0.05), cm(9), cm(0.35)));

  // acrylic tokens: two O discs and one X
  const cell = cm(3);
  parts.push(cyl("acrylic", [-cell, top + cm(0.3), -cell], [cm(2), cm(0.6), cm(2)]));
  parts.push(cyl("acrylic", [cell, top + cm(0.3), cell], [cm(2), cm(0.6), cm(2)]));
  for (const a of [45, -45]) parts.push(box("acrylic", [0, top + cm(0.3), 0], [cm(2.2), cm(0.6), cm(0.45)], [0, a, 0]));

  // loose metal marbles resting beside the board
  for (const [x, z] of [[-cm(6.6), -cm(3.4)], [-cm(6.4), cm(0.4)], [cm(6.5), cm(3.2)], [cm(6.7), -cm(1)]])
    parts.push(ball("metal", [x, top + cm(0.55), z], cm(1.1)));

  // brainvita: 33-hole cross on the underside
  for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
    if (Math.abs(i - 3) > 1 && Math.abs(j - 3) > 1) continue;
    parts.push(cyl("groove", [(i - 3) * cm(1.5), bot + cm(0.12), (j - 3) * cm(1.5)], [cm(1), cm(0.35), cm(1)]));
  }
  PRODUCTS["game-box"] = parts;
}

// 2. Slim Tic Tac Toe — W 10 x L 10 x H 1 cm
{
  const S = cm(10), H = cm(1), top = H / 2;
  const parts = [box("wood", [0, 0, 0], [S, H, S])];
  parts.push(...ttGrid(top - cm(0.04), cm(8), cm(0.28)));
  const c = cm(2.7);
  for (const [x, z] of [[-c, -c], [c, 0], [0, c]])
    parts.push(cyl("acrylic", [x, top + cm(0.22), z], [cm(1.8), cm(0.45), cm(1.8)]));
  for (const [x, z] of [[0, 0], [-c, c]]) for (const a of [45, -45])
    parts.push(box("acrylic", [x, top + cm(0.22), z], [cm(2), cm(0.45), cm(0.4)], [0, a, 0]));
  PRODUCTS["slim-tictactoe"] = parts;
}

// 3. Three-piece burr puzzle — W 14.5 x L 13 x H 5.5 cm, three bars interlocked
{
  const t = cm(3.4);
  PRODUCTS["puzzle-3pc"] = [
    box("wood", [0, 0, 0], [cm(14.5), t, t]),
    box("woodAlt", [0, 0, 0], [t, t, cm(13)]),
    box("wood", [0, 0, 0], [t * 0.98, cm(5.5), t * 0.98]),
  ];
}

// 4 & 5. Infinity lamps — W 13.8 x L 18.8 x H 7.6 cm, base + glass + receding light rings
function infinityLamp(gw, gh) {
  // The listing reads "W 13.8 x L 18.8 x H 7.6". Read literally that is a low, deep
  // slab, but the product shots (Infi_Small_Squer_Wall.png) show an upright panel, so
  // L is treated as height and H as depth. Panel size is capped by the 13.8 width.
  const W = cm(13.8), TOT = cm(18.8), D = cm(7.6), base = cm(4.0), fr = cm(1.0);
  const y0 = -TOT / 2;
  const y = y0 + base + fr + gh / 2;
  const parts = [box("wood", [0, y0 + base / 2, 0], [W, base, D])];

  // eight rings receding through the depth: the tunnel the listing describes
  for (let i = 0; i < 8; i++) {
    const k = 1 - i * 0.1;
    parts.push(ring("glow", [0, y, D / 2 - cm(1.1) - i * cm(0.72)],
                    Math.min(gw, gh) * 0.72 * k, [90, 0, 0]));
  }
  parts.push(box("felt", [0, y, -D / 2 + cm(0.3)], [gw, gh, cm(0.3)]));   // back mirror
  parts.push(box("glass", [0, y, D / 2 - cm(0.3)], [gw, gh, cm(0.4)]));   // front glass

  for (const [x, yy, w, h] of [                                          // frame around the panel
    [0, y + gh / 2 + fr / 2, gw + fr * 2, fr], [0, y - gh / 2 - fr / 2, gw + fr * 2, fr],
    [-gw / 2 - fr / 2, y, fr, gh], [gw / 2 + fr / 2, y, fr, gh],
  ]) parts.push(box("wood", [x, yy, 0], [w, h, D]));
  return parts;
}
PRODUCTS["infinity-square"] = infinityLamp(cm(11), cm(11));      // 1.8 base + 5.8 glass = 7.6 H
PRODUCTS["infinity-rectangle"] = infinityLamp(cm(11.5), cm(7));

// 6. Magnetic photo frame — W 10 x H 10 x L 2.2 cm, two plates with corner magnets
{
  const S = cm(10), bar = cm(1.4), d = cm(0.9);
  const parts = [
    box("wood", [0, 0, -cm(0.6)], [S, S, d]),          // back plate
    box("paper", [0, 0, -cm(0.1)], [cm(7.2), cm(7.2), cm(0.06)]), // photo
  ];
  for (const [x, y, w, h] of [                          // front border, four bars
    [0, S / 2 - bar / 2, S, bar], [0, -S / 2 + bar / 2, S, bar],
    [-S / 2 + bar / 2, 0, bar, S - bar * 2], [S / 2 - bar / 2, 0, bar, S - bar * 2],
  ]) parts.push(box("wood", [x, y, cm(0.35)], [w, h, d]));
  for (const x of [-1, 1]) for (const y of [-1, 1])
    parts.push(cyl("metal", [x * cm(3.6), y * cm(3.6), cm(0.35)], [cm(1), cm(1.05), cm(1)], [90, 0, 0]));
  PRODUCTS["photo-frame"] = parts;
}

// 7. DeskTask — W 17.6 x L 10 x H 3.3 cm, pen wells, card slot, phone slot
{
  const W = cm(17.6), D = cm(10), H = cm(3.3), top = H / 2;
  const parts = [box("wood", [0, 0, 0], [W, H, D])];
  parts.push(box("groove", [-cm(3.4), top - cm(0.35), 0], [cm(9.4), cm(0.7), cm(6.4)])); // card well
  parts.push(box("paper", [-cm(3.4), top - cm(0.1), 0], [cm(9), cm(0.5), cm(6)]));       // to-do cards
  for (const x of [cm(4.4), cm(6.6)]) {                                                  // pen wells + pens
    parts.push(cyl("groove", [x, top - cm(0.4), -cm(2.2)], [cm(1.7), cm(0.9), cm(1.7)]));
    parts.push(cyl("woodAlt", [x + cm(0.3), top + cm(3.4), -cm(1.6)], [cm(0.7), cm(8.4), cm(0.7)], [12, 0, -6]));
  }
  parts.push(box("groove", [cm(5.5), top - cm(0.3), cm(2.6)], [cm(6.4), cm(0.9), cm(1.2)], [0, 0, 0])); // phone slot
  parts.push(box("felt", [cm(5.5), top + cm(2.4), cm(2.9)], [cm(6), cm(5.4), cm(0.5)], [-14, 0, 0]));   // phone
  PRODUCTS["desktask"] = parts;
}

// Engraving plates, positioned on each product's front face (0.2mm proud of it).
const PLATES = {
  "game-box":           [[0, 0, cm(6.4)],  [cm(10), cm(1.8)]],
  "slim-tictactoe":     [[0, 0, cm(5.06)], [cm(7), cm(0.6)]],
  "puzzle-3pc":         [[0, 0, cm(1.72)], [cm(9), cm(1.6)]],
  "infinity-square":    [[0, cm(-7.5), cm(3.82)], [cm(9), cm(1.1)]],
  "infinity-rectangle": [[0, cm(-7.5), cm(3.82)], [cm(9), cm(1.1)]],
  "photo-frame":        [[0, cm(-4.3), cm(0.81)], [cm(6.4), cm(1)]],
  "desktask":           [[0, 0, cm(5.02)], [cm(12), cm(2)]],
};

for (const [slug, [pos, size]] of Object.entries(PLATES)) PRODUCTS[slug].push(plate(pos, size));

export { PRODUCTS };
