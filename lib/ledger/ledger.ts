/**
 * The application layer over the journal.
 *
 * Everything here is a pure function of (state, command) -> Result<state>. No
 * clock, no randomness, no I/O: the caller passes `nowMs` in with the command,
 * and identifiers come from a counter held in state. That is what lets the
 * playground replay a scenario and the tests assert on exact hashes.
 *
 * Every money-moving command takes an idempotency key. Not "should"; takes.
 * There is no overload without one.
 */

import {
  assertQuoteUsable,
  issueQuote,
  rateMetadata,
  type Quote,
} from "./fx";
import {
  checkKey,
  emptyStore,
  fingerprintTransaction,
  remember,
  type IdempotencyOutcome,
  type IdempotencyStore,
} from "./idempotency";
import { money, negate } from "./money";
import {
  emptyJournal,
  fold,
  foldAll,
  postTransaction,
  trialBalance,
  verify,
  type TrialBalanceRow,
  type VerificationResult,
} from "./journal";
import {
  type Account,
  type CurrencyCode,
  type DraftLine,
  type DraftTransaction,
  type Entry,
  type Journal,
  type Money,
  type Result,
  err,
  ok,
} from "./types";

export type PayoutStatus = "pending" | "settled" | "failed";

export interface Payout {
  readonly id: string;
  readonly transactionId: string;
  readonly accountId: string;
  readonly amount: Money;
  readonly reference: string;
  readonly status: PayoutStatus;
  readonly initiatedAt: string;
  readonly resolvedAt: string | null;
  readonly failureReason: string | null;
}

/** What a completed command returns, and what a replay hands back unchanged. */
export interface PostedTransaction {
  readonly transactionId: string;
  readonly reference: string;
  readonly entryIds: readonly string[];
  readonly postedAt: string;
}

export interface LedgerState {
  readonly accounts: readonly Account[];
  readonly journal: Journal;
  readonly idempotency: IdempotencyStore<PostedTransaction>;
  readonly quotes: readonly Quote[];
  readonly usedQuoteIds: readonly string[];
  readonly payouts: readonly Payout[];
  /** Monotonic id counter. Keeps identifiers deterministic. */
  readonly counter: number;
}

export interface CommandResult {
  readonly state: LedgerState;
  readonly outcome: IdempotencyOutcome;
  readonly posted: PostedTransaction;
  /** Empty on a replay: a replay posts nothing. */
  readonly entries: readonly Entry[];
}

export function createLedger(accounts: readonly Account[]): LedgerState {
  return {
    accounts,
    journal: emptyJournal(),
    idempotency: emptyStore<PostedTransaction>(),
    quotes: [],
    usedQuoteIds: [],
    payouts: [],
    counter: 0,
  };
}

export function accountById(
  state: LedgerState,
  id: string,
): Account | undefined {
  return state.accounts.find((account) => account.id === id);
}

export function balances(state: LedgerState): Map<string, Money> {
  return foldAll(state.journal, state.accounts);
}

export function balanceOf(state: LedgerState, accountId: string): Money | null {
  const account = accountById(state, accountId);
  return account === undefined ? null : fold(state.journal, account);
}

export function trial(state: LedgerState): TrialBalanceRow[] {
  return trialBalance(state.journal);
}

export function verifyLedger(state: LedgerState): VerificationResult {
  return verify(state.journal);
}

/* -------------------------------------------------------------------------
   Command plumbing
   ------------------------------------------------------------------------- */

interface CommandEnvelope {
  readonly idempotencyKey: string;
  readonly nowMs: number;
}

/**
 * The single path into the journal. Fingerprints the request, replays on a
 * matching key, rejects on a conflicting one, and otherwise posts and
 * remembers. Every command below funnels through here, which is the only
 * reason the idempotency guarantee is worth anything.
 */
