import Link from "next/link";
import { MoneyInFlight } from "@/components/diagrams/MoneyInFlight";
import { Odometer } from "@/components/motion/Odometer";
import { profile } from "@/content/profile";
import { heroMetrics } from "@/content/metrics";

/**
 * Landing section 1. CLAUDE.md §6.1.
 *
 * The headline is server-rendered and never animates: it must be readable at
 * first paint. The visual animates, the sentence does not. CLAUDE.md §5.
 */
export function Hero() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-6 pt-12 pb-16 md:pt-20 md:pb-24">
      <p className="label mb-6 text-ink-faint">
        {profile.role} · {profile.discipline}
      </p>

      {/* The headline runs the full measure so it sets in two lines, as
          CLAUDE.md §6.1 requires. Constrained to a column it breaks into six,
          and a masthead that takes six lines is a paragraph. */}
      <h1 className="text-display-xl text-ink">{profile.headline}</h1>

      {/* Top-aligned. Centring the short text column against the tall figure
          opened a gap between the headline and the lede, which breaks the one
          reading order that matters here. A gap below the buttons is the
          cheaper of the two, because the figure carries that side. */}
      <div className="mt-10 grid items-start gap-12 lg:mt-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <p className="prose-measure text-body-l text-ink-soft">{profile.lede}</p>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Link
              href="/ledger"
              className="inline-flex items-center gap-2 rounded-sm border border-signal bg-signal px-5 py-3 font-sans text-body-s text-paper no-underline transition-[filter,transform] hover:brightness-110 active:translate-y-px"
            >
              Open the ledger demo
              <span aria-hidden="true">→</span>
            </Link>

            <Link
              href="/resume"
              className="group font-sans text-body-s text-ink no-underline"
            >
              <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-left-bottom bg-no-repeat pb-1 transition-[background-size] duration-300 group-hover:bg-[length:100%_1px]">
                Read the resume
              </span>
            </Link>
          </div>
        </div>

        <div className="lg:pl-4">
          <MoneyInFlight />
        </div>
      </div>

      {/* The live strip. CLAUDE.md §6.1: one row of four odometers. */}
      <dl className="mt-16 grid grid-cols-2 gap-px border border-rule bg-rule md:mt-20 md:grid-cols-4">
        {heroMetrics.map((item) => (
          <div key={item.id} className="bg-paper px-5 py-6">
            <dt className="label text-ink-faint">{item.label}</dt>
            <dd className="mt-2 text-display-m text-ink">
              <Odometer
                value={item.value}
                decimals={item.decimals ?? 0}
                prefix={item.prefix ?? ""}
                suffix={item.suffix ?? ""}
                label={item.spoken}
              />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
