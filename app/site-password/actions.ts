"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SITE_AUTH_COOKIE_MAX_AGE,
  SITE_AUTH_COOKIE_NAME,
  getExpectedCookieValue,
  isCorrectPassword,
} from "@/lib/site-auth";

function safeRedirectTarget(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function verifySitePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "");

  if (!isCorrectPassword(password)) {
    const params = new URLSearchParams({ error: "1" });
    if (redirectTo) params.set("redirect", redirectTo);
    redirect(`/site-password?${params.toString()}`);
  }

  const cookieValue = await getExpectedCookieValue();
  const cookieStore = await cookies();
  cookieStore.set(SITE_AUTH_COOKIE_NAME, cookieValue as string, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SITE_AUTH_COOKIE_MAX_AGE,
  });

  redirect(safeRedirectTarget(redirectTo));
}
