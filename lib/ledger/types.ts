/**
 * Domain types for the ledger.
 *
 * The single most important line in this file is the `MinorUnits` brand. Money
 * is an integer count of the currency's smallest unit plus a currency code, and
 * the brand means a bare `number` cannot be assigned into a money field without
 * going through `money()` in money.ts. Floating point never touches a balance.
 */

declare const minorUnitsBrand: unique symbol;

/** An integer count of a currency's smallest unit. 1450 GBP minor = £14.50. */
export type MinorUnits = number & { readonly [minorUnitsBrand]: "MinorUnits" };

export type CurrencyCode = "USD" | "GBP" | "EUR" | "NGN" | "JPY";

export interface Currency {
  readonly code: CurrencyCode;
  readonly symbol: string;
  /** Decimal places. JPY is 0; the rest here are 2. */
  readonly exponent: number;
  readonly name: string;
  /** Singular name of the minor unit, for screen-reader labels. */
  readonly minorName: string;
}

export const CURRENCIES: Readonly<Record<CurrencyCode, Currency>> = {
  USD: { code: "USD", symbol: "$", exponent: 2, name: "US dollar", minorName: "cent" },
  GBP: { code: "GBP", symbol: "£", exponent: 2, name: "pound", minorName: "penny" },
  EUR: { code: "EUR", symbol: "€", exponent: 2, name: "euro", minorName: "cent" },
  NGN: { code: "NGN", symbol: "₦", exponent: 2, name: "naira", minorName: "kobo" },
  JPY: { code: "JPY", symbol: "¥", exponent: 0, name: "yen", minorName: "yen" },
};

export interface Money {
  readonly amount: MinorUnits;
  readonly currency: CurrencyCode;
}

/**
 * Normal-balance side. Assets and expenses increase on the debit side;
 * liabilities, equity and revenue increase on the credit side. A customer
 * wallet is a liability: the platform owes that money to the customer.
 */
export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense";

export type Direction = "debit" | "credit";

export interface Account {
  readonly id: string;
  readonly name: string;
  readonly type: AccountType;
  readonly currency: CurrencyCode;
  /**
   * Whether the account may go below zero in its normal direction. Customer
   * wallets may not. Clearing and suspense accounts held against an external
   * rail may, because the rail's own position can legitimately be negative
   * between initiation and settlement.
   */
  readonly allowsNegativeBalance: boolean;
  /** Shown in the UI so a non-technical reader knows what the account is for. */
  readonly description: string;
}

/** One posting line. The journal is a list of these, and it only ever grows. */
export interface Entry {
  readonly id: string;
  /** Position in the chain, from 1. */
  readonly sequence: number;
  /** Groups the lines of one balanced transaction. */
  readonly transactionId: string;
  readonly occurredAt: string;
  readonly accountId: string;
  readonly direction: Direction;
  readonly amount: Money;
  readonly reference: string;
  readonly metadata: Readonly<Record<string, string>>;
  readonly previousHash: string;
  readonly hash: string;
}

export interface Journal {
  readonly entries: readonly Entry[];
  /** Hash of the last entry, or GENESIS_HASH when empty. */
  readonly head: string;
}

/** A proposed posting line, before it is sequenced, hashed and appended. */
export interface DraftLine {
  readonly accountId: string;
  readonly direction: Direction;
  readonly amount: Money;
}

/** A proposed transaction. Rejected outright unless its lines balance. */
export interface DraftTransaction {
  readonly id: string;
  readonly reference: string;
  readonly occurredAt: string;
  readonly lines: readonly DraftLine[];
  readonly metadata?: Readonly<Record<string, string>>;
}

export type LedgerErrorCode =
  | "EMPTY_TRANSACTION"
  | "UNBALANCED"
  | "UNKNOWN_ACCOUNT"
  | "CURRENCY_MISMATCH"
  | "NON_POSITIVE_AMOUNT"
  | "INSUFFICIENT_FUNDS"
  | "QUOTE_EXPIRED"
  | "QUOTE_NOT_FOUND"
  | "QUOTE_ALREADY_USED"
  | "IDEMPOTENCY_CONFLICT"
  | "RAIL_FAILURE"
  | "TRANSFER_NOT_FOUND"
  | "INVALID_STATE";

export interface LedgerError {
  readonly code: LedgerErrorCode;
  /** Written for a human reading the UI, not only for a log line. */
  readonly message: string;
  readonly detail?: Readonly<Record<string, string>>;
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: LedgerError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(
  code: LedgerErrorCode,
  message: string,
  detail?: Readonly<Record<string, string>>,
): Result<T> {
  return { ok: false, error: detail ? { code, message, detail } : { code, message } };
}
