import type { Metadata } from "next";
import { LedgerPlayground } from "@/components/ledger/LedgerPlayground";
import { sourceUrl } from "@/content/profile";

export const metadata: Metadata = {
  title: "Ledger playground",
  description:
    "A working double-entry ledger running in your browser. Post a transfer, double-submit it, overdraw an account, tamper with a row and watch the hash chain break.",
};

export default function LedgerPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-10 md:py-14">
      <header className="mb-10 max-w-[68ch]">
        <p className="label mb-4 text-ink-faint">The playground</p>
        <h1 className="text-display-l text-ink">
          A double-entry ledger you can try to break.
        </h1>
        <p className="mt-5 text-body-l text-ink-soft">
          This is not a diagram or a video. It is the real domain module, running in
          your browser with an in-memory journal. Post a transfer and watch the
          entries appear. Submit the same request twice and watch the second one
          post nothing. Then edit a row behind the ledger&rsquo;s back and see the
          signature chain refuse to verify.
        </p>
        <p className="mt-4 text-body-s text-ink-faint">
          Money is stored as an integer count of minor units with a currency code,
          never a decimal. The domain module is pure TypeScript with zero runtime
          dependencies, no clock and no I/O — which is what makes it worth writing
          property tests against.{" "}
          <a
            href={sourceUrl("lib/ledger")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-signal underline decoration-signal/40 underline-offset-4 hover:decoration-signal"
          >
            Read the whole module
          </a>
          .
        </p>
      </header>

      <LedgerPlayground />
    </div>
  );
}
