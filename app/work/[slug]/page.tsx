import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SystemDiagram } from "@/components/diagrams/SystemDiagram";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { Reveal } from "@/components/motion/Reveal";
import { caseStudies, caseStudyBySlug } from "@/content/work";

export function generateStaticParams() {
  return caseStudies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (study === undefined) return {};
  return {
    title: `${study.title} · ${study.company}`,
    description: study.problem,
  };
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const study = caseStudyBySlug(slug);
  if (study === undefined) notFound();

  const others = caseStudies.filter((candidate) => candidate.slug !== study.slug);

  return (
    <article className="mx-auto w-full max-w-[1240px] px-6 py-10 md:py-16">
      <header className="max-w-[68ch]">
        <p className="label mb-5 text-ink-faint">
          {study.company} · {study.role} · {study.period}
        </p>
        <h1
          className="text-display-l text-ink"
          style={{ viewTransitionName: `case-study-${study.slug}` }}
        >
          {study.title}
        </h1>
        <p className="mt-6 text-body-l text-ink-soft">{study.context[0]}</p>
        <p className="mt-3 text-body-l text-ink-soft">{study.context[1]}</p>
      </header>

      <section className="rule-t mt-14 pt-12" aria-labelledby="constraint">
        <h2 id="constraint" className="text-display-m text-ink">
          {study.constraint.heading}
        </h2>
        <div className="prose-measure mt-5 space-y-4">
          {study.constraint.body.map((paragraph) => (
            <p key={paragraph} className="text-body text-ink-soft">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="architecture">
        <h2 id="architecture" className="mb-10 text-display-m text-ink">
          Architecture
        </h2>
        <SystemDiagram architecture={study.architecture} />
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="decision">
        <h2 id="decision" className="text-display-m text-ink">
          {study.decision.heading}
        </h2>

        <div className="mt-6 grid gap-px border border-rule bg-rule md:grid-cols-2">
          <div className="bg-credit-wash p-6">
            <p className="label text-credit">Chose</p>
            <p className="mt-2 text-body-l text-ink">{study.decision.chose}</p>
          </div>
          <div className="bg-paper-sunk p-6">
            <p className="label text-ink-faint">Rejected</p>
            <p className="mt-2 text-body-l text-ink-soft">{study.decision.rejected}</p>
          </div>
        </div>

        <div className="prose-measure mt-6 space-y-4">
          {study.decision.why.map((paragraph) => (
            <p key={paragraph} className="text-body text-ink-soft">
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="outcome">
        <h2 id="outcome" className="text-display-m text-ink">
          Outcome
        </h2>
        <dl className="mt-6 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {study.outcome.map((figure, index) => (
            <Reveal key={figure.label} delay={index * 0.05} className="bg-paper p-6">
              <dt className="label text-ink-faint">{figure.label}</dt>
              <dd className="mt-2 text-display-m text-ink">
                <Figure>{figure.value}</Figure>
              </dd>
            </Reveal>
          ))}
        </dl>
        <p className="mt-4 text-body-s text-ink-faint">
          Every figure above traces to a line in the resume; provenance is recorded
          in <code className="tnum">content/metrics.ts</code>.
        </p>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="stack">
        <h2 id="stack" className="text-display-m text-ink">
          Stack
        </h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {study.stack.map((item) => (
            <li key={item}>
              <Tag>{item}</Tag>
            </li>
          ))}
        </ul>
      </section>

      <section className="rule-t mt-14 pt-12" aria-labelledby="change">
        <h2 id="change" className="text-display-m text-ink">
          What I would change now
        </h2>
        <p className="prose-measure mt-3 text-body-s text-ink-faint">
          Every project has this section. A candidate whose work was all triumph is
          either junior or not telling you everything.
        </p>
        <ol className="mt-6 space-y-6">
          {study.whatIdChangeNow.map((item, index) => (
            <li key={item} className="flex gap-5">
              <span className="tnum shrink-0 text-body-s text-ink-faint" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p className="prose-measure text-body text-ink-soft">{item}</p>
            </li>
          ))}
        </ol>
      </section>

      <nav className="rule-t mt-16 pt-10" aria-label="Other case studies">
        <p className="label mb-4 text-ink-faint">Also worth reading</p>
        <ul className="grid gap-px border border-rule bg-rule sm:grid-cols-2">
          {others.map((other) => (
            <li key={other.slug} className="bg-paper">
              <Link
                href={{ pathname: `/work/${other.slug}` }}
                className="block h-full p-6 no-underline transition-colors hover:bg-paper-sunk"
              >
                <span className="label block text-ink-faint">{other.company}</span>
                <span className="mt-2 block font-display text-display-m text-ink">
                  {other.title}
                </span>
                <span className="mt-2 block text-body-s text-ink-soft">
                  {other.problem}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
