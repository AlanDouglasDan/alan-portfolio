"use client";

import { useState } from "react";
import { StampRow } from "@/components/motion/StampRow";
import { Figure, MoneyFigure } from "@/components/primitives/Figure";
import { truncateHash } from "@/lib/ledger/signature";
import { toWords } from "@/lib/ledger/money";
import type { Entry } from "@/lib/ledger/types";
import type { VerificationResult } from "@/lib/ledger/journal";

export interface JournalProps {
  entries: readonly Entry[];
  justPosted: readonly number[];
  verification: VerificationResult | null;
}

/**
 * The journal pane. A real table: caption, scoped headers, and an expansion for
 * every abbreviation. CLAUDE.md §8.
 *
 * This pane is authoritative and never edited — rows only ever arrive at the
 * bottom, which is why the newest entries are rendered last rather than first.
 */
export function Journal({ entries, justPosted, verification }: JournalProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const failedSequence = verification && !verification.ok ? verification.failedSequence : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-baseline justify-between gap-4 border-b border-rule px-4 py-3">
        <div>
          <h2 className="font-display text-display-m text-ink">Journal</h2>
          <p className="label mt-1 text-ink-faint">Append-only · hash-chained</p>
        </div>
        {/* No visually-hidden label here: the word "entries" already follows
            the figure, so a screen reader reads "6 entries" from the visible
            text alone. */}
        <p className="label text-ink-faint">
          <span className="tnum" data-testid="entry-count">
            {entries.length}
          </span>{" "}
          entries
        </p>
      </header>

      {/* `min-w-0` matters: without it this flex child sizes to the table's
          intrinsic width and the whole page picks up a horizontal scrollbar
          instead of the table scrolling inside its own pane. */}
      <div className="scroll-both min-h-0 min-w-0 flex-1">
        {/* Fixed widths on the money columns rather than percentages. A naira
            figure is thirteen characters of tabular mono, so a percentage that
            works at one pane width silently crushes it into the signature
            column at another. Below `min-w` the pane scrolls instead. */}
        <table className="w-full min-w-[566px] table-fixed border-collapse text-body-s">
          <caption className="sr-only">
            Every posting line in the ledger, in the order it was written. Each row
            shows its sequence number, the account and reference, the amount on
            either the debit or credit side, and the first characters of the hash
            that chains it to the row before it.
          </caption>
          <colgroup>
            <col className="w-[46px]" />
            <col />
            <col className="w-[132px]" />
            <col className="w-[132px]" />
            {/* Wide enough for eight hex characters and the ellipsis. */}
            <col className="w-[104px]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-paper-sunk">
            <tr className="border-b border-rule">
              <th scope="col" className="label px-3 py-2 text-left text-ink-faint">
                <abbr title="Sequence number">Seq</abbr>
              </th>
              <th scope="col" className="label px-3 py-2 text-left text-ink-faint">
                Account
              </th>
              <th scope="col" className="label px-3 py-2 text-right text-ink-faint">
                <abbr title="Debit: the left side of the entry">Debit</abbr>
              </th>
              <th scope="col" className="label px-3 py-2 text-right text-ink-faint">
                <abbr title="Credit: the right side of the entry">Credit</abbr>
              </th>
              <th scope="col" className="label px-3 py-2 text-left text-ink-faint">
                <abbr title="Truncated hash chaining this entry to the previous one">
                  Sig
                </abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-ink-faint">
                  Nothing posted yet.
                </td>
              </tr>
            ) : (
              entries.map((entry) => {
                const broken = failedSequence !== null && entry.sequence >= failedSequence;
                const isFailedRow = failedSequence === entry.sequence;
                const fresh = justPosted.includes(entry.sequence);

                return (
                  <StampRow
                    key={entry.id}
                    className={`border-b border-rule/60 align-top ${
                      isFailedRow
                        ? "bg-debit-wash"
                        : broken
                          ? "bg-debit-wash/40"
                          : fresh
                            ? "bg-credit-wash/50"
                            : ""
                    }`}
                  >
                    <td className="py-2 pl-3 pr-1">
                      <Figure tone="faint" label={`Entry ${entry.sequence}`}>
                        {String(entry.sequence).padStart(3, "0")}
                      </Figure>
                    </td>
                    {/* Account and reference share a cell. As separate columns
                        they squeezed the signature off the right edge of the
                        pane, and the two belong together anyway: they are both
                        answers to "what is this entry". */}
                    <td className="px-3 py-2">
                      <span className="block truncate font-sans text-ink">
                        {entry.accountId}
                      </span>
                      <span className="block truncate font-sans text-body-s text-ink-faint">
                        {entry.reference}
                      </span>
                    </td>
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
                    <td className="py-2 pl-2 pr-3">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(expanded === entry.sequence ? null : entry.sequence)
                        }
                        aria-expanded={expanded === entry.sequence}
                        className={`tnum text-left text-body-s underline decoration-dotted underline-offset-2 ${
                          isFailedRow ? "text-debit" : "text-ink-faint hover:text-ink"
                        }`}
                      >
                        {expanded === entry.sequence ? (
                          <span className="break-all">{entry.hash}</span>
                        ) : (
                          truncateHash(entry.hash)
                        )}
                      </button>
                      {expanded === entry.sequence ? (
                        <dl className="mt-2 space-y-1 text-ink-faint">
                          <div>
                            <dt className="label inline">Posted </dt>
                            <dd className="tnum inline">
                              {formatTime(entry.occurredAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="label inline">Prev </dt>
                            <dd className="tnum inline break-all">{entry.previousHash}</dd>
                          </div>
                          {Object.entries(entry.metadata).map(([key, value]) => (
                            <div key={key}>
                              <dt className="label inline">{key} </dt>
                              <dd className="inline font-sans">{value}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </td>
                  </StampRow>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Announced politely so a screen-reader user hears the outcome without
          losing their place. CLAUDE.md §8. */}
      <p aria-live="polite" className="sr-only">
        {entries.length} entries in the journal.
        {verification === null
          ? ""
          : verification.ok
            ? ` Integrity verified across ${verification.entriesChecked} entries.`
            : ` Integrity check failed at entry ${verification.failedSequence}.`}
      </p>
    </div>
  );
}

function formatTime(iso: string): string {
  return iso.slice(11, 19);
}

export { toWords };
