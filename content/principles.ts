/**
 * /approach — the CTO-seat page. CLAUDE.md §6.4.
 *
 * Written as policy, not aspiration. Every entry answers "what actually
 * happens" rather than "what we value". The four with `onLanding` set are
 * pulled into landing section 5.
 */

export interface Principle {
  readonly id: string;
  readonly title: string;
  /** One sentence. This is what the CEO reader takes away. */
  readonly summary: string;
  /** Concrete, checkable statements. Not adjectives. */
  readonly points: readonly string[];
  readonly onLanding: boolean;
}

export const principles: readonly Principle[] = [
  {
    id: "code-review",
    title: "Code review",
    summary:
      "Review standards are written down, so a rejection is a citation rather than an opinion.",
    points: [
      "Blocked: anything that lets a floating-point value reach a balance, any money-moving endpoint without an idempotency key, any migration without a tested rollback, any new secret outside the secrets manager.",
      "Commented, not blocked: naming, structure, and test shape. These are worth saying and not worth stopping a release for.",
      "Ships: changes behind a flag, with the reviewer named in the log. Authorship and approval are both part of the audit trail.",
      "I review pull requests myself. A CTO who has stopped reading the diff is guessing about the state of the system.",
    ],
    onLanding: true,
  },
  {
    id: "reliability",
    title: "Reliability",
    summary:
      "SLOs are set on the paths that carry money, and the error budget decides what ships next.",
    points: [
      "Latency objectives are set per hot path, at p95 and p99, and are chosen against the user-visible action rather than against an average across the service.",
      "Alerting fires on symptoms customers feel — failed transfers, stalled payouts, reconciliation drift — not on CPU.",
      "An incident produces a written review with a timeline, a contributing-factors section, and named follow-up work with owners. Blame is not one of the outputs.",
      "Every external rail is assumed to be down at some point. The question at design time is what the system does then, not whether it will happen.",
    ],
    onLanding: true,
  },
  {
    id: "compliance-by-construction",
    title: "Compliance by construction",
    summary:
      "KYC gates, audit trails and secrets handling are load-bearing structure, not a phase before launch.",
    points: [
      "Verification state is a precondition on the money-moving operation itself, enforced in the domain, so no new endpoint can quietly bypass it.",
      "The audit trail is the append-only journal, not a separate log that can disagree with it. There is one record of what happened.",
      "Verification lead times on external rails are surfaced during technical review and folded into the delivery plan, because a transfer capability that unlocks in six weeks is a schedule fact, not a surprise.",
      "Secrets live in a managed store with per-environment isolation and scanning in CI. No credential reaches a repository.",
    ],
    onLanding: true,
  },
  {
    id: "hiring",
    title: "Hiring",
    summary:
      "The loop is designed to find judgement under constraint, which is the thing that is actually scarce.",
    points: [
      "A system-design round tests whether a candidate names their tradeoffs and the alternative they rejected. A design with no rejected alternative was not a decision.",
      "A code-review round: a candidate reads a real diff with a real bug in it. This predicts day-to-day performance better than an algorithm question does.",
      "Every interviewer scores against written criteria before the debrief, so the loudest voice in the room does not become the decision.",
      "Structured assessment, same questions, same rubric. Consistency is what makes a rejection defensible and a hire repeatable.",
    ],
    onLanding: true,
  },
  {
    id: "governance",
    title: "Engineering governance",
    summary: "The controls are in the pipeline, so following them is the path of least resistance.",
    points: [
      "Branch protection on the default branch: review required, CI green required, no force-push.",
      "CI gates on typecheck, lint, unit tests and a bundle-size budget. A gate that can be skipped is documentation, not a gate.",
      "Environments are isolated with separate credentials and separate data. Production data does not appear in a development database.",
      "Dependency policy: additions are justified in review, and the domain layer of a financial system carries no runtime dependencies at all.",
    ],
    onLanding: false,
  },
  {
    id: "architecture",
    title: "How I decide",
    summary:
      "Financial systems are shaped by what must never happen, so that is where the design starts.",
    points: [
      "Start from the invariants. 'Debits equal credits' and 'a balance is never stored' are architectural decisions, and everything downstream is negotiable in a way they are not.",
      "Derive rather than store. A cached balance is a second copy of the truth, and two copies of the truth drift.",
      "Compensate rather than delete. A reversal is an event; an erased row is a missing answer to a question a regulator will eventually ask.",
      "Make the money-moving surface small. One path into the journal means one place to enforce every rule.",
    ],
    onLanding: false,
  },
];

export const landingPrinciples = principles.filter((principle) => principle.onLanding);
