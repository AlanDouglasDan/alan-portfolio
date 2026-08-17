"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/primitives/Button";
import { Figure, MoneyFigure } from "@/components/primitives/Figure";
import { Odometer } from "@/components/motion/Odometer";
import { StampRow } from "@/components/motion/StampRow";
import { balances, createLedger, fund, transfer, type LedgerState } from "@/lib/ledger/ledger";
import { money, toWords } from "@/lib/ledger/money";
import { truncateHash } from "@/lib/ledger/signature";
import type { Account } from "@/lib/ledger/types";

/**
 * Landing section 3. CLAUDE.md §6.1.
 *
 * One flow: send money, watch it post. This exists to convert a skimmer into
 * someone who has used something Alan built, so it has exactly one button and
 * no configuration.
 *
 * A separate two-account world from the playground, seeded at a fixed
 * timestamp so the server and client render identical hashes.
 */

const SEED_MS = Date.parse("2026-03-01T09:00:00.000Z");

const ACCOUNTS: readonly Account[] = [
  {
    id: "sender",
    name: "Sender · wallet",
    type: "liability",
    currency: "GBP",
    allowsNegativeBalance: false,
    description: "",
  },
  {
    id: "recipient",
    name: "Recipient · wallet",
    type: "liability",
    currency: "GBP",
    allowsNegativeBalance: false,
    description: "",
  },
  {
    id: "treasury",
    name: "Treasury",
    type: "asset",
    currency: "GBP",
    allowsNegativeBalance: true,
    description: "",
  },
];

const AMOUNT = money(250_00, "GBP");

function seed(): LedgerState {
  const result = fund(createLedger(ACCOUNTS), {
    accountId: "sender",
    treasuryAccountId: "treasury",
    amount: money(1_000_00, "GBP"),
    reference: "OPEN/0001",
    idempotencyKey: "teaser-seed",
    nowMs: SEED_MS,
  });
  return result.ok ? result.value.state : createLedger(ACCOUNTS);
}

export function LedgerTeaser() {
  const [state, setState] = useState<LedgerState>(seed);
  const [message, setMessage] = useState<string | null>(null);
  const [sent, setSent] = useState(0);

  const derived = useMemo(() => balances(state), [state]);
  const senderBalance = derived.get("sender") ?? money(0, "GBP");
  const recipientBalance = derived.get("recipient") ?? money(0, "GBP");

  const send = useCallback(() => {
    const result = transfer(state, {
      fromAccountId: "sender",
      toAccountId: "recipient",
      amount: AMOUNT,
      reference: `TRF/${String(sent + 1).padStart(4, "0")}`,
      idempotencyKey: `teaser-${sent + 1}`,
      nowMs: Date.now(),
    });

    if (!result.ok) {
      setMessage(
        `${result.error.message} The ledger refused it — the check runs inside the domain, not in this button.`,
      );
      return;
    }

    setState(result.value.state);
    setSent((count) => count + 1);
    setMessage(
      "Two entries appended: one debit, one credit, equal and opposite. Both balances were re-derived by folding the journal — neither is stored anywhere.",
    );
  }, [state, sent]);

  const reset = useCallback(() => {
    setState(seed());
    setSent(0);
    setMessage(null);
  }, []);

  const entries = state.journal.entries;

  return (
    <div className="border border-rule bg-paper-raised">
      <div className="grid gap-px bg-rule md:grid-cols-2">
        {[
          { label: "Sender", balance: senderBalance },
          { label: "Recipient", balance: recipientBalance },
        ].map((pane) => (
          <div key={pane.label} className="bg-paper-raised px-5 py-5">
            <p className="label text-ink-faint">{pane.label}</p>
            <p className="mt-2 text-display-m text-ink">
              <Odometer
                value={pane.balance.amount}
                decimals={2}
                prefix="£"
                label={toWords(pane.balance)}
                duration={0.9}
              />
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-rule px-5 py-4">
        <Button variant="primary" onClick={send}>
          Send <MoneyFigure value={AMOUNT} className="ml-1" />
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} disabled={sent === 0}>
          Reset
        </Button>
        <Link
          href="/ledger"
          className="ml-auto font-sans text-body-s text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
        >
          Open the full playground →
        </Link>
      </div>

      {message ? (
        <p aria-live="polite" className="border-b border-rule px-5 py-3 text-body-s text-ink-soft">
          {message}
        </p>
      ) : null}

      {/* Scrolls inside its own box on a phone. Without this the five columns
          set the width of the whole landing page. */}
      <div className="scroll-x">
        <table className="w-full min-w-[520px] text-body-s">
        <caption className="sr-only">
          The journal for this demonstration: every posting line, in the order it
          was written.
        </caption>
        <thead>
          <tr className="border-b border-rule bg-paper-sunk">
            <th scope="col" className="label px-5 py-2 text-left text-ink-faint">
              <abbr title="Sequence number">Seq</abbr>
            </th>
            <th scope="col" className="label px-3 py-2 text-left text-ink-faint">
              Account
            </th>
            <th scope="col" className="label px-3 py-2 text-right text-ink-faint">
              Debit
            </th>
            <th scope="col" className="label px-3 py-2 text-right text-ink-faint">
              Credit
            </th>
            <th scope="col" className="label px-5 py-2 text-left text-ink-faint">
              <abbr title="Truncated hash chaining this entry to the previous one">
                Sig
              </abbr>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <StampRow key={entry.id} className="border-b border-rule/60 last:border-b-0">
              <td className="px-5 py-2">
                <Figure tone="faint" label={`Entry ${entry.sequence}`}>
                  {String(entry.sequence).padStart(3, "0")}
                </Figure>
              </td>
              <td className="px-3 py-2 font-sans text-ink">{entry.accountId}</td>
              <td className="px-3 py-2 text-right">
                {entry.direction === "debit" ? (
                  <MoneyFigure value={entry.amount} className="text-debit" />
                ) : (
                  <span className="text-ink-faint" aria-hidden="true">
                    ·
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {entry.direction === "credit" ? (
                  <MoneyFigure value={entry.amount} className="text-credit" />
                ) : (
                  <span className="text-ink-faint" aria-hidden="true">
                    ·
                  </span>
                )}
              </td>
              <td className="px-5 py-2">
                <Figure tone="faint">{truncateHash(entry.hash, 10)}</Figure>
              </td>
            </StampRow>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}