function execute(
  state: LedgerState,
  envelope: CommandEnvelope,
  buildDraft: (transactionId: string) => Result<DraftTransaction>,
): Result<CommandResult> {
  const transactionId = `txn_${(state.counter + 1).toString().padStart(4, "0")}`;

  const draftResult = buildDraft(transactionId);
  if (!draftResult.ok) return draftResult;
  const draft = draftResult.value;

  const fingerprint = fingerprintTransaction(draft);
  const lookup = checkKey(state.idempotency, envelope.idempotencyKey, fingerprint);
  if (!lookup.ok) return lookup;

  if (lookup.value !== null) {
    return ok({
      state,
      outcome: "replayed",
      posted: lookup.value.result,
      entries: [],
    });
  }

  const postResult = postTransaction(state.journal, state.accounts, draft);
  if (!postResult.ok) return postResult;

  const { journal, entries } = postResult.value;
  const posted: PostedTransaction = {
    transactionId,
    reference: draft.reference,
    entryIds: entries.map((entry) => entry.id),
    postedAt: draft.occurredAt,
  };

  return ok({
    state: {
      ...state,
      journal,
      counter: state.counter + 1,
      idempotency: remember(
        state.idempotency,
        envelope.idempotencyKey,
        fingerprint,
        posted,
        draft.occurredAt,
      ),
    },
    outcome: "created",
    posted,
    entries,
  });
}

/* -------------------------------------------------------------------------
   Commands
   ------------------------------------------------------------------------- */

export interface FundCommand extends CommandEnvelope {
  readonly accountId: string;
  readonly treasuryAccountId: string;
  readonly amount: Money;
  readonly reference: string;
}

/**
 * Cash in. The platform's asset position rises and so does what it owes the
 * customer, which is why both legs are increases and the entry still balances.
 */
export function fund(
  state: LedgerState,
  command: FundCommand,
): Result<CommandResult> {
  return execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      reference: command.reference,
      occurredAt: new Date(command.nowMs).toISOString(),
      lines: [
        { accountId: command.treasuryAccountId, direction: "debit", amount: command.amount },
        { accountId: command.accountId, direction: "credit", amount: command.amount },
      ],
      metadata: { kind: "funding" },
    }),
  );
}

export interface TransferCommand extends CommandEnvelope {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly amount: Money;
  readonly reference: string;
}

/** Same-currency transfer between two wallets. */
export function transfer(
  state: LedgerState,
  command: TransferCommand,
): Result<CommandResult> {
  return execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      reference: command.reference,
      occurredAt: new Date(command.nowMs).toISOString(),
      lines: [
        { accountId: command.fromAccountId, direction: "debit", amount: command.amount },
        { accountId: command.toAccountId, direction: "credit", amount: command.amount },
      ],
      metadata: { kind: "transfer" },
    }),
  );
}

export interface QuoteCommand {
  readonly sell: Money;
  readonly buyCurrency: CurrencyCode;
  readonly nowMs: number;
}

export function requestQuote(
  state: LedgerState,
  command: QuoteCommand,
): Result<{ state: LedgerState; quote: Quote }> {
  const id = `fxq_${(state.counter + 1).toString().padStart(4, "0")}`;
  const quoteResult = issueQuote(id, command.sell, command.buyCurrency, command.nowMs);
  if (!quoteResult.ok) return quoteResult;

  return ok({
    state: {
      ...state,
      counter: state.counter + 1,
      quotes: [...state.quotes, quoteResult.value],
    },
    quote: quoteResult.value,
  });
}

export interface CrossCurrencyCommand extends CommandEnvelope {
  readonly fromAccountId: string;
  readonly toAccountId: string;
  readonly quoteId: string;
  readonly sellPositionAccountId: string;
  readonly buyPositionAccountId: string;
  readonly reference: string;
}

/**
 * Cross-currency transfer.
 *
 * Two legs, one per currency, each balancing on its own. The FX position
 * accounts are where the two currencies meet: the platform is short NGN and
 * long GBP by exactly the quoted amounts, and that exposure is visible on the
 * balance sheet rather than hidden inside a conversion.
 *
 * The rate is taken from the locked quote and written into the entry metadata.
 * It is never looked up again.
 */
