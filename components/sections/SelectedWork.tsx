import Link from "next/link";
import { Section, SectionHeading } from "@/components/primitives/Section";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { Reveal } from "@/components/motion/Reveal";
import { caseStudies } from "@/content/work";

/**
 * Landing section 4. CLAUDE.md §6.1.
 *
 * Three, maximum. `view-transition-name` on the title gives the shared-element
 * transition into the case study where the browser supports it, and degrades to
 * an ordinary navigation where it does not.
 */
export function SelectedWork() {
  return (
    <Section id="work">
      <SectionHeading
        eyebrow="Selected work"
        lede="Three systems, each with the decision that mattered named, the alternative that was rejected, and what I would do differently now."
      >
        Three problems worth the detail
      </SectionHeading>

      <ul className="grid gap-px bg-rule md:grid-cols-3 md:border md:border-rule">
        {caseStudies.map((study, index) => (
          <Reveal as="li" key={study.slug} delay={index * 0.06} className="bg-paper">
            <Link
              href={{ pathname: `/work/${study.slug}` }}
              className="group flex h-full flex-col p-6 no-underline transition-colors hover:bg-paper-sunk"
            >
              <p className="label text-ink-faint">
                {study.company} · {study.period}
              </p>

              <h3
                className="mt-3 font-display text-display-m text-ink"
                style={{ viewTransitionName: `case-study-${study.slug}` }}
              >
                {study.title}
              </h3>

              <p className="mt-3 flex-1 text-body-s text-ink-soft">{study.problem}</p>

              <p className="mt-6 border-t border-rule pt-4">
                <span className="block text-display-m text-signal">
                  <Figure tone="default" className="text-signal">
                    {study.headlineFigure.value}
                  </Figure>
                </span>
                <span className="label mt-1 block text-ink-faint">
                  {study.headlineFigure.label}
                </span>
              </p>

              <ul className="mt-4 flex flex-wrap gap-1.5">
                {study.stack.slice(0, 4).map((item) => (
                  <li key={item}>
                    <Tag>{item}</Tag>
                  </li>
                ))}
              </ul>
            </Link>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
