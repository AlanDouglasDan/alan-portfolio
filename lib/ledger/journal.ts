/**
 * The journal: an append-only, hash-chained list of posting lines.
 *
 * Three properties this module exists to guarantee, each asserted in
 * __tests__/journal.test.ts:
 *
 *   - Every transaction balances. Debits equal credits, per currency, or the
 *     transaction is rejected before a single line is written.
 *   - A balance is never stored. `fold()` derives it from the entries every
 *     time, so there is no second copy of the truth to drift away from the
 *     first.
 *   - Appending never mutates. `append` returns a new journal; the entry array
 *     handed back is frozen.
 *
 * Nothing in here reads a clock or a random source. Time and identity are
 * supplied by the caller, which is what makes the whole module deterministic
 * and therefore worth writing property tests against.
 */

import { canonicalise, GENESIS_HASH, sha256 } from "./signature";
import { toDecimalString, zero, money, add as addMoney } from "./money";
import {
  type Account,
  type CurrencyCode,
  type Direction,
  type DraftLine,
  type DraftTransaction,
  type Entry,
  type Journal,
  type Money,
  type Result,
  err,
  ok,
} from "./types";

export function emptyJournal(): Journal {
  return { entries: Object.freeze([]), head: GENESIS_HASH };
}

/**
 * The bytes an entry's hash commits to. Field order is fixed and every field is
 * length-prefixed, so no two distinct entries can produce the same string.
 * Changing this function invalidates every existing chain, which is why it is
 * kept small and boring.
 */
export function entryDigestInput(
  entry: Omit<Entry, "hash">,
): string {
  const metadataFields = Object.keys(entry.metadata)
    .sort()
    .flatMap((key) => [key, entry.metadata[key] ?? ""]);

  return canonicalise([
    String(entry.sequence),
    entry.id,
    entry.transactionId,
    entry.occurredAt,
    entry.accountId,
    entry.direction,
    toDecimalString(entry.amount),
    entry.amount.currency,
    entry.reference,
    entry.previousHash,
    String(metadataFields.length),
    ...metadataFields,
  ]);
}

export function hashEntry(entry: Omit<Entry, "hash">): string {
  return sha256(entryDigestInput(entry));
}

/**
 * Low-level append. Assumes the caller has already validated the lines; use
 * `postTransaction` unless you are reconstructing a journal from storage.
 */
export function append(
  journal: Journal,
  lines: readonly Omit<Entry, "hash" | "previousHash" | "sequence">[],
): Journal {
  let previousHash = journal.head;
  let sequence = journal.entries.length;

  const appended: Entry[] = [];
  for (const line of lines) {
    sequence += 1;
    const withoutHash = { ...line, sequence, previousHash };
    const hash = hashEntry(withoutHash);
    const entry: Entry = Object.freeze({ ...withoutHash, hash });
    appended.push(entry);
    previousHash = hash;
  }

  return {
    entries: Object.freeze([...journal.entries, ...appended]),
    head: previousHash,
  };
}

/** Does a debit raise or lower this account's balance? */
export function signOf(account: Account, direction: Direction): 1 | -1 {
  const debitPositive = account.type === "asset" || account.type === "expense";
  const isDebit = direction === "debit";
  return debitPositive === isDebit ? 1 : -1;
}

/**
 * Derive one account's balance by folding its entries. This is the only way a
 * balance is ever obtained. There is no cached figure to reconcile against.
 */
export function fold(
  journal: Journal,
  account: Account,
  upToSequence = Number.POSITIVE_INFINITY,
): Money {
  let balance = zero(account.currency);
  for (const entry of journal.entries) {
    if (entry.accountId !== account.id) continue;
    if (entry.sequence > upToSequence) break;
    const signed = signOf(account, entry.direction) * entry.amount.amount;
    balance = addMoney(balance, money(signed, entry.amount.currency));
  }
  return balance;
}

export function foldAll(
  journal: Journal,
  accounts: readonly Account[],
): Map<string, Money> {
  const balances = new Map<string, Money>();
  for (const account of accounts) {
    balances.set(account.id, fold(journal, account));
  }
  return balances;
}

export interface TrialBalanceRow {
  readonly currency: CurrencyCode;
  readonly debits: number;
  readonly credits: number;
  readonly balanced: boolean;
}

/**
 * Invariant 1, computed rather than asserted: for every currency, total debits
 * equal total credits. The playground renders this so the reader can watch it
 * hold as they post.
 */
export function trialBalance(journal: Journal): TrialBalanceRow[] {
  const totals = new Map<CurrencyCode, { debits: number; credits: number }>();

  for (const entry of journal.entries) {
    const row = totals.get(entry.amount.currency) ?? { debits: 0, credits: 0 };
    if (entry.direction === "debit") row.debits += entry.amount.amount;
    else row.credits += entry.amount.amount;
    totals.set(entry.amount.currency, row);
  }

  return [...totals.entries()].map(([currency, { debits, credits }]) => ({
    currency,
    debits,
    credits,
    balanced: debits === credits,
  }));
}

export interface VerificationOk {
  readonly ok: true;
  readonly entriesChecked: number;
}

export interface VerificationFailure {
  readonly ok: false;
  readonly entriesChecked: number;
  readonly failedSequence: number;
  readonly failedEntryId: string;
  readonly reason: "content-hash" | "broken-link" | "sequence-gap";
  readonly expected: string;
  readonly actual: string;
}

export type VerificationResult = VerificationOk | VerificationFailure;

/**
 * Walk the chain and recompute it. Reports the first sequence number that
 * fails and why, because "verification failed" without a location is not an
 * audit trail, it is an alarm.
 */
