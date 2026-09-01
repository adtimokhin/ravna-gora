export type MembershipPlan = "supporting" | "full";
export type MembershipEdition = "digital" | "print" | "both";

// A subscription in any of these Stripe statuses is a real, running
// membership — worth showing status for and offering to cancel/switch.
// "incomplete" (an abandoned first payment), "canceled", and the rest are
// not. A user can have multiple `memberships` rows over time (see
// supabase/schema/memberships.sql), so callers pick the most recent one and
// check its status against this list rather than assuming there's only ever one row.
export const MEMBERSHIP_ACTIVE_STATUSES = ["active", "past_due", "trialing"];

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
