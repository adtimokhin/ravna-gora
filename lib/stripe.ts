import Stripe from "stripe";

let cached: Stripe | null = null;

// Lazy so importing this module never throws when STRIPE_SECRET_KEY isn't
// set (e.g. this deployment hasn't been given Stripe keys yet) — callers
// check for `null` and return a friendly error instead of crashing.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;

  if (!cached) {
    cached = new Stripe(key);
  }
  return cached;
}
