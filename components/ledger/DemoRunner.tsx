"use client";

import { AnimatePresence, m } from "motion/react";
import { Button } from "@/components/primitives/Button";
import { useMotionSafe } from "@/components/motion/useMotionSafe";
import { sourceUrl } from "@/content/profile";
import type { DemoId, LogEntry } from "./usePlayground";

interface Demo {
  readonly id: DemoId;
  readonly label: string;
  /** The interview question this answers before it is asked. */
  readonly proves: string;
  readonly source: string;
  readonly danger?: boolean;
}

const DEMOS: readonly Demo[] = [
  {
    id: "double-submit",
    label: "Double-submit the same transfer",
    proves:
      "The second request replays the first result and posts nothing. Money moves once.",
    source: "lib/ledger/idempotency.ts",
  },
  {
    id: "overdraw",
    label: "Overdraw an account",
    proves:
      "The constraint lives at the ledger boundary, not in the form. Nothing is written.",
    source: "lib/ledger/journal.ts",
  },
  {
    id: "cross-currency",
    label: "Send Lagos → London",
    proves:
      "The FX rate is locked with an expiry and recorded on the entry, never re-derived.",
    source: "lib/ledger/fx.ts",
  },
  {
    id: "payout-fails",
    label: "Payout fails at the rail",
    proves:
      "The reversal is a compensating entry. Nothing is deleted; both events stay on the record.",
    source: "lib/ledger/ledger.ts",
  },
  {
    id: "reconcile",
    label: "Run end-of-day reconciliation",
    proves:
      "The rail's statement against our journal, with drift and both kinds of missing movement separated.",
    source: "lib/ledger/reconcile.ts",
  },
  {
    id: "tamper",
    label: "Tamper with a journal row",
    proves:
      "The hash chain breaks and integrity verification names the exact row. This is the one to try.",
    source: "lib/ledger/signature.ts",
    danger: true,
  },
];

export interface DemoRunnerProps {
  onRun: (demo: DemoId) => void;
  onReset: () => void;
  busy: string | null;
  log: readonly LogEntry[];
}

export function DemoRunner({ onRun, onReset, busy, log }: DemoRunnerProps) {
  const motionSafe = useMotionSafe();

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
        <div>
          <h2 className="font-display text-display-m text-ink">Break it</h2>
          <p className="label mt-1 text-ink-faint">Six things worth trying</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </header>

      <ul className="border-b border-rule">
        {DEMOS.map((demo) => (
          <li key={demo.id} className="border-b border-rule/60 px-4 py-3 last:border-b-0">
            <Button
              variant={demo.danger ? "danger" : "secondary"}
              size="sm"
              onClick={() => onRun(demo.id)}
              disabled={busy !== null}
              className="w-full justify-start text-left"
            >
              {demo.label}
            </Button>
            <p className="mt-2 text-body-s text-ink-soft">{demo.proves}</p>
            <a
              href={sourceUrl(demo.source)}
              target="_blank"
              rel="noopener noreferrer"
              className="label mt-1.5 inline-block text-ink-faint underline decoration-rule underline-offset-4 hover:text-signal hover:decoration-signal"
            >
              Read the source · {demo.source}
            </a>
          </li>
        ))}
      </ul>

      <div className="scroll-both min-h-0 min-w-0 flex-1">
        <h3 className="label sticky top-0 bg-paper-sunk px-4 py-2 text-ink-faint">
          What happened
        </h3>
        <ul className="px-4 py-2">
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <m.li
                key={entry.id}
                initial={{ opacity: 0, ...motionSafe.transform({ y: -6 }) }}
                animate={{ opacity: 1, ...motionSafe.transform({ y: 0 }) }}
                transition={motionSafe.spring}
                className={`mb-3 border-l-2 pl-3 ${BORDER[entry.kind]}`}
              >
                <p className={`text-body-s font-medium ${TEXT[entry.kind]}`}>
                  {entry.title}
                </p>
                <p className="mt-1 text-body-s text-ink-soft">{entry.body}</p>
                {entry.source ? (
                  <a
                    href={sourceUrl(entry.source)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="label mt-1 inline-block text-ink-faint underline decoration-rule underline-offset-4 hover:text-signal"
                  >
                    {entry.source}
                  </a>
                ) : null}
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

const BORDER: Record<LogEntry["kind"], string> = {
  info: "border-rule",
  success: "border-credit",
  warn: "border-pending",
  error: "border-debit",
};

const TEXT: Record<LogEntry["kind"], string> = {
  info: "text-ink",
  success: "text-credit",
  warn: "text-pending",
  error: "text-debit",
};
