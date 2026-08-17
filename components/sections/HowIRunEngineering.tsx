import Link from "next/link";
import { Section, SectionHeading } from "@/components/primitives/Section";
import { Reveal } from "@/components/motion/Reveal";
import { landingPrinciples } from "@/content/principles";

/**
 * Landing section 5. CLAUDE.md §6.1.
 *
 * The section the CEO reader actually cares most about, and the one most
 * engineering portfolios omit entirely.
 */
export function HowIRunEngineering() {
  return (
    <Section id="approach">
      <SectionHeading
        eyebrow="The CTO seat"
        lede="Architecture is the easy half. These are the practices that decide whether a payment system stays correct after the person who designed it stops being the one writing it."
      >
        How I run engineering
      </SectionHeading>

      <ul className="grid gap-px bg-rule border border-rule md:grid-cols-2">
        {landingPrinciples.map((principle, index) => (
          <Reveal as="li" key={principle.id} delay={index * 0.06} className="bg-paper p-6">
            <h3 className="font-display text-display-m text-ink">{principle.title}</h3>
            <p className="mt-3 text-body-s text-ink-soft">{principle.summary}</p>
            <ul className="mt-4 space-y-2">
              {principle.points.slice(0, 2).map((point) => (
                <li key={point} className="flex gap-3 text-body-s text-ink-soft">
                  <span className="text-signal" aria-hidden="true">
                    —
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>

      <p className="mt-8">
        <Link
          href="/approach"
          className="font-sans text-body-s text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
        >
          The full version, including governance and hiring →
        </Link>
      </p>
    </Section>
  );
}
