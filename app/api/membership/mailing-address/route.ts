import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

type Address = {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

function isCompleteAddress(a: Address | undefined): a is Address {
  return !!a && !!a.line1 && !!a.city && !!a.state && !!a.postal_code && !!a.country;
}

// Lets a member update their mailing address on its own from the account
// page, independent of checkout — see app/api/membership/billing-info/route.ts
// for the checkout-time version, which also sets billing name/address.
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

  const body: { name?: string; address?: Address } = await request.json().catch(() => ({}));

  if (!body.name || !isCompleteAddress(body.address)) {
    return NextResponse.json({ error: "Missing mailing address." }, { status: 400 });
  }

  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("membership_id, stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/mailing-address] membership lookup failed", lookupError);
    return NextResponse.json({ error: `Database error: ${lookupError.message}` }, { status: 500 });
  }

  if (!membership?.stripe_customer_id) {
    return NextResponse.json({ error: "No membership found." }, { status: 404 });
  }

  await stripe.customers.update(membership.stripe_customer_id, {
    shipping: { name: body.name, address: body.address },
  });

  const { error: upsertError } = await admin.from("mailing_addresses").upsert(
    {
      membership_id: membership.membership_id,
      user_id: user.id,
      recipient_name: body.name,
      line1: body.address.line1,
      line2: body.address.line2 || null,
      city: body.address.city,
      state: body.address.state,
      postal_code: body.address.postal_code,
      country: body.address.country,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "membership_id" }
  );

  if (upsertError) {
    console.error("[api/membership/mailing-address] mailing_addresses upsert failed", upsertError);
    return NextResponse.json({ error: `Database error: ${upsertError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