export function transferCrossCurrency(
  state: LedgerState,
  command: CrossCurrencyCommand,
): Result<CommandResult> {
  const quote = state.quotes.find((candidate) => candidate.id === command.quoteId);
  if (quote === undefined) {
    return err("QUOTE_NOT_FOUND", `No quote with id "${command.quoteId}".`, {
      quoteId: command.quoteId,
    });
  }

  const usable = assertQuoteUsable(
    quote,
    command.nowMs,
    state.usedQuoteIds.includes(quote.id),
  );
  if (!usable.ok) return usable;

  const result = execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      reference: command.reference,
      occurredAt: new Date(command.nowMs).toISOString(),
      lines: [
        // Sell leg, balances in the source currency.
        { accountId: command.fromAccountId, direction: "debit", amount: quote.sell },
        { accountId: command.sellPositionAccountId, direction: "credit", amount: quote.sell },
        // Buy leg, balances in the destination currency.
        { accountId: command.buyPositionAccountId, direction: "debit", amount: quote.buy },
        { accountId: command.toAccountId, direction: "credit", amount: quote.buy },
      ],
      metadata: { kind: "fx-transfer", ...rateMetadata(quote) },
    }),
  );

  if (!result.ok) return result;
  if (result.value.outcome === "replayed") return result;

  return ok({
    ...result.value,
    state: {
      ...result.value.state,
      usedQuoteIds: [...result.value.state.usedQuoteIds, quote.id],
    },
  });
}

export interface PayoutCommand extends CommandEnvelope {
  readonly fromAccountId: string;
  readonly clearingAccountId: string;
  readonly amount: Money;
  readonly reference: string;
}

/**
 * Initiate an outbound payout. The customer's balance drops immediately and the
 * value sits in a clearing account until the rail confirms. Money in flight is
 * money that is somewhere, and "somewhere" needs an account.
 */
export function initiatePayout(
  state: LedgerState,
  command: PayoutCommand,
): Result<CommandResult & { payoutId: string }> {
  const payoutId = `po_${(state.counter + 1).toString().padStart(4, "0")}`;
  const occurredAt = new Date(command.nowMs).toISOString();

  const result = execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      reference: command.reference,
      occurredAt,
      lines: [
        { accountId: command.fromAccountId, direction: "debit", amount: command.amount },
        { accountId: command.clearingAccountId, direction: "credit", amount: command.amount },
      ],
      metadata: { kind: "payout-initiated", payoutId },
    }),
  );

  if (!result.ok) return result;
  if (result.value.outcome === "replayed") {
    const existing = state.payouts.find(
      (payout) => payout.transactionId === result.value.posted.transactionId,
    );
    return ok({ ...result.value, payoutId: existing?.id ?? payoutId });
  }

  const payout: Payout = {
    id: payoutId,
    transactionId: result.value.posted.transactionId,
    accountId: command.fromAccountId,
    amount: command.amount,
    reference: command.reference,
    status: "pending",
    initiatedAt: occurredAt,
    resolvedAt: null,
    failureReason: null,
  };

  return ok({
    ...result.value,
    payoutId,
    state: {
      ...result.value.state,
      payouts: [...result.value.state.payouts, payout],
    },
  });
}

export interface ResolvePayoutCommand extends CommandEnvelope {
  readonly payoutId: string;
  readonly clearingAccountId: string;
  readonly railAccountId: string;
  readonly reason?: string;
}

