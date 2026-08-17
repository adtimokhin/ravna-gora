"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import NextLink from "next/link";
import { Link, useRouter, usePathname } from "../../../i18n/navigation";
import { useAuth } from "../providers/AuthProvider";

type Locale = "en" | "sr-cyrl" | "sr-latn";

const LOCALE_DISPLAY: Record<Locale, string> = {
  en: "EN",
  "sr-cyrl": "СБ (ћр)",
  "sr-latn": "SB (lt)",
};

const LOCALE_NEXT: Record<Locale, Locale> = {
  en: "sr-cyrl",
  "sr-cyrl": "sr-latn",
  "sr-latn": "en",
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function Navbar() {
  const t = useTranslations("nav");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!adminMenuOpen) return;

    function handlePointerDown(e: MouseEvent) {
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(e.target as Node)
      ) {
        setAdminMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAdminMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [adminMenuOpen]);

  function cycleLang() {
    const next = LOCALE_NEXT[locale];
    router.replace(pathname, { locale: next });
  }

  const NAV_LINKS = [
    { labelKey: "aboutUs" as const, href: "/about" },
    { labelKey: "events" as const, href: "/events" },
    { labelKey: "newspaper" as const, href: "/newspaper-catalog" },
    { labelKey: "membership" as const, href: "/membership" },
  ];

  const EXPLORE_LINKS = [
    { labelKey: "exploreLinks.aboutUs" as const, href: "/about" },
    { labelKey: "exploreLinks.events" as const, href: "/events" },
    {
      labelKey: "exploreLinks.newspaperCatalog" as const,
      href: "/newspaper-catalog",
    },
    { labelKey: "exploreLinks.home" as const, href: "/" },
  ];

  // FIXME: keep in sync with Footer.tsx HISTORY_LINKS — slug for Part 1 not yet confirmed
  const HISTORY_LINKS = [
    {
      labelKey: "historyLinks.movementInSerbia" as const,
      href: "/history/serbian-national-movement-in-serbia",
    },
    {
      labelKey: "historyLinks.testimonies" as const,
      href: "/history/foreign-testimonies-about-chetniks-and-general-mihalovic",
    },
    {
      labelKey: "historyLinks.movementOutsideSerbia" as const,
      href: "/history/serbian-national-movement-outside-of-serbia",
    },
    {
      labelKey: "historyLinks.symbolsAndTraditions" as const,
      href: "/history/symbols-and-traditions",
    },
    {
      labelKey: "historyLinks.celebrations" as const,
      href: "/history/celebrations-and-commemorations",
    },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-offwhite-1 border-b border-blue-2 w-full">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 flex items-center justify-between pb-5 pt-1">
          <Link href="/" onClick={() => setMenuOpen(false)}>
            <img
              src="/logo-black.svg"
              alt="Ravna Gora"
              className="h-17.5 md:h-21.5 xl:h-25.25 w-auto"
            />
          </Link>

          <div className="flex items-center">
            {/* Desktop: nav links + Login + language switcher in one row with vertical dividers */}
            <div className="hidden xl:flex items-center">
              {[
                ...NAV_LINKS,
                {
                  labelKey: (user ? "account" : "login") as "account" | "login",
                  href: user ? "/account" : "/login",
                },
              ].map(({ labelKey, href }, i) => (
                <div key={labelKey} className="flex items-center">
                  {i > 0 && (
                    <div className="w-px h-[18px] bg-black mx-[var(--space-3)]" />
                  )}
                  <Link
                    href={href}
                    className="type-ui-medium font-bold text-black whitespace-nowrap hover:underline"
                  >
                    {t(labelKey)}
                  </Link>
                </div>
              ))}
              {isAdmin && (
                <div className="flex items-center">
                  <div className="w-px h-[18px] bg-black mx-[var(--space-3)]" />
                  <div className="relative" ref={adminMenuRef}>
                    <button
                      onClick={() => setAdminMenuOpen((v) => !v)}
                      className="flex items-center gap-1 type-ui-medium font-bold text-black whitespace-nowrap hover:underline"
                      aria-haspopup="menu"
                      aria-expanded={adminMenuOpen}
                    >
                      {t("admin")}
                      <ChevronIcon open={adminMenuOpen} />
                    </button>
                    {adminMenuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full mt-3 min-w-55 bg-offwhite-1 border border-blue-2 shadow-lg py-2"
                      >
                        <NextLink
                          href="/studio"
                          role="menuitem"
                          className="block px-4 py-2.5 type-ui-medium text-black whitespace-nowrap hover:bg-blue-2 hover:text-white transition-colors"
                          onClick={() => setAdminMenuOpen(false)}
                        >
                          {t("adminLinks.studio")}
                        </NextLink>
                        <Link
                          href="/admin"
                          role="menuitem"
                          className="block px-4 py-2.5 type-ui-medium text-black whitespace-nowrap hover:bg-blue-2 hover:text-white transition-colors"
                          onClick={() => setAdminMenuOpen(false)}
                        >
                          {t("adminLinks.issues")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="w-px h-[18px] bg-black mx-[var(--space-3)]" />
              <button
                onClick={cycleLang}
                className="w-22 flex items-center gap-1.5 type-ui-medium font-bold text-black"
                aria-label={t("switchLanguage")}
              >
                <GlobeIcon />
                <span>{LOCALE_DISPLAY[locale]}</span>
              </button>
            </div>

            {/* Phone / tablet: hamburger */}
            <button
              onClick={() => setMenuOpen(true)}
              className="xl:hidden p-1"
              aria-label={t("openMenu")}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <line
                  x1="3"
                  y1="6"
                  x2="21"
                  y2="6"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="3"
                  y1="12"
                  x2="21"
                  y2="12"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1="3"
                  y1="18"
                  x2="21"
                  y2="18"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Phone / tablet: full-screen dropdown overlay */}
      {menuOpen && (
        <div className="xl:hidden fixed inset-0 z-[100] flex flex-col">
          {/* Mirror the navbar bar with X instead of hamburger */}
          <div className="bg-offwhite-1 border-b border-blue-2 shrink-0">
            <div className="max-w-[1512px] mx-auto px-4 md:px-6 flex items-center justify-between pb-5 pt-1">
              <Link href="/" onClick={() => setMenuOpen(false)}>
                <img
                  src="/logo-black.svg"
                  alt="Ravna Gora"
                  className="h-17.5 md:h-21.5 xl:h-25.25 w-auto"
                />
              </Link>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1"
                aria-label={t("closeMenu")}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <line
                    x1="18"
                    y1="6"
                    x2="6"
                    y2="18"
                    stroke="#042467"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <line
                    x1="6"
                    y1="6"
                    x2="18"
                    y2="18"
                    stroke="#042467"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Dropdown content */}
          <div className="bg-offwhite-2 flex-1 overflow-y-auto py-[22px] px-4 md:px-6">
            <div className="flex flex-col gap-[var(--space-4)]">
              {/* Explore */}
              <div className="flex flex-col gap-[var(--space-5)]">
                <p className="type-h4 text-gray-1">{t("explore")}</p>
                <div className="flex flex-col gap-[var(--space-2)]">
                  {EXPLORE_LINKS.map(({ labelKey, href }) => (
                    <Link
                      key={labelKey}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="type-small-medium text-gray-1 hover:underline"
                    >
                      {t(labelKey)}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="h-px bg-black/15 w-full" />

              {/* History */}
              <div className="flex flex-col gap-[var(--space-5)]">
                <p className="type-h4 text-gray-1">{t("history")}</p>
                <div className="flex flex-col gap-[var(--space-2)]">
                  {HISTORY_LINKS.map(({ labelKey, href }) => (
                    <Link
                      key={labelKey}
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      className="type-small-medium text-gray-1 whitespace-nowrap hover:underline"
                    >
                      {t(labelKey)}
                    </Link>
                  ))}
                </div>
              </div>

              {isAdmin && (
                <>
                  <div className="h-px bg-black/15 w-full" />

                  {/* Admin */}
                  <div className="flex flex-col gap-[var(--space-5)]">
                    <p className="type-h4 text-gray-1">{t("admin")}</p>
                    <div className="flex flex-col gap-[var(--space-2)]">
                      <NextLink
                        href="/studio"
                        onClick={() => setMenuOpen(false)}
                        className="type-small-medium text-gray-1 hover:underline"
                      >
                        {t("adminLinks.studio")}
                      </NextLink>
                      <Link
                        href="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="type-small-medium text-gray-1 hover:underline"
                      >
                        {t("adminLinks.issues")}
                      </Link>
                    </div>
                  </div>
                </>
              )}

              <div className="h-px bg-black/15 w-full" />

              {/* Login / Account */}
              <Link
                href={user ? "/account" : "/login"}
                onClick={() => setMenuOpen(false)}
                className="type-h4 text-gray-1 hover:underline"
              >
                {user ? t("account") : t("login")}
              </Link>

              <div className="h-px bg-black/15 w-full" />

              {/* Language switcher */}
              <button
                onClick={cycleLang}
                className="flex items-center gap-2 type-h4 text-gray-1"
                aria-label={t("switchLanguage")}
              >
                <GlobeIcon />
                <span>{LOCALE_DISPLAY[locale]}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
