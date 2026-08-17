"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_IDS,
  DEMO_ACCOUNTS,
  demoStatement,
} from "@/lib/ledger/demo";
import {
  balances,
  createLedger,
  failPayout,
  fund,
  initiatePayout,
  requestQuote,
  settlePayout,
  tamperWithEntry,
  transfer,
  transferCrossCurrency,
  trial,
  verifyLedger,
  type LedgerState,
} from "@/lib/ledger/ledger";
import { money } from "@/lib/ledger/money";
import { reconcile, type ReconciliationReport } from "@/lib/ledger/reconcile";
import type { CurrencyCode, LedgerError, Money, Result } from "@/lib/ledger/types";
import type { VerificationResult } from "@/lib/ledger/journal";

/**
 * All the UI state for /ledger.
 *
 * The domain module is pure, so this hook owns the two impure things it needs:
 * the clock and the idempotency-key counter. Note the seed time is a constant,
 * not `Date.now()` — the opening entries must hash identically on the server
 * and on the client or the page would hydrate with a broken chain.
 */

const SEED_MS = Date.parse("2026-03-01T09:00:00.000Z");

export type LogKind = "info" | "success" | "error" | "warn";

export interface LogEntry {
  readonly id: number;
  readonly kind: LogKind;
  readonly title: string;
  readonly body: string;
  /** Repo path for the "read the source" link on this outcome. */
  readonly source?: string;
}

function seed(): LedgerState {
  let state = createLedger(DEMO_ACCOUNTS);

  const openings = [
    {
      accountId: ACCOUNT_IDS.adaWallet,
      treasuryAccountId: ACCOUNT_IDS.treasuryNgn,
      amount: money(2_500_000_00, "NGN"),
      reference: "OPEN/ADA",
      idempotencyKey: "seed-ada",
    },
    {
      accountId: ACCOUNT_IDS.tomWallet,
      treasuryAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(1_250_00, "GBP"),
      reference: "OPEN/TOM",
      idempotencyKey: "seed-tom",
    },
  ];

  for (const opening of openings) {
    const result = fund(state, { ...opening, nowMs: SEED_MS });
    if (result.ok) state = result.value.state;
  }
  return state;
}

export interface Playground {
  readonly state: LedgerState;
  readonly balances: Map<string, Money>;
  readonly trialBalance: ReturnType<typeof trial>;
  readonly log: readonly LogEntry[];
  readonly verification: VerificationResult | null;
  readonly reconciliation: ReconciliationReport | null;
  readonly tampered: boolean;
  readonly busy: string | null;
  /** Sequence numbers posted by the most recent action, for row highlighting. */
  readonly justPosted: readonly number[];

  postTransfer(input: {
    from: string;
    to: string;
    amount: Money;
    reference: string;
  }): void;
  postFunding(input: { accountId: string; amount: Money; reference: string }): void;
  runDemo(demo: DemoId): void;
  runVerification(): void;
  reset(): void;
}

export type DemoId =
  | "double-submit"
  | "overdraw"
  | "tamper"
  | "cross-currency"
  | "payout-fails"
  | "reconcile";

