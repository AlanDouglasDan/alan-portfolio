import type { Metadata } from "next";
import { Tag } from "@/components/primitives/Tag";
import { Figure } from "@/components/primitives/Figure";
import { PrintButton } from "@/components/sections/PrintButton";
import { profile } from "@/content/profile";
import { roles, selectedProject } from "@/content/experience";

export const metadata: Metadata = {
  title: "Resume",
  description: profile.summary,
};

export default function ResumePage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-6 py-10 md:py-16">
      <header className="rule-b pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <h1 className="text-display-l text-ink">{profile.name}</h1>
            <p className="label mt-3 text-ink-faint">
              {profile.role} · {profile.discipline}
            </p>
          </div>
          <PrintButton />
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <li className="text-body-s text-ink-soft">{profile.location}</li>
          {profile.links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                {...(link.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="text-body-s text-ink-soft underline decoration-rule underline-offset-4 hover:text-signal hover:decoration-signal"
              >
                {link.display}
              </a>
            </li>
          ))}
          <li className="text-body-s text-ink-soft">
            <Figure tone="faint" label="phone: plus two three four, eight one three, three eight one, four four four two">
              {profile.phone}
            </Figure>
          </li>
        </ul>
      </header>

      <section className="rule-b py-8" aria-labelledby="summary">
        <h2 id="summary" className="label mb-4 text-ink-faint">
          Professional summary
        </h2>
        <p className="text-body text-ink-soft">
          Engineering leader with 6+ years building and operating payment
          infrastructure, digital wallets and cross-border money movement systems.
          Currently CTO at Lisah Technologies, where I own system architecture,
          engineering governance, technical hiring and production reliability.
          Hands-on track record across remittance platforms, crypto and stablecoin
          wallet applications, append-only financial ledgers and payout rail
          integrations. Deep in TypeScript/Node.js microservices, PostgreSQL,
          AWS/GCP and DevSecOps practice. I set the architecture and I still review
          the pull requests.
        </p>
      </section>

      <section className="rule-b py-8" aria-labelledby="experience">
        <h2 id="experience" className="label mb-6 text-ink-faint">
          Professional experience
        </h2>

        <ol className="space-y-10">
          {roles.map((role) => (
            <li key={`${role.company}-${role.period}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h3 className="font-display text-display-m text-ink">
                  {role.title} — {role.company}
                </h3>
                <p className="text-body-s text-ink-faint">
                  <Figure tone="faint">{role.period}</Figure>
                </p>
              </div>
              <p className="label mt-1 text-ink-faint">{role.location}</p>

              <ul className="mt-4 space-y-2.5">
                {role.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span
                      className="mt-2.5 h-px w-3 shrink-0 bg-rule"
                      aria-hidden="true"
                    />
                    <p className="text-body-s text-ink-soft">{point}</p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section className="rule-b py-8" aria-labelledby="project">
        <h2 id="project" className="label mb-4 text-ink-faint">
          Selected project
        </h2>
        <h3 className="font-display text-display-m text-ink">
          {selectedProject.title}{" "}
          <span className="label align-middle text-ink-faint">
            {selectedProject.note}
          </span>
        </h3>
        <p className="mt-3 text-body-s text-ink-soft">{selectedProject.description}</p>
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {selectedProject.stack.map((item) => (
            <li key={item}>
              <Tag>{item}</Tag>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-body-s text-ink-faint">
          The interactive ledger on this site is a browser-native sibling of that
          project: the same invariants, implemented as a pure TypeScript domain
          module you can try to break.
        </p>
      </section>

      <section className="py-8" aria-labelledby="education">
        <h2 id="education" className="label mb-4 text-ink-faint">
          Education and certifications
        </h2>
        <p className="text-body-s text-ink-soft">
          Available on request.
        </p>
      </section>
    </div>
  );
}
