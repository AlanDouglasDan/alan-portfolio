import Link from "next/link";
import { Hero } from "@/components/sections/Hero";
import { CredibilityStrip } from "@/components/sections/CredibilityStrip";
import { LedgerTeaser } from "@/components/sections/LedgerTeaser";
import { SelectedWork } from "@/components/sections/SelectedWork";
import { HowIRunEngineering } from "@/components/sections/HowIRunEngineering";
import { Contact } from "@/components/sections/Contact";
import { Section, SectionHeading } from "@/components/primitives/Section";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <CredibilityStrip />

      <Section id="proof">
        <SectionHeading
          eyebrow="Don't take my word for it"
          lede={
            <>
              Every engineering portfolio claims a ledger. This one is running in
              your browser right now. Press the button: two entries are appended,
              equal and opposite, and both balances are re-derived by folding the
              journal rather than read from a stored figure.
            </>
          }
        >
          A working ledger, not a claim about one
        </SectionHeading>

        <LedgerTeaser />

        <p className="mt-6 max-w-[68ch] text-body-s text-ink-faint">
          The full playground goes further: double-submit a transfer and watch
          idempotency reject the duplicate, overdraw an account and watch the
          constraint hold at the ledger boundary, run an FX transfer against a
          locked quote, fail a payout at the rail and watch it reverse by
          compensation, reconcile against a rail statement — and edit a row behind
          the ledger&rsquo;s back to see the signature chain refuse to verify.{" "}
          <Link
            href="/ledger"
            className="text-signal underline decoration-signal/30 underline-offset-4 hover:decoration-signal"
          >
            Open the playground
          </Link>
          .
        </p>
      </Section>

      <SelectedWork />
      <HowIRunEngineering />
      <Contact />
    </>
  );
}
