// node tools/test-pack-glb.mjs
// Guards the one thing in pack-glb.js that fails silently: a Blender export with
// several root nodes must be measured and rescaled as a whole, not just its first
// root. A broken run still writes a valid GLB — it just has parts at wrong sizes.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";

const dir = mkdtempSync(join(tmpdir(), "packglb-"));
const out = join(dir, "out.glb");

// Two 1-unit cubes side by side as separate roots: together 3 units wide in X.
const acc = (min, max) => ({ bufferView: 0, componentType: 5126, count: 2, type: "VEC3", min, max });
writeFileSync(join(dir, "t.bin"), Buffer.alloc(24));
writeFileSync(join(dir, "t.gltf"), JSON.stringify({
  asset: { version: "2.0" },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [{ mesh: 0 }, { mesh: 1, translation: [2, 0, 0] }],
  meshes: [0, 1].map((i) => ({ primitives: [{ attributes: { POSITION: i } }] })),
  accessors: [acc([0, 0, 0], [1, 1, 1]), acc([0, 0, 0], [1, 1, 1])],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 24 }],
  buffers: [{ uri: "t.bin", byteLength: 24 }],
}));

execFileSync(process.execPath, ["tools/pack-glb.js", dir, out, "30"], { stdio: "inherit" });

const b = readFileSync(out);
const g = JSON.parse(b.subarray(20, 20 + b.readUInt32LE(12)).toString("utf8"));
const scene = g.scenes[g.scene || 0];

assert.equal(scene.nodes.length, 1, "roots should be wrapped in one node");
assert.equal(g.nodes[scene.nodes[0]].children.length, 2, "wrapper must keep both roots");
// 3 units of model asked to be 30 cm -> x0.1, and centred on the origin.
assert.ok(Math.abs(g.nodes[scene.nodes[0]].scale[0] - 0.1) < 1e-9, "whole model must scale, not one root");
assert.ok(Math.abs(g.nodes[scene.nodes[0]].translation[0] + 0.15) < 1e-9, "must centre on the full bbox");

console.log("ok");
