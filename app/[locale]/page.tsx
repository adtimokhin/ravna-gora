import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "../../i18n/navigation";
import { Navbar } from "../components/layout/Navbar";
import { Footer } from "../components/layout/Footer";
import { SectionHeading } from "../components/ui/SectionHeading";
import { HomeHero } from "../components/ui/HomeHero";
import { WelcomeQuote } from "../components/ui/WelcomeQuote";
import { LatestIssueCard } from "../components/ui/LatestIssueCard";
import { AboutSection } from "../components/ui/AboutSection";
import { ChaptersSection } from "../components/ui/ChaptersSection";
import { MembershipSection } from "../components/ui/MembershipSection";
import { client } from "../../sanity/lib/client";
import { urlFor, type SanityImage } from "../../sanity/lib/image";

export const revalidate = 60;

// Figma MCP asset URLs — expires 7 days after generation
// FIXME: images and excerpts in histArticles are static placeholders — replace with CMS data when history pages are authored
const A = {
  hero:     "/images/landing-hero-original/1512.avif", // fallback only, used when homePage.picture is unset
  magazine: "/images/preview-next-newspaper/464.avif",
  about:    "/images/about-us-section-original/1512.avif",
  hist1:    "/images/history-page-1-original/400.avif",
  hist2:    "/images/history-page-2-original/544.avif",
  hist3:    "/images/history-page-3-original/500.avif",
  hist4:    "/images/history-page-4-original/1024.avif",
  hist5:    "/images/history-page-5-original/1024.avif",
};

type Chapter = { name: string; websiteUrl?: string };
type LatestIssue = { picture: SanityImage | null; date: string; number: string; description: string };
type AboutData = {
  heading: string;
  paragraphs: string[];
  picture: SanityImage | null;
  photoCaption?: string;
  photoYear?: string;
  linkText: string;
};
type MembershipData = { heading: string; paragraphs: string[]; ctaText: string };
type HomePageData = {
  pageTitle: string;
  pageSubtitle: string;
  picture: SanityImage | null;
  welcomeQuote?: string;
  latestIssue: LatestIssue | null;
  about?: AboutData;
  membership?: MembershipData;
  chapters: Chapter[];
};

const FALLBACK_CHAPTERS: Chapter[] = [
  { name: "United States" },
  { name: "Canada" },
  { name: "United Kingdom" },
  { name: "Australia" },
];

// FIXME: slug for Part 1 was not confirmed (duplicate given); verify and update once known
const HIST_HREFS = [
  "/history/serbian-national-movement-outside-of-serbia",
  "/history/foreign-testimonies-about-chetniks-and-general-mihalovic",
  "/history/serbian-national-movement-outside-of-serbia",
  "/history/symbols-and-traditions",
  "/history/celebrations-and-commemorations",
];

