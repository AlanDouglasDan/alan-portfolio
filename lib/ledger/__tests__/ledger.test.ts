/**
 * Invariant 4 (the same idempotency key never produces two distinct outcomes)
 * plus the behaviour behind each demo button on /ledger. If a demo on the page
 * claims something, it is asserted here.
 */

import { beforeEach, describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  balanceOf,
  createLedger,
  failPayout,
  fund,
  initiatePayout,
  requestQuote,
  settlePayout,
  tamperWithEntry,
  transfer,
  transferCrossCurrency,
  verifyLedger,
  type LedgerState,
} from "../ledger";
import { ACCOUNT_IDS, DEMO_ACCOUNTS } from "../demo";
import { money } from "../money";
import { QUOTE_TTL_MS } from "../fx";
import { trialBalance } from "../journal";

const T0 = Date.parse("2026-03-01T09:00:00.000Z");

function seeded(): LedgerState {
  let state = createLedger(DEMO_ACCOUNTS);

  const ada = fund(state, {
    accountId: ACCOUNT_IDS.adaWallet,
    treasuryAccountId: ACCOUNT_IDS.treasuryNgn,
    amount: money(2_500_000_00, "NGN"),
    reference: "OPEN/ADA",
    idempotencyKey: "seed-ada",
    nowMs: T0,
  });
  if (!ada.ok) throw new Error(ada.error.message);
  state = ada.value.state;

  const tom = fund(state, {
    accountId: ACCOUNT_IDS.tomWallet,
    treasuryAccountId: ACCOUNT_IDS.treasuryGbp,
    amount: money(1_250_00, "GBP"),
    reference: "OPEN/TOM",
    idempotencyKey: "seed-tom",
    nowMs: T0,
  });
  if (!tom.ok) throw new Error(tom.error.message);
  return tom.value.state;
}

let state: LedgerState;
beforeEach(() => {
  state = seeded();
});

describe("invariant 4: one idempotency key, one outcome", () => {
  it("replays the original result and posts nothing new", () => {
    const command = {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(500_00, "GBP"),
      reference: "TRF/1",
      idempotencyKey: "client-key-1",
      nowMs: T0 + 1000,
    };

    const first = transfer(state, command);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = transfer(first.value.state, command);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(first.value.outcome).toBe("created");
    expect(second.value.outcome).toBe("replayed");
    expect(second.value.entries).toHaveLength(0);
    expect(second.value.posted).toEqual(first.value.posted);
    // The decisive assertion: the journal did not grow.
    expect(second.value.state.journal.entries.length).toBe(
      first.value.state.journal.entries.length,
    );
    // And the money moved exactly once.
    expect(balanceOf(second.value.state, ACCOUNT_IDS.tomWallet)).toEqual(
      money(750_00, "GBP"),
    );
  });

  it("holds for any number of resubmissions", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 12 }), (attempts) => {
        let current = seeded();
        const command = {
          fromAccountId: ACCOUNT_IDS.tomWallet,
          toAccountId: ACCOUNT_IDS.treasuryGbp,
          amount: money(100_00, "GBP"),
          reference: "TRF/N",
          idempotencyKey: "same-key",
          nowMs: T0 + 1000,
        };

        for (let i = 0; i < attempts; i += 1) {
          const result = transfer(current, command);
          expect(result.ok).toBe(true);
          if (result.ok) current = result.value.state;
        }

        expect(balanceOf(current, ACCOUNT_IDS.tomWallet)).toEqual(money(1_150_00, "GBP"));
      }),
    );
  });

  it("rejects a reused key carrying a different request", () => {
    const first = transfer(state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(500_00, "GBP"),
      reference: "TRF/1",
      idempotencyKey: "client-key-1",
      nowMs: T0 + 1000,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // Same key, different amount. Replaying here would return the wrong
    // result; posting would double-spend. So it is neither.
    const conflicting = transfer(first.value.state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(900_00, "GBP"),
      reference: "TRF/1",
      idempotencyKey: "client-key-1",
      nowMs: T0 + 2000,
    });

    expect(conflicting.ok).toBe(false);
    if (!conflicting.ok) expect(conflicting.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });
});

