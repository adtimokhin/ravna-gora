"use client";

import { useState } from "react";
import { useRouter } from "../../../../i18n/navigation";
import { supabase } from "../../../../lib/supabase";
import { workerFetch } from "../../../../lib/workerApi";
import { DangerButton, Field, Message, PaneDescription, PaneTitle, TextInput } from "./shared";

const CONFIRM_WORD = "DEACTIVATE";

// Calls the Worker's POST /deactivate-account: it pauses + cancels every
// active subscription in Stripe and bans the Supabase auth user (no hard
// delete, no undo from the app). The user is signed out afterward and can no
// longer sign in.
export function DeleteAccountPane({ t }: { t: (key: string) => string }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleDeactivate() {
    setMsg(null);
    setLoading(true);

    try {
      await workerFetch("/deactivate-account", { method: "POST" });
    } catch (err) {
      setLoading(false);
      setMsg({ text: err instanceof Error ? err.message : t("errorGeneric"), ok: false });
      return;
    }

    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("dangerZone")}</PaneTitle>
      <PaneDescription>{t("deactivateAccountDesc")}</PaneDescription>

      <div className="flex flex-col gap-5 max-w-md">
        <Field label={t("deactivateConfirmPlaceholder")}>
          <TextInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </Field>

        {msg && <Message text={msg.text} ok={msg.ok} />}

        <DangerButton
          onClick={handleDeactivate}
          disabled={confirmText !== CONFIRM_WORD || loading}
        >
          {loading ? "…" : t("deactivateConfirmButton")}
        </DangerButton>
      </div>
    </div>
  );
}
