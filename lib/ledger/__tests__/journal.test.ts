/**
 * The five invariants from CLAUDE.md §6.2, asserted directly.
 *
 * Where an invariant is universally quantified ("always", "any single-byte
 * change"), it is tested with fast-check over generated journals rather than
 * with a handful of examples, because an example test of a universal claim is
 * not evidence for it.
 */

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  append,
  emptyJournal,
  entriesForTransaction,
  fold,
  hashEntry,
  postTransaction,
  signOf,
  trialBalance,
  verify,
} from "../journal";
import { money } from "../money";
import { GENESIS_HASH } from "../signature";
import type { Account, DraftTransaction, Journal } from "../types";

const WALLET_A: Account = {
  id: "wallet:a",
  name: "Wallet A",
  type: "liability",
  currency: "GBP",
  allowsNegativeBalance: false,
  description: "",
};

const WALLET_B: Account = {
  id: "wallet:b",
  name: "Wallet B",
  type: "liability",
  currency: "GBP",
  allowsNegativeBalance: false,
  description: "",
};

const TREASURY: Account = {
  id: "treasury",
  name: "Treasury",
  type: "asset",
  currency: "GBP",
  allowsNegativeBalance: true,
  description: "",
};

const ACCOUNTS = [WALLET_A, WALLET_B, TREASURY];

let counter = 0;
function draft(
  lines: DraftTransaction["lines"],
  reference = "TEST",
): DraftTransaction {
  counter += 1;
  return {
    id: `txn_${counter}`,
    reference,
    occurredAt: "2026-03-01T09:00:00.000Z",
    lines,
  };
}

function fundedWith(amount: number, account: Account = WALLET_A): Journal {
  const result = postTransaction(
    emptyJournal(),
    ACCOUNTS,
    draft(
      [
        { accountId: TREASURY.id, direction: "debit", amount: money(amount, "GBP") },
        { accountId: account.id, direction: "credit", amount: money(amount, "GBP") },
      ],
      "FUND",
    ),
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value.journal;
}

/** Generates a sequence of balanced transfers against a funded journal. */
const journalArbitrary = fc
  .array(fc.integer({ min: 1, max: 5_000 }), { minLength: 0, maxLength: 25 })
  .map((amounts) => {
    let journal = fundedWith(1_000_000);
    for (const amount of amounts) {
      const result = postTransaction(
        journal,
        ACCOUNTS,
        draft([
          { accountId: WALLET_A.id, direction: "debit", amount: money(amount, "GBP") },
          { accountId: WALLET_B.id, direction: "credit", amount: money(amount, "GBP") },
        ]),
      );
      if (result.ok) journal = result.value.journal;
    }
    return journal;
  });

/* ------------------------------------------------------------------------ */

describe("invariant 1: debits equal credits, per currency, always", () => {
  it("holds over arbitrary journals", () => {
    fc.assert(
      fc.property(journalArbitrary, (journal) => {
        for (const row of trialBalance(journal)) {
          expect(row.debits).toBe(row.credits);
          expect(row.balanced).toBe(true);
        }
      }),
    );
  });

  it("rejects an unbalanced transaction before writing anything", () => {
    const journal = fundedWith(10_000);
    const before = journal.entries.length;

    const result = postTransaction(
      journal,
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(500, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(400, "GBP") },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNBALANCED");
    // The journal handed in is unchanged — rejection is not a partial write.
    expect(journal.entries.length).toBe(before);
  });

  it("balances each currency independently in a cross-currency transaction", () => {
    const ngnWallet: Account = {
      id: "wallet:ngn",
      name: "NGN wallet",
      type: "liability",
      currency: "NGN",
      allowsNegativeBalance: true,
      description: "",
    };
    const position: Account = {
      id: "fx:ngn",
      name: "FX NGN",
      type: "equity",
      currency: "NGN",
      allowsNegativeBalance: true,
      description: "",
    };
    const positionGbp: Account = {
      id: "fx:gbp",
      name: "FX GBP",
      type: "equity",
      currency: "GBP",
      allowsNegativeBalance: true,
      description: "",
    };

    const result = postTransaction(
      emptyJournal(),
      [...ACCOUNTS, ngnWallet, position, positionGbp],
      draft([
        { accountId: ngnWallet.id, direction: "debit", amount: money(100_000_00, "NGN") },
        { accountId: position.id, direction: "credit", amount: money(100_000_00, "NGN") },
        { accountId: positionGbp.id, direction: "debit", amount: money(50_62, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(50_62, "GBP") },
      ]),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const row of trialBalance(result.value.journal)) {
        expect(row.balanced).toBe(true);
      }
    }
  });
});

describe("invariant 2: a balance is the fold of its entries", () => {
  it("matches an independent recomputation over arbitrary journals", () => {
    fc.assert(
      fc.property(journalArbitrary, (journal) => {
        for (const account of ACCOUNTS) {
          const folded = fold(journal, account);
          const recomputed = journal.entries
            .filter((entry) => entry.accountId === account.id)
            .reduce(
              (sum, entry) => sum + signOf(account, entry.direction) * entry.amount.amount,
              0,
            );
          expect(folded.amount).toBe(recomputed);
          expect(folded.currency).toBe(account.currency);
        }
      }),
    );
  });

  it("an empty journal folds to zero, not to undefined", () => {
    expect(fold(emptyJournal(), WALLET_A)).toEqual(money(0, "GBP"));
  });

  it("refuses to overdraw an account that disallows it", () => {
    const journal = fundedWith(1_000);
    const result = postTransaction(
      journal,
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(1_001, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(1_001, "GBP") },
      ]),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
      expect(result.error.detail?.available).toBe("1000");
    }
  });

  it("permits a negative balance where the account allows it", () => {
    const result = postTransaction(
      emptyJournal(),
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "credit", amount: money(500, "GBP") },
        { accountId: TREASURY.id, direction: "debit", amount: money(500, "GBP") },
      ]),
    );
    expect(result.ok).toBe(true);
  });
});

