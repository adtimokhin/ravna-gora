import { getTranslations } from "next-intl/server";
import { Link } from "../../../i18n/navigation";
import { HISTORY_LINKS } from "./navLinks";

type FooterLink = { label: string; href: string };

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: FooterLink[];
}) {
  return (
    <div className="flex flex-col gap-(--space-3)">
      <p className="type-label text-white/50 uppercase tracking-widest">{heading}</p>
      <ul className="flex flex-col gap-(--space-2)">
        {links.map(({ label, href }) => (
          <li key={href}>
            <Link
              href={href}
              className="type-body text-white/80 hover:text-white hover:underline transition-colors"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function Footer() {
  const t = await getTranslations("footer");
  // History article labels live in the shared `nav` namespace so the footer
  // column and the navbar dropdown read identical copy — see navLinks.ts.
  const tNav = await getTranslations("nav");
  const year = new Date().getFullYear();

  const exploreLinks: FooterLink[] = [
    { label: t("links.home"), href: "/" },
    { label: t("links.aboutUs"), href: "/about" },
    { label: t("links.events"), href: "/events" },
    { label: t("links.newspaperCatalog"), href: "/newspaper-catalog" },
  ];

  const historyLinks: FooterLink[] = HISTORY_LINKS.map(({ labelKey, href }) => ({
    label: tNav(labelKey),
    href,
  }));

  const supportLinks: FooterLink[] = [
    { label: t("links.membership"), href: "/membership" },
    { label: t("links.donate"), href: "/donate" },
  ];

  const accountLinks: FooterLink[] = [
    { label: t("links.login"), href: "/login" },
    { label: t("links.createAccount"), href: "/signup" },
  ];

  return (
    <footer className="bg-blue-2 w-full text-white">
      <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 py-(--space-8) flex flex-col gap-(--space-8)">

        {/* Brand + link columns */}
        <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-(--space-8)">
          <div className="flex flex-col gap-(--space-3) max-w-xs">
            <img
              src="/logo-text-white.svg"
              alt="Ravna Gora"
              className="h-15 md:h-19 w-auto"
            />
            <p className="type-label text-white/50 uppercase tracking-widest">
              {t("chapter")}
            </p>
            <p className="type-body text-white/80">{t("orgName")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-(--space-6) gap-y-(--space-7) xl:gap-x-(--space-8)">
            <FooterColumn heading={t("explore")} links={exploreLinks} />
            <FooterColumn heading={t("links.history")} links={historyLinks} />
            <FooterColumn heading={t("support")} links={supportLinks} />
            <FooterColumn heading={t("account")} links={accountLinks} />
          </div>
        </div>

        <div className="w-full h-px bg-white/25" />

        {/* Contact + address */}
        <div className="flex flex-col md:flex-row md:justify-between gap-(--space-5)">
          <div className="flex flex-col gap-(--space-3)">
            <p className="type-label text-white/50 uppercase tracking-widest">
              {t("contactInfo")}
            </p>
            <a
              href="mailto:contact@ravnagorachetniks.org"
              className="flex items-center gap-(--space-2) type-body text-white/80 hover:text-white transition-colors"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <polyline points="2,4 12,13 22,4" />
              </svg>
              contact@ravnagorachetniks.org
            </a>
          </div>

          <address className="not-italic flex flex-col gap-(--space-1) type-body text-white/70 md:text-right">
            <span>1350 Woodview Drive</span>
            <span>Crown Point, Indiana</span>
            <span>46307</span>
          </address>
        </div>

        <div className="w-full h-px bg-white/25" />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-(--space-2)">
          <p className="type-caption text-white/60">
            © {year} {t("orgName")}. {t("rights")}
          </p>
          <p className="type-caption text-white/40 uppercase tracking-widest">
            {t("chapter")}
          </p>
        </div>
      </div>
    </footer>
  );
}
