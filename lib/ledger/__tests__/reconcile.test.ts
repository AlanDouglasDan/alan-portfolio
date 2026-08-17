import { describe, expect, it } from "vitest";
import { reconcile, type StatementLine } from "../reconcile";
import { emptyJournal, postTransaction } from "../journal";
import { money } from "../money";
import type { Account, Journal } from "../types";

const RAIL: Account = {
  id: "rail:gbp",
  name: "Rail nostro",
  type: "asset",
  currency: "GBP",
  allowsNegativeBalance: true,
  description: "",
};

const CLEARING: Account = {
  id: "clearing",
  name: "Clearing",
  type: "liability",
  currency: "GBP",
  allowsNegativeBalance: true,
  description: "",
};

const POSTED_AT = "2026-03-01T17:00:00.000Z";

function journalWith(
  movements: readonly { reference: string; amount: number }[],
): Journal {
  let journal = emptyJournal();
  movements.forEach((movement, index) => {
    const result = postTransaction(journal, [RAIL, CLEARING], {
      id: `txn_${index + 1}`,
      reference: movement.reference,
      occurredAt: POSTED_AT,
      lines: [
        { accountId: CLEARING.id, direction: "debit", amount: money(movement.amount, "GBP") },
        { accountId: RAIL.id, direction: "credit", amount: money(movement.amount, "GBP") },
      ],
    });
    if (result.ok) journal = result.value.journal;
  });
  return journal;
}

function line(reference: string, amount: number): StatementLine {
  return {
    id: `stmt_${reference}`,
    reference,
    postedAt: POSTED_AT,
    amount: money(amount, "GBP"),
    description: "Faster Payments",
  };
}

describe("reconcile", () => {
  it("reports a clean run when both sides agree", () => {
    const report = reconcile(
      journalWith([
        { reference: "P/1", amount: 320_00 },
        { reference: "P/2", amount: 75_40 },
      ]),
      [line("P/1", 320_00), line("P/2", 75_40)],
      RAIL.id,
    );

    expect(report.clean).toBe(true);
    expect(report.matched).toBe(2);
    expect(report.breaks).toBe(0);
    expect(report.totalDrift).toEqual(money(0, "GBP"));
  });

  it("separates the four outcomes rather than collapsing them", () => {
    const report = reconcile(
      journalWith([
        { reference: "P/1", amount: 320_00 }, // matches
        { reference: "P/2", amount: 75_00 }, // rail says 75.40
        { reference: "P/4", amount: 60_00 }, // we recorded it, rail never moved it
      ]),
      [
        line("P/1", 320_00),
        line("P/2", 75_40),
        line("P/3", 1_040_00), // rail moved it, we have no record
      ],
      RAIL.id,
    );

    const byReference = new Map(report.rows.map((row) => [row.reference, row]));
    expect(byReference.get("P/1")?.status).toBe("matched");
    expect(byReference.get("P/2")?.status).toBe("amount-drift");
    expect(byReference.get("P/2")?.drift).toEqual(money(40, "GBP"));
    expect(byReference.get("P/3")?.status).toBe("missing-in-journal");
    expect(byReference.get("P/4")?.status).toBe("missing-on-rail");
    expect(byReference.get("P/4")?.drift).toEqual(money(-60_00, "GBP"));

    expect(report.matched).toBe(1);
    expect(report.breaks).toBe(3);
    expect(report.clean).toBe(false);
  });

  it("sums drift across the breaks", () => {
    const report = reconcile(
      journalWith([{ reference: "P/1", amount: 100_00 }]),
      [line("P/1", 100_50)],
      RAIL.id,
    );
    expect(report.totalDrift).toEqual(money(50, "GBP"));
  });

  it("ignores entries on other accounts", () => {
    const report = reconcile(
      journalWith([{ reference: "P/1", amount: 100_00 }]),
      [line("P/1", 100_00)],
      "some:other:account",
    );
    // Nothing on that account, so the statement line is unmatched rather than
    // silently matched against a clearing-side entry.
    expect(report.rows[0]?.status).toBe("missing-in-journal");
  });

  it("an empty statement against an empty journal is not 'clean'", () => {
    const report = reconcile(emptyJournal(), [], RAIL.id);
    expect(report.rows).toHaveLength(0);
    // Nothing was checked, so nothing was proven.
    expect(report.clean).toBe(false);
  });
});
