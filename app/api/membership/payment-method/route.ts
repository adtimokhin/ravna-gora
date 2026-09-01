import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

// Sets a newly-confirmed SetupIntent's payment method as the default for
// both the customer and (if one exists) their subscription. The payment
// method itself is already attached to the customer as a side effect of
// confirming a SetupIntent created with that customer — no separate
// `paymentMethods.attach()` call needed.
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

  const body: { paymentMethodId?: string } = await request.json().catch(() => ({}));
  if (!body.paymentMethodId) {
    return NextResponse.json({ error: "Missing payment method." }, { status: 400 });
  }

  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("membership_id, stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/payment-method] membership lookup failed", lookupError);
    return NextResponse.json({ error: `Database error: ${lookupError.message}` }, { status: 500 });
  }

  if (!membership?.stripe_customer_id) {
    return NextResponse.json({ error: "No membership found." }, { status: 404 });
  }

  await stripe.customers.update(membership.stripe_customer_id, {
    invoice_settings: { default_payment_method: body.paymentMethodId },
  });

  if (membership.stripe_subscription_id) {
    await stripe.subscriptions.update(membership.stripe_subscription_id, {
      default_payment_method: body.paymentMethodId,
    });
  }

  const { error: updateError } = await admin
    .from("memberships")
    .update({ updated_at: new Date().toISOString() })
    .eq("membership_id", membership.membership_id);

  if (updateError) {
    console.error("[api/membership/payment-method] memberships update failed", updateError);
    return NextResponse.json({ error: `Database error: ${updateError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
