"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "../../../i18n/navigation";
import { supabase } from "../../../lib/supabase";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function SignUpForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyMessage, setVerifyMessage] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const requirements = [
    { label: t("reqMinLength"), met: password.length >= 8 },
    { label: t("reqLowercase"), met: /[a-z]/.test(password) },
    { label: t("reqUppercase"), met: /[A-Z]/.test(password) },
    { label: t("reqNumber"),    met: /[0-9]/.test(password) },
    { label: t("reqSymbol"),    met: /[^a-zA-Z0-9]/.test(password) },
  ];

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!requirements.every((r) => r.met)) {
      setError(t("errorWeakPassword"));
      return;
    }
    if (password !== confirm) {
      setError(t("errorPasswordMismatch"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("already")
          ? t("errorEmailTaken")
          : t("errorGeneric")
      );
      return;
    }

    setVerifyMessage(true);
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/${locale}/account` },
    });

    // On success the browser navigates away to Google, so we only land here
    // when the redirect could not be started (e.g. provider disabled).
    if (error) {
      setError(t("errorGeneric"));
      setGoogleLoading(false);
    }
  }

  if (verifyMessage) {
    return (
      <div className="w-full max-w-md flex flex-col gap-6 text-center">
        <h1 className="type-h2 text-black">{t("signUpTitle")}</h1>
        <p className="type-body text-gray-2">{t("verifyEmail")}</p>
        <Link href="/login" className="type-body text-blue-2 hover:underline">
          {t("signInLink")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md flex flex-col gap-8">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="type-h2 text-black">{t("signUpTitle")}</h1>
      </div>

      <button
        onClick={handleGoogleSignIn}
        disabled={googleLoading}
        className="cursor-pointer flex items-center justify-center gap-3 w-full border border-black/20 bg-white px-4 py-3 type-ui-medium text-black hover:bg-black/5 transition-colors disabled:opacity-60"
      >
        <GoogleIcon />
        {googleLoading ? "…" : t("continueWithGoogle")}
      </button>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-black/15" />
        <span className="type-caption text-gray-2 uppercase tracking-widest">{t("or")}</span>
        <div className="flex-1 h-px bg-black/15" />
      </div>

      <form onSubmit={handleSignUp} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="type-label text-gray-2">{t("fullName")}</label>
          <input
            type="text"
            required
            placeholder={t("namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-black/20 bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="type-label text-gray-2">{t("email")}</label>
          <input
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-black/20 bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="type-label text-gray-2">{t("password")}</label>
          <input
            type="password"
            required
            placeholder={t("passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordTouched(true)}
            className="border border-black/20 bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors"
          />
          {passwordTouched && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="type-caption text-gray-2">{t("passwordHint")}</p>
              {requirements.map((req) => (
                <div key={req.label} className="flex items-center gap-1.5">
                  <span className={`text-xs ${req.met ? "text-green-600" : "text-gray-2"}`}>
                    {req.met ? "✓" : "○"}
                  </span>
                  <span className={`type-caption ${req.met ? "text-green-600" : "text-gray-2"}`}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="type-label text-gray-2">{t("confirmPassword")}</label>
          <input
            type="password"
            required
            placeholder={t("passwordPlaceholder")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border border-black/20 bg-white px-4 py-3 type-body text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors"
          />
        </div>

        {error && <p className="type-caption text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="cursor-pointer bg-blue-2 text-white type-ui-medium w-full py-3.5 text-center hover:opacity-90 transition-opacity mt-2 disabled:opacity-60"
        >
          {loading ? "…" : t("signUp")}
        </button>
      </form>

      <p className="type-body text-gray-2 text-center">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-blue-2 hover:underline">
          {t("signInLink")}
        </Link>
      </p>
    </div>
  );
}
