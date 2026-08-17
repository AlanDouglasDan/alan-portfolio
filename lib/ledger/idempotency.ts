/**
 * Idempotency keys.
 *
 * The rule this enforces is narrow and worth stating exactly, because it is
 * the one most often implemented wrongly:
 *
 *   The same key with the same request replays the stored result and posts
 *   nothing new. The same key with a *different* request is an error, not a
 *   replay.
 *
 * The second half matters. A store that keys only on the key will happily
 * return the result of transfer A to a caller who asked for transfer B, which
 * is worse than having no idempotency at all. So the request is fingerprinted
 * and the fingerprint is compared on every hit.
 */

import { canonicalise, sha256 } from "./signature";
import { toDecimalString } from "./money";
import { type DraftTransaction, type Result, err, ok } from "./types";

export type IdempotencyOutcome = "created" | "replayed";

export interface IdempotencyRecord<T> {
  readonly key: string;
  readonly fingerprint: string;
  readonly result: T;
  readonly storedAt: string;
}

export type IdempotencyStore<T> = ReadonlyMap<string, IdempotencyRecord<T>>;

export function emptyStore<T>(): IdempotencyStore<T> {
  return new Map();
}

/**
 * A stable digest of what the caller actually asked for. Two requests that
 * differ in any field that affects the outcome must fingerprint differently.
 */
export function fingerprintTransaction(draft: DraftTransaction): string {
  const lines = draft.lines.map((line) =>
    canonicalise([
      line.accountId,
      line.direction,
      toDecimalString(line.amount),
      line.amount.currency,
    ]),
  );

  return sha256(
    canonicalise([draft.reference, String(lines.length), ...lines]),
  );
}

export interface Replay<T> {
  readonly outcome: IdempotencyOutcome;
  readonly result: T;
  readonly store: IdempotencyStore<T>;
}

/**
 * Look up a key. A miss returns null and the caller does the work; a hit with a
 * matching fingerprint replays; a hit with a different fingerprint is a
 * conflict and the caller must not proceed.
 */
export function checkKey<T>(
  store: IdempotencyStore<T>,
  key: string,
  fingerprint: string,
): Result<IdempotencyRecord<T> | null> {
  const record = store.get(key);
  if (record === undefined) return ok(null);

  if (record.fingerprint !== fingerprint) {
    return err(
      "IDEMPOTENCY_CONFLICT",
      `Key "${key}" was already used for a different request. Reusing a key with changed parameters is rejected rather than replayed.`,
      { key, stored: record.fingerprint.slice(0, 12), received: fingerprint.slice(0, 12) },
    );
  }

  return ok(record);
}

export function remember<T>(
  store: IdempotencyStore<T>,
  key: string,
  fingerprint: string,
  result: T,
  storedAt: string,
): IdempotencyStore<T> {
  const next = new Map(store);
  next.set(key, { key, fingerprint, result, storedAt });
  return next;
}
