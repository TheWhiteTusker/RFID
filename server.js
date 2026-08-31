// Lattice Lane showcase server.
//
//   GET /                       -> redirects to the first product
//   GET /product/:slug          -> the showcase shell for that product
//   GET /api/products           -> the whole catalogue
//   GET /api/products/:slug     -> one product
//   GET /<anything else>        -> static file from public/
//
// The ESP32 points a kiosk browser at /product/<slug>?t=<read-counter>; the
// counter makes a re-tap of the same tag a distinct URL so the frame reloads.
//
// No dependencies — node:http only, so this drops into a CMS host unchanged.

import { createServer } from "node:http";
import * as store from "./lib/store.js";
import { on, match, json, notFound } from "./lib/router.js";
import { send, shell } from "./lib/static.js";

const PORT = process.env.PORT || 8080;

on("GET", "/", async (req, res) => {
  res.writeHead(302, { Location: "/product/" + (await store.first()) });
  res.end();
});

on("GET", "/product/:slug", async (req, res, { slug }) => {
  if (!(await store.get(slug))) return notFound(res, `No product "${slug}"`);
  return shell(req, res);
});

on("GET", "/api/products", async (req, res) => json(res, await store.all()));

on("GET", "/api/products/:slug", async (req, res, { slug }) => {
  const p = await store.get(slug);
  return p ? json(res, p) : json(res, { error: "unknown slug", slug }, 404);
});

// neighbour lookup, so the kiosk can step the catalogue without holding the list
on("GET", "/api/next/:slug", async (req, res, { slug }) =>
  json(res, { slug: await store.neighbour(slug, 1) }));

on("GET", "/*", (req, res, { rest }) => send(req, res, rest));

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const hit = match(req.method, url.pathname);

  if (!hit) return notFound(res);

  try {
    await hit.handler(req, res, hit.params);
  } catch (err) {
    console.error(req.method, url.pathname, err);
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
    }
  }
});

// A stack trace for "port already taken" helps nobody; say what to do instead.
server.on("error", (err) => {
  if (err.code !== "EADDRINUSE") throw err;
  console.error(`Port ${PORT} is already in use — another copy is probably running.`);
  console.error(`Stop it, or use another port:  PORT=8081 pnpm start`);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`Lattice Lane showcase → http://localhost:${PORT}`);
});
