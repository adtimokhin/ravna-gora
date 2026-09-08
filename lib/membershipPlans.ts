export type MembershipPlan = "supporting" | "full";
export type MembershipEdition = "digital" | "print" | "both";

// A subscription in any of these Stripe statuses is a real, running
// membership — worth showing status for and offering to cancel. "incomplete"
// (an abandoned first payment), "canceled", and the rest are not. A user can
// have multiple `memberships` rows over time (see
// supabase/schema/memberships.sql), so callers pick the most recent one and
// check its status against this list rather than assuming there's only ever one row.
export const MEMBERSHIP_ACTIVE_STATUSES = ["active", "past_due", "trialing"];

// Plan/edition → Stripe Price ID resolution moved to the client
// (lib/stripePrices.ts) and is validated by the Worker's
// POST /create-checkout-session against its own STRIPE_PRICE_MAP.
