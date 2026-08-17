import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { profile } from "@/content/profile";
import { domains } from "@/content/domains";

export const metadata: Metadata = {
  title: "About",
  description: profile.summary,
};

const COMPETENCIES = [
  {
    heading: "Payments and money movement",
    items: [
      "Cross-border remittance flows",
      "Digital wallet architecture",
      "Payout rails (Paystack Transfers, Stripe Billing/Connect)",
      "Append-only and double-entry ledger design",
      "Reconciliation",
      "Idempotent transaction processing",
      "Settlement flows",
      "FX quote handling",
    ],
  },
  {
    heading: "Compliance and security",
    items: [
      "KYC/AML onboarding flows",
      "Merchant and business verification",
      "OAuth 2.0, JWT, HMAC webhook signature verification, mTLS",
      "Secrets management",
      "Audit trails and immutable event history",
      "PCI DSS and ISO 27001 aligned practice",
    ],
  },
  {
    heading: "Architecture and reliability",
    items: [
      "REST API design",
      "Microservices",
      "Event-driven systems",
      "High-availability patterns",
      "p95/p99 latency SLOs",
      "Hot-path optimisation",
      "Graceful degradation",
      "Structured logging, distributed tracing, alerting",
    ],
  },
  {
    heading: "Cloud, data and languages",
    items: [
      "AWS, Google Cloud Run, Docker, GitHub Actions",
      "PostgreSQL, MySQL, MongoDB, Redis, Supabase, Firebase",
      "TypeScript, Node.js, NestJS, Express",
      "Next.js, React, React Native, Expo",
      "EVM wallet integration, stablecoin transfer flows",
    ],
  },
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-10 md:py-16">
      <header className="max-w-[68ch]">
        <p className="label mb-4 text-ink-faint">About</p>
        <h1 className="text-display-l text-ink">{profile.name}</h1>
        <p className="mt-6 text-body-l text-ink-soft">{profile.summary}</p>
        <p className="mt-4 text-body-l text-ink-soft">
          Currently CTO at Lisah Technologies, where I own system architecture,
          engineering governance, technical hiring and production reliability.
          Before that: remittance at Lifeeremit, digital asset wallets at Bitfinex,
          the value ledger at Book-d, payout rails at Nexpass, and subscription
          billing at Gemma AI. I set the architecture and I still review the pull
          requests.
        </p>
        <p className="mt-4 text-body-s text-ink-faint">
          Based in {profile.location}.
        </p>
      </header>

      <section className="rule-t mt-14 pt-12" aria-labelledby="track">
        <h2 id="track" className="text-display-m text-ink">
          The track record, in one table
        </h2>
        <div className="scroll-x mt-6">
          <table className="w-full min-w-[560px] border-collapse text-body-s">
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
              {domains.map((row) => (
                <tr key={row.where} className="border-b border-rule">
                  <td className="py-4 pr-4 font-sans text-ink">{row.domain}</td>
                  <td className="py-4 pr-4 font-sans text-ink-soft">{row.where}</td>
                  <td className="py-4 text-right">
                    <Figure tone="faint">{row.years}</Figure>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="competencies">
        <h2 id="competencies" className="text-display-m text-ink">
          What I work with
        </h2>
        <div className="mt-8 grid gap-10 md:grid-cols-2">
          {COMPETENCIES.map((group) => (
            <div key={group.heading}>
              <h3 className="label mb-4 text-ink-faint">{group.heading}</h3>
              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li key={item}>
                    <Tag>{item}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="contact">
        <h2 id="contact" className="text-display-m text-ink">
          Get in touch
        </h2>
        <ul className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-3">
          {profile.links.map((link) => (
            <li key={link.href} className="bg-paper">
              <a
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="block h-full px-6 py-6 no-underline transition-colors hover:bg-paper-sunk"
              >
                <span className="label block text-ink-faint">{link.label}</span>
                <span className="mt-2 block font-sans text-body-s text-ink">
                  {link.display}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-body-s text-ink-faint">
          Or read the{" "}
          <Link
            href="/resume"
            className="text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
          >
            full resume
          </Link>
          , or go and{" "}
          <Link
            href="/ledger"
            className="text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
          >
            break the ledger
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
