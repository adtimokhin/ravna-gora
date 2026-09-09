"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "../providers/AuthProvider";
import { useDialog } from "../providers/DialogProvider";
import { Link } from "../../../i18n/navigation";
import { workerFetch } from "../../../lib/workerApi";
import { Message } from "./account/shared";

const QUICK_DONATION_AMOUNTS = ["$10", "$25", "$50", "$100"];

// One-time donation. Like membership checkout, the Worker owns the Stripe
// object (a hosted Checkout Session in `payment` mode) and returns a URL to
// redirect the browser to — the amount is validated server-side.
export function DonateForm() {
  const t = useTranslations("membership");
  const { user, session, loading: authLoading } = useAuth();
  const { showError } = useDialog();

  const [preset, setPreset] = useState("");
  const [custom, setCustom] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amount = preset
    ? Number(preset.replace(/\D/g, ""))
    : Number(custom.replace(/[^\d.]/g, "")) || 0;
  const amountCents = Math.round(amount * 100);

  // Mirrors the Worker's server-side bounds ($1.00–$10,000.00) so the button
  // stays disabled rather than round-tripping to a 400.
  const MIN_CENTS = 100;
  const MAX_CENTS = 1_000_000;
  const amountValid = Number.isInteger(amountCents) && amountCents >= MIN_CENTS && amountCents <= MAX_CENTS;

  const formattedAmount = `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  async function handleDonate() {
    if (!session) return;
    if (!amountValid) {
      setError(t("donationAmountRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { url } = await workerFetch<{ id: string; url: string }>("/create-donation-session", {
        method: "POST",
        body: { amount_cents: amountCents },
        authToken: session.access_token,
      });
      if (!url) throw new Error(t("checkoutError"));
      window.location.href = url;
    } catch (err) {
      showError(err instanceof Error ? err.message : t("checkoutError"));
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-xl flex flex-col gap-4">
      <Link
        href="/membership"
        className="type-caption text-blue-2 hover:underline self-start"
      >
        {t("backToPlans")}
      </Link>

      {!user && !authLoading && (
        <div className="border border-black/15 bg-white p-6 md:p-8 flex flex-col gap-3">
          <p className="type-h4 text-black">{t("signInRequired")}</p>
          <p className="type-body text-gray-2">{t("donationSignInPrompt")}</p>
          <Link
            href="/login"
            className="type-ui-medium text-blue-2 hover:underline self-start"
          >
            {t("signInCta")}
          </Link>
        </div>
      )}

      {user && (
        <div className="border border-black/15 bg-white p-6 md:p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="type-label text-gray-2">{t("chooseAmountLabel")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {QUICK_DONATION_AMOUNTS.map((amt) => {
                const active = preset === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => { setPreset(amt); setCustom(""); setError(null); }}
                    className={`cursor-pointer type-ui-medium py-3 text-center border transition-colors ${
                      active
                        ? "bg-blue-2 text-white border-blue-2"
                        : "border-black/25 text-black hover:border-blue-2"
                    }`}
                  >
                    {amt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-amount" className="type-label text-gray-2">
              {t("donationCustom")}
            </label>
            <div
              className={`flex items-center gap-2 border bg-white px-4 py-3 transition-colors ${
                custom ? "border-blue-2" : "border-black/25"
              } focus-within:border-blue-2`}
            >
              <span className="type-body text-gray-2">$</span>
              <input
                id="custom-amount"
                type="text"
                inputMode="decimal"
                value={custom}
                onChange={(e) => { setCustom(e.target.value); setPreset(""); setError(null); }}
                placeholder="0.00"
                className="flex-1 bg-transparent type-body text-black placeholder:text-gray-3 outline-none"
              />
            </div>
          </div>

          {amountValid && (
            <p className="type-body text-black">
              {t("donationSummary", { amount: formattedAmount })}
            </p>
          )}

          {error && <Message text={error} ok={false} />}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleDonate}
              disabled={submitting || !amountValid}
              className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? t("processing") : t("continueToPayment")}
            </button>
            <p className="type-caption text-gray-2 text-center">
              {t("donationSecureNote")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
