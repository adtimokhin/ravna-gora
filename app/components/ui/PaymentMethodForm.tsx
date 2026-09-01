"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useAuth } from "../providers/AuthProvider";
import { Link, useRouter } from "../../../i18n/navigation";
import { getStripeClient } from "../../../lib/stripe-client";
import { STRIPE_APPEARANCE, STRIPE_ELEMENTS_FONTS } from "../../../lib/stripeAppearance";
import { Message } from "./account/shared";

function UpdateForm({ accessToken }: { accessToken: string }) {
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

    const { error: confirmError, setupIntent } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/account` },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? t("checkoutError"));
      setSubmitting(false);
      return;
    }

    const paymentMethodId =
      typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : setupIntent?.payment_method?.id;

    if (!paymentMethodId) {
      setError(t("checkoutError"));
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/membership/payment-method", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ paymentMethodId }),
    });
    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setError(body?.error ?? t("checkoutError"));
      setSubmitting(false);
      return;
    }

    router.push("/account");
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
        {submitting ? t("processing") : t("savePaymentMethod")}
      </button>
    </form>
  );
}

export function PaymentMethodForm() {
  const t = useTranslations("membership");
  const { user, session, loading: authLoading } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise] = useState(() => getStripeClient());
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !session) return;
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    (async () => {
      const res = await fetch("/api/membership/setup-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? t("checkoutError"));
        return;
      }
      setClientSecret(body.clientSecret);
    })();
  }, [authLoading, user, session, t]);

  return (
    <div className="flex flex-col gap-8 w-full xl:max-w-155">
      <div className="flex flex-col gap-2">
        <Link href="/account" className="type-caption text-blue-2 hover:underline self-start">
          {t("backToAccount")}
        </Link>
        <h1 className="type-h2 text-black">{t("updatePaymentMethodHeading")}</h1>
        <p className="type-body text-gray-2">{t("updatePaymentMethodDesc")}</p>
      </div>

      {!user && !authLoading && (
        <div className="border border-black/15 p-6 flex flex-col gap-3">
          <p className="type-h4 text-black">{t("signInRequired")}</p>
          <p className="type-body text-gray-2">{t("signInToManage")}</p>
          <Link href="/login" className="type-ui-medium text-blue-2 hover:underline self-start">
            {t("signInCta")}
          </Link>
        </div>
      )}

      {error && <Message text={error} ok={false} />}

      {user && !clientSecret && !error && (
        <p className="type-body text-gray-2">{t("processing")}</p>
      )}

      {user && clientSecret && session && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: STRIPE_APPEARANCE, fonts: STRIPE_ELEMENTS_FONTS }}
        >
          <UpdateForm accessToken={session.access_token} />
        </Elements>
      )}
    </div>
  );
}
