/**
 * The credibility strip. CLAUDE.md §6.1 section 2.
 * Rendered as a ruled ledger, not as cards.
 *
 * Ordered oldest first, so the row order is itself the argument: remittance,
 * then wallets, then a ledger, then rails, then billing, then the CTO seat.
 */

export interface DomainRow {
  readonly domain: string;
  readonly where: string;
  readonly years: string;
  /** One line of what was actually done. Sourced from content/resume.md. */
  readonly detail: string;
  /** Slug of the case study this row expands into, where one exists. */
  readonly caseStudy?: string;
}

export const domains: readonly DomainRow[] = [
  {
    domain: "Cross-border remittance",
    where: "Lifeeremit",
    years: "2020–2021",
    detail:
      "Sender onboarding and verification, transfer initiation, status tracking, recipient payout. Transfer state machines that must never lose or duplicate a transaction.",
  },
  {
    domain: "Digital asset wallets and exchange",
    where: "Bitfinex",
    years: "2023–2024",
    detail:
      "Trading and wallet application against high-throughput exchange APIs. Precision on balances, irreversibility of on-chain transfers, confirmation-state display.",
  },
  {
    domain: "Signed append-only value ledger",
    where: "Book-d",
    years: "2024–2025",
    detail:
      "Balances derived from an immutable, cryptographically signed entry history. Three product flows unified onto one ledger primitive.",
    caseStudy: "signed-append-only-ledger",
  },
  {
    domain: "Payout rails and merchant verification",
    where: "Nexpass",
    years: "2025",
    detail:
      "Paystack Transfers for outbound partner payouts, the business-verification gate on transfer capability, and the payout reconciliation and retry path.",
    caseStudy: "payout-rails-and-verification",
  },
  {
    domain: "Subscription billing and reconciliation",
    where: "Gemma AI",
    years: "2025–",
    detail:
      "Stripe billing with webhook signature verification and idempotent event handling, plus scheduled reconciliation against the processor's record of truth.",
    caseStudy: "billing-webhooks-reconciliation",
  },
  {
    domain: "Engineering leadership",
    where: "Lisah Technologies · CTO",
    years: "Present",
    detail:
      "Architecture, engineering governance, technical hiring and interview design, production reliability practice and post-incident review.",
  },
];
