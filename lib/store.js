// The only module that knows where product data comes from.
//
// Today: data/catalogue.json gives the running order, and each product is its own
// record in data/products/<slug>.json — deliberately shaped like CMS entries.
//
// To move to the CMS, replace load() with the CMS query. Nothing else in the app
// changes: every route and the whole client already go through the exports below.

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = join(process.cwd(), "data");

let cache = null;
let loadedAt = 0;
const TTL = 2000;   // ponytail: 2s cache; drop it when a CMS does its own caching

async function load() {
  if (cache && Date.now() - loadedAt < TTL) return cache;

  const { order } = JSON.parse(await readFile(join(DIR, "catalogue.json"), "utf8"));
  const entries = await Promise.all(
    order.map(async (slug) => [
      slug,
      JSON.parse(await readFile(join(DIR, "products", slug + ".json"), "utf8")),
    ])
  );

  cache = Object.fromEntries(entries);   // insertion order == catalogue order
  loadedAt = Date.now();
  return cache;
}

/** Every product, keyed by slug, in catalogue order. */
export async function all() {
  return load();
}

/** Ordered slugs — catalogue order, which the auto-advance follows. */
export async function slugs() {
  return Object.keys(await load());
}

/** One product, or null if the slug is unknown. */
export async function get(slug) {
  return (await load())[slug] ?? null;
}

/** The slug a bare "/" should land on. */
export async function first() {
  return (await slugs())[0];
}

/** Slug n steps from the given one, wrapping in both directions. */
export async function neighbour(slug, step) {
  const list = await slugs();
  const i = list.indexOf(slug);
  if (i === -1) return list[0];
  return list[(i + step + list.length) % list.length];
}
