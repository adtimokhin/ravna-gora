"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../../lib/supabase";
import { Field, Message, PaneTitle, PrimaryButton, TextInput } from "./shared";

function initials(name: string | undefined, email: string | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "?").slice(0, 2).toUpperCase();
}

export function ProfilePane({
  user,
  t,
}: {
  user: User;
  t: (key: string) => string;
}) {
  const [name, setName] = useState(user.user_metadata?.full_name ?? "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (name === (user.user_metadata?.full_name ?? "")) {
      setMsg({ text: t("successProfileUpdate"), ok: true });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } });
    setLoading(false);

    if (error) {
      setMsg({ text: t("errorGeneric"), ok: false });
      return;
    }
    setMsg({ text: t("successProfileUpdate"), ok: true });
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("profile")}</PaneTitle>

      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-2 flex items-center justify-center shrink-0">
          <span className="type-h3 text-white select-none">
            {initials(user.user_metadata?.full_name, user.email)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="type-ui-serif text-black">{user.user_metadata?.full_name || user.email}</p>
          <p className="type-body-serif text-gray-2">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
        <Field label={t("name")}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        {msg && <Message text={msg.text} ok={msg.ok} />}

        <PrimaryButton type="submit" loading={loading}>
          {t("saveChanges")}
        </PrimaryButton>
      </form>
    </div>
  );
}
