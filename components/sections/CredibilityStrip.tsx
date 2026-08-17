import Link from "next/link";
import { Section, SectionHeading } from "@/components/primitives/Section";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { Reveal } from "@/components/motion/Reveal";
import { domains } from "@/content/domains";

/**
 * Landing section 2. CLAUDE.md §6.1.
 *
 * A ruled ledger, not a grid of cards. The row order is the argument:
 * remittance, then wallets, then a ledger, then rails, then billing, then the
 * CTO seat.
 */
export function CredibilityStrip() {
  return (
    <Section id="domains">
      <SectionHeading
        eyebrow="Where this comes from"
        lede="Six years across the parts of a payments business that are expensive to get wrong. Each row is a system that moved real value, not a course or a side project."
      >
        The ledger of the work itself
      </SectionHeading>

      <div className="scroll-x">
        <table className="w-full min-w-[640px] border-collapse">
          <caption className="sr-only">
            Domains of payment experience, where each was built, and the years
            spanned.
          </caption>
          <thead>
            <tr className="border-y border-rule">
              <th scope="col" className="label py-3 pr-4 text-left text-ink-faint">
                Domain
              </th>
              <th scope="col" className="label py-3 pr-4 text-left text-ink-faint">
                Where
              </th>
              <th scope="col" className="label py-3 text-right text-ink-faint">
                Years
              </th>
            </tr>
          </thead>
          <tbody>
            {domains.map((row, index) => (
              <Reveal as="tr" key={row.where} delay={index * 0.05}>
                <td className="border-b border-rule py-5 pr-4 align-top">
                  <Tag tone="credit">{row.domain}</Tag>
                  <p className="prose-measure mt-3 text-body-s text-ink-soft">
                    {row.detail}
                  </p>
                  {row.caseStudy ? (
                    <Link
                      href={{ pathname: `/work/${row.caseStudy}` }}
                      className="label mt-3 inline-block text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
                    >
                      Read the case study →
                    </Link>
                  ) : null}
                </td>
                <td className="border-b border-rule py-5 pr-4 align-top font-sans text-body text-ink">
                  {row.where}
                </td>
                <td className="border-b border-rule py-5 text-right align-top">
                  <Figure tone="faint" label={`${row.years}`}>
                    {row.years}
                  </Figure>
                </td>
              </Reveal>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
