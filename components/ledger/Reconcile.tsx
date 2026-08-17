"use client";

import { m } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { MoneyFigure } from "@/components/primitives/Figure";
import { Tag } from "@/components/primitives/Tag";
import { useMotionSafe } from "@/components/motion/useMotionSafe";
import type { MatchStatus, ReconciliationReport } from "@/lib/ledger/reconcile";

/**
 * Signature animation E. CLAUDE.md §5.
 *
 * A hairline sweeps down the two columns and each row resolves as it passes:
 * matches in credit green, drift in pending amber, missing movements in debit
 * red. The sweep is presentational, but it teaches what reconciliation is in
 * about two seconds, which is faster than the paragraph above it.
 */

const STATUS_LABEL: Record<MatchStatus, string> = {
  matched: "matched",
  "amount-drift": "drift",
  "missing-in-journal": "not in journal",
  "missing-on-rail": "never left",
};

const STATUS_TONE: Record<MatchStatus, "credit" | "pending" | "debit"> = {
  matched: "credit",
  "amount-drift": "pending",
  "missing-in-journal": "debit",
  "missing-on-rail": "debit",
};

export interface ReconcileProps {
  report: ReconciliationReport;
}

export function Reconcile({ report }: ReconcileProps) {
  const motionSafe = useMotionSafe();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    setHeight(bodyRef.current?.offsetHeight ?? 0);
  }, [report]);

  const rowDelay = motionSafe.enabled ? 0.12 : 0;
  const sweepDuration = motionSafe.enabled
    ? Math.max(0.8, report.rows.length * 0.12)
    : 0;

  return (
    <div className="relative border border-rule bg-paper-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
        <h3 className="font-display text-display-m text-ink">End-of-day reconciliation</h3>
        <p className="flex items-center gap-2">
          <Tag tone={report.clean ? "credit" : "pending"}>
            {report.matched} matched
          </Tag>
          <Tag tone={report.breaks === 0 ? "neutral" : "debit"}>
            {report.breaks} {report.breaks === 1 ? "break" : "breaks"}
          </Tag>
        </p>
      </header>

      {/* Scrolls sideways on narrow screens rather than clipping: five columns
          of figures do not fit a phone, and a cut-off drift column is the one
          number a reader most needs. */}
      <div ref={bodyRef} className="scroll-x">
        {/* The sweep itself. Transform only — never `top`. CLAUDE.md §5.6.
            The travel distance is measured rather than expressed as a
            percentage, because 100% of a one-pixel rule is one pixel. */}
        {motionSafe.enabled && height > 0 ? (
          <m.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-signal"
            initial={{ scaleX: 0, y: 0, opacity: 1 }}
            animate={{ scaleX: 1, y: height, opacity: 0 }}
            transition={{
              scaleX: { duration: 0.25 },
              y: { duration: sweepDuration, ease: "linear" },
              opacity: { delay: sweepDuration, duration: 0.3 },
            }}
            style={{ originX: 0 }}
          />
        ) : null}

        <table className="w-full min-w-[620px] border-collapse text-body-s">
          <caption className="sr-only">
            The payout rail&rsquo;s end-of-day statement compared with our journal,
            matched on reference. Each row shows what the rail says, what we
            recorded, and the difference.
          </caption>
          <thead>
            <tr className="border-b border-rule bg-paper-sunk">
              <th scope="col" className="label px-4 py-2 text-left text-ink-faint">
                Reference
              </th>
              <th scope="col" className="label px-4 py-2 text-right text-ink-faint">
                Rail statement
              </th>
              <th scope="col" className="label px-4 py-2 text-right text-ink-faint">
                Our journal
              </th>
              <th scope="col" className="label px-4 py-2 text-right text-ink-faint">
                Drift
              </th>
              <th scope="col" className="label px-4 py-2 text-left text-ink-faint">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row, index) => (
              <m.tr
                key={row.reference}
                className="border-b border-rule/60"
                initial={{ opacity: motionSafe.enabled ? 0.25 : 1 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * rowDelay, duration: 0.25 }}
              >
                <td className="px-4 py-2 font-sans text-ink">{row.reference}</td>
                <td className="px-4 py-2 text-right">
                  {row.statement ? (
                    <MoneyFigure value={row.statement.amount} />
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {row.journal ? (
                    <MoneyFigure value={row.journal.amount} />
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {row.drift && row.drift.amount !== 0 ? (
                    <MoneyFigure value={row.drift} signed showSign />
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <m.span
                    initial={{ opacity: motionSafe.enabled ? 0 : 1 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * rowDelay + 0.1, duration: 0.2 }}
                    className="inline-block"
                  >
                    <Tag tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Tag>
                  </m.span>
                </td>
              </m.tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="border-t border-rule px-4 py-3">
        <p className="text-body-s text-ink-soft">
          Total drift <MoneyFigure value={report.totalDrift} signed showSign />.{" "}
          {report.clean
            ? "Both sides agree on every line."
            : "Drift is a figure both sides have and disagree on. “Not in journal” is money the rail moved without us — the expensive one. “Never left” is usually a stuck payout. Reporting these as one number is how a break survives a quarter."}
        </p>
      </footer>
    </div>
  );
}
