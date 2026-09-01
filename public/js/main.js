// Wires routing, data, view, choreography and the explode reveal together.

import * as router from "./router.js";
import { render, markFinish } from "./view.js";
import { apply as applyFinish, audit } from "./finish.js";
import { createShowcase } from "./showcase.js";
import { createExplode } from "./explode.js";
import { createEngraver } from "./engrave.js";
import { devNav } from "./devnav.js";   // dev only

const mv = document.getElementById("mv");
const stage = document.getElementById("stage");

// Data comes from the server, not baked into the page — so the CMS becomes the
// source of truth by changing lib/store.js alone.
const PRODUCTS = await (await fetch("/api/products")).json();
const KEYS = Object.keys(PRODUCTS);

let finish = "Natural";

// A delivery whose wood colour is baked into its texture ships one model per
// finish and cannot be tinted, so switching finish means switching file.
const modelFor = (p, f) => p.models?.[f] || p.model;

const ctx = {
  product: () => PRODUCTS[router.current()],
  finish: () => finish,
  // the one place a finish changes, so swatches and idle cycling behave alike
  setFinish(f) {
    finish = f;
    markFinish(f);
    const url = modelFor(this.product(), f);
    if (mv.getAttribute("src") === url) return applyFinish(mv, f);
    stage.classList.add("loading");
    mv.setAttribute("src", url);
  },
  pinned: () => router.isPinned(),
  next: () => router.step(1),
};

const showcase = createShowcase(mv, ctx);
const explode = createExplode(mv, showcase);
const engraver = createEngraver(mv, showcase);

router.init(KEYS);
devNav(PRODUCTS, KEYS);                 // dev only

function show() {
  const slug = router.current();
  explode.reset();
  engraver.reset();
  render(PRODUCTS[slug], finish);
  stage.classList.add("loading");        // professional models are heavy; say so
  // setAttribute, not .src — assigning the property before the custom element
  // upgrades leaves an own property shadowing the accessor and nothing loads.
  mv.setAttribute("src", modelFor(PRODUCTS[slug], finish));
  prefetchNeighbours(slug);
}

// Pull the neighbouring models into cache so the next tag read feels instant.
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
  if (!ctx.product().models) {           // a baked finish is already correct
    audit(mv, router.current());        // shout early if an export is unusable
    applyFinish(mv, finish);
  }
  explode.refresh();                    // hide the button when there is no clip
  engraver.refresh();                   // and the name field when there is no plate
  showcase.start();
});

router.onChange(show);
show();

// ---- input ----
// The kiosk navigates by tag; the arrow keys stay for testing without a reader.
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") router.step(-1);
  if (e.key === "ArrowRight") router.step(1);
});

document.getElementById("finishes").onclick = (e) => {
  const b = e.target.closest(".swatch");
  if (b) ctx.setFinish(b.dataset.finish);
};
