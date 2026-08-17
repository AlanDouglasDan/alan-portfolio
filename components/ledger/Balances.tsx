"use client";

import { Odometer } from "@/components/motion/Odometer";
import { Figure } from "@/components/primitives/Figure";
import { Button } from "@/components/primitives/Button";
import { CURRENCIES } from "@/lib/ledger/types";
import { toWords } from "@/lib/ledger/money";
import type { Account, Money } from "@/lib/ledger/types";
import type { TrialBalanceRow, VerificationResult } from "@/lib/ledger/journal";

export interface BalancesProps {
  accounts: readonly Account[];
  balances: Map<string, Money>;
  trialBalance: readonly TrialBalanceRow[];
  verification: VerificationResult | null;
  onVerify: () => void;
}

/**
 * The derived-state pane.
 *
 * Nothing here is stored. Every figure is a fold over the journal, recomputed
 * on each render — which is why the odometers roll the moment an entry posts.
 */
export function Balances({
  accounts,
  balances,
  trialBalance,
  verification,
  onVerify,
}: BalancesProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-rule px-4 py-3">
        <h2 className="font-display text-display-m text-ink">Derived state</h2>
        <p className="label mt-1 text-ink-faint">Folded from the journal · never stored</p>
      </header>

      <div
        className="scroll-both min-h-0 min-w-0 flex-1"
        aria-live="polite"
        aria-label="Account balances"
      >
        <ul>
          {accounts.map((account) => {
            const balance = balances.get(account.id);
            if (balance === undefined) return null;
            const exponent = CURRENCIES[account.currency].exponent;

            return (
              // Stacked rather than name-and-figure on one line: a naira
              // balance is fourteen characters wide and an account name wraps
              // to two lines, so side by side they collided in this pane.
              <li key={account.id} className="border-b border-rule/60 px-4 py-3">
                <p className="font-sans text-body-s text-ink">{account.name}</p>
                <p
                  className={`mt-1 text-body-l ${
                    balance.amount < 0 ? "text-debit" : "text-ink"
                  }`}
                >
                  <Odometer
                    value={Math.abs(balance.amount)}
                    decimals={exponent}
                    prefix={`${balance.amount < 0 ? "−" : ""}${CURRENCIES[account.currency].symbol}`}
                    label={toWords(balance)}
                    duration={0.9}
                  />
                </p>
                <p className="label mt-1.5 text-ink-faint">
                  {account.type} · {account.currency}
                  {account.allowsNegativeBalance ? "" : " · no overdraft"}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="border-t border-rule px-4 py-3">
        <h3 className="label mb-2 text-ink-faint">Trial balance</h3>
        {trialBalance.length === 0 ? (
          <p className="text-body-s text-ink-faint">Nothing posted.</p>
        ) : (
          <ul className="space-y-2">
            {trialBalance.map((row) => (
              <li key={row.currency}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="label text-ink-soft">{row.currency}</span>
                  <span
                    className={`label ${row.balanced ? "text-credit" : "text-debit"}`}
                  >
                    {row.balanced ? "balanced" : "BROKEN"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5 text-body-s">
                  <Figure tone="debit" label={`${row.debits} minor units debited`}>
                    {row.debits.toLocaleString("en-GB")}
                  </Figure>
                  <span className="text-ink-faint" aria-hidden="true">
                    /
                  </span>
                  <Figure tone="credit" label={`${row.credits} minor units credited`}>
                    {row.credits.toLocaleString("en-GB")}
                  </Figure>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Button
          variant={
            verification === null ? "secondary" : verification.ok ? "secondary" : "danger"
          }
          size="sm"
          onClick={onVerify}
          className="mt-3 w-full"
        >
          Verify integrity
        </Button>

        {verification === null ? null : (
          <p
            className={`mt-2 text-body-s ${
              verification.ok ? "text-credit" : "text-debit"
            }`}
          >
            {verification.ok ? (
              <>
                Chain intact across{" "}
                <Figure tone="credit" label={`${verification.entriesChecked} entries`}>
                  {verification.entriesChecked}
                </Figure>{" "}
                entries.
              </>
            ) : (
              <>
                Failed at entry{" "}
                <Figure tone="debit" label={`entry ${verification.failedSequence}`}>
                  {verification.failedSequence}
                </Figure>
                . {verification.reason.replace("-", " ")}.
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
