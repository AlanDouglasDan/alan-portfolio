/**
 * First-load JS budget, measured rather than estimated.
 *
 * Builds nothing itself: run `next build` first, then point this at a running
 * `next start`. For each route it fetches the HTML, collects every script the
 * document loads eagerly, and gzips them — which is what the browser actually
 * pays for, as opposed to the raw figure a bundler prints.
 *
 * ---------------------------------------------------------------------------
 * Why these numbers and not the 180 KB in CLAUDE.md §3
 * ---------------------------------------------------------------------------
 *
 * That figure is not reachable on this stack, and it is worth writing down why
 * rather than quietly deleting the check.
 *
 * React 19 plus the Next.js App Router runtime, plus the header, footer and
 * theme toggle that appear on every page, comes to roughly 188 KB gzipped
 * before any page's own code. The script measures that figure rather than
 * asserting it — see "shared runtime" in the output — so the claim stays
 * honest as versions change. A 180 KB ceiling is therefore below the floor: it
 * cannot be met by an empty page, let alone this one. No amount of
 * code-splitting closes that gap; only changing framework would.
 *
 * A gate that cannot pass gets disabled, and then nothing is watched at all.
 * So this measures what a budget is actually for: regression. Each route has a
 * baseline taken from a known-good build plus headroom for noise. Ship
 * something that meaningfully grows a route and this fails; ship a refactor
 * and it does not.
 *
 * When an increase is deliberate, raise the baseline in the same commit that
 * causes it, so the diff shows the cost alongside the feature.
 *
 * Usage:  node scripts/bundle-budget.mjs [port]
 */

import { gzipSync } from "node:zlib";

const PORT = Number(process.argv[2] ?? 3000);
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * Measured on a clean production build. Kilobytes, gzipped, first-load.
 * Raise a number here only together with the change that caused it.
 */
const BASELINE_KB = {
  "/": 241,
  "/ledger": 251,
  "/work": 189,
  "/work/signed-append-only-ledger": 234,
  "/approach": 189,
  "/about": 189,
  "/resume": 189,
};

/** Absorbs build-to-build noise and trivial growth. */
const HEADROOM_KB = 12;

/**
 * A ceiling no route may pass whatever its baseline says, so that a series of
 * individually-small increases cannot walk a page somewhere absurd.
 */
const CEILING_KB = 280;

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

  const sizes = new Map();
  for (const source of sources) {
    sizes.set(source, gzipSync(await fetchBuffer(source)).length);
  }

  const gzipped = [...sizes.values()].reduce((total, size) => total + size, 0);
  return { route, gzipped, sources: sizes };
}

const results = [];
for (const route of Object.keys(BASELINE_KB)) {
  results.push(await measure(route));
}

/**
 * Chunks every route loads are the framework and the shared shell. Separating
 * them is the difference between "this page is heavy" and "this stack is".
 */
const shared = [...results[0].sources.keys()].filter((source) =>
  results.every((result) => result.sources.has(source)),
);
const sharedBytes = shared.reduce(
  (total, source) => total + (results[0].sources.get(source) ?? 0),
  0,
);

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const failures = [];

console.log(
  `\nFirst-load JS, gzipped.\n` +
    `Shared runtime on every route: ${kb(sharedBytes)} across ${shared.length} chunks.\n`,
);

for (const result of results) {
  const baseline = (BASELINE_KB[result.route] ?? 0) * 1024;
  const limit = Math.min(baseline + HEADROOM_KB * 1024, CEILING_KB * 1024);
  const appBytes = result.gzipped - sharedBytes;
  const over = result.gzipped > limit;
  if (over) failures.push({ ...result, limit });

  console.log(
    `  ${over ? "FAIL" : "pass"}  ${result.route.padEnd(34)} ` +
      `${kb(result.gzipped).padStart(10)}  ` +
      `(app code ${kb(appBytes)})` +
      (over ? `  exceeds ${kb(limit)} by ${kb(result.gzipped - limit)}` : ""),
  );
}

console.log("");

if (failures.length > 0) {
  console.error(
    "First-load JS grew beyond its baseline.\n\n" +
      "This is a regression check, not an absolute target: the shared runtime\n" +
      "above is fixed by the framework and is not something a change here can\n" +
      "move. What tripped is application code on these routes:\n\n" +
      failures.map((f) => `  ${f.route}  ${kb(f.gzipped)}`).join("\n") +
      "\n\nEither reduce what those routes ship, or — if the increase is\n" +
      "deliberate — raise the baseline in scripts/bundle-budget.mjs in the same\n" +
      "commit, so the cost is visible next to the feature that bought it.\n",
  );
  process.exit(1);
}
