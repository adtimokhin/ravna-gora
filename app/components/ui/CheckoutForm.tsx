"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { StripeAddressElementChangeEvent } from "@stripe/stripe-js";
import { useAuth } from "../providers/AuthProvider";
import { Link, useRouter } from "../../../i18n/navigation";
import { getStripeClient } from "../../../lib/stripe-client";
import { STRIPE_APPEARANCE, STRIPE_ELEMENTS_FONTS } from "../../../lib/stripeAppearance";
import { Message } from "./account/shared";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";
type EditionKey = "editionDigital" | "editionPrint" | "editionBoth";

const PLAN_PRICE_KEY: Record<Plan, "supportingPrice" | "fullPrice"> = {
  supporting: "supportingPrice",
  full: "fullPrice",
};

const PLAN_DESC_KEY: Record<Plan, "supportingDesc" | "fullDesc"> = {
  supporting: "supportingDesc",
  full: "fullDesc",
};

function editionKey(edition: Edition): EditionKey {
  return `edition${edition.charAt(0).toUpperCase()}${edition.slice(1)}` as EditionKey;
}

// Restricts the shipping AddressElement's country selector to the site's
// actual chapter countries, rather than Stripe's full world list.
const MAILING_ALLOWED_COUNTRIES = ["US", "CA", "AU", "GB"];

// Lets the Pay button live in the left column (outside this <form>'s own
// subtree) while still submitting it natively via the HTML `form` attribute.
const PAYMENT_FORM_ID = "checkout-payment-form";

type FormStatus = { canSubmit: boolean; submitting: boolean };

function PaymentSubmitForm({
  isDonationOnly,
  requireMailingAddress,
  accessToken,
  onStatusChange,
}: {
  isDonationOnly: boolean;
  requireMailingAddress: boolean;
  accessToken: string;
  onStatusChange: (status: FormStatus) => void;
}) {
  const t = useTranslations("membership");
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  // Tracked via each AddressElement's onChange rather than read imperatively
  // at submit time — with two Address Elements mounted (billing + shipping),
  // elements.getElement(AddressElement) can't tell them apart, since Stripe
  // keys lookups by element type, not by mode.
  const [billing, setBilling] = useState<StripeAddressElementChangeEvent | null>(null);
  const [mailing, setMailing] = useState<StripeAddressElementChangeEvent | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reported up to the Pay button living in the left column, so it stays
  // disabled until every mounted field (billing/mailing address, card
  // details) is actually complete — not just once Stripe has loaded.
  const canSubmit =
    !!stripe &&
    !!elements &&
    (isDonationOnly || !!billing?.complete) &&
    (!requireMailingAddress || !!mailing?.complete) &&
    paymentComplete;

  useEffect(() => {
    onStatusChange({ canSubmit, submitting });
  }, [canSubmit, submitting, onStatusChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setError(null);

    if (requireMailingAddress && !mailing?.complete) {
      setError(t("mailingAddressRequired"));
      return;
    }

    setSubmitting(true);

    // Billing address collection is scoped to membership checkouts — see
    // app/api/membership/billing-info/route.ts for why (it resolves the
    // Stripe customer via the caller's `memberships` row, which donation-only
    // checkouts never create).
    if (!isDonationOnly) {
      if (!billing?.complete) {
        setError(t("billingAddressRequired"));
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/membership/billing-info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: billing.value.name,
          address: billing.value.address,
          ...(requireMailingAddress && mailing
            ? {
                mailingName: mailing.value.name,
                mailingAddress: mailing.value.address,
              }
            : {}),
        }),
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(body?.error ?? t("checkoutError"));
        setSubmitting(false);
        return;
      }
    }

    // Stripe automatically uses the billing details collected by the mounted
    // AddressElement for the payment method — no need to pass them again here.
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
    <form id={PAYMENT_FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-6">
      {!isDonationOnly && (
        <div className="border border-black/15 p-6 flex flex-col gap-4">
          <h2 className="type-h4 text-black">{t("billingAddressHeading")}</h2>
          <AddressElement options={{ mode: "billing" }} onChange={setBilling} />
        </div>
      )}

      {requireMailingAddress && (
        <div className="border border-black/15 p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="type-h4 text-black">{t("mailingAddressHeading")}</h2>
            <p className="type-caption text-gray-2">{t("mailingAddressDesc")}</p>
          </div>
          <AddressElement
            options={{ mode: "shipping", allowedCountries: MAILING_ALLOWED_COUNTRIES }}
            onChange={setMailing}
          />
        </div>
      )}

      <div className="border border-black/15 p-6 flex flex-col gap-4">
        <h2 className="type-h4 text-black">{t("paymentDetails")}</h2>
        <PaymentElement onChange={(e) => setPaymentComplete(e.complete)} />
      </div>

      {error && <Message text={error} ok={false} />}
    </form>
  );
}

