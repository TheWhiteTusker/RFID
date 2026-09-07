// Every model path a product claims must exist on disk. Deleting or renaming a
// .glb without touching its JSON is the failure this catches — the kiosk just
// shows an empty stage. Run: node tools/check-models.js
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const DIR = "data/products";
let bad = 0;

for (const f of readdirSync(DIR).filter((n) => n.endsWith(".json"))) {
  const p = JSON.parse(readFileSync(join(DIR, f), "utf8"));
  for (const url of new Set([p.model, ...Object.values(p.models || {})].filter(Boolean))) {
    if (existsSync(join("public", url))) continue;
    console.error(`${f}: missing ${url}`);
    bad++;
  }
}

console.log(bad ? `${bad} missing model file(s)` : "all model paths resolve");
process.exit(bad ? 1 : 0);
