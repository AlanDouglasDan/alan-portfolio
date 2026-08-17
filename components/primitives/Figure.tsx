import type { ReactNode } from "react";
import { format, toWords } from "@/lib/ledger/money";
import type { Money } from "@/lib/ledger/types";

/**
 * Every number on this site goes through here.
 *
 * Mono family, tabular figures, so columns of numbers line up into a vertical
 * rule the way a financial reader expects. CLAUDE.md §4.2 calls this the single
 * most important typographic decision in the project, so it is a primitive
 * rather than a utility class anyone can forget to apply.
 */

type Tone = "default" | "credit" | "debit" | "pending" | "faint";

const TONE_CLASS: Record<Tone, string> = {
  default: "text-ink",
  credit: "text-credit",
  debit: "text-debit",
  pending: "text-pending",
  faint: "text-ink-faint",
};

export interface FigureProps {
  children: ReactNode;
  tone?: Tone;
  /** Spoken form. Without it, a screen reader reads "1 4 5 0". */
  label?: string;
  className?: string;
}

export function Figure({
  children,
  tone = "default",
  label,
  className = "",
}: FigureProps) {
  // `aria-label` on a bare span is not reliably announced, and `role="text"`
  // is Safari-only. Visually-hidden sibling text works everywhere.
  if (label === undefined) {
    return <span className={`tnum ${TONE_CLASS[tone]} ${className}`}>{children}</span>;
  }

  return (
    <span className={`tnum ${TONE_CLASS[tone]} ${className}`}>
      <span aria-hidden="true">{children}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface MoneyFigureProps {
  value: Money;
  /** Colour by sign, using the semantic money tokens. */
  signed?: boolean;
  showSign?: boolean;
  className?: string;
}

/**
 * A money amount, formatted from integer minor units and given a spoken label.
 * The component does no arithmetic; `format` and `toWords` live in the domain
 * module. CLAUDE.md §10.
 */
export function MoneyFigure({
  value,
  signed = false,
  showSign = false,
  className = "",
}: MoneyFigureProps) {
  const tone: Tone = !signed
    ? "default"
    : value.amount > 0
      ? "credit"
      : value.amount < 0
        ? "debit"
        : "faint";

  return (
    <Figure tone={tone} label={toWords(value)} className={className}>
      {format(value, { showSign })}
    </Figure>
  );
}