export function usePlayground(): Playground {
  const [state, setState] = useState<LedgerState>(seed);
  const [log, setLog] = useState<readonly LogEntry[]>([
    {
      id: 0,
      kind: "info",
      title: "Ledger opened",
      body: "Two customer wallets funded from treasury. Four entries, two transactions, chain intact.",
      source: "lib/ledger/demo.ts",
    },
  ]);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [tampered, setTampered] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [justPosted, setJustPosted] = useState<readonly number[]>([]);
  const logId = useRef(1);
  const keyCounter = useRef(0);

  const nextKey = useCallback((prefix: string) => {
    keyCounter.current += 1;
    return `${prefix}-${keyCounter.current}`;
  }, []);

  const push = useCallback((entry: Omit<LogEntry, "id">) => {
    const id = logId.current;
    logId.current += 1;
    setLog((current) => [{ ...entry, id }, ...current].slice(0, 40));
  }, []);

  /** Unwraps a command result into state plus a log line. */
  const apply = useCallback(
    <T extends { state: LedgerState; entries: readonly { sequence: number }[] }>(
      result: Result<T>,
      onSuccess: (value: T) => Omit<LogEntry, "id">,
      source: string,
    ): T | null => {
      if (!result.ok) {
        push({
          kind: "error",
          title: errorTitle(result.error),
          body: result.error.message,
          source,
        });
        return null;
      }
      setState(result.value.state);
      setJustPosted(result.value.entries.map((entry) => entry.sequence));
      push(onSuccess(result.value));
      return result.value;
    },
    [push],
  );

  const postTransfer: Playground["postTransfer"] = useCallback(
    ({ from, to, amount, reference }) => {
      const result = transfer(state, {
        fromAccountId: from,
        toAccountId: to,
        amount,
        reference,
        idempotencyKey: nextKey("ui-transfer"),
        nowMs: Date.now(),
      });
      apply(
        result,
        (value) => ({
          kind: "success",
          title: `Posted ${reference}`,
          body: `Two entries appended, sequence ${value.entries[0]?.sequence} and ${value.entries[1]?.sequence}. Balances re-derived by folding the journal.`,
          source: "lib/ledger/journal.ts",
        }),
        "lib/ledger/journal.ts",
      );
    },
    [state, apply, nextKey],
  );

  const postFunding: Playground["postFunding"] = useCallback(
    ({ accountId, amount, reference }) => {
      const account = DEMO_ACCOUNTS.find((candidate) => candidate.id === accountId);
      const treasuryAccountId =
        account?.currency === "NGN" ? ACCOUNT_IDS.treasuryNgn : ACCOUNT_IDS.treasuryGbp;

      const result = fund(state, {
        accountId,
        treasuryAccountId,
        amount,
        reference,
        idempotencyKey: nextKey("ui-fund"),
        nowMs: Date.now(),
      });
      apply(
        result,
        () => ({
          kind: "success",
          title: `Funded ${reference}`,
          body: "Treasury asset and customer liability both rise. The entry balances because they are two sides of the same event.",
          source: "lib/ledger/ledger.ts",
        }),
        "lib/ledger/ledger.ts",
      );
    },
    [state, apply, nextKey],
  );

  const runVerification = useCallback(() => {
    const result = verifyLedger(state);
    setVerification(result);
    push(
      result.ok
        ? {
            kind: "success",
            title: "Integrity verified",
            body: `Recomputed ${result.entriesChecked} ${result.entriesChecked === 1 ? "entry" : "entries"}. Every hash matches its content and every link matches its predecessor.`,
            source: "lib/ledger/journal.ts",
          }
        : {
            kind: "error",
            title: `Integrity check FAILED at entry ${result.failedSequence}`,
            body: `${reasonText(result.reason)} Expected ${result.expected.slice(0, 16)}…, found ${result.actual.slice(0, 16)}…. Everything after this row is now unverifiable.`,
            source: "lib/ledger/signature.ts",
          },
    );
  }, [state, push]);

  const reset = useCallback(() => {
    setState(seed());
    setVerification(null);
    setReconciliation(null);
    setTampered(false);
    setJustPosted([]);
    keyCounter.current = 0;
    logId.current = 1;
    setLog([
      {
        id: 0,
        kind: "info",
        title: "Ledger reset",
        body: "Back to opening positions. The previous journal is gone because this is a demo; a real one would not have a reset button.",
      },
    ]);
  }, []);

  const runDemo = useCallback(
    (demo: DemoId) => {
      setBusy(demo);
      try {
        DEMOS[demo]({
          state,
          setState,
          push,
          nextKey,
          setVerification,
          setReconciliation,
          setTampered,
          setJustPosted,
        });
      } finally {
        setBusy(null);
      }
    },
    [state, push, nextKey],
  );

  const derived = useMemo(() => balances(state), [state]);
  const trialRows = useMemo(() => trial(state), [state]);

  return {
    state,
    balances: derived,
    trialBalance: trialRows,
    log,
    verification,
    reconciliation,
    tampered,
    busy,
    justPosted,
    postTransfer,
    postFunding,
    runDemo,
    runVerification,
    reset,
  };
}

