import type { CaseStudy } from "./types";

/**
 * Case study 2. CLAUDE.md §6.3.
 * Every factual claim traces to content/resume.md, Nexpass.
 */
export const payoutRailsAndVerification: CaseStudy = {
  slug: "payout-rails-and-verification",
  title: "Payout rails and merchant verification",
  company: "Nexpass",
  period: "2025",
  role: "Backend & Payments Engineer (Contract)",
  problem:
    "The transfer rail would not turn on until business verification cleared. That is a schedule fact, and it belonged in the plan.",

  context: [
    "Nexpass needed a multi-surface membership platform — a NestJS backend, a Next.js partner dashboard and a React Native member application — with outbound payouts to partners.",
    "Payouts ran on Paystack Transfers, where the ability to send money at all is gated behind business verification with its own lead time.",
  ],

  constraint: {
    heading: "What made it hard",
    body: [
      "Two constraints sat outside the code and neither would move for it. Transfer capability on the rail unlocks only after business verification completes, and iOS Safari places real limits on QR capture, which the member check-in flow depended on.",
      "Both are the kind of thing normally discovered during launch week, when the remedy is a delay and an awkward conversation. The engineering question was not how to remove them — they cannot be removed — but when they would be found.",
      "The check-in path was also latency-critical: it runs at a door with a queue behind it, which makes p95 the number that matters and an average actively misleading.",
    ],
  },

  architecture: {
    caption:
      "Payout initiation, the verification gate, and the retry and reconciliation path around an external rail.",
    nodes: [
      { id: "dashboard", label: "Partner dashboard", sublabel: "Next.js", x: 11, y: 20, kind: "client" },
      { id: "member", label: "Member app", sublabel: "React Native", x: 11, y: 74, kind: "client" },
      { id: "api", label: "Payout service", sublabel: "NestJS", x: 39, y: 30, kind: "service" },
      { id: "checkin", label: "Check-in path", sublabel: "p95 SLO", x: 39, y: 80, kind: "service" },
      { id: "gate", label: "Verification gate", sublabel: "precondition, not a check", x: 65, y: 12, kind: "store" },
      { id: "clearing", label: "In-flight clearing", sublabel: "money has a location", x: 65, y: 48, kind: "ledger" },
      { id: "rail", label: "Paystack Transfers", sublabel: "external rail", x: 89, y: 30, kind: "external" },
      { id: "recon", label: "Reconciliation", sublabel: "statement vs journal", x: 89, y: 72, kind: "service" },
    ],
    edges: [
      { from: "dashboard", to: "api", bow: -5 },
      { from: "member", to: "checkin", bow: 5 },
      { from: "api", to: "gate", bow: -7 },
      { from: "api", to: "clearing", bow: 5 },
      { from: "clearing", to: "rail", bow: -6 },
      { from: "rail", to: "recon", bow: 6 },
      { from: "recon", to: "clearing", bow: 10 },
      { from: "checkin", to: "api", bow: -8 },
    ],
    steps: [
      {
        title: "Verification is a precondition, not a checkbox",
        body: "The gate sits in front of the payout operation itself rather than in the dashboard that calls it. A new endpoint cannot forget to check it, because there is no path to the rail that goes around it.",
        nodes: ["api", "gate"],
        edges: ["api->gate"],
      },
      {
        title: "Money in flight has a location",
        body: "On initiation, value leaves the partner's balance and lands in a clearing account. It is not simply 'gone until the rail replies'. Anything in clearing is answerable at any moment.",
        nodes: ["api", "clearing"],
        edges: ["api->clearing"],
      },
      {
        title: "The rail is assumed to fail",
        body: "Transfers to Paystack are retried on a bounded schedule with the same idempotency key, so a retry after a timeout cannot become a second payment. A terminal failure posts a compensating entry that returns the value; the failed attempt stays on the record.",
        nodes: ["clearing", "rail"],
        edges: ["clearing->rail"],
      },
      {
        title: "Reconcile against their record, not ours",
        body: "The rail's statement is matched against the journal on a schedule. Breaks are separated into drift, movements they made that we did not record, and payouts we recorded that never left — three different problems that a single 'unmatched' count would hide.",
        nodes: ["rail", "recon", "clearing"],
        edges: ["rail->recon", "recon->clearing"],
      },
      {
        title: "The hot path is measured where it hurts",
        body: "Check-in is the latency-critical path, held against an explicit p95 objective. The bottleneck was identified during technical review, along with the caching and indexing strategy needed to hold it under load.",
        nodes: ["member", "checkin", "api"],
        edges: ["member->checkin", "checkin->api"],
      },
    ],
  },

  decision: {
    heading: "The decision that mattered",
    chose:
      "Surface the rail's verification lead time and the iOS Safari QR constraint during technical review, and build the delivery plan around them.",
    rejected:
      "Build to the happy path, integrate the rail late, and handle verification as a launch task.",
    why: [
      "The rejected option is the default, and it is not stupid: it defers work that might turn out to be unnecessary. It fails because verification lead time is not engineering work you can compress by working harder — it is waiting, and waiting discovered in launch week is a slipped launch.",
      "Naming both risks in technical review converted them from surprises into scheduled items. The verification application could start immediately, in parallel with the build, so the lead time ran concurrently with work rather than after it.",
      "The same review produced a four-phase delivery and cost proposal of roughly ten weeks, which the product owner adopted. A plan that names its external dependencies is a plan someone can commit to.",
      "This is the part of the job that is not code. The technical decision was ordinary; the decision to go looking for the non-negotiable constraints before writing anything is what made the estimate hold.",
    ],
  },

  outcome: [
    {
      metricId: "nexpass-phases",
      label: "Delivery phases proposed and adopted",
      value: "4",
      source:
        "content/resume.md, Nexpass: phased delivery and cost proposal adopted by the product owner.",
    },
    {
      metricId: "nexpass-weeks",
      label: "Proposed timeline",
      value: "~10 weeks",
      source: "content/resume.md, Nexpass.",
    },
    {
      label: "Latency objective on the check-in path",
      value: "explicit p95",
      source:
        "content/resume.md, Nexpass: owned the latency-critical check-in path against an explicit p95 SLO.",
    },
    {
      label: "Platform risks surfaced in review rather than at launch",
      value: "2",
      source:
        "content/resume.md, Nexpass: iOS Safari QR capture constraints and transfer-rail verification lead time.",
    },
  ],

  stack: ["NestJS", "Node.js", "Next.js", "React Native", "Paystack Transfers", "PostgreSQL"],

  whatIdChangeNow: [
    "I would write the reconciliation job before the payout endpoint, not after it. Building the happy path first means the first real reconciliation run is also the first time you learn which fields the rail actually returns, and that is a bad week to find out.",
    "The retry schedule was bounded but the dead-letter path was thinner than it should have been. A payout that exhausts its retries needs an owner, a queue a human looks at, and an alert — not just a status field that is correct and unread.",
    "I would push harder, earlier, for the QR constraint to change the product decision rather than the implementation. We engineered around iOS Safari's limits competently; the better conversation was whether that flow needed to run in mobile Safari at all.",
  ],

  headlineFigure: { value: "p95", label: "Explicit SLO on the check-in hot path" },
};
