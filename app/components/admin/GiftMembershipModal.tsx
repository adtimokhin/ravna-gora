"use client";

import { useEffect, useState } from "react";
import { useDialog } from "../providers/DialogProvider";
import { workerFetch } from "../../../lib/workerApi";
import { getPriceId } from "../../../lib/stripePrices";
import type { AdminUser } from "../../../lib/types";
import type { MembershipEdition, MembershipPlan } from "../../../lib/membershipPlans";

const FIELD_CLASS =
  "type-body border border-black/20 text-black px-3 py-2 bg-white disabled:opacity-50";

type Address = {
  recipient_name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const EMPTY_ADDRESS: Address = {
  recipient_name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
};

// Admin-only: grant a membership with no Stripe subscription via the Worker's
// POST /admin/gift-membership. Opened from a user row in UsersTable, so the
// recipient is fixed (`user`) — no member picker here. `mailing_address` is
// only sent (and only required) when the resolved price maps to a print edition.
export function GiftMembershipModal({
  user,
  onClose,
}: {
  user: AdminUser;
  onClose: () => void;
}) {
  const { showError } = useDialog();
  const [plan, setPlan] = useState<MembershipPlan>("supporting");
  const [edition, setEdition] = useState<MembershipEdition>("digital");
  const [expiration, setExpiration] = useState("");
  const [address, setAddress] = useState<Address>(EMPTY_ADDRESS);

  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const needsMailingAddress = plan === "supporting" && (edition === "print" || edition === "both");
  const priceId = getPriceId(plan, plan === "supporting" ? edition : undefined);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!priceId) {
      setMsg({ text: "No price is configured for that plan/edition.", ok: false });
      return;
    }
    if (!expiration) {
      setMsg({ text: "Set an expiration date.", ok: false });
      return;
    }
    if (needsMailingAddress && (!address.recipient_name || !address.line1 || !address.city || !address.state || !address.postal_code || !address.country)) {
      setMsg({ text: "Complete the mailing address for a print edition.", ok: false });
      return;
    }

    setSubmitting(true);
    try {
      const result = await workerFetch<{ success: boolean; membership_id: string }>(
        "/admin/gift-membership",
        {
          method: "POST",
          body: {
            target_uid: user.id,
            price_id: priceId,
            // Stored as `current_period_end`; the Worker parses it with `new Date()`.
            custom_expiration: new Date(expiration).toISOString(),
            ...(needsMailingAddress ? { mailing_address: address } : {}),
          },
        }
      );
      setMsg({ text: `Membership granted (${result.membership_id}).`, ok: true });
      setDone(true);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to grant membership.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/40 p-4 py-10"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Gift membership"
        className="w-full max-w-xl bg-offwhite-1 border border-black/15 p-6 md:p-8 flex flex-col gap-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <h2 className="type-h3 text-black">Gift Membership</h2>
            <p className="type-caption text-gray-3 truncate">
              {user.email ?? user.id}
              {user.fullName ? ` — ${user.fullName}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer type-h4 text-gray-2 hover:text-black leading-none px-1"
          >
            ×
          </button>
        </div>

        <p className="type-body text-gray-2">
          Grant a membership with no Stripe subscription. It stays active until the expiration date.
        </p>

        {done ? (
          <div className="flex flex-col gap-5">
            {msg && (
              <p className={`type-caption ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
            )}
            <button
              onClick={onClose}
              className="cursor-pointer bg-blue-2 text-white type-ui-medium px-7 py-3 hover:opacity-90 transition-opacity self-start"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-5">
              <label className="flex flex-col gap-1.5">
                <span className="type-label text-gray-2">Plan</span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as MembershipPlan)}
                  className={FIELD_CLASS}
                >
                  <option value="supporting">Newspaper subscription</option>
                  <option value="full">Full</option>
                </select>
              </label>

              {plan === "supporting" && (
                <label className="flex flex-col gap-1.5">
                  <span className="type-label text-gray-2">Edition</span>
                  <select
                    value={edition ?? "digital"}
                    onChange={(e) => setEdition(e.target.value as MembershipEdition)}
                    className={FIELD_CLASS}
                  >
                    <option value="digital">Digital</option>
                    <option value="print">Print</option>
                    <option value="both">Both</option>
                  </select>
                </label>
              )}

              <label className="flex flex-col gap-1.5">
                <span className="type-label text-gray-2">Expires</span>
                <input
                  type="date"
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className={FIELD_CLASS}
                />
              </label>
            </div>

            {needsMailingAddress && (
              <div className="border border-black/15 p-4 flex flex-col gap-3">
                <p className="type-ui-medium text-black">Mailing address (print edition)</p>
                {([
                  ["recipient_name", "Recipient name"],
                  ["line1", "Address line 1"],
                  ["line2", "Address line 2 (optional)"],
                  ["city", "City"],
                  ["state", "State / Province"],
                  ["postal_code", "Postal code"],
                  ["country", "Country (2-letter code)"],
                ] as [keyof Address, string][]).map(([key, label]) => (
                  <label key={key} className="flex flex-col gap-1.5">
                    <span className="type-label text-gray-2">{label}</span>
                    <input
                      type="text"
                      value={address[key]}
                      onChange={(e) => setAddress((a) => ({ ...a, [key]: e.target.value }))}
                      className={FIELD_CLASS}
                    />
                  </label>
                ))}
              </div>
            )}

            {msg && (
              <p className={`type-caption ${msg.ok ? "text-green-700" : "text-red-600"}`}>{msg.text}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer bg-blue-2 text-white type-ui-medium px-7 py-3 hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {submitting ? "Granting…" : "Grant Membership"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer type-ui-medium text-gray-2 hover:text-black px-3 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
