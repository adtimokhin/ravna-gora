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

type BillingInfoBody = {
  name?: string;
  address?: Address;
  mailingName?: string;
  mailingAddress?: Address;
};

function isCompleteAddress(a: Address | undefined): a is Address {
  return !!a && !!a.line1 && !!a.city && !!a.state && !!a.postal_code && !!a.country;
}

// Only meaningful for membership checkouts — the customer record it updates,
// and the membership_id a mailing address attaches to, both come from the
// caller's most recent `memberships` row. Donation-only checkouts don't
// persist a customer link anywhere, so this route isn't reachable for those.
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

  const body: BillingInfoBody = await request.json().catch(() => ({}));

  if (!body.name || !isCompleteAddress(body.address)) {
    return NextResponse.json({ error: "Missing billing details." }, { status: 400 });
  }

  const { data: membership, error: lookupError } = await admin
    .from("memberships")
    .select("membership_id, stripe_customer_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/billing-info] membership lookup failed", lookupError);
    return NextResponse.json({ error: `Database error: ${lookupError.message}` }, { status: 500 });
  }

  if (!membership?.stripe_customer_id) {
    return NextResponse.json({ error: "No membership found." }, { status: 404 });
  }

  const hasMailingAddress = isCompleteAddress(body.mailingAddress);

  await stripe.customers.update(membership.stripe_customer_id, {
    name: body.name,
    address: body.address,
    ...(hasMailingAddress
      ? { shipping: { name: body.mailingName || body.name, address: body.mailingAddress! } }
      : {}),
  });

  if (hasMailingAddress) {
    const { error: upsertError } = await admin.from("mailing_addresses").upsert(
      {
        membership_id: membership.membership_id,
        user_id: user.id,
        recipient_name: body.mailingName || body.name,
        line1: body.mailingAddress!.line1,
        line2: body.mailingAddress!.line2 || null,
        city: body.mailingAddress!.city,
        state: body.mailingAddress!.state,
        postal_code: body.mailingAddress!.postal_code,
        country: body.mailingAddress!.country,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "membership_id" }
    );

    if (upsertError) {
      console.error("[api/membership/billing-info] mailing_addresses upsert failed", upsertError);
      return NextResponse.json({ error: `Database error: ${upsertError.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
