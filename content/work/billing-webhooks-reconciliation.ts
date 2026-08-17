import type { CaseStudy } from "./types";

/**
 * Case study 3. CLAUDE.md §6.3.
 * Every factual claim traces to content/resume.md, Gemma AI.
 */
export const billingWebhooksReconciliation: CaseStudy = {
  slug: "billing-webhooks-reconciliation",
  title: "Billing, webhooks, and reconciliation",
  company: "Gemma AI",
  period: "Aug 2025 – Present",
  role: "Senior Software Engineer, Payments & Platform",
  problem:
    "A payment processor will deliver the same event twice. The system has to be unable to charge twice for it.",

  context: [
    "Gemma AI bills subscriptions through Stripe: tokenised card transactions, plan upgrades and downgrades, and failed-payment recovery, across sandbox and production.",
    "Revenue events arrive as webhooks, which are delivered at least once — never exactly once — and can arrive out of order, late, or twice.",
  ],

  constraint: {
    heading: "What made it hard",
    body: [
      "At-least-once delivery is not a caveat in the documentation, it is the contract. Any handler that assumes an event arrives once is correct in testing and wrong in production, and the failure is a customer charged twice.",
      "Webhook endpoints are also public. An endpoint that acts on its payload without verifying the signature is an endpoint where anyone who knows the URL can grant themselves a subscription.",
      "And Stripe holds the record of truth for what was actually billed. Internal subscription state is a derived view of that, which means the two can disagree, and the only question is whether the disagreement is detected or discovered.",
    ],
  },

  architecture: {
    caption:
      "Signature verification, idempotent handling, and the scheduled job that reconciles the processor's truth against internal state.",
    nodes: [
      { id: "stripe", label: "Stripe", sublabel: "record of truth", x: 11, y: 26, kind: "external" },
      { id: "verify", label: "Signature check", sublabel: "HMAC, before parsing", x: 36, y: 26, kind: "service" },
      { id: "dedupe", label: "Event log", sublabel: "event id, seen once", x: 60, y: 14, kind: "store" },
      { id: "handler", label: "Revenue handler", sublabel: "idempotent", x: 60, y: 52, kind: "service" },
      { id: "state", label: "Subscription state", sublabel: "derived view", x: 84, y: 52, kind: "store" },
      { id: "recon", label: "Scheduled reconcile", sublabel: "drift flagged", x: 84, y: 88, kind: "service" },
      { id: "recovery", label: "Failed-payment recovery", sublabel: "dunning", x: 36, y: 78, kind: "service" },
    ],
    edges: [
      { from: "stripe", to: "verify" },
      { from: "verify", to: "dedupe", bow: -6 },
      { from: "dedupe", to: "handler", bow: 5 },
      { from: "handler", to: "state" },
      { from: "state", to: "recon", bow: 5 },
      { from: "recon", to: "stripe", bow: 16 },
      { from: "handler", to: "recovery", bow: 8 },
    ],
    steps: [
      {
        title: "Verify before you parse",
        body: "The HMAC signature is checked against the raw request body before anything else happens. Parsing first and verifying later means the parser — the most complex code in the path — runs on unauthenticated input.",
        nodes: ["stripe", "verify"],
        edges: ["stripe->verify"],
      },
      {
        title: "Every event has been seen or it has not",
        body: "The processor's event id is recorded before the handler runs. A replayed event finds its own id already present and returns the original outcome, so a duplicate delivery cannot double-charge or double-credit.",
        nodes: ["verify", "dedupe"],
        edges: ["verify->dedupe"],
      },
      {
        title: "The handler is idempotent on its own",
        body: "Deduplication is a fast path, not the guarantee. The handler is written so that applying the same event twice produces the same state as applying it once, because the store can fail between recording an id and finishing the work.",
        nodes: ["dedupe", "handler", "state"],
        edges: ["dedupe->handler", "handler->state"],
      },
      {
        title: "Failure is a state, not an exception",
        body: "A failed payment moves the subscription into an explicit recovery state with its own retry schedule, rather than being retried inline and lost if the process dies.",
        nodes: ["handler", "recovery"],
        edges: ["handler->recovery"],
      },
      {
        title: "Assume the two records disagree",
        body: "A scheduled job pulls Stripe's record and compares it against internal subscription state, flagging drift for investigation. This is the check that catches the webhook that never arrived, which no amount of correctness in the handler can.",
        nodes: ["state", "recon", "stripe"],
        edges: ["state->recon", "recon->stripe"],
      },
    ],
  },

  decision: {
    heading: "The decision that mattered",
    chose:
      "Treat Stripe as the record of truth and internal subscription state as a derived view, then reconcile the two on a schedule.",
    rejected:
      "Treat internal state as authoritative once the webhook has been processed, and trust the event stream.",
    why: [
      "The rejected option is simpler and it is correct as long as every webhook arrives and is processed. That is a large assumption to hang revenue on: a dropped delivery, an endpoint outage, or a handler bug all leave the internal record confidently wrong.",
      "Naming an external system as the record of truth costs something real — a scheduled job, a comparison, an alerting path, and the discipline to treat its answer as the correct one when the two differ. It buys detection, which is the only thing that turns a silent revenue bug into a ticket.",
      "Idempotent handling and reconciliation are often presented as alternatives. They answer different questions: idempotency stops the same event being applied twice, reconciliation catches the event that was never applied at all. A billing system needs both.",
      "The wider architecture was event-driven across Supabase, Stripe and Bland.ai, replacing traditional server infrastructure and cutting infrastructure cost by roughly half. That was the commercial result; the reconciliation layer is what made it safe to run without a server to reason about.",
    ],
  },

  outcome: [
    {
      metricId: "infra-cost",
      label: "Infrastructure cost",
      value: "−50%",
      source:
        "content/resume.md, Gemma AI: event-driven backend replacing traditional server infrastructure.",
    },
    {
      metricId: "gemma-maintenance",
      label: "Backend maintenance overhead",
      value: "−40%",
      source:
        "content/resume.md, Gemma AI: Supabase Auth with RBAC, Google OAuth 2.0 and scoped API access.",
    },
    {
      label: "Surfaces shipped",
      value: "iOS · Android · Web",
      source:
        "content/resume.md, Gemma AI: React Native application and Next.js web surface delivered to App Store and Google Play.",
    },
    {
      label: "Double-charges possible from a replayed event",
      value: "0",
      source:
        "content/resume.md, Gemma AI: webhook signature verification and idempotency handling so duplicate or replayed payment events cannot double-charge or double-credit an account.",
    },
  ],

  stack: ["Stripe Billing", "Supabase", "Next.js", "React Native", "TypeScript", "Node.js"],

  whatIdChangeNow: [
    "I would make the reconciliation job's output a first-class artefact from day one — a dated report with a drift figure that someone reads on a schedule — rather than a job that logs and alerts on exceptions. A reconciliation that only speaks up when it is unhappy gives you no way to notice it has silently stopped running.",
    "I would put the webhook handlers behind a replay tool earlier. Being able to re-drive a specific historical event against the current handler, in a sandbox, turns a class of production investigation from archaeology into a two-minute check.",
    "Plan changes mid-cycle are where billing edge cases live: proration, downgrade timing, and what a customer is owed if they change twice in a period. I would write those cases down as explicit worked examples with the commercial owner before implementing, rather than deriving the intended behaviour from the processor's defaults.",
  ],

  headlineFigure: { value: "−50%", label: "Infrastructure cost, event-driven rebuild" },
};
