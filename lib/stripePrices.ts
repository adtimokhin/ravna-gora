import type { MembershipEdition, MembershipPlan } from "./membershipPlans";

// Client-side plan/edition → Stripe Price ID. Price resolution lives in the
// browser now: the frontend picks a price id from public config and the
// Worker's POST /create-checkout-session validates it against its own
// STRIPE_PRICE_MAP (a Worker secret). Every value below MUST also be a key
// in that map or the Worker returns 400 "Unknown price_id".
//
// "both" and "print" intentionally point at separate price ids; the Worker
// maps "both" to { plan: "supporting", edition: "print" }, so a both-tier
// member reads back as "print" on the account page — a known, harmless
// cosmetic limitation (digital access is identical for every active tier).
export function getPriceId(
  plan: MembershipPlan,
  edition?: MembershipEdition | null
): string | undefined {
  if (plan === "full") return process.env.NEXT_PUBLIC_STRIPE_PRICE_FULL;

  switch (edition) {
    case "digital":
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_SUPPORTING_DIGITAL;
    case "print":
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_SUPPORTING_PRINT;
    case "both":
      return process.env.NEXT_PUBLIC_STRIPE_PRICE_SUPPORTING_BOTH;
    default:
      return undefined;
  }
}
