/**
 * The resume, as typed data. Transcribed from content/resume.md.
 *
 * Nothing here is embellished. Where the source has a placeholder — the Lisah
 * start date, education — the field is simply absent rather than filled with an
 * invented value, and the page renders around the gap. CLAUDE.md §7.
 */

export interface Role {
  readonly title: string;
  readonly company: string;
  readonly location: string;
  readonly period: string;
  readonly points: readonly string[];
}

export const roles: readonly Role[] = [
  {
    title: "Chief Technology Officer",
    company: "Lisah Technologies",
    location: "Nigeria · Remote",
    period: "Present",
    points: [
      "Own end-to-end technical strategy and system architecture, setting standards for API design, data modelling, security posture and release engineering across all product surfaces.",
      "Established engineering governance: code review requirements, branch protection and CI gates, environment separation, and secrets handling policy.",
      "Lead technical hiring for backend engineering, designing the interview loop and running system design and code review rounds; scaled the engineering function through structured candidate assessment.",
      "Set production reliability practice, including monitoring and alerting coverage, incident response expectations, and post-incident review.",
      "Partner directly with product and business stakeholders to translate commercial requirements into phased technical roadmaps with defensible cost and timeline estimates.",
    ],
  },
  {
    title: "Senior Software Engineer, Payments & Platform",
    company: "Gemma AI",
    location: "Remote · Dubai",
    period: "Aug 2025 – Present",
    points: [
      "Built and operate the subscription billing system on Stripe: tokenised card transactions, webhook-driven revenue events, plan upgrade and downgrade handling, and failed-payment recovery, across sandbox and production.",
      "Implemented webhook signature verification and idempotency handling so that duplicate or replayed payment events cannot double-charge or double-credit an account.",
      "Designed the billing reconciliation layer: scheduled jobs that reconcile Stripe's record of truth against internal subscription state and flag drift for investigation.",
      "Architected an event-driven backend orchestrating Supabase, Stripe and Bland.ai, replacing traditional server infrastructure and reducing infrastructure cost by ~50%.",
      "Implemented authentication and authorisation: Supabase Auth with role-based access control, Google OAuth 2.0 and scoped API access, cutting backend maintenance overhead by ~40%.",
      "Delivered the cross-platform React Native application and Next.js web surface to App Store and Google Play, owning the full release pipeline.",
    ],
  },
  {
    title: "Lead Engineer, Ledger & Platform",
    company: "Book-d",
    location: "Remote · UK",
    period: "Apr 2024 – Jul 2025",
    points: [
      "Architected the platform's value ledger from first principles: a dedicated account schema paired with a cryptographically signed, append-only ledger, so that balances are always derived from an immutable entry history rather than stored as a mutable figure.",
      "Designed three distinct value-transfer flows (share-link attribution, signup-code redemption, provider-side onboarding credit) on a single ledger primitive, avoiding per-feature balance logic and the reconciliation drift it causes.",
      "Modelled redemption rates as configuration rather than code, so commercial terms could change without a ledger migration or a deploy.",
      "Produced the architecture specification and system diagrams reviewed and signed off by executive and commercial stakeholders before implementation.",
      "Led development of two cross-platform React Native applications on Node.js/Express and MongoDB, both rated 4.7+ on iOS and Android, with 95% on-time delivery.",
    ],
  },
  {
    title: "Backend & Payments Engineer (Contract)",
    company: "Nexpass",
    location: "Remote · Nigeria",
    period: "2025",
    points: [
      "Contracted to architect and cost a multi-surface membership platform: NestJS/Node.js backend, Next.js partner dashboard, React Native member application.",
      "Integrated Paystack Transfers for outbound partner payouts, including the business verification requirements gating transfer capability, and designed the payout reconciliation and failure-retry path.",
      "Owned the latency-critical check-in path against an explicit p95 SLO, identifying the hot-path bottleneck and the caching and indexing strategy required to hold it under load.",
      "Surfaced platform risk early during technical review (iOS Safari QR capture constraints, transfer-rail verification lead time) and folded remediation into the delivery plan rather than discovering it in production.",
      "Authored the phased delivery and cost proposal (four phases, ~10 weeks) adopted by the product owner.",
    ],
  },
  {
    title: "Mobile Engineer, Digital Assets (Contract)",
    company: "Bitfinex",
    location: "Remote · UK",
    period: "May 2023 – Mar 2024",
    points: [
      "Built and shipped a cryptocurrency trading and wallet application covering wallet balance presentation, order placement and transaction history against high-throughput exchange APIs.",
      "Worked within the correctness constraints specific to digital asset systems: precision handling on balances, irreversibility of on-chain transfers, and confirmation-state display.",
      "Increased mobile engagement 30% and attributable revenue 13% within six months; 4.4-star rating across platforms.",
      "Implemented CI/CD with GitHub Actions and Docker for repeatable, reviewable release deployment.",
    ],
  },
  {
    title: "Full Stack Engineer (Contract)",
    company: "Dopper",
    location: "Remote · Netherlands",
    period: "Feb 2022 – Jun 2023",
    points: [
      "Reduced production crash rate 50% through proactive triage, error monitoring and instrumentation.",
      "Integrated analytics and observability platforms, contributing to a 35% increase in user retention.",
      "Built automated delivery pipelines and testing frameworks.",
    ],
  },
  {
    title: "Software Engineer (Contract)",
    company: "Jumia Group",
    location: "Remote · Nigeria",
    period: "Sep 2021 – Feb 2022",
    points: [
      "Shipped a high-traffic eCommerce application (4.6-star rating, 20% engagement increase) with integrated checkout and payment flows.",
      "Architected reusable component and service layers, reducing downstream development time 30%.",
    ],
  },
  {
    title: "MERN Stack Engineer",
    company: "Lifeeremit",
    location: "Remote · Nigeria",
    period: "Oct 2020 – Aug 2021",
    points: [
      "Engineered features for a cross-border remittance platform across the money-movement lifecycle: sender onboarding and verification, transfer initiation, status tracking, and recipient payout.",
      "Built against the constraints that define remittance engineering: transfer state machines that must never lose or duplicate a transaction, verification requirements before value can move, and correspondent-side status reconciliation.",
      "Introduced automated testing, reducing regression defects 33% in a domain where a regression is a mishandled transfer, not a cosmetic bug.",
    ],
  },
  {
    title: "Software Developer",
    company: "Independent",
    location: "Nigeria",
    period: "Apr 2019 – Sep 2020",
    points: [
      "Delivered responsive web applications for a range of clients under fixed budget and timeline constraints.",
    ],
  },
];

export const selectedProject = {
  title: "Cross-Border Wallet Ledger",
  note: "open source",
  description:
    "Reference implementation of a multi-currency digital wallet on a strict double-entry ledger: immutable journal entries, derived balances, idempotency keys on every money-moving endpoint, FX quote locking with expiry, simulated correspondent payout rails, and an automated end-of-day reconciliation report.",
  stack: ["Node.js", "NestJS", "PostgreSQL", "Docker"],
} as const;
