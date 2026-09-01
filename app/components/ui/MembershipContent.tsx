"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";

type Plan = "supporting" | "full";
type Edition = "digital" | "print" | "both";

function RadioDot({ active }: { active: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-blue-2" : "border-black/30"}`}>
      {active && <div className="w-2.5 h-2.5 rounded-full bg-blue-2" />}
    </div>
  );
}

export function MembershipContent() {
  const t = useTranslations("membership");
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>("full");
  const [edition, setEdition] = useState<Edition>("digital");
  const [donation, setDonation] = useState("");
  const [customDonation, setCustomDonation] = useState("");

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

  function goToCheckout(withPlan: boolean) {
    const params = new URLSearchParams();
    if (withPlan) {
      params.set("plan", plan);
      if (plan === "supporting") params.set("edition", edition);
    }
    if (donationCents > 0) params.set("donation", String(donationCents));
    router.push(`/membership/checkout?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-(--space-10) pb-(--space-8)">

      {/* ── Plan cards ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Supporting Member */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setPlan("supporting")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPlan("supporting"); } }}
          className={`cursor-pointer text-left flex flex-col gap-5 p-8 border-2 transition-colors ${plan === "supporting" ? "border-blue-2" : "border-black/15 hover:border-black/40"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="type-large text-blue-2">{t("supporting")}</p>
              <p className="type-display text-black">
                {t("supportingPrice")}{" "}
                <span className="type-body text-gray-2">{t("perYear")}</span>
              </p>
            </div>
            <RadioDot active={plan === "supporting"} />
          </div>
          <p className="type-body text-gray-2">{t("supportingDesc")}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {EDITIONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={(e) => { e.stopPropagation(); setPlan("supporting"); setEdition(key); }}
                className={`cursor-pointer type-label px-4 py-1.5 border transition-colors ${plan === "supporting" && edition === key ? "bg-blue-2 text-white border-blue-2" : "border-black/30 text-black hover:border-blue-2"}`}
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
          className={`cursor-pointer text-left flex flex-col gap-5 p-8 border-2 transition-colors ${plan === "full" ? "border-blue-2" : "border-black/15 hover:border-black/40"}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <p className="type-large text-blue-2">{t("full")}</p>
              <p className="type-display text-black">
                {t("fullPrice")}{" "}
                <span className="type-body text-gray-2">{t("perYear")}</span>
              </p>
            </div>
            <RadioDot active={plan === "full"} />
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
          className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full xl:max-w-96 py-4 text-center hover:opacity-90 transition-opacity"
        >
          {t("continueToPayment")}
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
