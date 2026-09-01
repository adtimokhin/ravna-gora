"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "../../../i18n/navigation";
import { useAuth } from "../providers/AuthProvider";
import { supabase } from "../../../lib/supabase";
import { AccountSidebar, type SidebarItem } from "./account/AccountSidebar";
import { ProfilePane } from "./account/ProfilePane";
import { ChangeEmailPane } from "./account/ChangeEmailPane";
import { ChangePasswordPane } from "./account/ChangePasswordPane";
import { ForgotPasswordPane } from "./account/ForgotPasswordPane";
import { DeleteAccountPane } from "./account/DeleteAccountPane";
import { BillingPane } from "./account/BillingPane";

type Section = "profile" | "email" | "password" | "forgotPassword" | "billing" | "delete";

export function AccountContent() {
  const t = useTranslations("account");
  const tAuth = useTranslations("auth");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [section, setSection] = useState<Section>("profile");

  if (authLoading) {
    return <div className="type-body-serif text-gray-2 py-10">…</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col gap-4 py-10">
        <p className="type-body-serif text-gray-2">{t("notLoggedIn")}</p>
        <button
          onClick={() => router.push("/login")}
          className="cursor-pointer bg-blue-2 text-white type-ui-serif px-8 py-3 hover:opacity-90 transition-opacity self-start"
        >
          {t("goToSignIn")}
        </button>
      </div>
    );
  }

  const items: SidebarItem[] = [
    { key: "profile", label: t("profile") },
    { key: "email", label: t("changeEmail") },
    { key: "password", label: t("changePassword") },
    { key: "forgotPassword", label: t("resetPassword") },
    { key: "billing", label: t("billing") },
    { key: "delete", label: t("deleteAccount"), variant: "danger" },
  ];

  async function handleSignOut() {
    console.log("[account:signOut] signing out", { userId: user?.id });
    const { error } = await supabase.auth.signOut();
    console.log("[account:signOut] signOut result", { error });
    router.push("/");
  }

  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:gap-16 pb-(--space-8)">
      <div className="xl:w-64 shrink-0">
        <AccountSidebar
          items={items}
          active={section}
          onSelect={(key) => setSection(key as Section)}
          signOutLabel={t("signOut")}
          onSignOut={handleSignOut}
        />
      </div>

      <div className="flex-1 max-w-xl">
        {section === "profile" && <ProfilePane user={user} t={t} />}
        {section === "email" && <ChangeEmailPane user={user} t={t} />}
        {section === "password" && <ChangePasswordPane user={user} t={t} tAuth={tAuth} />}
        {section === "forgotPassword" && <ForgotPasswordPane user={user} tAuth={tAuth} />}
        {section === "billing" && <BillingPane t={t} />}
        {section === "delete" && <DeleteAccountPane t={t} />}
      </div>
    </div>
  );
}
