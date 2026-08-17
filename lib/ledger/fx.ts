/**
 * FX quotes.
 *
 * Two rules, both of which exist because of how cross-currency transfers go
 * wrong in production:
 *
 *   1. A rate is quoted, locked, and expires. You cannot convert at "the
 *      current rate" at posting time, because the rate the customer was shown
 *      and the rate you settled at would then be allowed to differ.
 *   2. The rate that was used is written onto the entry. It is never
 *      re-derived later from a rate table, because that table will have moved
 *      by the time anyone asks, and the answer to "what rate did we give this
 *      customer in March" must not depend on when the question is asked.
 *
 * Rates are held as an integer numerator over an integer denominator, so the
 * conversion is integer arithmetic end to end.
 */

import { money, mulDiv } from "./money";
import {
  CURRENCIES,
  type CurrencyCode,
  type Money,
  type Result,
  err,
  ok,
} from "./types";

export interface Rate {
  readonly from: CurrencyCode;
  readonly to: CurrencyCode;
  readonly numerator: number;
  readonly denominator: number;
}

export interface Quote {
  readonly id: string;
  readonly rate: Rate;
  readonly issuedAt: string;
  readonly expiresAt: string;
  readonly sell: Money;
  readonly buy: Money;
  /** Human-readable, and stored on the entry: "1 GBP = 1,975.4200 NGN". */
  readonly display: string;
}

export type QuoteStatus = "live" | "expired" | "used";

/**
 * Indicative mid-market rates, held as integer ratios.
 * Marked indicative because they are a fixture for the demo, not a feed.
 */
export const DEMO_RATES: readonly Rate[] = [
  { from: "GBP", to: "NGN", numerator: 19754200, denominator: 10000 },
  { from: "GBP", to: "USD", numerator: 12680, denominator: 10000 },
  { from: "USD", to: "NGN", numerator: 15578000, denominator: 10000 },
  { from: "USD", to: "GBP", numerator: 7886, denominator: 10000 },
  { from: "NGN", to: "GBP", numerator: 5, denominator: 9877 },
  { from: "NGN", to: "USD", numerator: 6, denominator: 9347 },
  { from: "EUR", to: "GBP", numerator: 8420, denominator: 10000 },
  { from: "GBP", to: "EUR", numerator: 11876, denominator: 10000 },
];

export function findRate(from: CurrencyCode, to: CurrencyCode): Rate | null {
  return DEMO_RATES.find((rate) => rate.from === from && rate.to === to) ?? null;
}

/** How long a quote is good for. Short, as it would be on a real desk. */
export const QUOTE_TTL_MS = 90_000;

/**
 * Apply a rate, adjusting for the two currencies' decimal exponents so that
 * GBP→JPY does not silently gain two decimal places.
 */
export function convert(amount: Money, rate: Rate): Money {
  if (amount.currency !== rate.from) {
    throw new TypeError(
      `Quote converts ${rate.from}, but the amount is ${amount.currency}.`,
    );
  }

  const exponentShift =
    CURRENCIES[rate.to].exponent - CURRENCIES[rate.from].exponent;
  const scaleUp = exponentShift > 0 ? 10 ** exponentShift : 1;
  const scaleDown = exponentShift < 0 ? 10 ** -exponentShift : 1;

  const converted = mulDiv(
    amount.amount,
    rate.numerator * scaleUp,
    rate.denominator * scaleDown,
    "half-up",
  );

  return money(converted, rate.to);
}

function formatRate(rate: Rate): string {
  const perUnit = (rate.numerator / rate.denominator).toLocaleString("en-GB", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  });
  return `1 ${rate.from} = ${perUnit} ${rate.to}`;
}

export function issueQuote(
  id: string,
  sell: Money,
  to: CurrencyCode,
  nowMs: number,
): Result<Quote> {
  const rate = findRate(sell.currency, to);
  if (rate === null) {
    return err(
      "QUOTE_NOT_FOUND",
      `No rate is published for ${sell.currency} to ${to}.`,
      { from: sell.currency, to },
    );
  }

  const issuedAt = new Date(nowMs).toISOString();
  const expiresAt = new Date(nowMs + QUOTE_TTL_MS).toISOString();

  return ok({
    id,
    rate,
    issuedAt,
    expiresAt,
    sell,
    buy: convert(sell, rate),
    display: formatRate(rate),
  });
}

export function quoteStatus(quote: Quote, nowMs: number, used: boolean): QuoteStatus {
  if (used) return "used";
  return Date.parse(quote.expiresAt) <= nowMs ? "expired" : "live";
}

export function assertQuoteUsable(
  quote: Quote,
  nowMs: number,
  used: boolean,
): Result<Quote> {
  const status = quoteStatus(quote, nowMs, used);
  if (status === "used") {
    return err("QUOTE_ALREADY_USED", `Quote ${quote.id} has already been executed.`, {
      quoteId: quote.id,
    });
  }
  if (status === "expired") {
    return err(
      "QUOTE_EXPIRED",
      `Quote ${quote.id} expired at ${quote.expiresAt}. Request a new one; the rate is not re-derived at posting time.`,
      { quoteId: quote.id, expiresAt: quote.expiresAt },
    );
  }
  return ok(quote);
}

/** Written onto the entry metadata so the rate used is part of the record. */
export function rateMetadata(quote: Quote): Record<string, string> {
  return {
    fxQuoteId: quote.id,
    fxRate: `${quote.rate.numerator}/${quote.rate.denominator}`,
    fxPair: `${quote.rate.from}${quote.rate.to}`,
    fxQuotedAt: quote.issuedAt,
  };
}
