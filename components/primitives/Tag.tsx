import type { ReactNode } from "react";

type Tone = "neutral" | "credit" | "debit" | "pending" | "signal";

const TONE: Record<Tone, string> = {
  neutral: "border-rule text-ink-soft bg-paper-sunk",
  credit: "border-credit/30 text-credit bg-credit-wash",
  debit: "border-debit/30 text-debit bg-debit-wash",
  pending: "border-pending/30 text-pending bg-pending-wash",
  signal: "border-signal/30 text-signal bg-transparent",
};

export interface TagProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

/** A mono label chip. Used for stacks, statuses and domain tags. */
export function Tag({ children, tone = "neutral", className = "" }: TagProps) {
  return (
    <span
      className={`label inline-flex items-center rounded-sm border px-2 py-1 ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
