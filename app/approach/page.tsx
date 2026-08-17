import type { Metadata } from "next";
import { Reveal } from "@/components/motion/Reveal";
import { principles } from "@/content/principles";

export const metadata: Metadata = {
  title: "How I run engineering",
  description:
    "Code review standards, reliability practice, compliance by construction, hiring, and engineering governance — written as policy rather than aspiration.",
};

export default function ApproachPage() {
  return (
    <div className="mx-auto w-full max-w-[1240px] px-6 py-10 md:py-16">
      <header className="max-w-[68ch]">
        <p className="label mb-4 text-ink-faint">The CTO seat</p>
        <h1 className="text-display-l text-ink">How I run engineering</h1>
        <p className="mt-6 text-body-l text-ink-soft">
          Architecture is the easy half. What decides whether a payment system is
          still correct in two years is what gets blocked in review, what wakes
          someone at night, and who gets hired. These are written as policy, not as
          values, because a value cannot be checked against a pull request.
        </p>
      </header>

      <div className="mt-14 space-y-px border border-rule bg-rule">
        {principles.map((principle, index) => (
          <Reveal
            key={principle.id}
            delay={index * 0.04}
            className="bg-paper p-6 md:p-10"
          >
            <section id={principle.id} aria-labelledby={`${principle.id}-heading`}>
              <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)] md:gap-12">
                <div>
                  <h2
                    id={`${principle.id}-heading`}
                    className="font-display text-display-m text-ink"
                  >
                    {principle.title}
                  </h2>
                  <p className="mt-3 text-body-s text-ink-soft">{principle.summary}</p>
                </div>

                <ul className="space-y-4">
                  {principle.points.map((point) => (
                    <li key={point} className="flex gap-4">
                      <span
                        className="mt-2.5 h-px w-4 shrink-0 bg-signal"
                        aria-hidden="true"
                      />
                      <p className="prose-measure text-body text-ink-soft">{point}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
