"use client";

import { useState } from "react";
import { useRouter } from "../../../../i18n/navigation";
import { supabase } from "../../../../lib/supabase";
import { DangerButton, Field, Message, PaneDescription, PaneTitle, TextInput } from "./shared";

export function DeleteAccountPane({ t }: { t: (key: string) => string }) {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleDelete() {
    setMsg(null);
    setLoading(true);
    console.log("[account:delete] requesting session for access token");

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    console.log("[account:delete] getSession result", {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      sessionError,
    });

    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
    });
    const body = await res.json().catch(() => null);
    console.log("[account:delete] /api/account/delete response", { status: res.status, body });

    if (!res.ok) {
      console.error("[account:delete] delete request failed", { status: res.status, body });
      setLoading(false);
      setMsg({ text: body?.error ?? t("errorGeneric"), ok: false });
      return;
    }

    console.log("[account:delete] account deleted, signing out");
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("dangerZone")}</PaneTitle>
      <PaneDescription>{t("deleteAccountDesc")}</PaneDescription>

      <div className="flex flex-col gap-5 max-w-md">
        <Field label={t("deleteConfirmPlaceholder")}>
          <TextInput
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </Field>

        {msg && <Message text={msg.text} ok={msg.ok} />}

        <DangerButton
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || loading}
        >
          {loading ? "…" : t("deleteConfirmButton")}
        </DangerButton>
      </div>
    </div>
  );
}
