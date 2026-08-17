/**
 * WCAG contrast check over the design tokens, in both themes.
 *
 * CLAUDE.md §8 asks for 4.5:1 on body text and 3:1 on large text, and
 * specifically flags the money colours as the ones most likely to fail. They
 * were: on first measurement `pending`, `signal` and `ink-faint` all fell short
 * in the light theme against the recessed panel background.
 *
 * The values are read from app/globals.css rather than duplicated here, so this
 * cannot pass while the stylesheet says something else.
 */

import { readFileSync } from "node:fs";

const CSS = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Body text. Large text (display sizes) only needs 3:1. */
const BODY_RATIO = 4.5;

const SURFACES = ["paper", "paper-sunk", "paper-raised"];
const FOREGROUNDS = [
  "ink",
  "ink-soft",
  "ink-faint",
  "credit",
  "debit",
  "pending",
  "signal",
];

function block(name) {
  if (name === "light") {
    const match = CSS.match(/@theme\s*\{([\s\S]*?)\n\}/);
    return match?.[1] ?? "";
  }
  const match = CSS.match(/html\[data-theme="dark"\]\s*\{([\s\S]*?)\n  \}/);
  return match?.[1] ?? "";
}

function tokens(theme) {
  const source = block(theme);
  const found = new Map();
  for (const match of source.matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    found.set(match[1], match[2]);
  }
  if (theme === "dark") {
    // Dark only redefines what changes; anything absent inherits the light value.
    for (const [key, value] of tokens("light")) {
      if (!found.has(key)) found.set(key, value);
    }
  }
  return found;
}

const channel = (value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

function luminance(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
}

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

let failed = false;

for (const theme of ["light", "dark"]) {
  const palette = tokens(theme);
  console.log(`\n${theme.toUpperCase()} — minimum ${BODY_RATIO}:1 for body text\n`);

  for (const foreground of FOREGROUNDS) {
    const fg = palette.get(foreground);
    if (fg === undefined) continue;

    let worst = { surface: "", value: Number.POSITIVE_INFINITY };
    for (const surface of SURFACES) {
      const bg = palette.get(surface);
      if (bg === undefined) continue;
      const value = ratio(fg, bg);
      if (value < worst.value) worst = { surface, value };
    }

    const ok = worst.value >= BODY_RATIO;
    if (!ok) failed = true;
    console.log(
      `  ${ok ? "pass" : "FAIL"}  ${foreground.padEnd(10)} ${fg}  ` +
        `${worst.value.toFixed(2).padStart(6)}:1 against ${worst.surface}`,
    );
  }
}

console.log("");
if (failed) {
  console.error("Contrast below the CLAUDE.md §8 threshold.\n");
  process.exit(1);
}
