"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Elements, AddressElement, useElements } from "@stripe/react-stripe-js";
import type { StripeAddressElementChangeEvent, StripeElementsOptions } from "@stripe/stripe-js";
import { supabase } from "../../../../lib/supabase";
import { getStripeClient } from "../../../../lib/stripe-client";
import { STRIPE_APPEARANCE, STRIPE_ELEMENTS_FONTS } from "../../../../lib/stripeAppearance";
import { Message, PrimaryButton } from "./shared";

// Restricts the country selector to the site's actual chapter countries,
// same as the checkout-time mailing address (CheckoutForm.tsx).
const MAILING_ALLOWED_COUNTRIES = ["US", "CA", "AU", "GB"];

// `appearance` alone is a valid runtime Elements option (it's not tied to
// any payment/setup intent — this AddressElement just collects text), but
// the SDK's TS union type requires a `clientSecret` or `mode` discriminant
// that doesn't apply here.
const ELEMENTS_OPTIONS = {
  appearance: STRIPE_APPEARANCE,
  fonts: STRIPE_ELEMENTS_FONTS,
} as StripeElementsOptions;

type MailingAddressRow = {
  recipient_name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

type AddressDefaultValues = {
  name: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
};

function SaveForm({
  accessToken,
  defaultValues,
}: {
  accessToken: string;
  defaultValues: AddressDefaultValues | undefined;
}) {
  const t = useTranslations("membership");
  const elements = useElements();
  const [value, setValue] = useState<StripeAddressElementChangeEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSave() {
    if (!elements) return;

    if (!value?.complete) {
      setMsg({ text: t("mailingAddressRequired"), ok: false });
      return;
    }

    setSaving(true);
    setMsg(null);

    const res = await fetch("/api/membership/mailing-address", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ name: value.value.name, address: value.value.address }),
    });
    const body = await res.json().catch(() => null);

    setSaving(false);

    if (!res.ok) {
      setMsg({ text: body?.error ?? t("checkoutError"), ok: false });
      return;
    }

    setMsg({ text: t("mailingAddressSaved"), ok: true });
  }

  return (
    <div className="flex flex-col gap-4">
      <AddressElement
        options={{
          mode: "shipping",
          allowedCountries: MAILING_ALLOWED_COUNTRIES,
          defaultValues,
        }}
        onChange={setValue}
      />

      {msg && <Message text={msg.text} ok={msg.ok} />}

      <PrimaryButton type="button" onClick={handleSave} loading={saving}>
        {t("saveMailingAddress")}
      </PrimaryButton>
    </div>
  );
}

export function MailingAddressEditor({
  membershipId,
  accessToken,
}: {
  membershipId: string;
  accessToken: string;
}) {
  const t = useTranslations("membership");
  const [existing, setExisting] = useState<MailingAddressRow | null | undefined>(undefined);
  const [stripePromise] = useState(() => getStripeClient());

  useEffect(() => {
    let cancelled = false;

    supabase
      .from("mailing_addresses")
      .select("recipient_name, line1, line2, city, state, postal_code, country")
      .eq("membership_id", membershipId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        setExisting(!error && data ? (data as MailingAddressRow) : null);
      });

    return () => {
      cancelled = true;
    };
  }, [membershipId]);

  if (existing === undefined) {
    return <p className="type-body-serif text-gray-2">…</p>;
  }

  const defaultValues = existing
    ? {
        name: existing.recipient_name,
        address: {
          line1: existing.line1,
          line2: existing.line2 ?? undefined,
          city: existing.city,
          state: existing.state,
          postal_code: existing.postal_code,
          country: existing.country,
        },
      }
    : undefined;

  return (
    <div className="flex flex-col gap-4">
      <p className="type-body-serif text-gray-2">{t("mailingAddressDesc")}</p>
      <Elements stripe={stripePromise} options={ELEMENTS_OPTIONS}>
        <SaveForm accessToken={accessToken} defaultValues={defaultValues} />
      </Elements>
    </div>
  );
}
