// glTF 2.0 assembly: materials, node transforms, and the baked Explode clip.

import { SHAPES } from "./primitives.js";

const MATERIALS = {
  // "wood" is the one product.html recolours — keep the name stable.
  wood:    { c: [0.78, 0.62, 0.42, 1], r: 0.62, m: 0 },
  woodAlt: { c: [0.42, 0.30, 0.19, 1], r: 0.58, m: 0 },
  groove:  { c: [0.30, 0.24, 0.18, 1], r: 0.80, m: 0 },
  acrylic: { c: [0.92, 0.95, 0.94, 0.42], r: 0.06, m: 0, blend: true },
  glass:   { c: [0.86, 0.92, 0.92, 0.11], r: 0.02, m: 0, blend: true },
  metal:   { c: [0.78, 0.79, 0.80, 1], r: 0.22, m: 1 },
  brass:   { c: [0.72, 0.56, 0.24, 1], r: 0.30, m: 1 },
  paper:   { c: [0.96, 0.95, 0.90, 1], r: 0.90, m: 0 },
  felt:    { c: [0.11, 0.10, 0.09, 1], r: 0.92, m: 0 },
  glow:    { c: [1.00, 0.72, 0.42, 1], r: 0.40, m: 0, e: [1.00, 0.60, 0.24] },
  // starts fully transparent; the kiosk swaps in a texture and opens the alpha
  engrave: { c: [1, 1, 1, 0], r: 0.75, m: 0, blend: true },
};

// A 1x1 transparent PNG. The engrave material needs a real texture slot to exist
// in the file, otherwise model-viewer gives us no TextureInfo to swap at runtime.
const STUB_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const rad = (d) => d * Math.PI / 180;

function quat([rx, ry, rz]) {
  const [cx, cy, cz] = [rad(rx) / 2, rad(ry) / 2, rad(rz) / 2].map(Math.cos);
  const [sx, sy, sz] = [rad(rx) / 2, rad(ry) / 2, rad(rz) / 2].map(Math.sin);
  return [
    sx * cy * cz - cx * sy * sz,
    cx * sy * cz + sx * cy * sz,
    cx * cy * sz - sx * sy * cz,
    cx * cy * cz + sx * sy * sz,
  ];
}

