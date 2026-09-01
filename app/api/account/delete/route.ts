import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import { getStripe } from "../../../../lib/stripe";
import { MEMBERSHIP_ACTIVE_STATUSES } from "../../../../lib/membershipPlans";

// Requires SUPABASE_SERVICE_ROLE_KEY (Project Settings → API → service_role
// in the Supabase dashboard) — not the anon key used elsewhere in the app.
// The identity of the caller is verified from their own access token before
// anything is deleted, so this route can't be used to delete another user.
export async function POST(request: Request) {
  console.log("[api/account/delete] request received");

  const admin = getSupabaseAdmin();
  console.log("[api/account/delete] getSupabaseAdmin()", { configured: !!admin });
  if (!admin) {
    console.error("[api/account/delete] SUPABASE_SERVICE_ROLE_KEY is not set — refusing");
    return NextResponse.json(
      { error: "Account deletion is not configured on this deployment." },
      { status: 500 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  console.log("[api/account/delete] auth header present?", { hasToken: !!token });
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
  console.log("[api/account/delete] getUser(token) result", {
    userId: user?.id,
    userError,
  });

  if (userError || !user) {
    console.error("[api/account/delete] token did not resolve to a user", userError);
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Every still-running subscription must be fully cancelled in Stripe before
  // the account itself can be deleted — if any cancellation fails, the
  // deletion must not proceed (an orphaned Supabase user would leave a live,
  // still-billing Stripe subscription with no account attached to manage it).
  const { data: activeMemberships, error: membershipsError } = await admin
    .from("memberships")
    .select("membership_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .in("status", MEMBERSHIP_ACTIVE_STATUSES)
    .not("stripe_subscription_id", "is", null);

  console.log("[api/account/delete] active memberships lookup", {
    userId: user.id,
    count: activeMemberships?.length ?? 0,
    membershipsError,
  });

  if (membershipsError) {
    console.error("[api/account/delete] memberships lookup failed", membershipsError);
    return NextResponse.json(
      { error: "Could not verify your subscription status. Please try again." },
      { status: 500 }
    );
  }

  if (activeMemberships && activeMemberships.length > 0) {
    const stripe = getStripe();
    if (!stripe) {
      console.error("[api/account/delete] Stripe is not configured — refusing to delete an account with an active subscription");
      return NextResponse.json(
        { error: "Could not cancel your subscription. Please try again later or contact support." },
        { status: 500 }
      );
    }

    for (const membership of activeMemberships) {
      try {
        await stripe.subscriptions.cancel(membership.stripe_subscription_id!);
        console.log("[api/account/delete] subscription cancelled", {
          userId: user.id,
          subscriptionId: membership.stripe_subscription_id,
        });
      } catch (err) {
        console.error("[api/account/delete] failed to cancel subscription — aborting deletion", {
          userId: user.id,
          subscriptionId: membership.stripe_subscription_id,
          err,
        });
        return NextResponse.json(
          { error: "Failed to cancel your subscription. Please try again or contact support before deleting your account." },
          { status: 500 }
        );
      }
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  console.log("[api/account/delete] admin.deleteUser result", { deleteError });

  if (deleteError) {
    console.error("[api/account/delete] deleteUser failed", deleteError);
    return NextResponse.json({ error: "Failed to delete account." }, { status: 500 });
  }

  console.log("[api/account/delete] user deleted successfully", { userId: user.id });
  return NextResponse.json({ ok: true });
}