describe("overdraft is enforced at the ledger boundary", () => {
  it("refuses a transfer larger than the derived balance", () => {
    const result = transfer(state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(1_250_01, "GBP"),
      reference: "TRF/OVER",
      idempotencyKey: "over-1",
      nowMs: T0 + 1000,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(balanceOf(state, ACCOUNT_IDS.tomWallet)).toEqual(money(1_250_00, "GBP"));
  });

  it("permits a transfer of exactly the balance", () => {
    const result = transfer(state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(1_250_00, "GBP"),
      reference: "TRF/ALL",
      idempotencyKey: "all-1",
      nowMs: T0 + 1000,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(balanceOf(result.value.state, ACCOUNT_IDS.tomWallet)).toEqual(
        money(0, "GBP"),
      );
    }
  });
});

describe("cross-currency transfer", () => {
  it("locks the rate, records it on the entry, and balances both legs", () => {
    const quoted = requestQuote(state, {
      sell: money(100_000_00, "NGN"),
      buyCurrency: "GBP",
      nowMs: T0,
    });
    expect(quoted.ok).toBe(true);
    if (!quoted.ok) return;

    const result = transferCrossCurrency(quoted.value.state, {
      fromAccountId: ACCOUNT_IDS.adaWallet,
      toAccountId: ACCOUNT_IDS.tomWallet,
      quoteId: quoted.value.quote.id,
      sellPositionAccountId: ACCOUNT_IDS.fxPositionNgn,
      buyPositionAccountId: ACCOUNT_IDS.fxPositionGbp,
      reference: "FX/1",
      idempotencyKey: "fx-1",
      nowMs: T0 + 5_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    for (const row of trialBalance(result.value.state.journal)) {
      expect(row.balanced).toBe(true);
    }

    const entry = result.value.entries[0];
    expect(entry?.metadata.fxQuoteId).toBe(quoted.value.quote.id);
    expect(entry?.metadata.fxPair).toBe("NGNGBP");
    // The rate is stored as the integer ratio that was actually applied.
    expect(entry?.metadata.fxRate).toBe("5/9877");
  });

  it("refuses an expired quote rather than re-deriving the rate", () => {
    const quoted = requestQuote(state, {
      sell: money(100_000_00, "NGN"),
      buyCurrency: "GBP",
      nowMs: T0,
    });
    if (!quoted.ok) return;

    const result = transferCrossCurrency(quoted.value.state, {
      fromAccountId: ACCOUNT_IDS.adaWallet,
      toAccountId: ACCOUNT_IDS.tomWallet,
      quoteId: quoted.value.quote.id,
      sellPositionAccountId: ACCOUNT_IDS.fxPositionNgn,
      buyPositionAccountId: ACCOUNT_IDS.fxPositionGbp,
      reference: "FX/1",
      idempotencyKey: "fx-1",
      nowMs: T0 + QUOTE_TTL_MS + 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("QUOTE_EXPIRED");
  });

  it("will not execute the same quote twice", () => {
    const quoted = requestQuote(state, {
      sell: money(100_000_00, "NGN"),
      buyCurrency: "GBP",
      nowMs: T0,
    });
    if (!quoted.ok) return;

    const command = {
      fromAccountId: ACCOUNT_IDS.adaWallet,
      toAccountId: ACCOUNT_IDS.tomWallet,
      quoteId: quoted.value.quote.id,
      sellPositionAccountId: ACCOUNT_IDS.fxPositionNgn,
      buyPositionAccountId: ACCOUNT_IDS.fxPositionGbp,
      reference: "FX/1",
      nowMs: T0 + 5_000,
    };

    const first = transferCrossCurrency(quoted.value.state, {
      ...command,
      idempotencyKey: "fx-1",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    // A different key this time, so idempotency is not what stops it.
    const second = transferCrossCurrency(first.value.state, {
      ...command,
      idempotencyKey: "fx-2",
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error.code).toBe("QUOTE_ALREADY_USED");
  });
});

describe("payout lifecycle", () => {
  function initiate(from: LedgerState) {
    return initiatePayout(from, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      amount: money(320_00, "GBP"),
      reference: "PAYOUT/8814",
      idempotencyKey: "po-1",
      nowMs: T0 + 1_000,
    });
  }

  it("moves value into clearing while in flight", () => {
    const result = initiate(state);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(balanceOf(result.value.state, ACCOUNT_IDS.tomWallet)).toEqual(
      money(930_00, "GBP"),
    );
    expect(balanceOf(result.value.state, ACCOUNT_IDS.payoutClearing)).toEqual(
      money(320_00, "GBP"),
    );
    expect(result.value.state.payouts[0]?.status).toBe("pending");
  });

  it("settles out of clearing to the rail", () => {
    const initiated = initiate(state);
    if (!initiated.ok) return;

    const settled = settlePayout(initiated.value.state, {
      payoutId: initiated.value.payoutId,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      railAccountId: ACCOUNT_IDS.railNostro,
      idempotencyKey: "po-1-settle",
      nowMs: T0 + 2_000,
    });

    expect(settled.ok).toBe(true);
    if (!settled.ok) return;
    expect(balanceOf(settled.value.state, ACCOUNT_IDS.payoutClearing)).toEqual(
      money(0, "GBP"),
    );
    expect(settled.value.state.payouts[0]?.status).toBe("settled");
  });

  it("reverses a failure by compensating, never by deleting", () => {
    const initiated = initiate(state);
    if (!initiated.ok) return;
    const entriesAfterInitiate = initiated.value.state.journal.entries.length;

    const failed = failPayout(initiated.value.state, {
      payoutId: initiated.value.payoutId,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      railAccountId: ACCOUNT_IDS.railNostro,
      idempotencyKey: "po-1-fail",
      nowMs: T0 + 3_000,
      reason: "Beneficiary account closed",
    });

    expect(failed.ok).toBe(true);
    if (!failed.ok) return;

    // The customer is whole again...
    expect(balanceOf(failed.value.state, ACCOUNT_IDS.tomWallet)).toEqual(
      money(1_250_00, "GBP"),
    );
    expect(balanceOf(failed.value.state, ACCOUNT_IDS.payoutClearing)).toEqual(
      money(0, "GBP"),
    );
    // ...and the failed attempt is still on the record.
    expect(failed.value.state.journal.entries.length).toBe(entriesAfterInitiate + 2);
    expect(failed.value.state.payouts[0]?.status).toBe("failed");
    expect(failed.value.entries[0]?.metadata.compensates).toBeDefined();
    expect(verifyLedger(failed.value.state).ok).toBe(true);
  });

  it("will not resolve a payout twice", () => {
    const initiated = initiate(state);
    if (!initiated.ok) return;

    const settled = settlePayout(initiated.value.state, {
      payoutId: initiated.value.payoutId,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      railAccountId: ACCOUNT_IDS.railNostro,
      idempotencyKey: "po-1-settle",
      nowMs: T0 + 2_000,
    });
    if (!settled.ok) return;

    const again = failPayout(settled.value.state, {
      payoutId: initiated.value.payoutId,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      railAccountId: ACCOUNT_IDS.railNostro,
      idempotencyKey: "po-1-fail",
      nowMs: T0 + 4_000,
    });

    expect(again.ok).toBe(false);
    if (!again.ok) expect(again.error.code).toBe("INVALID_STATE");
  });
});

describe("tampering", () => {
  it("is caught, and the exact row is named", () => {
    const tampered = tamperWithEntry(state, 2, 9_999_999_00);
    expect(tampered.ok).toBe(true);
    if (!tampered.ok) return;

    const result = verifyLedger(tampered.value);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failedSequence).toBe(2);
      expect(result.reason).toBe("content-hash");
    }
  });

  it("a clean ledger verifies after every supported command", () => {
    expect(verifyLedger(state).ok).toBe(true);
  });
});
