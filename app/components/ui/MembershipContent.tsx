"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { Message } from "./account/shared";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

type MembershipRow = {
  plan: Plan;
  edition: Edition | null;
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
};

// A subscription in any of these states is a real, running membership —
// worth showing status for and offering to cancel/switch. "incomplete" (an
// abandoned first payment), "canceled", and the rest are not.
const ACTIVE_STATUSES = ["active", "past_due", "trialing"];

function RadioDot({ active }: { active: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-blue-2" : "border-black/30"}`}>
      {active && <div className="w-2.5 h-2.5 rounded-full bg-blue-2" />}
    </div>
  );
}

function CurrentPlanBadge({ label }: { label: string }) {
  return (
    <span className="type-label px-2 py-0.5 bg-blue-2 text-white self-start">
      {label}
    </span>
  );
}

export function MembershipContent() {
  const t = useTranslations("membership");
  const router = useRouter();
  const { user, session } = useAuth();

  // null means "no explicit user selection yet" — the effective plan/edition
  // below falls back to the member's current one (once loaded) until they
  // click a card, at which point their choice takes over. Computed directly
  // during render rather than synced via an effect, so there's no cascading
  // setState-in-effect render for what's really just derived state.
  const [plan, setPlan] = useState<Plan | null>(null);
  const [edition, setEdition] = useState<Edition | null>(null);
  const [donation, setDonation] = useState("");
  const [customDonation, setCustomDonation] = useState("");

  const [membership, setMembership] = useState<MembershipRow | null>(null);
  const [cancelMsg, setCancelMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    supabase
      .from("memberships")
      .select("plan, edition, status, cancel_at_period_end, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        setMembership(data as MembershipRow);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasActiveMembership = !!membership && ACTIVE_STATUSES.includes(membership.status);

  const selectedPlan: Plan = plan ?? (hasActiveMembership ? membership!.plan : "full");
  const selectedEdition: Edition =
    edition ?? (hasActiveMembership && membership!.edition ? membership!.edition : "digital");

  const EDITIONS: { key: Edition; label: string }[] = [
    { key: "digital", label: t("editionDigital") },
    { key: "print",   label: t("editionPrint") },
    { key: "both",    label: t("editionBoth") },
  ];

  const QUICK_AMOUNTS = ["$10", "$25", "$50", "$100"];

  const donationAmount = donation
    ? Number(donation.replace(/\D/g, ""))
    : Math.round(Number(customDonation.replace(/[^\d.]/g, "")) || 0);
  const donationCents = Math.round(donationAmount * 100);

  const isCurrentSelection =
    hasActiveMembership &&
    membership!.plan === selectedPlan &&
    (membership!.edition ?? null) === (selectedPlan === "supporting" ? selectedEdition : null);

  function goToCheckout(withPlan: boolean) {
    const params = new URLSearchParams();
    if (withPlan) {
      params.set("plan", selectedPlan);
      if (selectedPlan === "supporting") params.set("edition", selectedEdition);
    }
    if (donationCents > 0) params.set("donation", String(donationCents));
    router.push(`/membership/checkout?${params.toString()}`);
  }

  async function handleCancelToggle(cancelAtPeriodEnd: boolean) {
    if (cancelAtPeriodEnd && !window.confirm(t("cancelConfirm"))) return;

    setCancelLoading(true);
    setCancelMsg(null);

    const res = await fetch("/api/membership/cancel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      body: JSON.stringify({ cancelAtPeriodEnd }),
    });
    const body = await res.json().catch(() => null);

    setCancelLoading(false);

    if (!res.ok) {
      setCancelMsg({ text: body?.error ?? t("checkoutError"), ok: false });
      return;
    }

    setMembership((prev) => (prev ? { ...prev, cancel_at_period_end: body.cancelAtPeriodEnd } : prev));
    setCancelMsg({ text: cancelAtPeriodEnd ? t("cancelSuccess") : t("reactivateSuccess"), ok: true });
  }

  const renewalDate = membership?.current_period_end
    ? new Date(membership.current_period_end).toLocaleDateString()
    : null;

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

          <button
            onClick={() => handleCancelToggle(!membership!.cancel_at_period_end)}
            disabled={cancelLoading}
            className="cursor-pointer type-body text-blue-2 hover:underline self-start disabled:opacity-60"
          >
            {membership!.cancel_at_period_end ? t("reactivateCta") : t("cancelMembershipCta")}
          </button>
        </div>
      )}

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Supporting Member */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPlan("supporting")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlan("supporting"); } }}
          className={`cursor-pointer text-left flex flex-col gap-5 p-8 border-2 transition-colors ${selectedPlan === "supporting" ? "border-blue-2" : "border-black/15 hover:border-black/40"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              {hasActiveMembership && membership!.plan === "supporting" && (
                <CurrentPlanBadge label={t("currentPlanBadge")} />
              )}
              <p className="type-large text-blue-2">{t("supporting")}</p>
              <p className="type-display text-black">
                {t("supportingPrice")}{" "}
                <span className="type-body text-gray-2">{t("perYear")}</span>
              </p>
            </div>
            <RadioDot active={selectedPlan === "supporting"} />
          </div>
          <p className="type-body text-gray-2">{t("supportingDesc")}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {EDITIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); setPlan("supporting"); setEdition(key); }}
                className={`cursor-pointer type-label px-4 py-1.5 border transition-colors ${selectedPlan === "supporting" && selectedEdition === key ? "bg-blue-2 text-white border-blue-2" : "border-black/30 text-black hover:border-blue-2"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Full Member */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPlan("full")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlan("full"); } }}
          className={`cursor-pointer text-left flex flex-col gap-5 p-8 border-2 transition-colors ${selectedPlan === "full" ? "border-blue-2" : "border-black/15 hover:border-black/40"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              {hasActiveMembership && membership!.plan === "full" && (
                <CurrentPlanBadge label={t("currentPlanBadge")} />
              )}
              <p className="type-large text-blue-2">{t("full")}</p>
              <p className="type-display text-black">
                {t("fullPrice")}{" "}
                <span className="type-body text-gray-2">{t("perYear")}</span>
              </p>
            </div>
            <RadioDot active={selectedPlan === "full"} />
          </div>
          <p className="type-body text-gray-2">{t("fullDesc")}</p>
        </div>
      </div>

      {/* ── Donation ── */}
      <div className="flex flex-col gap-6 w-full xl:max-w-155">
        <div className="flex flex-col gap-2">
          <h2 className="type-h3 text-black">{t("donationTitle")}</h2>
          <p className="type-body text-gray-2">{t("donationOptional")}</p>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-3">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => { setDonation(amt); setCustomDonation(""); }}
              className={`cursor-pointer type-ui-medium px-6 py-2.5 border transition-colors ${donation === amt ? "bg-black text-white border-black" : "border-black/20 text-black hover:border-black"}`}
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="flex flex-col gap-1.5">
          <label className="type-label text-gray-2">{t("donationCustom")}</label>
          <div className="flex items-center gap-2 border border-black/20 bg-white px-4 py-3 max-w-64">
            <span className="type-body text-gray-2">$</span>
            <input
              type="text"
              value={customDonation}
              onChange={(e) => { setCustomDonation(e.target.value); setDonation(""); }}
              placeholder="0.00"
              className="flex-1 bg-transparent type-body text-black placeholder:text-gray-3 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ── Continue ── */}
      <div className="flex flex-col gap-4 items-start">
        <button
          onClick={() => goToCheckout(true)}
          disabled={isCurrentSelection}
          className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full xl:max-w-96 py-4 text-center hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCurrentSelection
            ? t("currentPlanButtonLabel")
            : hasActiveMembership
              ? t("switchToThisPlan")
              : t("continueToPayment")}
        </button>

        {donationCents > 0 && (
          <button
            onClick={() => goToCheckout(false)}
            className="cursor-pointer type-body text-blue-2 hover:underline"
          >
            {t("donationOnlyCta", { amount: `$${donationAmount}` })}
          </button>
        )}
      </div>

    </div>
  );
}
