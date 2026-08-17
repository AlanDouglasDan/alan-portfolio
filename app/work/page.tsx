import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { Reveal } from "@/components/motion/Reveal";
import { caseStudies } from "@/content/work";

export const metadata: Metadata = {
  title: "Selected work",
  description:
    "Three payment systems in detail: a signed append-only ledger, payout rails and verification, and billing with webhook reconciliation.",
};

export default function WorkPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-10 md:py-16">
      <header className="max-w-[68ch]">
        <p className="label mb-4 text-ink-faint">Selected work</p>
        <h1 className="text-display-l text-ink">Three problems worth the detail</h1>
        <p className="mt-6 text-body-l text-ink-soft">
          Curated rather than complete. Each follows the same shape — the
          constraint that made it hard, the architecture, the decision that
          mattered with the alternative that was rejected, the outcome, and what I
          would change now.
        </p>
      </header>

      <ul className="mt-12 space-y-px bg-rule border border-rule">
        {caseStudies.map((study, index) => (
          <Reveal as="li" key={study.slug} delay={index * 0.06} className="bg-paper">
            <Link
              href={{ pathname: `/work/${study.slug}` }}
              className="grid gap-6 p-6 no-underline transition-colors hover:bg-paper-sunk md:grid-cols-[1fr_auto] md:items-center md:p-8"
            >
              <div>
                <p className="label text-ink-faint">
                  {study.company} · {study.role} · {study.period}
                </p>
                <h2
                  className="mt-3 font-display text-display-m text-ink"
                  style={{ viewTransitionName: `case-study-${study.slug}` }}
                >
                  {study.title}
                </h2>
                <p className="prose-measure mt-3 text-body text-ink-soft">
                  {study.problem}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {study.stack.map((item) => (
                    <li key={item}>
                      <Tag>{item}</Tag>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="md:text-right">
                <span className="block text-display-l text-signal">
                  <Figure className="text-signal">{study.headlineFigure.value}</Figure>
                </span>
                <span className="label mt-1 block text-ink-faint">
                  {study.headlineFigure.label}
                </span>
              </p>
            </Link>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