function OrderSummary({
  plan,
  edition,
  donationCents,
}: {
  plan: Plan | null;
  edition: Edition | null;
  donationCents: number;
}) {
  const t = useTranslations("membership");

  return (
    <div className="border border-black/15 p-8 flex flex-col gap-6">
      <p className="type-micro text-gray-2">{t("orderSummaryHeading")}</p>

      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="type-h3 text-black">
            {plan ? (
              <>
                {t(plan)}
                {edition && ` — ${t(editionKey(edition))}`}
              </>
            ) : (
              t("donationTitle")
            )}
          </h2>
          {plan && (
            <p className="type-h4 text-black whitespace-nowrap">
              {t(PLAN_PRICE_KEY[plan])}
              <span className="type-caption text-gray-2"> {t("perYear")}</span>
            </p>
          )}
        </div>
        {plan && <p className="type-body text-gray-2">{t(PLAN_DESC_KEY[plan])}</p>}
      </div>

      <div className="h-px bg-black/15" />

      <div className="flex flex-col gap-3">
        {plan && (
          <div className="flex items-center justify-between gap-4">
            <p className="type-body text-gray-2">
              {t(plan)}
              {edition && ` (${t(editionKey(edition))})`}
            </p>
            <p className="type-body text-black whitespace-nowrap">{t(PLAN_PRICE_KEY[plan])}</p>
          </div>
        )}
        {donationCents > 0 && (
          <div className="flex items-center justify-between gap-4">
            <p className="type-body text-gray-2">{t("donationLineLabel")}</p>
            <p className="type-body text-black whitespace-nowrap">${(donationCents / 100).toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
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
  const [switched, setSwitched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<FormStatus>({ canSubmit: false, submitting: false });

  // Stable for the lifetime of this mount (survives React StrictMode's dev-only
  // double-invoke of effects) and sent to Stripe as an idempotency key, so a
  // duplicate request for the same checkout attempt reuses the same Stripe
  // objects instead of creating a second customer/subscription.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const hasRequestedRef = useRef(false);

  const isDonationOnly = !plan;
  const requireMailingAddress = plan === "supporting" && (edition === "print" || edition === "both");

  // The left column (heading + order summary) is pinned in place from the
  // very first pixel of scroll rather than only once the page scrolls up to
  // meet a fixed `top` value — that requires `top` to equal the column's own
  // natural distance from the viewport (below the sticky Navbar), not a
  // guessed constant. The column is never sticky/transformed at measurement
  // time, so its bounding rect stays accurate at any scroll position;
  // measuring it (once mounted, and again on resize, since the Navbar's
  // height changes across breakpoints) gives that distance exactly.
  const leftColRef = useRef<HTMLDivElement>(null);
  const [leftColStickyTop, setLeftColStickyTop] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      if (!leftColRef.current) return;
      setLeftColStickyTop(leftColRef.current.getBoundingClientRect().top + window.scrollY);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [user, switched]);

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
      // A plan switch on an existing subscription defers proration to the
      // next invoice, so there's nothing to pay right now — no clientSecret.
      if (body.switched) {
        setSwitched(true);
        return;
      }
      setClientSecret(body.clientSecret);
    })();
  }, [authLoading, user, session, plan, edition, donationCents, idempotencyKey, t]);

  const heading = (
    <div className="flex flex-col gap-2">
      <Link href="/membership" className="type-caption text-blue-2 hover:underline self-start">
        {t("backToPlans")}
      </Link>
      <h1 className="type-h2 text-black">{t("paymentDetails")}</h1>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Once the two-column layout below renders, the heading moves into
          its (pinned) left column instead — shown here only for the
          fallback states that precede/replace it. */}
      {!(user && !switched) && heading}

      {!user && !authLoading && (
        <div className="border border-black/15 p-6 flex flex-col gap-3 xl:max-w-155">
          <p className="type-h4 text-black">{t("signInRequired")}</p>
          <p className="type-body text-gray-2">{t("signInToContinue")}</p>
          <Link href="/login" className="type-ui-medium text-blue-2 hover:underline self-start">
            {t("signInCta")}
          </Link>
        </div>
      )}

      {error && <Message text={error} ok={false} />}

      {user && switched && (
        <div className="border border-black/15 p-6 flex flex-col gap-3 xl:max-w-155">
          <p className="type-h4 text-black">{t("switchSuccessTitle")}</p>
          <p className="type-body text-gray-2">{t("switchSuccessDesc")}</p>
          <Link href="/membership" className="type-ui-medium text-blue-2 hover:underline self-start">
            {t("backToPlans")}
          </Link>
        </div>
      )}

      {user && !switched && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-8 xl:gap-12 items-start">
          {/* Left column: stays put on scroll. */}
          <div ref={leftColRef} className="flex flex-col gap-8 xl:sticky" style={{ top: leftColStickyTop }}>
            {heading}
            <OrderSummary plan={plan} edition={edition} donationCents={donationCents} />

            {clientSecret && (
              <button
                type="submit"
                form={PAYMENT_FORM_ID}
                disabled={!formStatus.canSubmit || formStatus.submitting}
                className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {formStatus.submitting ? t("processing") : t("payNow")}
              </button>
            )}
          </div>

          {/* Right column: scrolls normally. */}
          <div className="flex flex-col gap-6">
            {!clientSecret && !error && <p className="type-body text-gray-2">{t("processing")}</p>}

            {clientSecret && session && (
              <StripeElementsWrapper
                clientSecret={clientSecret}
                isDonationOnly={isDonationOnly}
                requireMailingAddress={requireMailingAddress}
                accessToken={session.access_token}
                onStatusChange={setFormStatus}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StripeElementsWrapper({
  clientSecret,
  isDonationOnly,
  requireMailingAddress,
  accessToken,
  onStatusChange,
}: {
  clientSecret: string;
  isDonationOnly: boolean;
  requireMailingAddress: boolean;
  accessToken: string;
  onStatusChange: (status: FormStatus) => void;
}) {
  const [stripePromise] = useState(() => getStripeClient());

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: STRIPE_APPEARANCE, fonts: STRIPE_ELEMENTS_FONTS }}
    >
      <PaymentSubmitForm
        isDonationOnly={isDonationOnly}
        requireMailingAddress={requireMailingAddress}
        accessToken={accessToken}
        onStatusChange={onStatusChange}
      />
    </Elements>
  );
}
