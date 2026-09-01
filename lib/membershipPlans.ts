export type MembershipPlan = "supporting" | "full";
export type MembershipEdition = "digital" | "print" | "both";

// Single source of truth for resolving a plan/edition to its Stripe Price ID.
// Returns undefined until the corresponding env var is set (see .env.local).
export function getPriceId(plan: MembershipPlan, edition?: MembershipEdition): string | undefined {
  if (plan === "full") return process.env.STRIPE_PRICE_FULL;

  switch (edition) {
    case "digital":
      return process.env.STRIPE_PRICE_SUPPORTING_DIGITAL;
    case "print":
      return process.env.STRIPE_PRICE_SUPPORTING_PRINT;
    case "both":
      return process.env.STRIPE_PRICE_SUPPORTING_BOTH;
    default:
      return undefined;
  }
}
