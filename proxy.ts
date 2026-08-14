import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SITE_AUTH_COOKIE_NAME, isAuthorizedCookie } from "./lib/site-auth";

const intlMiddleware = createMiddleware(routing);

// The password gate page/action — always reachable, never itself gated or
// rewritten by next-intl.
const GATE_PATH = "/site-password";

// Paths next-intl shouldn't touch (matches the previous matcher's exclusions).
const INTL_EXEMPT = /^\/(_next|api|studio)(\/|$)/;
const HAS_EXTENSION = /\.[^/]+$/;

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === GATE_PATH || HAS_EXTENSION.test(pathname)) {
    return NextResponse.next();
  }

  const authorized = await isAuthorizedCookie(request.cookies.get(SITE_AUTH_COOKIE_NAME)?.value);

  if (!authorized) {
    const gateUrl = request.nextUrl.clone();
    const target = pathname + request.nextUrl.search;
    gateUrl.pathname = GATE_PATH;
    gateUrl.search = "";
    if (target !== "/") gateUrl.searchParams.set("redirect", target);
    return NextResponse.redirect(gateUrl);
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
