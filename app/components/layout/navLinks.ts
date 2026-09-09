// Shared between the Navbar and the Footer so the two never drift apart
// (this used to be a FIXME asking callers to hand-sync duplicate arrays).
// Every `labelKey` is resolved against the `nav` translations namespace by
// both components.

export type NavLinkItem = {
  labelKey: string;
  href: string;
};

// The five History detail articles. Slugs must match app/[locale]/history/[slug].
export const HISTORY_LINKS: NavLinkItem[] = [
  {
    labelKey: "historyLinks.movementInSerbia",
    href: "/history/serbian-national-movement-in-serbia",
  },
  {
    labelKey: "historyLinks.testimonies",
    href: "/history/foreign-testimonies-about-chetniks-and-general-mihalovic",
  },
  {
    labelKey: "historyLinks.movementOutsideSerbia",
    href: "/history/serbian-national-movement-outside-of-serbia",
  },
  {
    labelKey: "historyLinks.symbolsAndTraditions",
    href: "/history/symbols-and-traditions",
  },
  {
    labelKey: "historyLinks.celebrations",
    href: "/history/celebrations-and-commemorations",
  },
];
