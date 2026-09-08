"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "../../../../i18n/navigation";
import { useAuth } from "../../providers/AuthProvider";
import { useMembership } from "../../../../lib/useMembership";
import { PaneTitle, Message, DangerButton } from "./shared";

// Matches SecondaryButton's own classes (app/components/ui/account/shared.tsx)
// — that component only renders a <button>, but this action navigates.
const LINK_BUTTON_CLASS =
  "cursor-pointer border border-black type-ui-serif text-black px-7 py-2.5 hover:bg-black hover:text-white transition-colors self-start inline-block text-center";

export function BillingPane({ t }: { t: (key: string) => string }) {
  const tMembership = useTranslations("membership");
  const { user, session } = useAuth();
  const { membership, membershipLoading, hasActiveMembership, cancelMembership } = useMembership(user, session);

  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleCancel() {
    if (!window.confirm(tMembership("cancelConfirm"))) return;

    setCancelLoading(true);
    setCancelMsg(null);

    const { ok, error } = await cancelMembership();

    setCancelLoading(false);

    if (!ok) {
      setCancelMsg({ text: error ?? t("errorGeneric"), ok: false });
      return;
    }

    setCancelMsg({ text: tMembership("cancelSuccess"), ok: true });
  }

  const renewalDate = membership?.current_period_end
    ? new Date(membership.current_period_end).toLocaleDateString()
    : null;

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("billing")}</PaneTitle>

      {membershipLoading && <p className="type-body-serif text-gray-2">…</p>}

      {!membershipLoading && !hasActiveMembership && (
        <div className="border border-black/15 p-6 flex flex-col gap-4 max-w-md">
          <p className="type-h4 text-black">{t("noMembership")}</p>
          <p className="type-body-serif text-gray-2">{t("noMembershipDesc")}</p>
          <Link href="/membership" className="type-ui-serif text-blue-2 hover:underline self-start">
            {t("viewPlansCta")}
          </Link>
        </div>
      )}

      {!membershipLoading && hasActiveMembership && membership && (
        <div className="border border-black/15 p-6 flex flex-col gap-4 max-w-md">
          <p className="type-micro-serif text-gray-2">{t("currentPlan")}</p>
          <p className="type-h4 text-black">
            {tMembership(membership.plan)}
            {membership.edition &&
              ` — ${tMembership(
                `edition${membership.edition.charAt(0).toUpperCase()}${membership.edition.slice(1)}` as
                  | "editionDigital"
                  | "editionPrint"
                  | "editionBoth"
              )}`}
          </p>

          {renewalDate && (
            <p className="type-body-serif text-gray-2">
              {membership.cancel_at_period_end
                ? tMembership("cancelsOnLabel", { date: renewalDate })
                : tMembership("renewsOnLabel", { date: renewalDate })}
            </p>
          )}

          {cancelMsg && <Message text={cancelMsg.text} ok={cancelMsg.ok} />}

          <div className="flex flex-col gap-3 pt-2">
            <Link href="/membership" className={LINK_BUTTON_CLASS}>
              {t("viewPlansCta")}
            </Link>

            {!membership.cancel_at_period_end && membership.stripe_subscription_id && (
              <DangerButton onClick={handleCancel} disabled={cancelLoading}>
                {t("cancelSubscriptionCta")}
              </DangerButton>
            )}
          </div>

          <p className="type-caption-serif text-gray-2">{tMembership("switchHint")}</p>
        </div>
      )}
    </div>
  );
}
