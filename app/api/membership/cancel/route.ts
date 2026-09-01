import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { MEMBERSHIP_ACTIVE_STATUSES } from "../../../../lib/membershipPlans";

// Toggles cancel_at_period_end rather than cancelling immediately — the
// member keeps access through what they already paid for, and this same
// route reactivates by passing `cancelAtPeriodEnd: false` before the period
// actually ends.
export async function POST(request: Request) {
  const stripe = getStripe();
  const admin = getSupabaseAdmin();
  if (!stripe || !admin) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment yet." },
      { status: 500 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
    error: userError,
  } = await anon.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const body: { cancelAtPeriodEnd?: boolean } = await request.json().catch(() => ({}));
  const cancelAtPeriodEnd = body.cancelAtPeriodEnd ?? true;

  // A user can have more than one membership row over time — the one worth
  // cancelling/reactivating is their most recent still-running one.
  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("membership_id, stripe_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", MEMBERSHIP_ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/cancel] membership lookup failed", lookupError);
    return NextResponse.json({ error: `Database error: ${lookupError.message}` }, { status: 500 });
  }

  if (!membership?.stripe_subscription_id) {
    return NextResponse.json({ error: "No membership found." }, { status: 404 });
  }

  const subscription = await stripe.subscriptions.update(membership.stripe_subscription_id, {
    cancel_at_period_end: cancelAtPeriodEnd,
  });

  const { error: updateError } = await admin
    .from("memberships")
    .update({
      cancel_at_period_end: subscription.cancel_at_period_end,
      status: subscription.status,
      updated_at: new Date().toISOString(),
    })
    .eq("membership_id", membership.membership_id);

  if (updateError) {
    console.error("[api/membership/cancel] memberships update failed", updateError);
    return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ cancelAtPeriodEnd: subscription.cancel_at_period_end });
}