/* ------------------------------------------------------------------------- */

interface DemoContext {
  state: LedgerState;
  setState: (state: LedgerState) => void;
  push: (entry: Omit<LogEntry, "id">) => void;
  nextKey: (prefix: string) => string;
  setVerification: (result: VerificationResult | null) => void;
  setReconciliation: (report: ReconciliationReport | null) => void;
  setTampered: (tampered: boolean) => void;
  setJustPosted: (sequences: readonly number[]) => void;
}

/**
 * The six demos. Each one is a short script against the domain module, and each
 * answers a question an interviewer would otherwise have to ask. CLAUDE.md §6.2.
 */
const DEMOS: Record<DemoId, (context: DemoContext) => void> = {
  "double-submit": ({ state, setState, push, setJustPosted }) => {
    const command = {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: money(120_00, "GBP"),
      reference: "TRF/DOUBLE",
      idempotencyKey: "demo-double-submit",
      nowMs: Date.now(),
    };

    const first = transfer(state, command);
    if (!first.ok) {
      push({ kind: "error", title: "Could not post", body: first.error.message });
      return;
    }

    // Byte-identical resubmission, as a retrying client would send.
    const second = transfer(first.value.state, command);
    if (!second.ok) {
      push({ kind: "error", title: "Unexpected", body: second.error.message });
      return;
    }

    setState(second.value.state);
    setJustPosted(first.value.entries.map((entry) => entry.sequence));

    push({
      kind: "success",
      title: "Submitted twice, posted once",
      body: `First call: created, ${first.value.entries.length} entries appended. Second call with the same key: replayed, 0 entries appended, and the original result returned unchanged. £120.00 left the wallet exactly once.`,
      source: "lib/ledger/idempotency.ts",
    });
    push({
      kind: "info",
      title: "The half everyone forgets",
      body: "The same key carrying a different request is rejected as a conflict rather than replayed — otherwise a retry with a changed amount would silently return the wrong answer.",
      source: "lib/ledger/idempotency.ts",
    });
  },

  overdraw: ({ state, push }) => {
    const current = balances(state).get(ACCOUNT_IDS.tomWallet);
    const attempt = money((current?.amount ?? 0) + 500_00, "GBP");

    const result = transfer(state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      toAccountId: ACCOUNT_IDS.treasuryGbp,
      amount: attempt,
      reference: "TRF/OVERDRAW",
      idempotencyKey: "demo-overdraw",
      nowMs: Date.now(),
    });

    if (result.ok) {
      push({
        kind: "error",
        title: "This should not have happened",
        body: "The overdraft was accepted. That is a bug, and it is exactly the bug the constraint exists to prevent.",
      });
      return;
    }

    push({
      kind: "warn",
      title: "Rejected: insufficient funds",
      body: `${result.error.message} Nothing was written — a rejected transaction is not a partial one.`,
      source: "lib/ledger/journal.ts",
    });
    push({
      kind: "info",
      title: "Enforced at the ledger, not in the form",
      body: "The check runs against the derived balance inside postTransaction, which is the only path into the journal. Disabling the button in the UI would not change this answer.",
      source: "lib/ledger/journal.ts",
    });
  },

  tamper: ({ state, setState, push, setVerification, setTampered }) => {
    const target = state.journal.entries.find(
      (entry) => entry.accountId === ACCOUNT_IDS.tomWallet,
    );
    if (target === undefined) {
      push({ kind: "error", title: "Nothing to tamper with", body: "Post something first." });
      return;
    }

    const inflated = target.amount.amount + 5_000_00;
    const result = tamperWithEntry(state, target.sequence, inflated);
    if (!result.ok) {
      push({ kind: "error", title: "Could not tamper", body: result.error.message });
      return;
    }

    setState(result.value);
    setTampered(true);

    const verification = verifyLedger(result.value);
    setVerification(verification);

    push({
      kind: "warn",
      title: `Entry ${target.sequence} edited in place`,
      body: `Amount raised by £5,000.00 by reaching past the domain and rewriting the row, leaving its stored hash untouched. No exported command can do this.`,
      source: "lib/ledger/ledger.ts",
    });

    if (!verification.ok) {
      push({
        kind: "error",
        title: `Chain broken at entry ${verification.failedSequence}`,
        body: `${reasonText(verification.reason)} The recomputed hash is ${verification.expected.slice(0, 16)}… but the row claims ${verification.actual.slice(0, 16)}…. Every entry after this one is now unverifiable, because each commits to the one before it.`,
        source: "lib/ledger/signature.ts",
      });
    }
  },

  "cross-currency": ({ state, setState, push, nextKey, setJustPosted }) => {
    const quoted = requestQuote(state, {
      sell: money(500_000_00, "NGN"),
      buyCurrency: "GBP",
      nowMs: Date.now(),
    });

    if (!quoted.ok) {
      push({ kind: "error", title: "No rate available", body: quoted.error.message });
      return;
    }

    const { quote } = quoted.value;
    push({
      kind: "info",
      title: `Quote ${quote.id} locked`,
      body: `${quote.display}. Valid for 90 seconds, then it must be re-quoted. The rate is not looked up again at posting time.`,
      source: "lib/ledger/fx.ts",
    });

    const result = transferCrossCurrency(quoted.value.state, {
      fromAccountId: ACCOUNT_IDS.adaWallet,
      toAccountId: ACCOUNT_IDS.tomWallet,
      quoteId: quote.id,
      sellPositionAccountId: ACCOUNT_IDS.fxPositionNgn,
      buyPositionAccountId: ACCOUNT_IDS.fxPositionGbp,
      reference: "FX/LOS-LON",
      idempotencyKey: nextKey("demo-fx"),
      nowMs: Date.now(),
    });

    if (!result.ok) {
      push({ kind: "error", title: errorTitle(result.error), body: result.error.message });
      return;
    }

    setState(result.value.state);
    setJustPosted(result.value.entries.map((entry) => entry.sequence));

    push({
      kind: "success",
      title: "Lagos → London settled",
      body: `Four entries: a naira leg that balances in NGN and a sterling leg that balances in GBP. The two meet at the FX position accounts, so the currency exposure is on the balance sheet rather than hidden inside a conversion.`,
      source: "lib/ledger/ledger.ts",
    });
    push({
      kind: "info",
      title: "The rate is now part of the record",
      body: `Quote id, the integer rate ratio and the time it was quoted are written into the entry metadata. Asking "what rate did this customer get" in six months does not depend on a rate table that has since moved.`,
      source: "lib/ledger/fx.ts",
    });
  },

  "payout-fails": ({ state, setState, push, nextKey, setJustPosted }) => {
    const initiated = initiatePayout(state, {
      fromAccountId: ACCOUNT_IDS.tomWallet,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      amount: money(240_00, "GBP"),
      reference: "PAYOUT/9001",
      idempotencyKey: nextKey("demo-payout"),
      nowMs: Date.now(),
    });

    if (!initiated.ok) {
      push({ kind: "error", title: errorTitle(initiated.error), body: initiated.error.message });
      return;
    }

    push({
      kind: "info",
      title: "Payout initiated · £240.00 in flight",
      body: "Value left the wallet and landed in the clearing account. It has not reached the rail yet, and it is not nowhere — money in flight is money somewhere, and somewhere needs an account.",
      source: "lib/ledger/ledger.ts",
    });

    const failed = failPayout(initiated.value.state, {
      payoutId: initiated.value.payoutId,
      clearingAccountId: ACCOUNT_IDS.payoutClearing,
      railAccountId: ACCOUNT_IDS.railNostro,
      idempotencyKey: nextKey("demo-payout-fail"),
      nowMs: Date.now() + 1,
      reason: "Rail rejected the transfer: beneficiary account closed.",
    });

    if (!failed.ok) {
      push({ kind: "error", title: errorTitle(failed.error), body: failed.error.message });
      return;
    }

    setState(failed.value.state);
    setJustPosted(failed.value.entries.map((entry) => entry.sequence));

    push({
      kind: "success",
      title: "Rail rejected it · reversed by compensation",
      body: "A new transaction returns the value to the wallet. The initiating entries were not deleted or edited — both the attempt and the reversal are on the record, which is the only way to answer a chargeback later.",
      source: "lib/ledger/ledger.ts",
    });
  },

  reconcile: ({ state, setState, push, nextKey, setReconciliation }) => {
    let working = state;

    // Three payouts settle to the rail. The statement will disagree with two of
    // them and will contain two movements we have no record of at all.
    const payouts = [
      { amount: money(320_00, "GBP"), reference: "PAYOUT/8814" },
      { amount: money(75_00, "GBP"), reference: "PAYOUT/8815" },
      { amount: money(60_00, "GBP"), reference: "PAYOUT/8817" },
    ];

    for (const payout of payouts) {
      const initiated = initiatePayout(working, {
        fromAccountId: ACCOUNT_IDS.tomWallet,
        clearingAccountId: ACCOUNT_IDS.payoutClearing,
        amount: payout.amount,
        reference: payout.reference,
        idempotencyKey: nextKey("recon-init"),
        nowMs: Date.now(),
      });
      if (!initiated.ok) {
        push({
          kind: "error",
          title: errorTitle(initiated.error),
          body: `${initiated.error.message} Fund Tom's wallet and run this again.`,
        });
        return;
      }

      const settled = settlePayout(initiated.value.state, {
        payoutId: initiated.value.payoutId,
        clearingAccountId: ACCOUNT_IDS.payoutClearing,
        railAccountId: ACCOUNT_IDS.railNostro,
        idempotencyKey: nextKey("recon-settle"),
        nowMs: Date.now() + 1,
      });
      if (!settled.ok) {
        push({ kind: "error", title: errorTitle(settled.error), body: settled.error.message });
        return;
      }
      working = settled.value.state;
    }

    setState(working);

    const report = reconcile(
      working.journal,
      demoStatement(new Date().toISOString()),
      ACCOUNT_IDS.railNostro,
    );
    setReconciliation(report);

    push({
      kind: report.clean ? "success" : "warn",
      title: `End of day: ${report.matched} matched, ${report.breaks} ${report.breaks === 1 ? "break" : "breaks"}`,
      body: "The rail's statement against our journal, matched on reference. Breaks are separated into drift, movements they made that we never recorded, and payouts we recorded that never left — three different problems that one 'unmatched' figure would hide.",
      source: "lib/ledger/reconcile.ts",
    });
  },
};

