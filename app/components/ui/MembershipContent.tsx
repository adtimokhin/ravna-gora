"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";
import { useAuth } from "../providers/AuthProvider";
import { useMembership } from "../../../lib/useMembership";
import { getPriceId } from "../../../lib/stripePrices";
import { workerFetch } from "../../../lib/workerApi";
import { Message } from "./account/shared";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

function CheckIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" className={`w-5 h-5 shrink-0 ${className}`} aria-hidden="true">
      <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CurrentPlanBadge({ label, contrast }: { label: string; contrast: boolean }) {
  return (
    <span
      className={`type-label px-2 py-0.5 self-start ${contrast ? "bg-white text-blue-2" : "bg-blue-2 text-white"}`}
    >
      {label}
    </span>
  );
}

export function MembershipContent() {
  const t = useTranslations("membership");
  const router = useRouter();
  const { user, session } = useAuth();

  // Only the Supporting card needs a sub-selection — which edition to
  // subscribe to. null means "no explicit choice yet," so it falls back to
  // the member's current edition (once loaded) until they pick one.
  // Computed directly during render rather than synced via an effect, so
  // there's no cascading setState-in-effect render for what's really just
  // derived state.
  const [edition, setEdition] = useState<Edition | null>(null);

  const { membership, hasActiveMembership, cancelMembership } = useMembership(user, session);
  const [cancelMsg, setCancelMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const selectedEdition: Edition =
    edition ?? (hasActiveMembership && membership!.plan === "supporting" && membership!.edition
      ? membership!.edition
      : "digital");

  const EDITIONS: { key: Edition; label: string }[] = [
    { key: "digital", label: t("editionDigital") },
    { key: "print",   label: t("editionPrint") },
    { key: "both",    label: t("editionBoth") },
  ];

  const isCurrentSupporting =
    hasActiveMembership && membership!.plan === "supporting" && (membership!.edition ?? null) === selectedEdition;
  const isCurrentFull = hasActiveMembership && membership!.plan === "full";

  // Start a hosted Stripe Checkout for `plan`. The Worker owns customer /
  // subscription creation and returns a hosted URL to redirect to. It refuses
  // (409) if the caller is already an active member — switching plans means
  // cancelling first and subscribing again after the period ends.
  async function subscribe(plan: Plan) {
    setCheckoutError(null);

    if (!user || !session) {
      router.push("/login");
      return;
    }

    const priceId = getPriceId(plan, plan === "supporting" ? selectedEdition : undefined);
    if (!priceId) {
      setCheckoutError(t("checkoutError"));
      return;
    }

    setCheckoutLoading(plan);
    try {
      const { url } = await workerFetch<{ id: string; url: string }>("/create-checkout-session", {
        method: "POST",
        body: { price_id: priceId },
        authToken: session.access_token,
      });
      if (!url) throw new Error(t("checkoutError"));
      window.location.href = url;
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : t("checkoutError"));
      setCheckoutLoading(null);
    }
  }

  // Donations are picked and confirmed on their own page — this just hands off.
  function goToDonate() {
    router.push("/donate");
  }

  function subscribeLabel(isCurrent: boolean) {
    if (isCurrent) return t("currentPlanButtonLabel");
    if (hasActiveMembership) return t("cancelToSwitch");
    return t("continueToPayment");
  }

  async function handleCancel() {
    if (!window.confirm(t("cancelConfirm"))) return;

    setCancelLoading(true);
    setCancelMsg(null);

    const { ok, error } = await cancelMembership();

    setCancelLoading(false);

    if (!ok) {
      setCancelMsg({ text: error ?? t("checkoutError"), ok: false });
      return;
    }

    setCancelMsg({ text: t("cancelSuccess"), ok: true });
  }

  const renewalDate = membership?.current_period_end
    ? new Date(membership.current_period_end).toLocaleDateString()
    : null;

  const supportingFeatures = t.raw("supportingFeatures") as string[];
  const fullFeatures = t.raw("fullFeatures") as string[];

  return (
    <div className="flex flex-col gap-(--space-10) pb-(--space-8)">

      {/* ── Current membership ── */}
      {hasActiveMembership && (
        <div className="border border-black/15 p-6 flex flex-col gap-3 max-w-155">
          <p className="type-label text-gray-2">{t("currentMembershipLabel")}</p>
          <p className="type-h4 text-black">
            {t(membership!.plan)}
            {membership!.edition && ` — ${t(`edition${membership!.edition.charAt(0).toUpperCase()}${membership!.edition.slice(1)}` as "editionDigital" | "editionPrint" | "editionBoth")}`}
          </p>

          {renewalDate && (
            <p className="type-body text-gray-2">
              {membership!.cancel_at_period_end
                ? t("cancelsOnLabel", { date: renewalDate })
                : t("renewsOnLabel", { date: renewalDate })}
            </p>
          )}

          {cancelMsg && <Message text={cancelMsg.text} ok={cancelMsg.ok} />}

          {!membership!.cancel_at_period_end && membership!.stripe_subscription_id && (
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="cursor-pointer type-body text-blue-2 hover:underline self-start disabled:opacity-60"
            >
              {t("cancelMembershipCta")}
            </button>
          )}
        </div>
      )}

      {checkoutError && <Message text={checkoutError} ok={false} />}

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">

        {/* Supporting Member */}
        <div className="flex flex-col gap-6 p-8 border-2 border-black/15">
          <div className="flex flex-col gap-1">
            {hasActiveMembership && membership!.plan === "supporting" && (
              <CurrentPlanBadge label={t("currentPlanBadge")} contrast={false} />
            )}
            <p className="type-h3 text-black">{t("supporting")}</p>
          </div>

          <p className="type-display text-black">
            {t("supportingPrice")}{" "}
            <span className="type-body text-gray-2">{t("perYear")}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {EDITIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setEdition(key)}
                className={`cursor-pointer type-label px-4 py-1.5 border transition-colors ${selectedEdition === key ? "bg-blue-2 text-white border-blue-2" : "border-black/30 text-black hover:border-blue-2"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <ul className="flex flex-col gap-3">
            {supportingFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckIcon className="text-blue-2 mt-0.5" />
                <span className="type-body text-gray-2">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => subscribe("supporting")}
            disabled={isCurrentSupporting || hasActiveMembership || checkoutLoading !== null}
            className="cursor-pointer mt-auto bg-blue-2 text-white type-ui-medium w-full py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading === "supporting" ? t("processing") : subscribeLabel(isCurrentSupporting)}
          </button>
        </div>

        {/* Full Member — contrast card */}
        <div className="flex flex-col gap-6 p-8 bg-blue-2">
          <div className="flex flex-col gap-1">
            <p className="type-label text-white/70">{t("popularBadge")}</p>
            {hasActiveMembership && membership!.plan === "full" && (
              <CurrentPlanBadge label={t("currentPlanBadge")} contrast />
            )}
            <p className="type-h3 text-white">{t("full")}</p>
          </div>

          <p className="type-display text-white">
            {t("fullPrice")}{" "}
            <span className="type-body text-white/70">{t("perYear")}</span>
          </p>

          <ul className="flex flex-col gap-3">
            {fullFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <CheckIcon className="text-white mt-0.5" />
                <span className="type-body text-white/90">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => subscribe("full")}
            disabled={isCurrentFull || hasActiveMembership || checkoutLoading !== null}
            className="cursor-pointer mt-auto bg-white text-blue-2 type-ui-medium w-full py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkoutLoading === "full" ? t("processing") : subscribeLabel(isCurrentFull)}
          </button>
        </div>
      </div>

      {hasActiveMembership && (
        <p className="type-caption text-gray-2 -mt-(--space-6)">{t("switchHint")}</p>
      )}

      {/* ── Just donate instead ── */}
      <button
        onClick={goToDonate}
        className="cursor-pointer type-body text-blue-2 hover:underline self-start"
      >
        {t("donateInsteadCta")}
      </button>

    </div>
  );
}
