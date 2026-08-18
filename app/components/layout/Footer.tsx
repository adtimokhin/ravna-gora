import { getTranslations } from "next-intl/server";
import { Link } from "../../../i18n/navigation";

// Ordered to mirror the Navbar's primary nav flow (About Us → Events →
// Newspaper → Membership → Login), with History inserted after About Us
// since it's the other informational/content page.
const PAGE_HREFS = ["/about", "/history", "/events", "/newspaper-catalog", "/membership", "/login"];

export async function Footer() {
  const t = await getTranslations("footer");

  const PAGE_LINKS = [
    { label: t("links.aboutUs"), href: PAGE_HREFS[0] },
    { label: t("links.history"), href: PAGE_HREFS[1] },
    { label: t("links.events"), href: PAGE_HREFS[2] },
    { label: t("links.newspaperCatalog"), href: PAGE_HREFS[3] },
    { label: t("links.membership"), href: PAGE_HREFS[4] },
    { label: t("links.login"), href: PAGE_HREFS[5] },
  ];

  return (
    <footer className="bg-blue-2 w-full">
      <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 py-[var(--space-8)] flex flex-col gap-[var(--space-9)]">
        {/* Top: Pages + Contact */}
        <div className="flex flex-col xl:flex-row items-start justify-between gap-[var(--space-9)]">
          <div className="flex flex-col gap-[var(--space-5)]">
            <p className="type-h4 text-white">{t("pages")}</p>
            <div className="flex flex-col gap-[var(--space-2)]">
              {PAGE_LINKS.map(({ label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="type-body text-white whitespace-nowrap hover:underline"
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[var(--space-5)]">
            <p className="type-h4 text-white">{t("contactInfo")}</p>
            <div className="flex items-center gap-[var(--space-2)]">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <polyline points="2,4 12,13 22,4" />
              </svg>
              <a
                href="mailto:contact@ravnagorachetniks.org"
                className="type-body text-white hover:underline"
              >
                contact@ravnagorachetniks.org
              </a>
            </div>
          </div>
        </div>

        {/* Bottom: divider + logo + address */}
        <div className="flex flex-col gap-[var(--space-3)]">
          <div className="w-full h-px bg-white/30" />

          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-[var(--space-5)]">
            <img
              src="/logo-text-white.svg"
              alt="Ravna Gora"
              className="h-15 md:h-19 xl:h-23 w-auto"
            />

            <div className="flex flex-col gap-[var(--space-1)] type-base text-white">
              <p>1350 Woodview Drive</p>
              <p>Crown Point, Indiana</p>
              <p>46307</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
