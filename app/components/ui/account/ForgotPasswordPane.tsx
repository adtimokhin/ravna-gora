"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../../lib/supabase";
import { Message, PaneDescription, PaneTitle, PrimaryButton } from "./shared";

export function ForgotPasswordPane({
  user,
  tAuth,
}: {
  user: User;
  tAuth: (key: string) => string;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSend() {
    setMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(user.email ?? "", {
      redirectTo: `${window.location.origin}/account`,
    });
    setLoading(false);

    if (error) {
      setMsg({ text: tAuth("errorGeneric"), ok: false });
      return;
    }
    setMsg({ text: tAuth("resetEmailSent"), ok: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{tAuth("forgotPasswordTitle")}</PaneTitle>
      <PaneDescription>{user.email}</PaneDescription>

      <div className="flex flex-col gap-4 max-w-md">
        {msg && <Message text={msg.text} ok={msg.ok} />}
        <PrimaryButton onClick={handleSend} loading={loading} disabled={!!msg?.ok}>
          {tAuth("sendResetEmail")}
        </PrimaryButton>
      </div>
    </div>
  );
}
