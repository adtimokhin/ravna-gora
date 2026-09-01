import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../../lib/stripe";
import { getSupabaseAdmin } from "../../../../lib/supabase-admin";

// Stripe's SDK needs the raw request body to verify the signature, and the
// Stripe SDK itself needs a Node runtime (not edge).
export const runtime = "nodejs";

async function handleSubscriptionEvent(subscription: Stripe.Subscription) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const periodEnd = subscription.items.data[0]?.current_period_end;
  const { plan, edition } = subscription.metadata;

  const { error } = await admin
    .from("memberships")
    .update({
      // Plan/edition switches update the subscription's own metadata (see
      // app/api/membership/checkout/route.ts) — mirrored here too as a
      // safety net alongside that route's own direct Supabase write.
      ...(plan ? { plan } : {}),
      ...(edition ? { edition } : {}),
      status: subscription.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[stripe/webhook] memberships update failed", { subscriptionId: subscription.id, error });
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  // Only donation-only checkouts insert a matching `donations` row (see
  // app/api/membership/checkout/route.ts) — a membership PaymentIntent
  // belongs to a subscription invoice instead, so this simply matches
  // nothing and no-ops for those.
  const { error } = await admin
    .from("donations")
    .update({ status: "succeeded" })
    .eq("stripe_payment_intent_id", paymentIntent.id);

  if (error) {
    console.error("[stripe/webhook] donations update failed", { paymentIntentId: paymentIntent.id, error });
  }
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
