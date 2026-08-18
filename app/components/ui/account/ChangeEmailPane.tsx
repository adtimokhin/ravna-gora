"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../../lib/supabase";
import {
  Field,
  Message,
  PaneDescription,
  PaneTitle,
  PrimaryButton,
  TextInput,
} from "./shared";

export function ChangeEmailPane({
  user,
  t,
}: {
  user: User;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    console.log("[account:email] submit", { currentEmail: user.email, newEmail: email });

    const { data, error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    console.log("[account:email] updateUser result", { data, error });

    if (error) {
      console.error("[account:email] updateUser failed", error);
      setMsg({ text: t("errorGeneric"), ok: false });
      return;
    }
    console.log("[account:email] updateUser succeeded — confirmation email should be sent");
    setMsg({ text: t("successEmailUpdate"), ok: true });
    setEmail("");
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("changeEmail")}</PaneTitle>
      <PaneDescription>{t("currentEmailIs", { email: user.email ?? "" })}</PaneDescription>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
        <Field label={t("newEmail")}>
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        {msg && <Message text={msg.text} ok={msg.ok} />}

        <PrimaryButton type="submit" loading={loading} disabled={!email}>
          {t("sendVerification")}
        </PrimaryButton>
      </form>
    </div>
  );
}
