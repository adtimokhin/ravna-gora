"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import { useAuth } from "../providers/AuthProvider";
import { Link, useRouter } from "../../../i18n/navigation";
import { getStripeClient } from "../../../lib/stripe-client";
import { Message } from "./account/shared";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

const PLAN_PRICE_KEY: Record<Plan, "supportingPrice" | "fullPrice"> = {
  supporting: "supportingPrice",
  full: "fullPrice",
};

const APPEARANCE: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#153c8c",
    colorBackground: "#ffffff",
    colorText: "#000000",
    colorDanger: "#dc2626",
    // The site's Inter is self-hosted via next/font and isn't reachable from
    // Stripe's sandboxed iframe, so this falls back to the closest system
    // sans-serif rather than pulling in a second font-loading mechanism.
    fontFamily: '"Inter", system-ui, sans-serif',
    borderRadius: "0px",
  },
  rules: {
    ".Input": {
      border: "1px solid rgba(0,0,0,0.2)",
      boxShadow: "none",
      padding: "12px 16px",
    },
    ".Input:focus": {
      border: "1px solid #153c8c",
      boxShadow: "none",
    },
    ".Label": {
      color: "rgba(0,0,0,0.5)",
      fontWeight: "500",
      fontSize: "12px",
    },
  },
};

function PaymentSubmitForm({
  isDonationOnly,
}: {
  isDonationOnly: boolean;
}) {
  const t = useTranslations("membership");
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setSubmitting(true);
    setError(null);

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/membership/success?type=${isDonationOnly ? "donation" : "membership"}`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? t("checkoutError"));
      setSubmitting(false);
      return;
    }

    router.push(`/membership/success?type=${isDonationOnly ? "donation" : "membership"}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PaymentElement />

      {error && <Message text={error} ok={false} />}

      <button
        type="submit"
        disabled={!stripe || submitting}
        className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {submitting ? t("processing") : t("payNow")}
      </button>
    </form>
  );
}

export function CheckoutForm({
  plan,
  edition,
  donationCents,
}: {
  plan: Plan | null;
  edition: Edition | null;
  donationCents: number;
}) {
  const t = useTranslations("membership");
  const { user, session, loading: authLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stable for the lifetime of this mount (survives React StrictMode's dev-only
  // double-invoke of effects) and sent to Stripe as an idempotency key, so a
  // duplicate request for the same checkout attempt reuses the same Stripe
  // objects instead of creating a second customer/subscription.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const hasRequestedRef = useRef(false);

  const isDonationOnly = !plan;

  useEffect(() => {
    if (authLoading || !user || !session) return;
    // Guards the one real request against React StrictMode's dev-only
    // mount→cleanup→remount cycle. Deliberately not paired with a `cancelled`
    // flag on cleanup — since this ref already prevents a second attempt from
    // ever starting, the sole in-flight request must be allowed to resolve
    // and update state; discarding it here previously left the UI stuck on
    // "Processing…" forever even though the request had already succeeded.
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    (async () => {
      const res = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          plan: plan ?? undefined,
          edition: edition ?? undefined,
          donationCents,
          idempotencyKey,
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? t("checkoutError"));
        return;
      }
      setClientSecret(body.clientSecret);
    })();
  }, [authLoading, user, session, plan, edition, donationCents, idempotencyKey, t]);

  return (
    <div className="flex flex-col gap-8 w-full xl:max-w-155">
      <div className="flex flex-col gap-2">
        <Link href="/membership" className="type-caption text-blue-2 hover:underline self-start">
          {t("backToPlans")}
        </Link>
        <h1 className="type-h2 text-black">{t("paymentDetails")}</h1>
      </div>

      {/* ── Order summary ── */}
      <div className="border border-black/15 p-6 flex flex-col gap-3">
        {plan && (
          <div className="flex items-center justify-between">
            <p className="type-body text-black">
              {t(plan)}
              {edition && ` — ${t(`edition${edition.charAt(0).toUpperCase()}${edition.slice(1)}` as "editionDigital" | "editionPrint" | "editionBoth")}`}
            </p>
            <p className="type-body text-black">
              {t(PLAN_PRICE_KEY[plan])} {t("perYear")}
            </p>
          </div>
        )}
        {donationCents > 0 && (
          <div className="flex items-center justify-between">
            <p className="type-body text-black">{t("donationLineLabel")}</p>
            <p className="type-body text-black">${(donationCents / 100).toFixed(2)}</p>
          </div>
        )}
      </div>

      {!user && !authLoading && (
        <div className="border border-black/15 p-6 flex flex-col gap-3">
          <p className="type-h4 text-black">{t("signInRequired")}</p>
          <p className="type-body text-gray-2">{t("signInToContinue")}</p>
          <Link href="/login" className="type-ui-medium text-blue-2 hover:underline self-start">
            {t("signInCta")}
          </Link>
        </div>
      )}

      {error && <Message text={error} ok={false} />}

      {user && !clientSecret && !error && (
        <p className="type-body text-gray-2">{t("processing")}</p>
      )}

      {user && clientSecret && (
        <StripeElementsWrapper clientSecret={clientSecret} isDonationOnly={isDonationOnly} />
      )}
    </div>
  );
}

function StripeElementsWrapper({
  clientSecret,
  isDonationOnly,
}: {
  clientSecret: string;
  isDonationOnly: boolean;
}) {
  const [stripePromise] = useState(() => getStripeClient());

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: APPEARANCE }}>
      <PaymentSubmitForm isDonationOnly={isDonationOnly} />
    </Elements>
  );
}