export function verify(journal: Journal): VerificationResult {
  let previousHash = GENESIS_HASH;

  for (let index = 0; index < journal.entries.length; index += 1) {
    const entry = journal.entries[index];
    if (entry === undefined) break;

    const expectedSequence = index + 1;
    if (entry.sequence !== expectedSequence) {
      return {
        ok: false,
        entriesChecked: index,
        failedSequence: expectedSequence,
        failedEntryId: entry.id,
        reason: "sequence-gap",
        expected: String(expectedSequence),
        actual: String(entry.sequence),
      };
    }

    if (entry.previousHash !== previousHash) {
      return {
        ok: false,
        entriesChecked: index,
        failedSequence: entry.sequence,
        failedEntryId: entry.id,
        reason: "broken-link",
        expected: previousHash,
        actual: entry.previousHash,
      };
    }

    const recomputed = hashEntry(entry);
    if (recomputed !== entry.hash) {
      return {
        ok: false,
        entriesChecked: index,
        failedSequence: entry.sequence,
        failedEntryId: entry.id,
        reason: "content-hash",
        expected: recomputed,
        actual: entry.hash,
      };
    }

    previousHash = entry.hash;
  }

  return { ok: true, entriesChecked: journal.entries.length };
}

export interface PostResult {
  readonly journal: Journal;
  readonly entries: readonly Entry[];
}

/**
 * Validate a draft transaction and, only if every check passes, append its
 * lines. Validation order matters: structural problems are reported before
 * balance problems, so the reader is told what is actually wrong rather than
 * being told they have insufficient funds when they typed the wrong currency.
 */
export function postTransaction(
  journal: Journal,
  accounts: readonly Account[],
  draft: DraftTransaction,
): Result<PostResult> {
  if (draft.lines.length === 0) {
    return err("EMPTY_TRANSACTION", "A transaction must contain at least one line.");
  }

  const byId = new Map(accounts.map((account) => [account.id, account]));

  for (const line of draft.lines) {
    const account = byId.get(line.accountId);
    if (account === undefined) {
      return err("UNKNOWN_ACCOUNT", `No account with id "${line.accountId}".`, {
        accountId: line.accountId,
      });
    }
    if (line.amount.amount <= 0) {
      return err(
        "NON_POSITIVE_AMOUNT",
        "Every posting line must be a positive amount. Direction carries the sign, not the figure.",
        { accountId: line.accountId },
      );
    }
    if (line.amount.currency !== account.currency) {
      return err(
        "CURRENCY_MISMATCH",
        `Account ${account.name} is denominated in ${account.currency}, but the line is ${line.amount.currency}.`,
        { accountId: line.accountId, expected: account.currency, actual: line.amount.currency },
      );
    }
  }

  const unbalanced = findUnbalancedCurrency(draft.lines);
  if (unbalanced !== null) {
    return err(
      "UNBALANCED",
      `Debits and credits do not agree in ${unbalanced.currency}: ${unbalanced.debits} against ${unbalanced.credits} minor units.`,
      {
        currency: unbalanced.currency,
        debits: String(unbalanced.debits),
        credits: String(unbalanced.credits),
      },
    );
  }

  const constraintFailure = findConstraintBreach(journal, byId, draft.lines);
  if (constraintFailure !== null) return constraintFailure;

  const next = append(
    journal,
    draft.lines.map((line, index) => ({
      id: `${draft.id}-${index + 1}`,
      transactionId: draft.id,
      occurredAt: draft.occurredAt,
      accountId: line.accountId,
      direction: line.direction,
      amount: line.amount,
      reference: draft.reference,
      metadata: draft.metadata ?? {},
    })),
  );

  const entries = next.entries.slice(journal.entries.length);
  return ok({ journal: next, entries });
}

function findUnbalancedCurrency(
  lines: readonly DraftLine[],
): { currency: CurrencyCode; debits: number; credits: number } | null {
  const totals = new Map<CurrencyCode, { debits: number; credits: number }>();

  for (const line of lines) {
    const row = totals.get(line.amount.currency) ?? { debits: 0, credits: 0 };
    if (line.direction === "debit") row.debits += line.amount.amount;
    else row.credits += line.amount.amount;
    totals.set(line.amount.currency, row);
  }

  for (const [currency, row] of totals) {
    if (row.debits !== row.credits) {
      return { currency, debits: row.debits, credits: row.credits };
    }
  }
  return null;
}

/**
 * The overdraft check. It runs against the *derived* balance plus the effect of
 * this transaction, which is why the UI cannot route around it: there is no
 * other door into the journal.
 */
function findConstraintBreach(
  journal: Journal,
  byId: ReadonlyMap<string, Account>,
  lines: readonly DraftLine[],
): Result<PostResult> | null {
  const deltas = new Map<string, number>();
  for (const line of lines) {
    const account = byId.get(line.accountId);
    if (account === undefined) continue;
    const delta = signOf(account, line.direction) * line.amount.amount;
    deltas.set(line.accountId, (deltas.get(line.accountId) ?? 0) + delta);
  }

  for (const [accountId, delta] of deltas) {
    const account = byId.get(accountId);
    if (account === undefined || account.allowsNegativeBalance) continue;

    const current = fold(journal, account);
    const projected = current.amount + delta;
    if (projected < 0) {
      return err(
        "INSUFFICIENT_FUNDS",
        `${account.name} holds ${current.amount} minor units; this transaction would take it to ${projected}.`,
        {
          accountId,
          available: String(current.amount),
          projected: String(projected),
          currency: account.currency,
        },
      );
    }
  }

  return null;
}

/** Entries belonging to one transaction, in chain order. */
export function entriesForTransaction(
  journal: Journal,
  transactionId: string,
): readonly Entry[] {
  return journal.entries.filter((entry) => entry.transactionId === transactionId);
}
