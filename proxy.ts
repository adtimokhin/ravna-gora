import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SITE_AUTH_COOKIE_NAME, isAuthorizedCookie } from "./lib/site-auth";

const intlMiddleware = createMiddleware(routing);

// To turn the password gate off (e.g. once the site is ready to launch),
// flip this to `false`. Everything in app/site-password/ and lib/site-auth.ts
// can then be deleted, along with the SITE_PASSWORD env var.
const SITE_GATE_ENABLED = true;

// The password gate page/action — always reachable, never itself gated or
// rewritten by next-intl.
const GATE_PATH = "/site-password";

// Stripe's webhook POSTs come from Stripe's servers, never carry the
// site_access cookie, and can't fill out a password form — so this must
// bypass the gate below entirely, not just the next-intl step.
const STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";

// Paths next-intl shouldn't touch (matches the previous matcher's exclusions).
const INTL_EXEMPT = /^\/(_next|api|studio)(\/|$)/;
const HAS_EXTENSION = /\.[^/]+$/;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === GATE_PATH || pathname === STRIPE_WEBHOOK_PATH || HAS_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }

  if (SITE_GATE_ENABLED) {
    const authorized = await isAuthorizedCookie(request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value);

    if (!authorized) {
      const gateUrl = request.nextUrl.clone();
      const target = pathname + request.nextUrl.search;
      gateUrl.pathname = GATE_PATH;
      gateUrl.search = "";
      if (target !== "/") gateUrl.searchParams.set("redirect", target);
      return NextResponse.redirect(gateUrl);
    }
  }

  if (INTL_EXEMPT.test(pathname)) {
    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  // Run on (almost) everything so the password gate can't be bypassed;
  // next-intl's own routing is applied selectively above.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
