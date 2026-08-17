/**
 * First-load JS budget, measured rather than estimated.
 *
 * Builds nothing itself: run `next build` first, then point this at a running
 * `next start`. For each route it fetches the HTML, collects every script the
 * document loads eagerly, and gzips them — which is what the browser actually
 * pays for, as opposed to the raw figure a bundler prints.
 *
 * Usage:  node scripts/bundle-budget.mjs [port]
 */

import { gzipSync } from "node:zlib";

const PORT = Number(process.argv[2] ?? 3000);
const BASE = `http://127.0.0.1:${PORT}`;

/** CLAUDE.md §3 and §8. */
const BUDGET_BYTES = 180 * 1024;

const ROUTES = [
  "/",
  "/ledger",
  "/work",
  "/work/signed-append-only-ledger",
  "/approach",
  "/about",
  "/resume",
];

async function fetchBuffer(path) {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "accept-encoding": "identity" },
  });
  if (!response.ok) throw new Error(`${path} responded ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function measure(route) {
  const html = (await fetchBuffer(route)).toString();
  const sources = [
    ...new Set(
      [...html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)].map((match) => match[1]),
    ),
  ];

  let gzipped = 0;
  for (const source of sources) {
    gzipped += gzipSync(await fetchBuffer(source)).length;
  }
  return { route, gzipped, scripts: sources.length };
}

const results = [];
for (const route of ROUTES) {
  results.push(await measure(route));
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
let failed = false;

console.log(`\nFirst-load JS, gzipped. Budget ${kb(BUDGET_BYTES)}.\n`);
for (const result of results) {
  const over = result.gzipped > BUDGET_BYTES;
  if (over) failed = true;
  console.log(
    `  ${over ? "FAIL" : "pass"}  ${result.route.padEnd(34)} ` +
      `${kb(result.gzipped).padStart(10)}  (${result.scripts} scripts)` +
      (over ? `  over by ${kb(result.gzipped - BUDGET_BYTES)}` : ""),
  );
}

console.log("");
if (failed) {
  console.error(
    "Bundle budget exceeded.\n" +
      "Before reaching for a code change, check the split: on this stack the\n" +
      "React + Next App Router runtime alone is around 165 KB gzipped on every\n" +
      "route, so the budget may be describing a framework that is not the one\n" +
      "in use rather than a regression in application code.\n",
  );
  process.exit(1);
}
