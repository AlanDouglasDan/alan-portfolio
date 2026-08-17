import type { ReactNode } from "react";

export interface SectionProps {
  children: ReactNode;
  id?: string;
  className?: string;
  /** Draws the hairline that separates one ledger section from the next. */
  ruled?: boolean;
}

export function Section({ children, id, className = "", ruled = true }: SectionProps) {
  return (
    <section
      id={id}
      className={`${ruled ? "rule-t" : ""} py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto w-full max-w-[1240px] px-6">{children}</div>
    </section>
  );
}

export interface SectionHeadingProps {
  /** The small mono line above the heading, like a ledger column label. */
  eyebrow?: string;
  children: ReactNode;
  lede?: ReactNode;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  children,
  lede,
  className = "",
}: SectionHeadingProps) {
  return (
    <div className={`mb-10 md:mb-14 ${className}`}>
      {eyebrow ? (
        <p className="label mb-4 text-ink-faint">{eyebrow}</p>
      ) : null}
      <h2 className="text-display-l text-ink">{children}</h2>
      {lede ? (
        <div className="prose-measure mt-5 text-body-l text-ink-soft">{lede}</div>
      ) : null}
    </div>
  );
}
