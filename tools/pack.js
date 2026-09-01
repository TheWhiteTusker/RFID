// Pack artist deliveries into the .glb files the kiosk loads.
//
//   npm run pack            every populated delivery folder
//   npm run pack <slug>     just that one
//   npm run pack:watch      repack whenever files land in a delivery folder
//
// One folder per product: drop the .gltf, its .bin and every texture into
// public/models/_orig/<slug>/ exactly as delivered — nothing here writes back to
// them. When the finish is baked into the texture rather than tintable, give it
// a subfolder per finish (black/, natural/, walnut/) and each packs to its own
// <slug>-<finish>.glb, which the page swaps between. Widths come from each product's own Dimensions spec, so no number is
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
  // Aug 2026 re-export renamed every part. Names carry no meaning, so these two
  // were picked by sampling the baked base colours: Cube_BAKED (#d6975a, the base
  // bar) and Plane.007_BAKED (#cc925a, the body). Plane.008 and polySurface15 bake
  // to near-black and are not timber.
  "perpetual-calendar": /^(Cube|Plane\.007)_BAKED/,
};

const { order } = JSON.parse(readFileSync(join("data", "catalogue.json"), "utf8"));

const gltfIn = (dir) => readdirSync(dir).find((f) => f.toLowerCase().endsWith(".gltf"));

/** Pack one delivery folder. Returns false when there is nothing in it yet. */
function pack(slug) {
  const dir = join(ORIG, slug);
  mkdirSync(dir, { recursive: true });          // keep every drop folder present

  // Either the .gltf sits in the folder — one model, tinted per finish at
  // runtime — or the folder holds a subfolder per finish, each baked in its own
  // wood colour. A baked colour lives in the texture and cannot be tinted, so
  // those pack to <slug>-<finish>.glb and the page swaps the whole file.
  const jobs = gltfIn(dir)
    ? [[dir, slug + ".glb", true]]
    : readdirSync(dir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && gltfIn(join(dir, e.name)))
        // lowercased: a redelivered folder comes back as "Natural" as easily as
        // "natural", and the URL in the product record cannot chase that
        .map((e) => [join(dir, e.name), `${slug}-${e.name.toLowerCase()}.glb`, false]);
  if (!jobs.length) return false;

  const product = JSON.parse(readFileSync(join("data", "products", slug + ".json"), "utf8"));
  const dims = (product.specs.find((s) => /dimension/i.test(s[0])) || [])[1] || "";
  const width = (dims.match(/W\s*([\d.]+)\s*cm/i) || [])[1];
  if (!width) {
    console.error(`${slug}: no "W <n> cm" in its Dimensions spec — skipped`);
    return false;
  }

  for (const [src, out, tinted] of jobs) {
    // pack-glb does the renaming; check here so the warning names the real problem
    const names = (JSON.parse(readFileSync(join(src, gltfIn(src)), "utf8")).materials || [])
      .map((m) => m.name);
    const wood = tinted ? names.filter((n) => WOOD[slug]?.test(n) || /wood/i.test(n)) : [];
    if (tinted && !wood.length)
      console.warn(`  ! ${slug}: nothing matches /wood/i or its WOOD pattern — finish swatches` +
        ` will do nothing. Materials: ${names.join(", ")}`);

    console.log(`${out}  (${gltfIn(src)}, ${width} cm wide, ` +
      (tinted ? `wood: ${wood.join(", ") || "none"})` : "finish baked in)"));
    execFileSync(process.execPath,
      ["tools/pack-glb.js", src, join("public", "models", out), width,
       ...(tinted && WOOD[slug] ? [WOOD[slug].source] : [])],
      { stdio: "inherit" });
  }

  // every packed file has to be reachable from the product record, or the page
  // will keep loading whatever it pointed at before
  const refs = [product.model, ...Object.values(product.models || {})];
  for (const [, out] of jobs)
    if (!refs.includes(`/models/${out}`))
      console.warn(`  ! ${slug}: nothing in data/products/${slug}.json points at ` +
        `"/models/${out}" — add it as "model" or under "models"`);
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
