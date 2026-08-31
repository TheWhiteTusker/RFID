// Wires routing, data, view, choreography and the explode reveal together.

import * as router from "./router.js";
import { render, buildChips, markFinish } from "./view.js";
import { apply as applyFinish, audit } from "./finish.js";
import { createShowcase } from "./showcase.js";
import { createExplode } from "./explode.js";
import { createEngraver } from "./engrave.js";

const mv = document.getElementById("mv");
const stage = document.getElementById("stage");

// Data comes from the server, not baked into the page — so the CMS becomes the
// source of truth by changing lib/store.js alone.
const PRODUCTS = await (await fetch("/api/products")).json();
const KEYS = Object.keys(PRODUCTS);

let finish = "Natural";

const ctx = {
  product: () => PRODUCTS[router.current()],
  finish: () => finish,
  setFinish: (f) => { finish = f; },
  pinned: () => router.isPinned(),
  next: () => router.step(1),
};

const showcase = createShowcase(mv, ctx);
const explode = createExplode(mv, showcase);
const engraver = createEngraver(mv, showcase);

router.init(KEYS);
buildChips(PRODUCTS, KEYS);

function show() {
  const slug = router.current();
  explode.reset();
  engraver.reset();
  render(PRODUCTS[slug], KEYS, KEYS.indexOf(slug), finish);
  stage.classList.add("loading");        // professional models are heavy; say so
  // setAttribute, not .src — assigning the property before the custom element
  // upgrades leaves an own property shadowing the accessor and nothing loads.
  mv.setAttribute("src", PRODUCTS[slug].model);
  prefetchNeighbours(slug);
}

// Pull the next and previous models into cache so arrow presses feel instant.
function prefetchNeighbours(slug) {
  const i = KEYS.indexOf(slug);
  for (const d of [1, -1]) {
    const url = PRODUCTS[KEYS[(i + d + KEYS.length) % KEYS.length]].model;
    if (document.querySelector(`link[href="${url}"]`)) continue;
    const l = document.createElement("link");
    l.rel = "prefetch";
    l.href = url;
    document.head.append(l);
  }
}

mv.addEventListener("load", () => {
  stage.classList.remove("loading");
  audit(mv, router.current());          // shout early if an export is unusable
  applyFinish(mv, finish);
  explode.refresh();                    // hide the button when there is no clip
  engraver.refresh();                   // and the name field when there is no plate
  showcase.start();
});

router.onChange(show);
show();

// ---- input ----
document.getElementById("prev").onclick = () => router.step(-1);
document.getElementById("next").onclick = () => router.step(1);

addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") router.step(-1);
  if (e.key === "ArrowRight") router.step(1);
});

document.getElementById("chips").onclick = (e) => {
  const b = e.target.closest(".chip");
  if (b) router.go(b.dataset.k);
};

document.getElementById("finishes").onclick = (e) => {
  const b = e.target.closest(".swatch");
  if (!b) return;
  finish = b.dataset.finish;
  markFinish(finish);
  applyFinish(mv, finish);
};
