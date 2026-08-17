/**
 * End-of-day reconciliation: the external rail's statement against our journal.
 *
 * The output deliberately distinguishes four outcomes rather than the usual
 * two, because "unmatched" collapses cases that need different responses:
 *
 *   matched            both sides agree on reference and amount
 *   amount-drift       both sides have the line, the figures differ
 *   missing-in-journal the rail moved money we have no record of
 *   missing-on-rail    we recorded a movement the rail did not make
 *
 * The last two are not symmetric problems. Money the rail moved without us is a
 * reconciliation break that costs real funds; money we recorded that the rail
 * never moved is usually a stuck payout. Reporting them as one number is how
 * a break goes unnoticed for a quarter.
 */

import { add, negate, subtract, zero } from "./money";
import { type Journal, type Money, type Entry } from "./types";

export interface StatementLine {
  readonly id: string;
  readonly reference: string;
  readonly postedAt: string;
  readonly amount: Money;
  readonly description: string;
}

export type MatchStatus =
  | "matched"
  | "amount-drift"
  | "missing-in-journal"
  | "missing-on-rail";

export interface ReconciliationRow {
  readonly reference: string;
  readonly status: MatchStatus;
  readonly statement: StatementLine | null;
  readonly journal: Entry | null;
  /** Statement minus journal. Zero when matched. */
  readonly drift: Money | null;
}

export interface ReconciliationReport {
  readonly rows: readonly ReconciliationRow[];
  readonly matched: number;
  readonly breaks: number;
  readonly totalDrift: Money;
  readonly clean: boolean;
}

/**
 * Match on reference, which is the only field both sides control and neither
 * side reformats. Matching on amount or timestamp looks fine in a demo and
 * falls apart the first time two customers send the same figure in the same
 * minute.
 */
export function reconcile(
  journal: Journal,
  statement: readonly StatementLine[],
  railAccountId: string,
): ReconciliationReport {
  const journalByReference = new Map<string, Entry>();
  for (const entry of journal.entries) {
    if (entry.accountId !== railAccountId) continue;
    journalByReference.set(entry.reference, entry);
  }

  const rows: ReconciliationRow[] = [];
  const seen = new Set<string>();

  for (const line of statement) {
    seen.add(line.reference);
    const entry = journalByReference.get(line.reference);

    if (entry === undefined) {
      rows.push({
        reference: line.reference,
        status: "missing-in-journal",
        statement: line,
        journal: null,
        drift: line.amount,
      });
      continue;
    }

    const drift = subtract(line.amount, entry.amount);
    rows.push({
      reference: line.reference,
      status: drift.amount === 0 ? "matched" : "amount-drift",
      statement: line,
      journal: entry,
      drift,
    });
  }

  for (const [reference, entry] of journalByReference) {
    if (seen.has(reference)) continue;
    rows.push({
      reference,
      status: "missing-on-rail",
      statement: null,
      journal: entry,
      drift: negate(entry.amount),
    });
  }

  rows.sort((a, b) => a.reference.localeCompare(b.reference));

  const currency = statement[0]?.amount.currency ?? "GBP";
  let totalDrift = zero(currency);
  let matched = 0;

  for (const row of rows) {
    if (row.status === "matched") {
      matched += 1;
      continue;
    }
    if (row.drift !== null && row.drift.currency === currency) {
      totalDrift = add(totalDrift, row.drift);
    }
  }

  return {
    rows,
    matched,
    breaks: rows.length - matched,
    totalDrift,
    clean: rows.length > 0 && matched === rows.length,
  };
}