const HIST_IMGS = [A.hist1, A.hist2, A.hist3, A.hist4, A.hist5];

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("home");

  const homePage: HomePageData | null = await client.fetch(
    `*[_type == "homePage" && (language == $locale || (!defined(language) && $locale == "en"))][0] {
      pageTitle,
      pageSubtitle,
      picture,
      welcomeQuote,
      latestIssue,
      about,
      membership,
      chapters
    }`,
    { locale }
  );

  const pageTitle    = homePage?.pageTitle    ?? t("fallbackTitle");
  const pageSubtitle = homePage?.pageSubtitle ?? t("fallbackSubtitle");
  const heroImageUrl = homePage?.picture ? urlFor(homePage.picture).width(1512).auto("format").url() : A.hero;
  const welcomeQuote = homePage?.welcomeQuote ?? t("welcomeQuote");
  const chapters     = homePage?.chapters?.length ? homePage.chapters : FALLBACK_CHAPTERS;

  const latestIssueDate        = homePage?.latestIssue?.date        ?? "March 2026";
  const latestIssueNumber      = homePage?.latestIssue?.number      ?? "#764";
  const latestIssueDescription = homePage?.latestIssue?.description ?? t("latestIssueDesc");
  const latestIssueHeading     = t("latestIssueHeading", { number: latestIssueNumber });
  const latestIssuePictureUrl  = homePage?.latestIssue?.picture
    ? urlFor(homePage.latestIssue.picture).width(700).auto("format").url()
    : A.magazine;

  const about              = homePage?.about;
  const aboutHeading       = about?.heading ?? t("aboutHeading");
  const aboutParagraphs    = about?.paragraphs?.length ? about.paragraphs : [t("aboutP1"), t("aboutP2")];
  const aboutPictureUrl    = about?.picture ? urlFor(about.picture).width(1432).auto("format").url() : A.about;
  const aboutPhotoCaption  = about?.photoCaption ?? t("photograph");
  const aboutPhotoYear     = about?.photoYear ?? t("photoYear");
  const aboutLinkText      = about?.linkText ?? t("loadMore");

  const membership           = homePage?.membership;
  const membershipHeading    = membership?.heading ?? t("membershipHeading");
  const membershipParagraphs = membership?.paragraphs?.length ? membership.paragraphs : [t("membershipP1"), t("membershipP2")];
  const membershipCtaText    = membership?.ctaText ?? t("joinCTA");

  const histArticles = (["1", "2", "3", "4", "5"] as const).map((n, i) => ({
    part:    t(`hist${n}Part`   as `hist${typeof n}Part`),
    title:   t(`hist${n}Title`  as `hist${typeof n}Title`),
    excerpt: t(`hist${n}Excerpt`as `hist${typeof n}Excerpt`),
    img:     HIST_IMGS[i],
    href:    HIST_HREFS[i],
  }));

  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">

      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-[var(--space-8)] flex flex-col gap-[var(--space-10)]">

          {/* ── Hero ── */}
          <HomeHero title={pageTitle} subtitle={pageSubtitle} pictureUrl={heroImageUrl} />

          {/* ── All content sections ── */}
          <div className="flex flex-col gap-[var(--space-10)]">

            {/* ── Welcome quote ── */}
            <WelcomeQuote quote={welcomeQuote} />

            {/* ── Latest newspaper card ── */}
            <LatestIssueCard
              date={latestIssueDate}
              heading={latestIssueHeading}
              description={latestIssueDescription}
              pictureUrl={latestIssuePictureUrl}
              imageAlt={t("latestIssueAlt")}
            />

            {/* ── About ── */}
            <AboutSection
              heading={aboutHeading}
              paragraphs={aboutParagraphs}
              pictureUrl={aboutPictureUrl}
              photoCaption={aboutPhotoCaption}
              photoYear={aboutPhotoYear}
              linkText={aboutLinkText}
            />

            {/* ── Historical Introduction ── */}
            <section className="flex flex-col gap-[var(--space-text-tp)]">
              <SectionHeading title={t("historicalIntroHeading")} />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-[18px] gap-y-[var(--space-card-v)]">
                {histArticles.map(({ part, title, img, href, excerpt }) => (
                  <Link key={part} href={href} className="group">
                    <article className="flex flex-col gap-[var(--space-text-p)]">
                      <div className="relative h-[260px] md:h-[320px] xl:h-[421px] overflow-hidden">
                        <Image
                          alt={title}
                          src={img}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        />
                      </div>

                      <div className="flex flex-col gap-[var(--space-text-p)]">
                        <div className="flex flex-col gap-1">
                          <p className="type-large text-black">{part}</p>
                          <h3 className="type-h3 text-black group-hover:underline">{title}</h3>
                        </div>

                        <p className="type-body text-black line-clamp-3">{excerpt}</p>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            </section>

            {/* ── Chapters ── */}
            <ChaptersSection heading={t("chaptersHeading")} chapters={chapters} visitLabel={t("visit")} />

            {/* ── Membership ── */}
            <MembershipSection heading={membershipHeading} paragraphs={membershipParagraphs} ctaText={membershipCtaText} />

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
