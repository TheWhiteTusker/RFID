// Applying a finish to whatever the modeller actually delivered.
//
// Two routes, in order of preference:
//   1. KHR_materials_variants — the artist authored Walnut/Natural/Black properly.
//   2. Tinting any material whose name contains "wood".
//
// Matching is loose on purpose: a professional export will not be named exactly
// "wood", it will be "Wood_Oak" or "WOOD.001".

export const FINISH = {
  Walnut:  { dot: "#68583C", rgb: [0.30, 0.19, 0.10] },
  Natural: { dot: "#E4CBAA", rgb: [0.78, 0.62, 0.42] },
  Black:   { dot: "#252525", rgb: [0.07, 0.07, 0.07] },
};

const isWood = (name) => /wood/i.test(name) && !/woodalt/i.test(name);
const isWoodAlt = (name) => /woodalt/i.test(name);

/** True when the loaded model carries authored material variants we can use. */
export function hasVariants(mv) {
  const v = mv.availableVariants;
  return Array.isArray(v) && Object.keys(FINISH).every((f) => v.includes(f));
}

export function apply(mv, finish) {
  if (!mv.model) return;

  if (hasVariants(mv)) {
    mv.variantName = finish;   // artist-authored, always better than tinting
    return;
  }

  const c = FINISH[finish].rgb;
  for (const m of mv.model.materials) {
    const name = m.name || "";
    if (isWood(name)) m.pbrMetallicRoughness.setBaseColorFactor([...c, 1]);
    // secondary wood parts stay a shade deeper so joinery still reads
    else if (isWoodAlt(name))
      m.pbrMetallicRoughness.setBaseColorFactor(c.map((v) => v * 0.55).concat(1));
  }
}

/** Warn once per model if nothing is tintable — catches a bad export immediately. */
export function audit(mv, slug) {
  if (!mv.model || hasVariants(mv)) return;
  const names = mv.model.materials.map((m) => m.name || "(unnamed)");
  if (!names.some(isWood))
    console.warn(
      `[${slug}] no material matching /wood/i and no Walnut/Natural/Black variants — ` +
      `finish swatches will do nothing. Materials: ${names.join(", ")}`
    );
}
