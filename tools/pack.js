// Pack artist deliveries into the .glb files the kiosk loads.
//
//   npm run pack            every populated delivery folder
//   npm run pack <slug>     just that one
//   npm run pack:watch      repack whenever files land in a delivery folder
//
// One folder per product: drop the .gltf, its .bin and every texture into
// public/models/_orig/<slug>/ exactly as delivered — nothing here writes back to
// them. Widths come from each product's own Dimensions spec, so no number is
// ever typed twice, and the wood naming below is applied during the pack, since
// a fresh Blender export always arrives without it.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, mkdirSync, watch } from "node:fs";
import { join, sep } from "node:path";

const ORIG = join("public", "models", "_orig");

// finish.js only tints materials matching /wood/i, and no artist names them that.
// Patterns rather than exact names: Blender's .001 / .003 suffixes drift on
// every re-export, the base name does not.
const WOOD = {
  "perpetual-calendar": /^(pCube13|Cube\.022)_BAKED/,
};

const { order } = JSON.parse(readFileSync(join("data", "catalogue.json"), "utf8"));

/** Pack one delivery folder. Returns false when there is nothing in it yet. */
function pack(slug) {
  const dir = join(ORIG, slug);
  mkdirSync(dir, { recursive: true });          // keep every drop folder present
  const gltf = readdirSync(dir).find((f) => f.toLowerCase().endsWith(".gltf"));
  if (!gltf) return false;

  const product = JSON.parse(readFileSync(join("data", "products", slug + ".json"), "utf8"));
  const dims = (product.specs.find((s) => /dimension/i.test(s[0])) || [])[1] || "";
  const width = (dims.match(/W\s*([\d.]+)\s*cm/i) || [])[1];
  if (!width) {
    console.error(`${slug}: no "W <n> cm" in its Dimensions spec — skipped`);
    return false;
  }

  // pack-glb does the renaming; check here so the warning names the real problem
  const names = (JSON.parse(readFileSync(join(dir, gltf), "utf8")).materials || [])
    .map((m) => m.name);
  const wood = names.filter((n) => WOOD[slug]?.test(n) || /wood/i.test(n));
  if (!wood.length)
    console.warn(`  ! ${slug}: nothing matches /wood/i or its WOOD pattern — finish swatches` +
      ` will do nothing. Materials: ${names.join(", ")}`);

  console.log(`${slug}  (${gltf}, ${width} cm wide, wood: ${wood.join(", ") || "none"})`);
  execFileSync(process.execPath,
    ["tools/pack-glb.js", dir, join("public", "models", slug + ".glb"), width,
     ...(WOOD[slug] ? [WOOD[slug].source] : [])],
    { stdio: "inherit" });

  if (product.model !== `/models/${slug}.glb`)
    console.warn(`  ! ${slug}: data/products/${slug}.json still points at "${product.model}"` +
      ` — change it to "/models/${slug}.glb"`);
  return true;
}

const arg = process.argv[2];

if (arg === "--watch") {
  for (const slug of order) mkdirSync(join(ORIG, slug), { recursive: true });

  // Dropping a delivery is a burst of file events and a 10 MB texture takes a
  // moment to finish copying, so wait for a second of quiet before packing.
  const pending = new Map();
  watch(ORIG, { recursive: true }, (_e, file) => {
    const slug = String(file).split(sep)[0];   // watch reports "<slug><sep>file"
    if (!order.includes(slug)) return;
    clearTimeout(pending.get(slug));
    pending.set(slug, setTimeout(() => {
      pending.delete(slug);
      // a half-copied file throws; the next event repacks it
      try { pack(slug); } catch (e) { console.error(`${slug}: ${e.message} — waiting`); }
    }, 1000));
  });

  console.log(`watching ${ORIG}/<slug>/ — drop a .gltf, its .bin and textures in, ` +
    `then reload the page. Ctrl+C to stop.`);
} else if (arg) {
  if (!order.includes(arg)) {
    console.error(`unknown slug "${arg}" — expected one of: ${order.join(", ")}`);
    process.exit(1);
  }
  if (!pack(arg)) console.error(`no .gltf in ${join(ORIG, arg)}`);
} else {
  const n = order.filter(pack).length;
  console.log(n ? `\npacked ${n}` : `\nnothing to pack — drop deliveries into ${ORIG}/<slug>/`);
}
