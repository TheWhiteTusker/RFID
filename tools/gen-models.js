// Regenerate every product model:  npm run models
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { build } from "./lib/gltf.js";
import { SHAPES } from "./lib/primitives.js";
import { PRODUCTS } from "./products.js";

const OUT = join(process.cwd(), "public", "models");
mkdirSync(OUT, { recursive: true });

for (const [slug, parts] of Object.entries(PRODUCTS)) {
  // the photo frame is a standing frame, so it gets a slight backward tilt
  const rootRot = slug === "photo-frame" ? [-8, 0, 0] : null;
  const file = join(OUT, slug + ".gltf");
  writeFileSync(file, JSON.stringify(build(parts, rootRot)));

  const tris = parts.reduce((a, p) => a + SHAPES[p.shape].idx.length / 3, 0);
  console.log(
    slug.padEnd(19),
    String(parts.length).padStart(3) + " parts",
    String(tris).padStart(6) + " tris",
    (statSync(file).size / 1024).toFixed(1).padStart(6) + " KB"
  );
}