function errorTitle(error: LedgerError): string {
  const titles: Partial<Record<LedgerError["code"], string>> = {
    INSUFFICIENT_FUNDS: "Rejected: insufficient funds",
    IDEMPOTENCY_CONFLICT: "Rejected: idempotency conflict",
    QUOTE_EXPIRED: "Rejected: quote expired",
    QUOTE_ALREADY_USED: "Rejected: quote already executed",
    UNBALANCED: "Rejected: debits do not equal credits",
    CURRENCY_MISMATCH: "Rejected: currency mismatch",
    NON_POSITIVE_AMOUNT: "Rejected: amount must be positive",
    UNKNOWN_ACCOUNT: "Rejected: unknown account",
    INVALID_STATE: "Rejected: invalid state transition",
  };
  return titles[error.code] ?? `Rejected: ${error.code}`;
}

function reasonText(reason: "content-hash" | "broken-link" | "sequence-gap"): string {
  switch (reason) {
    case "content-hash":
      return "The row's content no longer hashes to the signature stored on it.";
    case "broken-link":
      return "This row does not point at the hash of the row before it.";
    case "sequence-gap":
      return "The sequence is not contiguous — an entry has been removed.";
  }
}

export { ACCOUNT_IDS, DEMO_ACCOUNTS, SEED_MS };
export type { CurrencyCode };
