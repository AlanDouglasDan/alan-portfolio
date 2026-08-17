import { signedAppendOnlyLedger } from "./signed-append-only-ledger";
import { payoutRailsAndVerification } from "./payout-rails-and-verification";
import { billingWebhooksReconciliation } from "./billing-webhooks-reconciliation";
import type { CaseStudy } from "./types";

/**
 * Three case studies, in the order CLAUDE.md §6.3 specifies. Three is the
 * ceiling, not a starting point — a curated set is the argument.
 */
export const caseStudies: readonly CaseStudy[] = [
  signedAppendOnlyLedger,
  payoutRailsAndVerification,
  billingWebhooksReconciliation,
];

export function caseStudyBySlug(slug: string): CaseStudy | undefined {
  return caseStudies.find((study) => study.slug === slug);
}

export type { CaseStudy };