describe("invariant 3: appending never mutates or removes", () => {
  it("leaves every prior entry byte-identical", () => {
    fc.assert(
      fc.property(journalArbitrary, fc.integer({ min: 1, max: 900 }), (journal, amount) => {
        const before = JSON.stringify(journal.entries);

        const result = postTransaction(
          journal,
          ACCOUNTS,
          draft([
            { accountId: TREASURY.id, direction: "debit", amount: money(amount, "GBP") },
            { accountId: WALLET_A.id, direction: "credit", amount: money(amount, "GBP") },
          ]),
        );

        expect(JSON.stringify(journal.entries)).toBe(before);
        if (result.ok) {
          const next = result.value.journal;
          expect(next.entries.length).toBe(journal.entries.length + 2);
          expect(JSON.stringify(next.entries.slice(0, journal.entries.length))).toBe(before);
        }
      }),
    );
  });

  it("freezes the entries it hands back", () => {
    const journal = fundedWith(100);
    expect(Object.isFrozen(journal.entries)).toBe(true);
    const first = journal.entries[0];
    expect(first).toBeDefined();
    if (first) expect(Object.isFrozen(first)).toBe(true);
  });

  it("numbers entries contiguously from 1", () => {
    fc.assert(
      fc.property(journalArbitrary, (journal) => {
        journal.entries.forEach((entry, index) => {
          expect(entry.sequence).toBe(index + 1);
        });
      }),
    );
  });

  it("groups the lines of one transaction under one id", () => {
    const journal = fundedWith(5_000);
    const first = journal.entries[0];
    expect(first).toBeDefined();
    if (!first) return;
    expect(entriesForTransaction(journal, first.transactionId)).toHaveLength(2);
  });
});

