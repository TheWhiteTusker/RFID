// Static file serving out of public/, with the MIME types this app needs.

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join, extname, resolve, sep } from "node:path";
import { notFound } from "./router.js";

const ROOT = resolve(process.cwd(), "public");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".gltf": "model/gltf+json",
  ".glb": "model/gltf-binary",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

export async function send(req, res, relPath) {
  // resolve then confirm we stayed inside public/ — blocks ../ traversal
  const file = resolve(ROOT, "." + sep + relPath);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return notFound(res);

  let info;
  try {
    info = await stat(file);
  } catch {
    return notFound(res);
  }
  if (!info.isFile()) return notFound(res);

  // Models are tens of MB, so a re-tap must not re-pull them — but a repacked
  // file must show up on the next reload. Revalidate instead of guessing a
  // lifetime: unchanged is a 304 costing nothing, changed is a fresh 200.
  const tag = `W/"${info.size}-${Math.floor(info.mtimeMs)}"`;
  if (req.headers["if-none-match"] === tag) {
    res.writeHead(304, { ETag: tag, "Cache-Control": "no-cache" });
    return res.end();
  }

  res.writeHead(200, {
    "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
    "Content-Length": info.size,
    ETag: tag,
    "Cache-Control": "no-cache",
  });
  createReadStream(file).pipe(res);
}

export function shell(req, res) {
  return send(req, res, "index.html");
}

export const publicPath = (p) => join(ROOT, p);
