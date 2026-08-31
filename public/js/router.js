// Client-side routing, mirroring the server's /product/:slug.
//
// Navigation inside the page is a pushState, so the model is never reloaded and
// the URL always matches what the server would have served directly.
//
// The ESP32 appends ?t=<read counter>. Without that, browsing away with the
// arrows and re-tapping the original tag would produce an identical URL and the
// kiosk frame would not navigate at all.

const listeners = [];
let slugs = [];

function fromPath() {
  const m = location.pathname.match(/^\/product\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]);
  // tolerated for older firmware that still linked ?p=<slug>
  return new URLSearchParams(location.search).get("p") || "";
}

/** Whatever the URL names, resolved to a real slug. */
export function current() {
  const want = fromPath();
  return slugs.includes(want) ? want : slugs[0];
}

/** True when the URL explicitly named a product — i.e. a tag chose it. */
export function isPinned() {
  return slugs.includes(fromPath());
}

/** Soft-navigate. Keeps any ?t= nonce off the new URL; it has done its job. */
export function go(slug) {
  if (!slugs.includes(slug) || current() === slug) return;
  history.pushState({ slug }, "", "/product/" + slug);
  notify();
}

export function step(delta) {
  const i = slugs.indexOf(current());
  go(slugs[(i + delta + slugs.length) % slugs.length]);
}

export function init(available) {
  slugs = available;
  addEventListener("popstate", notify);
}

export function onChange(fn) {
  listeners.push(fn);
}

function notify() {
  const slug = current();
  for (const fn of listeners) fn(slug);
}
