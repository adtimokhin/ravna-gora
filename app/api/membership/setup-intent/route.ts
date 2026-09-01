import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

// Creates a SetupIntent for collecting a new card without charging anything —
// used by the "update payment method" flow (app/components/ui/PaymentMethodForm.tsx).
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

  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/setup-intent] membership lookup failed", lookupError);
    return NextResponse.json({ error: `Database error: ${lookupError.message}` }, { status: 500 });
  }

  if (!membership?.stripe_customer_id) {
    return NextResponse.json({ error: "No membership found." }, { status: 404 });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: membership.stripe_customer_id,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
