// Regenerate procedural product models with 3 finish variants into subfolders: npm run models
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { build, gltfToGlb } from "./lib/gltf.js";
import { PRODUCTS } from "./products.js";

const OUT = join(process.cwd(), "public", "models");
const FINISHES = {
  natural: [0.78, 0.62, 0.42],
  walnut:  [0.30, 0.19, 0.10],
  black:   [0.07, 0.07, 0.07],
};

const PROCEDURAL = ["desktask", "puzzle-3pc", "slim-tictactoe"];

for (const slug of PROCEDURAL) {
  const parts = PRODUCTS[slug];
  if (!parts) continue;
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });

  for (const [finish, rgb] of Object.entries(FINISHES)) {
    const gltf = build(parts, null, rgb);
    const glb = gltfToGlb(gltf);
    const file = join(dir, `${slug}-${finish}.glb`);
    writeFileSync(file, glb);
    console.log(`${slug}/${slug}-${finish}.glb  (${(glb.length / 1024).toFixed(1)} KB)`);
  }
}
