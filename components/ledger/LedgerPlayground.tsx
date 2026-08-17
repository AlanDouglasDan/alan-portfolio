"use client";

import { useState } from "react";
import { Balances } from "./Balances";
import { Controls } from "./Controls";
import { DemoRunner } from "./DemoRunner";
import { Journal } from "./Journal";
import { Reconcile } from "./Reconcile";
import { usePlayground } from "./usePlayground";
import { DEMO_ACCOUNTS } from "@/lib/ledger/demo";

type Pane = "controls" | "journal" | "state";

const PANES: readonly { id: Pane; label: string }[] = [
  { id: "controls", label: "Controls" },
  { id: "journal", label: "Journal" },
  { id: "state", label: "Balances" },
];

/**
 * Three panes on desktop, stacked tabs on mobile. CLAUDE.md §6.2.
 *
 * The whole page is one client component tree because every pane reads the same
 * ledger state; splitting it would mean lifting that state to a provider for no
 * benefit. Everything below `lib/ledger` stays pure and server-safe.
 */
export function LedgerPlayground() {
  const playground = usePlayground();
  const [pane, setPane] = useState<Pane>("journal");

  return (
    <div className="space-y-6">
      {/* Mobile pane switcher */}
      <div className="lg:hidden">
        <div role="tablist" aria-label="Ledger panes" className="flex border border-rule">
          {PANES.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={pane === item.id}
              aria-controls={`pane-${item.id}`}
              id={`tab-${item.id}`}
              onClick={() => setPane(item.id)}
              className={`label flex-1 px-3 py-2.5 ${
                pane === item.id
                  ? "bg-ink text-paper"
                  : "bg-paper-raised text-ink-soft"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Every pane carries `min-w-0`. A grid child defaults to `min-width:
          auto`, which lets the journal table size the column to its own
          intrinsic width and hand the whole page a horizontal scrollbar
          instead of scrolling inside its pane. The three panes share one
          height on desktop so the row does not end ragged. */}
      <div className="grid gap-px bg-rule lg:h-[680px] lg:grid-cols-[268px_minmax(0,1fr)_286px] lg:border lg:border-rule">
        <div
          id="pane-controls"
          role="tabpanel"
          aria-labelledby="tab-controls"
          className={`min-w-0 bg-paper-raised ${pane === "controls" ? "" : "hidden"} lg:block lg:overflow-hidden`}
        >
          <Controls
            accounts={DEMO_ACCOUNTS}
            onTransfer={playground.postTransfer}
            onFund={playground.postFunding}
          />
        </div>

        <div
          id="pane-journal"
          role="tabpanel"
          aria-labelledby="tab-journal"
          className={`min-w-0 bg-paper-raised ${pane === "journal" ? "" : "hidden"} lg:block lg:overflow-hidden`}
        >
          <Journal
            entries={playground.state.journal.entries}
            justPosted={playground.justPosted}
            verification={playground.verification}
          />
        </div>

        <div
          id="pane-state"
          role="tabpanel"
          aria-labelledby="tab-state"
          className={`min-w-0 bg-paper-raised ${pane === "state" ? "" : "hidden"} lg:block lg:overflow-hidden`}
        >
          <Balances
            accounts={DEMO_ACCOUNTS}
            balances={playground.balances}
            trialBalance={playground.trialBalance}
            verification={playground.verification}
            onVerify={playground.runVerification}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="order-2 space-y-6 lg:order-1">
          {playground.reconciliation ? (
            <Reconcile report={playground.reconciliation} />
          ) : null}
          <Invariants />
        </div>

        <div className="order-1 border border-rule bg-paper-raised lg:order-2">
          <DemoRunner
            onRun={playground.runDemo}
            onReset={playground.reset}
            busy={playground.busy}
            log={playground.log}
          />
        </div>
      </div>
    </div>
  );
}

const INVARIANTS: readonly { claim: string; meaning: string }[] = [
  {
    claim: "For every currency, total debits equal total credits.",
    meaning:
      "Value is never created or destroyed by a posting. The trial balance beside the journal recomputes this on every render, so you can watch it hold.",
  },
  {
    claim: "An account balance is the fold of its entries.",
    meaning:
      "There is no stored balance anywhere in the system, so there is no second copy of the truth that can drift away from the first.",
  },
  {
    claim: "Appending an entry never mutates or removes an existing one.",
    meaning:
      "Corrections are new entries that compensate, not edits. The failed attempt stays visible, because that is what an audit trail is for.",
  },
  {
    claim: "The same idempotency key never produces two distinct outcomes.",
    meaning:
      "A retried request replays its original result. A key reused with different parameters is rejected outright rather than quietly answered wrong.",
  },
  {
    claim: "Any single-byte change to any entry invalidates the chain from that point.",
    meaning:
      "Each entry hashes its own content plus its predecessor's hash. Editing history is detectable, and verification names the row.",
  },
];

/**
 * Stating the invariants beside the demo is itself the credential. CLAUDE.md §6.2.
 */
function Invariants() {
  return (
    <section className="border border-rule bg-paper-raised" aria-labelledby="invariants">
      <h3
        id="invariants"
        className="border-b border-rule px-4 py-3 font-display text-display-m text-ink"
      >
        What this ledger guarantees
      </h3>
      <ol className="divide-y divide-rule/60">
        {INVARIANTS.map((invariant, index) => (
          <li key={invariant.claim} className="flex gap-4 px-4 py-3">
            <span className="tnum shrink-0 text-body-s text-ink-faint" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <p className="text-body-s text-ink">{invariant.claim}</p>
              <p className="mt-1 text-body-s text-ink-soft">{invariant.meaning}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="border-t border-rule px-4 py-3 text-body-s text-ink-faint">
        These are not aspirations. Each one is asserted in{" "}
        <code className="tnum">lib/ledger/__tests__</code>, and the universal ones
        are property-tested with fast-check over generated journals rather than a
        handful of examples.
      </p>
    </section>
  );
}
