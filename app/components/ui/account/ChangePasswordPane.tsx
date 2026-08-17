"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../../../../lib/supabase";
import { Field, Message, PaneTitle, PrimaryButton, TextInput } from "./shared";

export function ChangePasswordPane({
  user,
  t,
  tAuth,
}: {
  user: User;
  t: (key: string) => string;
  tAuth: (key: string) => string;
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [newPwTouched, setNewPwTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const requirements = [
    { label: tAuth("reqMinLength"), met: newPw.length >= 8 },
    { label: tAuth("reqLowercase"), met: /[a-z]/.test(newPw) },
    { label: tAuth("reqUppercase"), met: /[A-Z]/.test(newPw) },
    { label: tAuth("reqNumber"), met: /[0-9]/.test(newPw) },
    { label: tAuth("reqSymbol"), met: /[^a-zA-Z0-9]/.test(newPw) },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (!requirements.every((r) => r.met)) {
      setMsg({ text: t("errorGeneric"), ok: false });
      return;
    }
    if (newPw !== confirmPw) {
      setMsg({ text: t("errorPasswordMismatch"), ok: false });
      return;
    }

    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: currentPw,
    });

    if (signInError) {
      setLoading(false);
      setMsg({ text: t("errorCurrentPassword"), ok: false });
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);

    if (error) {
      setMsg({ text: t("errorGeneric"), ok: false });
      return;
    }

    setMsg({ text: t("successPasswordUpdate"), ok: true });
    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setNewPwTouched(false);
  }

  return (
    <div className="flex flex-col gap-8">
      <PaneTitle>{t("changePassword")}</PaneTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-md">
        <Field label={t("currentPassword")}>
          <TextInput
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
          />
        </Field>

        <Field label={t("newPassword")}>
          <TextInput
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            onFocus={() => setNewPwTouched(true)}
          />
        </Field>
        {newPwTouched && (
          <div className="flex flex-col gap-1 -mt-3">
            <p className="type-caption-serif text-gray-2">{tAuth("passwordHint")}</p>
            {requirements.map((req) => (
              <div key={req.label} className="flex items-center gap-1.5">
                <span className={`text-xs ${req.met ? "text-green-600" : "text-gray-2"}`}>
                  {req.met ? "✓" : "○"}
                </span>
                <span className={`type-caption-serif ${req.met ? "text-green-600" : "text-gray-2"}`}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}

        <Field label={t("confirmNewPassword")}>
          <TextInput
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
          />
        </Field>

        {msg && <Message text={msg.text} ok={msg.ok} />}

        <PrimaryButton type="submit" loading={loading}>
          {t("updatePassword")}
        </PrimaryButton>
      </form>
    </div>
  );
}
