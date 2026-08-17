/**
 * Arithmetic on integer minor units.
 *
 * There is no floating point anywhere in this file. `mulDiv` — the one place a
 * ratio is applied, used by FX conversion — does the multiplication in BigInt
 * so the intermediate product cannot lose precision above 2^53, then rounds
 * half-away-from-zero on integers and checks the result is a safe integer
 * before handing it back.
 */

import {
  CURRENCIES,
  type CurrencyCode,
  type Money,
  type MinorUnits,
} from "./types";

/** The only way to construct minor units. Rejects non-integers by construction. */
export function minorUnits(value: number): MinorUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Money must be a safe integer number of minor units, received ${value}`,
    );
  }
  return value as MinorUnits;
}

export function money(amount: number, currency: CurrencyCode): Money {
  return { amount: minorUnits(amount), currency };
}

export function zero(currency: CurrencyCode): Money {
  return { amount: minorUnits(0), currency };
}

/**
 * Parse a human-typed decimal ("14.50") into minor units for its currency.
 * Deliberately string-based: `14.50 * 100` is 1449.9999999999998 in some
 * neighbouring cases, and this is exactly the boundary where a portfolio demo
 * would otherwise quietly introduce a float.
 */
export function parseAmount(input: string, currency: CurrencyCode): Money | null {
  const trimmed = input.trim().replace(/[,\s]/g, "");
  if (trimmed === "" || !/^-?\d*(\.\d*)?$/.test(trimmed)) return null;

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [whole = "", fraction = ""] = unsigned.split(".");
  if (whole === "" && fraction === "") return null;

  const exponent = CURRENCIES[currency].exponent;
  if (fraction.length > exponent) return null;

  const padded = fraction.padEnd(exponent, "0");
  const combined = `${whole === "" ? "0" : whole}${padded}`;
  const value = Number(combined);
  if (!Number.isSafeInteger(value)) return null;

  return money(negative ? -value : value, currency);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(
      `Cannot combine ${a.currency} and ${b.currency}. Convert through an FX quote first.`,
    );
  }
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function negate(a: Money): Money {
  return money(-a.amount, a.currency);
}

export function isZero(a: Money): boolean {
  return a.amount === 0;
}

export function isNegative(a: Money): boolean {
  return a.amount < 0;
}

export function isPositive(a: Money): boolean {
  return a.amount > 0;
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amount < b.amount) return -1;
  if (a.amount > b.amount) return 1;
  return 0;
}

export function equals(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

export function absolute(a: Money): Money {
  return a.amount < 0 ? negate(a) : a;
}

export type Rounding = "half-up" | "down";

/**
 * `(value * numerator) / denominator` on integers, via BigInt.
 * Used for FX conversion and for percentage splits.
 */
export function mulDiv(
  value: number,
  numerator: number,
  denominator: number,
  rounding: Rounding = "half-up",
): number {
  if (denominator === 0) throw new RangeError("Division by zero");

  const product = BigInt(value) * BigInt(numerator);
  const divisor = BigInt(denominator);

  let result: bigint;
  if (rounding === "down") {
    result = product / divisor;
  } else {
    const negative = product < 0n !== divisor < 0n;
    const absProduct = product < 0n ? -product : product;
    const absDivisor = divisor < 0n ? -divisor : divisor;
    const quotient = absProduct / absDivisor;
    const remainder = absProduct % absDivisor;
    const rounded = remainder * 2n >= absDivisor ? quotient + 1n : quotient;
    result = negative ? -rounded : rounded;
  }

  const asNumber = Number(result);
  if (!Number.isSafeInteger(asNumber)) {
    throw new RangeError("Result exceeds the safe integer range");
  }
  return asNumber;
}

/**
 * Split an amount into `parts` shares that sum back to exactly the original.
 * The remainder is distributed one minor unit at a time to the earliest shares,
 * because "close enough" is how a ledger acquires a rounding leak.
 */
export function allocate(amount: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new RangeError("Allocation requires a positive integer number of parts");
  }
  const base = Math.trunc(amount.amount / parts);
  let remainder = amount.amount - base * parts;
  const step = remainder < 0 ? -1 : 1;

  const shares: Money[] = [];
  for (let i = 0; i < parts; i += 1) {
    let share = base;
    if (remainder !== 0) {
      share += step;
      remainder -= step;
    }
    shares.push(money(share, amount.currency));
  }
  return shares;
}

/** Split by integer weights, preserving the total exactly. */
export function allocateByWeight(
  amount: Money,
  weights: readonly number[],
): Money[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) throw new RangeError("Weights must sum to a positive value");

  const shares: number[] = [];
  let assigned = 0;
  for (const weight of weights) {
    const share = mulDiv(amount.amount, weight, total, "down");
    shares.push(share);
    assigned += share;
  }

  let remainder = amount.amount - assigned;
  const step = remainder < 0 ? -1 : 1;
  for (let i = 0; remainder !== 0; i = (i + 1) % shares.length) {
    shares[i] = (shares[i] ?? 0) + step;
    remainder -= step;
  }

  return shares.map((share) => money(share, amount.currency));
}

/** "1450" GBP -> "14.50". No symbol, no grouping. For canonical hashing. */
export function toDecimalString(value: Money): string {
  const { exponent } = CURRENCIES[value.currency];
  const negative = value.amount < 0;
  const digits = Math.abs(value.amount).toString().padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent) || "0";
  const fraction = exponent === 0 ? "" : `.${digits.slice(digits.length - exponent)}`;
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

/** "£14.50", with grouping. For display. */
export function format(value: Money, options?: { showSign?: boolean }): string {
  const { symbol, exponent } = CURRENCIES[value.currency];
  const negative = value.amount < 0;
  const digits = Math.abs(value.amount).toString().padStart(exponent + 1, "0");
  const whole = digits.slice(0, digits.length - exponent) || "0";
  const fraction = exponent === 0 ? "" : `.${digits.slice(digits.length - exponent)}`;
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  const sign = negative ? "−" : options?.showSign ? "+" : "";
  return `${sign}${symbol}${grouped}${fraction}`;
}

/**
 * "fourteen pounds fifty pence" is overkill, but "14 pounds 50" beats a screen
 * reader announcing "1 4 5 0". Used for the aria-label on every figure.
 * CLAUDE.md §8.
 */
export function toWords(value: Money): string {
  const { exponent, name, minorName } = CURRENCIES[value.currency];
  const negative = value.amount < 0;
  const absoluteAmount = Math.abs(value.amount);
  const divisor = 10 ** exponent;
  const whole = Math.trunc(absoluteAmount / divisor);
  const fraction = absoluteAmount - whole * divisor;

  const sign = negative ? "negative " : "";
  const wholeWords = `${whole.toLocaleString("en-GB")} ${plural(name, whole)}`;
  if (exponent === 0 || fraction === 0) return `${sign}${wholeWords}`;
  return `${sign}${wholeWords} and ${fraction} ${plural(minorName, fraction)}`;
}

function plural(noun: string, count: number): string {
  if (count === 1) return noun;
  if (noun === "penny") return "pence";
  // Invariant plurals.
  if (noun === "yen" || noun === "kobo" || noun === "naira") return noun;
  return `${noun}s`;
}

export { CURRENCIES };
