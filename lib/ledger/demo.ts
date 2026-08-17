/**
 * The world the playground starts in.
 *
 * A deliberately small chart of accounts — nine accounts is enough to show
 * double entry, an FX position, and money in flight, and few enough that a
 * non-technical reader can hold all of them at once.
 */

import { money } from "./money";
import type { Account } from "./types";
import type { StatementLine } from "./reconcile";

export const ACCOUNT_IDS = {
  adaWallet: "cust:ada",
  tomWallet: "cust:tom",
  treasuryNgn: "treasury:ngn",
  treasuryGbp: "treasury:gbp",
  fxPositionNgn: "fxpos:ngn",
  fxPositionGbp: "fxpos:gbp",
  payoutClearing: "clearing:payout",
  railNostro: "rail:gbp",
  feeRevenue: "revenue:fees",
} as const;

export const DEMO_ACCOUNTS: readonly Account[] = [
  {
    id: ACCOUNT_IDS.adaWallet,
    name: "Ada Nwosu · wallet",
    type: "liability",
    currency: "NGN",
    allowsNegativeBalance: false,
    description: "Customer wallet in Lagos. A liability: this is money owed to Ada.",
  },
  {
    id: ACCOUNT_IDS.tomWallet,
    name: "Tom Whitfield · wallet",
    type: "liability",
    currency: "GBP",
    allowsNegativeBalance: false,
    description: "Customer wallet in London. Cannot be overdrawn.",
  },
  {
    id: ACCOUNT_IDS.treasuryNgn,
    name: "Treasury · NGN",
    type: "asset",
    currency: "NGN",
    allowsNegativeBalance: true,
    description: "Naira held at the local partner bank.",
  },
  {
    id: ACCOUNT_IDS.treasuryGbp,
    name: "Treasury · GBP",
    type: "asset",
    currency: "GBP",
    allowsNegativeBalance: true,
    description: "Sterling held at the UK partner bank.",
  },
  {
    id: ACCOUNT_IDS.fxPositionNgn,
    name: "FX position · NGN",
    type: "equity",
    currency: "NGN",
    allowsNegativeBalance: true,
    description:
      "Where the naira leg of a cross-currency transfer lands. A non-zero balance here is currency exposure, on the balance sheet where it can be seen.",
  },
  {
    id: ACCOUNT_IDS.fxPositionGbp,
    name: "FX position · GBP",
    type: "equity",
    currency: "GBP",
    allowsNegativeBalance: true,
    description: "The sterling side of the same exposure.",
  },
  {
    id: ACCOUNT_IDS.payoutClearing,
    name: "Payouts in flight",
    type: "liability",
    currency: "GBP",
    allowsNegativeBalance: true,
    description:
      "Value that has left a customer wallet but not yet reached the rail. Money in flight is money somewhere, and somewhere needs an account.",
  },
  {
    id: ACCOUNT_IDS.railNostro,
    name: "Rail nostro · GBP",
    type: "asset",
    currency: "GBP",
    allowsNegativeBalance: true,
    description: "Our position at the payout rail. Reconciled against their statement.",
  },
  {
    id: ACCOUNT_IDS.feeRevenue,
    name: "Fee revenue",
    type: "revenue",
    currency: "GBP",
    allowsNegativeBalance: true,
    description: "Fees earned on transfers.",
  },
];

/** Opening balances posted when the playground first loads. */
export const OPENING_POSITIONS = [
  { accountId: ACCOUNT_IDS.adaWallet, treasuryId: ACCOUNT_IDS.treasuryNgn, amount: money(2_500_000_00, "NGN"), reference: "OPEN/ADA" },
  { accountId: ACCOUNT_IDS.tomWallet, treasuryId: ACCOUNT_IDS.treasuryGbp, amount: money(1_250_00, "GBP"), reference: "OPEN/TOM" },
] as const;

/**
 * The rail's end-of-day statement.
 *
 * Seeded with three deliberate breaks so the reconciliation demo has something
 * to find: one figure that differs by 40p, one movement the rail made that we
 * never recorded, and one payout we recorded that never left.
 */
export function demoStatement(postedAt: string): readonly StatementLine[] {
  return [
    {
      id: "stmt_1",
      reference: "PAYOUT/8814",
      postedAt,
      amount: money(320_00, "GBP"),
      description: "Faster Payments · A NWOSU",
    },
    {
      id: "stmt_2",
      reference: "PAYOUT/8815",
      postedAt,
      amount: money(75_40, "GBP"),
      description: "Faster Payments · T WHITFIELD",
    },
    {
      id: "stmt_3",
      reference: "PAYOUT/8816",
      postedAt,
      amount: money(1_040_00, "GBP"),
      description: "Faster Payments · K OKONKWO",
    },
    {
      id: "stmt_4",
      reference: "FEE/EOD",
      postedAt,
      amount: money(2_50, "GBP"),
      description: "Scheme fee",
    },
  ];
}
