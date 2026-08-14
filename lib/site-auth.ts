// Temporary site-wide password gate (see proxy.ts). Remove this file, its
// callers, and app/site-password/ once the site is ready to go public.

export const SITE_AUTH_COOKIE_NAME = "site_access";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// The cookie stores a hash of the password rather than a static flag, so it
// can't be forged by simply setting `site_access=true` in devtools.
export async function getExpectedCookieValue(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}

export async function isAuthorizedCookie(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  const expected = await getExpectedCookieValue();
  return expected !== null && cookieValue === expected;
}

export function isCorrectPassword(candidate: string): boolean {
  const expected = process.env.SITE_PASSWORD;
  return Boolean(expected) && candidate === expected;
}

export const SITE_AUTH_COOKIE_MAX_AGE = COOKIE_MAX_AGE_SECONDS;
