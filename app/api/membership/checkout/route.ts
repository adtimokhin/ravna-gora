import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";
import {
  getPriceId,
  MEMBERSHIP_ACTIVE_STATUSES,
  type MembershipEdition,
  type MembershipPlan,
} from "../../../../lib/membershipPlans";

type CheckoutBody = {
  plan?: MembershipPlan;
  edition?: MembershipEdition;
  donationCents?: number;
  idempotencyKey?: string;
};

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payments are not configured on this deployment yet." },
      { status: 500 }
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
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

  const body: CheckoutBody = await request.json().catch(() => ({}));
  const { plan, edition, donationCents, idempotencyKey } = body;
  const donation = Number.isFinite(donationCents) && donationCents! > 0 ? Math.round(donationCents!) : 0;

  if (!plan && donation === 0) {
    return NextResponse.json({ error: "Nothing to check out." }, { status: 400 });
  }

  // The client generates and re-sends the same key for the lifetime of one
  // checkout page load, so a duplicate request for the same attempt (e.g.
  // React StrictMode's dev-only double-invoke of effects, or a flaky retry)
  // reuses the same Stripe objects instead of creating new ones. Falls back
  // to a fresh key for malformed requests, which just forgoes that guarantee
  // rather than breaking the request.
  const sessionKey = idempotencyKey || crypto.randomUUID();

  // Find or create the Stripe Customer for this user, and check whether they
  // already have a running subscription (a "switch" instead of a fresh signup).
  // A user can have more than one row here over time (a canceled membership
  // followed by a new signup, etc.), so this takes their most recent one.
  const { data: existing, error: lookupError } = await admin
    .from("memberships")
    .select("membership_id, stripe_customer_id, stripe_subscription_id, status, plan, edition")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lookupError) {
    console.error("[api/membership/checkout] memberships lookup failed", lookupError);
    return NextResponse.json(
      { error: `Database error: ${lookupError.message}` },
      { status: 500 }
    );
  }

  let customerId = existing?.stripe_customer_id as string | undefined;

  // A cached customer ID can go stale — e.g. Stripe test-mode data was reset,
  // or the customer was deleted in the Dashboard — in which case Stripe 404s
  // on it rather than treating it as "no customer yet". Verify it's still
  // real before trusting it.
  if (customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) customerId = undefined;
    } catch (err) {
      if (err instanceof Stripe.errors.StripeInvalidRequestError && err.code === "resource_missing") {
        console.warn("[api/membership/checkout] cached Stripe customer no longer exists, creating a new one", {
          staleCustomerId: customerId,
          userId: user.id,
        });
        customerId = undefined;
      } else {
        throw err;
      }
    }
  }

  if (!customerId) {
    // Keyed on the user's id + this session, not the user's id alone — a
    // permanent per-user key would replay a stale/deleted customer forever
    // once Stripe caches that idempotency key's (now-invalid) response.
    const customer = await stripe.customers.create(
      {
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      },
      { idempotencyKey: `customer:${user.id}:${sessionKey}` }
    );
    customerId = customer.id;
  }

  // Donation-only checkout — a standalone one-time PaymentIntent, no subscription.
  if (!plan) {
    const paymentIntent = await stripe.paymentIntents.create(
      {
        customer: customerId,
        amount: donation,
        currency: "usd",
        description: "One-time donation",
        metadata: { supabase_user_id: user.id },
      },
      { idempotencyKey: `payment-intent:${sessionKey}` }
    );

    const { error: upsertError } = await admin
      .from("donations")
      .upsert(
        {
          user_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount_cents: donation,
          status: "pending",
        },
        { onConflict: "stripe_payment_intent_id" }
      );

    if (upsertError) {
      console.error("[api/membership/checkout] donations upsert failed", upsertError);
      return NextResponse.json(
        { error: `Database error: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  }

  // Membership checkout (optionally with a donation riding along on the
  // same invoice as a one-time line item).
  const priceId = getPriceId(plan, edition);
  if (!priceId) {
    return NextResponse.json(
      { error: "This plan isn't available yet — check back soon." },
      { status: 500 }
    );
  }

  if (donation > 0) {
    await stripe.invoiceItems.create(
      {
        customer: customerId,
        amount: donation,
        currency: "usd",
        description: "One-time donation",
      },
      { idempotencyKey: `invoice-item:${sessionKey}` }
    );
  }

  // A member with a running subscription picking a plan updates that
  // subscription in place (a "switch") instead of starting a second one.
  const hasActiveSubscription =
    existing?.stripe_subscription_id && MEMBERSHIP_ACTIVE_STATUSES.includes(existing.status ?? "");

  if (hasActiveSubscription) {
    const samePlan = existing.plan === plan && (existing.edition ?? null) === (edition ?? null);
    if (samePlan) {
      return NextResponse.json({ error: "You're already subscribed to this plan." }, { status: 400 });
    }

    const current = await stripe.subscriptions.retrieve(existing.stripe_subscription_id!);
    const itemId = current.items.data[0]?.id;
    if (!itemId) {
      console.error("[api/membership/checkout] existing subscription has no item to switch", {
        subscriptionId: existing.stripe_subscription_id,
      });
      return NextResponse.json({ error: "Could not switch plans. Please try again." }, { status: 500 });
    }

    // Deferred proration: the credit/charge for switching mid-cycle lands on
    // the next regular invoice rather than being collected right now, so this
    // needs no separate payment confirmation step.
    const updated = await stripe.subscriptions.update(
      existing.stripe_subscription_id!,
      {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: "create_prorations",
        metadata: { supabase_user_id: user.id, plan, ...(edition ? { edition } : {}) },
      },
      { idempotencyKey: `switch:${sessionKey}` }
    );

    const { error: switchUpsertError } = await admin
      .from("memberships")
      .update({
        plan,
        edition: edition ?? null,
        status: updated.status,
        updated_at: new Date().toISOString(),
      })
      .eq("membership_id", existing!.membership_id);

    if (switchUpsertError) {
      console.error("[api/membership/checkout] memberships update failed after switch", switchUpsertError);
      return NextResponse.json(
        { error: `Database error: ${switchUpsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ switched: true });
  }

  const subscription = await stripe.subscriptions.create(
    {
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      // `confirmation_secret` isn't included just by expanding `latest_invoice`
      // — despite being a plain field, not a reference, it needs its own
      // explicit expand path or it's silently omitted (confirmed against a
      // live test subscription).
      expand: ["latest_invoice.confirmation_secret"],
      metadata: { supabase_user_id: user.id, plan, ...(edition ? { edition } : {}) },
    },
    { idempotencyKey: `subscription:${sessionKey}` }
  );

  // Always a new row — a member with an active subscription already returned
  // via the switch branch above, so reaching here means this is a genuinely
  // new membership lifecycle for this user (first signup, or resubscribing
  // after a previous one lapsed/was canceled).
  const { error: insertError } = await admin.from("memberships").insert({
    user_id: user.id,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    plan,
    edition: edition ?? null,
    status: subscription.status,
  });

  if (insertError) {
    console.error("[api/membership/checkout] memberships insert failed", insertError);
    return NextResponse.json(
      { error: `Database error: ${insertError.message}` },
      { status: 500 }
    );
  }

  // The modern Stripe billing API surfaces the client secret needed to pay
  // a subscription's first invoice via `confirmation_secret` rather than a
  // directly-expanded `payment_intent` field.
  const invoice = subscription.latest_invoice;
  const clientSecret =
    invoice && typeof invoice !== "string" ? invoice.confirmation_secret?.client_secret : null;

  if (!clientSecret) {
    console.error("[api/membership/checkout] no confirmation_secret on latest_invoice", {
      subscriptionId: subscription.id,
      invoice,
    });
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ clientSecret });
}