export function settlePayout(
  state: LedgerState,
  command: ResolvePayoutCommand,
): Result<CommandResult> {
  const payout = state.payouts.find((candidate) => candidate.id === command.payoutId);
  if (payout === undefined) {
    return err("TRANSFER_NOT_FOUND", `No payout with id "${command.payoutId}".`);
  }
  if (payout.status !== "pending") {
    return err(
      "INVALID_STATE",
      `Payout ${payout.id} is already ${payout.status} and cannot be settled again.`,
      { payoutId: payout.id, status: payout.status },
    );
  }

  const occurredAt = new Date(command.nowMs).toISOString();
  const result = execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      // The rail's statement will show the original payment reference, so the
      // entry that lands on the nostro account carries it unchanged. This is
      // the field reconciliation matches on; decorating it here would break
      // every match.
      reference: payout.reference,
      occurredAt,
      lines: [
        { accountId: command.clearingAccountId, direction: "debit", amount: payout.amount },
        { accountId: command.railAccountId, direction: "credit", amount: payout.amount },
      ],
      metadata: { kind: "payout-settled", payoutId: payout.id },
    }),
  );

  if (!result.ok) return result;
  return ok({
    ...result.value,
    state: updatePayout(result.value.state, payout.id, {
      status: "settled",
      resolvedAt: occurredAt,
    }),
  });
}

/**
 * The rail rejected the payout.
 *
 * This posts a *compensating* transaction that returns the value to the
 * customer. It does not delete or edit the initiating entry. Both events
 * remain in the record, because "this payout was attempted and failed" is a
 * fact, and a ledger that erases attempts cannot answer a chargeback.
 */
export function failPayout(
  state: LedgerState,
  command: ResolvePayoutCommand,
): Result<CommandResult> {
  const payout = state.payouts.find((candidate) => candidate.id === command.payoutId);
  if (payout === undefined) {
    return err("TRANSFER_NOT_FOUND", `No payout with id "${command.payoutId}".`);
  }
  if (payout.status !== "pending") {
    return err(
      "INVALID_STATE",
      `Payout ${payout.id} is already ${payout.status}.`,
      { payoutId: payout.id, status: payout.status },
    );
  }

  const occurredAt = new Date(command.nowMs).toISOString();
  const reason = command.reason ?? "Rail rejected the transfer: beneficiary account closed.";

  const result = execute(state, command, (transactionId) =>
    ok({
      id: transactionId,
      reference: `${payout.reference}/reversed`,
      occurredAt,
      lines: [
        { accountId: command.clearingAccountId, direction: "debit", amount: payout.amount },
        { accountId: payout.accountId, direction: "credit", amount: payout.amount },
      ],
      metadata: {
        kind: "payout-reversed",
        payoutId: payout.id,
        compensates: payout.transactionId,
        reason,
      },
    }),
  );

  if (!result.ok) return result;
  return ok({
    ...result.value,
    state: updatePayout(result.value.state, payout.id, {
      status: "failed",
      resolvedAt: occurredAt,
      failureReason: reason,
    }),
  });
}

function updatePayout(
  state: LedgerState,
  payoutId: string,
  patch: Partial<Payout>,
): LedgerState {
  return {
    ...state,
    payouts: state.payouts.map((payout) =>
      payout.id === payoutId ? { ...payout, ...patch } : payout,
    ),
  };
}

/* -------------------------------------------------------------------------
   Dev-mode tampering
   ------------------------------------------------------------------------- */

/**
 * Reach past the domain and rewrite an entry in place, leaving its stored hash
 * untouched. There is no legitimate use for this; it exists so the playground
 * can demonstrate that `verify()` catches it and names the row.
 *
 * Note what it takes to do this: reconstructing the journal object by hand.
 * No exported command can produce this state, which is the point.
 */
export function tamperWithEntry(
  state: LedgerState,
  sequence: number,
  newAmountMinorUnits: number,
): Result<LedgerState> {
  const index = state.journal.entries.findIndex(
    (entry) => entry.sequence === sequence,
  );
  const target = state.journal.entries[index];
  if (target === undefined) {
    return err("INVALID_STATE", `No entry at sequence ${sequence}.`);
  }

  const entries = [...state.journal.entries];
  entries[index] = {
    ...target,
    amount: money(newAmountMinorUnits, target.amount.currency),
    // hash and previousHash deliberately left as they were.
  };

  return ok({
    ...state,
    journal: { entries, head: state.journal.head },
  });
}

export { negate, type DraftLine };
