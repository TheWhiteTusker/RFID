// Tiny pattern router. Patterns look like "/product/:slug"; the matched params
// are handed to the handler. Enough for this app, and no dependency to carry
// into the CMS.

const routes = [];

/** Register a handler. Pattern segments starting with ":" capture. */
export function on(method, pattern, handler) {
  const parts = pattern.split("/").filter(Boolean);
  routes.push({ method, parts, handler });
}

/** Find a handler for this request; returns { handler, params } or null. */
export function match(method, pathname) {
  const segs = pathname.split("/").filter(Boolean);

  for (const r of routes) {
    if (r.method !== method) continue;

    // a trailing "*" soaks up the rest of the path (used for static files)
    const wild = r.parts[r.parts.length - 1] === "*";
    if (!wild && r.parts.length !== segs.length) continue;
    if (wild && segs.length < r.parts.length - 1) continue;

    const params = {};
    let ok = true;

    for (let i = 0; i < r.parts.length; i++) {
      const part = r.parts[i];
      if (part === "*") {
        params.rest = segs.slice(i).join("/");
        break;
      }
      if (part.startsWith(":")) {
        params[part.slice(1)] = decodeURIComponent(segs[i]);
        continue;
      }
      if (part !== segs[i]) { ok = false; break; }
    }

    if (ok) return { handler: r.handler, params };
  }

  return null;
}

export function json(res, body, status = 200) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  res.end(text);
}

export function notFound(res, message = "Not found") {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(message);
}
