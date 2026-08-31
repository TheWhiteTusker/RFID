// Dev-only bottom rail: browse the catalogue without an RFID reader on the desk.
//
// Deliberately self-contained so going live is a four-line delete: this file,
// devnav.css, the <link> in index.html and the two lines in main.js.

import * as router from "./router.js";

const pad = (n) => String(n).padStart(2, "0");

export function devNav(products, keys) {
  const rail = document.createElement("div");
  rail.className = "rail";
  rail.innerHTML =
    `<span class="railhead">The Collection</span><div class="chips">` +
    keys.map((k) =>
      `<button class="chip" data-k="${k}"><b>${products[k].short}</b>` +
      `<em>${products[k].price}</em></button>`).join("") +
    `</div><span class="count"></span>`;
  document.body.append(rail);

  const chips = rail.querySelector(".chips");
  const count = rail.querySelector(".count");

  chips.onclick = (e) => {
    const b = e.target.closest(".chip");
    if (b) router.go(b.dataset.k);
  };

  // The first paint comes from main.js calling show() directly, not through
  // notify(), so mark once here as well as on every later route change.
  function mark() {
    const i = keys.indexOf(router.current());
    for (const c of chips.children)
      c.setAttribute("aria-current", c.dataset.k === keys[i]);
    chips.children[i].scrollIntoView({ block: "nearest", inline: "nearest" });
    count.innerHTML = `<b>${pad(i + 1)}</b> / ${pad(keys.length)}`;
  }
  router.onChange(mark);
  mark();
}
