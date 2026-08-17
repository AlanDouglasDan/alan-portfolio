/**
 * Every number that appears anywhere on this site.
 *
 * The `source` field is not decoration. CLAUDE.md §7: if the provenance cannot
 * be written down, the number does not ship. A figure discovered to be
 * invented in an interview costs more than the figure was ever worth.
 *
 * The type makes this structural rather than aspirational — `source` is
 * required, so a metric without one will not compile.
 */

export interface Metric {
  readonly id: string;
  /** The integer to animate. Scaled by `decimals` where there is a fraction. */
  readonly value: number;
  readonly decimals?: number;
  readonly prefix?: string;
  readonly suffix?: string;
  /** What the number is. Short enough for a column head. */
  readonly label: string;
  /** Where it comes from. Required. */
  readonly source: string;
  /** Spoken form for screen readers. */
  readonly spoken: string;
}

export const heroMetrics: readonly Metric[] = [
  {
    id: "years",
    value: 6,
    suffix: "+",
    label: "Years in payments",
    source:
      "content/resume.md, professional summary: '6+ years building and operating payment infrastructure'.",
    spoken: "Six or more years in payments",
  },
  {
    id: "ledger-flows",
    value: 3,
    label: "Product flows, one ledger",
    source:
      "content/resume.md, Book-d: three value-transfer flows (share-link attribution, signup-code redemption, provider-side onboarding credit) built on a single ledger primitive.",
    spoken: "Three product flows on one ledger primitive",
  },
  {
    id: "infra-cost",
    value: 50,
    prefix: "−",
    suffix: "%",
    label: "Infrastructure cost",
    source:
      "content/resume.md, Gemma AI: event-driven backend replacing traditional server infrastructure, reducing infrastructure cost by approximately 50%.",
    spoken: "Fifty percent reduction in infrastructure cost",
  },
  {
    id: "on-time",
    value: 95,
    suffix: "%",
    label: "On-time delivery",
    source:
      "content/resume.md, Book-d: two cross-platform applications delivered with 95% on-time delivery.",
    spoken: "Ninety-five percent on-time delivery",
  },
];

export const caseStudyMetrics: readonly Metric[] = [
  {
    id: "bookd-rating",
    value: 47,
    decimals: 1,
    label: "App store rating",
    source: "content/resume.md, Book-d: both applications rated 4.7+ on iOS and Android.",
    spoken: "Four point seven star rating",
  },
  {
    id: "nexpass-phases",
    value: 4,
    label: "Delivery phases",
    source:
      "content/resume.md, Nexpass: phased delivery and cost proposal, four phases over approximately ten weeks, adopted by the product owner.",
    spoken: "Four delivery phases",
  },
  {
    id: "nexpass-weeks",
    value: 10,
    suffix: " wks",
    label: "Proposed timeline",
    source: "content/resume.md, Nexpass: approximately 10 weeks across four phases.",
    spoken: "Approximately ten weeks",
  },
  {
    id: "gemma-maintenance",
    value: 40,
    prefix: "−",
    suffix: "%",
    label: "Backend maintenance",
    source:
      "content/resume.md, Gemma AI: Supabase Auth with role-based access control, Google OAuth 2.0 and scoped API access, cutting backend maintenance overhead by approximately 40%.",
    spoken: "Forty percent reduction in backend maintenance overhead",
  },
  {
    id: "bitfinex-engagement",
    value: 30,
    prefix: "+",
    suffix: "%",
    label: "Mobile engagement",
    source:
      "content/resume.md, Bitfinex: increased mobile engagement 30% within six months.",
    spoken: "Thirty percent increase in mobile engagement",
  },
  {
    id: "bitfinex-revenue",
    value: 13,
    prefix: "+",
    suffix: "%",
    label: "Attributable revenue",
    source:
      "content/resume.md, Bitfinex: attributable revenue up 13% within six months.",
    spoken: "Thirteen percent increase in attributable revenue",
  },
  {
    id: "lifeeremit-defects",
    value: 33,
    prefix: "−",
    suffix: "%",
    label: "Regression defects",
    source:
      "content/resume.md, Lifeeremit: introduced automated testing, reducing regression defects 33%.",
    spoken: "Thirty-three percent fewer regression defects",
  },
  {
    id: "dopper-crash",
    value: 50,
    prefix: "−",
    suffix: "%",
    label: "Production crash rate",
    source:
      "content/resume.md, Dopper: reduced production crash rate 50% through triage, error monitoring and instrumentation.",
    spoken: "Fifty percent reduction in production crash rate",
  },
];

export const allMetrics: readonly Metric[] = [...heroMetrics, ...caseStudyMetrics];

export function metric(id: string): Metric {
  const found = allMetrics.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`No metric registered with id "${id}". Add it to content/metrics.ts.`);
  }
  return found;
}