describe("invariant 5: any change invalidates the chain from that point", () => {
  it("verifies a well-formed journal", () => {
    fc.assert(
      fc.property(journalArbitrary, (journal) => {
        const result = verify(journal);
        expect(result.ok).toBe(true);
        if (result.ok) expect(result.entriesChecked).toBe(journal.entries.length);
      }),
    );
  });

  it("an empty journal verifies", () => {
    expect(verify(emptyJournal())).toEqual({ ok: true, entriesChecked: 0 });
  });

  it("chains each entry to its predecessor", () => {
    const journal = fundedWith(5_000);
    expect(journal.entries[0]?.previousHash).toBe(GENESIS_HASH);
    expect(journal.entries[1]?.previousHash).toBe(journal.entries[0]?.hash);
    expect(journal.head).toBe(journal.entries[journal.entries.length - 1]?.hash);
  });

  it("detects a changed amount at the exact row, whichever row it is", () => {
    fc.assert(
      fc.property(
        journalArbitrary.filter((journal) => journal.entries.length > 0),
        fc.nat(),
        (journal, offset) => {
          const index = offset % journal.entries.length;
          const target = journal.entries[index];
          if (target === undefined) return;

          const tampered: Journal = {
            ...journal,
            entries: journal.entries.map((entry, position) =>
              position === index
                ? { ...entry, amount: money(entry.amount.amount + 1, entry.amount.currency) }
                : entry,
            ),
          };

          const result = verify(tampered);
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.failedSequence).toBe(index + 1);
            expect(result.reason).toBe("content-hash");
            expect(result.failedEntryId).toBe(target.id);
          }
        },
      ),
    );
  });

  it("detects a single changed character in the reference", () => {
    const journal = fundedWith(5_000);
    const first = journal.entries[0];
    expect(first).toBeDefined();
    if (!first) return;

    const tampered: Journal = {
      ...journal,
      entries: [{ ...first, reference: "FUNE" }, ...journal.entries.slice(1)],
    };

    const result = verify(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("content-hash");
  });

  it("detects a deleted entry as a broken link, not as a shorter journal", () => {
    const journal = fundedWith(5_000);
    const withoutFirst: Journal = {
      ...journal,
      entries: journal.entries.slice(1).map((entry, index) => ({
        ...entry,
        sequence: index + 1,
      })),
    };

    const result = verify(withoutFirst);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("broken-link");
  });

  it("detects a reordering", () => {
    let journal = fundedWith(10_000);
    const second = postTransaction(
      journal,
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(100, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(100, "GBP") },
      ]),
    );
    if (second.ok) journal = second.value.journal;

    const swapped: Journal = {
      ...journal,
      entries: [journal.entries[1], journal.entries[0], ...journal.entries.slice(2)].filter(
        (entry): entry is NonNullable<typeof entry> => entry !== undefined,
      ),
    };

    expect(verify(swapped).ok).toBe(false);
  });

  it("a re-hashed forgery still breaks, because the chain continues past it", () => {
    // The interesting case: an attacker who knows how the hash is computed and
    // repairs the tampered entry's own hash. The next entry's previousHash
    // still points at the original, so the break simply moves one row down.
    let journal = fundedWith(10_000);
    const second = postTransaction(
      journal,
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(100, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(100, "GBP") },
      ]),
    );
    if (second.ok) journal = second.value.journal;

    const first = journal.entries[0];
    expect(first).toBeDefined();
    if (!first) return;

    const forged = { ...first, amount: money(99_999, "GBP") };
    const repaired = { ...forged, hash: hashEntry(forged) };

    const result = verify({
      ...journal,
      entries: [repaired, ...journal.entries.slice(1)],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("broken-link");
      expect(result.failedSequence).toBe(2);
    }
  });
});

describe("validation ordering", () => {
  it("reports an unknown account before anything else", () => {
    const result = postTransaction(
      emptyJournal(),
      ACCOUNTS,
      draft([
        { accountId: "nope", direction: "debit", amount: money(100, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(100, "GBP") },
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("UNKNOWN_ACCOUNT");
  });

  it("rejects a line in the wrong currency for its account", () => {
    const result = postTransaction(
      emptyJournal(),
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(100, "USD") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(100, "USD") },
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("CURRENCY_MISMATCH");
  });

  it("rejects a zero or negative line: direction carries the sign", () => {
    const result = postTransaction(
      emptyJournal(),
      ACCOUNTS,
      draft([
        { accountId: WALLET_A.id, direction: "debit", amount: money(-100, "GBP") },
        { accountId: WALLET_B.id, direction: "credit", amount: money(-100, "GBP") },
      ]),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("NON_POSITIVE_AMOUNT");
  });

  it("rejects an empty transaction", () => {
    const result = postTransaction(emptyJournal(), ACCOUNTS, draft([]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("EMPTY_TRANSACTION");
  });
});

describe("append", () => {
  it("returns the same head for the same inputs", () => {
    const lines = [
      {
        id: "e1",
        transactionId: "t1",
        occurredAt: "2026-03-01T09:00:00.000Z",
        accountId: WALLET_A.id,
        direction: "credit" as const,
        amount: money(100, "GBP"),
        reference: "R",
        metadata: {},
      },
    ];
    expect(append(emptyJournal(), lines).head).toBe(append(emptyJournal(), lines).head);
  });
});
