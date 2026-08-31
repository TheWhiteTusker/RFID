// Pack a multi-file .gltf (+ .bin + loose textures) into one self-contained .glb.
//
//   node tools/pack-glb.js <dir-with-gltf> <out.glb> [width-in-cm] [wood-pattern]
//
// Artists deliver .gltf + sidecars more often than the .glb docs/MODEL-SPEC.md asks
// for, and every sidecar filename is hardcoded inside the JSON — rename one and the
// model silently stops loading. One file removes that whole class of breakage.
//
// Also drops unreferenced images, drops clips whose keyframes never change,
// (given a width) rescales to real-world metres centred on the origin, matching
// what tools/gen-models.js emits, and (given a wood-pattern) prefixes matching
// material names with "wood_" so finish.js can tint them.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const [dir, out, widthCm, woodPattern] = process.argv.slice(2);
if (!dir || !out) { console.error("usage: pack-glb.js <dir> <out.glb> [width-cm] [wood-pattern]"); process.exit(1); }

const gltfName = readdirSync(dir).find((f) => extname(f) === ".gltf");
const g = JSON.parse(readFileSync(join(dir, gltfName), "utf8"));

// finish.js tints materials matching /wood/i and no artist names them that, so
// mark the timber here rather than editing the delivered .gltf — a re-export
// would drop the edit anyway.
if (woodPattern) {
  const re = new RegExp(woodPattern);
  for (const m of g.materials || []) if (re.test(m.name)) m.name = "wood_" + m.name;
}

if (g.buffers.length !== 1) throw new Error("expected exactly one buffer");

// Blender happily exports several root nodes. Wrap them in one so the bbox walk
// and the rescale below reach every part instead of only the first root.
const scene = g.scenes[g.scene || 0];
if (scene.nodes.length !== 1) {
  g.nodes.push({ name: "Root", children: [...scene.nodes] });
  scene.nodes = [g.nodes.length - 1];
}
const chunks = [readFileSync(join(dir, g.buffers[0].uri))];
let len = chunks[0].length;
const pad4 = () => { const p = (4 - (len % 4)) % 4; if (p) { chunks.push(Buffer.alloc(p)); len += p; } };

// --- drop images and textures nothing reaches, then embed what is left ----------
const usedMat = new Set();
for (const m of g.meshes) for (const p of m.primitives) if (p.material != null) usedMat.add(p.material);

const usedTex = new Set();
const walk = (o) => {
  if (!o || typeof o !== "object") return;
  if (typeof o.index === "number" && typeof o.texCoord === "number") usedTex.add(o.index);
  for (const k in o) walk(o[k]);
};
for (const i of usedMat) walk(g.materials[i]);

const texMap = new Map([...usedTex].sort((a, b) => a - b).map((old, i) => [old, i]));
const keptTex = [...texMap.keys()].map((i) => g.textures[i]);
const imgMap = new Map([...new Set(keptTex.map((t) => t.source))].sort((a, b) => a - b).map((old, i) => [old, i]));

g.images = [...imgMap.keys()].map((i) => {
  const im = g.images[i];
  pad4();
  const bytes = readFileSync(join(dir, im.uri));
  g.bufferViews.push({ buffer: 0, byteOffset: len, byteLength: bytes.length });
  chunks.push(bytes);
  len += bytes.length;
  return { name: im.name, mimeType: im.mimeType, bufferView: g.bufferViews.length - 1 };
});
g.textures = keptTex.map((t) => ({ ...t, source: imgMap.get(t.source) }));
for (const i of usedMat) walk2(g.materials[i]);
function walk2(o) {
  if (!o || typeof o !== "object") return;
  if (typeof o.index === "number" && typeof o.texCoord === "number") o.index = texMap.get(o.index);
  for (const k in o) if (k !== "index") walk2(o[k]);
}

// --- drop clips that hold every channel at one pose (a button that does nothing) --
const CT = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array };
const N = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
const bin0 = chunks[0];
const readAcc = (i) => {
  const a = g.accessors[i], bv = g.bufferViews[a.bufferView];
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  return Array.from(new CT[a.componentType](bin0.buffer, bin0.byteOffset + off, a.count * N[a.type]));
};
const moves = (clip) => clip.channels.some((c) => {
  const v = readAcc(clip.samplers[c.sampler].output);
  const stride = v.length / g.accessors[clip.samplers[c.sampler].input].count;
  return v.some((x, k) => Math.abs(x - v[k % stride]) > 1e-6);
});
if (g.animations) {
  const kept = g.animations.filter(moves);
  if (kept.length) g.animations = kept; else delete g.animations;
}

// --- real-world scale, centred on the origin like the generated models -----------
if (widthCm) {
  const root = g.nodes[scene.nodes[0]];
  const mul = (a, b) => { const o = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
  const trs = (n) => {
    const t = n.translation || [0, 0, 0], [x, y, z, w] = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1];
    const R = [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1];
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) R[c * 4 + r] *= s[c];
    return [...R.slice(0, 12), t[0], t[1], t[2], 1];
  };
  const ap = (m, p) => [0, 1, 2].map((r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r]);
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  (function bbox(i, par) {
    const n = g.nodes[i], M = mul(par, trs(n));
    if (n.mesh != null) for (const pr of g.meshes[n.mesh].primitives) {
      const a = g.accessors[pr.attributes.POSITION];
      for (let b = 0; b < 8; b++) {
        const p = ap(M, [b & 1 ? a.max[0] : a.min[0], b & 2 ? a.max[1] : a.min[1], b & 4 ? a.max[2] : a.min[2]]);
        for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
      }
    }
    for (const c of n.children || []) bbox(c, M);
  })(scene.nodes[0], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  const f = (widthCm / 100) / (hi[0] - lo[0]);
  root.scale = (root.scale || [1, 1, 1]).map((s) => s * f);
  root.translation = [0, 1, 2].map((k) => (root.translation?.[k] || 0) * f - (lo[k] + hi[k]) / 2 * f);
  console.log("scaled x" + f.toFixed(4), "->",
    [0, 1, 2].map((k) => ((hi[k] - lo[k]) * f * 100).toFixed(1)).join(" x ") + " cm");
}

// --- emit GLB: 12-byte header, JSON chunk, BIN chunk ----------------------------
pad4();
g.buffers = [{ byteLength: len }];

let json = Buffer.from(JSON.stringify(g), "utf8");
if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - (json.length % 4), 0x20)]);

const chunk = (data, type) => {
  const h = Buffer.alloc(8);
  h.writeUInt32LE(data.length, 0);
  h.writeUInt32LE(type, 4);
  return [h, data];
};
const body = [...chunk(json, 0x4e4f534a), ...chunk(Buffer.concat(chunks), 0x004e4942)];
const header = Buffer.alloc(12);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(12 + body.reduce((a, b) => a + b.length, 0), 8);

writeFileSync(out, Buffer.concat([header, ...body]));
console.log(out, (Buffer.concat([header, ...body]).length / 1048576).toFixed(1) + " MB",
  g.images.length + " images,", (g.animations || []).length + " clips");