function build(parts, rootRot, finishRgb) {
  const buf = [], bufferViews = [], accessors = [];

  const push = (arr, Type, target) => {
    const bytes = Buffer.from(new Type(arr).buffer);
    const off = buf.reduce((a, b) => a + b.length, 0);
    buf.push(bytes);
    bufferViews.push({ buffer: 0, byteOffset: off, byteLength: bytes.length, target });
    return bufferViews.length - 1;
  };

  // Geometry is written once per shape and shared by every material variant.
  const shapeAcc = {};
  for (const [name, s] of Object.entries(SHAPES)) {
    if (!parts.some((p) => p.shape === name)) continue;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < s.p.length; i += 3) for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], s.p[i + k]); max[k] = Math.max(max[k], s.p[i + k]);
    }
    const pv = push(s.p, Float32Array, 34962);
    const nv = push(s.n, Float32Array, 34962);
    const uvv = s.uv ? push(s.uv, Float32Array, 34962) : null;
    const iv = push(s.idx, Uint32Array, 34963);
    accessors.push({ bufferView: pv, componentType: 5126, count: s.p.length / 3, type: "VEC3", min, max });
    accessors.push({ bufferView: nv, componentType: 5126, count: s.n.length / 3, type: "VEC3" });
    let uvAcc = null;
    if (uvv !== null) {
      accessors.push({ bufferView: uvv, componentType: 5126, count: s.uv.length / 2, type: "VEC2" });
      uvAcc = accessors.length - 1;
    }
    accessors.push({ bufferView: iv, componentType: 5125, count: s.idx.length, type: "SCALAR" });
    shapeAcc[name] = {
      pos: accessors.length - (uvAcc === null ? 3 : 4),
      nrm: accessors.length - (uvAcc === null ? 2 : 3),
      uv: uvAcc,
      idx: accessors.length - 1,
    };
  }

  const usedMats = [...new Set(parts.map((p) => p.mat))];
  const materials = usedMats.map((k) => {
    const m = { ...MATERIALS[k] };
    if (k === "wood" && finishRgb) m.c = [...finishRgb, 1];
    if (k === "woodAlt" && finishRgb) m.c = [...finishRgb.map((v) => v * 0.55), 1];
    const out = {
      name: k,
      doubleSided: true,
      pbrMetallicRoughness: { baseColorFactor: m.c, metallicFactor: m.m, roughnessFactor: m.r },
    };
    if (m.blend) { out.alphaMode = "BLEND"; }
    if (k === "engrave") out.pbrMetallicRoughness.baseColorTexture = { index: 0 };
    if (m.e) out.emissiveFactor = m.e;
    return out;
  });

  // One mesh per (shape, material) pair actually used.
  const meshes = [], meshKey = {};
  for (const p of parts) {
    const key = p.shape + "|" + p.mat;
    if (key in meshKey) continue;
    meshKey[key] = meshes.length;
    const a = shapeAcc[p.shape];
    meshes.push({
      name: key,
      primitives: [{
        attributes: a.uv === null
          ? { POSITION: a.pos, NORMAL: a.nrm }
          : { POSITION: a.pos, NORMAL: a.nrm, TEXCOORD_0: a.uv },
        indices: a.idx,
        material: usedMats.indexOf(p.mat),
      }],
    });
  }

  const nodes = parts.map((p) => {
    const n = { mesh: meshKey[p.shape + "|" + p.mat], translation: p.pos, scale: p.size };
    if (p.rot) n.rotation = quat(p.rot);
    return n;
  });
  const root = { name: "product", children: nodes.map((_, i) => i) };
  if (rootRot) root.rotation = quat(rootRot);
  nodes.push(root);

  // --- "Explode" animation: parts drift outward, hold, then reassemble ---
  let R = 0;
  for (const p of parts) R = Math.max(R, Math.hypot(...p.pos) + Math.max(...p.size) / 2);

  const times = [0, 1.3, 2.7, 4.0];
  const tv = push(times, Float32Array);
  accessors.push({ bufferView: tv, componentType: 5126, count: 4, type: "SCALAR", min: [0], max: [4] });
  const timeAcc = accessors.length - 1;

  const samplers = [], channels = [];
  parts.forEach((p, ni) => {
    let d = p.pos.slice();
    const len = Math.hypot(...d);
    if (len < 0.002) {
      const k = p.size.indexOf(Math.max(...p.size));
      d = [0, 0, 0]; d[k] = 1;
    } else {
      d = d.map((v) => v / len);
    }
    const amt = R * 0.55;
    const out = p.pos.map((v, k) => v + d[k] * amt);
    const ov = push([...p.pos, ...out, ...out, ...p.pos], Float32Array);
    accessors.push({ bufferView: ov, componentType: 5126, count: 4, type: "VEC3" });
    samplers.push({ input: timeAcc, output: accessors.length - 1, interpolation: "LINEAR" });
    channels.push({ sampler: samplers.length - 1, target: { node: ni, path: "translation" } });
  });
  const animations = [{ name: "Explode", samplers, channels }];

  const data = Buffer.concat(buf);
  return {
    asset: { version: "2.0", generator: "latticelane-procedural" },
    scene: 0,
    scenes: [{ nodes: [nodes.length - 1] }],
    nodes, meshes, materials, accessors, bufferViews, animations,
    images: [{ uri: STUB_PNG }],
    samplers: [{ wrapS: 33071, wrapT: 33071 }],
    textures: [{ source: 0, sampler: 0 }],
    buffers: [{ byteLength: data.length, uri: "data:application/octet-stream;base64," + data.toString("base64") }],
  };
}

function gltfToGlb(g) {
  let bin = Buffer.alloc(0);
  if (g.buffers?.[0]?.uri?.startsWith("data:")) {
    bin = Buffer.from(g.buffers[0].uri.split(",")[1], "base64");
    delete g.buffers[0].uri;
    g.buffers[0].byteLength = bin.length;
  }
  const pB = (4 - (bin.length % 4)) % 4;
  if (pB) bin = Buffer.concat([bin, Buffer.alloc(pB)]);
  const jB = Buffer.from(JSON.stringify(g), "utf8");
  const pJ = (4 - (jB.length % 4)) % 4;
  const json = pJ ? Buffer.concat([jB, Buffer.alloc(pJ, 0x20)]) : jB;
  const hJ = Buffer.alloc(8); hJ.writeUInt32LE(json.length, 0); hJ.writeUInt32LE(0x4E4F534A, 4);
  const hB = Buffer.alloc(8); hB.writeUInt32LE(bin.length, 0); hB.writeUInt32LE(0x004E4942, 4);
  const total = 12 + 8 + json.length + (bin.length ? 8 + bin.length : 0);
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546C67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
  return Buffer.concat(bin.length ? [h, hJ, json, hB, bin] : [h, hJ, json]);
}

export { MATERIALS, quat, build, gltfToGlb };
