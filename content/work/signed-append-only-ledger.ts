import type { CaseStudy } from "./types";

/**
 * Case study 1. CLAUDE.md §6.3.
 * Every factual claim traces to content/resume.md, Book-d.
 */
export const signedAppendOnlyLedger: CaseStudy = {
  slug: "signed-append-only-ledger",
  title: "A signed, append-only value ledger",
  company: "Book-d",
  period: "Apr 2024 – Jul 2025",
  role: "Lead Engineer, Ledger & Platform",
  problem:
    "Three product flows each wanted their own balance. One ledger primitive answered all three.",

  context: [
    "Book-d moved value between users through three separate product mechanics: share-link attribution, signup-code redemption, and provider-side onboarding credit.",
    "Each had been specified with its own notion of a balance, which meant three implementations of the same arithmetic and three chances for them to disagree.",
  ],

  constraint: {
    heading: "What made it hard",
    body: [
      "The obvious build is a balance column per feature, incremented in a transaction. It works on day one and it is the reason reconciliation teams exist on day four hundred. Once a balance is a stored figure, it can be wrong, and nothing in the system knows.",
      "The commercial terms were also still moving. Redemption rates were being negotiated while the schema was being written, so any design that encoded a rate into the ledger structure would have needed a migration every time the business changed its mind.",
      "And the value being moved was real enough to argue about. Whatever was built had to answer 'why does this user have this balance' with evidence rather than with a number.",
    ],
  },

  architecture: {
    caption:
      "Three product flows post through one ledger primitive. Balances are folded from entries on read; nothing stores a figure.",
    nodes: [
      { id: "share", label: "Share-link", sublabel: "attribution", x: 12, y: 16, kind: "client" },
      { id: "code", label: "Signup code", sublabel: "redemption", x: 12, y: 50, kind: "client" },
      { id: "provider", label: "Provider", sublabel: "onboarding credit", x: 12, y: 84, kind: "client" },
      { id: "rules", label: "Redemption rules", sublabel: "configuration, not code", x: 40, y: 84, kind: "store" },
      { id: "posting", label: "Posting service", sublabel: "one path in", x: 42, y: 40, kind: "service" },
      { id: "journal", label: "Journal", sublabel: "append-only, signed", x: 71, y: 25, kind: "ledger" },
      { id: "accounts", label: "Account schema", sublabel: "no balance column", x: 71, y: 62, kind: "store" },
      { id: "fold", label: "Derived balance", sublabel: "fold on read", x: 92, y: 44, kind: "service" },
    ],
    edges: [
      { from: "share", to: "posting", bow: -6 },
      { from: "code", to: "posting" },
      { from: "provider", to: "posting", bow: 6 },
      { from: "rules", to: "posting", bow: 4 },
      { from: "posting", to: "journal", bow: -8 },
      { from: "posting", to: "accounts", bow: 8 },
      { from: "journal", to: "fold", bow: -4 },
      { from: "accounts", to: "fold", bow: 4 },
    ],
    steps: [
      {
        title: "Three flows, one door",
        body: "Share-link attribution, code redemption and provider credit all post through a single service. There is one place where value enters the system, so there is one place to enforce every rule about it.",
        nodes: ["share", "code", "provider", "posting"],
        edges: ["share->posting", "code->posting", "provider->posting"],
      },
      {
        title: "Commercial terms as configuration",
        body: "Redemption rates are read at posting time from configuration rather than compiled into the flow. Changing what a code is worth is an operational change, not a ledger migration and a deploy.",
        nodes: ["rules", "posting"],
        edges: ["rules->posting"],
      },
      {
        title: "Append, sign, chain",
        body: "Every posting writes immutable entries. Each entry is signed over its own content plus the previous entry's signature, so the journal is a chain: alter one row and every row after it stops verifying.",
        nodes: ["posting", "journal"],
        edges: ["posting->journal"],
      },
      {
        title: "Accounts without balances",
        body: "The account schema carries identity, currency and constraints. It does not carry a balance, because a stored balance is a second copy of the truth and two copies drift.",
        nodes: ["posting", "accounts"],
        edges: ["posting->accounts"],
      },
      {
        title: "Balance is a fold",
        body: "A balance is computed by folding an account's entries on read. It cannot be wrong independently of the history, because it has no independent existence. Every credit and debit is auditable back to the event that caused it.",
        nodes: ["journal", "accounts", "fold"],
        edges: ["journal->fold", "accounts->fold"],
      },
    ],
  },

  decision: {
    heading: "The decision that mattered",
    chose: "Derive every balance by folding an immutable, signed entry history.",
    rejected: "A balance column per account, updated inside the same transaction as the entry.",
    why: [
      "The rejected option is faster to read and it is what most systems do. Its failure mode is the problem: when the column and the history disagree, the system has no way to know which is right, and the disagreement is usually discovered by a customer.",
      "Folding costs a read. That cost is bounded and can be paid down later with a snapshot that is itself derived and re-checkable. The correctness property, once given up, cannot be recovered — you cannot reconstruct an audit trail you never wrote.",
      "Signing the chain was the part that made it defensible rather than merely tidy. 'The balance is derived' answers how it was computed; 'and here is the chain' answers whether anyone changed it since.",
      "Unifying three flows onto one primitive was the commercial argument. Three bespoke balance implementations is three times the surface area for the same feature, and the reconciliation drift between them is the kind of bug that is found in aggregate months later.",
    ],
  },

  outcome: [
    {
      metricId: "bookd-rating",
      label: "Store rating, both apps",
      value: "4.7+",
      source: "content/resume.md, Book-d: both applications rated 4.7+ on iOS and Android.",
    },
    {
      label: "On-time delivery",
      value: "95%",
      source: "content/resume.md, Book-d.",
    },
    {
      label: "Value-transfer flows on one primitive",
      value: "3",
      source:
        "content/resume.md, Book-d: share-link attribution, signup-code redemption, provider-side onboarding credit.",
    },
    {
      label: "Balance columns in the schema",
      value: "0",
      source:
        "content/resume.md, Book-d: balances derived from an immutable entry history rather than stored as a mutable figure.",
    },
  ],

  stack: ["Node.js", "Express", "MongoDB", "React Native", "TypeScript"],

  whatIdChangeNow: [
    "I would put the derived balance behind a periodic snapshot from the start. Folding the full history is correct and it is also O(history); a snapshot every N entries, with the fold running from the snapshot forward and a scheduled job re-deriving from genesis to check it, keeps the correctness property and removes the growth. I deferred this and would not defer it again.",
    "I would use PostgreSQL rather than MongoDB. The workload is relational, the constraint I most wanted was a multi-row transactional guarantee, and I spent effort in the application layer that a database with real constraints would have given me for free.",
    "The architecture specification was signed off by executive and commercial stakeholders before implementation, which was right. What I would add is a short written statement of the invariants in plain language in that same document. Non-technical sign-off on 'balances are derived' is a much stronger position later than sign-off on a diagram.",
  ],

  headlineFigure: { value: "3 → 1", label: "Flows unified onto one ledger" },
};
