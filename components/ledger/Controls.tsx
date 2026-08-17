"use client";

import { useId, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { parseAmount } from "@/lib/ledger/money";
import { CURRENCIES } from "@/lib/ledger/types";
import type { Account, Money } from "@/lib/ledger/types";

export interface ControlsProps {
  accounts: readonly Account[];
  onTransfer: (input: { from: string; to: string; amount: Money; reference: string }) => void;
  onFund: (input: { accountId: string; amount: Money; reference: string }) => void;
}

/**
 * The manual controls.
 *
 * Amount input is parsed by `parseAmount` in the domain module, which is
 * string-based on purpose: `Number("14.50") * 100` is the exact place a float
 * would otherwise enter a financial system.
 */
export function Controls({ accounts, onTransfer, onFund }: ControlsProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-rule px-4 py-3">
        <h2 className="font-display text-display-m text-ink">Controls</h2>
        <p className="label mt-1 text-ink-faint">Post your own entries</p>
      </header>

      <div className="scroll-both min-h-0 min-w-0 flex-1">
        <TransferForm accounts={accounts} onTransfer={onTransfer} />
        <FundForm accounts={accounts} onFund={onFund} />
      </div>
    </div>
  );
}

function TransferForm({
  accounts,
  onTransfer,
}: {
  accounts: readonly Account[];
  onTransfer: ControlsProps["onTransfer"];
}) {
  const id = useId();
  const [from, setFrom] = useState("cust:tom");
  const [to, setTo] = useState("treasury:gbp");
  const [amount, setAmount] = useState("50.00");
  const [reference, setReference] = useState("TRF/0001");
  const [error, setError] = useState<string | null>(null);

  const fromAccount = accounts.find((account) => account.id === from);
  const currency = fromAccount?.currency ?? "GBP";
  const compatible = accounts.filter((account) => account.currency === currency);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount, currency);
    if (parsed === null || parsed.amount <= 0) {
      setError(
        `Enter a positive amount with at most ${CURRENCIES[currency].exponent} decimal places.`,
      );
      return;
    }
    if (from === to) {
      setError("An account cannot transfer to itself. Both sides would net to zero.");
      return;
    }
    setError(null);
    onTransfer({ from, to, amount: parsed, reference: reference.trim() || "TRF" });
  }

  return (
    <form onSubmit={submit} className="border-b border-rule px-4 py-4">
      <h3 className="label mb-3 text-ink-faint">Transfer</h3>

      <div className="space-y-3">
        <Field label="From" htmlFor={`${id}-from`}>
          <select
            id={`${id}-from`}
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              const nextCurrency = accounts.find(
                (account) => account.id === event.target.value,
              )?.currency;
              if (nextCurrency !== undefined) {
                const firstOther = accounts.find(
                  (account) =>
                    account.currency === nextCurrency && account.id !== event.target.value,
                );
                if (firstOther) setTo(firstOther.id);
              }
            }}
            className={SELECT}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="To" htmlFor={`${id}-to`}>
          <select
            id={`${id}-to`}
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={SELECT}
          >
            {compatible.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`} htmlFor={`${id}-amount`}>
            <input
              id={`${id}-amount`}
              value={amount}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              className={INPUT}
            />
          </Field>
          <Field label="Reference" htmlFor={`${id}-reference`}>
            <input
              id={`${id}-reference`}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              className={INPUT}
            />
          </Field>
        </div>

        {error ? (
          <p role="alert" className="text-body-s text-debit">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="sm" className="w-full">
          Post transfer
        </Button>
      </div>
    </form>
  );
}

function FundForm({
  accounts,
  onFund,
}: {
  accounts: readonly Account[];
  onFund: ControlsProps["onFund"];
}) {
  const id = useId();
  const [accountId, setAccountId] = useState("cust:tom");
  const [amount, setAmount] = useState("250.00");
  const [error, setError] = useState<string | null>(null);

  // Customer wallets only. "Payouts in flight" is also a liability, but
  // funding a clearing account from treasury is not a thing anyone does — the
  // distinguishing property is that a customer wallet cannot go negative.
  const wallets = accounts.filter(
    (account) => account.type === "liability" && !account.allowsNegativeBalance,
  );
  const currency =
    accounts.find((account) => account.id === accountId)?.currency ?? "GBP";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseAmount(amount, currency);
    if (parsed === null || parsed.amount <= 0) {
      setError("Enter a positive amount.");
      return;
    }
    setError(null);
    onFund({ accountId, amount: parsed, reference: "FUND/MANUAL" });
  }

  return (
    <form onSubmit={submit} className="border-b border-rule px-4 py-4">
      <h3 className="label mb-3 text-ink-faint">Fund from treasury</h3>

      <div className="space-y-3">
        <Field label="Account" htmlFor={`${id}-account`}>
          <select
            id={`${id}-account`}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className={SELECT}
          >
            {wallets.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={`Amount (${currency})`} htmlFor={`${id}-fund-amount`}>
          <input
            id={`${id}-fund-amount`}
            value={amount}
            inputMode="decimal"
            onChange={(event) => setAmount(event.target.value)}
            className={INPUT}
          />
        </Field>

        {error ? (
          <p role="alert" className="text-body-s text-debit">
            {error}
          </p>
        ) : null}

        <Button type="submit" size="sm" className="w-full">
          Fund account
        </Button>
      </div>
    </form>
  );
}

const SELECT =
  "w-full rounded-sm border border-rule bg-paper px-3 py-2 font-sans text-body-s text-ink";
const INPUT =
  "tnum w-full rounded-sm border border-rule bg-paper px-3 py-2 text-body-s text-ink";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="label mb-1.5 block text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}
