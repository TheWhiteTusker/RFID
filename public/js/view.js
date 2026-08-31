// Renders one product into the DOM. No timers, no routing — just paint.

import { FINISH } from "./finish.js";

const $ = (id) => document.getElementById(id);

export function render(p, finish) {
  $("cat").textContent = p.cat;
  $("pname").textContent = p.name;
  $("lede").textContent = p.lede;
  $("unit").textContent = p.price;
  $("moq").textContent = "per unit · MOQ " + p.bulk.moq;
  $("buy").href = p.buy;
  document.title = p.name + " — Lattice Lane";

  $("specs").innerHTML = p.specs
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");

  // Volume pricing: whoever is standing at a trade stall is buying 50, not one.
  $("tiers").innerHTML = p.bulk.tiers
    .map(([qty, price], n) =>
      `<tr${n === p.bulk.tiers.length - 1 ? ' class="best"' : ""}>` +
      `<td>${qty}+ units</td><td>${price}</td></tr>`).join("");

  $("terms").innerHTML = [p.bulk.engraving, p.bulk.lead + " lead time",
    p.bulk.dispatch, p.bulk.shipping, p.bulk.returns]
    .map((t) => `<li>${t}</li>`).join("");

  $("feats").innerHTML = p.feats
    .map((f, n) => `<li><span class="num">${pad(n + 1)}</span><span>${f}</span></li>`).join("");

  $("finishes").innerHTML = p.finishes.map(([name]) =>
    `<button class="swatch" data-finish="${name}" aria-pressed="${name === finish}">` +
    `<i style="background:${FINISH[name].dot}"></i>${name}</button>`).join("");

  replay();
}

export function markFinish(finish) {
  for (const s of $("finishes").children)
    s.setAttribute("aria-pressed", s.dataset.finish === finish);
}

function replay() {
  for (const s of document.querySelectorAll("main > section")) {
    s.classList.remove("swap");
    void s.offsetWidth;
    s.classList.add("swap");
  }
}

const pad = (n) => String(n).padStart(2, "0");
